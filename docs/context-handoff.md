# MCL Building Branch (MCL-BB) — Context Handoff & Progress Report

**Date:** October 9, 2026  
**Repository:** MCL-BB (`MCL/building branch`)  
**Active Branch:** `uv-dev` (fully synced and merged with `origin/ad-dev` & `main`)  
**Target Milestone:** Full Statutory Enforcement Lifecycle Automation, Dynamic Role-Based Data Access Control (RBAC), Demolition Enforcement Tracking, AI-Powered Intake with Local OCR Fallback, Statutory Case State Machine, PWA Web Push Notifications, 365-Day Persistent Session, Officer Profile Portal, and Live Operations Analytics

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
11. **Persistent Authentication & Credentials Management**: JWT tokens configured with a 365-day lifetime (`JWT_EXPIRES_IN=365d`) eliminating daily forced sign-ins for field and administrative staff; added `POST /api/auth/change-pin` with bcrypt hashing and immediate token renewal.
12. **Internal Officer Profile Portal (`/profile`)**: Comprehensive Punjab Government civic interface featuring officer hero branding, administrative posting and jurisdiction details (Zone and Block tags), security PIN change, live push notification device checks, and device sign-out.

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

### 2.9 Persistent Authentication & Credentials Management
- **365-Day Session Lifetime**: Configured `JWT_EXPIRES_IN=365d` in `server/services/authService.ts` and `server/.env.example`. Eliminates daily logout prompts, keeping officers logged into the portal/PWA across device restarts and browser sessions.
- **Enriched Auth Payloads**: Updated `GET /api/auth/me` and `POST /api/auth/login` to return `username` and `phoneNumber`.
- **Change PIN API (`POST /api/auth/change-pin`)**:
  - Secure bcrypt verification of existing officer credentials.
  - Enforces minimum 4-digit PIN requirement.
  - Updates `users.password_hash` and timestamps, automatically generating and returning a refreshed 365-day token.
- **Frontend Token Refresh**: `AuthContext.tsx` implements `updateToken(newToken)` and `refreshUser()`, immediately synchronizing local storage and authentication context.

### 2.10 Internal Officer Profile Portal (`Frontend/src/pages/ProfilePage.tsx`)
- **Civic Design**: Adheres strictly to the Punjab Municipal Corporation aesthetic (`ProfilePage.css`) — high-contrast navy/slate theme, sharp geometry, and zero generic AI slop.
- **Officer Hero Card**: Displays initials avatar, officer full name, formal designation, official role badge, officer code (`OFF-xxx`), system ID (`#USR-xxx`), and active duty indicator.
- **Jurisdiction & Posting**: Surfaces assigned Zone and discrete Block tags (`Block 1`, `Block 2`), system username, and registered phone.
- **Security & PIN Card**: Dedicated form to change PIN with show/hide eye toggles, input validation, success/error feedback alerts, and a clear persistent session indicator.
- **Push Notification Status**: Inspects browser permission status (`Notification.permission`), explains field alert benefits, and provides a "Send Test Push Notification" trigger calling `POST /api/push/test`.
- **Sign Out Action**: Danger-card sign out trigger with an accidental-click prevention modal.
- **Cross-Platform Navigation**:
  - Desktop Topbar: Clicking `.topbar__profile-card` navigates directly to `/profile`.
  - Desktop Sidebar: Added "My Profile" button in sidebar footer.
  - Mobile Drawer & Header: Clicking user header card or drawer nav item navigates to `/profile`; mobile header avatar button also navigates directly to `/profile`.

### 2.11 Mobile Responsive Redesign & Upstream Sync
- **12 Mobile Screen Alignments**: Merged updates from `origin/ad-dev`, adapting all 12 operational screens for field smartphones.
- **Dynamic Dropdowns & Hooks**: Upgraded `ConstructionStatusDropdown.tsx` for touch devices and fixed React hook ordering in `CaseDetailPage.tsx`.
- **Responsive Navigation**: Bottom navigation bar and slide-over drawer enabled via `useBreakpoint`.

