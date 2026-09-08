# MCL-BB — Context Handoff

**Last updated:** 2026-09-07  
**Current status:** The manual complaint-registration flow, local JSON persistence, upload handling, officer/ATP mapping, complaint list loading, complaint detail loading, BI officer list, external-source file upload, and Google Sheets synchronization are implemented. OCR/LLM extraction, operator review, document-based complaint registration, and most complaint lifecycle actions are still pending.

---

## 1. Project overview

MCL-BB is an internal complaint-management application for the Municipal Corporation of Ludhiana. It is intended for operators/documentation staff; citizens do not have accounts.

### Stack

- **Frontend:** React 19 + TypeScript, Vite, custom CSS
- **Backend:** Node.js + Express 5 + TypeScript
- **Development runtime:** `tsx`
- **Persistence:** local JSON files; there is no database yet
- **Uploads:** files are stored in `server/uploads/`

### Run locally

```powershell
# Terminal 1
cd Frontend
npm run dev
# http://localhost:5173

# Terminal 2
cd server
npm run dev
# http://localhost:5000
```

The frontend currently calls the backend directly at `http://localhost:5000`.

---

## 2. Work completed so far

The work was implemented in these broad stages:

1. **Initial UI and backend foundation**
   - Complaint registration screens and dashboard/list/detail layouts were created.
   - Basic backend routes and local complaint persistence were added.
   - Complaint form behavior was aligned with the workflow documents.

2. **Unified complaint registration workflow**
   - The former two-card choice screen was replaced with one page containing both routes:
     - manual form entry
     - external document/image upload
   - `/complaints/new` now opens the unified form through `NewComplaintScreen`.
   - `/complaints/new/*` routes directly to `ComplaintFormPage`.

3. **Location handling**
   - Location data was changed to a flat `BlockZoneEntry[]`.
   - The form lets the operator select a Zone and then filters the available Blocks.
   - The server derives Zone from Block and does not trust the client-supplied Zone.
   - Ward is optional free text because no structured ward data exists.

4. **Manual complaint submission and images**
   - Manual submission uses `multipart/form-data`.
   - A complaint image is mandatory for manual registration.
   - Multiple JPG/PNG complaint images are supported.
   - Multer saves files with unique names while preserving extensions.
   - Attachment metadata stores original name, MIME type, and saved path.
   - `server/uploads/` is created automatically when needed.

5. **Officer and ATP mapping**
   - The backend reads the officer roster from `server/data/officers.json`.
   - It normalizes `Zone A` vs `A` and `Block 2` vs `2`.
   - It maps both the responsible BI and ATP to a complaint.
   - The confirmation screen now displays the correct assigned BI and ATP names/mobile numbers.
   - `/api/officers` returns BI officers with active complaint counts.

6. **Real complaints list and detail data**
   - `ComplaintsPage` now fetches `GET /api/complaints` instead of relying only on mock data.
   - Search works across complaint ID, citizen name, and block.
   - Zone, block, and status filters work together.
   - `/complaints/pending` filters to `Pending approval` and `Resolution submitted`.
   - Loading, API-error, and empty-filter states are rendered.
   - Clicking a row or eye action opens the complaint detail route.
   - `ComplaintDetailPage` fetches `GET /api/complaints/:complaintId`, shows stored complaint fields, status timeline, assignments, and uploaded image previews.
   - The complaint list and detail page still use mock data as a fallback for fields that are not yet fully server-backed.

7. **Styling and display fixes**
   - Styles were added for the unified form, derived Zone field, required markers, image previews, table states, complaint filters, and attachment previews.
   - Duplicate fields were removed from the confirmation presentation.
   - The registered complaint data is stored in `server/data/complaints.json` and can be inspected directly.

8. **External-source upload and spreadsheet sync**
   - The unified registration page accepts external JPG, PNG, and PDF files.
   - `POST /api/complaints/source-upload` saves the uploaded files in `server/uploads/` and returns the number of files uploaded.
   - The frontend shows upload progress/error states and navigates to `/complaints/upload-success` after a successful source upload.
   - Manual complaint registration attempts to append the saved complaint to Google Sheets through `server/services/googleSheetsService.ts`.
   - Google Sheets failures are logged without failing an otherwise successful local complaint registration.

