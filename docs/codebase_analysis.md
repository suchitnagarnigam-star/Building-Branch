# MCL-BB — Comprehensive Codebase Analysis & Priority Roadmap

**Date:** 2026-09-11  
**Project:** Municipal Corporation Ludhiana Building Branch (MCL-BB)  
**Repository Path:** `/mnt/Data/1YUVRAJ/program/MCL/building branch`

---

## 1. Executive Summary

MCL-BB is an internal municipal operations and complaint management platform for the Building Branch of Municipal Corporation Ludhiana. The application supports dual-intake complaint registration (manual entry and external document OCR/AI processing), BI officer assignment, location mapping (Block to Zone), Google Drive file storage, Google Sheets synchronization, and BI field inspection reporting.

While the foundation is well-structured with React 19, Vite, Express, PostgreSQL, Google Drive API, and AI integrations, **several critical gaps exist**:
1. Extensive reliance on static dummy data (`mockData.ts`) across key frontend screens (`DashboardPage`, `ComplaintDetailPage`, `App.tsx`).
2. Disconnected frontend and backend workflows (e.g. `FieldInspectionPage.tsx` lacks a corresponding backend submit API).
3. Hardcoded API URLs (`http://localhost:5000`) scattered across multiple source files.
4. Absence of workflow state transition APIs (changing complaint status from `Registered` to `Assigned`, `In Progress`, `Resolved`, or `Closed`).

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
- **Database**: PostgreSQL accessed using raw SQL client queries via `pg`.
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
│   │       ├── constants/mockData.ts        # STATIC DUMMY DATA FILE
│   │       └── types/index.ts               # Shared TypeScript interfaces
├── server/
│   ├── app.ts                               # Express server entry point
│   ├── routes/
│   │   └── complaintRoutes.ts               # API endpoints (/api/complaints, /api/officers)
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

### Path B: External Document Processing (OCR + AI)
1. Operator uploads PDF/Images in "Register from External Source".
2. Frontend calls `POST /api/complaints/process-source` -> Mistral OCR runs on each page.
3. Frontend calls `POST /api/complaints/extract-source` -> Claude returns structured complaint fields.
4. Frontend redirects to `/complaints/new/extracted` prefilling `ComplaintFormPage.tsx` for operator verification before final registration.

### Path C: BI Field Inspection & Violation Report
1. BI Officer accesses `/field-inspection`.
2. Selects source (Complaint vs Field Visit), selects reporting officer from `GET /api/officers/roster`.
3. Auto-maps Block, Zone, and Supervising ATP.
4. Captures device GPS coordinates (`navigator.geolocation`).
5. Captures photos, building type, violator details, and Section 270(1) PMC Act 1976 notice details.
6. **Current Status**: Form UI is fully rendered, but `submitInspection` only executes `event.preventDefault()`. No backend submission endpoint exists.

---

## 5. Detailed Audit of Problems & Vulnerabilities

### Issue 1: Dummy Data & Mock Data Dependencies
- **`mockData.ts` Leakage**:
  - `DashboardPage.tsx` imports static stat cards (`1,284` total complaints, `312` open complaints) and renders static `complaints.slice(0, 5)`.
  - `ComplaintDetailPage.tsx` searches for complaints inside `mockData.ts` instead of calling `GET /api/complaints/:complaintId`.
  - `App.tsx` sets default user to `"Arjun Mehta"` and default selected complaint to `"MCL-BB-0042"`.
- **Impact**: Newly registered complaints saved in PostgreSQL/Google Drive never appear on the Dashboard or Complaint Detail view.

### Issue 2: Hardcoded API Endpoints
- Hardcoded URLs like `http://localhost:5000/api/complaints` and `http://localhost:5000/api/officers/roster` are hardcoded across `complaintApi.ts`, `FieldInspectionPage.tsx`, and `OfficersPage.tsx`.
- **Impact**: Breaks deployment when hosting on custom domains, proxies, or alternate ports.

### Issue 3: Missing Field Inspection Backend Endpoint
- `FieldInspectionPage.tsx` collects extensive inspection data (GPS, violator info, photos, notice number/date), but has **no API call** to save inspection records in the backend.

### Issue 4: PostgreSQL & Cloud Credentials Hard Dependency
- `POST /api/complaints` will throw an unhandled `500 Internal Server Error` if:
  - PostgreSQL is offline or credentials in `.env` are invalid.
  - Google Drive Service Account key is missing or not configured.

### Issue 5: Missing Workflow Lifecycle Actions
- The status lifecycle (`Registered` → `Assigned` → `In Progress` → `Resolution Submitted` → `Pending Approval` → `Approved / Closed`) has UI buttons in `ComplaintDetailPage.tsx`, but no corresponding backend routes exist to update complaint status in the database.

---

## 6. Prioritized Actionable Roadmap

### 🔴 P0 (Critical - Immediate Fixes Required)

1. **Wire `DashboardPage.tsx` to Real Backend API**
   - Replace static stat counts and recent complaints table with dynamic fetch from `GET /api/complaints`.

2. **Wire `ComplaintDetailPage.tsx` to `GET /api/complaints/:complaintId`**
   - Fetch real complaint data, attachments, and Google Drive folder link dynamically from the backend.

3. **Implement Field Inspection Backend API (`POST /api/inspections`)**
   - Add database table/schema and backend endpoint to store field inspection reports, GPS coordinates, and notice details.
   - Connect `FieldInspectionPage.tsx` form submit handler to this endpoint.

---

### 🟡 P1 (High Priority - System Health & Environment)

4. **Centralize API Configuration via Environment Variables**
   - Add `VITE_API_BASE_URL` in `Frontend/.env` (defaulting to `/api` or `http://localhost:5000/api`).
   - Replace all hardcoded `http://localhost:5000` URLs across frontend code.

5. **Graceful Database & Cloud Storage Fallback**
   - Add clear error handling in backend routes if PostgreSQL or Google Drive service is unreachable, returning meaningful client error messages instead of generic 500 server crashes.

---

### 🔵 P2 (Medium Priority - Feature Completion)

6. **Implement Status Transition APIs**
   - Add `PATCH /api/complaints/:complaintId/status` to handle status changes (`Assigned`, `In Progress`, `Resolved`, `Closed`).
   - Enable officer assignment reassignment and approval/rejection actions from `ComplaintDetailPage.tsx`.

7. **Export Functionality**
   - Implement CSV/Excel export endpoint for complaints and field inspection records.

---

## 7. Next Steps Checklist

- [ ] Connect `DashboardPage.tsx` to `GET /api/complaints`
- [ ] Connect `ComplaintDetailPage.tsx` to `GET /api/complaints/:id`
- [ ] Create `POST /api/inspections` backend handler & update `FieldInspectionPage.tsx`
- [ ] Refactor API calls to use `VITE_API_BASE_URL`
- [ ] Create database migration / table schema documentation for PostgreSQL
