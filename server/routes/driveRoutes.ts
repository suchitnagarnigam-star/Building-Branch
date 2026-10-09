import { Router, Request, Response } from "express";
import path from "node:path";
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { pool } from "../db/database";
import { getComplaintDriveFile } from "../services/driveService";

const router = Router();

const moduleDirectory = __dirname;
const serverRoot =
  path.basename(moduleDirectory) === "dist"
    ? path.resolve(moduleDirectory, "..")
    : moduleDirectory;

const CACHE_DIR = path.join(serverRoot, "uploads", "drive_cache");

// Ensure cache directory exists
mkdir(CACHE_DIR, { recursive: true }).catch((err) => {
  console.warn("[DriveProxy] Failed to create cache directory:", err.message);
});

// Allowed safe MIME types for public evidence/document viewing
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/svg+xml",
  "application/pdf",
]);

/**
 * Checks if a given Drive fileId is associated with any record in Building-Branch.
 * Enforces that only actual case evidence, notices, receipts, or attachments are publicly servable.
 */
export async function isDriveFileAssociatedWithRecord(fileId: string): Promise<boolean> {
  try {
    const res = await pool.query(
      `
      SELECT 1 FROM (
        SELECT drive_file_id AS id, drive_file_url AS url FROM visit_evidence
        UNION ALL
        SELECT drive_file_id, drive_file_url FROM notices
        UNION ALL
        SELECT drive_file_id, drive_file_url FROM violator_replies
        UNION ALL
        SELECT drive_file_id, drive_file_url FROM demolition_evidence
        UNION ALL
        SELECT evidence_drive_file_id, evidence_drive_file_url FROM case_closures
        UNION ALL
        SELECT receipt_drive_file_id, receipt_drive_file_url FROM construction_parts
      ) sub
      WHERE sub.id = $1 OR sub.url LIKE $2
      LIMIT 1;
      `,
      [fileId, `%${fileId}%`]
    );

    if (res.rowCount && res.rowCount > 0) {
      return true;
    }

    // Check complaints table (attachments JSON or drive folder URL)
    const complaintRes = await pool.query(
      `
      SELECT 1 FROM complaints
      WHERE attachments::text LIKE $1 OR drive_folder_url LIKE $1
      LIMIT 1;
      `,
      [`%${fileId}%`]
    );

    return !!(complaintRes.rowCount && complaintRes.rowCount > 0);
  } catch (error) {
    console.error("[DriveProxy] Record association check failed:", error);
    return false;
  }
}

/**
 * GET /api/drive/files/:fileId
 * Universal, secure public proxy for record-associated Google Drive files.
 */
router.get("/files/:fileId", async (req: Request, res: Response): Promise<void> => {
  const rawId = req.params.fileId;
  const fileId = Array.isArray(rawId) ? rawId[0] : rawId;

  // 1. Basic format & path traversal validation
  if (!fileId || typeof fileId !== "string" || !/^[a-zA-Z0-9_-]{15,100}$/.test(fileId)) {
    res.status(400).json({
      success: false,
      message: "Invalid or malformed Google Drive file ID.",
    });
    return;
  }

  // 2. HTTP Caching validation (ETag / If-None-Match)
  const clientEtag = req.headers["if-none-match"];
  if (clientEtag && clientEtag === `"${fileId}"`) {
    res.status(304).end();
    return;
  }

  const binPath = path.join(CACHE_DIR, `${fileId}.bin`);
  const metaPath = path.join(CACHE_DIR, `${fileId}.meta.json`);

  try {
    // 3. Check local disk cache first (sub-5ms hit)
    const [binExists, metaExists] = await Promise.all([
      stat(binPath).then(() => true).catch(() => false),
      stat(metaPath).then(() => true).catch(() => false),
    ]);

    if (binExists && metaExists) {
      const [buffer, metaRaw] = await Promise.all([
        readFile(binPath),
        readFile(metaPath, "utf-8"),
      ]);
      const meta = JSON.parse(metaRaw);

      res.setHeader("Content-Type", meta.mimeType || "application/octet-stream");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${encodeURIComponent(meta.fileName || "evidence")}"`
      );
      res.setHeader("Cache-Control", "public, max-age=604800, immutable");
      res.setHeader("ETag", `"${fileId}"`);
      res.send(buffer);
      return;
    }

    // 4. Verify file is associated with a Building-Branch record before fetching from Drive
    const isAssociated = await isDriveFileAssociatedWithRecord(fileId);
    if (!isAssociated) {
      res.status(403).json({
        success: false,
        message: "Forbidden: File is not associated with any Building-Branch record.",
      });
      return;
    }

    // 5. Fetch file from Google Apps Script Web App
    const result = await getComplaintDriveFile(fileId);

    if (!result.success || !result.data) {
      res.status(404).json({
        success: false,
        message: result.message || "File not found in Google Drive.",
      });
      return;
    }

    const mimeType = result.mimeType || "image/jpeg";
    const fileName = result.fileName || `file_${fileId}.jpg`;

    // 6. Safeguard: Verify MIME type is a permitted media/document format
    if (!ALLOWED_MIME_TYPES.has(mimeType) && !mimeType.startsWith("image/")) {
      res.status(415).json({
        success: false,
        message: "Unsupported file type for public preview.",
      });
      return;
    }

    const fileBuffer = Buffer.from(result.data, "base64");

    // 7. Write to local cache asynchronously
    Promise.all([
      writeFile(binPath, fileBuffer),
      writeFile(
        metaPath,
        JSON.stringify({
          fileId,
          fileName,
          mimeType,
          cachedAt: new Date().toISOString(),
        })
      ),
    ]).catch((err) => {
      console.warn("[DriveProxy] Failed to write cache files:", err.message);
    });

    // 8. Stream inline response with caching headers
    res.setHeader("Content-Type", mimeType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(fileName)}"`
    );
    res.setHeader("Cache-Control", "public, max-age=604800, immutable");
    res.setHeader("ETag", `"${fileId}"`);
    res.send(fileBuffer);
  } catch (error) {
    console.error("[DriveProxy] Retrieval error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while retrieving file.",
    });
  }
});

export default router;
