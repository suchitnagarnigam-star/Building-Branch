# MCL-BB — Context Handoff

**Last updated:** Session ending after updated_workflow.md implementation  
**Status:** All 9 planned tasks complete. Zero TypeScript diagnostics across all changed files.

---

## 1. What this project is

MCL-BB is an internal complaint-management application for the Municipal Corporation of Ludhiana. It is used exclusively by operators/documentation staff. Citizens do not have accounts.

**Stack**
- Frontend: React + TypeScript, Vite, CSS custom properties (no Tailwind, no CSS framework)
- Backend: Node.js + Express + TypeScript, `tsx` for dev, local JSON file storage
- No database yet — all persistence is `server/data/complaints.json`

**Running the project**
```
# Frontend
cd Frontend && npm run dev   → http://localhost:5173

# Backend
cd server && npm run dev     → http://localhost:5000
```

---

## 2. What was implemented in this session

The project was aligned with `updated_workflow.md`. The core change was replacing a two-card choice screen with a single unified complaint registration form that handles both intake routes on the same page.

### Two registration routes (both on the same page)

```
MANUAL ENTRY                        EXTERNAL SOURCE
Operator fills form fields          Operator uploads news/email/PDF
+ mandatory complaint image         (shown below the OR divider)
↓                                   ↓
POST /api/complaints                (OCR/LLM processing — NOT yet implemented)
(multipart/form-data)               Operator review → confirm → register
```

The two routes are independent. The operator does not need to complete both.

---

## 3. File-by-file changes

### Frontend

#### `src/data/locationData.ts`
Rewritten from a nested `Zone → blocks[]` structure to a **flat `BlockZoneEntry[]` array**.

```ts
export interface BlockZoneEntry { block: string; zone: string; }
export const locationData: BlockZoneEntry[] = [ ... ];
export function zoneForBlock(block: string): string { ... }
```

Block is now the primary selector. Zone is always derived, never independently chosen.

---

#### `src/types/complaint.ts`
Added `RegistrationSource` type and `registrationSource` field.

```ts
export type RegistrationSource = "manual" | "document";

export interface Complaint {
  registrationSource: RegistrationSource;
  // ... all other fields unchanged
}

export interface ComplaintFormData {
  block: string;   // primary — selected by operator
  zone: string;    // derived from block, read-only in UI
  // ...
}
```

---

#### `src/pages/ComplaintFormPage.tsx`
Full rewrite. Key behaviours:

- **Block dropdown** lists all blocks immediately on page load. Never disabled.
- **Zone input** is `readOnly`, auto-filled via `zoneForBlock(block)` on every block change. Styled with `.derived-field` (muted, not editable).
- **Ward** is a free-text optional field. No dropdown, no dependency on Block or Zone.
- **Complaint Image** is a mandatory field (JPG/PNG only, max 5 MB). Submission is blocked until an image is uploaded. Error message: `"Please upload a complaint image before submitting"`.
- **Submit Complaint** button appears above the OR divider — it belongs to the manual entry route only.
- **OR divider** separates manual entry from the external source section.
- **External Source section** (below OR): source type tabs (News / Email / Other), drag-and-drop zone accepting JPG/PNG/PDF. Source files are collected in state but not yet submitted to a processing endpoint — the OCR/LLM backend is not yet built.
- **Right sidebar** ("Supporting Documents") is currently a placeholder — "Additional attachments coming soon."

State shape:
```
formData: ComplaintFormData          — form fields
complaintImage: UploadedFile | null  — mandatory image
sourceType: "news" | "email" | "other"
sourceFiles: UploadedFile[]          — external source docs (not yet submitted)
```

---

#### `src/services/complaintApi.ts`
`submitComplaint(data, complaintImage)` now sends `multipart/form-data` (via `FormData`) instead of `application/json`. The image file is appended as `complaintImage`.

Falls back to localStorage if the server is unreachable — the local fallback record includes `registrationSource: "manual"`.

---

#### `src/App.tsx`
Routing change:
```
/complaints/new        → NewComplaintScreen (renders ComplaintFormPage)
/complaints/new/*      → ComplaintFormPage directly
```
The old separate `/complaints/new/manual` and `/complaints/new/upload` routes are gone.

---

#### `src/features/complaints/NewComplaintScreen.tsx`
Now a thin wrapper over `ComplaintFormPage`. The two-card choice screen (Fill in form / Upload a document) has been removed — both intake methods live on a single page.

---

#### `src/features/complaints/ManualComplaintForm.tsx`
Marked `@deprecated`. Re-exports `ComplaintFormPage` for backwards compatibility. Nothing imports it actively.

---

#### `src/App.css`
New classes added at the bottom of the file:

| Class | Purpose |
|---|---|
| `.derived-field` | Read-only Zone input — muted background, no focus ring |
| `.form-section-label` | Small uppercase section heading (e.g. "Complaint Location") |
| `.field__required` | Red asterisk marker |
| `.field__hint` | Small muted inline hint next to field label |
| `.upload-dropzone--compact` | Shorter horizontal dropzone for the complaint image field |
| `.upload-dropzone--error` | Red border state when image is missing on submit attempt |
| `.image-preview-row` | Row showing the uploaded complaint image thumbnail + meta + remove button |
| `.complaint-image-thumb` | 56×56 thumbnail inside the preview row |

---

### Server