---

## 3. Technology Stack & Configuration

| Layer | Technology | Key Details |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Vanilla CSS | Custom CSS variables, responsive auto-fit grids, `useCountUp` hook, `Icon.tsx`, `/profile` portal |
| **Backend** | Node.js, Express 5, TypeScript (`tsx`) | Modular routers (`auth`, `user`, `analytics`, `complaint`, `enforcement`, `push`) |
| **Auth & Security** | JWT, bcrypt, AuthContext, RBAC | 365-day persistent JWT tokens, PIN change, Bearer fetch interceptor, role & block access control |
| **Database** | PostgreSQL (`pg`) | Neon cloud PostgreSQL pool with SSL; 19 statutory tables |
| **Notifications** | Web Push API, `web-push` | VAPID keypair, native Service Worker (`/sw.js`), 24-hr TTL, push test endpoint |
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
| **Push API Routes** | `server/routes/pushRoutes.ts` | Complete | VAPID public key retrieval, subscription upsert, endpoint unsubscription, and test alert trigger (`POST /api/push/test`) |
| **Auth Service & Routes** | `server/routes/authRoutes.ts` | Complete | 365-day token generation, PIN verification, `POST /api/auth/change-pin`, login/logout, profile context |
| **User Management** | `server/routes/userRoutes.ts` | Complete | `superadmin`-only user CRUD administration |
| **Complaint Storage** | `server/services/complaintStorage.ts` | Complete | Dual-layer persistence with SQL & JSON assigned block filtering |
| **Complaint & Case Routes**| `server/routes/complaintRoutes.ts` | Complete | Intake, OCR processing, inspection, construction status, case promotion, close case, review reply, block access guards, Section 270 push trigger |
| **Enforcement Routes** | `server/routes/enforcementRoutes.ts` | Complete | Demolition records, multi-outcome handling, Drive evidence uploads, block access guards |
| **Analytics Routes** | `server/routes/analyticsRoutes.ts` | Complete | Role-scoped overview analytics & officer performance leaderboard with ATP supervisory rollup |
| **Auth Context & Interceptor** | `Frontend/src/context/AuthContext.tsx` | Complete | Global auth state, 365-day token persistence, automatic `Authorization: Bearer <token>` fetch interceptor, `updateToken`, and `refreshUser` |
| **Officer Profile Portal** | `Frontend/src/pages/ProfilePage.tsx` | Complete | Officer credentials, jurisdiction tags, PIN change form with validation, push alert testing, and sign out confirmation modal |
| **App Routing & Guards** | `Frontend/src/App.tsx` | Complete | Role-gated route navigation (`superadmin`, `bi`, `atp`, `operator`, `jc`, `mtp`), push hook registration, Topbar & Drawer navigation |
| **Service Worker** | `Frontend/public/sw.js` | Complete | Native background push notifications, tag deduplication, tab focus on click |
| **Field Inspection Page** | `Frontend/src/pages/FieldInspectionPage.tsx` | Complete | Browser GPS capture, outcome branching, photo upload, locked BI identity |
| **Construction Status Form**| `Frontend/src/pages/ConstructionStatusForm.tsx` | Complete | Dual lookup (`CASE-XXXX` / `CMP-XXXX`), dual-section tabs, receipt uploads, violator reply logging |
| **Enforcement Action Form** | `Frontend/src/pages/EnforcementActionForm.tsx` | Complete | 1400px wide layout, 5 outcome branches, statutory compliance period validation, edit pre-population |
| **Case Detail View** | `Frontend/src/pages/CaseDetailPage.tsx` | Complete | Statutory timeline, notices, replies, demolition records, close case & review reply modals, hook ordering fixes |
| **Operational Dashboard** | `Frontend/src/features/dashboard/DashboardPage.tsx` | Complete | Live role-scoped KPIs, status bars, Needs Attention alerts, recent complaints |
| **Drive Proxy & Lightbox** | `server/routes/driveRoutes.ts`, `Frontend/src/shared/components/ImageViewerModal.tsx` | Complete | Universal Google Drive file streaming proxy (`/api/drive/files/:fileId`), disk caching (`server/uploads/drive_cache/`), and in-app image lightbox modal |
| **In-App Notification Center** | `server/routes/notificationRoutes.ts`, `Frontend/src/layout/Topbar.tsx`, `MobileHeader.tsx` | Complete | Dual-write push events to PostgreSQL `notifications`, notification feed API (`GET /api/notifications`), mark read, live unread polling |
| **PWA Web App Manifest** | `Frontend/public/manifest.webmanifest`, `Frontend/index.html` | Complete | Web manifest, home-screen icons (`icon-192.png`, `icon-512.png`), viewport & apple touch icon tags |
| **Migrations Runner** | `server/migrations/runMigrations.ts` | Complete | Automated runner for migrations 001–007 against PostgreSQL with secure user seeding |

