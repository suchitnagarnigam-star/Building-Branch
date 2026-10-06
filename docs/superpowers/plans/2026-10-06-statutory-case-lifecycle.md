# Statutory Case Lifecycle & State Machine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a domain-driven state machine (`workflowService.ts`) enforcing Punjab Municipal Corporation Act 1976 lifecycle transitions, database migration for case closures and reply reviews, backend endpoints (`/close`, `/review-reply`, `enforcement`), and interactive closure and reply review UI modals in `CaseDetailPage.tsx`.

**Architecture:** Domain service pattern (`workflowService.ts`) encapsulates statutory state transition rules, role checks, and prerequisite queries. Thin route handlers in `complaintRoutes.ts` and `enforcementRoutes.ts` delegate status mutations through `applyTransition()`. `CaseDetailPage.tsx` integrates role-aware action controls and confirmation modals.

**Tech Stack:** TypeScript, Node.js / Express, PostgreSQL (`pg`), React 19, Tailwind CSS.

---

### User Review Required

> [!NOTE]
> DB check confirmed: `cases.assigned_bi_id` matches `officers.officer_id` (`OFF-XXX`), aligning directly with `JWTPayload.officerId`. Governance check compares `actor.officerId === caseRow.assigned_bi_id`.

---

### Proposed Changes

#### Database Migration

- [ ] **Task 1: Create and run `005_case_closures.sql`**
  - [ ] Step 1: Write `server/migrations/005_case_closures.sql` defining `case_closures` table and adding review columns (`review_status`, `reviewed_by_id`, `reviewed_by_name`, `reviewed_at`, `review_remarks`) to `violator_replies`.
  - [ ] Step 2: Run migration using `node` and verify schema in PostgreSQL information schema.
  - [ ] Step 3: Commit migration file with standard commit message format.

#### Domain Service

- [ ] **Task 2: Build `server/services/workflowService.ts`**
  - [ ] Step 1: Define statutory `CaseStatus` union, `STATUS_TRANSITIONS` graph, and prerequisite interfaces.
  - [ ] Step 2: Implement `validateCaseTransition(caseId, toStatus, actor, pool)` executing:
    - Check 1: Case exists in database.
    - Check 2: Valid edge in `STATUS_TRANSITIONS`.
    - Check 3: Role authorization (`closed` and `reply_reviewed_*` require ATP, MTP, JC, Superadmin, or Admin).
    - Check 4: Governance rule: Assigned BI cannot close their own case (`actor.officerId === caseRow.assigned_bi_id`).
    - Check 5: Statutory prerequisites:
      - Active court stay (`stay_granted = 'yes'`) blocks `enforcement_recorded`.
      - Non-compoundable requires Section 269 notice before `enforcement_recorded`.
      - Case closure requires completed enforcement, valid reply review, or compoundable fee receipt.
  - [ ] Step 3: Implement `applyTransition(caseId, toStatus, actor, pool, note)` updating `cases.current_status` and inserting into `case_status_history` within a database transaction.
  - [ ] Step 4: Verify TypeScript compilation (`tsc`) in `server/`.

#### Backend Endpoints

- [ ] **Task 3: Add Lifecycle Endpoints to `server/routes/complaintRoutes.ts` and update `enforcementRoutes.ts`**
  - [ ] Step 1: Add `POST /api/cases/:caseId/review-reply` in `complaintRoutes.ts` calling `applyTransition` and updating `violator_replies`.
  - [ ] Step 2: Add `POST /api/cases/:caseId/close` in `complaintRoutes.ts` calling `applyTransition` and inserting into `case_closures`.
  - [ ] Step 3: Refactor `POST /api/cases/:caseId/enforcement` in `enforcementRoutes.ts` to call `applyTransition(caseId, "enforcement_recorded", req.user, pool, ...)` instead of raw SQL update.
  - [ ] Step 4: Verify server compilation (`npm run build`).

#### Frontend UI Integration

- [ ] **Task 4: Add Close Case Modal & Reply Review UI to `Frontend/src/pages/CaseDetailPage.tsx`**
  - [ ] Step 1: Add "Close Case" header button (disabled with tooltip for `bi`, enabled for `atp`/`superadmin`, badge for `closed`).
  - [ ] Step 2: Build `CloseCaseModal` with statutory warning, closure reason dropdown, closing description, optional file upload, and submit handler.
  - [ ] Step 3: Build `ReviewReplyModal` / inline action in Card 4 (Violator Reply) allowing ATPs to mark reply as Valid or Invalid with remarks.
  - [ ] Step 4: Verify Frontend compilation (`npm run build`).

#### Verification & Quality Gates

- [ ] **Task 5: End-to-End Statutory Verification (V-01 to V-06)**
  - [ ] Step 1 (V-01): Verify BI calling `POST /api/cases/:id/close` returns 403 Forbidden.
  - [ ] Step 2 (V-02): Verify premature closure without prerequisites returns 400 Bad Request.
  - [ ] Step 3 (V-03): Verify enforcement on non-compoundable case without Section 269 returns 400 Bad Request.
  - [ ] Step 4 (V-04): Verify enforcement when `stay_granted = 'yes'` returns 400 Bad Request.
  - [ ] Step 5 (V-05): Verify happy path transitions (Notice 270 → Notice 269 → Enforcement → Close as ATP) return 200 OK.
  - [ ] Step 6 (V-06): Verify clean build of both frontend and server.
