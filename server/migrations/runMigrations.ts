import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pool } from "../db/database";
import { seedUsers } from "./seedUsers";

export async function runMigrations(options: { seed?: boolean } = {}): Promise<void> {
  const migrationsDir = __dirname;
  console.log("🚀 [Migrations] Starting database migrations 001–007...");

  const files = await readdir(migrationsDir);
  const sqlFiles = files
    .filter((f) => f.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  for (const file of sqlFiles) {
    const filePath = path.join(migrationsDir, file);
    const sql = await readFile(filePath, "utf-8");

    // Skip empty or comment-only SQL files
    const trimmed = sql.replace(/--.*$/gm, "").trim();
    if (!trimmed) {
      console.log(`   ℹ️  Skipped non-executable migration: ${file}`);
      continue;
    }

    try {
      await pool.query(sql);
      console.log(`   ✅ Applied migration: ${file}`);
    } catch (error) {
      console.error(`   ❌ Failed migration ${file}:`, error);
      throw error;
    }
  }

  // Check if users need seeding
  try {
    const userCountRes = await pool.query<{ count: string }>("SELECT COUNT(*) AS count FROM users");
    const count = Number(userCountRes.rows[0]?.count || 0);

    if (count === 0 || options.seed || process.argv.includes("--seed")) {
      console.log(`🌱 [Migrations] Seeding users (current count: ${count})...`);
      await seedUsers();
    } else {
      console.log(`   ℹ️  Users table already populated (${count} users present).`);
    }
  } catch (seedErr) {
    console.warn("   ⚠️  User seeding check skipped:", (seedErr as Error).message);
  }

  console.log("✨ [Migrations] All database migrations completed successfully.\n");
}

if (require.main === module || process.argv[1]?.includes("runMigrations")) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Migration execution failed:", err);
      process.exit(1);
    });
}
