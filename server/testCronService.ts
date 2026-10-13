import assert from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";
import express from "express";
import {
  activityTrackerMiddleware,
  getLastUserActivityTimestamp,
  setLastUserActivityTimestamp,
  executeKeepAlivePing,
  cleanOrphanUploads,
  cleanStaleDriveCache,
  runIdleServerCleanup,
} from "./services/cronService";

async function runTests() {
  console.log("============================================================");
  console.log("TESTING: Keep-Alive Pings, Activity Tracking & Idle Cleanup");
  console.log("============================================================\n");

  const app = express();
  app.use(activityTrackerMiddleware);
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/api/test-user-action", (_req, res) => res.json({ ok: true }));

  const server = app.listen(5099);

  try {
    // TEST 1: Health check doesn't advance user activity timestamp
    console.log("[Step 1] Verifying activity tracker isolates health check pings...");
    const initialTimestamp = 1000000;
    setLastUserActivityTimestamp(initialTimestamp);

    const healthRes = await fetch("http://localhost:5099/api/health", {
      headers: { "User-Agent": "MCL-KeepAlive/1.0" },
    });
    assert.strictEqual(healthRes.status, 200, "Health endpoint should return 200");
    assert.strictEqual(
      getLastUserActivityTimestamp(),
      initialTimestamp,
      "Self-ping / health check must NOT update user activity timestamp",
    );
    console.log("✔ Activity tracker successfully ignored health ping.");

    // TEST 2: User requests advance the activity timestamp
    console.log("\n[Step 2] Verifying standard user requests update activity timestamp...");
    const userRes = await fetch("http://localhost:5099/api/test-user-action");
    assert.strictEqual(userRes.status, 200);
    assert(
      getLastUserActivityTimestamp() > initialTimestamp,
      "Standard user endpoint must refresh user activity timestamp",
    );
    console.log("✔ User activity updated to:", getLastUserActivityTimestamp());

    // TEST 3: Keep-Alive Self-Ping returns true against active server
    console.log("\n[Step 3] Testing executeKeepAlivePing against local server...");
    const keepAliveSuccess = await executeKeepAlivePing(5099);
    assert.strictEqual(keepAliveSuccess, true, "executeKeepAlivePing should succeed");
    console.log("✔ executeKeepAlivePing succeeded.");

    // TEST 4: Cleanup of orphan temporary uploads
    console.log("\n[Step 4] Testing orphan upload cleanup...");
    const uploadsDir = path.join(__dirname, "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });

    // Create an artificial old file (age > 2 hours)
    const testOrphanFile = path.join(uploadsDir, `test-orphan-${Date.now()}.tmp`);
    await fs.writeFile(testOrphanFile, "test data");
    
    // Set mtime to 3 hours ago
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    await fs.utimes(testOrphanFile, threeHoursAgo, threeHoursAgo);

    // Create a fresh file (age = now)
    const freshFile = path.join(uploadsDir, `test-fresh-${Date.now()}.tmp`);
    await fs.writeFile(freshFile, "fresh data");

    const cleanedCount = await cleanOrphanUploads(60 * 60 * 1000);
    assert(cleanedCount >= 1, "Should clean at least 1 orphan file");

    let orphanExists = false;
    try {
      await fs.stat(testOrphanFile);
      orphanExists = true;
    } catch {
      orphanExists = false;
    }
    assert.strictEqual(orphanExists, false, "Orphan file must have been deleted");

    let freshExists = false;
    try {
      await fs.stat(freshFile);
      freshExists = true;
    } catch {
      freshExists = false;
    }
    assert.strictEqual(freshExists, true, "Fresh file must remain intact");

    // Clean fresh file
    await fs.unlink(freshFile).catch(() => {});
    console.log("✔ Orphan uploads cleaned properly while preserving fresh files.");

    // TEST 5: Idle threshold enforcement
    console.log("\n[Step 5] Testing idle threshold enforcement...");
    // 5a. Set timestamp to now (NOT idle)
    setLastUserActivityTimestamp(Date.now());
    const notIdleResult = await runIdleServerCleanup(30);
    assert.strictEqual(notIdleResult.executed, false, "Cleanup should NOT run when server is active");
    console.log("✔ Cleanup skipped when user activity was recent.");

    // 5b. Set timestamp to 45 minutes ago (idle)
    setLastUserActivityTimestamp(Date.now() - 45 * 60 * 1000);
    const idleResult = await runIdleServerCleanup(30);
    assert.strictEqual(idleResult.executed, true, "Cleanup SHOULD run when server is idle");
    console.log("✔ Cleanup executed when user inactivity exceeded threshold.");

    console.log("\n============================================================");
    console.log("ALL CRON SERVICE & CLEANUP TESTS PASSED SUCCESSFULLY!");
    console.log("============================================================\n");
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
