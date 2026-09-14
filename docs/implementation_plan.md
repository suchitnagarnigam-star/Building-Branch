# MCL-BB — Comprehensive Implementation Plan v2

**Last updated:** 2026-09-14  
Supersedes: `implementation_plan.md` (aligned with `MCL-BB_Plan_v3.md`)

Align the codebase with the updated product direction: two separate BI
workflows (complaint update vs. field visit), a correct DB schema, a
proper status state machine, and a BI performance analytics foundation.
Eliminates mock data, centralises API config, and establishes clear
verification checkpoints throughout.

---

## Summary of Key Changes from v1

> [!IMPORTANT]
> - **Two BI workflows are now explicit and separate.** `POST /api/complaints/:id/bi-update` handles the minimal complaint-resolution update (geotagged photo + description only). `POST /api/inspections` handles the full proactive field visit. These are different tables, different routes, different frontend forms — never merged.
> - **DB schema is now defined.** Five new tables must be created before any route work begins: `bi_complaint_updates`, `bi_field_visits`, `visit_evidence`, `challans`, `complaint_status_log`.
> - **Status state machine is expanded.** Old statuses (`Assigned`, `In Progress`, `Resolution Submitted`, `Approved / Closed`, `Rejected`) are replaced with the full v3 state machine from `MCL-BB_Plan_v3.md`. Transitions are backend-enforced via a `STATUS_TRANSITIONS` map.
> - **Analytics foundation added as Phase 5.** BI performance metrics (visits, challans, resolution rate) are computed from real records — no separate analytics write table.
> - **Mock data elimination and URL centralisation are unchanged from v1** (Phases 1 and 2 carry forward as-is).

---

## Open Questions

None.

---

## Proposed Changes & Execution Phases

---

### Phase 0: DB Schema Migration (prerequisite — do this first)

All subsequent phases depend on these tables existing. Run migrations
before writing any route or storage code.

#### [NEW] Migration: `bi_complaint_updates`

```sql
CREATE TABLE bi_complaint_updates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id     UUID NOT NULL REFERENCES complaints(id),
  bi_officer_id    UUID NOT NULL REFERENCES officers(id),
  geotagged_photo  TEXT,
  gps_lat          NUMERIC(10,7),
  gps_lng          NUMERIC(10,7),
  description      TEXT NOT NULL,
  submitted_at     TIMESTAMPTZ DEFAULT now()
);
```

#### [NEW] Migration: `bi_field_visits`

```sql
CREATE TABLE bi_field_visits (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id          UUID REFERENCES complaints(id),   -- nullable
  bi_officer_id         UUID NOT NULL REFERENCES officers(id),
  atp_officer_id        UUID REFERENCES officers(id),
  zone                  VARCHAR,
  block                 VARCHAR,
  ward                  VARCHAR,
  gps_lat               NUMERIC(10,7),
  gps_lng               NUMERIC(10,7),
  gps_accuracy          NUMERIC(8,2),
  building_type         VARCHAR,
  property_address      TEXT,
  violator_name         VARCHAR,
  violator_contact      VARCHAR,
  violation_description TEXT,
  pmc_section           VARCHAR,
  form_type             VARCHAR,
  notice_issued_at      TIMESTAMPTZ,
  notice_period_days    INTEGER,
  reminder_at           TIMESTAMPTZ,
  expires_at            TIMESTAMPTZ,
  notice_status         VARCHAR DEFAULT 'Active',
  drive_folder_url      TEXT,
  submitted_at          TIMESTAMPTZ DEFAULT now()
);
```

#### [NEW] Migration: `visit_evidence`

```sql
CREATE TABLE visit_evidence (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id    UUID NOT NULL REFERENCES bi_field_visits(id),
  file_type   VARCHAR,   -- 'inspection_photo' | 'notice_photo' | 'challan_image'
  drive_url   TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);
```

#### [NEW] Migration: `challans`

```sql
CREATE TABLE challans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id        UUID NOT NULL REFERENCES bi_field_visits(id),
  complaint_id    UUID REFERENCES complaints(id),
  bi_officer_id   UUID NOT NULL REFERENCES officers(id),
  challan_number  VARCHAR UNIQUE,
  challan_image   TEXT,
  issued_at       TIMESTAMPTZ DEFAULT now(),
  status          VARCHAR DEFAULT 'Issued'
);
```

#### [NEW] Migration: `complaint_status_log`

