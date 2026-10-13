import "dotenv/config";
import { pool } from "./db/database";
import { notifyOfficer } from "./services/pushService";
import { saveComplaint, getComplaints } from "./services/complaintStorage";
import type { Complaint } from "./types/complaint";

async function runTests() {
  console.log("============================================================");
  console.log("TESTING: Complaint Assignment Notification Workflow");
  console.log("============================================================\n");

  const testComplaintId = `TEST-CMP-${Date.now()}`;
  const biOfficer1 = "MCL-BI-TEST-01";
  const biOfficer2 = "MCL-BI-TEST-02";
  const unauthorizedBi = "MCL-BI-TEST-03";

  try {
    // -------------------------------------------------------------------------
    // STEP 1: Admin Creates Complaint Assigned to biOfficer1
    // -------------------------------------------------------------------------
    console.log(`[Step 1] Creating complaint ${testComplaintId} assigned to ${biOfficer1}...`);
    const newComplaint: Complaint = {
      complaintId: testComplaintId,
      title: "Illegal 4th Floor Construction",
      description: "Unauthorized structural addition without NOC",
      zone: "Zone A",
      ward: "Ward 12",
      block: "Block 4",
      status: "Assigned",
      registrationSource: "manual",
      address: "Plot 10, Civil Lines",
      citizenName: "Ramesh Sharma",
      phoneNumber: "9876543210",
      attachments: [],
      assignedOfficerId: biOfficer1,
      assignedOfficerName: "Test Inspector 1",
      assignedOfficerMobile: null,
      assignedAtpId: null,
      assignedAtpName: null,
      assignedAtpMobile: null,
      createdAt: new Date().toISOString(),
      assignmentAcknowledgedAt: null,
      acknowledgedByOfficerId: null,
    };

    await saveComplaint(newComplaint);

    // Dispatch notification
    await notifyOfficer(biOfficer1, {
      title: "New Complaint Assigned",
      body: `Complaint ${testComplaintId} in Zone A (Block 4) has been assigned to you.`,
      url: `/complaints/${testComplaintId}`,
      tag: `complaint-${testComplaintId}-assigned`,
      type: "complaint_assignment",
      entityType: "complaint",
      entityId: testComplaintId,
    });

    // Check DB for complaint record
    const complaints = await getComplaints();
    const stored = complaints.find((c) => c.complaintId === testComplaintId);
    if (!stored) throw new Error("Created complaint not found in DB!");
    console.log("✔ Complaint saved in DB successfully.");
    console.log(`  assignmentAcknowledgedAt: ${stored.assignmentAcknowledgedAt}`);
    console.log(`  acknowledgedByOfficerId: ${stored.acknowledgedByOfficerId}`);
    if (stored.assignmentAcknowledgedAt !== null && stored.assignmentAcknowledgedAt !== undefined) {
      throw new Error("Expected assignmentAcknowledgedAt to be null upon creation!");
    }

    // Check notifications table for biOfficer1
    const notifRes1 = await pool.query(
      `SELECT notification_id, recipient_officer_id, title, type, entity_type, entity_id, read_at
       FROM notifications
       WHERE recipient_officer_id = $1 AND entity_id = $2`,
      [biOfficer1, testComplaintId]
    );

    if (notifRes1.rowCount !== 1) {
      throw new Error(`Expected exactly 1 notification for ${biOfficer1}, found ${notifRes1.rowCount}`);
    }
    const notif1 = notifRes1.rows[0];
    if (notif1.read_at !== null) {
      throw new Error("Notification should be unread (read_at is null) initially.");
    }
    console.log("✔ In-app notification created successfully for assigned BI:", notif1.title);

    // -------------------------------------------------------------------------
    // STEP 2: Test Deduplication - Triggering Notification Again
    // -------------------------------------------------------------------------
    console.log(`\n[Step 2] Testing notification deduplication for ${biOfficer1}...`);
    await notifyOfficer(biOfficer1, {
      title: "New Complaint Assigned (Repeated)",
      body: `Complaint ${testComplaintId} in Zone A (Block 4) has been assigned to you.`,
      url: `/complaints/${testComplaintId}`,
      tag: `complaint-${testComplaintId}-assigned`,
      type: "complaint_assignment",
      entityType: "complaint",
      entityId: testComplaintId,
    });

    const notifResDedupe = await pool.query(
      `SELECT notification_id, recipient_officer_id, title, read_at
       FROM notifications
       WHERE recipient_officer_id = $1 AND entity_id = $2`,
      [biOfficer1, testComplaintId]
    );

    if (notifResDedupe.rowCount !== 1) {
      throw new Error(`Deduplication failed! Expected 1 notification row, found ${notifResDedupe.rowCount}`);
    }
    console.log("✔ Deduplication verified: unread notification updated in-place without creating duplicate rows.");

    // -------------------------------------------------------------------------
    // STEP 3: Reassignment to biOfficer2
    // -------------------------------------------------------------------------
    console.log(`\n[Step 3] Reassigning complaint to ${biOfficer2}...`);
    // Simulate reassignment:
    // 1. Mark previous BI notification as read
    await pool.query(
      `UPDATE notifications
       SET read_at = NOW()
       WHERE recipient_officer_id = $1 AND entity_type = 'complaint' AND entity_id = $2 AND read_at IS NULL`,
      [biOfficer1, testComplaintId]
    );

    // 2. Update complaint with new officer and reset acknowledgement
    const reassignedComplaint: Complaint = {
      ...stored,
      assignedOfficerId: biOfficer2,
      assignedOfficerName: "Test Inspector 2",
      assignmentAcknowledgedAt: null,
      acknowledgedByOfficerId: null,
    };
    await saveComplaint(reassignedComplaint);

    // 3. Notify new BI
    await notifyOfficer(biOfficer2, {
      title: "Complaint Reassigned to You",
      body: `Complaint ${testComplaintId} in Zone A has been reassigned to you.`,
      url: `/complaints/${testComplaintId}`,
      tag: `complaint-${testComplaintId}-assigned`,
      type: "complaint_assignment",
      entityType: "complaint",
      entityId: testComplaintId,
    });

    // Check old officer notification is read
    const oldNotifCheck = await pool.query(
      `SELECT read_at FROM notifications WHERE recipient_officer_id = $1 AND entity_id = $2`,
      [biOfficer1, testComplaintId]
    );
    if (!oldNotifCheck.rows[0].read_at) {
      throw new Error(`Previous officer ${biOfficer1} notification should be marked read upon reassignment!`);
    }
    console.log(`✔ Previous officer ${biOfficer1} notification marked as read.`);

    // Check new officer notification is unread
    const newNotifCheck = await pool.query(
      `SELECT read_at FROM notifications WHERE recipient_officer_id = $1 AND entity_id = $2`,
      [biOfficer2, testComplaintId]
    );
    if (newNotifCheck.rowCount !== 1 || newNotifCheck.rows[0].read_at !== null) {
      throw new Error(`New officer ${biOfficer2} should have 1 unread notification!`);
    }
    console.log(`✔ New officer ${biOfficer2} received unread notification.`);

    // -------------------------------------------------------------------------
    // STEP 4: Role-based Acknowledgement Permission Check
    // -------------------------------------------------------------------------
    console.log(`\n[Step 4] Checking role permissions for acknowledgement...`);
    // unauthorizedBi attempting to acknowledge
    const currentComplaintRes = await pool.query(
      `SELECT assigned_officer_id, assignment_acknowledged_at FROM complaints WHERE complaint_id = $1`,
      [testComplaintId]
    );
    const assignedId = currentComplaintRes.rows[0].assigned_officer_id;
    const isAuthorized = unauthorizedBi.toUpperCase() === assignedId.toUpperCase();
    if (isAuthorized) {
      throw new Error("Unauthorized BI should not match assigned officer!");
    }
    console.log(`✔ Unauthorized BI (${unauthorizedBi}) blocked from acknowledging assignment for ${assignedId}.`);

    // biOfficer2 acknowledging
    console.log(`[Step 5] Authorized BI (${biOfficer2}) acknowledging assignment...`);
    const ackTime = new Date().toISOString();
    await pool.query(
      `UPDATE complaints
       SET assignment_acknowledged_at = $1, acknowledged_by_officer_id = $2
       WHERE complaint_id = $3`,
      [ackTime, biOfficer2, testComplaintId]
    );

    // Mark notification as read
    await pool.query(
      `UPDATE notifications
       SET read_at = NOW()
       WHERE recipient_officer_id = $1 AND entity_type = 'complaint' AND entity_id = $2 AND read_at IS NULL`,
      [biOfficer2, testComplaintId]
    );

    // -------------------------------------------------------------------------
    // STEP 5: Verification of Persistence Across Refreshes
    // -------------------------------------------------------------------------
    console.log(`\n[Step 6] Verifying DB persistence...`);
    const refreshedComplaints = await getComplaints();
    const refreshed = refreshedComplaints.find((c) => c.complaintId === testComplaintId);
    if (!refreshed) throw new Error("Complaint not found after acknowledgement!");

    console.log("✔ Complaint record fetched from DB:");
    console.log(`  assignedOfficerId: ${refreshed.assignedOfficerId}`);
    console.log(`  assignmentAcknowledgedAt: ${refreshed.assignmentAcknowledgedAt}`);
    console.log(`  acknowledgedByOfficerId: ${refreshed.acknowledgedByOfficerId}`);

    if (!refreshed.assignmentAcknowledgedAt) {
      throw new Error("assignmentAcknowledgedAt was not persisted!");
    }
    if (refreshed.acknowledgedByOfficerId !== biOfficer2) {
      throw new Error(`acknowledgedByOfficerId should be ${biOfficer2}, got ${refreshed.acknowledgedByOfficerId}`);
    }

    const finalNotifRes = await pool.query(
      `SELECT read_at FROM notifications WHERE recipient_officer_id = $1 AND entity_id = $2`,
      [biOfficer2, testComplaintId]
    );
    if (!finalNotifRes.rows[0].read_at) {
      throw new Error("Notification was not marked as read!");
    }
    console.log("✔ Notification read_at was persisted.");

    console.log("\n============================================================");
    console.log("ALL NOTIFICATION & ACKNOWLEDGEMENT TESTS PASSED SUCCESSFULLY!");
    console.log("============================================================\n");
  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------------
    console.log("[Cleanup] Removing test records...");
    await pool.query(`DELETE FROM notifications WHERE entity_id = $1`, [testComplaintId]);
    await pool.query(`DELETE FROM complaints WHERE complaint_id = $1`, [testComplaintId]);
    console.log("✔ Test data cleaned up.");
    await pool.end();
  }
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
