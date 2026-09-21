# MCL Building Branch — Unified Implementation Plan

## 1. Document Purpose

This plan defines the implementation sequence for reconciling the `ad-dev` and `uv-dev` branches, completing statutory case persistence, enforcing the workflow state machine, integrating the frontend with real APIs, and replacing mock analytics with live operational data.

The implementation must prioritize:

1. Data integrity and statutory persistence.
2. Explicit workflow transitions and role permissions.
3. Auditability of every important action.
4. Reliable frontend/backend integration.
5. Analytics based on persisted records rather than hardcoded values.
6. A demonstrable, non-technical operational dashboard.

---

## 2. Current Understanding

### 2.1 Branch Position

The current working assumption is:

- `uv-dev` has already pulled frontend code from `ad-dev`.
- The integration is associated with commit `66e22ba`.
- `uv-dev` contains backend case endpoints:
  - `GET /api/cases`
  - `GET /api/cases/:caseId`
- The branch state must still be verified before implementation begins.

### 2.2 Known Gaps & Status Progress

- [x] Transactional complaint-to-case promotion (`POST /api/complaints/:complaintId/assign`).
- [x] Backend case endpoints (`GET /api/cases`, `GET /api/cases/:caseId`).
- [x] Construction Status dual lookup intake (`-- Choose an Existing Case or enter Complaint ID --`).
- [x] Construction status persistence (`POST /api/cases/:caseId/construction-status`).
- [x] Text and display scaling controls (`Topbar.tsx` popover slider & `SettingsPage.tsx` settings).
- [ ] Centralise hardcoded `http://localhost:5000` URLs using `VITE_API_BASE_URL`.
- [ ] Statutory workflow state machine transition validation (`STATUS_TRANSITIONS.ts`).
- [ ] Violator reply persistence and review endpoints (`/api/cases/:id/reply`, `/api/cases/:id/review-reply`).
- [ ] Live analytics API integration from persisted DB records.

---

## 3. Scope

### 3.1 Included

- Branch and repository cleanup.
- Environment configuration.
- Database migrations and statutory tables.
- Case reply persistence.
- Construction-status persistence.
- Section 269 notice persistence.
- Assessment persistence.
- Case closure.
- Workflow state machine.
- Role and permission enforcement.
- Audit trail and status history.
- Frontend API integration.
- ATP close-case workflow.
- Live analytics APIs.
- E2E and negative testing.
- Demo readiness and operational documentation.

### 3.2 Excluded Unless Separately Approved

- Major redesign of the entire application.
- New external notification provider integration.
- Production infrastructure migration.
- Full historical Git history rewrite.
- Advanced predictive analytics.
- Automated legal decision-making.

---

## 4. Implementation Principles

1. **Database-first:** Statutory writes must be persisted reliably before the UI is considered complete.
2. **No false success:** If the database is unavailable during a statutory write, the API must return a clear failure.
3. **Transactional operations:** Related writes and status transitions should occur in a database transaction where possible.
4. **Explicit authorization:** A valid transition is not sufficient; the actor’s role and case assignment must also be validated.
5. **Auditability:** Every status transition and statutory action must be traceable to an actor and timestamp.
6. **Idempotency:** Duplicate form submissions must not create duplicate statutory records.
7. **Migration safety:** Existing databases must be upgraded through versioned migrations rather than relying only on `CREATE TABLE IF NOT EXISTS`.
8. **Separation of concerns:** Reply, assessment, notice issuance, construction status, and closure should be separate business operations.
9. **Evidence validation:** Required images and documents must be validated on the backend, not only in the frontend.
10. **Analytics from events:** Performance metrics should use historical status logs and action records, not only the current case status.

---

# Phase 1 — Repository Audit and Branch Convergence

## Objectives

Confirm the actual state of `ad-dev` and `uv-dev` before modifying code.

## Tasks