```sql
CREATE TABLE complaint_status_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id  UUID NOT NULL REFERENCES complaints(id),
  old_status    VARCHAR,
  new_status    VARCHAR NOT NULL,
  changed_by    UUID REFERENCES officers(id),
  note          TEXT,
  changed_at    TIMESTAMPTZ DEFAULT now()
);
```

---

### Phase 1: Documentation Cleanup & Centralised API Configuration

_Unchanged from v1 — carry forward as-is._

#### [DELETE] `MCL-BB_Plan.md`
Exact duplicate of `MCL-BB_Plan_v2.md`. Delete; retain `MCL-BB_Plan_v3.md` as the single source of truth going forward.

#### [NEW] `Frontend/.env`
```
VITE_API_BASE_URL=http://localhost:5000/api
```

#### [MODIFY] `complaintApi.ts`
#### [MODIFY] `FieldInspectionPage.tsx`
#### [MODIFY] `ComplaintsPage.tsx`
#### [MODIFY] `OfficersPage.tsx`
Replace every hardcoded `http://localhost:5000/api` string with `import.meta.env.VITE_API_BASE_URL`.

---

### Phase 2: Live Backend Integration for Dashboard & Complaint Detail Views

_Unchanged from v1 — carry forward as-is._

#### [MODIFY] `DashboardPage.tsx`
- Replace static stat counts with dynamic values derived from `GET /api/complaints`.
- Replace mock table rows with live data fetched on mount.
- **Addition:** include a "Field Visits Today" stat card derived from `GET /api/inspections?date=today` once Phase 3 backend is done.

#### [MODIFY] `ComplaintDetailPage.tsx`
- Fetch from `GET /api/complaints/:complaintId` on mount; remove all `mockData.ts` references.
- Display live attachments, Drive folder link, assigned BI/ATP, and status history from `complaint_status_log`.

#### [MODIFY] `App.tsx`
- Remove `activeComplaint` initialised from `mockData[0]`; replace with API fetch.
- Delete `mockData.ts` import entirely once no other file imports it.

---

### Phase 3a: BI Complaint Update — Backend

New minimal endpoint for Path A (complaint-driven BI update). This is
simpler than the full field visit and should be built first.

#### [NEW] `server/services/biComplaintUpdateStorage.ts`
PostgreSQL helper for `bi_complaint_updates`.

- `createBiComplaintUpdate(data)` — INSERT returning the created row.
- `getBiComplaintUpdatesByComplaint(complaintId)` — SELECT for detail view.

#### [MODIFY] `server/routes/complaintRoutes.ts`
Add `POST /api/complaints/:complaintId/bi-update`:
- Multer: single file field `geotagged_photo`.
- Validate: `bi_officer_id` and `description` are required. Return 400 if missing.
- Upload photo to Drive subfolder using existing `uploadComplaintFiles`.
- Call `createBiComplaintUpdate` to persist record.
- Automatically update complaint status to `COMPLAINT_UPDATE_SUBMITTED` via `complaint_status_log`.
- Return HTTP 201 with `{ success: true, updateId }`.

Add `GET /api/complaints/:complaintId/bi-updates`:
- Return all BI updates for a complaint (for ATP review view).

---

### Phase 3b: BI Complaint Update — Frontend

#### [MODIFY] `FieldInspectionPage.tsx`
The existing page supports both "complaint-based" and "field-visit" source modes. Refactor to make this split explicit:

- **Mode A (complaint update):** show only geotagged photo upload + description textarea + submit. Hide all inspection fields.
- **Mode B (field visit):** show the full existing inspection form.
- Mode is determined by a prop or URL param: `/field-inspection?mode=complaint&complaintId=CMP-2026-001`.

Wire Mode A submit to `POST /api/complaints/:complaintId/bi-update` (multipart, single photo + description).

On success: show confirmation with update ID, redirect to complaint detail or dashboard.

---

### Phase 4a: Full Field Visit Backend — Storage & Routes

This replaces and correctly implements what was previously called "Phase 3: Field Inspection Backend" in v1. The scope is now precisely defined by the v3 schema.

#### [NEW] `server/services/inspectionStorage.ts`
PostgreSQL helpers for `bi_field_visits`, `visit_evidence`, and `challans`.

- `createFieldVisit(data)` — INSERT into `bi_field_visits` returning row.
- `addVisitEvidence(visitId, fileType, driveUrl)` — INSERT into `visit_evidence`.
- `getFieldVisitsByOfficer(biOfficerId)` — for BI ledger view.
- `getFieldVisitsByComplaint(complaintId)` — for complaint detail view (nullable link).
- `getFieldVisitsForAnalytics(filters)` — for analytics queries (date range, officer, zone).

