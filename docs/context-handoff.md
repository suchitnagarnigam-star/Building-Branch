# MCL Building Branch (MCL-BB) — Context Handoff & Progress Report

**Date:** October 6, 2026  
**Repository:** MCL-BB (`MCL/building branch`)  
**Active Branch:** `uv-dev` (fully synced and merged with `origin/ad-dev` & `main`)  
**Target Milestone:** Full Statutory Enforcement Lifecycle Automation, Dynamic Role-Based Data Access Control (RBAC), Demolition Enforcement Tracking, AI-Powered Intake with Local OCR Fallback, Statutory Case State Machine, PWA Web Push Notifications, and Live Operations Analytics

---

## 1. Executive Summary

The **MCL Building Branch (MCL-BB)** system automates the statutory building violation enforcement lifecycle for the Municipal Corporation of Ludhiana (MCL) under the Punjab Municipal Corporation (PMC) Act 1976.

The platform covers the entire statutory enforcement pipeline:
1. **Complaint Intake**: Manual citizen entry and AI-extracted OCR document review (Mistral OCR with local Tesseract fallback, processed via Anthropic Claude 3.5 Sonnet).
2. **Officer Mapping & Promotion**: Automatic block-to-zone resolution and roster mapping to Block Inspectors (BI) and Assistant Town Planners (ATP), with complaint-to-case promotion (`CASE-XXXXXXXXXXXX`).
3. **Field Inspections**: Device GPS geotagged evidence capture (`latitude`, `longitude`, `accuracy`), photo uploads, and outcome branching (`no_violation`, `violation_found` with Section 270 notice, `complete_violated` for completed structures).
4. **Statutory Construction Processing**: Dual-section handling (`compoundable` penalty assessment vs `non_compoundable` Section 269 notice issuance) with independent section states and receipt photo uploads.
5. **Violator Replies & Hearings**: Logging violator reply statements, dates, evidence attachments, and structured ATP review (`valid` -> case closure vs `invalid` -> demolition/Section 269 progression).
6. **Demolition & Statutory Enforcement**: End-to-end statutory demolition tracking (`EnforcementActionForm.tsx`), supporting 5 outcome paths (Violator Complied, Demolition by Violator, Demolition by MCL, Appeal / Court Stay, Further Action Required), 3-day minimum compliance period validation, Google Drive evidence storage, and cost recovery.
7. **Statutory Case State Machine & Governance (`workflowService.ts`)**: Enforces state transitions across complaint and case lifecycles (`pending` -> `assigned` -> `inspected` -> `case_promoted`; `open` -> `notice_issued_270` -> `notice_issued_269` -> `reply_received` -> `enforcement_recorded` -> `closed`), with governance rules preventing BIs from self-closing cases.
8. **PWA Web Push Notifications (`web-push`)**: Real-time push notifications dispatched to field inspectors and supervisors on key statutory triggers (complaint assigned, notice issued, reply evaluated, case closed) with native service worker support, tag deduplication, and automatic stale endpoint cleanup.
9. **Role-Based Data Access Control (RBAC & Block Filtering)**: Dynamic backend-enforced block restrictions ensuring BIs and ATPs only view complaints, cases, inspections, and analytics for their assigned blocks, while Superadmin, Admin, JC, MTP, and Desk Operators maintain unrestricted all-zone/all-block visibility.
10. **Live Operations Analytics & Roster Leaderboards**: Real-time PostgreSQL analytics overview with Needs Attention alerts, 4-card KPI summaries, Top Performers Podium (ranked by assigned cases, visits, and notices), workload progress bars, and ATP supervisory metric rollups.

---

## 2. Comprehensive Progress Breakdown: Implemented Features

### 2.1 Authentication & Security (JWT & RBAC)
- **Database Schema**: Created `users` and `officers` tables with bcrypt PIN hashing, designation mapping (`Operator`, `BI`, `ATP`, `MTP`, `JC`, `Superadmin`), and seed scripts.
- **Backend Auth & Middleware**:
  - Implemented `POST /api/auth/login` and `GET /api/auth/me` returning enriched profile context: `userId`, `officerId`, `role`, `name`, `zone`, `block`, `blocks`, and `designation`.
  - JWT tokens encode `JWTPayload` containing officer blocks and designation for zero-roundtrip client-side authorization.
  - `authenticateToken` and `requireRole(...)` middleware protecting mutating administrative and field routes.
- **Complaint Registration Tracking (`created_by`)**:
  - `POST /api/complaints`: Records `submitted_by_user_id = req.user.userId`.
  - `getComplaints()`: Joins `users` to provide `createdBy` / `created_by` `{ name: string, role: string }` on all complaints.
  - `ComplaintDetailPage.tsx`: Displays "Registered by: [name] ([role])" in the header sub-bar, the Citizen & Location card, and the Status sidebar card.
