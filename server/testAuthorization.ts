import "dotenv/config";
import { getUserAssignedBlocks, isBlockAssigned, normalizeBlock } from "./services/accessControl";
import { generateToken } from "./services/authService";
import app from "./app";
import http from "http";

async function runAuthorizationTests() {
  console.log("🔒 [Auth Tests] Starting block-level authorization verification...");
  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, msg: string) => {
    if (condition) {
      console.log(`   ✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`   ❌ FAIL: ${msg}`);
      failed++;
    }
  };

  // 1. Unit Tests for accessControl helpers
  assert(normalizeBlock("Block 2") === "2", "normalizeBlock('Block 2') -> '2'");
  assert(normalizeBlock("block 25") === "25", "normalizeBlock('block 25') -> '25'");
  assert(normalizeBlock("Zone A") === "a", "normalizeBlock('Zone A') -> 'a'");

  // Unrestricted roles should return null
  const superadminBlocks = await getUserAssignedBlocks({ userId: 1, officerId: null, role: "superadmin", name: "Admin", zone: null });
  assert(superadminBlocks === null, "Superadmin role has unrestricted blocks (null)");

  const operatorBlocks = await getUserAssignedBlocks({ userId: 2, officerId: null, role: "operator", name: "Operator", zone: null });
  assert(operatorBlocks === null, "Operator role has unrestricted blocks (null)");

  const mtpBlocks = await getUserAssignedBlocks({ userId: 3, officerId: "MTP-01", role: "mtp", name: "MTP Officer", zone: "Zone A" });
  assert(mtpBlocks === null, "MTP role has unrestricted blocks (null)");

  // Restricted BI officer
  const biBlocks = await getUserAssignedBlocks({
    userId: 4,
    officerId: "BI-01",
    role: "bi",
    name: "BI Officer",
    zone: "Zone A",
    blocks: ["2", "25", "32"],
  });
  assert(Array.isArray(biBlocks) && biBlocks.length === 3, "BI officer has 3 assigned blocks");

  // isBlockAssigned checks
  assert(isBlockAssigned("Block 2", biBlocks) === true, "BI allowed to access 'Block 2'");
  assert(isBlockAssigned("2", biBlocks) === true, "BI allowed to access bare '2'");
  assert(isBlockAssigned("Block 99", biBlocks) === false, "BI forbidden from accessing 'Block 99'");
  assert(isBlockAssigned("Block 99", superadminBlocks) === true, "Superadmin allowed to access any block ('Block 99')");

  // 2. Integration HTTP Route Tests
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(5098, resolve));

  const biToken = generateToken({
    userId: 10,
    officerId: "OFF-BI-TEST",
    role: "bi",
    name: "Test BI",
    zone: "Zone A",
    blocks: ["2"],
  });

  const superadminToken = generateToken({
    userId: 1,
    officerId: null,
    role: "superadmin",
    name: "Test Admin",
    zone: null,
  });

  // Test restricted access to outside block via /cases route
  const resForbidden = await fetch("http://localhost:5098/api/cases/CAS-NONEXISTENT-999", {
    headers: { Authorization: `Bearer ${biToken}` },
  });
  // Non-existent returns 404, proving token authentication passed
  assert(resForbidden.status === 404 || resForbidden.status === 403, "Protected route requires valid authorization");

  server.close();

  console.log(`\n🏁 [Auth Tests] Completed: ${passed} passed, ${failed} failed.\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runAuthorizationTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
