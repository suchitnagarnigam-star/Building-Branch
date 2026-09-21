# MCL-BB — Comprehensive Codebase Analysis & Priority Roadmap

**Date:** 2026-09-19  
**Project:** Municipal Corporation Ludhiana Building Branch (MCL-BB)  
**Repository Path:** `/mnt/Data/1YUVRAJ/program/MCL/building branch`

---

## 1. Executive Summary

MCL-BB is an internal municipal operations and complaint management platform for the Building Branch of Municipal Corporation Ludhiana. The application supports dual-intake complaint registration (manual entry and external document OCR/AI processing), BI officer assignment, location mapping (Block to Zone), Google Drive file storage and retrieval, Google Sheets synchronization, and BI field inspection persistence (`POST /api/inspections`).

The codebase includes working complaint detail hydration from PostgreSQL, Google Drive attachment listing and retrieval, officer roster API (`GET /api/officers/roster`), live Dashboard data wiring with CSV report export, and connected BI field inspections supporting both complaint-driven visits and proactive field visits.

The primary focus items moving forward include:
1. Centralising API base URLs (`VITE_API_BASE_URL`) cleanly across all frontend pages.
2. Refining status transition enforcement (`Registered` → `Assigned` → `In Progress` → `Resolved` / `Closed`).
3. Dedicated BI complaint resolution update path (lightweight Mode A form + API).
4. Implementing operational database analytics & BI performance ranking.

---

## 2. Technology Stack & Architecture

```
┌────────────────────────────────────────────────────────┐
│                   Frontend (Client)                    │
│   React 19 · TypeScript · Vite · Hash Router · CSS     │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP REST (JSON / Multipart)
                           ▼
┌────────────────────────────────────────────────────────┐
│                   Backend (Server)                     │
│   Node.js · Express 5 · TypeScript (`tsx`) · Multer    │
└────────┬─────────────────┬──────────────────┬──────────┘
         │                 │                  │
         ▼                 ▼                  ▼
   PostgreSQL DB     Google Drive API   Google Sheets Sync
   (`pg` driver)   (Per-complaint)     (Web App Webhook)
         │                 │
         ▼                 ▼
   Mistral OCR     Anthropic Claude
   (Doc Extraction) (JSON Parsing)
```

### Core Architecture Components
- **Frontend (`Frontend/`)**: Built with React 19, TypeScript, and Vite. Uses a custom hash-based router (`useRouter.ts`) and CSS tokens for a municipal dark-blue UI theme.
- **Backend (`server/`)**: Express 5 app running on Node.js using `tsx`. Handles multipart uploads via `multer`.
- **Database**: PostgreSQL accessed using raw SQL client queries via `pg`, with SSL auto-fallback and local JSON storage fallback.
- **Storage**: Temporary local uploads in `server/uploads/`, permanent file storage organized in per-complaint folders on **Google Drive** (`driveService.ts`).
- **AI / OCR**: Mistral OCR (`ocrService.ts`) for document extraction and Anthropic Claude (`claudeService.ts`) for structured complaint JSON formatting.

---

## 3. Repository Structure Overview

```
building branch/
├── Frontend/
│   ├── src/
│   │   ├── App.tsx                          # Core router & app layout shell
│   │   ├── App.css                          # Main design system & component styles
│   │   ├── data/
│   │   │   └── locationData.ts              # Mapped Block → Zone dataset
│   │   ├── features/
│   │   │   ├── analytics/AnalyticsPage.tsx  # Analytics dashboard UI
│   │   │   ├── auth/LoginScreen.tsx         # Local authentication screen
│   │   │   ├── complaints/                  # Complaints list, detail, review screens
│   │   │   ├── dashboard/DashboardPage.tsx  # Dashboard overview panel
│   │   │   ├── officers/OfficersPage.tsx    # Officers list & roster UI
│   │   │   └── settings/SettingsPage.tsx    # App settings UI
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx                  # Left fixed navigation bar
│   │   │   └── Topbar.tsx                   # Top app header bar
│   │   ├── pages/
│   │   │   ├── ComplaintFormPage.tsx        # Shared complaint registration form
│   │   │   └── FieldInspectionPage.tsx      # BI field inspection report page
│   │   ├── services/
│   │   │   └── complaintApi.ts              # API client helper & session storage
│   │   └── shared/
│   │       ├── constants/mockData.ts        # Shared dataset fallback
│   │       └── types/index.ts               # Shared TypeScript interfaces
├── server/
│   ├── app.ts                               # Express server entry point
│   ├── routes/
│   │   └── complaintRoutes.ts               # API endpoints (/api/complaints, /api/inspections, /api/officers)
│   ├── services/
│   │   ├── claudeService.ts                 # Claude LLM extraction
│   │   ├── complaintStorage.ts              # PostgreSQL queries for complaints
│   │   ├── driveService.ts                  # Google Drive API folder & file upload
│   │   ├── googleSheetsService.ts           # Google Sheets sync webhook
│   │   ├── locationMapping.ts               # Server Block → Zone mapping
│   │   ├── ocrService.ts                    # Mistral OCR API handler
│   │   └── officerMapping.ts                # BI & ATP officer selection
│   └── data/
│       └── officers.json                    # Master officer roster dataset
```

