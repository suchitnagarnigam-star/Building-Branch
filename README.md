# MCL-BB

MCL-BB is an internal complaint-management application for the Municipal Corporation of Ludhiana Building Branch.

## Stack

- Frontend: React 19, TypeScript, Vite, custom CSS
- Backend: Node.js, Express 5, TypeScript
- Authentication & RBAC: JWT (JSON Web Tokens) with 365-day persistent login sessions, bcrypt PIN/password hashing, AuthContext with global fetch interceptor, and block-level access control (`server/services/accessControl.ts`)
- Database: PostgreSQL through `pg` (with Neon cloud pooling)
- Development runtime: `tsx`
- File storage: Google Drive API (per-complaint folders, case demolition evidence, & file uploads; temporary staging in `server/uploads/`)
- Integrations: Google Sheets sync, Google Drive service
- OCR: Dual-engine pipeline — Mistral OCR (primary) with local `tesseract.js` (images) and `pdf-parse` (PDFs) fallbacks
- Complaint extraction: Anthropic Claude structured JSON output

## Run locally

From the repository root, use two terminals:

```powershell
cd Frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`.

```powershell
cd server
npm install
npm run dev
```

The backend runs at `http://localhost:5000`.

## Authoritative Statutory Enforcement Workflow (`workflow.pdf`)