- [ ] Fetch the latest remote branches.
- [ ] Compare branch histories and merge bases.
- [ ] Confirm whether commit `66e22ba` is present in `uv-dev`.
- [ ] Identify unresolved conflicts or duplicated files.
- [ ] Inventory frontend routes, backend routes, database schema, and shared status constants.
- [ ] Verify the actual current implementation of:
  - `ConstructionStatusForm.tsx`
  - `CaseDetailPage.tsx`
  - `CasesPage.tsx`
  - `complaintRoutes.ts`
  - `database.ts`
  - `AnalyticsPage.tsx`
- [ ] Document the final branch that will be used for implementation.
- [ ] Create a backup branch before large changes.

## Git Cleanup

- [ ] Add `/server/node_modules/` to `.gitignore`.
- [ ] Run:

```bash
git rm -r --cached server/node_modules
git commit -m "chore: stop tracking server node_modules"
```

- [ ] Confirm that `server/node_modules/` is ignored.
- [ ] Note that this removes files from the current Git index but does not remove them from historical commits.
- [ ] Perform history cleanup separately only if repository size requires it.

## Environment Configuration

Create a safe example file:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

Recommended approach:

- [ ] Add `Frontend/.env.example`.
- [ ] Add real `.env` files to `.gitignore`.
- [ ] Use `import.meta.env.VITE_API_BASE_URL`.
- [ ] Keep a localhost fallback for local development only.
- [ ] Centralize API configuration in one utility module.

---

# Phase 2 — Database Design and Versioned Migrations

## Objectives

Provide durable storage for all statutory and operational events.

## Migration Requirements

- [ ] Introduce a migration/version table.
- [ ] Add migrations for fresh and existing databases.
- [ ] Ensure migrations are repeatable or safely guarded.
- [ ] Add foreign keys and indexes.
- [ ] Add timestamps consistently.
- [ ] Add unique constraints where needed for idempotency.
- [ ] Test migrations against both empty and existing databases.

## Proposed `case_replies` Table

Suggested fields:

- `id`
- `case_id`
- `complaint_id`
- `reply_text`
- `reply_date`
- `evidence_url`
- `reviewed_by`
- `review_status`
- `review_note`
- `reviewed_at`
- `created_at`
- `updated_at`

Validation:

- Case must exist.
- Reply must be associated with the correct complaint.
- Duplicate reply submissions must be prevented or explicitly versioned.
- Evidence requirements must be enforced according to the workflow stage.

## Proposed `case_assessments` Table

Suggested fields:

- `id`
- `case_id`
- `portion_type`
- `assessment_status`
- `total_charges`
- `receipt_number`
- `receipt_date`
- `date_of_assessment`
- `receipt_photo_url`
- `assessed_by`
- `created_at`
- `updated_at`

`portion_type` should support the required construction-area distinction, especially for partly compoundable cases.

## Notice Schema Extension

Extend the notice model/table with:

- `notice_type`
  - `SECTION_270`
  - `SECTION_269`
- `notice_number`
- `date_of_notice`
- `photo_of_notice`
- `area_portion`
- `issued_by`
- `created_at`

## Case Schema Extension

Extend the case model/table with:

- `construction_status`
- `compoundable_handled`
- `non_compoundable_handled`
- `closing_description`
- `closing_evidence_url`
- `closed_by`
- `closed_at`
- `updated_at`

For partly compoundable cases, do not rely only on boolean flags. Store individual portion-level outcomes, evidence, actor, and timestamps.

## Transaction Requirements

The following should be atomic where applicable:

- Persist statutory record.
- Validate current case status.
- Insert status log.
- Update case status.
- Record actor and timestamp.

If any operation fails, the transaction should roll back.

---

# Phase 3 — Workflow Domain Service

## Objectives

Centralize all workflow rules in a reusable backend service.

## State Machine

The following transitions are proposed and must be reviewed against the approved statutory workflow:

