# MCL Building Branch (MCL-BB) — Context Handoff & Progress Report

**Date:** October 6, 2026  
**Repository:** MCL-BB (`MCL/building branch`)  
**Active Branch:** `uv-dev` (fully synced and merged with `origin/ad-dev` & `main`)  
**Target Milestone:** Full Statutory Enforcement Lifecycle Automation, Role-Based Access Control, Demolition Action Tracking, and Live Operations Analytics

---

## 1. Executive Summary

The **MCL Building Branch (MCL-BB)** system automates the statutory building violation enforcement lifecycle for the Municipal Corporation of Ludhiana (MCL) under the Punjab Municipal Corporation Act 1976.

The platform covers the entire pipeline: **Complaint Intake** (manual & AI-extracted OCR document review with local Tesseract/PDF fallback), **BI/ATP Assignment**, **Complaint-to-Case Promotion**, **Field Inspection & Geotagged Evidence Capture**, **Statutory Notice Generation (Section 270 & Section 269)**, **Granular Section-Level Construction Processing (Compoundable vs Non-Compoundable)**, **Violator Reply Logging**, **Statutory Demolition & Enforcement Action Tracking (Owner Compliance vs MCL Action vs Court Stays & Cost Recovery)**, **Live Operational Analytics & Performance Leaderboards with ATP Supervisory Rollup**, and **Role-Based Authentication & Data Access Control (JWT, PIN & Block Scoping)** backed by PostgreSQL and Google Drive file storage.

---

## 2. Progress Breakdown: What Has Been Done Till Now

### 2.1 Authentication & Security (JWT & RBAC)
- **Database Schema**: Created `users` and `officers` tables with bcrypt PIN hashing, designation mapping (`Operator`, `BI`, `ATP`, `MTP`, `JC`, `Superadmin`), and seed scripts.
- **Backend Auth & Middleware**: Implemented `POST /api/auth/login`, `GET /api/auth/me`, JWT generation/verification, and `authorizeRole(...)` middleware protecting mutating routes.
- **Frontend Auth Integration**:
  - `AuthContext.tsx`: Manages authentication state, token persistence in `localStorage`, and an automatic Bearer token interceptor on all API calls.
  - `LoginPage.tsx`: Integrated real PIN-based authentication with lockout timers and inline error feedback.
  - Role-based route guards in `App.tsx` and dynamic navigation filtering in `Sidebar.tsx`.
  - `UsersPage.tsx`: Admin user management portal restricted to `superadmin` role.

### 2.2 Role-Based Data Access Control (`server/services/accessControl.ts`)
- **Block Normalization & Validation**: Implemented `normalizeBlock(...)` and `isBlockAssigned(...)` to reliably compare block variations (e.g., "Block 25", "25", "Block 31(1)").
- **Role Scoping (`getUserAssignedBlocks`)**:
  - **Building Inspectors (BI) & Assistant Town Planners (ATP)**: Restricted strictly to complaints, cases, visits, inspections, and enforcement records within their assigned blocks.
  - **Desk Operators (`operator`)**: Have unrestricted block views but on `GET /api/complaints` are restricted strictly to complaints they personally registered via `submitted_by_user_id`.
  - **Administrative Roles (`superadmin`, `admin`, `jc`, `mtp`)**: Have unrestricted system-wide access across all zones and blocks (`getUserAssignedBlocks` returns `null`).
- **Enforced Across Core Routes**:
  - `GET /api/complaints` & `GET /api/complaints/:id` (403 if requested complaint is outside assigned blocks).
  - `GET /api/cases` & `GET /api/cases/:id` (403 if requested case is outside assigned blocks).
  - `GET /api/cases/:id/construction-status` & `POST /api/cases/:id/construction-status`.
  - `POST /api/inspections` (blocks inspection filing if officer is not assigned to the selected block).
  - `GET /api/cases/:id/enforcement` & `POST /api/cases/:id/enforcement`.