---

## 3. Current end-to-end manual flow

```text
Operator opens /complaints/new
        |
        +--> selects Zone, then selects a filtered Block
        +--> enters citizen/location/complaint fields
        +--> uploads at least one JPG/PNG complaint image
        |
        +--> POST /api/complaints (multipart/form-data)
                |
                +--> validate required fields and image
                +--> derive Zone from Block
                +--> map BI and ATP
                +--> save complaint JSON and uploaded files
                +--> return complaintId and complete complaint
        |
        +--> navigate to /complaints/confirm/:complaintId
        +--> operator can view the complaint or register another
```

The external-source section is present in the UI but is not connected to processing yet.

---

## 4. File-by-file implementation details

### Frontend

#### `Frontend/src/App.tsx`

- Owns the lightweight route switch.
- Keeps authentication/role state and the selected complaint ID.
- Routes new complaints, confirmation, list, detail, analytics, officers, and settings pages.
- `/complaints/new` renders `NewComplaintScreen`; nested new-complaint paths render `ComplaintFormPage`.
- The selected complaint still has a mock-data fallback for legacy layout fields.

#### `Frontend/src/pages/ComplaintFormPage.tsx`

Main unified registration form.

- Zone and Block dropdowns are available in the location section; Block options are filtered by the selected Zone.
- The server remains authoritative and derives Zone from Block.
- Ward is optional free text.
- Manual complaint image is required, JPG/PNG only.
- Supports multiple complaint-image previews/removal.
- Manual submit is above the OR divider.
- External source tabs are News, Email, and Other.
- External source files can be previewed, removed, and uploaded through the source-upload endpoint.
- Manual and external uploads show request state and surface failures to the operator.

#### `Frontend/src/features/complaints/ExternalUploadSuccessScreen.tsx`

- Displays the successful external-source upload state.
- Provides a Continue action back to `/complaints/new`.
- External source dropzone accepts JPG/PNG/PDF and uploads them to the backend when the operator selects Upload source.
- Supporting Documents is currently a placeholder.
- On successful manual submission, stores the selected complaint ID and navigates to confirmation.

#### `Frontend/src/data/locationData.ts`

- Flat `BlockZoneEntry[]` mapping for all known blocks.
- Exports `zoneForBlock(block)`.
- This is the frontend source for Block → Zone behavior and must stay synchronized with the server map.

#### `Frontend/src/services/complaintApi.ts`

- `submitComplaint(data, complaintImages)` builds `FormData`.
- Sends `registrationSource`, form values, and each image under `complaintImage`.
- `uploadExternalSource(files)` sends external JPG/PNG/PDF files to `/api/complaints/source-upload` and verifies the server-reported file count.
- Saves the returned complaint/latest complaint in localStorage for confirmation/detail fallback.
- It currently rethrows API/network failures after logging; it does not silently convert a failed request into a successful local-only submission.

#### `Frontend/src/types/complaint.ts`

- Defines `RegistrationSource` (`"manual" | "document"`).
- Defines frontend complaint and form-data shapes.
- `ComplaintFormData` keeps Block as primary and Zone as derived.

#### `Frontend/src/features/complaints/NewComplaintScreen.tsx`

- Thin wrapper that renders `ComplaintFormPage`.
- The old two-card manual/upload choice screen has been removed.

#### `Frontend/src/features/complaints/ManualComplaintForm.tsx`

- Deprecated compatibility re-export of `ComplaintFormPage`.
- Nothing in the active route flow imports it.

#### `Frontend/src/features/complaints/ComplaintsPage.tsx`

- Fetches `GET http://localhost:5000/api/complaints` on mount.
- Shows complaint ID, citizen, block, assigned officer, status, date, and action.
- Implements search, zone, block, and status filters.
- Keeps block options consistent with the selected zone.
- Applies the pending route status filter.
- Displays loading, error, and no-match states.

#### `Frontend/src/features/complaints/ComplaintDetailPage.tsx`

- Fetches a complaint by ID from the backend.
- Uses `mcl-latest-complaint` while loading or when a matching local record is available.
- Displays citizen/location data, description, assignments, status timeline, and stored image previews.
- Edit and Submit resolution buttons are currently visual placeholders.