```text
REGISTERED
  -> ASSIGNED
  -> CASE_CLOSED_BY_ATP

ASSIGNED
  -> UNDER_INSPECTION
  -> CASE_CLOSED_BY_ATP

UNDER_INSPECTION
  -> INSPECTED_NO_VIOLATION
  -> NOTICE_270_ISSUED
  -> CASE_CLOSED_BY_ATP

INSPECTED_NO_VIOLATION
  -> CASE_CLOSED_BY_ATP

NOTICE_270_ISSUED
  -> VIOLATOR_REPLY_RECORDED
  -> NOTICE_270_EXPIRED
  -> CASE_CLOSED_BY_ATP

NOTICE_270_EXPIRED
  -> REINSPECTION_REQUIRED
  -> STATUS_OF_CONSTRUCTION_PENDING
  -> CASE_CLOSED_BY_ATP

VIOLATOR_REPLY_RECORDED
  -> REPLY_VALID_RESOLVED
  -> STATUS_OF_CONSTRUCTION_PENDING
  -> CASE_CLOSED_BY_ATP

REPLY_VALID_RESOLVED
  -> CASE_CLOSED_BY_ATP
  -> CLOSED

STATUS_OF_CONSTRUCTION_PENDING
  -> CONSTRUCTION_COMPOUNDABLE
  -> CONSTRUCTION_PARTLY_COMPOUNDABLE
  -> CONSTRUCTION_NON_COMPOUNDABLE
  -> CASE_CLOSED_BY_ATP

CONSTRUCTION_COMPOUNDABLE
  -> ASSESSMENT_PENDING
  -> ASSESSMENT_COMPLETED
  -> CASE_CLOSED_BY_ATP

ASSESSMENT_PENDING
  -> ASSESSMENT_COMPLETED
  -> CASE_CLOSED_BY_ATP

ASSESSMENT_COMPLETED
  -> CASE_STATUS_UPDATED
  -> CASE_CLOSED_BY_ATP

CONSTRUCTION_PARTLY_COMPOUNDABLE
  -> PARTLY_COMPOUNDABLE_IN_PROGRESS
  -> CASE_CLOSED_BY_ATP

PARTLY_COMPOUNDABLE_IN_PROGRESS
  -> BOTH_AREAS_HANDLED
  -> CASE_CLOSED_BY_ATP

BOTH_AREAS_HANDLED
  -> CASE_STATUS_UPDATED
  -> CASE_CLOSED_BY_ATP

CONSTRUCTION_NON_COMPOUNDABLE
  -> NOTICE_269_ISSUED
  -> CASE_CLOSED_BY_ATP

NOTICE_269_ISSUED
  -> CASE_STATUS_UPDATED
  -> CASE_CLOSED_BY_ATP

CASE_STATUS_UPDATED
  -> WORKFLOW_CONTINUED
  -> CASE_CLOSED_BY_ATP

WORKFLOW_CONTINUED
  -> FINAL_ENFORCEMENT_ACTION
  -> CASE_CLOSED_BY_ATP
  -> CLOSED
```

`CASE_CLOSED_BY_ATP` and `CLOSED` must not be treated as interchangeable. Define their meanings explicitly before implementation. Recommended interpretation:

- `CASE_CLOSED_BY_ATP`: operational closure performed by the ATP with a mandatory explanation and evidence where required.
- `CLOSED`: final terminal state after all required statutory or enforcement processing is complete.

## Transition Validation

Every transition must validate:

- Current status from the database.
- Requested next status.
- User role.
- User’s relationship to the case.
- Required preceding actions.
- Required evidence.
- Required statutory records.
- Whether the case is already closed.
- Whether another update changed the case since the request began.

## Concurrency

Use one or more of:

- Database row locking.
- Optimistic concurrency using a version number.
- Conditional update:

```sql
UPDATE cases
SET status = $newStatus
WHERE id = $caseId
  AND status = $expectedCurrentStatus;
```

Reject the operation if no row is updated.

---

# Phase 4 — Backend API Contracts

## General Rules

- Use consistent response structures.
- Return `400` for validation errors.
- Return `401` for unauthenticated requests.
- Return `403` for insufficient permissions.
- Return `404` for missing cases.
- Return `409` for invalid state or duplicate operations.
- Return `500` only for unexpected server failures.
- Never return success when statutory persistence fails.

## Recommended Endpoints

### Record Reply

```http
POST /api/cases/:caseId/reply
Content-Type: multipart/form-data
```

Fields:

- `replyText`
- `replyDate`
- `replyEvidence`