### 2.3 OCR Ingestion Pipeline with Local Tesseract Fallback (`server/services/ocrService.ts`)
- **Dual-Engine Architecture**:
  - **Primary**: Mistral OCR API for high-accuracy cloud-based document transcription of images and PDF files.
  - **Image Fallback**: Local `tesseract.js` OCR engine executes when the Mistral API is unavailable, unconfigured, or encounters network errors.
  - **PDF Fallback**: Local `pdf-parse` text extractor extracts textual content directly from PDF documents without external API dependencies.
- **Structured Extraction Pipeline**: `POST /api/complaints/process-source` and `POST /api/complaints/extract-source` feed OCR output into Claude 3.5 Sonnet to extract citizen details, address, building type, and violation descriptions into pre-filled editable complaint drafts.

### 2.4 Statutory Backend Architecture & PostgreSQL Persistence
- **Database Engine (`server/db/database.ts`)**: PostgreSQL connection pool with SSL handling, transaction helpers, and migration scripts.
- **Statutory Tables**:
  - `complaints`: Citizen complaints, registration source, block, zone, ward, address, BI/ATP assignments, submitted user tracking, Google Drive URLs.
  - `cases`: Enforcement cases (`CASE-XXXXXXXXXXXX`), primary complaint linkage, assigned officers, overall lifecycle status.
  - `case_complaints`: Junction table mapping multiple complaints to a single enforcement case.
  - `field_visits` & `visit_evidence`: Field inspection records with device GPS coordinates (`latitude`, `longitude`, `accuracy`), building classifications, violator details, and photo evidence.
  - `notices`: Section 270(1) and Section 269 notices with statutory numbers, notice dates, and document links.
  - `construction_statuses` & `construction_parts`: Section-level status tracking (`compoundable` vs `non_compoundable`) with independent `part_status`, assessment charges, receipt metadata, and `ON CONFLICT` upsert safety.
  - `violator_replies`: Violator reply statements, submission timestamps, evidence files, and review statuses.
  - `demolition_records` & `demolition_evidence` (`migrations/004_create_demolition_tables.sql`): Comprehensive statutory demolition and enforcement tracking, recording compliance deadlines, appeal/stay metadata, physical execution details, cost recoveries, and evidence photos.
  - `case_status_history`: Audit logging of status transitions with actor IDs, reasons, and timestamps.
  - `officers`: Roster mapping BI and ATP officers to assigned zones and blocks.

### 2.5 Statutory Demolition & Enforcement Actions (`server/routes/enforcementRoutes.ts`)
- **`GET /api/cases/:caseId/enforcement`**: Retrieves recorded demolition details, cost recovery data, appeal/stay information, and uploaded evidence files with block-level RBAC verification.
- **`POST /api/cases/:caseId/enforcement`**: Records execution of statutory enforcement:
  - Supports 5 statutory outcome categories: Violator Complied, Demolition by Violator, Demolition by MCL, Appeal/Stay, and Further Action Required.
  - Records execution dates, portions demolished, remaining violation descriptions, cost recovery parameters (demolition cost, recovery amount, reference number), and court stay/appeal orders.
  - Uploads evidence photos to Google Drive (with local storage staging and fallback) and records metadata in `demolition_evidence`.
  - Automatically updates `cases.current_status` and logs audit events in `case_status_history`.

### 2.6 Live Operations Analytics with ATP Supervisory Rollup (`server/routes/analyticsRoutes.ts`)
- **`GET /api/analytics/overview`**: Direct PostgreSQL aggregations for KPI summary, complaint statuses, zone breakdowns, enforcement activity counts, and 4 statutory Needs Attention alerts.
- **`GET /api/analytics/officers` (Supervisory Rollup)**:
  - For Building Inspectors (`BI`), calculates individual direct counts of field visits, notices issued, and cases assigned.
  - For Assistant Town Planners (`ATP`), rolls up the total enforcement activity of all Building Inspectors in their supervised Zone (`JOIN officers bi ON bi.officer_id = ... WHERE bi.zone = o.zone`), reflecting total supervisory output instead of zero counts.