#### `server/types/complaint.ts`
- Added `RegistrationSource` type
- Added `registrationSource` to `Complaint` and `ComplaintRequest`
- Added `AttachmentMeta` interface
- Added `attachments: AttachmentMeta[]` to `Complaint`

#### `server/services/locationMapping.ts` *(new file)*
Server-side Block→Zone map that mirrors the frontend. `zoneForBlock(block)` returns `string | null`. The route always re-derives Zone from Block — the client-sent zone value is ignored to prevent inconsistent data.

#### `server/routes/complaintRoutes.ts`
Rewritten to:
- Accept `multipart/form-data` via `multer` (v2.0.1, disk storage, `uploads/` dir)
- Validate all required fields from `req.body`
- Reject manual entries without a complaint image (`400`)
- Reject unrecognised blocks (`400`)
- Derive Zone server-side via `zoneForBlock()`
- Build `AttachmentMeta` from the uploaded file
- Look up the responsible officer
- Save and return the full complaint record

Multer is configured with a 5 MB file size limit and MIME type filter (JPG/PNG/PDF).

#### `server/services/complaintStorage.ts`
Added `mkdir(..., { recursive: true })` to ensure `uploads/` exists before the first write. No other logic changes.

---

## 4. What is NOT yet implemented

These items are explicitly deferred per the workflow spec:

| Feature | Notes |
|---|---|
| External source processing endpoint | `POST /api/complaints/process-source` — OCR + LLM extraction |
| Operator review screen for extracted data | After OCR returns structured draft, operator edits + confirms |
| Source document submission | `sourceFiles` state is collected in the form but never sent to an endpoint |
| Supporting documents sidebar | Right-side card is a placeholder — "Additional attachments coming soon" |
| Ward dropdown | No structured Ward data exists yet. Ward stays a free-text optional field |
| Citizen login / dashboard | Out of scope for current MVP |
| Database | Still using `server/data/complaints.json` flat file |
| Officer dashboard | Out of scope |
| WhatsApp / SMS notifications | ConfirmationScreen shows "Sent ✓" but nothing is actually sent |
| Maps / geocoding | Out of scope |

---

## 5. Architecture decisions to preserve

**Block-first, Zone derived**
Zone must never be an independent dropdown. `zoneForBlock()` exists in both frontend (`src/data/locationData.ts`) and server (`server/services/locationMapping.ts`). Both must be kept in sync if block data changes.

**registrationSource**
Every complaint record stores `"manual"` or `"document"`. This field must be preserved in all future schema changes — it is needed for audit, analytics, and to distinguish which processing path was used.

**Mandatory image for manual entry**
The server enforces this (`400` if `complaintImage` is missing for `registrationSource === "manual"`). The frontend also blocks submission in `validateForm()`. Both guards must stay in sync.

**Multipart submission**
`complaintApi.ts` sends `FormData`. Do not revert to `application/json` — the server's multer middleware will break if the content type changes.

**Server re-derives Zone**
Even though the client sends `zone` in the FormData, the server ignores it and calls `zoneForBlock(block)`. This is intentional to prevent inconsistent Block/Zone combinations.

---

## 6. Key file locations

```
Frontend/src/
├── pages/
│   └── ComplaintFormPage.tsx       ← Main form (both routes live here)
├── data/
│   └── locationData.ts             ← Flat Block→Zone map + zoneForBlock()
├── services/
│   └── complaintApi.ts             ← submitComplaint(data, imageFile)
├── types/
│   └── complaint.ts                ← Complaint, ComplaintFormData, RegistrationSource
├── features/complaints/
│   ├── NewComplaintScreen.tsx      ← Thin wrapper → ComplaintFormPage
│   ├── ManualComplaintForm.tsx     ← Deprecated re-export
│   ├── ConfirmationScreen.tsx      ← Post-submit confirmation
│   └── ComplaintsPage.tsx          ← All complaints list view
├── App.tsx                         ← Routing
└── App.css                         ← All styles

server/
├── routes/
│   └── complaintRoutes.ts          ← POST /api/complaints (multipart)
├── services/
│   ├── locationMapping.ts          ← Server-side zoneForBlock()
│   ├── officerMapping.ts           ← Block/Zone → Officer lookup
│   └── complaintStorage.ts        ← Read/write complaints.json
├── types/
│   └── complaint.ts                ← Complaint, ComplaintRequest, AttachmentMeta
├── data/
│   ├── complaints.json             ← Persistent complaint records
│   └── officers.json               ← Officer roster
└── uploads/                        ← Created automatically on first submission
```

---

## 7. Next logical tasks

1. **Build `POST /api/complaints/process-source`** — accepts a source document (JPG/PNG/PDF), runs OCR, calls an LLM, returns structured draft fields. Stub the OCR/LLM for now and return mock extracted data so the review screen can be built.

2. **Build the operator review screen** — displays extracted fields pre-filled from the processing response. Operator edits, then hits "Confirm & Register" which calls `POST /api/complaints` with `registrationSource: "document"`.

3. **Wire up the external source section in `ComplaintFormPage`** — on upload + "Process document" action, call the processing endpoint and navigate to the review screen.

4. **Add `registrationSource` badge to `ComplaintsPage` and `ComplaintDetailPage`** — so the operator can see at a glance how each complaint was registered.

5. **Create `server/uploads/.gitkeep`** — so the uploads directory is tracked in git but its contents are not.