---

## 6. Current Milestone Status & Next Steps

### 6.1 Completed in Latest Deliverables

1. **PWA Manifest & Installability**:
   - `Frontend/public/manifest.webmanifest` created with name, short name, start URL, standalone display, and theme colors.
   - PWA icons (`icon-192.png`, `icon-512.png`) and standard mobile viewport meta tags added in `Frontend/index.html`.
   - Enabled native "Add to Home Screen" on mobile devices with standalone window frame.

2. **In-App Notification Center (PWA Phase 2)**:
   - Migration `007_create_notifications_table.sql` applied to PostgreSQL.
   - Dual-write pattern in `server/services/pushService.ts` writes every push alert to `notifications` table.
   - Built `GET /api/notifications` and `PATCH /api/notifications/:id/read`.
   - Built notification bell drawer with unread counter in `Topbar.tsx` and live polling in `MobileHeader.tsx`.

3. **Universal Google Drive Image Access Proxy & Caching**:
   - Built `GET /api/drive/files/:fileId` with disk caching in `server/uploads/drive_cache/` (<10ms cache hits).
   - Strict record-association security guard (prevents arbitrary Google Drive file exfiltration).
   - Shared URL parser `driveUrl.ts` and in-app Lightbox modal `ImageViewerModal.tsx` with zoom, download, and keyboard navigation.

4. **Mobile UI & Responsive Header Polish**:
   - Styled `.mobile-subpage-header`, `.mobile-back-btn`, `.mobile-subpage-title`, and badges across mobile pages.
   - Resolved header text collision (`← BackConstruction Status`).
   - Hidden redundant 3-line desktop banner on mobile viewports.
   - Squeezed input row fixed with responsive wrapping and placeholder cleanup.

5. **Production Hardening & Upstream Merge**:
   - Enforced non-default `INITIAL_ADMIN_PASSWORD` and `INITIAL_OPERATOR_PASSWORD` in `NODE_ENV=production`.
   - Completely disabled synthetic fallback demo records (`CASE-9A2E3B1C`) in production; real 404/500 responses returned.
   - Merged upstream `origin/main` (`eaa25cf`) with API base URL normalization, global `Authorization: Bearer <token>` attachment, and dependency security updates.

### 6.2 Next Steps for Production / Staging Pilot

1. **Staging / VPS Deployment**:
   - Run `npm --prefix server run migrate` against the live production PostgreSQL instance.
   - Set host production secrets (`JWT_SECRET`, `DATABASE_URL`, `INITIAL_ADMIN_PASSWORD`, `INITIAL_OPERATOR_PASSWORD`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`).
2. **Field Pilot Verification**:
   - Test login, complaint intake, BI assignment, inspection evidence upload, notice generation, and enforcement recording end-to-end with pilot officers.