### 2.7 Frontend Architecture & User Experience (`Frontend/src/`)
- **Centralized API Configuration**: `Frontend/src/shared/utils/apiConfig.ts` exports `API_BASE_URL` backed by `VITE_API_BASE_URL`, eliminating hardcoded URLs across the application.
- **Field Inspection Fallback & Permissions (`FieldInspectionPage.tsx`, `officersData.ts`)**:
  - `officersData.ts`: 12-officer static fallback roster prevents empty dropdowns or "Failed to fetch" crashes during network interruptions.
  - BI users: Identity is pre-filled and locked to prevent unauthorized filing under another officer's name.
  - Non-BI roles (`superadmin`, `operator`, `admin`): Reporting Officer and Block remain fully selectable. Available blocks fall back to all blocks in `locationData` when no officer is selected.
  - Auto-derives Zone and Supervising ATP dynamically.
- **Demolition & Enforcement Action Form (`EnforcementActionForm.tsx`)**:
  - Connected to live backend APIs (`/api/cases/:id`, `/api/cases/:id/notices`, and `/api/cases/:id/enforcement`).
  - **Statutory 3-Day Compliance Period Gate**: Validates whether 3 statutory days have elapsed since the Section 269 notice date. If the compliance period is still active, enforcement action options are disabled and an informational countdown banner is displayed.
  - **Pre-Fill & Edit Mode**: Re-opening enforcement on an existing case automatically loads previously saved details, displays Google Drive preview thumbnails of existing evidence photos, and allows replacing photos or editing records.
  - **Responsive 1400px Layout**: Widened layout with responsive CSS grids (`repeat(auto-fit, minmax(...))`) resolving cramped mobile and desktop viewports.
- **Case Detail Page Upgrades (`CaseDetailPage.tsx`)**:
  - **Demolition & Enforcement Information Card**: Displays enforcement outcomes, execution dates, demolished portions, remaining violations, cost recovery tables, appeal/court stay parameters, and Google Drive evidence photo thumbnails.
  - **Action Timeline & Status History**: Renders chronological status transitions and notes from `case_status_history`.
  - Direct action shortcut badge linking to `/cases/:id/enforcement`.
- **Operational Dashboard (`DashboardPage.tsx`)**:
  - Live KPI cards with top-border gradients and animated number counters via `useCountUp`.
  - Horizontal complaint status breakdown with proportional bars.
  - Enforcement activity metrics (Section 270 vs Section 269 vs Standalone Visits).
  - Needs Attention alert cards with left-to-right staggered slide-in animations.
- **Officers Roster & Performance (`OfficersPage.tsx`)**:
  - 4-card live KPI summary (Total Officers, Building Inspectors, ATP Officers, Avg Cases/Officer).
  - 3-card Top Performers Podium (Gold, Silver, Bronze ranked by real cases assigned with visits and notices mini-stats).
  - Officer roster table with proportional workload progress bars, search, and zone filtering.
  - Slide-out officer detail drawer showing active statutory inspection and notice metrics, with a dedicated **Supervised Building Inspectors** team section for ATPs displaying each supervised BI's performance.

---

## 3. What Is Left: Remaining Tasks & Implementation Gaps

