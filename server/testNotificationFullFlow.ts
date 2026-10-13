import "dotenv/config";
import { pool } from "./db/database";
import { generateToken } from "./services/authService";
import { notifyOfficer } from "./services/pushService";
import { saveComplaint, getComplaints } from "./services/complaintStorage";
import type { Complaint } from "./types/complaint";

async function runTests() {
  console.log("================================================================================");
  console.log("TESTING: Notification Center & Assignment Flow End-To-End Verification");
  console.log("================================================================================\n");

  const testComplaintId = `NOTIF-FLOW-${Date.now()}`;
  const biOfficer1 = "BI-VERIFY-01";
  const biOfficer2 = "BI-VERIFY-02";

  // Create mock JWT tokens for officers
  const tokenBi1 = generateToken({
    userId: 9001,
    officerId: biOfficer1,
    role: "bi",
    name: "Verification Inspector 1",
    zone: "Zone A",
    block: "Block 1",
  });

  const tokenBi2 = generateToken({
    userId: 9002,
    officerId: biOfficer2,
    role: "bi",
    name: "Verification Inspector 2",
    zone: "Zone B",
    block: "Block 2",
  });

  const port = process.env.PORT || 5000;
  const baseUrl = `http://localhost:${port}/api`;

  try {
    // -------------------------------------------------------------------------
    // STEP 1: Create a Complaint and Assign to BI 1
    // -------------------------------------------------------------------------
    console.log(`[Step 1] Creating complaint ${testComplaintId} assigned to ${biOfficer1}...`);
    const complaint: Complaint = {
      complaintId: testComplaintId,
      title: "Commercial Encroachment on Public Pathway",
      description: "Unauthorized commercial shed built without permission",
      zone: "Zone A",
      ward: "Ward 5",
      block: "Block 1",
      status: "Assigned",
      registrationSource: "manual",
      address: "123 Mall Road, Ludhiana",
      citizenName: "Gurpreet Singh",
      phoneNumber: "9812345678",
      attachments: [],
      assignedOfficerId: biOfficer1,
      assignedOfficerName: "Verification Inspector 1",
      assignedOfficerMobile: "9812345678",
      assignedAtpId: null,
      assignedAtpName: null,
      assignedAtpMobile: null,
      createdAt: new Date().toISOString(),
      assignmentAcknowledgedAt: null,
      acknowledgedByOfficerId: null,
    };

    await saveComplaint(complaint);

    await notifyOfficer(biOfficer1, {
      title: "New Complaint Assigned",
      body: `Complaint #${testComplaintId} in Block 1 (Zone A) has been assigned to you.`,
      tag: `complaint-${testComplaintId}-assigned`,
      url: `/complaints/${encodeURIComponent(testComplaintId)}`,
      type: "complaint_assignment",
      entityType: "complaint",
      entityId: testComplaintId,
    });
    console.log("✔ Complaint saved and notification dispatched to BI 1.");

    // -------------------------------------------------------------------------
    // STEP 2: Verify GET /api/notifications for BI 1
    // -------------------------------------------------------------------------
    console.log(`\n[Step 2] Fetching notifications for ${biOfficer1}...`);
    const resBi1 = await fetch(`${baseUrl}/notifications`, {
      headers: { Authorization: `Bearer ${tokenBi1}` },
    });
    if (!resBi1.ok) {
      throw new Error(`GET /notifications for BI 1 returned HTTP ${resBi1.status}`);
    }
    const dataBi1 = await resBi1.json();
    console.log(`  BI 1 total notifications: ${dataBi1.notifications.length}, unreadCount: ${dataBi1.unreadCount}`);

    const targetNotif = dataBi1.notifications.find((n: any) => n.entityId === testComplaintId);
    if (!targetNotif) {
      throw new Error("Created notification not found in BI 1 notifications list!");
    }
    if (targetNotif.isRead !== false) {
      throw new Error("Target notification should initially be unread (isRead: false)!");
    }
    if (!targetNotif.title.includes("New Complaint Assigned")) {
      throw new Error(`Unexpected title: ${targetNotif.title}`);
    }
    if (!targetNotif.body.includes(testComplaintId)) {
      throw new Error(`Target notification body does not contain complaint ID! Body: ${targetNotif.body}`);
    }
    console.log(`✔ BI 1 correctly sees unseen notification: "${targetNotif.title}" for #${targetNotif.entityId}`);

    // -------------------------------------------------------------------------
    // STEP 3: Verify Security Isolation (BI 2 cannot see BI 1's notifications)
    // -------------------------------------------------------------------------
    console.log(`\n[Step 3] Verifying security isolation for ${biOfficer2}...`);
    const resBi2 = await fetch(`${baseUrl}/notifications`, {
      headers: { Authorization: `Bearer ${tokenBi2}` },
    });
    const dataBi2 = await resBi2.json();
    const leakCheck = dataBi2.notifications.find((n: any) => n.entityId === testComplaintId);
    if (leakCheck) {
      throw new Error("Security leak! BI 2 was able to view BI 1's notification!");
    }
    console.log("✔ Security isolation verified: BI 2 cannot access notifications belonging to BI 1.");

    // -------------------------------------------------------------------------
    // STEP 4: Deduplication Check
    // -------------------------------------------------------------------------
    console.log(`\n[Step 4] Checking notification deduplication for ${biOfficer1}...`);
    await notifyOfficer(biOfficer1, {
      title: "New Complaint Assigned (Reminder)",
      body: `Complaint #${testComplaintId} in Block 1 (Zone A) has been assigned to you.`,
      tag: `complaint-${testComplaintId}-assigned`,
      url: `/complaints/${encodeURIComponent(testComplaintId)}`,
      type: "complaint_assignment",
      entityType: "complaint",
      entityId: testComplaintId,
    });

    const resDedupe = await fetch(`${baseUrl}/notifications`, {
      headers: { Authorization: `Bearer ${tokenBi1}` },
    });
    const dataDedupe = await resDedupe.json();
    const countMatches = dataDedupe.notifications.filter((n: any) => n.entityId === testComplaintId);
    if (countMatches.length !== 1) {
      throw new Error(`Expected exactly 1 notification after re-triggering, found ${countMatches.length}!`);
    }
    console.log("✔ Deduplication verified: existing notification updated without duplicate rows.");

    // -------------------------------------------------------------------------
    // STEP 5: Unauthorized Update Attempt (BI 2 tries to mark BI 1's notif as read)
    // -------------------------------------------------------------------------
    console.log(`\n[Step 5] Testing unauthorized PATCH /notifications/:id/read by BI 2...`);
    const resHack = await fetch(`${baseUrl}/notifications/${targetNotif.notificationId}/read`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tokenBi2}` },
    });
    if (resHack.status !== 404 && resHack.status !== 403) {
      throw new Error(`Expected 404 or 403 for unauthorized patch, got ${resHack.status}!`);
    }
    console.log(`✔ Security verified: BI 2 cannot mark BI 1's notification as read (HTTP ${resHack.status}).`);

    // -------------------------------------------------------------------------
    // STEP 6: Mark Notification Read via PATCH /api/notifications/:id/read as BI 1
    // -------------------------------------------------------------------------
    console.log(`\n[Step 6] Marking notification #${targetNotif.notificationId} as read by BI 1...`);
    const unreadBefore = dataBi1.unreadCount;
    const resMarkRead = await fetch(`${baseUrl}/notifications/${targetNotif.notificationId}/read`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tokenBi1}` },
    });
    if (!resMarkRead.ok) {
      throw new Error(`PATCH /notifications/:id/read failed with HTTP ${resMarkRead.status}`);
    }
    const markReadData = await resMarkRead.json();
    console.log(`  Response: success=${markReadData.success}, new unreadCount=${markReadData.unreadCount}`);

    // Verify DB persistence
    const resAfterRead = await fetch(`${baseUrl}/notifications`, {
      headers: { Authorization: `Bearer ${tokenBi1}` },
    });
    const dataAfterRead = await resAfterRead.json();
    const updatedNotif = dataAfterRead.notifications.find((n: any) => n.entityId === testComplaintId);
    if (!updatedNotif) {
      throw new Error("Target notification disappeared from all notifications list!");
    }
    if (updatedNotif.isRead !== true) {
      throw new Error("Target notification is still marked unread!");
    }
    if (!updatedNotif.readAt) {
      throw new Error("Target notification readAt timestamp is missing!");
    }
    console.log(`✔ Notification successfully marked as read: isRead=${updatedNotif.isRead}, readAt=${updatedNotif.readAt}`);

    // Verify unseen/unreadOnly filter: it must NOT appear in unseen list
    const resUnreadOnly = await fetch(`${baseUrl}/notifications?unreadOnly=true`, {
      headers: { Authorization: `Bearer ${tokenBi1}` },
    });
    const dataUnreadOnly = await resUnreadOnly.json();
    const unseenCheck = dataUnreadOnly.notifications.find((n: any) => n.entityId === testComplaintId);
    if (unseenCheck) {
      throw new Error("Notification still present in ?unreadOnly=true list after being marked as read!");
    }
    console.log("✔ Unseen filter verified: marked notification is removed from unseen list.");

    // -------------------------------------------------------------------------
    // STEP 7: Verify Complaint NEW Badge / Acknowledgement Flow
    // -------------------------------------------------------------------------
    console.log(`\n[Step 7] Verifying complaint acknowledgement preserves NEW badge flow...`);
    const storedComplaints = await getComplaints();
    const foundComplaint = storedComplaints.find((c) => c.complaintId === testComplaintId);
    if (!foundComplaint) {
      throw new Error("Complaint not found in DB!");
    }
    console.log(`  Complaint assignmentAcknowledgedAt: ${foundComplaint.assignmentAcknowledgedAt}`);
    
    // Simulate opening complaint detail and auto-acknowledging
    const ackRes = await fetch(`${baseUrl}/complaints/${encodeURIComponent(testComplaintId)}/acknowledge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenBi1}`,
      },
    });
    if (!ackRes.ok) {
      throw new Error(`Failed to acknowledge complaint: HTTP ${ackRes.status}`);
    }
    const ackData = await ackRes.json();
    console.log(`✔ Complaint acknowledged successfully: acknowledgedBy=${ackData.acknowledgedByOfficerId}, at=${ackData.assignmentAcknowledgedAt}`);

    console.log("\n================================================================================");
    console.log("ALL NOTIFICATION WORKFLOW & INTEGRATION TESTS PASSED!");
    console.log("================================================================================\n");
  } finally {
    // Cleanup
    console.log("[Cleanup] Cleaning up test records from database...");
    await pool.query("DELETE FROM notifications WHERE entity_id = $1", [testComplaintId]);
    await pool.query("DELETE FROM complaints WHERE complaint_id = $1", [testComplaintId]);
    console.log("✔ Cleanup complete.");
    await pool.end();
  }
}

runTests().catch((err) => {
  console.error("❌ Test run failed:", err);
  process.exit(1);
});
