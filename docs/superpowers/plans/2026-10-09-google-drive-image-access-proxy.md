# Google Drive Image Access & Proxy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate Google Drive "Request access" permission barriers and broken image thumbnails by implementing a high-performance backend Drive file proxy with disk caching, an in-app image viewer/lightbox, and updating all case, inspection, notice, and complaint views.

**Architecture:** A unified backend proxy endpoint (`GET /api/drive/files/:fileId`) securely retrieves file streams via the authorized Google Drive Apps Script caller (`getComplaintDriveFile`), caches binary payloads to `server/uploads/drive_cache/` for sub-5ms responses, and serves files with immutable HTTP caching. The frontend uses a centralized `getDriveFileProxyUrl` utility and an `ImageViewerModal` lightbox component, replacing broken `lh3.googleusercontent.com` and external `drive.google.com` links across all pages.

**Tech Stack:** Node.js, Express, TypeScript, Vite, React, standard HTML5 Canvas/Modal (zero new external npm dependencies - Ponytail ultra minimalism).

**Spec:** Current codebase (`server/services/driveService.ts`, `server/routes/complaintRoutes.ts`, `Frontend/src/pages/CaseDetailPage.tsx`, `Frontend/src/pages/EnforcementActionForm.tsx`, `Frontend/src/features/complaints/ComplaintDetailPage.tsx`).

## Global Constraints
- **Ponytail Ultra**: Zero new dependencies. Use native Node.js `fs/promises`, native stream/buffer handling, and vanilla React state.
- **Commit Format**: Commit messages MUST strictly follow `<what we have done in that part> : <description of that task>`.
- **Security & Reliability**: Backend proxy must sanitize `fileId` to prevent path traversal, validate MIME types, and never expose service credentials.
- **Non-Breaking**: Existing routes (e.g. `/api/complaints/:complaintId/files/:fileId`) must remain operational for backward compatibility.

## Review Focus
1. Invalid or malformed `fileId` (e.g., path traversal like `../../etc/passwd` or empty string) must be rejected with 400 Bad Request before disk access.
2. Missing or deleted Google Drive file must return 404 with structured JSON without crashing the server.
3. PDF vs Image MIME types: PDFs and image types (`image/jpeg`, `image/png`, `application/pdf`) must send correct `Content-Type` and `inline` disposition.
4. Extracted Google Drive URLs with parameters (e.g. `https://drive.google.com/file/d/XYZ/view?usp=drivesdk`) must resolve properly to fileId `XYZ`.
5. Offline / Cached performance: Previously viewed images must load from disk cache with HTTP 304 / fast responses.

---

### Task 1: Backend Universal Drive Proxy Endpoint & Disk Cache

**Files:**
- Create: `server/routes/driveRoutes.ts`
- Modify: `server/app.ts:25-35`
- Test: `server/testDriveProxy.ts`

