import "dotenv/config";
import dns from "node:dns";
import { Pool } from "pg";

// Resilient DNS resolution: some local ISP/router DNS servers fail or refuse DNS queries for
// cloud endpoints like Neon (*.aws.neon.tech). If system getaddrinfo fails, fallback to public DNS.
try {
  dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
  const originalLookup = dns.lookup;
  dns.lookup = ((hostname: string, options: any, callback?: any) => {
    let cb = callback;
    let opts = options;
    if (typeof options === "function") {
      cb = options;
      opts = {};
    }

    originalLookup(hostname, opts, (err: NodeJS.ErrnoException | null, address: any, family?: any) => {
      if (err && hostname) {
        dns.resolve4(hostname, (rErr, addresses) => {
          if (!rErr && addresses && addresses.length > 0) {
            if (opts && typeof opts === "object" && opts.all) {
              return cb(null, addresses.map((ip) => ({ address: ip, family: 4 })));
            }
            return cb(null, addresses[0], 4);
          }
          return cb(err, address, family);
        });
      } else {
        return cb(err, address, family);
      }
    });
  }) as typeof dns.lookup;
} catch (e) {
  // Graceful fallback if DNS hook cannot be attached
}

const rawDatabaseUrl = process.env.DATABASE_URL;
// Ensure sslmode doesn't trigger deprecation warning
const databaseUrl = rawDatabaseUrl
  ? rawDatabaseUrl.replace("sslmode=require", "sslmode=verify-full")
  : undefined;

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000,
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