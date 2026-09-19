import "dotenv/config";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (error) => {
  console.warn("⚠️  [Database Pool Warning]:", error.message);
});

export async function testDatabaseConnection(): Promise<boolean> {
  const line = "============================================================";
  if (!databaseUrl) {
    console.log(`\n${line}\n🔴 [DATABASE STATUS]: UNCONFIGURED\n   Reason: DATABASE_URL environment variable is missing.\n   Mode: Local JSON Fallback Active\n${line}\n`);
    return false;
  }

  try {
    const startTime = Date.now();
    const result = await pool.query<{ now: string; current_database: string }>(
      "SELECT NOW() AS now, current_database() AS current_database",
    );
    const latency = Date.now() - startTime;
    const dbName = result.rows[0]?.current_database || "PostgreSQL";
    const dbTime = result.rows[0]?.now;

    console.log(`\n${line}`);
    console.log(`🟢 [DATABASE STATUS]: CONNECTED SUCCESSFULLY`);
    console.log(`   Database Name : ${dbName}`);
    console.log(`   Response Time : ${latency} ms`);
    console.log(`   Server Time   : ${dbTime}`);
    console.log(`   Mode          : Live PostgreSQL Query Active`);
    console.log(`${line}\n`);
    return true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.log(`\n${line}`);
    console.log(`🟡 [DATABASE STATUS]: CONNECTION FAILED / DISCONNECTED`);
    console.log(`   Error Details : ${errorMsg}`);
    console.log(`   Mode          : Local JSON Fallback Active (high availability)`);
    console.log(`${line}\n`);
    return false;
  }
}