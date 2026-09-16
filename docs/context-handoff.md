# MCL-BB Context Handoff

**Last updated:** 2026-09-16

## Current status

The current codebase supports:

- Manual complaint registration
- External news/email/document upload
- Mistral OCR processing
- Claude complaint-field extraction
- Separate external-document review page
- Editing extracted fields before submission
- PostgreSQL complaint persistence
- Google Drive complaint folder creation, file upload, listing, and retrieval
- Complaint detail page hydration from backend plus Drive attachment previews
- Connected BI Field Inspection workflow (`POST /api/inspections`) supporting both complaint-driven visits and proactive field visits
- Case creation, evidence persistence (`visit_evidence`), and Section 270 notice recording
- Roster-driven zone and officer assignment mapping (`GET /api/officers/roster`)
- Complaint list, detail, confirmation, pending, analytics, officers, field inspection, and settings screens
- Fixed application sidebar on desktop and fixed bottom navigation on mobile

Recently completed work in the current branch (`uv-dev`) includes:

- Merged and reconciled `ad-dev` inspection workflow updates
- Connected `POST /api/inspections` for field visit persistence, case creation, and notice uploads
- Centralised API base URL handling across `FieldInspectionPage.tsx` and `ComplaintDetailPage.tsx`
- Preserved master specification in `docs/MASTER.md` and cleaned up legacy duplicate documents

## Architecture

### Frontend

Location: `Frontend/`

- React 19 + TypeScript + Vite
- Hash-based lightweight routing in `src/shared/hooks/useRouter.ts`
- Main route switch in `src/App.tsx`
- Application shell in `src/layout/Sidebar.tsx` and `src/layout/Topbar.tsx`
- Shared layout and component styling in `src/App.css`
- API and browser-storage helpers in `src/services/complaintApi.ts`

### Backend

Location: `server/`

- Express app in `app.ts`
- Complaint routes in `routes/complaintRoutes.ts`
- PostgreSQL connection in `db/database.ts`
- Complaint persistence in `services/complaintStorage.ts`
- Drive service integration in `services/driveService.ts`
- OCR integration in `services/ocrService.ts`
- Claude extraction in `services/claudeService.ts`
- Location mapping in `services/locationMapping.ts`
- BI/ATP mapping in `services/officerMapping.ts`
- Google Sheets integration in `services/googleSheetsService.ts`

## Local development

```powershell
# Terminal 1
cd Frontend
npm run dev

# Terminal 2
cd server
npm run dev
```

Frontend: `http://localhost:5173`
Backend: `http://localhost:5000`

The frontend calls the backend directly at `http://localhost:5000`.

Required backend configuration includes:

- PostgreSQL connection settings
- `MISTRAL_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_SHEETS_WEB_APP_URL` for spreadsheet synchronization

## Current registration flows

### Manual flow

`/complaints/new` renders `NewComplaintScreen`, which renders the active `ComplaintFormPage`.

The operator:

1. Enters citizen information.
2. Selects Block (Zone is automatically derived from the selected Block).
3. Enters optional Ward, address, title, and description.
4. Uploads one or more JPG/PNG complaint images.
5. Submits the form.

`submitComplaint()` sends multipart form data to `POST /api/complaints`. The backend validates required fields, derives Zone from Block, maps BI and ATP, creates a Google Drive folder for the complaint, uploads the evidence files to Google Drive, saves complaint metadata to PostgreSQL, cleans up temporary local files, optionally syncs Google Sheets, and returns a complaint ID.

### External document flow

The external-source section is on the same initial registration page, but its review is a separate page.

1. The operator selects News, Email, or Other.
2. The operator uploads JPG, PNG, or PDF source files.
3. **Process Document** calls `processExternalSource()`.
4. `POST /api/complaints/process-source` saves the files and runs OCR for each file using `processFileWithOCR()`.
5. The combined OCR is sent to `POST /api/complaints/extract-source`.
6. `extractComplaintFromOCR()` asks Claude for structured English complaint fields.
7. Extracted values are stored in session storage and the original `File` objects are retained in memory for the review submission.
8. The app navigates to `/complaints/new/extracted`.
9. `ExtractedComplaintPage` renders `ComplaintFormPage` with the extracted values and source files prefilled.
10. The operator edits fields if needed and submits.
11. The same `POST /api/complaints` endpoint is used with `registrationSource: "document"` and the source files attached and stored to Google Drive.
12. The complaint detail screen and attachment tabs then load the saved complaint and its Drive files from the backend.

The extraction step does not register a complaint by itself. Registration happens only after operator review and submit.

## Important frontend files

### `Frontend/src/App.tsx`

Owns the route switch, authentication UI state, selected complaint ID, and application shell rendering.

Important routes:

- `/complaints/new` → unified manual/external form
- `/complaints/new/extracted` → extracted external-document review form
- `/complaints/confirm/:complaintId` → registration confirmation
- `/field-inspection` → BI field inspection & violation reporting form

