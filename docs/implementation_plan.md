# Comprehensive Implementation Plan - MCL-BB Codebase Refinement & Real Backend Integration

Align the codebase and documentation across the repository by removing redundant files, eliminating static mock data dependencies, centralizing API configuration, implementing missing backend endpoints (Field Inspection & Status Lifecycle), and establishing clear verification checkpoints.

## User Review Required

> [!IMPORTANT]
> - **Redundant File Deletion**: `MCL-BB_Plan.md` is an exact 100% duplicate of `MCL-BB_Plan_v2.md`. It will be deleted to maintain single-source-of-truth documentation.
> - **Mock Data Elimination**: `DashboardPage.tsx`, `ComplaintDetailPage.tsx`, and `App.tsx` currently import static mock records from `mockData.ts`. They will be migrated to fetch live backend data from `GET /api/complaints` and `GET /api/complaints/:complaintId`.
> - **New Backend Endpoint**: A new backend route `POST /api/inspections` and storage handler will be added to receive, upload evidence to Google Drive, and persist field inspection reports submitted from `FieldInspectionPage.tsx`.
> - **Status Lifecycle API**: A `PATCH /api/complaints/:complaintId/status` route will be added to handle officer status transitions (`Assigned`, `In Progress`, `Resolution Submitted`, `Approved / Closed`, `Rejected`).

## Open Questions

None.

## Proposed Changes & Execution Phases

---

### Phase 1: Documentation Cleanup & Centralized API Configuration

#### [DELETE] [MCL-BB_Plan.md](file:///mnt/Data/1YUVRAJ/program/MCL/building%20branch/MCL-BB_Plan.md)
Delete redundant duplicate plan file; retain [MCL-BB_Plan_v2.md](file:///mnt/Data/1YUVRAJ/program/MCL/building%20branch/MCL-BB_Plan_v2.md).

#### [NEW] [Frontend/.env](file:///mnt/Data/1YUVRAJ/program/MCL/building%20branch/Frontend/.env)
Define `VITE_API_BASE_URL=http://localhost:5000/api`.

#### [MODIFY] [complaintApi.ts](file:///mnt/Data/1YUVRAJ/program/MCL/building%20branch/Frontend/src/services/complaintApi.ts)
#### [MODIFY] [FieldInspectionPage.tsx](file:///mnt/Data/1YUVRAJ/program/MCL/building%20branch/Frontend/src/pages/FieldInspectionPage.tsx)
#### [MODIFY] [ComplaintsPage.tsx](file:///mnt/Data/1YUVRAJ/program/MCL/building%20branch/Frontend/src/features/complaints/ComplaintsPage.tsx)
#### [MODIFY] [OfficersPage.tsx](file:///mnt/Data/1YUVRAJ/program/MCL/building%20branch/Frontend/src/features/officers/OfficersPage.tsx)
Replace hardcoded `http://localhost:5000/api` URLs with `import.meta.env.VITE_API_BASE_URL`.

---

### Phase 2: Live Backend Integration for Dashboard & Complaint Detail Views

#### [MODIFY] [DashboardPage.tsx](file:///mnt/Data/1YUVRAJ/program/MCL/building%20branch/Frontend/src/features/dashboard/DashboardPage.tsx)
- Replace static stat counts (`1,284`, `312`, `48`) with dynamic calculation derived from backend `GET /api/complaints`.
- Replace static `complaints.slice(0, 5)` mock table rows with live recent complaints fetched on mount.

#### [MODIFY] [ComplaintDetailPage.tsx](file:///mnt/Data/1YUVRAJ/program/MCL/building%20branch/Frontend/src/features/complaints/ComplaintDetailPage.tsx)
- Fetch complaint data dynamically from `GET /api/complaints/:complaintId` on mount instead of searching inside `mockData.ts`.
- Display live attachments, Google Drive folder links, assigned officers, and timestamp history.

#### [MODIFY] [App.tsx](file:///mnt/Data/1YUVRAJ/program/MCL/building%20branch/Frontend/src/App.tsx)
- Refactor `activeComplaint` state to rely on dynamic API fetching rather than `mockData[0]`.

---

### Phase 3: Field Inspection Backend Route & Storage Integration

#### [NEW] [inspectionStorage.ts](file:///mnt/Data/1YUVRAJ/program/MCL/building%20branch/server/services/inspectionStorage.ts)
Create PostgreSQL persistence helper for inspection reports, GPS coordinates, violator details, building types, and PMC Section 270(1) notice metadata.

#### [MODIFY] [complaintRoutes.ts](file:///mnt/Data/1YUVRAJ/program/MCL/building%20branch/server/routes/complaintRoutes.ts)
Add `POST /api/inspections` and `GET /api/inspections` handlers:
- Multer file handling for inspection photos and notice photo.
- Create Google Drive subfolder for inspection evidence (`uploadComplaintFiles`).
- Store inspection record in database and return created inspection ID.

#### [MODIFY] [FieldInspectionPage.tsx](file:///mnt/Data/1YUVRAJ/program/MCL/building%20branch/Frontend/src/pages/FieldInspectionPage.tsx)
- Wire `submitInspection` form handler to POST multipart inspection data to `${API_BASE_URL}/inspections`.
- Add success notification and redirect to dashboard/inspections list upon registration.

---

### Phase 4: Complaint Status Lifecycle API

#### [MODIFY] [complaintRoutes.ts](file:///mnt/Data/1YUVRAJ/program/MCL/building%20branch/server/routes/complaintRoutes.ts)
Add `PATCH /api/complaints/:complaintId/status`:
- Validate requested status transition (`Assigned`, `In progress`, `Resolution submitted`, `Pending approval`, `Approved / Closed`, `Rejected`).
- Update status in PostgreSQL and append audit trail entry.

#### [MODIFY] [ComplaintDetailPage.tsx](file:///mnt/Data/1YUVRAJ/program/MCL/building%20branch/Frontend/src/features/complaints/ComplaintDetailPage.tsx)
Connect action buttons ("Assign Officer", "Submit Resolution", "Approve & Close", "Reject") to trigger `PATCH /api/complaints/:complaintId/status`.

---

## Verification Checkpoints

### 🚩 Checkpoint 1: Documentation & Config Integrity
- Verify `MCL-BB_Plan.md` is safely deleted.
- Verify `VITE_API_BASE_URL` is correctly loaded in Frontend without hardcoded URL strings.

### 🚩 Checkpoint 2: Live Backend Data Verification
- Register a new manual or external complaint.
- Check `DashboardPage.tsx` and `ComplaintsPage.tsx`: verify the newly registered complaint appears instantly in the table.
- Click the complaint: verify `ComplaintDetailPage.tsx` loads the exact complaint details, Drive folder URL, and attachments from `GET /api/complaints/:id`.

### 🚩 Checkpoint 3: Field Inspection End-to-End Test
- Fill out `FieldInspectionPage.tsx` with reporting officer, block, GPS capture, building details, photos, and Section 270(1) notice data.
- Click **Register Inspection**: verify request succeeds (HTTP 201), files upload to Google Drive, and inspection record is persisted in PostgreSQL.

### 🚩 Checkpoint 4: Status Transition & Build Check
- Change status on `ComplaintDetailPage.tsx`: verify status pill updates and persists across page reloads.
- Run `npm run build` in `Frontend/` and `server/` to ensure zero compilation or type errors.
