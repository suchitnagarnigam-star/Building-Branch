# Graph Report - building branch  (2026-10-09)

## Corpus Check
- 97 files · ~193,314 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: .css 4, (none) 2, .example 2)

## Summary
- 749 nodes · 1250 edges · 59 communities (57 shown, 2 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f0676a1c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Icon
- Frontend/package.json
- complaintApi.ts
- ComplaintsPage.tsx
- authRoutes.ts
- complaintRoutes.ts
- CaseDetailPage.tsx
- compilerOptions
- driveService.ts
- enforcementRoutes.ts
- App.tsx
- server/package.json
- compilerOptions
- ConstructionStatusForm.tsx
- dependencies
- EnforcementActionForm.tsx
- ocrService.ts
- app.ts
- devDependencies
- compilerOptions
- complaintStorage.ts
- package.json
- dotenv
- scripts
- MASTER.md
- Frontend/tsconfig.json
- MCL-BB
- 41.1 Primary API Endpoints
- AuthContext.tsx
- react
- 25. Data Architecture Direction
- Phases
- 34. Suggested 1–1.5 Week Prototype Timeline
- MobileNavDrawer.tsx
- 4. Core Design Principles
- Proposed Changes
- MCL-BB — Frontend Application
- 37. Open Decisions and Verification
- CasesPage.tsx
- workflowService.ts
- 39. Implementation Priorities
- 5. Users and Roles
- UsersPage.tsx
- 16. Construction Status & Three Enforcement Pathways
- 21. Analytics
- 8. Complaint Workflow
- ConfirmationScreen.tsx
- 10. ATP Review of Complaint
- 19. Status Ownership
- 27. Backend Principles
- 29. Prototype Scope
- 30. Prototype Demo Story
- 14. BI Field Inspection & Section 270 Notice Workflow
- 15. Violator Reply & ATP / BI Reply Review
- 17. Universal ATP Case Closure Protocol
- 32. Two-Developer Plan
- 6. System Scope
- 7. Core Workflows Overview

## God Nodes (most connected - your core abstractions)
1. `Icon()` - 45 edges
2. `App()` - 30 edges
3. `react` - 27 edges
4. `useAuth()` - 20 edges
5. `compilerOptions` - 19 edges
6. `compilerOptions` - 15 edges
7. `ComplaintFormPage()` - 13 edges
8. `pool` - 12 edges
9. `25. Data Architecture Direction` - 10 edges
10. `authenticateToken()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Frontend PWA Integration` --references--> `usePushNotifications()`  [INFERRED]
  docs/superpowers/plans/2026-10-06-pwa-push-notifications.md → Frontend/src/hooks/usePushNotifications.ts
- `2.2 Role-Based Data Access Control (`server/services/accessControl.ts`)` --references--> `getUserAssignedBlocks()`  [INFERRED]
  docs/context-handoff.md → server/services/accessControl.ts
- `Verification & Quality Gates` --references--> `notifyOfficer()`  [INFERRED]
  docs/superpowers/plans/2026-10-06-pwa-push-notifications.md → server/services/pushService.ts
- `3. Technology Stack & Configuration` --references--> `useCountUp()`  [INFERRED]
  docs/context-handoff.md → Frontend/src/shared/hooks/useCountUp.ts
- `MCL Building Branch (MCL-BB) — Context Handoff & Progress Report` --references--> `main()`  [INFERRED]
  docs/context-handoff.md → server/db/testConnection.ts

## Import Cycles
- None detected.

## Communities (59 total, 2 thin omitted)

### Community 0 - "Icon"
Cohesion: 0.15
Nodes (15): ExternalUploadSuccessScreen(), ExternalUploadSuccessScreenProps, ReviewScreen(), UploadScreen(), UploadScreenProps, MobileBottomNav(), MobileBottomNavProps, MobileHeader() (+7 more)

### Community 1 - "Frontend/package.json"
Cohesion: 0.05
Nodes (42): dependencies, react, react-dom, recharts, tailwindcss, @tailwindcss/vite, devDependencies, eslint (+34 more)

### Community 2 - "complaintApi.ts"
Cohesion: 0.06
Nodes (46): BlockZoneEntry, locationData, zoneForBlock(), FallbackOfficer, fallbackOfficers, ExtractedComplaintPage(), ExtractedComplaintPageProps, ComplaintFormPage() (+38 more)

### Community 3 - "ComplaintsPage.tsx"
Cohesion: 0.07
Nodes (35): 3. Technology Stack & Configuration, ComplaintDetailPage(), ComplaintDetailPageProps, DriveFile, getTimelineStage(), readLocalComplaint(), StoredAttachment, StoredComplaint (+27 more)

### Community 4 - "authRoutes.ts"
Cohesion: 0.18
Nodes (17): 2.1 Authentication & Security (JWT & RBAC), jsonwebtoken, authenticateToken(), Express, Request, requireRole(), router, ALLOWED_ROLES (+9 more)

### Community 5 - "complaintRoutes.ts"
Cohesion: 0.10
Nodes (11): @anthropic-ai/sdk, parentDirectory, storage, upload, uploadDirectory, anthropic, complaintSchema, extractComplaintFromOCR() (+3 more)

### Community 6 - "CaseDetailPage.tsx"
Cohesion: 0.05
Nodes (37): 1. Executive Summary, 2.2 Role-Based Data Access Control (`server/services/accessControl.ts`), 2.3 Statutory Case State Machine (`server/services/workflowService.ts`), 2.5 OCR Ingestion Pipeline with Local Tesseract Fallback (`server/services/ocrService.ts`), 2.6 Statutory Demolition & Enforcement Actions (`server/routes/enforcementRoutes.ts`), 2.7 Live Operations Analytics with ATP Supervisory Rollup (`server/routes/analyticsRoutes.ts`), 2.8 Frontend Architecture & User Experience (`Frontend/src/`), 2. Comprehensive Progress Breakdown: Implemented Features (+29 more)

### Community 7 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+12 more)

### Community 8 - "driveService.ts"
Cohesion: 0.14
Nodes (18): callDriveService(), createCaseDriveFolder(), createComplaintDriveFolder(), createInspectionDriveFolder(), DriveCreateFolderResponse, DriveFile, DriveFileType, DriveGetFileResponse (+10 more)

### Community 9 - "enforcementRoutes.ts"
Cohesion: 0.15
Nodes (14): bcrypt, multer, mapDesignationToRole(), OfficerRecord, seedUsers(), parentDirectory, router, storage (+6 more)

### Community 10 - "App.tsx"
Cohesion: 0.18
Nodes (19): App(), EMPTY_COMPLAINT, isRoutePermittedForRole(), useAuth(), LoginScreen(), ComplaintsPage(), NewComplaintScreen(), NewComplaintScreenProps (+11 more)

### Community 11 - "server/package.json"
Cohesion: 0.11
Nodes (18): tsx, @types/bcrypt, @types/cors, @types/express, @types/jsonwebtoken, @types/multer, @types/pdf-parse, @types/pg (+10 more)

### Community 12 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 13 - "ConstructionStatusForm.tsx"
Cohesion: 0.17
Nodes (15): ASSESSMENT_STATUS_OPTIONS, CaseRecord, ConstructionStatusForm(), ConstructionStatusFormProps, ConstructionStatusDropdown(), ConstructionStatusDropdownProps, PartlyCompoundableType, Breakpoints (+7 more)

### Community 14 - "dependencies"
Cohesion: 0.14
Nodes (14): dependencies, @anthropic-ai/sdk, bcrypt, cors, dotenv, express, jsonwebtoken, @mistralai/mistralai (+6 more)

### Community 15 - "EnforcementActionForm.tsx"
Cohesion: 0.17
Nodes (11): CaseData, DemolitionType, EnforcementActionFormProps, EnforcementOutcome, getWorkflowSteps(), NoticeRecord, VerificationStatus, VisitRecord (+3 more)

### Community 16 - "ocrService.ts"
Cohesion: 0.24
Nodes (11): @mistralai/mistralai, pdf-parse, tesseract.js, IMAGE_MIME_TYPES, OCRResult, pdfParse, processFileWithOCR(), processImageWithMistralOCR() (+3 more)

### Community 17 - "app.ts"
Cohesion: 0.18
Nodes (14): 2.4 PWA Web Push Notifications (`server/services/pushService.ts` & `Frontend/public/sw.js`), cors, express, web-push, app, pool, testDatabaseConnection(), main() (+6 more)

### Community 18 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, tsx, @types/bcrypt, @types/cors, @types/express, @types/jsonwebtoken, @types/multer, @types/node (+3 more)

### Community 19 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, esModuleInterop, module, outDir, rootDir, skipLibCheck, strict, target (+2 more)

### Community 20 - "complaintStorage.ts"
Cohesion: 0.36
Nodes (8): isBlockAssigned(), normalizeBlock(), generateComplaintId(), getComplaints(), getLocalComplaints(), LOCAL_STORAGE_FILE, saveComplaint(), saveLocalComplaint()

### Community 21 - "package.json"
Cohesion: 0.22
Nodes (8): description, name, private, scripts, dev:frontend, dev:full, dev:server, version

### Community 22 - "dotenv"
Cohesion: 0.28
Nodes (7): dotenv, appendComplaintToGoogleSheet(), getGoogleSheetsWebAppUrl(), AttachmentMeta, Complaint, ComplaintRequest, RegistrationSource

### Community 23 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, db:test, dev, migrate, seed:users, start

### Community 24 - "MASTER.md"
Cohesion: 0.09
Nodes (21): 11. Proactive BI Case Workflow, 12. Connecting Complaints and Cases, 13. Evidence and Geolocation, 18. Case Status / History & Audit Trail, 19. Automatic Flagging, 1. Project Overview, 20. Case Scoring, 22. Notifications (+13 more)

### Community 27 - "MCL-BB"
Cohesion: 0.10
Nodes (19): Administration, Analytics & Officer Operations, Authentication & Authorization, Authoritative Statutory Enforcement Workflow (`workflow.pdf`), Backend API, Complaint registration workflows, Complaints & Intake, External document registration (+11 more)

### Community 28 - "41.1 Primary API Endpoints"
Cohesion: 0.15
Nodes (13): 1. `POST /api/inspections`, 2. `POST /api/complaints/:complaintId/assign`, 3. `GET /api/cases`, 41.1 Primary API Endpoints, 41.2 Table-by-Table Database Population, 41. Operational API Endpoints & Inspection Data Flow, 4. `GET /api/cases/:caseId`, 5. `POST /api/cases/:caseId/construction-status` (+5 more)

### Community 29 - "AuthContext.tsx"
Cohesion: 0.18
Nodes (7): AuthContext, AuthContextValue, AuthProvider(), AuthUser, LoginScreenProps, savedFontScale, react-dom

### Community 30 - "react"
Cohesion: 0.27
Nodes (8): SettingsPage(), Topbar(), TopbarProps, applyFontScaleToDOM(), useFontScale(), getCurrentRoute(), useRouter(), react

### Community 31 - "25. Data Architecture Direction"
Cohesion: 0.20
Nodes (10): 25. Data Architecture Direction, case_complaints, case_flags, case_status_history, cases, complaints, field_visits, notices (+2 more)

### Community 32 - "Phases"
Cohesion: 0.22
Nodes (9): 31. Single-Developer Plan, Phase 1 — Stabilize, Phase 2 — Data Foundation, Phase 3 — Connected Workflow, Phase 4 — Analytics, Phase 5 — Demo Polish, Phases, Primary Developer (+1 more)

### Community 33 - "34. Suggested 1–1.5 Week Prototype Timeline"
Cohesion: 0.22
Nodes (9): 34. Suggested 1–1.5 Week Prototype Timeline, Buffer, Day 1, Day 2, Day 3, Day 4, Day 5, Day 6 (+1 more)

### Community 34 - "MobileNavDrawer.tsx"
Cohesion: 0.28
Nodes (7): isRouteAllowedForRole(), MobileNavDrawer(), MobileNavDrawerProps, isRouteAllowedForRole(), Sidebar(), SidebarProps, NAV_ITEMS

### Community 35 - "4. Core Design Principles"
Cohesion: 0.25
Nodes (8): 4. Core Design Principles, Analytics Should Use Real Data, BI Does Not Control Official Status, Complaints and Cases Are Different, Evidence Is Mandatory for BI Updates, Flags Are Separate From Status, Internal System First, Preserve History

### Community 36 - "Proposed Changes"
Cohesion: 0.25
Nodes (7): Backend Infrastructure & Migration, Frontend PWA Integration, Lifecycle Event Triggers Integration, Proposed Changes, PWA Push Notifications Implementation Plan, User Review Required, Verification & Quality Gates

### Community 37 - "MCL-BB — Frontend Application"
Cohesion: 0.25
Nodes (7): Application Routes, Architecture & Layout, Local Development, MCL-BB — Frontend Application, PWA & Web Push Architecture, Statutory Enforcement Workflow Alignment (`workflow.pdf`), Technology Stack

### Community 38 - "37. Open Decisions and Verification"
Cohesion: 0.29
Nodes (7): 37. Open Decisions and Verification, Existing Case Matching, Flag Threshold, Geotagging, Legal Verification, Role-Specific Analytics, Score Formula

### Community 39 - "CasesPage.tsx"
Cohesion: 0.57
Nodes (6): CaseRow, CasesPage(), CasesPageProps, isCaseActive(), isCasePending(), isCaseSolved()

### Community 40 - "workflowService.ts"
Cohesion: 0.33
Nodes (6): pg, CASE_TRANSITIONS, normalizeCaseStatus(), STATUS_DISPLAY_NAMES, validateCaseTransition(), ValidationResult

### Community 41 - "39. Implementation Priorities"
Cohesion: 0.33
Nodes (6): 39. Implementation Priorities, Priority 1 — Reality, Priority 2 — Connected Workflow, Priority 3 — Analytics, Priority 4 — Notice Workflow, Priority 5 — Notifications/PWA

### Community 42 - "5. Users and Roles"
Cohesion: 0.33
Nodes (6): 5. Users and Roles, ATP — Assistant Town Planner, BI — Building Inspector, JC, MTP, Super Admin

### Community 43 - "UsersPage.tsx"
Cohesion: 0.47
Nodes (5): getRoleLabel(), getRoleTone(), ManagedUser, ROLES, UsersPage()

### Community 44 - "16. Construction Status & Three Enforcement Pathways"
Cohesion: 0.40
Nodes (5): 16.1 Pathway 1: Compoundable, 16.2 Pathway 2: Partly Compoundable (Dual-Track Handling), 16.3 Pathway 3: Non-Compoundable (Serious Enforcement / Section 269), 16.4 Workflow Continuation, 16. Construction Status & Three Enforcement Pathways

### Community 45 - "21. Analytics"
Cohesion: 0.40
Nodes (5): 21. Analytics, Access Direction, ATP Context, BI Metrics, Higher Oversight

### Community 46 - "8. Complaint Workflow"
Cohesion: 0.40
Nodes (5): 8.1 Complaint Sources, 8.2 Intake Data, 8.3 Assignment, 8.4 Notifications, 8. Complaint Workflow

### Community 47 - "ConfirmationScreen.tsx"
Cohesion: 0.50
Nodes (4): ConfirmationScreen(), ConfirmationScreenProps, readSavedComplaint(), SavedComplaint

### Community 48 - "10. ATP Review of Complaint"
Cohesion: 0.50
Nodes (4): 10. ATP Review of Complaint, Close, Existing Case, New Actionable Violation

### Community 49 - "19. Status Ownership"
Cohesion: 0.50
Nodes (4): 19. Status Ownership, ATP, BI, MTP / JC / Super Admin

### Community 50 - "27. Backend Principles"
Cohesion: 0.50
Nodes (4): 27. Backend Principles, Preserve Existing Work, Server-Side Validation, Workflow Authority

### Community 51 - "29. Prototype Scope"
Cohesion: 0.50
Nodes (4): 29. Prototype Scope, P0 — Must Work, P1 — Strong Demo Value, P2 — Later

### Community 52 - "30. Prototype Demo Story"
Cohesion: 0.50
Nodes (4): 30. Prototype Demo Story, Story A — Complaint to Case, Story B — Proactive Case, Story C — Delayed Case

### Community 53 - "14. BI Field Inspection & Section 270 Notice Workflow"
Cohesion: 0.67
Nodes (3): 14.1 Inspection Outcome, 14.2 Statutory 3-Day Response Window, 14. BI Field Inspection & Section 270 Notice Workflow

### Community 54 - "15. Violator Reply & ATP / BI Reply Review"
Cohesion: 0.67
Nodes (3): 15.1 Storing the Reply, 15.2 Joint Supervisory Review, 15. Violator Reply & ATP / BI Reply Review

### Community 55 - "17. Universal ATP Case Closure Protocol"
Cohesion: 0.67
Nodes (3): 17.1 Universal Access Points, 17.2 Mandatory Closure Requirements, 17. Universal ATP Case Closure Protocol

### Community 56 - "32. Two-Developer Plan"
Cohesion: 0.67
Nodes (3): 32. Two-Developer Plan, Developer A — Backend/Data, Developer B — Frontend/UX

### Community 57 - "6. System Scope"
Cohesion: 0.67
Nodes (3): 6. System Scope, In Scope, Not Immediate Prototype Scope

### Community 58 - "7. Core Workflows Overview"
Cohesion: 0.67
Nodes (3): 7.1 Two Intake Streams, 7.2 The Statutory Enforcement Lifecycle (`workflow.pdf`), 7. Core Workflows Overview

## Knowledge Gaps
- **16 isolated node(s):** `tailwindcss`, `@types/node`, `@types/react`, `@types/react-dom`, `typescript` (+11 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 430 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `usePushNotifications()` connect `App.tsx` to `Proposed Changes`?**
  _High betweenness centrality (0.114) - this node is a cross-community bridge._
- **What connects `tailwindcss`, `@types/node`, `@types/react` to the rest of the system?**
  _16 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Icon` be split into smaller, more focused modules?**
  _Cohesion score 0.14761904761904762 - nodes in this community are weakly interconnected._
- **Why does `Frontend PWA Integration` connect `Proposed Changes` to `App.tsx`?**
  _High betweenness centrality (0.113) - this node is a cross-community bridge._
- **Should `Frontend/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.050241545893719805 - nodes in this community are weakly interconnected._
- **Should `complaintApi.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.061952861952861954 - nodes in this community are weakly interconnected._
- **Should `ComplaintsPage.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07053140096618357 - nodes in this community are weakly interconnected._