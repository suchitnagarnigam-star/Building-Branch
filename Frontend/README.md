# MCL-BB — Frontend Application

Internal operations and enforcement portal for Municipal Corporation Ludhiana's Building Branch.

## Technology Stack

- **Framework**: React 19, TypeScript, Vite
- **Routing**: Custom hash-based router (`src/shared/hooks/useRouter.ts`)
- **Styling**: Custom CSS design system (`src/App.css`) tailored with a municipal dark-blue theme
- **Icons**: SVG icon sprites (`public/icons.svg`) and Lucide-compatible icon components
- **API Client**: Fetch-based REST service with session storage and local caching fallback (`src/services/complaintApi.ts`)

---

## Architecture & Layout

The frontend uses an application shell pattern:
- **Header (`src/layout/Topbar.tsx`)**: User profile badge, live date/time indicator, font size controls, and breadcrumbs.
- **Sidebar (`src/layout/Sidebar.tsx`)**: Fixed vertical navigation on desktop screens (`> 768px`) with MCL insignia and municipal illustration (`ludhiana-illustration.png`). On mobile (`<= 768px`), automatically adapts into a fixed bottom navigation bar.
- **Main View (`src/App.tsx`)**: Central hash router matching active routes and hydrating views.

---

## Application Routes

| Route | Component | Description |
| :--- | :--- | :--- |
| `#/dashboard` | `DashboardPage.tsx` | Operational KPIs, Zone complaint distribution, Case pipeline progress, CSV report export |
| `#/complaints` | `ComplaintsPage.tsx` | Searchable complaint list with zone and status filters |
| `#/complaints/new` | `ComplaintFormPage.tsx` | Dual-mode intake: manual entry form and external document upload |
| `#/complaints/new/extracted` | `ExtractedComplaintPage.tsx` | Verification of fields extracted by Mistral OCR and Claude LLM |
| `#/complaints/:id` | `ComplaintDetailPage.tsx` | Complaint metadata, Drive attachment viewer, assigned officers, status action buttons, and audit trail |
| `#/complaints/confirm/:id` | `ComplaintConfirmationPage.tsx` | Registration success receipt with complaint reference number |
| `#/field-inspection` | `FieldInspectionPage.tsx` | BI field visit report: GPS geolocation, photos, building classification, and Section 270 notice recording |
| `#/officers` | `OfficersPage.tsx` | Roster directory showing assigned BI and ATP officers across Zones and Blocks |
| `#/analytics` | `AnalyticsPage.tsx` | Enforcement analytics and delay-tracking dashboard |
| `#/settings` | `SettingsPage.tsx` | Profile and system preferences |

---

## Statutory Enforcement Workflow Alignment (`workflow.pdf`)

The frontend is aligned with the statutory procedure under the Punjab Municipal Corporation Act, 1976:

1. **Intake & Verification**:
   - Manual or external document registration maps responsible BI and ATP by block/zone.
2. **BI Field Visit & Section 270 Notice**:
   - BI submits on-site evidence and report at `#/field-inspection`.
   - If violation is found, issues Section 270 notice with 3-day statutory window.
3. **Violator Reply & Review**:
   - Captures violator reply statement and evidence documents.
   - ATP and BI joint review determines if matter is resolved or continues to construction classification.
4. **Construction Status Classification Triad**:
   - **Compoundable**: Town planning fee assessment and physical payment receipt photo upload.
   - **Partly Compoundable**: Dual-track split between regularizable portion (assessment/receipt) and illegal portion (Section 269 notice) with `Both Areas Handled?` concurrency gate.
   - **Non-Compoundable**: Demolition / sealing notice under Section 269.
5. **Universal ATP Case Closure Protocol**:
   - Authorized ATP officers can close a case from any active state using the closure dialog requiring a mandatory `Closing Description` and optional evidence.
6. **Central Audit Timeline**:
   - `ComplaintDetailPage.tsx` displays timestamped history logs for every state transition and notice.

---

## Local Development

```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev

# Run TypeScript type check & build
npm run build
```

Default development address: `http://localhost:5173` (connects to backend on `http://localhost:5000`).