For full product specifications, legal citations, and architecture, see [`docs/MASTER.md`](file:///mnt/Data/1YUVRAJ/program/MCL/building%20branch/docs/MASTER.md) and [`docs/context-handoff.md`](file:///mnt/Data/1YUVRAJ/program/MCL/building%20branch/docs/context-handoff.md).

```mermaid
flowchart TD
    %% Intake & Field Inspection
    CC["Complaint / Case"] --> BI["BI Field Inspection"]
    BI --> VF{"Violation Found?"}
    VF -- "No" --> CR["Continue / Record Inspection Status"]
    VF -- "Yes" --> I270["Issue 270 Notice"]
    I270 --> S270["Status: 270 Issued"]
    D3["3 Days Given to Violator"] --> VR["Violator Reply"]
    S270 --> D3

    %% Reply & Review
    VR --> SR["Store Reply + Reply Date + Evidence if provided"]
    SR --> RR{"ATP / BI Reviews Reply"}

    RR -- "Reply Valid / Case Resolved" --> CC_Resolved["Close Case"]
    RR -- "Reply Not Valid / Violation Continues" --> SC_Box["Status of Construction"]
    SC_Box --> SC_Decision{"Status of Construction"}

    %% Path 1: Compoundable
    SC_Decision -- "Compoundable" --> Comp_Box["Compoundable"]
    Comp_Box --> SA1["Status of Assessment"]
    SA1 --> AS1{"Assessment Status"}
    AS1 -- "Pending" --> AP1["Assessment Pending"]
    AS1 -- "Yes" --> AC1["Assessment Completed"]
    AC1 --> TC1["Total Charges"]
    TC1 --> RN1["Receipt Number"]
    RN1 --> RD1["Receipt Date"]
    RD1 --> DA1["Date of Assessment"]
    DA1 --> PR1["Photo of Receipt"]
    PR1 --> UCS["Update Case Status"]

    %% Path 2: Partly Compoundable
    SC_Decision -- "Partly Compoundable" --> PComp_Box["Partly Compoundable"]
    PComp_Box --> TAP["Two Areas / Portions"]
    TAP --> CA["Compoundable Area"]
    TAP --> NCA["Non-Compoundable Area"]

    CA --> SA2["Status of Assessment"]
    SA2 --> AS2{"Assessment Status"}
    AS2 -- "Pending" --> AP2["Assessment Pending"]
    AS2 -- "Yes" --> AC2["Assessment Completed"]
    AC2 --> TC2["Total Charges"]
    TC2 --> RN2["Receipt Number"]
    RN2 --> RD2["Receipt Date"]
    RD2 --> DA2["Date of Assessment"]
    DA2 --> PR2["Photo of Receipt"]
    PR2 --> BAH{"Both Areas Handled?"}

    NCA --> I269_P["Issue 269 Notice"]
    I269_P --> NN_P["Notice Number"]
    NN_P --> DN_P["Date of Notice"]
    DN_P --> PN_P["Photo of Notice"]
    PN_P --> BAH

    BAH -- "Yes" --> UCS

    %% Path 3: Non-Compoundable
    SC_Decision -- "Non-Compoundable" --> NC_Box["Non-Compoundable"]
    NC_Box --> I269["Issue 269 Notice"]
    I269 --> NN["Notice Number"]
    NN --> DN["Date of Notice"]
    DN --> PN["Photo of Notice"]
    PN --> UCS

    %% Lifecycle Continuation
    UCS --> UCCS["Update Current Case Status"]
    UCCS --> CCW["Continue Case Workflow"]

    %% Universal ATP Close Case
    ATP_Close["ATP Close Case"]
    ATP_Close --> CDR["Closing Description REQUIRED"]
    CDR --> EA["Evidence if Available"]
    EA --> Closed["Case Closed"]
    Closed --> Log[("Case Status / History")]

    %% Triggers to ATP Close Case
    CC -.-> ATP_Close
    BI -.-> ATP_Close
    I270 -.-> ATP_Close
    VR -.-> ATP_Close
    RR -.-> ATP_Close
    SC_Decision -.-> ATP_Close

    %% Audit Log connections
    CC -.-> Log
    BI -.-> Log
    I270 -.-> Log
    VR -.-> Log
    Comp_Box -.-> Log
    PComp_Box -.-> Log
    NC_Box -.-> Log
    UCS -.-> Log
```

### Key Workflow Highlights
1. **Section 270 Notice & 3-Day Window**: If a violation is discovered during inspection, a Section 270 notice is recorded (`Status: 270 Issued`), initiating a statutory 3-day window for the violator to respond.
2. **Violator Response & Joint Review**: Reply statement, receipt timestamp, and optional evidence documents are stored and jointly reviewed by the ATP and BI. Valid replies immediately resolve and close the case; invalid replies proceed to construction status evaluation.
3. **Construction Classification Triad**:
   - **Compoundable**: Assessment workflow (Pending vs Completed). Completed assessment requires Total Charges, Receipt Number, Receipt Date, Date of Assessment, and Photo of Receipt.
   - **Partly Compoundable**: Divided into Two Areas (Compoundable Area Assessment & Receipt; Non-Compoundable Area Section 269 Notice). The system enforces a strict concurrency gate (`Both Areas Handled?`) before proceeding.
   - **Non-Compoundable**: Statutory Section 269 Notice issuance with Notice Number, Date of Notice, and Photo of Notice.
4. **Universal ATP Case Closure Protocol**: An authorized ATP officer may close a case from any milestone. Closure strictly requires a mandatory `Closing Description REQUIRED` and optional `Evidence if Available`.
5. **Central Audit Trail**: Every event, notice, payment receipt, and closure is recorded in `Case Status / History`.

## Complaint registration workflows

### Manual registration

1. Open **New complaint**.
2. Enter citizen, location, and complaint details.
3. Select a Block (Zone is automatically derived from the selected Block), then upload at least one JPG/PNG complaint image.
4. Submit the complaint.
5. The backend validates the fields, derives Zone from Block, maps the responsible BI and ATP, creates a Google Drive folder for the complaint, uploads the evidence files, stores complaint & attachment metadata in PostgreSQL, and opens the confirmation page.

### External document registration

1. In **Register from External Source**, select News, Email, or Other.
2. Upload one or more JPG, PNG, or PDF files.
3. Click **Process Document**.
4. The backend saves the upload, runs OCR, combines the OCR text, and sends it to Claude for structured complaint extraction.
5. The app navigates to a separate review page using the same form layout as manual registration.
6. The extracted fields are prefilled and remain editable.
7. **Submit Complaint** uses the same multipart submission endpoint as manual registration, uploads the original source files to Google Drive, and records `registrationSource` as `document`.

Processing endpoints:

- `POST /api/complaints/process-source`
- `POST /api/complaints/extract-source`
- `POST /api/complaints`

## Main routes

- `/login`
- `/dashboard`
- `/complaints/new`
- `/complaints/new/extracted`
- `/complaints/confirm/:complaintId`
- `/complaints/:complaintId`
- `/complaints`
- `/complaints/mine`
- `/complaints/pending`
- `/cases`
- `/cases/:caseId`
- `/cases/:caseId/construction-status`
- `/cases/:caseId/enforcement`
- `/construction-status`
- `/field-inspection`
- `/officers`
- `/users`
- `/settings`
- `/profile` (Internal Officer Profile, posting details, PIN change, push alert test, and sign out)

## Backend API

### Authentication & Authorization
- `POST /api/auth/login` (JWT authentication & PIN verification)
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/change-pin` (verifies current PIN, updates bcrypt hash, and issues fresh 365-day token)

### Complaints & Intake
- `GET /api/complaints` (requires Bearer token; block-scoped for BI/ATP; submitter-scoped for Desk Operators; includes subqueried `caseId`)
- `GET /api/complaints/:complaintId` (block-scoped; returns 403 if outside assigned blocks for BI/ATP)
- `GET /api/complaints/:complaintId/files`
- `GET /api/complaints/:complaintId/files/:fileId`
- `POST /api/complaints/source-upload`
- `POST /api/complaints/process-source` (dual-engine OCR: Mistral OCR primary with local `tesseract.js` and `pdf-parse` fallbacks)
- `POST /api/complaints/extract-source` (Claude 3.5 Sonnet structured JSON extraction)
- `POST /api/complaints` (multipart complaint registration, Drive folder creation, & BI/ATP mapping)
- `POST /api/complaints/:complaintId/assign` (promotes complaint to enforcement case `CASE-XXXXXXXXXXXX`)

### Field Inspections & Notices
- `POST /api/inspections` (geotagged inspection evidence; Section 270 notice recording; block-scoped; triggers push notification)
- `GET /api/cases/:caseId/notices` (retrieves Section 270 and Section 269 notice records for a case)

### Statutory Enforcement, Case Lifecycle & Closures
- `GET /api/cases` (block-scoped search/list of enforcement cases)
- `GET /api/cases/:caseId` (fully hydrated case record; block-scoped)
- `GET /api/cases/:caseId/construction-status` (compoundable assessment & Section 269 notice status)
- `POST /api/cases/:caseId/construction-status` (upserts section-level construction decisions & violator replies)
- `POST /api/cases/:caseId/review-reply` (evaluates violator reply as valid or invalid with statutory status transition)
- `POST /api/cases/:caseId/close` (statutory supervisory case closure with mandatory description and evidence)
- `GET /api/cases/:caseId/enforcement` (retrieves recorded demolition details, cost recovery, stay orders, & Drive evidence files)
- `POST /api/cases/:caseId/enforcement` (statutory demolition & enforcement action recording, Google Drive upload, & status transition)

### Web Push Notifications (PWA)
- `GET /api/push/vapid-public-key` (returns server VAPID public key for browser push subscription)
- `POST /api/push/subscribe` (upserts officer device push subscription with unique constraints)
- `DELETE /api/push/subscribe` (removes device endpoint from subscription table)
- `POST /api/push/test` (dispatches test push notification to officer's registered device)

### Analytics & Officer Operations
- `GET /api/analytics/overview` (live operational KPI counts, complaint statuses, zone breakdowns, and statutory Needs Attention flags)
- `GET /api/analytics/officers` (live officer inspection, notice, and case assignment metrics with ATP supervisory rollup by zone)
- `GET /api/officers`
- `GET /api/officers/roster`
- `GET /api/officers/:officerId`

### Administration
- `GET /api/users` (superadmin user list)
- `POST /api/users` (superadmin create user)
- `PUT /api/users/:userId` (superadmin update user)
- `DELETE /api/users/:userId` (superadmin delete user)

## Layout

The authenticated application shell renders a fixed sidebar and scrolling content area on every page. On narrow screens the sidebar becomes a fixed bottom navigation bar.

## Validation

Frontend build:

```powershell
cd Frontend
npm run build
```

Backend build:

```powershell
cd server
npm run build
```

Both builds currently pass.
