"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.testDatabaseConnection = testDatabaseConnection;
require("dotenv/config");
const node_dns_1 = __importDefault(require("node:dns"));
const pg_1 = require("pg");
// Resilient DNS resolution: some local ISP/router DNS servers fail or refuse DNS queries for
// cloud endpoints like Neon (*.aws.neon.tech). If system getaddrinfo fails, fallback to public DNS.
try {
    node_dns_1.default.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
    const originalLookup = node_dns_1.default.lookup;
    node_dns_1.default.lookup = ((hostname, options, callback) => {
        let cb = callback;
        let opts = options;
        if (typeof options === "function") {
            cb = options;
            opts = {};
        }
        originalLookup(hostname, opts, (err, address, family) => {
            if (err && hostname) {
                node_dns_1.default.resolve4(hostname, (rErr, addresses) => {
                    if (!rErr && addresses && addresses.length > 0) {
                        if (opts && typeof opts === "object" && opts.all) {
                            return cb(null, addresses.map((ip) => ({ address: ip, family: 4 })));
                        }
                        return cb(null, addresses[0], 4);
                    }
                    return cb(err, address, family);
                });
            }
            else {
                return cb(err, address, family);
            }
        });
    });
}
catch (e) {
    // Graceful fallback if DNS hook cannot be attached
}
const rawDatabaseUrl = process.env.DATABASE_URL;
// Ensure sslmode doesn't trigger deprecation warning
const databaseUrl = rawDatabaseUrl
    ? rawDatabaseUrl.replace("sslmode=require", "sslmode=verify-full")
    : undefined;
exports.pool = new pg_1.Pool({
    connectionString: databaseUrl,
    ssl: {
        rejectUnauthorized: false,
    },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
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
