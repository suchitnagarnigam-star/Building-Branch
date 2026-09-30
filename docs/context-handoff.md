# MCL Building Branch (MCL-BB) — Context Handoff & Progress Report

**Date:** September 30, 2026  
**Repository:** MCL-BB (`MCL/building branch`)  
**Active Branch:** `uv-dev` (synced with `origin/ad-dev` & `main`)  
**Target Milestone:** Full Enforcement Lifecycle Automation, Role-Based Access Control, Statutory Demolition Action, and Live Operations Analytics

---

## 1. Executive Summary

The **MCL Building Branch (MCL-BB)** system automates the statutory building violation enforcement lifecycle for the Municipal Corporation of Ludhiana (MCL) under the PMC Act 1976.

The platform covers the entire pipeline: **Complaint Intake** (manual & AI-extracted OCR document review), **BI/ATP Assignment**, **Complaint-to-Case Promotion**, **Field Inspection & Geotagged Evidence Capture**, **Statutory Notice Generation (Section 270 & Section 269)**, **Granular Section-Level Construction Processing (Compoundable vs Non-Compoundable)**, **Violator Reply Logging**, **Demolition / Enforcement Action Tracking (Owner Compliance vs MCL Action vs Court Stays & Cost Recovery)**, **Live Operational Analytics & Performance Leaderboards**, and **Role-Based Authentication (JWT & PIN)** backed by PostgreSQL and Google Drive file storage.

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

### 2.2 Statutory Backend Architecture & PostgreSQL Persistence
- **Database Engine (`server/db/database.ts`)**: PostgreSQL connection pool with SSL handling, transaction helpers, and migration scripts.
- **Statutory Tables**:
  - `complaints`: Citizen complaints, registration source, block, zone, ward, address, BI/ATP assignments, Google Drive URLs.
  - `cases`: Enforcement cases (`CASE-XXXXXXXXXXXX`), primary complaint linkage, assigned officers, overall lifecycle status.
  - `case_complaints`: Junction table mapping multiple complaints to a single enforcement case.
  - `field_visits` & `visit_evidence`: Field inspection records with device GPS coordinates (`latitude`, `longitude`, `accuracy`), building classifications, violator details, and photo evidence.
  - `notices`: Section 270(1) and Section 269 notices with statutory numbers, notice dates, and document links.
  - `construction_statuses` & `construction_parts`: Section-level status tracking (`compoundable` vs `non_compoundable`) with independent `part_status`, assessment charges, receipt metadata, and `ON CONFLICT` upsert safety.
  - `violator_replies`: Violator reply statements, submission timestamps, evidence files, and review statuses.
  - `demolition_records` & `demolition_evidence` (`migrations/004_create_demolition_tables.sql`): Comprehensive statutory demolition and enforcement tracking, recording compliance deadlines, appeal/stay metadata, physical execution details, cost recoveries, and evidence photos.
  - `case_status_history`: Audit logging of status transitions with actor IDs, reasons, and timestamps.
  - `officers`: Roster mapping BI and ATP officers to assigned zones and blocks.

### 2.3 Backend API Endpoints
- **Complaint Ingestion (`server/routes/complaintRoutes.ts`)**: `POST /api/complaints`, `POST /api/complaints/process-source` (Mistral OCR), `POST /api/complaints/extract-source` (Claude 3.5 Sonnet extraction), `GET /api/complaints`, `GET /api/complaints/:id`.
- **Case Promotion & Lookup**: `POST /api/complaints/:id/assign` (promotes complaint to `CASE-XXXXXXXXXXXX`), `GET /api/cases` (multi-criteria search/filter), `GET /api/cases/:id` (fully hydrated case record).
- **Field Inspections**: `POST /api/inspections` supporting outcome branches:
  - `no_violation`: Closes or updates complaint without escalation.
  - `violation_found`: Records Section 270 notice, captures geotagged evidence, and automatically creates an enforcement case.
  - `complete_violated`: Supports inspection of completed illegal structures (bypasses Section 270 notice stage, moving directly to 3-day reply period and Construction Status workflow).
- **Statutory Construction Processing**: `GET /api/cases/:id/construction-status` and `POST /api/cases/:id/construction-status` supporting compoundable penalty assessment, Section 269 notice issuance, violator replies, and dual-section resolution logic.
- **Demolition & Enforcement Action (`server/routes/enforcementRoutes.ts`)**: `POST /api/cases/:caseId/enforcement` supporting multipart evidence uploads, Google Drive folder creation, appeal/court stay records, demolition execution tracking, and cost recovery.
- **Live Operations Analytics (`server/routes/analyticsRoutes.ts`)**:
  - `GET /api/analytics/overview`: Direct PostgreSQL aggregations for KPI summary, complaint statuses, zone breakdowns, enforcement activity counts, and 4 statutory Needs Attention alerts.
  - `GET /api/analytics/officers`: Live joins on `officers`, `field_visits`, `notices`, and `cases` computing real inspection, notice issuance, and active case counts grouped by officer.

