import fs from "node:fs/promises";
import path from "node:path";
import type { Request, Response, NextFunction } from "express";

let lastUserActivityTimestamp = Date.now();
let keepAliveTimer: NodeJS.Timeout | null = null;
let cleanupTimer: NodeJS.Timeout | null = null;

// Track the server root path
const moduleDirectory = __dirname;
const serverRoot =
  path.basename(moduleDirectory) === "services" || path.basename(moduleDirectory) === "dist"
    ? path.resolve(moduleDirectory, "..")
    : moduleDirectory;

const UPLOADS_DIR = path.join(serverRoot, "uploads");
const DRIVE_CACHE_DIR = path.join(serverRoot, "uploads", "drive_cache");

/**
 * Middleware: records the timestamp of user-initiated incoming HTTP requests.
 * Health check endpoints and automated self-pings are excluded so they do not
 * falsely mark the server as actively being used by human users.
 */
export function activityTrackerMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const isHealthPing =
    req.path === "/health" ||
    req.path === "/api/health" ||
    req.headers["user-agent"]?.includes("MCL-KeepAlive");

  if (!isHealthPing) {
    lastUserActivityTimestamp = Date.now();
  }
  next();
}

/**
 * Returns the timestamp of the last recorded user interaction.
 */
export function getLastUserActivityTimestamp(): number {
  return lastUserActivityTimestamp;
}

/**
 * Manually update the last user interaction timestamp (useful for testing).
 */
export function setLastUserActivityTimestamp(ts: number): void {
  lastUserActivityTimestamp = ts;
}

/**
 * Keep-Alive Cron: Pings the server's public URL every 14 minutes
 * (Render free tier instances sleep after 15 minutes of inactivity).
 */
export async function executeKeepAlivePing(port: number): Promise<boolean> {
  const publicUrl =
    process.env.SERVER_PUBLIC_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    `http://localhost:${port}`;

  const cleanUrl = publicUrl.replace(/\/$/, "");
  const pingEndpoint = `${cleanUrl}/api/health`;

  try {
    const res = await fetch(pingEndpoint, {
      headers: {
        "User-Agent": "MCL-KeepAlive/1.0",
      },
    });

    if (res.ok) {
      console.log(`[KeepAlive] Heartbeat succeeded (${res.status}) -> ${pingEndpoint}`);
      return true;
    }

    console.warn(`[KeepAlive] Heartbeat returned status ${res.status} from ${pingEndpoint}`);
    return false;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[KeepAlive] Heartbeat failed for ${pingEndpoint}: ${message}`);
    return false;
  }
}

/**
 * Cleans orphan temporary uploads in server/uploads/ that are older than maxAgeMs.
 * By default, files older than 1 hour (3600000ms) that were left behind by aborted uploads are removed.
 */
export async function cleanOrphanUploads(maxAgeMs = 60 * 60 * 1000): Promise<number> {
  let cleanedCount = 0;
  try {
    const entries = await fs.readdir(UPLOADS_DIR, { withFileTypes: true });
    const now = Date.now();

    for (const entry of entries) {
      if (entry.isFile()) {
        const filePath = path.join(UPLOADS_DIR, entry.name);
        try {
          const stats = await fs.stat(filePath);
          if (now - stats.mtimeMs > maxAgeMs) {
            await fs.unlink(filePath);
            cleanedCount++;
          }
        } catch {
          // File may have been removed concurrently
        }
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[Maintenance] Error inspecting uploads directory: ${message}`);
  }
  return cleanedCount;
}

/**
 * Cleans expired Google Drive cache files older than maxCacheAgeMs (default: 7 days).
 */
export async function cleanStaleDriveCache(maxCacheAgeMs = 7 * 24 * 60 * 60 * 1000): Promise<number> {
  let cleanedCount = 0;
  try {
    const entries = await fs.readdir(DRIVE_CACHE_DIR, { withFileTypes: true });
    const now = Date.now();

    for (const entry of entries) {
      if (entry.isFile()) {
        const filePath = path.join(DRIVE_CACHE_DIR, entry.name);
        try {
          const stats = await fs.stat(filePath);
          if (now - stats.mtimeMs > maxCacheAgeMs) {
            await fs.unlink(filePath);
            cleanedCount++;
          }
        } catch {
          // File may have been removed concurrently
        }
      }
    }
  } catch {
    // Cache directory may not exist yet if no files cached
  }
  return cleanedCount;
}

/**
 * Runs idle maintenance tasks if the user has been inactive for >= idleThresholdMinutes.
 */
export async function runIdleServerCleanup(idleThresholdMinutes = 30): Promise<{
  executed: boolean;
  uploadsCleaned: number;
  cacheCleaned: number;
}> {
  const idleMs = Date.now() - lastUserActivityTimestamp;
  const thresholdMs = idleThresholdMinutes * 60 * 1000;

  if (idleMs < thresholdMs) {
    return { executed: false, uploadsCleaned: 0, cacheCleaned: 0 };
  }

  const uploadsCleaned = await cleanOrphanUploads();
  const cacheCleaned = await cleanStaleDriveCache();

  if (uploadsCleaned > 0 || cacheCleaned > 0) {
    console.log(
      `[Maintenance] Idle server cleanup completed: ${uploadsCleaned} orphaned uploads, ${cacheCleaned} stale cache files removed.`,
    );
  }

  return {
    executed: true,
    uploadsCleaned,
    cacheCleaned,
  };
}

/**
 * Initializes both the 14-minute Render Keep-Alive job and the periodic Idle Cleanup job.
 */
export function initCronJobs(port: number): {
  stop: () => void;
} {
  // 1. Keep-Alive: Ping every 14 minutes (840,000 ms)
  const KEEP_ALIVE_INTERVAL_MS = 14 * 60 * 1000;
  keepAliveTimer = setInterval(() => {
    executeKeepAlivePing(port).catch(() => {});
  }, KEEP_ALIVE_INTERVAL_MS);

  // Initial keep-alive check after 10 seconds of startup
  setTimeout(() => {
    executeKeepAlivePing(port).catch(() => {});
  }, 10000);

  // 2. Idle Cleanup: Check every 15 minutes (900,000 ms)
  const idleThreshold = process.env.IDLE_CLEANUP_THRESHOLD_MINUTES
    ? Math.max(5, Number(process.env.IDLE_CLEANUP_THRESHOLD_MINUTES))
    : 30;

  const CLEANUP_CHECK_INTERVAL_MS = 15 * 60 * 1000;
  cleanupTimer = setInterval(() => {
    runIdleServerCleanup(idleThreshold).catch((err) => {
      console.warn(`[Maintenance] Error during idle cleanup:`, err);
    });
  }, CLEANUP_CHECK_INTERVAL_MS);

  console.log(
    `⏰ [CronService] Initialized Keep-Alive (every 14m) and Idle Data Cleanup (threshold: ${idleThreshold}m).`,
  );

  return {
    stop: () => {
      if (keepAliveTimer) clearInterval(keepAliveTimer);
      if (cleanupTimer) clearInterval(cleanupTimer);
    },
  };
}