Actions:

1. Authenticate user.
2. Verify case access.
3. Validate current status.
4. Save reply and evidence.
5. Insert status log.
6. Advance to `VIOLATOR_REPLY_RECORDED`.
7. Return persisted record and current status.

### Record Construction Status

```http
POST /api/cases/:caseId/construction-status
Content-Type: multipart/form-data
```

Fields:

- `constructionStatus`
- `portionType`
- `description`
- `replyPhoto`
- `receiptPhoto`
- `noticePhoto`

Actions:

1. Validate construction status.
2. Validate required fields and evidence.
3. Persist portion-level construction outcome.
4. Advance workflow using the domain service.
5. Record audit event.

### Record Assessment

```http
POST /api/cases/:caseId/assessment
Content-Type: multipart/form-data
```

Fields:

- `portionType`
- `assessmentStatus`
- `totalCharges`
- `receiptNumber`
- `receiptDate`
- `dateOfAssessment`
- `receiptPhoto`

Actions:

- Validate compoundable status.
- Persist assessment.
- Prevent duplicate assessment unless explicitly marked as a revision.
- Advance to `ASSESSMENT_COMPLETED` when requirements are met.

### Issue Section 269 Notice

```http
POST /api/cases/:caseId/notice-269
Content-Type: multipart/form-data
```

Fields:

- `noticeNumber`
- `dateOfNotice`
- `areaPortion`
- `noticePhoto`
- `noticeDescription`

Actions:

- Validate that the case is non-compoundable.
- Persist notice.
- Advance to `NOTICE_269_ISSUED`.
- Add audit record.

### Close Case

```http
POST /api/cases/:caseId/close
Content-Type: multipart/form-data
```

Fields:

- `closingDescription`
- `closingEvidence`

Rules:

- ATP-only unless explicitly configured otherwise.
- `closingDescription` is mandatory.
- Validate that closure is allowed from the current status.
- Store actor and timestamp.
- Record status transition.
- Do not close a case with missing mandatory statutory actions.

### Change Status

```http
PATCH /api/cases/:caseId/status
Content-Type: application/json
```

Body:

```json
{
  "nextStatus": "STATUS_OF_CONSTRUCTION_PENDING",
  "reason": "Required explanation"
}
```

Rules:

- Validate against the centralized state machine.
- Validate role and prerequisites.
- Require a reason for manual transitions.
- Insert `complaint_status_log`.
- Use concurrency protection.

---

# Phase 5 — Frontend Integration

## Construction Status Form

Replace the local `setTimeout` implementation in `ConstructionStatusForm.tsx`.

Tasks:

- [ ] Build `FormData`.
- [ ] Include construction status and portion information.
- [ ] Attach reply, receipt, and notice files only where relevant.
- [ ] Display loading state.
- [ ] Display backend validation errors.
- [ ] Disable duplicate submission while saving.
- [ ] Navigate or refresh only after confirmed API success.
- [ ] Show the persisted status and audit event.

## Case Detail Page

Add an ATP close-case modal containing:

- Closing description.
- Optional or required evidence upload based on rules.
- Confirmation step.
- Validation messages.
- API submission state.
- Success and failure feedback.

## Audit Timeline

Display:

- Previous status.
- New status.
- Actor.
- Role.
- Timestamp.
- Reason or notes.
- Related statutory record where available.

The timeline must be loaded from persisted audit data, not generated locally.

## API Configuration

Refactor these files to use centralized configuration:

- `complaintApi.ts`
- `FieldInspectionPage.tsx`
- `OfficersPage.tsx`
- `CasesPage.tsx`
- `CaseDetailPage.tsx`

Use:

```ts
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api";
```

Avoid duplicating the base URL throughout individual components.

---

# Phase 6 — Analytics Backend

## Objectives

Replace mock dashboard values with database-backed operational metrics.

## Endpoints

```http
GET /api/analytics/overview
GET /api/analytics/officers
```

Support query parameters such as:

- `from`
- `to`
- `zone`
- `ward`
- `status`
- `officerId`

## KPI Definitions

Define each KPI before implementation.