#### `Frontend/src/features/complaints/ConfirmationScreen.tsx`

- Reads the latest saved complaint.
- Displays complaint ID/title/location, assigned BI, assigned ATP, and their mobile numbers.
- Provides View complaint, Register another, and Back to dashboard actions.
- WhatsApp notification currently says “Sent” but no notification service exists.

#### `Frontend/src/features/officers/OfficersPage.tsx`

- Fetches `GET /api/officers`.
- Displays BI name, designation, zone, blocks, and active complaint count.
- View/Edit buttons are placeholders.

#### `Frontend/src/App.css`

- Contains the application layout and component styles.
- Recent additions cover derived fields, form labels/required hints, upload states, image rows/thumbnails, complaint table/filter layout, and attachment previews.

#### Other frontend surfaces

- `features/dashboard/DashboardPage.tsx`: dashboard summary and navigation.
- `features/analytics/AnalyticsPage.tsx`: current analytics UI.
- `features/auth/LoginScreen.tsx`: login/role UI; authentication is currently local UI state.
- `features/settings/SettingsPage.tsx`: settings UI.
- `layout/Sidebar.tsx`, `layout/Topbar.tsx`: application shell navigation.
- `shared/components/Icon.tsx`, `StatusBadge.tsx`: reusable visual components.
- `shared/constants/mockData.ts`: legacy/fallback complaint data.
- `shared/constants/navigation.ts`: navigation definitions.
- `shared/hooks/useRouter.ts`: lightweight client-side route helper.
- `shared/types/index.ts`: shared UI/app types.
- `pages/ComplaintFormPage.tsx`: active complaint registration page.

### Backend

#### `server/app.ts`

- Creates the Express app.
- Enables CORS and JSON parsing.
- Serves `server/uploads/` at `/uploads`.
- Mounts complaint routes at `/api`.
- Listens on port 5000.

#### `server/routes/complaintRoutes.ts`

Implemented routes:

- `GET /api/officers`: returns BI officers and active complaint counts.
- `GET /api/complaints`: returns all saved complaints.
- `GET /api/complaints/:complaintId`: returns one complaint or 404.
- `POST /api/complaints/source-upload`: accepts external JPG/PNG/PDF files, saves them in `server/uploads/`, and returns the upload count. It does not create a complaint or run OCR.
- `POST /api/complaints`: accepts multipart manual registration, validates fields/image, derives Zone, maps BI/ATP, saves, and returns the complaint.
- Successful manual complaint registration also attempts a Google Sheets append.

Multer:

- Disk destination: `server/uploads/`
- Preserves the original extension with a unique generated filename.
- Accepts JPEG, PNG, and PDF MIME types.
- The current routes accept the `complaintImage` field (up to 20 files).

#### `server/types/complaint.ts`

- Defines server `Complaint`, `ComplaintRequest`, `RegistrationSource`, and `AttachmentMeta`.
- Server complaints include attachment metadata and BI/ATP assignment fields.

#### `server/services/locationMapping.ts`

- Server-side Block → Zone map.
- `zoneForBlock(block)` returns `string | null`.
- Used to validate the block and prevent a client from submitting an inconsistent Zone.

#### `server/services/officerMapping.ts`

- Reads `server/data/officers.json`.
- Normalizes zone/block naming differences.
- Finds a responsible officer by zone, block, and optional designation (`BI` or `ATP`).

#### `server/services/complaintStorage.ts`

- Reads and writes `server/data/complaints.json`.
- Generates sequential IDs such as `MCL-BB-0001`.
- Ensures the uploads directory exists before saving.

#### `server/services/googleSheetsService.ts`

- Reads `GOOGLE_SHEETS_WEB_APP_URL` from `server/.env`.
- POSTs the saved complaint as JSON to the configured Google Apps Script web app.
- Requires a successful HTTP response and `{ success: true }` JSON response.
- The complaint route logs sync failures but keeps the local registration successful.

#### `server/data/complaints.json`

- Current local complaint database.
- Contains registered complaints, source, location, assignments, status, timestamps, and attachments.
- Do not commit sensitive/real production data when moving beyond the prototype.

#### `server/data/officers.json`

- Current local BI/ATP roster, including officer IDs, names, mobiles, zones, designations, and block assignments.