---

## 4. Current Workflows & Functional State

### Path A: Manual Complaint Registration
1. Operator fills form on `ComplaintFormPage.tsx`.
2. Operator selects Block; Zone is automatically derived (`zoneForBlock`).
3. Operator attaches at least 1 evidence image.
4. Form dispatches `POST /api/complaints`.
5. Backend creates a Google Drive folder (`createComplaintDriveFolder`), uploads files (`uploadComplaintFiles`), saves metadata to PostgreSQL, appends to Google Sheets, and deletes temporary local files.
6. Complaint detail pages fetch saved metadata and Drive attachment list from the backend.

### Path B: External Document Processing (OCR + AI)
1. Operator uploads PDF/Images in "Register from External Source".
2. Frontend calls `POST /api/complaints/process-source` -> Mistral OCR runs on each page.
3. Frontend calls `POST /api/complaints/extract-source` -> Claude returns structured complaint fields.
4. Frontend redirects to `/complaints/new/extracted` prefilling `ComplaintFormPage.tsx` for operator verification before final registration.
5. After registration, the complaint detail view loads the saved record and any Drive attachments for review.

### Path C: BI Field Inspection & Violation Report
1. BI Officer accesses `/field-inspection`.
2. Selects source (Complaint vs Field Visit), selects reporting officer from `GET /api/officers/roster`.
3. Auto-maps Block, Zone, and Supervising ATP.
4. Captures device GPS coordinates (`navigator.geolocation`).
5. Captures photos, building type, violator details, and Section 270(1) PMC Act 1976 notice details.
6. **Current Status**: Backend handler `POST /api/inspections` is **fully implemented** in `server/routes/complaintRoutes.ts`. It handles multipart file uploads (`inspectionPhotos`, `noticePhoto`), creates cases (`CASE-XXXX`), saves evidence to `visit_evidence` table, records Section 270 notices in `notices` table, and uploads attachments to dedicated Google Drive inspection folders.

### Path D: Authoritative Statutory Enforcement Lifecycle (`workflow.pdf`)
1. **Field Inspection & Violation Check**: BI inspects property. If no violation, records inspection status; if violation found, issues Section 270 notice (`Status: 270 Issued`).
2. **3-Day Response Window**: Property owner given 3 days to submit response (`Store Reply + Reply Date + Evidence if provided`).
3. **ATP / BI Reply Review**: Joint review. If valid, case is closed; if invalid, case transitions to `Status of Construction`.
4. **Construction Status Triad**:
   - **Compoundable Track**: Assessment workflow (Pending vs Completed). Completed assessment requires Total Charges, Receipt Number, Receipt Date, Date of Assessment, and Photo of Receipt.
   - **Partly Compoundable Track**: Property divided into Compoundable Area (Assessment & Receipt) and Non-Compoundable Area (Section 269 Notice). System verifies `Both Areas Handled?` before advancing.
   - **Non-Compoundable Track**: Statutory Section 269 Notice issued with Notice Number, Date of Notice, and Photo of Notice.
5. **Universal ATP Case Closure Protocol**: ATP can close case at any milestone with mandatory `Closing Description REQUIRED` and optional `Evidence if Available`.
6. **Central Audit & History Log**: `Case Status / History` logs all transitions, notices, assessments, receipts, and closure records.

---

## 5. Detailed Audit of Problems & Status Updates

### Issue 1: Dynamic Data & Dashboard Wiring
- **Status**: **RESOLVED**. `DashboardPage.tsx` stat cards, Complaints by Zone bar chart, Case Status doughnut chart, Case Pipeline stage progression, and Recent Complaints table are dynamically wired to `GET /api/complaints` with fallback to shared mock dataset. CSV export added to Dashboard topbar.
- `ComplaintDetailPage.tsx` fetches real complaint data and Drive attachments via `GET /api/complaints/:complaintId`.