- **Frontend Auth Integration**:
  - `AuthContext.tsx`: Manages authentication state, token persistence in `localStorage`, background `/api/auth/me` synchronization, and an automatic Bearer token interceptor on all API calls.
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
  - `POST /api/cases/:caseId/close` & `POST /api/cases/:caseId/review-reply`.

### 2.3 Statutory Case State Machine (`server/services/workflowService.ts`)
- **Centralized Transition Engine**:
  - Validates statutory graph transitions across complaints and cases.
  - Pre-flight statutory checks: Section 269 notice required before demolition for non-compoundable violations; active court stays (`stay_granted = 'yes'`) strictly block demolition; compoundable-only violations require fee receipt confirmation before closure.
  - Governance protection: Assigned Building Inspectors are blocked from self-closing their own cases; closure requires supervisory roles (`ATP`, `MTP`, `JC`, `superadmin`).
- **Atomic Operations (`applyTransition`)**: Single transaction encapsulating status validation, status update, and immutable logging into `case_status_history`.

### 2.4 PWA Web Push Notifications (`server/services/pushService.ts` & `Frontend/public/sw.js`)
- **Backend Web Push**:
  - VAPID keypair configuration with `web-push`.
  - `push_subscriptions` PostgreSQL table storing `endpoint`, `p256dh`, `auth`, `user_agent`, and `officer_id` with multi-device per officer support.
  - Domain helpers `notifyOfficer` and `notifyOfficers` featuring 24-hr TTL, `Promise.allSettled` concurrency, and auto-pruning on HTTP 410/404 responses.
  - Four statutory event triggers: Complaint Assigned -> Assigned BI; Section 269 Issued -> Assigned ATP; Violator Reply Evaluated -> Assigned BI; Case Closed -> Both Assigned BI & ATP.
- **Frontend Service Worker & Hook**:
  - `public/sw.js` handles push payloads, notification tag deduplication, and tab-focus navigation.
  - `usePushNotifications.ts` hook manages permission requests and server subscription synchronization.

### 2.5 OCR Ingestion Pipeline with Local Tesseract Fallback (`server/services/ocrService.ts`)
- **Dual-Engine Architecture**:
  - **Primary**: Mistral OCR API for high-accuracy cloud-based document transcription of images and PDF files.
  - **Image Fallback**: Local `tesseract.js` OCR engine executes when the Mistral API is unavailable, unconfigured, or encounters network errors.
  - **PDF Fallback**: Local `pdf-parse` text extractor extracts textual content directly from PDF documents without external API dependencies.
- **Structured Extraction Pipeline**: `POST /api/complaints/process-source` and `POST /api/complaints/extract-source` feed OCR output into Claude 3.5 Sonnet to extract citizen details, address, building type, and violation descriptions into pre-filled editable complaint drafts.

### 2.6 Statutory Demolition & Enforcement Actions (`server/routes/enforcementRoutes.ts`)
- **`GET /api/cases/:caseId/enforcement`**: Retrieves recorded demolition details, cost recovery data, appeal/stay information, and uploaded evidence files with block-level RBAC verification.
- **`POST /api/cases/:caseId/enforcement`**: Records execution of statutory enforcement:
  - Supports 5 statutory outcome categories: Violator Complied, Demolition by Violator, Demolition by MCL, Appeal/Stay, and Further Action Required.
  - Records execution dates, portions demolished, remaining violation descriptions, cost recovery parameters (demolition cost, recovery amount, reference number), and court stay/appeal orders.
  - Uploads evidence photos to Google Drive (with local storage staging and fallback) and records metadata in `demolition_evidence`.
  - Automatically updates `cases.current_status` and logs audit events in `case_status_history`.

### 2.7 Live Operations Analytics with ATP Supervisory Rollup (`server/routes/analyticsRoutes.ts`)
- **`GET /api/analytics/overview`**: Direct PostgreSQL aggregations for KPI summary, complaint statuses, zone breakdowns, enforcement activity counts, and 4 statutory Needs Attention alerts.
- **`GET /api/analytics/officers` (Supervisory Rollup)**:
  - For Building Inspectors (`BI`), calculates individual direct counts of field visits, notices issued, and cases assigned.
  - For Assistant Town Planners (`ATP`), rolls up the total enforcement activity of all Building Inspectors in their supervised Zone (`JOIN officers bi ON bi.officer_id = ... WHERE bi.zone = o.zone`), reflecting total supervisory output instead of zero counts.
  - BI officers can access the Officers page with the leaderboard podium filtered to BIs only.