#### `server/testMapping.ts`

- Small mapping/debug utility for manually checking officer mapping.

---

## 5. Project file structure

Generated folders (`node_modules`, `Frontend/dist`, `server/dist`) are intentionally omitted from this source tree.

```text
MCL-BB/
├── context-handoff.md
├── MCL-BB_Design.md
├── MCL-BB_Plan.pdf
├── MCL-BB_Workflow.md
├── updated_workflow.md
├── Frontend/
│   ├── package.json
│   ├── index.html
│   ├── public/
│   │   ├── favicon.svg
│   │   ├── icons.svg
│   │   └── mcl-logo.png
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── App.css
│       ├── index.css
│       ├── assets/
│       ├── data/locationData.ts
│       ├── layout/
│       │   ├── Sidebar.tsx
│       │   └── Topbar.tsx
│       ├── pages/ComplaintFormPage.tsx
│       ├── services/complaintApi.ts
│       ├── types/complaint.ts
│       ├── features/
│       │   ├── analytics/AnalyticsPage.tsx
│       │   ├── auth/LoginScreen.tsx
│       │   ├── complaints/
│       │   │   ├── ComplaintDetailPage.tsx
│       │   │   ├── ComplaintsPage.tsx
│       │   │   ├── ConfirmationScreen.tsx
│       │   │   ├── ManualComplaintForm.tsx
│       │   │   ├── NewComplaintScreen.tsx
│   │   │   ├── ExternalUploadSuccessScreen.tsx
│       │   │   ├── ReviewScreen.tsx
│       │   │   ├── UploadScreen.tsx
│       │   │   └── [other complaint UI]
│       │   ├── dashboard/DashboardPage.tsx
│       │   ├── officers/OfficersPage.tsx
│       │   └── settings/SettingsPage.tsx
│       └── shared/
│           ├── components/
│           │   ├── Icon.tsx
│           │   └── StatusBadge.tsx
│           ├── constants/
│           │   ├── mockData.ts
│           │   └── navigation.ts
│           ├── hooks/useRouter.ts
│           └── types/index.ts
└── server/
    ├── package.json
    ├── tsconfig.json
    ├── app.ts
    ├── testMapping.ts
    ├── data/
    │   ├── complaints.json
    │   └── officers.json
    ├── routes/complaintRoutes.ts
    ├── services/
    │   ├── complaintStorage.ts
    │   ├── googleSheetsService.ts
    │   ├── locationMapping.ts
    │   └── officerMapping.ts
    ├── types/complaint.ts
    └── uploads/              # runtime-generated uploaded files
```

---

## 6. Not implemented or incomplete

| Feature | Current state |
|---|---|
| External-source processing | Basic `POST /api/complaints/source-upload` file storage is implemented; no OCR/LLM extraction endpoint exists |
| Review workflow | `ReviewScreen.tsx`/`UploadScreen.tsx` exist, but external uploads do not yet produce an extracted draft or enter a review/confirm flow |
| Document registration | `registrationSource: "document"` exists in types, but no document submission path persists such complaints yet |
| Supporting documents | Sidebar is a placeholder; only complaint images are currently saved |
| Complaint editing | Detail-page Edit button is not wired |
| Resolution submission/approval | Buttons and statuses exist visually, but no lifecycle API or persistence transitions exist |
| WhatsApp/SMS | Confirmation text says Sent; no integration exists |
| Database | Still local JSON storage |
| Authentication/authorization | Login and role selection are UI state only |
| Ward data | Ward remains optional free text |
| Officer actions | View/Edit buttons are placeholders |
| Analytics | Existing page is primarily UI/mock presentation and is not fully driven by complaint data |
| Maps/geocoding | Not implemented |
| Citizen portal | Out of scope for the current MVP |

---

## 7. Architecture decisions to preserve

### Zone derived on the server

The server must derive Zone from the submitted Block. If block data changes, update both:

- `Frontend/src/data/locationData.ts`
- `server/services/locationMapping.ts`

The current frontend uses the selected Zone to filter the Block dropdown, but the client-sent Zone is not authoritative.

### Preserve `registrationSource`

Every complaint must identify `"manual"` or `"document"`. Keep this field through API payloads, storage, list/detail responses, analytics, and future schema changes.

