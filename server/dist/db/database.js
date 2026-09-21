"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.testDatabaseConnection = testDatabaseConnection;
require("dotenv/config");
const pg_1 = require("pg");
const databaseUrl = process.env.DATABASE_URL;
exports.pool = new pg_1.Pool({
    connectionString: databaseUrl,
    ssl: {
        rejectUnauthorized: false,
    },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});
exports.pool.on("error", (error) => {
    console.warn("⚠️  [Database Pool Warning]:", error.message);
});
async function testDatabaseConnection() {
    const line = "============================================================";
    if (!databaseUrl) {
        console.log(`\n${line}\n🔴 [DATABASE STATUS]: UNCONFIGURED\n   Reason: DATABASE_URL environment variable is missing.\n   Mode: Local JSON Fallback Active\n${line}\n`);
        return false;
    }
    try {
        const startTime = Date.now();
        const result = await exports.pool.query("SELECT NOW() AS now, current_database() AS current_database");
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
    }
    catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.log(`\n${line}`);
        console.log(`🟡 [DATABASE STATUS]: CONNECTION FAILED / DISCONNECTED`);
        console.log(`   Error Details : ${errorMsg}`);
        console.log(`   Mode          : Local JSON Fallback Active (high availability)`);
        console.log(`${line}\n`);
        return false;
    }
}
