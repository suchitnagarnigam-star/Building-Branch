import "dotenv/config";
import { pool } from "./db/database";
import { generateToken } from "./services/authService";
import { notifyOfficer } from "./services/pushService";
import { saveComplaint, getComplaints } from "./services/complaintStorage";
import type { Complaint } from "./types/complaint";

async function runTests() {
  console.log("================================================================================");
  console.log("TESTING: BI Complaint-to-Inspection Workflow (End-to-End)");
  console.log("================================================================================\n");

  const testComplaintId = `CMP-BI-FLOW-${Date.now()}`;
  const biOfficer1 = "OFF-002"; // Sh. Gurwinder Singh, BI, Zone A, Block 2
  const biOfficer2 = "OFF-005"; // Sh. Randhir Rana, BI, Zone B, Block 24

  const tokenBi1 = generateToken({
    userId: 1002,
    officerId: biOfficer1,
    role: "bi",
    name: "Sh. Gurwinder Singh",
    zone: "A",
    blocks: ["2", "25", "32", "33"],
  });

  const tokenBi2 = generateToken({
    userId: 1005,
    officerId: biOfficer2,
    role: "bi",
    name: "Sh. Randhir Rana",
    zone: "B",
    blocks: ["24", "31(2)"],
  });

  const port = process.env.PORT || 5000;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  let createdCaseId: string | null = null;
  let createdVisitId: string | null = null;

  try {
    // -------------------------------------------------------------------------
    // STEP 1: Admin Creates Complaint Assigned to BI 1 (OFF-002)
    // -------------------------------------------------------------------------
    console.log(`[Step 1] Creating new complaint #${testComplaintId} assigned to BI ${biOfficer1}...`);
    const initialComplaint: Complaint = {
      complaintId: testComplaintId,
      title: "Illegal Commercial Construction in Block 2",
      description: "Construction without sanctioned municipal building plan",
      zone: "A",
      ward: "Ward 10",
      block: "2",
      status: "Assigned",
      registrationSource: "manual",
      address: "SCO 45, Feroze Gandhi Market, Block 2",
      citizenName: "Mohinder Singh",
      phoneNumber: "9876543210",
      attachments: [],
      assignedOfficerId: biOfficer1,
      assignedOfficerName: "Sh. Gurwinder Singh",
      assignedOfficerMobile: "96461-89006",
      assignedAtpId: "OFF-001",
      assignedAtpName: "Sh. Kapil Dev",
      assignedAtpMobile: "90410-22742",
      createdAt: new Date().toISOString(),
      assignmentAcknowledgedAt: null,
      acknowledgedByOfficerId: null,
    };

    await saveComplaint(initialComplaint);

    // Dispatch assignment notification
    await notifyOfficer(biOfficer1, {
      title: "New Complaint Assigned",
      body: `Complaint ${testComplaintId} in Zone A (Block 2) assigned to you.`,
      url: `/complaints/${encodeURIComponent(testComplaintId)}`,
      tag: `complaint-${testComplaintId}-assigned`,
      type: "complaint_assignment",
      entityType: "complaint",
      entityId: testComplaintId,
    });

    console.log("✔ Complaint saved in DB and notification dispatched.");

    // -------------------------------------------------------------------------
    // STEP 2: BI 1 Opens Complaint Details Page (GET /complaints/:id)
    // -------------------------------------------------------------------------
    console.log(`\n[Step 2] BI ${biOfficer1} loads complaint details via API...`);
    const compRes = await fetch(`${baseUrl}/complaints/${encodeURIComponent(testComplaintId)}`, {
      headers: { Authorization: `Bearer ${tokenBi1}` },
    });

    if (!compRes.ok) {
      throw new Error(`Failed to fetch complaint details: HTTP ${compRes.status}`);
    }

    const compData = (await compRes.json()) as { success: boolean; complaint: any };
    if (!compData.success || !compData.complaint) {
      throw new Error("Complaint data not returned.");
    }

    const loadedComp = compData.complaint;
    console.log(`✔ Complaint loaded successfully: ID=${loadedComp.complaintId}, Status=${loadedComp.status}, AssignedTo=${loadedComp.assignedOfficerId}`);
    if (loadedComp.address !== initialComplaint.address || loadedComp.block !== "2") {
      throw new Error("Complaint address or block mismatch!");
    }

    // -------------------------------------------------------------------------
    // STEP 3: Security & Authorization Check - Unauthorized BI Cannot Inspect
    // -------------------------------------------------------------------------
    console.log(`\n[Step 3] Testing backend authorization: BI ${biOfficer2} attempts to submit inspection for BI ${biOfficer1}'s complaint...`);
    
    const unauthForm = new FormData();
    unauthForm.append("sourceOfReport", "complaint");
    unauthForm.append("complaintId", testComplaintId);
    unauthForm.append("reportingOfficer", biOfficer2);
    unauthForm.append("block", "2");
    unauthForm.append("location", "SCO 45, Feroze Gandhi Market");
    unauthForm.append("buildingType", "Commercial");
    unauthForm.append("violatorName", "Illegal Builder");
    unauthForm.append("description", "Unauthorized attempt");
    unauthForm.append("latitude", "30.9010");
    unauthForm.append("longitude", "75.8573");
    unauthForm.append("accuracy", "10");
    unauthForm.append("inspectionOutcome", "no_violation");
    unauthForm.append(
      "inspectionPhotos",
      new Blob([Buffer.from("dummy-evidence-image")], { type: "image/jpeg" }),
      "test-photo.jpg"
    );

    const unauthRes = await fetch(`${baseUrl}/inspections`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenBi2}`,
      },
      body: unauthForm,
    });

    if (unauthRes.status !== 403) {
      const respText = await unauthRes.text();
      throw new Error(`Expected HTTP 403 Forbidden for unauthorized BI, received ${unauthRes.status}: ${respText}`);
    }
    const unauthData = await unauthRes.json();
    console.log(`✔ Unauthorized inspection correctly rejected with 403: "${unauthData.message}"`);

    // -------------------------------------------------------------------------
    // STEP 4: Authorized BI 1 Submits Complaint-Based Field Inspection
    // -------------------------------------------------------------------------
    console.log(`\n[Step 4] Authorized BI ${biOfficer1} submits complaint-based field inspection with evidence...`);

    const authForm = new FormData();
    authForm.append("sourceOfReport", "complaint");
    authForm.append("complaintId", testComplaintId);
    authForm.append("reportingOfficer", biOfficer1);
    authForm.append("block", "2");
    authForm.append("ward", "Ward 10");
    authForm.append("location", initialComplaint.address);
    authForm.append("buildingType", "Commercial");
    authForm.append("violatorName", "Sh. Satish Bansal");
    authForm.append("mobileNumber", "9812345678");
    authForm.append("description", "On-site inspection confirms unauthorized 3rd storey construction without sanction.");
    authForm.append("latitude", "30.9010");
    authForm.append("longitude", "75.8573");
    authForm.append("accuracy", "8.5");
    authForm.append("inspectionOutcome", "violation_found");
    authForm.append("noticeNumber", `NOT-270-${Date.now()}`);
    authForm.append("noticeDate", "2026-10-10");
    authForm.append(
      "inspectionPhotos",
      new Blob([Buffer.from("fake-evidence-jpeg-bytes")], { type: "image/jpeg" }),
      "evidence_onsite.jpg"
    );
    authForm.append(
      "noticePhoto",
      new Blob([Buffer.from("fake-notice-photo-bytes")], { type: "image/jpeg" }),
      "notice_copy.jpg"
    );

    const authRes = await fetch(`${baseUrl}/inspections`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenBi1}`,
      },
      body: authForm,
    });

    if (!authRes.ok) {
      const errText = await authRes.text();
      throw new Error(`Failed to submit field inspection: HTTP ${authRes.status}: ${errText}`);
    }

    const inspectData = (await authRes.json()) as {
      success: boolean;
      visitId: string;
      complaintId: string;
      caseId?: string;
      message: string;
    };

    if (!inspectData.success || !inspectData.visitId) {
      throw new Error("Inspection submission did not return visitId!");
    }

    createdVisitId = inspectData.visitId;
    createdCaseId = inspectData.caseId || null;
    console.log(`✔ Inspection submitted successfully: VisitID=${createdVisitId}, ComplaintID=${inspectData.complaintId}, CaseID=${createdCaseId}`);

    // -------------------------------------------------------------------------
    // STEP 5: Test Deduplication / Duplicate Submission Prevention
    // -------------------------------------------------------------------------
    console.log(`\n[Step 5] Testing duplicate submission prevention (rapid repeated submit)...`);
    
    // Create new form with same parameters
    const dupForm = new FormData();
    dupForm.append("sourceOfReport", "complaint");
    dupForm.append("complaintId", testComplaintId);
    dupForm.append("reportingOfficer", biOfficer1);
    dupForm.append("block", "2");
    dupForm.append("ward", "Ward 10");
    dupForm.append("location", initialComplaint.address);
    dupForm.append("buildingType", "Commercial");
    dupForm.append("violatorName", "Sh. Satish Bansal");
    dupForm.append("description", "Repeat inspection submission attempt");
    dupForm.append("latitude", "30.9010");
    dupForm.append("longitude", "75.8573");
    dupForm.append("accuracy", "8.5");
    dupForm.append("inspectionOutcome", "violation_found");
    dupForm.append("noticeNumber", `NOT-270-DUP`);
    dupForm.append("noticeDate", "2026-10-10");
    dupForm.append(
      "inspectionPhotos",
      new Blob([Buffer.from("fake-evidence-jpeg-bytes")], { type: "image/jpeg" }),
      "evidence_onsite.jpg"
    );
    dupForm.append(
      "noticePhoto",
      new Blob([Buffer.from("fake-notice-photo-bytes")], { type: "image/jpeg" }),
      "notice_copy.jpg"
    );

    const dupRes = await fetch(`${baseUrl}/inspections`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenBi1}`,
      },
      body: dupForm,
    });

    if (dupRes.status !== 409 && dupRes.status !== 400) {
      throw new Error(`Expected duplicate to be rejected with 409 or 400, received HTTP ${dupRes.status}`);
    }
    const dupData = await dupRes.json();
    console.log(`✔ Duplicate submission correctly rejected: HTTP ${dupRes.status} ("${dupData.message}")`);

    // -------------------------------------------------------------------------
    // STEP 6: Verify Database Status & Progression
    // -------------------------------------------------------------------------
    console.log(`\n[Step 6] Verifying database status & workflow updates...`);

    // Check complaint status updated to 'In progress'
    const dbComp = await pool.query(
      `SELECT status, assignment_acknowledged_at, acknowledged_by_officer_id FROM complaints WHERE complaint_id = $1`,
      [testComplaintId]
    );
    if (dbComp.rowCount === 0) throw new Error("Complaint missing in DB!");
    const compRow = dbComp.rows[0];
    console.log(`  Complaint Status in DB: "${compRow.status}" (Expected: "In progress")`);
    if (compRow.status !== "In progress") {
      throw new Error(`Expected complaint status to be 'In progress', got '${compRow.status}'`);
    }
    if (!compRow.assignment_acknowledged_at) {
      throw new Error("Expected complaint to be marked acknowledged upon inspection submission!");
    }
    console.log(`  Complaint Acknowledgement: ${compRow.assignment_acknowledged_at} by ${compRow.acknowledged_by_officer_id}`);

    // Check field_visits record
    const dbVisit = await pool.query(
      `SELECT visit_id, complaint_id, case_id, bi_id, visit_type, inspection_outcome FROM field_visits WHERE visit_id = $1`,
      [createdVisitId]
    );
    if (dbVisit.rowCount === 0) throw new Error("field_visits row not found!");
    const visitRow = dbVisit.rows[0];
    console.log(`  Field Visit linked: ComplaintID=${visitRow.complaint_id}, CaseID=${visitRow.case_id}, Type=${visitRow.visit_type}`);
    if (visitRow.complaint_id !== testComplaintId) {
      throw new Error(`Visit complaint_id mismatch: expected ${testComplaintId}, got ${visitRow.complaint_id}`);
    }
    if (visitRow.visit_type !== "complaint_visit") {
      throw new Error(`Expected visit_type 'complaint_visit', got '${visitRow.visit_type}'`);
    }

    // Check notifications for BI 1 marked read
    const dbNotif = await pool.query(
      `SELECT notification_id, read_at FROM notifications WHERE entity_id = $1 AND recipient_officer_id = $2`,
      [testComplaintId, biOfficer1]
    );
    if (dbNotif.rowCount && dbNotif.rowCount > 0) {
      const notifRow = dbNotif.rows[0];
      console.log(`  Notification read_at: ${notifRow.read_at}`);
      if (!notifRow.read_at) {
        throw new Error("In-app notification should be marked read!");
      }
    }
    console.log("✔ Complaint status, field visit record, and notification progression fully verified.");

    // -------------------------------------------------------------------------
    // STEP 7: Verify Proactive Field Visit (Existing Entry Point Unaffected)
    // -------------------------------------------------------------------------
    console.log(`\n[Step 7] Verifying normal proactive field inspection entry point remains unaffected...`);
    const proactiveForm = new FormData();
    proactiveForm.append("sourceOfReport", "field_visit");
    proactiveForm.append("reportingOfficer", biOfficer1);
    proactiveForm.append("block", "2");
    proactiveForm.append("location", "Proactive Site Visit Road, Block 2");
    proactiveForm.append("buildingType", "Residential");
    proactiveForm.append("violatorName", "Proactive Owner");
    proactiveForm.append("description", "Proactive routine inspection discovers illegal construction");
    proactiveForm.append("latitude", "30.9020");
    proactiveForm.append("longitude", "75.8580");
    proactiveForm.append("accuracy", "5");
    proactiveForm.append("inspectionOutcome", "violation_found");
    proactiveForm.append("noticeNumber", `NOT-270-PRO-${Date.now()}`);
    proactiveForm.append("noticeDate", "2026-10-10");
    proactiveForm.append(
      "inspectionPhotos",
      new Blob([Buffer.from("proactive-photo-bytes")], { type: "image/jpeg" }),
      "proactive.jpg"
    );
    proactiveForm.append(
      "noticePhoto",
      new Blob([Buffer.from("proactive-notice-photo-bytes")], { type: "image/jpeg" }),
      "proactive_notice.jpg"
    );

    const proactiveRes = await fetch(`${baseUrl}/inspections`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenBi1}`,
      },
      body: proactiveForm,
    });

    if (!proactiveRes.ok) {
      const pErr = await proactiveRes.text();
      throw new Error(`Failed to submit proactive inspection: HTTP ${proactiveRes.status}: ${pErr}`);
    }

    const pData = await proactiveRes.json();
    console.log(`✔ Proactive visit created successfully: VisitID=${pData.visitId}, VisitType=${pData.visitType}, ComplaintID=${pData.complaintId || "none"}`);
    if (pData.complaintId) {
      throw new Error("Proactive inspection should not have complaintId!");
    }
    if (pData.visitType !== "proactive_inspection") {
      throw new Error(`Expected proactive_inspection, got ${pData.visitType}`);
    }

    // Clean up proactive visit and case
    if (pData.visitId) {
      await pool.query("DELETE FROM visit_evidence WHERE visit_id = $1", [pData.visitId]);
      await pool.query("DELETE FROM field_visits WHERE visit_id = $1", [pData.visitId]);
    }
    if (pData.caseId) {
      await pool.query("DELETE FROM notices WHERE case_id = $1", [pData.caseId]);
      await pool.query("DELETE FROM cases WHERE case_id = $1", [pData.caseId]);
    }

    console.log("\n================================================================================");
    console.log("ALL ACCEPTANCE CRITERIA AND WORKFLOW TESTS PASSED SUCCESSFULLY! (100% GREEN)");
    console.log("================================================================================\n");

  } finally {
    // Teardown
    console.log("[Teardown] Cleaning up test records...");
    if (createdVisitId) {
      await pool.query("DELETE FROM visit_evidence WHERE visit_id = $1", [createdVisitId]);
      await pool.query("DELETE FROM field_visits WHERE visit_id = $1", [createdVisitId]);
    }
    if (createdCaseId) {
      await pool.query("DELETE FROM notices WHERE case_id = $1", [createdCaseId]);
      await pool.query("DELETE FROM case_complaints WHERE case_id = $1", [createdCaseId]);
      await pool.query("DELETE FROM cases WHERE case_id = $1", [createdCaseId]);
    }
    await pool.query("DELETE FROM notifications WHERE entity_id = $1", [testComplaintId]);
    await pool.query("DELETE FROM case_complaints WHERE complaint_id = $1", [testComplaintId]);
    await pool.query("DELETE FROM complaints WHERE complaint_id = $1", [testComplaintId]);
    console.log("✔ Teardown complete.");
    await pool.end();
  }
}

runTests().catch((err) => {
  console.error("❌ Test run failed:", err);
  process.exit(1);
});
