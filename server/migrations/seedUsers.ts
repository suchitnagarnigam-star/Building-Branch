import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcrypt";
import { pool } from "../db/database";

interface OfficerRecord {
  officerId: string;
  name: string;
  mobile: string;
  designation: string;
  zone: string;
  blocks: string[];
}

const mapDesignationToRole = (designation: string): "bi" | "atp" | "mtp" | "jc" => {
  const norm = designation.trim().toUpperCase();
  if (norm.includes("JC")) return "jc";
  if (norm.includes("MTP")) return "mtp";
  if (norm.includes("ATP")) return "atp";
  if (norm === "BI" || norm.endsWith("-BI") || norm.includes("BI")) return "bi";
  return "bi";
};

export async function seedUsers(): Promise<void> {
  const rounds = Number(process.env.BCRYPT_ROUNDS) || 10;
  console.log("🌱 [Seed] Starting users and officers seed...");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Seed Super Admin
    const adminCheck = await client.query(
      "SELECT user_id FROM users WHERE username = $1",
      ["admin"]
    );
    if (adminCheck.rowCount === 0) {
      const adminHash = await bcrypt.hash("Admin@MCL2026", rounds);
      await client.query(
        `INSERT INTO users (username, password_hash, role, name, is_active, failed_attempts)
         VALUES ($1, $2, 'superadmin', 'Super Admin', true, 0)`,
        ["admin", adminHash]
      );
      console.log("   ✅ Seeded superadmin ('admin')");
    } else {
      console.log("   ℹ️  Superadmin ('admin') already exists, skipping");
    }

    // 2. Seed Desk Operator
    const operatorCheck = await client.query(
      "SELECT user_id FROM users WHERE username = $1",
      ["operator1"]
    );
    if (operatorCheck.rowCount === 0) {
      const opHash = await bcrypt.hash("Admin@MCL2026", rounds);
      await client.query(
        `INSERT INTO users (username, password_hash, role, name, is_active, failed_attempts)
         VALUES ($1, $2, 'operator', 'Desk Operator', true, 0)`,
        ["operator1", opHash]
      );
      console.log("   ✅ Seeded operator ('operator1')");
    } else {
      console.log("   ℹ️  Operator ('operator1') already exists, skipping");
    }

    // 3. Seed Officers from server/data/officers.json
    const filePath = path.join(__dirname, "..", "data", "officers.json");
    const rawData = await readFile(filePath, "utf-8");
    const officers: OfficerRecord[] = JSON.parse(rawData);

    for (const officer of officers) {
      const normalizedPhone = officer.mobile.replace(/-/g, "").trim();
      const pin = normalizedPhone.slice(-6);
      const role = mapDesignationToRole(officer.designation);

      // Ensure officer exists in officers table
      await client.query(
        `INSERT INTO officers (officer_id, name, phone_number, designation, zone, blocks)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (officer_id) DO UPDATE
         SET name = EXCLUDED.name,
             phone_number = EXCLUDED.phone_number,
             designation = EXCLUDED.designation,
             zone = EXCLUDED.zone,
             blocks = EXCLUDED.blocks,
             updated_at = NOW()`,
        [
          officer.officerId,
          officer.name,
          officer.mobile,
          officer.designation,
          officer.zone,
          JSON.stringify(officer.blocks),
        ]
      );

      // Check if user already exists (normalizing hyphens)
      const userCheck = await client.query(
        "SELECT user_id FROM users WHERE REPLACE(phone_number, '-', '') = REPLACE($1, '-', '')",
        [officer.mobile]
      );

      let userId: number;
      if (userCheck.rowCount === 0) {
        const passwordHash = await bcrypt.hash(pin, rounds);
        const insertUser = await client.query(
          `INSERT INTO users (phone_number, password_hash, role, name, is_active, failed_attempts)
           VALUES ($1, $2, $3, $4, true, 0)
           RETURNING user_id`,
          [officer.mobile, passwordHash, role, officer.name]
        );
        userId = insertUser.rows[0].user_id;
        console.log(`   ✅ Seeded officer user: ${officer.name} (${officer.officerId}, PIN: ${pin})`);
      } else {
        userId = userCheck.rows[0].user_id;
        console.log(`   ℹ️  User for ${officer.name} (${officer.officerId}) already exists, updating linkage`);
      }

      // Update officer with user_id foreign key
      await client.query(
        "UPDATE officers SET user_id = $1 WHERE officer_id = $2",
        [userId, officer.officerId]
      );
    }

    await client.query("COMMIT");
    console.log("🎉 [Seed] Users and officers seeded successfully!");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ [Seed] Error seeding users:", error);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module || process.argv[1]?.includes("seedUsers")) {
  seedUsers()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