#### [MODIFY] `server/routes/complaintRoutes.ts`
Add `POST /api/inspections` (full field visit):
- Multer: `photos` (array, max 10) + `notice_photo` (single).
- Validate required fields: `bi_officer_id`, `block`, `gps_lat`, `gps_lng`, `violation_description`. Return 400 if any missing.
- Compute `reminder_at` and `expires_at` from `notice_issued_at + notice_period_days` server-side. Never trust client-computed dates.
- Create Drive subfolder: `uploadComplaintFiles` scoped to this visit.
- Persist each uploaded file in `visit_evidence` with correct `file_type`.
- Call `createFieldVisit` to persist main record.
- Return HTTP 201 with `{ success: true, visitId, driveFolderUrl }`.

Add `GET /api/inspections`:
- Supports query params: `?bi_officer_id=`, `?complaint_id=`, `?date=`.
- Returns paginated list for the BI ledger view and ATP dashboard.

Add `GET /api/inspections/:visitId`:
- Returns full visit record including evidence file metadata (proxied, no raw Drive URLs).

---

### Phase 4b: Full Field Visit Frontend

#### [MODIFY] `FieldInspectionPage.tsx`
Wire Mode B (field visit) submit to `POST /api/inspections` as multipart FormData.

- Append all existing fields + description.
- Append photos array and notice_photo individually.
- Do NOT set `Content-Type` manually — browser sets multipart boundary automatically.
- On success (HTTP 201): show confirmation with visit ID, provide link to BI ledger view.
- On error: parse error JSON and display message. Never silently fail.

#### [NEW] `Frontend/src/features/inspections/InspectionLedgerPage.tsx`
BI's ledger — list of all their field visits. Fetches `GET /api/inspections?bi_officer_id=...`.
Shows: date, block, violation type, notice status pill, challan indicator.
Tapping a row shows visit detail.

---

### Phase 5: Complaint Status Lifecycle API

Replaces the v1 Phase 4. State machine is now expanded to match v3.

#### [NEW] `server/workflow/state-machine/STATUS_TRANSITIONS.ts`

```typescript
export const STATUS_TRANSITIONS: Record<string, string[]> = {
  'REGISTERED':                  ['ASSIGNED'],
  'ASSIGNED':                    ['UNDER_INSPECTION'],
  'UNDER_INSPECTION':            ['COMPLAINT_UPDATE_SUBMITTED'],
  'COMPLAINT_UPDATE_SUBMITTED':  ['CLOSED', 'PENDING_ENFORCEMENT'],
  'PENDING_ENFORCEMENT':         ['FIELD_VISIT_RECORDED'],
  'FIELD_VISIT_RECORDED':        ['CHALLAN_ISSUED', 'INVALID_NO_ACTION'],
  'INVALID_NO_ACTION':           ['CLOSED'],
  'CHALLAN_ISSUED':              ['NOTICE_ACTIVE'],
  'NOTICE_ACTIVE':               ['RESOLVED', 'NOTICE_EXPIRED'],
  'RESOLVED':                    ['CLOSED'],
  'NOTICE_EXPIRED':              ['REINSPECTION_REQUIRED'],
  'REINSPECTION_REQUIRED':       ['REINSPECTION_COMPLETED'],
  'REINSPECTION_COMPLETED':      ['ESCALATED', 'CLOSED'],
  'ESCALATED':                   ['FINAL_ACTION_RECORDED'],
  'FINAL_ACTION_RECORDED':       ['CLOSED'],
};
```

#### [MODIFY] `server/routes/complaintRoutes.ts`
Add `PATCH /api/complaints/:complaintId/status`:
- Fetch current status from DB.
- Check `STATUS_TRANSITIONS[currentStatus].includes(requestedStatus)` — return 400 with message `"Invalid transition: X → Y"` if false.
- UPDATE complaints SET status, updated_at.
- INSERT into `complaint_status_log` (old, new, changed_by, note).
- Return 200 with updated complaint object.

#### [MODIFY] `ComplaintDetailPage.tsx`
- Replace old action buttons with buttons mapped to valid next states.
- Each button calls `PATCH /api/complaints/:id/status` with the target status.
- Disable buttons during in-flight request (prevent double-submit).
- On success: update local `complaint` state — no page reload needed.
- On 400: display the transition error message to the operator.
- Show `complaint_status_log` entries as a timeline at the bottom of the detail page.