### 2.4 Frontend Architecture & User Experience (`Frontend/src/`)
- **Centralized API Configuration**: Created `Frontend/src/shared/utils/apiConfig.ts` exporting `API_BASE_URL` backed by `VITE_API_BASE_URL`, replacing all hardcoded `http://localhost:5000` URLs across the frontend.
- **Complaint Management**: `ComplaintFormPage.tsx` (manual entry), `ExtractedComplaintPage.tsx` (AI OCR document intake), `ComplaintsPage.tsx` (tabbed registry), `ComplaintDetailPage.tsx` (evidence previews & assignment trigger).
- **Field Inspections**: `FieldInspectionPage.tsx` with browser Geolocation API GPS capture, outcome selection, auto-filtered officer dropdowns, and Section 270/269 notice attachments.
- **Statutory Processing & Cases**: `CasesPage.tsx` (lifecycle filters), `CaseDetailPage.tsx` (audit timeline, evidence gallery, outcome chips), `ConstructionStatusForm.tsx` (dual lookup by `CASE-XXXX` or `CMP-XXXX`, dynamic section tabs, receipt uploads).
- **Demolition & Enforcement Action Form**: `EnforcementActionForm.tsx` (`#/cases/:caseId/enforcement`), structured with a 1400px wide layout, responsive auto-fit grids, progress step tracker, outcome branching (Violator Complied, Demolition by Violator, Demolition by MCL, Appeal/Stay, Further Action Required), and Drive evidence upload.
- **Operational Dashboard (`DashboardPage.tsx`)**:
  - Live KPI cards with top-border gradients and animated number counters via `useCountUp`.
  - Horizontal complaint status breakdown with proportional bars.
  - Real enforcement activity metrics (Section 270 vs Section 269 vs Standalone Visits).
  - Needs Attention alert cards with left-to-right staggered slide-in animations.
  - Recent complaints table with live age calculation.
- **Officers Roster & Performance (`OfficersPage.tsx`)**:
  - 4-card live KPI summary (Total Officers, Building Inspectors, ATP Officers, Avg Cases/Officer).
  - 3-card Top Performers Podium (Gold, Silver, Bronze ranked by real cases assigned with visits and notices mini-stats).
  - Officer roster table with proportional workload progress bars, search, and zone filtering.
  - Slide-out officer detail drawer showing active statutory inspection and notice metrics.
- **UI System Polish**:
  - `useCountUp` hook for smooth numeric transitions on dashboard and officer cards.
  - Cohesive section header icons (`file-text`, `shield`, `alert-triangle`, `map-pin`, `clock`, `trophy`) via `Icon.tsx`.
  - Viewport text-scaling popover slider (85%–115%) in `Topbar.tsx` with `localStorage` persistence.

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

# 2. Backend Build Verification
cd ..\server
npm run build

# 3. Dev Server Launch
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
| **Database Pool & Schema** | `server/db/database.ts` | Complete with migrations (including demolition tables) | Add migration version table |
| **Complaint & Case Routes**| `server/routes/complaintRoutes.ts` | Intake, assign, inspect, construction status active | Add `/close` and `/review-reply` |
| **Enforcement Routes** | `server/routes/enforcementRoutes.ts` | Complete (`POST /api/cases/:caseId/enforcement`) | Connect to case closure when full demolition |
| **Analytics Routes** | `server/routes/analyticsRoutes.ts` | Complete (`GET /api/analytics/overview`, `/officers`) | None |
| **Auth Context & Interceptor** | `Frontend/src/context/AuthContext.tsx` | Complete (Bearer token attached) | None |
| **App Shell & Routing** | `Frontend/src/App.tsx` | Role-based route guards & all subroutes active | Connect real-time alert badge counts |
| **Field Inspection Form** | `Frontend/src/pages/FieldInspectionPage.tsx` | GPS, photos, outcome branching active | None |
| **Construction Status Form**| `Frontend/src/pages/ConstructionStatusForm.tsx` | Dual lookup & section tabs active | None |
| **Enforcement Action Form** | `Frontend/src/pages/EnforcementActionForm.tsx` | Complete (1400px wide, multi-outcome, file upload) | None |
| **Case Detail View** | `Frontend/src/pages/CaseDetailPage.tsx` | Timeline, metadata, evidence, action links active | Add Close Case & Review Reply modals |
| **Dashboard** | `Frontend/src/features/dashboard/DashboardPage.tsx` | Complete with live DB KPIs, status bars, needs attention | None |
| **Officers Performance** | `Frontend/src/features/officers/OfficersPage.tsx` | Complete with live 4-card KPI, 3-card podium, workload bars | None |
| **User Management** | `Frontend/src/features/users/UsersPage.tsx` | Complete (superadmin user administration) | None |