### Keep the manual image guard in both layers

The frontend blocks submission without an image, and the server returns `400` for a manual request without `complaintImage`. Both checks are intentional.

### Keep multipart submission

`complaintApi.ts` must continue using `FormData`; do not manually set an `application/json` content type for the manual route.

### Re-derive Zone on the server

The server must continue validating Block and deriving Zone. The client-sent Zone is not authoritative.

### Avoid treating notification text as real delivery

The confirmation UI is currently a prototype. Do not report notification delivery as a real integration until a provider and delivery result are implemented.

---

## 8. Recommended next work, with target files

1. **Implement source processing**
   - `server/routes/complaintRoutes.ts`: add an OCR/LLM processing endpoint alongside the existing `POST /api/complaints/source-upload`.
   - Add a processing service under `server/services/` for OCR/LLM integration.
   - Initially return a clearly marked mock extracted draft if the real provider is not available.
   - Validate source type/size and preserve uploaded source metadata.

2. **Build the operator review flow**
   - `Frontend/src/features/complaints/ReviewScreen.tsx`: display and edit extracted fields.
   - `Frontend/src/features/complaints/UploadScreen.tsx` or `Frontend/src/pages/ComplaintFormPage.tsx`: call processing and pass the draft to review.
   - `Frontend/src/services/complaintApi.ts`: add typed process-source and document-registration helpers.
   - Confirm registration through the same complaint API with `registrationSource: "document"`.

3. **Wire the external source section**
   - `Frontend/src/pages/ComplaintFormPage.tsx`: replace or extend the current upload-only action with processing, request state, errors, and navigation to review.
   - Do not treat the current upload-success screen as complaint registration; source files are only stored.

4. **Make complaint detail fully server-backed**
   - `Frontend/src/features/complaints/ComplaintDetailPage.tsx`: use a shared complaint type, handle 404/error states, show all attachment types safely, and remove remaining mock-only values.
   - `Frontend/src/App.tsx`: replace the selected mock complaint fallback once the detail API is authoritative.

5. **Add source/status visibility**
   - `Frontend/src/features/complaints/ComplaintsPage.tsx`: add a registration-source indicator when the UI design is finalized.
   - `Frontend/src/features/complaints/ComplaintDetailPage.tsx`: show manual/document source.
   - `Frontend/src/shared/components/StatusBadge.tsx`: extend only if new lifecycle statuses need distinct styling.

6. **Implement complaint lifecycle actions**
   - `server/types/complaint.ts`: expand status type and add resolution/audit fields.
   - `server/routes/complaintRoutes.ts`: add authenticated update/resolution/approval endpoints.
   - `server/services/complaintStorage.ts`: implement safe updates rather than append-only writes.
   - `ComplaintDetailPage.tsx`: wire Edit and Submit resolution.

7. **Improve data and operational safety**
   - Replace JSON storage with a database when concurrent users and auditability are required.
   - Store upload paths as portable server-relative paths rather than machine-specific absolute Windows paths.
   - Add `server/uploads/.gitkeep` if the runtime directory needs to exist in a clean checkout.
   - Add authentication/authorization before exposing mutation endpoints.

8. **Connect analytics and officer actions**
   - `Frontend/src/features/analytics/AnalyticsPage.tsx`: fetch and calculate metrics from complaint data.
   - `Frontend/src/features/officers/OfficersPage.tsx`: wire View/Edit actions after officer APIs and permissions exist.

---

## 9. Validation notes

- The frontend and server both have TypeScript build scripts.
- Frontend linting is available through `npm run lint`.
- There are no dedicated automated test suites in the current package scripts.
- Google Sheets sync requires `GOOGLE_SHEETS_WEB_APP_URL` in `server/.env`; local complaint registration remains available if the sync fails.
- When changing the complaint API, validate at minimum:
  - manual request without image is rejected;
  - invalid Block is rejected;
  - Zone is derived from Block;
  - BI and ATP are mapped correctly;
  - list/detail endpoints return saved complaints;
  - uploaded images can be previewed from `/uploads`.
  - external JPG/PNG/PDF upload returns the expected file count and creates files in `server/uploads/`;
  - a missing Google Sheets URL is logged as a sync failure without changing the successful complaint response.
