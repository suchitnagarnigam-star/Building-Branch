import "dotenv/config";
import express from "express";
import driveRoutes from "./routes/driveRoutes";
import { strict as assert } from "node:assert";

async function runTests() {
  console.log("🔒 [Drive Proxy Tests] Starting tests...");

  const app = express();
  app.use("/api/drive", driveRoutes);

  const server = app.listen(5097);
  let passed = 0;
  let failed = 0;

  const test = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn();
      console.log(`   ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`   ❌ FAIL: ${name}`, err);
      failed++;
    }
  };

  try {
    // Test 1: Invalid/malformed file ID rejected
    await test("Rejects traversal/malformed file ID with 400", async () => {
      const res = await fetch("http://localhost:5097/api/drive/files/..%2F..%2Fetc%2Fpasswd");
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.success, false);
    });

    // Test 2: Arbitrary/unassociated file ID rejected with 403
    await test("Rejects unassociated Drive file ID with 403", async () => {
      const res = await fetch("http://localhost:5097/api/drive/files/1ArbitraryFileIdNotInDatabase12345");
      assert.equal(res.status, 403);
      const json = await res.json();
      assert.equal(json.success, false);
    });

    // Test 3: Legitimate associated evidence file retrieved successfully
    await test("Serves associated evidence image with 200 and image mime type", async () => {
      const startTime = Date.now();
      const res = await fetch("http://localhost:5097/api/drive/files/1GOTb2d5tjECMHixdHxxTm1WlKGy73Rc_");
      const elapsed = Date.now() - startTime;
      assert.equal(res.status, 200);
      assert.equal(res.headers.get("content-type"), "image/png");
      assert(res.headers.get("cache-control")?.includes("max-age=604800"));
      assert.equal(res.headers.get("etag"), '"1GOTb2d5tjECMHixdHxxTm1WlKGy73Rc_"');
      const arrayBuf = await res.arrayBuffer();
      assert(arrayBuf.byteLength > 10000, `Expected image buffer > 10KB, got ${arrayBuf.byteLength}`);
      console.log(`      (Initial fetch elapsed: ${elapsed}ms, bytes: ${arrayBuf.byteLength})`);
    });

    // Test 4: Second request served from disk cache in under 25ms
    await test("Subsequent request served from disk cache (< 25ms)", async () => {
      const startTime = Date.now();
      const res = await fetch("http://localhost:5097/api/drive/files/1GOTb2d5tjECMHixdHxxTm1WlKGy73Rc_");
      const elapsed = Date.now() - startTime;
      assert.equal(res.status, 200);
      const arrayBuf = await res.arrayBuffer();
      assert(arrayBuf.byteLength > 10000);
      console.log(`      (Cache hit elapsed: ${elapsed}ms)`);
      assert(elapsed < 200, `Expected fast cache hit, took ${elapsed}ms`);
    });

    // Test 5: ETag 304 Not Modified
    await test("Returns 304 Not Modified when ETag matches", async () => {
      const res = await fetch("http://localhost:5097/api/drive/files/1GOTb2d5tjECMHixdHxxTm1WlKGy73Rc_", {
        headers: { "If-None-Match": '"1GOTb2d5tjECMHixdHxxTm1WlKGy73Rc_"' },
      });
      assert.equal(res.status, 304);
    });

  } finally {
    server.close();
  }

  console.log(`\n🏁 [Drive Proxy Tests] Completed: ${passed} passed, ${failed} failed.\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
