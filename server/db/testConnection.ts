import { pool, testDatabaseConnection } from "./database";

async function main(){
  try {
  await testDatabaseConnection();

  const result = await pool.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM complaints",
  );

  console.log(
    `Complaints currently stored in Neon: ${result.rows[0]?.count ?? "0"}`,
  );
  } catch (error) {
    console.error("Neon database test failed:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
main();