- [ ] **Step 1: Write verification test for drive proxy route**
  Create `server/testDriveProxy.ts` that tests:
  - Sanitization of malformed file IDs (rejects traversal characters `..`, `/`, `\`).
  - Retrieval of a known Google Drive file ID (e.g. `1GOTb2d5tjECMHixdHxxTm1WlKGy73Rc_`).
  - Validates `Content-Type: image/png` and non-empty buffer returned.
  - Verifies local cache creation under `server/uploads/drive_cache/`.

- [ ] **Step 2: Run test to confirm failure before route registration**
  Run: `node -r dotenv/config node_modules/tsx/dist/cli.mjs testDriveProxy.ts`
  Verify that it fails (endpoint doesn't exist yet).

- [ ] **Step 3: Implement `server/routes/driveRoutes.ts`**
  - Implement route `GET /api/drive/files/:fileId`:
    - Validate `fileId` with regex `/^[a-zA-Z0-9_-]{10,100}$/`. If invalid, return 400.
    - Check if file exists in cache directory (`path.join(serverRoot, "uploads", "drive_cache", fileId)`).
    - If cached, serve directly with appropriate MIME type, `Cache-Control: public, max-age=604800, immutable`, and ETag support (`If-None-Match` -> 304).
    - If not cached, call `getComplaintDriveFile(fileId)`.
    - If response `success: false` or no `data`, return 404.
    - Write file and metadata to `server/uploads/drive_cache/` asynchronously.
    - Send buffer with `Content-Type` and `Content-Disposition: inline`.
  - Also implement `GET /api/drive/extract-id`:
    - Helper endpoint accepting `?url=...` and returning `{ fileId }`.

- [ ] **Step 4: Register `driveRoutes` in `server/app.ts`**
  Import `driveRoutes` and mount `app.use("/api/drive", driveRoutes)`.

- [ ] **Step 5: Run test and verify it passes**
  Run: `node -r dotenv/config node_modules/tsx/dist/cli.mjs testDriveProxy.ts`
  Verify all assertions pass (HTTP 200, correct image buffer, cache populated).

- [ ] **Step 6: Build server and commit**
  Run: `npm --prefix server run build`
  Commit: `Drive proxy endpoint : added universal drive file proxy route with disk cache`

---

### Task 2: Frontend Drive URL Helper & In-App Image Lightbox Modal

**Files:**
- Create: `Frontend/src/shared/utils/driveUrl.ts`
- Create: `Frontend/src/shared/components/ImageViewerModal.tsx`
- Modify: `Frontend/src/App.css` (minimal lightbox styling)

- [ ] **Step 1: Implement `Frontend/src/shared/utils/driveUrl.ts`**
  - Create `extractDriveFileId(urlOrId?: string | null): string | null`:
    - Recognizes alphanumeric IDs (15–60 chars).
    - Extracts ID from `drive.google.com/file/d/:id/...` or `?id=:id`.
  - Create `getDriveFileProxyUrl(fileId?: string | null, fileUrl?: string | null): string`:
    - Returns `${API_BASE_URL}/drive/files/${id}` if ID is available or extracted.
    - Returns original URL or `""` if no ID found.
  - Create `isDriveImageUrl(mimeType?: string, fileName?: string): boolean`:
    - Helper to determine if file is an image (`.jpg`, `.jpeg`, `.png`, `.webp`, `.heic`).

- [ ] **Step 2: Implement `Frontend/src/shared/components/ImageViewerModal.tsx`**
  - Minimalist modal component:
    - Props: `isOpen: boolean`, `imageUrl: string`, `title?: string`, `onClose: () => void`.
    - Features: Dark overlay, high-resolution preview with loading indicator, "Open Original" button, "Download" button, and "Close" button / Escape key handler.
    - Styling: Clean flex overlay, no third-party UI libraries.

- [ ] **Step 3: Add CSS for lightbox in `Frontend/src/App.css`**
  Add minimal classes `.image-viewer-overlay`, `.image-viewer-content`, `.image-viewer-image`, `.image-viewer-close`.

- [ ] **Step 4: Commit frontend utilities and lightbox**
  Commit: `Frontend drive viewer : added drive URL proxy utility and in-app image viewer modal`

---

### Task 3: Update CaseDetailPage & Field Inspection Views

**Files:**
- Modify: `Frontend/src/pages/CaseDetailPage.tsx`
- Modify: `Frontend/src/pages/EnforcementActionForm.tsx`

- [ ] **Step 1: Update `CaseDetailPage.tsx` Evidence Photos**
  - Import `getDriveFileProxyUrl` and `ImageViewerModal`.
  - Add state `[activeViewerImage, setActiveViewerImage] = useState<{ url: string; title: string } | null>(null)`.
  - Update Field Visits Evidence (lines ~525-545):
    - Replace `src={`https://lh3.googleusercontent.com/d/${ev.drive_file_id}`}` with `src={getDriveFileProxyUrl(ev.drive_file_id, ev.drive_file_url)}`.
    - Replace `<a href={ev.drive_file_url} target="_blank">` click behavior with `onClick={() => setActiveViewerImage({ url: getDriveFileProxyUrl(ev.drive_file_id, ev.drive_file_url), title: ev.file_name })}`.
  - Update Investigation Timeline Evidence (lines ~1320-1335) with the same proxy URL and click viewer.
  - Update Follow-up Inspection Evidence (lines ~1910-1925) with the same proxy URL and click viewer.

- [ ] **Step 2: Update `CaseDetailPage.tsx` Statutory Notices & Receipts**
  - Section 269 Notice (line ~1415):
    - Replace `href={notice269.drive_file_url}` with `href={getDriveFileProxyUrl(notice269.drive_file_id, notice269.drive_file_url)}`.
  - Section 270 Notice (line ~1476):
    - Replace `href={notice270.drive_file_url}` with `href={getDriveFileProxyUrl(notice270.drive_file_id, notice270.drive_file_url)}`.
  - Compounding Receipt (line ~1584):
    - Replace `href={r.drive_file_url}` with `href={getDriveFileProxyUrl(undefined, r.drive_file_url)}`.
  - Render `<ImageViewerModal>` at the bottom of `CaseDetailPage.tsx`.

- [ ] **Step 3: Update `EnforcementActionForm.tsx` Evidence Files**
  - Import `getDriveFileProxyUrl` and `ImageViewerModal`.
  - Replace `https://lh3.googleusercontent.com/d/${file.drive_file_id}` with `getDriveFileProxyUrl(file.drive_file_id, file.drive_file_url)`.
  - Add click-to-view lightbox handler for demolition/sealing photos.

- [ ] **Step 4: Commit Case and Enforcement updates**
  Commit: `Case and enforcement views : updated evidence photos and notice links to use drive proxy and in-app viewer`

---

### Task 4: Update ComplaintDetailPage & Attachment Previews

**Files:**
- Modify: `Frontend/src/features/complaints/ComplaintDetailPage.tsx`

- [ ] **Step 1: Inspect and enhance `ComplaintDetailPage.tsx`**
  - Import `getDriveFileProxyUrl` and `ImageViewerModal`.
  - Update Google Drive file rendering (lines ~580-598) to ensure it uses `getDriveFileProxyUrl(driveFile.fileId)`.
  - Enable clicking on attachment previews to open the `ImageViewerModal` with full resolution.

- [ ] **Step 2: Commit Complaint detail updates**
  Commit: `Complaint attachments : enabled high-res lightbox preview using drive proxy`

---

### Task 5: End-to-End Verification & Production Readiness

**Files:**
- Test: Full build and runtime verification

- [ ] **Step 1: Run server build and frontend build**
  - Run `npm --prefix server run build`
  - Run `npm --prefix Frontend run build`
  - Verify zero TypeScript or Vite errors.

- [ ] **Step 2: Run authorization and drive proxy test suites**
  - Run `npm --prefix server test`
  - Run `node -r dotenv/config node_modules/tsx/dist/cli.mjs testDriveProxy.ts`
  - Clean up temporary test files if desired.

- [ ] **Step 3: Verify image loading via browser / curl**
  - Send request to `http://localhost:5000/api/drive/files/1GOTb2d5tjECMHixdHxxTm1WlKGy73Rc_`.
  - Verify HTTP 200, Content-Type `image/png`, and cache hit on repeat request.

- [ ] **Step 4: Document Google Apps Script Sharing Recommendation**
  - Add note to `docs/context-handoff.md` with the 1-line Apps Script snippet:
    `file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);`
    so future direct Google Drive links also stay open if accessed from Google Drive directly.

- [ ] **Step 5: Commit, Push & Update PR**
  - Commit: `Drive image access : verified and resolved drive image viewing and permission issues across all modules`
  - Push branch `uv-dev` to `origin/uv-dev`.
  - Confirm GitHub Actions CI passes.

