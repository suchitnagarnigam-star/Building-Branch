import "dotenv/config";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not configured. Add your Neon PostgreSQL connection string to server/.env.",
  );
}

export const pool = new Pool({
  connectionString: databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error);
});

export async function testDatabaseConnection(): Promise<void> {
  const result = await pool.query<{ now: string }>(
    "SELECT NOW() AS now",
  );

  console.log(
    `Neon PostgreSQL connected successfully at ${result.rows[0]?.now}`,
  );
}