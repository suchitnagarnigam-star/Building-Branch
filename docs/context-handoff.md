# MCL Building Branch (MCL-BB) — Context Handoff & Progress Report

**Date:** September 26, 2026  
**Repository:** MCL-BB (`d:\Projects\MCL\MCL-BB`)  
**Active Branch:** `ad-dev` (synced with `origin/ad-dev`)  
**Target Milestone:** Full Enforcement Lifecycle Automation, Role-Based Access Control, Statutory Persistence, and Live Operations Analytics

---

## 1. Executive Summary

The **MCL Building Branch (MCL-BB)** system automates the statutory building violation enforcement lifecycle for the Pune Municipal Corporation (PMC) under the PMC Act 1976.

The platform covers the entire pipeline: **Complaint Intake** (manual & AI-extracted OCR document review), **BI/ATP Assignment**, **Complaint-to-Case Promotion**, **Field Inspection & Geotagged Evidence Capture**, **Statutory Notice Generation (Section 270 & Section 269)**, **Granular Section-Level Construction Processing (Compoundable vs Non-Compoundable)**, **Violator Reply Logging**, and **Role-Based Authentication (JWT & PIN)** backed by PostgreSQL and Google Drive file storage.

---

## 2. Progress Breakdown: What Has Been Done Till Now

### 2.1 Authentication & Security (JWT & RBAC)
- **Database Schema**: Created `users` and `officers` tables with bcrypt PIN hashing, designation mapping (`Operator`, `BI`, `ATP`, `MTP`, `JC`, `Superadmin`), and seed scripts.
- **Backend Auth & Middleware**: Implemented `POST /api/auth/login`, `GET /api/auth/me`, JWT generation/verification, and `authorizeRole(...)` middleware protecting mutating routes.
- **Frontend Auth Integration**:
  - `AuthContext.tsx`: Manages authentication state, token persistence in `localStorage`, and an automatic Bearer token interceptor on all API calls.
  - `LoginPage.tsx`: Integrated real PIN-based authentication with lockout timers and inline error feedback.
  - Role-based route guards in `App.tsx` and dynamic navigation filtering in `Sidebar.tsx`.

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
  - `case_status_history`: Audit logging of status transitions with actor IDs, reasons, and timestamps.
  - `officers`: Roster mapping BI and ATP officers to assigned zones and blocks.

### 2.3 Backend API Endpoints (`server/routes/complaintRoutes.ts`)
- **Complaint Ingestion**: `POST /api/complaints`, `POST /api/complaints/process-source` (Mistral OCR), `POST /api/complaints/extract-source` (Claude 3.5 Sonnet extraction), `GET /api/complaints`, `GET /api/complaints/:id`.
- **Case Promotion & Lookup**: `POST /api/complaints/:id/assign` (promotes complaint to `CASE-XXXXXXXXXXXX`), `GET /api/cases` (multi-criteria search/filter), `GET /api/cases/:id` (fully hydrated case record).
- **Field Inspections**: `POST /api/inspections` supporting outcome branches:
  - `no_violation`: Closes or updates complaint without escalation.
  - `violation_found`: Records Section 270 notice, captures geotagged evidence, and automatically creates an enforcement case.
  - `complete_violated`: Supports inspection of completed illegal structures (bypasses Section 270 notice stage, moving directly to 3-day reply period and Construction Status workflow).
- **Statutory Construction Processing**: `GET /api/cases/:id/construction-status` and `POST /api/cases/:id/construction-status` supporting compoundable penalty assessment, Section 269 notice issuance, violator replies, and dual-section resolution logic.

### 2.4 Frontend Pages & User Experience (`Frontend/src/`)
- **Complaint Management**: `ComplaintFormPage.tsx` (manual entry), `ExtractedComplaintPage.tsx` (AI OCR document intake), `ComplaintsPage.tsx` (tabbed registry), `ComplaintDetailPage.tsx` (evidence previews & assignment trigger).
- **Field Inspections**: `FieldInspectionPage.tsx` with browser Geolocation API GPS capture, outcome selection, auto-filtered officer dropdowns, and Section 270/269 notice attachments.
- **Statutory Processing & Cases**: `CasesPage.tsx` (lifecycle filters), `CaseDetailPage.tsx` (audit timeline, evidence gallery, outcome chips), `ConstructionStatusForm.tsx` (dual lookup by `CASE-XXXX` or `CMP-XXXX`, dynamic section tabs, receipt uploads).
- **Consolidated Analytics & UI Polish**:
  - Removed redundant `AnalyticsPage.tsx` to streamline the user journey; central overview and officer performance are consolidated in `DashboardPage.tsx` and `OfficersPage.tsx`.
  - `OfficersPage.tsx`: Officer roster with interactive sparklines, inspection cadence spline charts, statutory competency radar, and monthly performance breakdown.
  - `Topbar.tsx` & `SettingsPage.tsx`: Dynamic viewport text-scaling popover slider (85%–115%) with `localStorage` persistence.