### 2.8 Frontend Architecture & User Experience (`Frontend/src/`)
- **Centralized API Configuration**: `Frontend/src/shared/utils/apiConfig.ts` exports `API_BASE_URL` backed by `VITE_API_BASE_URL`.
- **Field Inspection Fallback & Permissions (`FieldInspectionPage.tsx`, `officersData.ts`)**:
  - `officersData.ts`: 12-officer static fallback roster prevents empty dropdowns during network interruptions.
  - BI users: Identity is pre-filled and locked to prevent unauthorized filing under another officer's name.
  - Non-BI roles: Reporting Officer and Block remain fully selectable.
  - Field inspection label: "Violator / Owner Name" supported across form details.
- **Demolition & Enforcement Action Form (`EnforcementActionForm.tsx`)**:
  - 1400px wide layout with 5 outcome branches, 3-day statutory compliance period gate, edit pre-fill, and Google Drive thumbnail previews.
- **Case Detail Page Upgrades (`CaseDetailPage.tsx`)**:
  - Statutory timeline, notices, replies, demolition records, action links.
  - Integrated "Close Case" and "Review Violator Reply" modals calling statutory backend endpoints.
- **Operational Dashboard (`DashboardPage.tsx`)**:
  - Live role-scoped KPIs, status bars, Needs Attention alerts, branch-wide metrics for BI with scoped recent complaints table.
- **Officers Performance (`OfficersPage.tsx`)**:
  - 4 KPI cards, 3-card Top Performers Podium, workload bars, detail drawer, ATP supervisory rollup.

---

## 3. Technology Stack & Configuration

| Layer | Technology | Key Details |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Vanilla CSS | Custom CSS variables, responsive auto-fit grids, `useCountUp` hook, `Icon.tsx` |
| **Backend** | Node.js, Express 5, TypeScript (`tsx`) | Modular routers (`auth`, `user`, `analytics`, `complaint`, `enforcement`, `push`) |
| **Auth & Security** | JWT, bcrypt, AuthContext, RBAC | 24h JWT tokens, Bearer fetch interceptor, role & block access control |
| **Database** | PostgreSQL (`pg`) | Neon cloud PostgreSQL pool with SSL; 19 statutory tables |
| **Notifications** | Web Push API, `web-push` | VAPID keypair, native Service Worker (`/sw.js`), 24-hr TTL |
| **File Storage** | Google Drive API, Multer | Staged in `server/uploads/`, uploaded to per-complaint/per-case Drive folders |
| **Integrations** | Google Sheets API | Real-time complaint registration sync |
| **OCR Engine** | Mistral OCR API + Tesseract.js | Mistral primary OCR with local Tesseract fallback (`eng`, `hin` trained data) |
| **AI Extraction** | Anthropic Claude 3.5 Sonnet | Structured JSON complaint extraction from raw document OCR text |

---

## 4. Verification & Build Commands

```bash
# 1. Server Build Verification
cd server
npm run build

# 2. Frontend Build Verification
cd ../Frontend
npm run build

# 3. Dev Server Launch
# Terminal 1 (Frontend - http://localhost:5173):
cd Frontend
npm run dev

# Terminal 2 (Backend - http://localhost:5000):
cd server
npm run dev
```

---

## 5. Summary Matrix of Core System Components

| Component | File Path | Current Status | Key Responsibilities |
| :--- | :--- | :--- | :--- |
| **Access Control Service** | `server/services/accessControl.ts` | Complete | Block normalization, block assignment verification, and user assigned blocks resolution |
| **Workflow State Machine** | `server/services/workflowService.ts` | Complete | Statutory case state transition validation, pre-flight prerequisite gates, and atomic audit logging |
| **Push Notification Service** | `server/services/pushService.ts` | Complete | Web Push delivery via VAPID, multi-device per officer, 24-hr TTL, and auto-pruning expired endpoints |
| **Push API Routes** | `server/routes/pushRoutes.ts` | Complete | VAPID public key retrieval, subscription upsert, and endpoint unsubscription |
| **Auth Service & Routes** | `server/routes/authRoutes.ts` | Complete | PIN verification, JWT token generation with `blocks` payload, login/logout |
| **User Management** | `server/routes/userRoutes.ts` | Complete | `superadmin`-only user CRUD administration |
| **Complaint Storage** | `server/services/complaintStorage.ts` | Complete | Dual-layer persistence with SQL & JSON assigned block filtering |
| **Complaint & Case Routes**| `server/routes/complaintRoutes.ts` | Complete | Intake, OCR processing, inspection, construction status, case promotion, close case, review reply, block access guards |
| **Enforcement Routes** | `server/routes/enforcementRoutes.ts` | Complete | Demolition records, multi-outcome handling, Drive evidence uploads, block access guards |
| **Analytics Routes** | `server/routes/analyticsRoutes.ts` | Complete | Role-scoped overview analytics & officer performance leaderboard with ATP supervisory rollup |
| **Auth Context & Interceptor** | `Frontend/src/context/AuthContext.tsx` | Complete | Global state management & automatic `Authorization: Bearer <token>` fetch header interceptor |
| **App Routing & Guards** | `Frontend/src/App.tsx` | Complete | Role-gated route navigation (`superadmin`, `bi`, `atp`, `operator`, `jc`, `mtp`), push hook registration |
| **Service Worker** | `Frontend/public/sw.js` | Complete | Native background push notifications, tag deduplication, tab focus on click |
| **Field Inspection Page** | `Frontend/src/pages/FieldInspectionPage.tsx` | Complete | Browser GPS capture, outcome branching, photo upload, locked BI identity |
| **Construction Status Form**| `Frontend/src/pages/ConstructionStatusForm.tsx` | Complete | Dual lookup (`CASE-XXXX` / `CMP-XXXX`), dual-section tabs, receipt uploads, violator reply logging |
| **Enforcement Action Form** | `Frontend/src/pages/EnforcementActionForm.tsx` | Complete | 1400px wide layout, 5 outcome branches, statutory compliance period validation, edit pre-population |
| **Case Detail View** | `Frontend/src/pages/CaseDetailPage.tsx` | Complete | Statutory timeline, notices, replies, demolition records, close case & review reply modals |
| **Operational Dashboard** | `Frontend/src/features/dashboard/DashboardPage.tsx` | Complete | Live role-scoped KPIs, status bars, Needs Attention alerts, recent complaints |
| **Officers Performance** | `Frontend/src/features/officers/OfficersPage.tsx` | Complete | 4 KPI cards, 3-card Top Performers Podium, workload bars, detail drawer, ATP supervisory rollup |

