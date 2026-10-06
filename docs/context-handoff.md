# MCL Building Branch (MCL-BB) — Context Handoff & Progress Report

**Date:** October 5, 2026  
**Repository:** MCL-BB (`suchitnagarnigam-star/Building-Branch`)  
**Active Branch:** `ad-dev` (synced with `uv-dev` & `main`)  
**Target Milestone:** Full Statutory Enforcement Lifecycle Automation, Dynamic Role-Based Data Access Control (RBAC), Demolition Enforcement Tracking, AI-Powered Intake with Local OCR Fallback, and Live Operations Analytics

---

## 1. Executive Summary

The **MCL Building Branch (MCL-BB)** system automates the statutory building violation enforcement lifecycle for the Municipal Corporation of Ludhiana (MCL) under the Punjab Municipal Corporation (PMC) Act 1976.

The platform covers the entire statutory enforcement pipeline:
1. **Complaint Intake**: Manual citizen entry and AI-extracted OCR document review (Mistral OCR with local Tesseract fallback, processed via Anthropic Claude 3.5 Sonnet).
2. **Officer Mapping & Promotion**: Automatic block-to-zone resolution and roster mapping to Block Inspectors (BI) and Assistant Town Planners (ATP), with complaint-to-case promotion (`CASE-XXXXXXXXXXXX`).
3. **Field Inspections**: Device GPS geotagged evidence capture (`latitude`, `longitude`, `accuracy`), photo uploads, and outcome branching (`no_violation`, `violation_found` with Section 270 notice, `complete_violated` for completed structures).
4. **Statutory Construction Processing**: Dual-section handling (`compoundable` penalty assessment vs `non_compoundable` Section 269 notice issuance) with independent section states and receipt photo uploads.
5. **Violator Replies & Hearings**: Logging violator reply statements, dates, and evidence attachments.
6. **Demolition & Statutory Enforcement**: End-to-end statutory demolition tracking (`EnforcementActionForm.tsx`), supporting 5 outcome paths (Violator Complied, Demolition by Violator, Demolition by MCL, Appeal / Court Stay, Further Action Required), 7-day minimum compliance period validation, Google Drive evidence storage, and cost recovery.
7. **Role-Based Data Access Control (RBAC & Block Filtering)**: Dynamic backend-enforced block restrictions ensuring BIs and ATPs only view complaints, cases, inspections, and analytics for their assigned blocks, while Superadmin, Admin, JC, MTP, and Desk Operators maintain unrestricted all-zone/all-block visibility.
8. **Live Operations Analytics & Roster Leaderboards**: Real-time PostgreSQL analytics overview with Needs Attention alerts, 4-card KPI summaries, Top Performers Podium (ranked by assigned cases, visits, and notices), workload progress bars, and ATP supervisory metric rollups.

---

## 2. Comprehensive Progress Breakdown: Implemented Features