Examples:

### Total Complaints

Number of complaints registered during the selected period.

### Active Cases

Cases that are not in a terminal state at the end of the selected period.

### Closed Cases

Cases that reached the defined final closure state during the selected period.

### Pending Cases

Cases that remain open beyond the expected processing stage or time threshold.

### Average Resolution Time

Average elapsed time between case registration and final closure for cases closed in the selected period.

### Status Duration

Time spent by cases in each workflow state, calculated from status-log events.

### Officer Performance

Use historical action records and status transitions, including:

- Cases assigned.
- Inspections completed.
- Notices issued.
- Replies reviewed.
- Assessments completed.
- Cases closed.
- Average processing time.
- Pending workload.

Do not calculate officer performance only from the current case owner or current case status.

## Analytics Validation

- [ ] Confirm date boundaries and timezone handling.
- [ ] Avoid double-counting cases.
- [ ] Define whether metrics use registration date, action date, or closure date.
- [ ] Exclude test/demo records from production analytics if applicable.
- [ ] Add indexes for frequent filters.
- [ ] Ensure role-based analytics access:
  - BI: no analytics access.
  - ATP: analytics access.
  - JC: analytics access.
  - MTP: analytics access.
  - Super Admin: analytics access.

---

# Phase 7 — Security, Permissions, and Data Validation

## Authorization Matrix

Create a documented matrix covering:

- BI.
- ATP.
- JC.
- MTP.
- Super Admin.

For every endpoint specify:

- Allowed roles.
- Whether assignment is required.
- Whether zone/ward restrictions apply.
- Whether the action is read-only or mutating.
- Whether evidence is mandatory.
- Whether manual status changes are permitted.

## Upload Validation

- [ ] Validate MIME type.
- [ ] Validate file size.
- [ ] Generate safe server-side filenames.
- [ ] Prevent path traversal.
- [ ] Store only safe file references in the database.
- [ ] Validate image requirements for geotagged evidence where applicable.
- [ ] Prevent users from submitting files unrelated to the case.

## Audit Requirements

Log:

- Actor ID.
- Actor role.
- Case ID.
- Complaint ID.
- Previous status.
- New status.
- Action type.
- Reason.
- Timestamp.
- Related record ID.
- Request correlation ID where possible.

---

# Phase 8 — Testing and Verification

## Build Verification

- [ ] Frontend dependency installation succeeds.
- [ ] Frontend production build succeeds.
- [ ] Backend starts with a clean environment.
- [ ] Database migrations succeed on a fresh database.
- [ ] Database migrations succeed on an existing database.
- [ ] API routes are registered correctly.
- [ ] Environment variables are loaded correctly.

## Positive E2E Scenarios

### Scenario 1 — Compoundable Case

1. Register complaint.
2. Assign case.
3. Complete inspection.
4. Issue Section 270 notice.
5. Record reply.
6. Record construction status as compoundable.
7. Complete assessment.
8. Update case status.
9. Close or continue workflow according to rules.
10. Verify analytics reflect every persisted action.

### Scenario 2 — Partly Compoundable Case

1. Record construction status as partly compoundable.
2. Record compoundable portion.
3. Record non-compoundable portion.
4. Verify both portions are persisted separately.
5. Confirm the case cannot advance until required portions are handled.
6. Verify status and audit history.

### Scenario 3 — Non-Compoundable Case

1. Record construction status as non-compoundable.
2. Issue Section 269 notice.
3. Persist notice number, date, portion, and evidence.
4. Verify status progression.
5. Verify the audit timeline.

### Scenario 4 — ATP Closure

1. Attempt closure without a description.
2. Confirm validation failure.
3. Attempt closure with an unauthorized role.
4. Confirm `403`.
5. Close with valid ATP credentials and required data.
6. Verify actor, timestamp, reason, and status log.

## Negative Tests

- [ ] Invalid transition.
- [ ] Unauthorized role.
- [ ] Case not assigned to the user.
- [ ] Missing required evidence.
- [ ] Duplicate submission.
- [ ] Concurrent status update.
- [ ] Database failure during statutory write.
- [ ] Missing case.
- [ ] Invalid date.
- [ ] Invalid file type.
- [ ] Attempt to mutate a terminal case.
- [ ] Analytics query with invalid filters.