---

### Phase 6: BI Performance Analytics

New phase. No separate analytics write table — all computed from real records.

#### [NEW] `server/services/analyticsService.ts`

Functions:
- `getBiSummary(biOfficerId, dateRange)` — total visits, challans, resolved, expired.
- `getBiRankingByZone(zone, dateRange)` — all BIs in a zone ranked by challan count.
- `getCityWideSummary(dateRange)` — JC-level aggregate across all zones.
- `getComplaintResolutionRate(biOfficerId)` — avg time from assignment to `COMPLAINT_UPDATE_SUBMITTED`.

#### [NEW] `server/routes/analyticsRoutes.ts`
- `GET /api/analytics/bi/:officerId` — BI's own performance summary.
- `GET /api/analytics/zone/:zone` — ATP dashboard: all BIs in zone ranked.
- `GET /api/analytics/city` — JC dashboard: city-wide summary.
All endpoints support `?from=&to=` date range filters.

#### [NEW] `Frontend/src/modules/analytics/BiAnalyticsDashboard.tsx`
- Fetches `GET /api/analytics/bi/:officerId`.
- Displays: total visits, challans issued, cases resolved, notices expired, complaint updates submitted.
- Simple stat cards — no charting library needed at this stage.

#### [MODIFY] `DashboardPage.tsx`
- ATP view: add BI ranking table (top performers in zone) fetched from `GET /api/analytics/zone/:zone`.

---

## Verification Checkpoints

### 🚩 Checkpoint 0: DB Migrations
- Connect to dev PostgreSQL.
- Run all 5 migrations from Phase 0.
- Verify with `\dt` — all 5 tables present.
- Verify FK constraints: `INSERT INTO bi_complaint_updates (complaint_id = 'fake-id')` must fail with FK error.

### 🚩 Checkpoint 1: Documentation & Config Integrity
- Verify `MCL-BB_Plan.md` deleted from repo root.
- Run: `grep -r "localhost:5000" Frontend/src` — output must be empty.
- In browser console: `console.log(import.meta.env.VITE_API_BASE_URL)` — must print the URL.

### 🚩 Checkpoint 2: Live Backend Data
- Register a new manual complaint.
- Dashboard: new complaint appears in recent table, stat counts update.
- Click complaint: `ComplaintDetailPage` loads live data from DB, shows Drive folder link and assigned officers.
- Refresh page: data still correct (not lost on reload).

### 🚩 Checkpoint 3a: BI Complaint Update End-to-End
- Open `FieldInspectionPage` in Mode A (complaint update).
- Select an existing complaint, upload one geotagged photo, write a description.
- Submit: verify HTTP 201, `bi_complaint_updates` row in PostgreSQL.
- Open complaint detail: BI update appears, complaint status updated to `COMPLAINT_UPDATE_SUBMITTED`.
- `GET /api/complaints/:id/bi-updates` in Postman: returns the update record.

### 🚩 Checkpoint 3b: Full Field Visit End-to-End
- Open `FieldInspectionPage` in Mode B (field visit).
- Fill all fields: officer, block, GPS, building type, violator, PMC section, notice details, photos.
- Submit: verify HTTP 201, `bi_field_visits` row in PostgreSQL, Drive subfolder created, `visit_evidence` rows present.
- `GET /api/inspections` in Postman: new record appears.
- Open `InspectionLedgerPage`: visit appears in list with correct notice status pill.

### 🚩 Checkpoint 4: Status State Machine
- POST a test complaint, walk it through: `REGISTERED → ASSIGNED → UNDER_INSPECTION → COMPLAINT_UPDATE_SUBMITTED → CLOSED`.
- In Postman test an invalid transition (e.g. `REGISTERED → CLOSED`): must return HTTP 400 with `"Invalid transition"` message.
- Query `complaint_status_log`: every transition recorded with `changed_by` and timestamp.
- UI: status pill on `ComplaintDetailPage` updates instantly on success without page reload.

### 🚩 Checkpoint 5: Analytics
- Create at least 3 field visits for the same BI officer.
- `GET /api/analytics/bi/:officerId`: returns correct counts matching the DB records.
- `BiAnalyticsDashboard`: stat cards display the correct numbers.
- ATP dashboard: BI ranking table shows the officer with their visit count.

### 🚩 Final Build Check
```bash
cd Frontend && npm run build   # zero errors
cd ../server && npm run build  # zero errors
```