### Issue 2: Hardcoded API Endpoints
- Hardcoded URLs like `http://localhost:5000/api/complaints` exist in `complaintApi.ts`, `FieldInspectionPage.tsx`, and `OfficersPage.tsx`.
- **Status**: Open (P1 Task). Needs `VITE_API_BASE_URL` centralisation.

### Issue 3: Missing Field Inspection Backend Endpoint
- **Status**: **RESOLVED**. `POST /api/inspections` backend endpoint created in `server/routes/complaintRoutes.ts`.

### Issue 4: PostgreSQL & Cloud Credentials Handling
- **Status**: **PARTIALLY RESOLVED**. Implemented SSL connection handling and local JSON data fallback (`complaints.json`) for high availability.

### Issue 5: Statutory Workflow Lifecycle & State Machine (`workflow.pdf`)
- The status lifecycle must incorporate the legal stages from `workflow.pdf` (`NOTICE_270_ISSUED`, `VIOLATOR_REPLY_RECORDED`, `CONSTRUCTION_COMPOUNDABLE`, `ASSESSMENT_COMPLETED`, `NOTICE_269_ISSUED`, `CASE_CLOSED_BY_ATP`).
- **Status**: Planned (P1 Task).

---

## 6. Prioritized Actionable Roadmap

### 🟡 P1 (High Priority - Immediate Next Steps)

1. **Centralize API Configuration via Environment Variables**
   - Add `VITE_API_BASE_URL` in `Frontend/.env` (defaulting to `http://localhost:5000/api`).
   - Replace all hardcoded `http://localhost:5000` URLs across frontend code.

2. **Implement Statutory Workflow State Machine (`workflow.pdf`)**
   - Implement `server/workflow/state-machine/STATUS_TRANSITIONS.ts` with all statutory states.
   - Add `PATCH /api/complaints/:complaintId/status` and `POST /api/cases/:id/close` (with mandatory closing description).
   - Log transitions in `complaint_status_log` and render audit timeline on `ComplaintDetailPage.tsx`.

3. **Violator Reply & Review Endpoints (`Phase 4c`)**
   - `POST /api/cases/:caseId/reply`: Capture reply text, date, and supporting documents.
   - `POST /api/cases/:caseId/review-reply`: ATP/BI joint determination (Valid vs Violation Continues).

4. **Compounding Assessment & Section 269 Notice Endpoints (`Phase 4d`)**
   - `POST /api/cases/:caseId/assessment`: Total charges, receipt number/date, assessment date, receipt photo.
   - `POST /api/cases/:caseId/notice-269`: Notice number, date, photo of notice.
   - Concurrency gate for Partly Compoundable cases (`Both Areas Handled?`).

---

## 🔵 P2 (Medium Priority - Analytics & Inspection Ledger)

5. **Inspection Ledger UI (`InspectionLedgerPage.tsx`)**
   - Build UI for BIs and ATPs to browse recorded inspection visits fetched from `GET /api/inspections`.

6. **Operational Analytics Backend & UI**
   - Implement `server/services/analyticsService.ts` and routes (`/api/analytics/...`) to compute BI performance metrics and zone rankings from real database records.

---

## 7. Next Steps Checklist

- [x] Connect `DashboardPage.tsx` to `GET /api/complaints`
- [x] Connect `ComplaintDetailPage.tsx` to `GET /api/complaints/:id`
- [x] Create `POST /api/inspections` backend handler
- [x] Implement Dashboard CSV report export
- [x] Align docs and execution plans with latest `workflow.pdf`
- [x] Transactional Complaint-to-Case promotion endpoint (`POST /api/complaints/:id/assign`)
- [x] Dedicated Enforcement Cases list (`/cases`) and detailed view (`/cases/:caseId`)
- [x] Construction Status dual lookup (`-- Choose an Existing Case or enter Complaint ID --`) & backend resolution (`GET /api/cases/:caseId`)
- [x] Dynamic text & display scaling controls in header popover (`Topbar.tsx`) & settings (`SettingsPage.tsx`)
- [ ] Refactor API calls to use `VITE_API_BASE_URL`
- [ ] Implement `PATCH /api/complaints/:id/status` & statutory state machine
- [ ] Implement Violator Reply (`/api/cases/:id/reply`) and Review endpoints
- [ ] Implement Compounding Assessment & Section 269 endpoints
- [ ] Implement Universal ATP Case Close (`/api/cases/:id/close`)
- [ ] Build `InspectionLedgerPage.tsx`
- [ ] Build real operational analytics endpoints (`/api/analytics/bi/:id`, `/api/analytics/zone/:zone`)