### 2.1 Role-Based Data Access Control (RBAC & Assigned Block Filtering)
- **Backend Access Control Service ([`server/services/accessControl.ts`](file:///d:/Projects/MCL/MCL-BB/server/services/accessControl.ts))**:
  - `normalizeBlock`: Standardizes block formats (e.g. `"Block 2"`, `"block 2"`, `"2"` -> `"2"`, `"Block 31(1)"` -> `"31(1)"`).
  - `isBlockAssigned`: Verifies block authorization. Returns `true` for unrestricted roles (`assignedBlocks === null`).
  - `getUserAssignedBlocks`: Resolves user assigned blocks from JWT payload, PostgreSQL database (`officers.blocks`), or `officers.json`. Returns `null` for `superadmin`, `jc`, `mtp`, `operator`, and `admin` roles (unrestricted across all zones and blocks).
- **JWT & Authentication Integration ([`server/services/authService.ts`](file:///d:/Projects/MCL/MCL-BB/server/services/authService.ts), [`server/routes/authRoutes.ts`](file:///d:/Projects/MCL/MCL-BB/server/routes/authRoutes.ts))**:
  - Extended `JWTPayload` interface with `blocks?: string[] | null`.
  - Updated login endpoint to select `o.blocks` from PostgreSQL or resolve from `officers.json` and attach to token.
- **Backend API Block Enforcement**:
  - `getComplaints` in [`server/services/complaintStorage.ts`](file:///d:/Projects/MCL/MCL-BB/server/services/complaintStorage.ts): Applied SQL `REPLACE(LOWER(TRIM(block)), 'block ', '') = ANY(...)` filtering and JSON fallback array filtering.
  - Complaints & Cases Routes ([`server/routes/complaintRoutes.ts`](file:///d:/Projects/MCL/MCL-BB/server/routes/complaintRoutes.ts)): Scoped `GET /api/complaints`, `GET /api/cases`, `GET /api/officers/:id` to assigned blocks. Direct ID requests (`GET /api/complaints/:id`, `GET /api/cases/:id`, `GET /api/cases/:id/construction-status`, `POST /api/inspections`) reject unassigned block access with `403 Forbidden`.
  - Enforcement Routes ([`server/routes/enforcementRoutes.ts`](file:///d:/Projects/MCL/MCL-BB/server/routes/enforcementRoutes.ts)): `GET` & `POST /api/cases/:caseId/enforcement` enforce block access checks.
  - Analytics Overview ([`server/routes/analyticsRoutes.ts`](file:///d:/Projects/MCL/MCL-BB/server/routes/analyticsRoutes.ts)): `GET /api/analytics/overview` filters KPI totals, status breakdown, zone distribution, enforcement activity, needs attention metrics, and recent complaints by assigned blocks for BI/ATP users.

### 2.2 Statutory Demolition & Enforcement Action Workflow
- **Database Schema ([`migrations/004_create_demolition_tables.sql`](file:///d:/Projects/MCL/MCL-BB/server/migrations/004_create_demolition_tables.sql))**:
  - `demolition_records`: Stores `enforcement_outcome`, compliance dates, verification dates/statuses, demolition execution details, cost recoveries, appeal/stay metadata, and remarks.
  - `demolition_evidence`: Maps evidence photos to demolition records with Google Drive file IDs and URLs.
- **Backend API ([`server/routes/enforcementRoutes.ts`](file:///d:/Projects/MCL/MCL-BB/server/routes/enforcementRoutes.ts))**:
  - `GET /api/cases/:caseId/enforcement`: Returns demolition record and evidence files JSON array.
  - `POST /api/cases/:caseId/enforcement`: Handles single and update enforcement submissions, Google Drive folder creation (`createCaseDriveFolder`), file upload, case status updates, and `case_status_history` logging.
- **Frontend UI ([`Frontend/src/pages/EnforcementActionForm.tsx`](file:///d:/Projects/MCL/MCL-BB/Frontend/src/pages/EnforcementActionForm.tsx))**:
  - 1400px wide responsive layout with step progress tracker, pre-filled edit mode, and 5 outcome branches:
    1. *Violator Complied*: Compliance date, verification date, verification status.
    2. *Demolition by Violator*: Demolition date, demolition type, demolished portion, remaining violation, further action.
    3. *Demolition by MCL*: Execution date, executed by team, demolition type, demolished portion, cost recovery details (demolition cost, recovery amount, recovery reference).
    4. *Appeal / Court Stay*: Appeal number, appeal date, authority, stay granted status, stay date, court directions.
    5. *Further Action Required*: Reason, next action, expected action date.
  - Minimum statutory compliance period validation (e.g. 7-day notice check before demolition).
  - Inline evidence photo preview and upload.

### 2.3 OCR & Intelligent Complaint Processing Engine
- **Primary & Fallback OCR ([`server/services/ocrService.ts`](file:///d:/Projects/MCL/MCL-BB/server/services/ocrService.ts))**:
  - Integrates Mistral OCR API for multi-page PDF/image document processing.
  - Fallback engine using local `tesseract.js` with `eng.traineddata` and `hin.traineddata` language files stored in `server/`.
- **AI Extraction Service ([`server/services/claudeService.ts`](file:///d:/Projects/MCL/MCL-BB/server/services/claudeService.ts))**:
  - Formats OCR markdown into structured English JSON complaint fields using Anthropic Claude 3.5 Sonnet.
  - Returns citizen name, phone number, block, ward, derived zone, address, title, and detailed description for operator review prior to registration.

### 2.4 Complete Enforcement Pipeline & Inspection Outcomes
- **Field Inspection Outcome Branching ([`server/routes/complaintRoutes.ts`](file:///d:/Projects/MCL/MCL-BB/server/routes/complaintRoutes.ts))**:
  - `no_violation`: Records inspection without escalating to notice issuance.
  - `violation_found`: Records Section 270 notice, uploads geotagged photo evidence to Google Drive, and automatically creates an enforcement case (`CASE-XXXXXXXXXXXX`).
  - `complete_violated`: Specialized handling for completed unauthorized structures; bypasses Section 270 notice stage and moves directly to 3-day violator reply period and Section 269 / Construction Status workflow.
- **Statutory Construction Processing ([`ConstructionStatusForm.tsx`](file:///d:/Projects/MCL/MCL-BB/Frontend/src/pages/ConstructionStatusForm.tsx))**:
  - Dual lookup by `CASE-XXXX` or `CMP-XXXX`.
  - Granular section tabs (`compoundable` penalty assessment vs `non_compoundable` Section 269 notice issuance).
  - Receipt metadata capture, Section 269 notice photo upload, and violator reply logging.

### 2.5 Operational Dashboard & Officers Performance Engine
- **Operational Dashboard ([`Frontend/src/features/dashboard/DashboardPage.tsx`](file:///d:/Projects/MCL/MCL-BB/Frontend/src/features/dashboard/DashboardPage.tsx))**:
  - Live KPI summary cards (Total Complaints, Total Field Visits, Linked Visits, Standalone Visits, Total Cases, Resolved Cases) with `useCountUp` numeric transitions and top-border gradients.
  - Status breakdown bars, enforcement activity totals, 4 Needs Attention alert cards (unvisited complaints, expired Section 270 notices, pending violator replies, cases without notice), and recent complaints table.
- **Officers Roster & Performance Leaderboard ([`Frontend/src/features/officers/OfficersPage.tsx`](file:///d:/Projects/MCL/MCL-BB/Frontend/src/features/officers/OfficersPage.tsx))**:
  - 4-card live KPI summary (Total Officers, BIs, ATPs, Avg Cases/Officer).
  - 3-card Top Performers Podium (Gold, Silver, Bronze ranked by assigned cases with field visit and notice counts).
  - Workload progress bars, search, zone filtering, and slide-out officer detail drawer.
  - **ATP Supervisory Rollup**: Automatically aggregates supervised BI inspection, notice, and case metrics up to their respective ATPs.

---

## 3. Technology Stack & Configuration

| Layer | Technology | Key Details |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Vanilla CSS | Custom CSS variables, responsive auto-fit grids, `useCountUp` hook, `Icon.tsx` |
| **Backend** | Node.js, Express 5, TypeScript (`tsx`) | Modular routers (`auth`, `user`, `analytics`, `complaint`, `enforcement`) |
| **Auth & Security** | JWT, bcrypt, AuthContext, RBAC | 24h JWT tokens, Bearer fetch interceptor, role & block access control |
| **Database** | PostgreSQL (`pg`) | Primary database pool with SSL support; `server/data/complaints.json` secondary fallback |
| **File Storage** | Google Drive API, Multer | Staged in `server/uploads/`, uploaded to per-complaint/per-case Drive folders |
| **Integrations** | Google Sheets API | Real-time complaint registration sync |
| **OCR Engine** | Mistral OCR API + Tesseract.js | Mistral primary OCR with local Tesseract fallback (`eng`, `hin` trained data) |
| **AI Extraction** | Anthropic Claude 3.5 Sonnet | Structured JSON complaint extraction from raw document OCR text |

---

## 4. Current Status of Outstanding Roadmap Tasks

| Priority | Task | Description | Target Files |
| :--- | :--- | :--- | :--- |
| **High** | **1. ATP Case Closure Endpoint & UI Modal** | Implement `POST /api/cases/:caseId/close` backend route with statutory closing reason, actor tracking, and closing evidence upload, plus the Close Case modal in `CaseDetailPage.tsx`. | `server/routes/complaintRoutes.ts`, `Frontend/src/pages/CaseDetailPage.tsx` |
| **High** | **2. Violator Reply Review Workflow** | Create `POST /api/cases/:caseId/review-reply` to log ATP/BI evaluation of violator replies (`Valid -> Close Case` vs `Invalid -> Advance to Demolition / Section 269`), with a review card in `CaseDetailPage.tsx`. | `server/routes/complaintRoutes.ts`, `Frontend/src/pages/CaseDetailPage.tsx` |
| **Medium** | **3. Workflow State Machine Domain Service** | Implement strict transition validation (`workflowService.ts`) enforcing statutory prerequisites (e.g., Section 269 notice required before demolition, stay granted halts demolition). | `server/services/workflowService.ts`, `server/routes/complaintRoutes.ts` |
| **Low** | **4. Environment Configuration Templates** | Maintain clean `.env.example` templates for both Frontend and Backend environments. | `Frontend/.env.example`, `server/.env.example` |

---

## 5. Verification & Build Commands

```powershell
# 1. Server Build & Typecheck Verification
cd server
npm run build

# 2. Frontend Build Verification
cd ..\Frontend
npm run build

# 3. Access Control Unit Test Execution
cd ..\server
node C:\Users\ASUS\.gemini\antigravity-ide\brain\7e14fa14-c8ef-4bad-b1e7-cba9d69d47d3\scratch\testAccessControl.js

# 4. Dev Server Launch
# Terminal 1 (Frontend - http://localhost:5173):
cd Frontend
npm run dev

# Terminal 2 (Backend - http://localhost:5000):
cd server
npm run dev
```

---

## 6. Summary Matrix of Core System Components

| Component | File Path | Current Status | Key Responsibilities |
| :--- | :--- | :--- | :--- |
| **Access Control Service** | `server/services/accessControl.ts` | Complete | Block normalization, block assignment verification, and user assigned blocks resolution |
| **Auth Service & Routes** | `server/routes/authRoutes.ts` | Complete | PIN verification, JWT token generation with `blocks` payload, login/logout |
| **User Management** | `server/routes/userRoutes.ts` | Complete | `superadmin`-only user CRUD administration |
| **Complaint Storage** | `server/services/complaintStorage.ts` | Complete | Dual-layer persistence with SQL & JSON assigned block filtering |
| **Complaint & Case Routes**| `server/routes/complaintRoutes.ts` | Complete | Intake, OCR processing, inspection, construction status, case promotion, block access guards |
| **Enforcement Routes** | `server/routes/enforcementRoutes.ts` | Complete | Demolition records, multi-outcome handling, Drive evidence uploads, block access guards |
| **Analytics Routes** | `server/routes/analyticsRoutes.ts` | Complete | Role-scoped overview analytics & officer performance leaderboard with ATP supervisory rollup |
| **Auth Context & Interceptor** | `Frontend/src/context/AuthContext.tsx` | Complete | Global state management & automatic `Authorization: Bearer <token>` fetch header interceptor |
| **App Routing & Guards** | `Frontend/src/App.tsx` | Complete | Role-gated route navigation (`superadmin`, `bi`, `atp`, `operator`, `jc`, `mtp`) |
| **Field Inspection Page** | `Frontend/src/pages/FieldInspectionPage.tsx` | Complete | Browser GPS capture, outcome branching (`no_violation`, `violation_found`, `complete_violated`), photo upload |
| **Construction Status Form**| `Frontend/src/pages/ConstructionStatusForm.tsx` | Complete | Dual lookup (`CASE-XXXX` / `CMP-XXXX`), dual-section tabs, receipt uploads, violator reply logging |
| **Enforcement Action Form** | `Frontend/src/pages/EnforcementActionForm.tsx` | Complete | 1400px wide layout, 5 outcome branches, statutory compliance period validation, edit pre-population |
| **Case Detail View** | `Frontend/src/pages/CaseDetailPage.tsx` | Complete | Statutory timeline, notices, replies, demolition records, action links |
| **Operational Dashboard** | `Frontend/src/features/dashboard/DashboardPage.tsx` | Complete | Live role-scoped KPIs, status bars, Needs Attention alerts, recent complaints |
| **Officers Performance** | `Frontend/src/features/officers/OfficersPage.tsx` | Complete | 4 KPI cards, 3-card Top Performers Podium, workload bars, detail drawer, ATP supervisory rollup |
