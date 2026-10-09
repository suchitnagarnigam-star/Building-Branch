import { API_BASE_URL } from "./apiConfig";

/**
 * Safely extracts a Google Drive file ID from a URL, raw ID, or preview link.
 */
export function extractDriveFileId(urlOrId?: string | null): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  if (!trimmed || trimmed === "#") return null;

  // Direct alphanumeric Google Drive file ID (15 to 100 characters)
  if (/^[a-zA-Z0-9_-]{15,100}$/.test(trimmed)) {
    return trimmed;
  }

  // URL containing /file/d/<id>/ or /d/<id> or ?id=<id>
  const match = trimmed.match(/(?:file\/d\/|\/d\/|[?&]id=)([a-zA-Z0-9_-]{15,100})/);
  if (match && match[1]) {
    return match[1];
  }

  return null;
}

/**
 * Returns a high-performance backend proxy URL for any Google Drive file.
 * Completely eliminates Google Drive "Request access" permission screens and broken thumbnails.
 */
export function getDriveFileProxyUrl(
  fileId?: string | null,
  fileUrl?: string | null
): string {
  const resolvedId = (fileId && fileId.trim()) || extractDriveFileId(fileUrl);
  if (resolvedId) {
    return `${API_BASE_URL}/drive/files/${encodeURIComponent(resolvedId)}`;
  }
  return fileUrl || "#";
}

/**
 * Checks whether a file reference appears to be a PDF.
 */
export function isDrivePdf(fileName?: string | null, mimeType?: string | null): boolean {
  if (mimeType?.toLowerCase().includes("pdf")) return true;
  if (fileName?.toLowerCase().endsWith(".pdf")) return true;
  return false;
}
