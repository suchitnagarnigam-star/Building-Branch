"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("./database");
async function main() {
    try {
        await (0, database_1.testDatabaseConnection)();
        const result = await database_1.pool.query("SELECT COUNT(*)::text AS count FROM complaints");
        console.log(`Complaints currently stored in Neon: ${result.rows[0]?.count ?? "0"}`);
    }
    catch (error) {
        console.error("Neon database test failed:", error);
        process.exitCode = 1;
    }
    finally {
        await database_1.pool.end();
    }
}
main();
