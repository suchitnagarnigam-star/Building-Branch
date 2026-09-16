# MCL-BB

MCL-BB is an internal complaint-management application for the Municipal Corporation of Ludhiana Building Branch.

## Stack

- Frontend: React 19, TypeScript, Vite, custom CSS
- Backend: Node.js, Express 5, TypeScript
- Database: PostgreSQL through `pg`
- Development runtime: `tsx`
- File storage: Google Drive API (per-complaint folders & file uploads; temporary staging in `server/uploads/`)
- Integrations: Google Sheets sync, Google Drive service
- OCR: Mistral OCR
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

## Complete Master Workflow

For a detailed product and architectural reference, see [`docs/MASTER.md`](file:///mnt/Data/1YUVRAJ/program/MCL/building%20branch/docs/MASTER.md).

```mermaid
flowchart TD
    A[Complaint Received] --> B{Source}
    B -->|Manual| C[Manual Entry]
    B -->|Email/Post/Document| D[Document Upload]
    D --> E[OCR/AI Extraction]
    E --> F[Officer Review]
    C --> G[Validate Complaint]
    F --> G
    G --> H[Identify Zone/Ward/Area]
    H --> I[Map BI and ATP]
    I --> J[Create Complaint]
    J --> K[Notify BI and ATP]

    K --> L[BI Field Visit]
    L --> M[Evidence Image]
    M --> N[BI Report]
    N --> O{Validation}
    O -->|Invalid| P[Reject]
    P --> M
    O -->|Valid| Q[BI Update]
    Q --> R[ATP Review]

    R --> S{Decision}
    S -->|No Action| T[Close Complaint]
    S -->|Existing Case| U[Link Existing Case]
    S -->|New Violation| V[Create Enforcement Case]

    W[Proactive BI Violation] --> V

    V --> X{Section 270?}
    X -->|No| Y[Continue Case]
    X -->|Yes| Z[Issue 270]
    Z --> AA[Record Details + Document]
    AA --> AB[Start 3-Day Period]

    AB --> AC{Action Taken?}
    AC -->|Yes| AD[Authorized Review]
    AD --> AE[Close/Update]
    AC -->|No| AF{Expired?}
    AF -->|No| AB
    AF -->|Yes| AG[Notify BI and ATP]
    AG --> AH[BI Reinspection]

    AH --> AI[New Evidence + Report]
    AI --> AJ[Section 269 Serious Stage]
    AJ --> AK{Classification}
    AK -->|Compoundable| AL[Compensation/Correction]
    AK -->|Non-compoundable| AM[Serious Enforcement]
    AK -->|Demolition| AN[Demolition]
    AL --> AO[Senior Visibility]
    AM --> AO
    AN --> AO

    AO --> AP[Authorized Action]
    AP --> AQ[Status History]
    AQ --> AR[Monitor Time + Severity]
    AR --> AS[Calculate Score]
    AS --> AT{3 Week Threshold?}
    AT -->|No| AU[Normal Analytics]
    AT -->|Yes| AV[Delayed Flag]
    AV --> AW[Rank Flagged Cases]
    AW --> AX[Analytics + Higher Notifications]
```

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

- `/dashboard`
- `/complaints/new`
- `/complaints/new/extracted`
- `/complaints/confirm/:complaintId`
- `/field-inspection`
- `/complaints`
- `/complaints/mine`
- `/complaints/pending`
- `/analytics`
- `/officers`
- `/settings`

## Backend API

- `GET /api/complaints`
- `GET /api/complaints/:complaintId`
- `GET /api/officers`
- `GET /api/officers/roster`
- `POST /api/complaints/source-upload`
- `POST /api/complaints/process-source`
- `POST /api/complaints/extract-source`
- `POST /api/complaints`

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