---

## 6. Prioritized Roadmap & Next Session Execution Order

### 6.1 Honest Priority Stack

1. **Do Immediately (Closes Open Loose Ends)**:
   - **Section 270 Notification Trigger**: Wire push dispatch in `POST /api/inspections` when `violation_found` / Section 270 notice is recorded to notify the supervising ATP (`case-${caseId}-notice-270`).
   - **Browser Push Delivery Test**: Test live push receipt on mobile device via Chrome/Safari.
   - **Frontend `.env.example`**: Create `Frontend/.env.example` documenting `VITE_API_BASE_URL` and environment defaults.

2. **Next Meaningful Feature: PWA Manifest + Installability**:
   - Enables native **"Add to Home Screen"** on mobile for field inspectors (opens fullscreen without browser chrome, shows app icon on home screen, loads faster, reliable push delivery).
   - Create `Frontend/public/manifest.webmanifest`.
   - Add mobile viewport & PWA meta tags in `Frontend/index.html` (`<link rel="manifest">`, `<meta name="theme-color">`, `<meta name="mobile-web-app-capable">`, `<meta name="apple-mobile-web-app-capable">`).
   - Place standard icons (`icon-192.png`, `icon-512.png`, maskable) in `Frontend/public/`.
   - **Target Commit**: `"PWA installability : added web manifest, mobile viewport tags, and home screen app icons"`

3. **Following Feature: In-App Notification Bell & Center (PWA Phase 2)**:
   - Verify PostgreSQL `notifications` table schema; add migration `007_` if any columns (`officer_id`, `title`, `body`, `read`, `created_at`, `case_id`) are missing.
   - **Dual-Delivery Pattern**: When `pushService.ts` fires a push notification, simultaneously insert a record into the `notifications` table so officers who miss or dismiss browser pushes can still review them in-app.
   - API endpoints: `GET /api/notifications` (last 20, unread first) and `PATCH /api/notifications/:id/read`.
   - Frontend UI: Notification bell icon with unread count badge and slide-out dropdown/drawer in `Frontend/src/layout/Topbar.tsx`.
   - **Target Commit**: `"In-app notification center : implemented notifications API, pushService dual-write, and Topbar notification bell drawer"`

4. **Deferred to Post-MVP Scope (Non-Blocking)**:
   - **SLA Delayed Case Flagging & Case Score**: Requires background cron/worker infrastructure.
   - **Statutory Notice PDF Templates**: Physical print generation for Section 270/269 notices.
   - **Offline Draft Storage & Background Sync**: Complex IndexedDB client-side synchronization for zero-connectivity field inspections.

### 6.2 Next Session Execution Sequence
```
1. Wire Section 270 notification trigger in complaintRoutes.ts (10 min)
2. Verify browser push delivery test on device (20 min)
3. Create Frontend/.env.example (5 min)
4. Add manifest.webmanifest + PWA icons + index.html tags (30 min)
   ─── COMMIT: "PWA installability" ───
5. Inspect notifications table schema in PostgreSQL (5 min)
6. Add dual-write insertion into notifications table in pushService.ts (15 min)
7. Build GET /api/notifications + PATCH /api/notifications/:id/read endpoints (20 min)
8. Build notification bell dropdown in Topbar.tsx (30 min)
   ─── COMMIT: "In-app notification center" ───
```