## Analytics Tests

- [ ] Persist a new case and confirm overview totals change.
- [ ] Complete an officer action and confirm officer metrics change.
- [ ] Confirm date filters exclude records outside the selected range.
- [ ] Confirm status duration calculations use audit events.
- [ ] Confirm BI users cannot access analytics endpoints.

---

# Phase 9 — Demo Readiness

## Non-Technical Demonstration Flow

The demo should focus on visible operational outcomes:

1. Complaint received.
2. Complaint assigned to officers.
3. Field inspection recorded with location evidence.
4. Statutory notice issued.
5. Reply and construction status recorded.
6. Assessment or Section 269 notice recorded.
7. ATP closes or continues the case.
8. Dashboard updates automatically.
9. Management sees pending cases, closure rates, zone performance, and officer workload.

## Demo Data

- [ ] Prepare representative complaints across multiple zones.
- [ ] Include open, pending, compoundable, partly compoundable, non-compoundable, and closed cases.
- [ ] Ensure demo records are clearly marked.
- [ ] Verify that dashboard totals match the database.
- [ ] Prepare a fallback read-only demo environment if needed.
- [ ] Never simulate successful statutory persistence when the database is unavailable.

## Presentation Requirements

Show:

- Current case pipeline.
- Pending cases.
- Closed cases.
- Zone-wise distribution.
- Officer workload.
- Average processing time.
- Escalated or overdue cases.
- Audit timeline for one complete case.

---

# Recommended Implementation Order

1. Repository audit and branch convergence.
2. Git cleanup and environment configuration.
3. Database migrations and constraints.
4. Workflow domain service.
5. Permission and prerequisite validation.
6. Statutory API endpoints.
7. Audit timeline API.
8. Frontend form integration.
9. ATP closure interface.
10. Analytics service and endpoints.
11. Frontend analytics integration.
12. Positive and negative testing.
13. Demo data preparation.
14. Final documentation and stakeholder walkthrough.

---

# Definition of Done

The implementation is complete when:

- [ ] `ad-dev` and `uv-dev` integration is verified.
- [ ] `server/node_modules/` is no longer tracked.
- [ ] API base URLs are centralized and configurable.
- [ ] Statutory records persist in the database.
- [ ] No statutory endpoint reports success after a failed database write.
- [ ] Workflow transitions are validated centrally.
- [ ] Role permissions and case ownership are enforced.
- [ ] Required evidence and prerequisites are validated.
- [ ] Partly compoundable portions are stored independently.
- [ ] ATP closure requires a valid description and appropriate permissions.
- [ ] Every important action is audit logged.
- [ ] Analytics is powered by persisted data.
- [ ] Dashboard KPIs have documented definitions.
- [ ] Fresh and existing database migrations pass.
- [ ] E2E and negative tests pass.
- [ ] The non-technical demo can be completed end to end.

---

# Open Decisions Before Coding

The following decisions must be finalized:

1. What is the exact distinction between `CASE_CLOSED_BY_ATP` and `CLOSED`?
2. Which roles can manually change statuses?
3. Which evidence fields are mandatory for each construction outcome?
4. What constitutes a valid reply and who reviews it?
5. What is the exact structure of construction portions?
6. Can statutory records be edited, and if so, how are revisions audited?
7. What is the escalation threshold and how is it calculated?
8. Which timezone is used for analytics and statutory dates?
9. Where are uploaded files stored?
10. Which statuses count as active, pending, resolved, and finally closed?
11. Are demo records separated from production records?
12. Which database engine and migration tool are authoritative?

---

# Final Recommendation

Implement this as a controlled sequence rather than one large refactor:

**Database → Workflow Service → Permissions → API Endpoints → Frontend → Analytics → Testing → Demo**

Do not begin by wiring the frontend to endpoints whose persistence and transition rules are not finalized. The most important deliverable is a reliable, auditable workflow in which every dashboard metric can be traced back to actual case records and status events.
