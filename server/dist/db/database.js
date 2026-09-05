"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.testDatabaseConnection = testDatabaseConnection;
require("dotenv/config");
const pg_1 = require("pg");
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured. Add your Neon PostgreSQL connection string to server/.env.");
}
exports.pool = new pg_1.Pool({
    connectionString: databaseUrl,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});
exports.pool.on("error", (error) => {
    console.error("Unexpected PostgreSQL pool error:", error);
});
async function testDatabaseConnection() {
    const result = await exports.pool.query("SELECT NOW() AS now");
    console.log(`Neon PostgreSQL connected successfully at ${result.rows[0]?.now}`);
}