### `Frontend/src/pages/ComplaintFormPage.tsx`

The shared complaint form used by both workflows.

- Manual mode shows complaint-image upload and external-source controls.
- Document-review mode receives `initialFormData`, `initialSourceFiles`, and `isDocumentReview`.
- In document-review mode, the external upload controls are hidden and the source files are submitted with the edited extracted fields.
- The form validation and submit behavior are shared between manual and document registration.

### `Frontend/src/pages/FieldInspectionPage.tsx`

The BI Field Inspection & Violation Report page.

- Supports complaint-based or field-visit report sources.
- Fetches BI officers dynamically from `GET /api/officers/roster`.
- Filters available blocks based on the selected BI officer's assigned territory.
- Auto-maps Zone and supervising ATP based on block.
- Captures device GPS coordinates (Latitude, Longitude, Accuracy) via Geolocation API.
- Collects building classification, violator details, and geotagged evidence photos.
- Includes Section 270(1) PMC Act 1976 statutory notice details and notice photo upload.

### `Frontend/src/features/complaints/ExtractedComplaintPage.tsx`

Reads the extracted complaint from session storage and renders the shared `ComplaintFormPage` in document-review mode.

### `Frontend/src/features/complaints/ComplaintDetailPage.tsx`

Hydrates the complaint detail view from live backend data and also fetches Drive-backed attachments:

- `GET /api/complaints/:complaintId` loads complaint metadata and status
- `GET /api/complaints/:complaintId/files` loads Google Drive file metadata
- file cards render previews for locally stored attachments and Drive-hosted evidence when available

### `Frontend/src/services/complaintApi.ts`

Provides:

- `submitComplaint()`
- `processExternalSource()`
- `extractComplaintFromSource()`
- extracted-result session-storage helpers
- temporary in-memory storage for pending external `File` objects
- localStorage fallback for latest complaint/list data

### `Frontend/src/App.css`

Contains the application shell and page styles. The sidebar is fixed to the viewport on desktop, while `.app-content` is offset by the sidebar width. At widths below 768px, the sidebar becomes a fixed bottom navigation bar and content receives bottom padding.

## Important backend files

### `server/routes/complaintRoutes.ts`

Routes:

- `GET /api/officers`
- `GET /api/officers/roster`
- `GET /api/complaints`
- `GET /api/complaints/:complaintId`
- `POST /api/complaints/source-upload`
- `POST /api/complaints/process-source`
- `POST /api/complaints/extract-source`
- `POST /api/complaints`

`process-source` and `extract-source` only prepare and return data. They do not create a complaint.

### `server/services/driveService.ts`

Handles Google Drive integration:

- `createComplaintDriveFolder(complaintId)`: Creates a dedicated Drive folder per complaint.
- `uploadComplaintFiles(complaintId, category, files)`: Uploads evidence and source files directly to the complaint's Google Drive folder.
- `listComplaintDriveFiles(complaintId)`: Lists files attached to a complaint for the detail page.
- `getComplaintDriveFile(fileId)`: Retrieves Drive file contents so the frontend can preview/download them.

### `server/services/ocrService.ts`

Supports:

- JPG
- JPEG
- PNG
- PDF

Images are sent to Mistral as base64 data URLs. PDFs are uploaded temporarily to Mistral, processed through a signed URL, and deleted afterward.

### `server/services/claudeService.ts`

Extracts:

- Citizen name
- Phone number
- Block
- Zone when explicitly present
- Ward
- Address
- Complaint title
- Complaint description

The prompt instructs Claude not to invent unavailable facts and to translate non-English complaint content into English.

### `server/services/complaintStorage.ts`

Reads and writes complaints in PostgreSQL. Complaint records include registration source, fields, attachments, driveFolderUrl, BI/ATP assignments, status, and timestamp.

### `server/services/locationMapping.ts`

Server-authoritative Block → Zone mapping. The server rejects unrecognized blocks and does not trust a client-supplied Zone.

## Data and uploads

- Uploaded files are temporarily staged under `server/uploads/` during request handling, then uploaded to Google Drive and deleted locally.
- Complaint attachment metadata and Drive folder URLs are persisted in PostgreSQL.
- `server/data/officers.json` contains the current officer roster used by the mapping service and roster API.
- `server/data/complaints.json` is legacy/sample data and is not the primary persistence path.
- Do not commit production credentials or sensitive complaint data.

## Validation commands

```powershell
cd Frontend
npm run build

cd ..\server
npm run build
```

Both builds passed after the latest workflow and sidebar changes.

## Known limitations

- Authentication is currently local UI state.
- The browser-held pending external `File` objects are lost on a full page reload before review submission.
- Complaint resolution, approval, and notification actions are not fully backend-backed.
- Google Sheets synchronization is best-effort and logs failures without failing local registration.
- Frontend API URLs are hardcoded to localhost.