| Priority | Task | Description | Target Files |
| :--- | :--- | :--- | :--- |
| **High** | **1. ATP Case Closure Endpoint & Modal** | Add `POST /api/cases/:caseId/close` backend route (with statutory closing reason, actor tracking, and evidence upload) and build the Close Case modal in `CaseDetailPage.tsx`. | `server/routes/complaintRoutes.ts`, `Frontend/src/pages/CaseDetailPage.tsx` |
| **High** | **2. Violator Reply Review Workflow** | Create `POST /api/cases/:caseId/review-reply` to record ATP/BI evaluation of violator replies (`Valid -> Close Case` vs `Invalid -> Advance to Demolition / Section 269`) with a review UI card in `CaseDetailPage.tsx`. | `server/routes/complaintRoutes.ts`, `Frontend/src/pages/CaseDetailPage.tsx` |
| **Medium** | **3. Workflow State Machine Domain Service** | Implement strict transition validation (`workflowService.ts` / `STATUS_TRANSITIONS.ts`) enforcing statutory prerequisites (e.g. non-compoundable requires Section 269, partly compoundable requires both sections resolved, stay granted halts demolition). | `server/services/workflowService.ts`, `server/routes/complaintRoutes.ts` |
| **Low** | **4. Git & Build Hygiene** | Ensure `.env.example` templates exist for both frontend and backend, and maintain clean tracking without build artifacts. | `Frontend/.env.example`, `server/.env.example` |

---

## 4. Verification & Build Commands

```powershell
# 1. Frontend Build Verification
cd Frontend
npm run build

# 2. Frontend ESLint Verification
npx eslint src/pages/EnforcementActionForm.tsx src/pages/FieldInspectionPage.tsx src/features/officers/OfficersPage.tsx src/data/officersData.ts

# 3. Backend Build Verification
cd ..\server
npm run build

# 4. Dev Server Launch
# Terminal 1 (Frontend):
cd Frontend
npm run dev

# Terminal 2 (Backend):
cd server
npm run dev
```

---

## 5. Summary Matrix of Key Components

| Component | File Path | Current Status | Next Action |
| :--- | :--- | :--- | :--- |
| **Auth Service & Routes** | `server/routes/authRoutes.ts` | Complete (JWT + PIN + RBAC) | None |
| **Access Control (RBAC)** | `server/services/accessControl.ts` | Complete (Block-level scoping for BI & ATP, operator submitter filter) | None |
| **OCR Service** | `server/services/ocrService.ts` | Complete (Mistral OCR + local Tesseract.js & pdf-parse fallback) | None |
| **Database Pool & Schema** | `server/db/database.ts` | Complete with migrations (including demolition tables) | Add migration version table |
| **Complaint & Case Routes**| `server/routes/complaintRoutes.ts` | Intake, assign, inspect, construction status active with block RBAC | Add `/close` and `/review-reply` |
| **Enforcement Routes** | `server/routes/enforcementRoutes.ts` | Complete (`GET` and `POST /api/cases/:caseId/enforcement` with RBAC) | Connect to case closure when full demolition |
| **Analytics Routes** | `server/routes/analyticsRoutes.ts` | Complete (`GET /api/analytics/overview`, `/officers` with ATP rollup) | None |
| **Auth Context & Interceptor** | `Frontend/src/context/AuthContext.tsx` | Complete (Bearer token attached to all requests) | None |
| **App Shell & Routing** | `Frontend/src/App.tsx` | Role-based route guards & all subroutes active | Connect real-time alert badge counts |
| **Field Inspection Form** | `Frontend/src/pages/FieldInspectionPage.tsx` | GPS, photos, static fallback roster, role-aware auto-population | None |
| **Construction Status Form**| `Frontend/src/pages/ConstructionStatusForm.tsx` | Dual lookup & section tabs active | None |
| **Enforcement Action Form** | `Frontend/src/pages/EnforcementActionForm.tsx` | Complete (1400px wide, 3-day compliance gate, edit pre-fill, Drive previews) | None |
| **Case Detail View** | `Frontend/src/pages/CaseDetailPage.tsx` | Timeline, metadata, demolition card, evidence gallery, action links | Add Close Case & Review Reply modals |
| **Dashboard** | `Frontend/src/features/dashboard/DashboardPage.tsx` | Complete with live DB KPIs, status bars, needs attention | None |
| **Officers Performance** | `Frontend/src/features/officers/OfficersPage.tsx` | Complete with live 4-card KPI, 3-card podium, workload bars, ATP team drawer | None |
| **User Management** | `Frontend/src/features/users/UsersPage.tsx` | Complete (superadmin user administration) | None |