---

## 3. What Is Left: Remaining Tasks & Implementation Gaps

| Priority | Task | Description | Target Files |
| :--- | :--- | :--- | :--- |
| **High** | **1. Centralize API Base URLs** | Replace remaining hardcoded `http://localhost:5000/api` strings across components with `API_BASE_URL` from a single config file (`VITE_API_BASE_URL`). | `Frontend/src/shared/utils/apiConfig.ts`, `complaintApi.ts`, component files |
| **High** | **2. ATP Case Closure Endpoint & Modal** | Add `POST /api/cases/:caseId/close` backend route (with statutory closing reason, actor tracking, and evidence upload) and build the Close Case modal in `CaseDetailPage.tsx`. | `server/routes/complaintRoutes.ts`, `Frontend/src/pages/CaseDetailPage.tsx` |
| **High** | **3. Violator Reply Review Workflow** | Create `POST /api/cases/:caseId/review-reply` to record ATP/BI evaluation of violator replies (`Valid -> Close Case` vs `Invalid -> Advance to Demolition / Section 269`) with a review UI card in `CaseDetailPage.tsx`. | `server/routes/complaintRoutes.ts`, `Frontend/src/pages/CaseDetailPage.tsx` |
| **Medium** | **4. Workflow State Machine Domain Service** | Implement strict transition validation (`workflowService.ts` / `STATUS_TRANSITIONS.ts`) enforcing statutory prerequisites (e.g. non-compoundable requires Section 269, partly compoundable requires both sections resolved). | `server/services/workflowService.ts`, `server/routes/complaintRoutes.ts` |
| **Medium** | **5. Live Operational Analytics API** | Implement `GET /api/analytics/overview` and `GET /api/analytics/officers` using real PostgreSQL aggregation queries (`COUNT(cases)`, average resolution time, officer workload) to feed `DashboardPage.tsx`. | `server/routes/complaintRoutes.ts`, `Frontend/src/pages/DashboardPage.tsx` |
| **Low** | **6. Git & Build Hygiene** | Untrack build artifacts (`server/dist/`, `server/node_modules/`) from git tracking and ensure `.env.example` templates exist for both frontend and backend. | `.gitignore`, `Frontend/.env.example`, `server/.env.example` |

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
| **Database Pool & Schema** | `server/db/database.ts` | Complete with migrations & seeders | Add migration version table |
| **Enforcement Routes** | `server/routes/complaintRoutes.ts` | Intake, assign, inspect, construction status active | Add `/close`, `/review-reply`, `/analytics` |
| **Auth Context & Interceptor** | `Frontend/src/context/AuthContext.tsx` | Complete (Bearer token attached) | None |
| **App Shell & Routing** | `Frontend/src/App.tsx` | Role-based route guards active | Connect real-time alert badge counts |
| **Field Inspection Form** | `Frontend/src/pages/FieldInspectionPage.tsx` | GPS, photos, outcome branching active | Ensure central API config usage |
| **Construction Status Form**| `Frontend/src/pages/ConstructionStatusForm.tsx` | Dual lookup & section tabs active | Ensure central API config usage |
| **Case Detail View** | `Frontend/src/pages/CaseDetailPage.tsx` | Timeline, metadata, evidence active | Add Close Case & Review Reply modals |
| **Dashboard** | `Frontend/src/pages/DashboardPage.tsx` | Layout & UI complete | Connect to live `GET /api/analytics/overview` |
| **Officers Performance** | `Frontend/src/pages/OfficersPage.tsx` | Sparklines, charts & radar complete | Connect to live `GET /api/analytics/officers` |
