# MCL-BB — Updated Complaint Registration Workflow

## 1. Purpose

MCL-BB is an internal complaint-management application. The application is used by a documentation/operator user who records complaints received through different channels.

The complaint registration page supports **two independent registration routes**:

1. **Manual Entry** — the operator listens to/receives the complaint and enters the information manually.
2. **External Source Processing** — the operator uploads a news image, email screenshot, PDF, or similar source document for OCR/LLM-assisted extraction.

Both routes ultimately produce the same structured complaint record and enter the same downstream complaint workflow.

---

# 2. Registration Routes

```text
                         REGISTER COMPLAINT
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
              MANUAL ENTRY           EXTERNAL SOURCE
                    │                       │
          Operator enters fields      Upload image/PDF
                    │                       │
          Mandatory image upload      OCR / text extraction
                    │                       │
          NO OCR / NO LLM             LLM-assisted extraction
                    │                       │
                    │                 Extracted fields
                    │                       │
                    │                 Operator review/edit
                    │                       │
                    └───────────┬───────────┘
                                ▼
                       Final complaint data
                                │
                                ▼
                         Officer mapping
                                │
                                ▼
                      Complaint registration
                                │
                                ▼
                       Existing workflow
```

The two routes are independent during registration. They must not require the operator to complete both.

---

# 3. Route A — Manual Entry

## 3.1 When to use

Use Manual Entry when the operator receives the complaint directly, for example:

- phone call
- citizen interaction
- verbal complaint
- other situation where the operator has the complaint information and enters it manually

## 3.2 Required information

The operator manually enters:

- Citizen Name
- Phone Number
- Block
- Zone
- Ward (optional)
- Address
- Complaint Title
- Complaint Description
- Complaint Image

### Important rule

**A complaint image is compulsory for Manual Entry.**

The complaint cannot be submitted until an image has been uploaded.

The image in this route is treated as a **supporting/evidence attachment**.

It is NOT processed through OCR or LLM.

```text
Manual Entry
    +
Mandatory Complaint Image
    ↓
Submit
    ↓
Normal complaint registration
```

## 3.3 Manual Entry UI

```text
┌──────────────────────────────────────────────┐
│              Register a Complaint            │
│                                              │
│ MANUAL ENTRY                                 │
│                                              │
│ Citizen Name *                               │
│ [________________________________________]   │
│                                              │
│ Phone Number *                               │
│ [________________________________________]   │
│                                              │
│ Complaint Location                           │
│                                              │
│ Block *                                      │
│ [ Select Block ▼ ]                           │
│                                              │
│ Zone *                                       │
│ [ Zone B ▼ ]                                 │
│                                              │
│ Ward (optional)                              │
│ [________________________________________]   │
│                                              │
│ Address *                                    │
│ [________________________________________]   │
│                                              │
│ Complaint Title *                            │
│ [________________________________________]   │
│                                              │
│ Complaint Description *                      │
│ [________________________________________]   │
│ [________________________________________]   │
│                                              │
│ Complaint Image *                            │
│ [ Upload Image ]                             │
│ JPG / PNG                                    │
│                                              │
│             [ Submit Complaint ]              │
│                                              │
│ ───────────────── OR ─────────────────────── │
│                                              │
│      REGISTER FROM EXTERNAL SOURCE           │
│                                              │
│ Upload a news article, email, PDF, etc.      │
│                                              │
│ [ Upload Source Document ]                   │
│                                              │
└──────────────────────────────────────────────┘
```

---

# 4. Route B — External Source Processing

## 4.1 When to use

Use External Source Processing when the complaint originates from material such as:

- newspaper/news article
- email
- email screenshot
- scanned complaint
- PDF
- image
- other external document

The operator uploads the source rather than manually entering all information from the beginning.

## 4.2 Source types

The UI should provide:

```text
News
Email
Other
```

The source type should be stored with the source document.

## 4.3 Processing workflow

```text
Select source type
        ↓
Upload image/PDF
        ↓
Backend processing
        ↓
OCR / document text extraction
        ↓
LLM-assisted field extraction
        ↓
Structured complaint data
        ↓
Operator Review & Edit
        ↓
Confirm & Register
```

OCR/LLM processing applies **only to this route**.

---

# 5. External Source Review

The extracted information must not automatically become the final complaint.

The operator must be able to review and correct it.

Example:

```text
Review Extracted Complaint

Citizen Name
[ Rahul Sharma                         ]

Phone Number
[ 9876543210                           ]

Block *
[ Block 3 ▼                            ]

Zone *
[ Zone B ▼                             ]

Ward (optional)
[ 12                                   ]

Address *
[ Model Town, Street 4                 ]

Complaint Title *
[ Garbage accumulation                 ]

Description *
[ Garbage has not been collected...    ]

Source
📰 news_article.jpg


             [ Confirm & Register ]
```

After confirmation, it follows the same complaint registration process as Manual Entry.

---

# 6. Location Workflow

## 6.1 Current data limitation

The currently available reliable structured location data is:

```text
Zone
Block
```

Ward data is not currently available in a form suitable for a dropdown.

Therefore the current MVP must **not** implement a Ward dropdown.

Ward remains available as an optional text field.

---

# 7. Block → Zone Selection

The operator must be able to select the **Block first**.

### Block must never be disabled.

When the page opens:

```text
Block *
[ Select Block ▼ ]
```

The dropdown must immediately provide the complete list of available blocks.

The operator can choose any valid block without first selecting a Zone.

Example:

```text
Block *
┌─────────────────────┐
│ Select Block        │
│ Block 1             │
│ Block 2             │
│ Block 3             │
│ Block 4             │
│ ...                 │
└─────────────────────┘
```

After selecting a Block, the application determines its corresponding Zone.

Example:

```text
Selected Block
Block 3

       ↓

Location mapping

Block 3 → Zone B

       ↓

Zone
[ Zone B ▼ ]
```

The Zone control should then show **only the Zone corresponding to the selected Block**.

---

# 8. Zone Behavior

Zone is not an independent location choice in the current MVP.

The application should derive Zone from Block.

For example:

```text
Block 1 → Zone A
Block 2 → Zone A
Block 3 → Zone B
Block 4 → Zone C
```

If the operator selects:

```text
Block 3
```

then:

```text
Zone
[ Zone B ▼ ]
```

Only `Zone B` should be available for that selected Block.

The implementation must not allow an inconsistent combination such as:

```text
Block 3
Zone C
```

because Block 3 is mapped to Zone B.

### Preferred implementation

The frontend should use a data-driven mapping such as:

```ts
[
  { block: "Block 1", zone: "Zone A" },
  { block: "Block 2", zone: "Zone A" },
  { block: "Block 3", zone: "Zone B" }
]
```

Do not hard-code individual block-to-zone rules inside component logic.

---

# 9. Ward Behavior

Ward is currently an optional free-text field.

```text
Ward (optional)

[ Enter ward if known ]
```

Ward must:

- not be a dropdown
- not depend on Block
- not depend on Zone
- not be disabled
- not be required
- not prevent complaint submission when empty

Example values may be:

```text
12
Ward 12
Ward-12
```

The system should preserve the operator's entered value rather than forcing it into a dropdown format.

---

# 10. Location Section — Final UI

```text
Complaint Location

Block *
[ Select Block ▼ ]

Zone *
[ Zone corresponding to selected Block ▼ ]

Ward (optional)
[ Enter ward if known ]

Address *
[____________________________________]
[____________________________________]
```

### Initial state

```text
Block
[ Select Block ▼ ]

Zone
[ Select Block First ]

Ward
[________________________]
```

### After selecting a block

```text
Block
[ Block 3 ▼ ]

Zone
[ Zone B ▼ ]

Ward
[________________________]
```

Block remains enabled at all times.

---

# 11. Changing the Block

If the operator changes the Block, Zone must be recalculated immediately.

Example:

```text
Before:

Block → Block 3
Zone  → Zone B
Ward  → 12
```

Operator changes Block:

```text
Block → Block 7
```

Application recalculates:

```text
Block 7 → Zone C
```

Result:

```text
Block → Block 7
Zone  → Zone C
Ward  → 12
```

The Ward field is independent and should not automatically be cleared simply because the Block changed.

---

# 12. Manual Image Upload

Manual Entry requires at least one complaint image.

Recommended accepted formats:

```text
JPG
PNG
```

The upload area should clearly indicate:

```text
Complaint Image *
Required
JPG / PNG
```

If the operator attempts to submit without an image:

```text
Please upload a complaint image before submitting.
```

No OCR or LLM processing is triggered.

The file is stored as an attachment/file reference rather than as binary data inside `complaints.json`.

---

# 13. External Source Upload

External source files may support:

```text
JPG
PNG
PDF
```

The UI should indicate:

```text
Upload Source Document

News image / PDF
Email screenshot / PDF
Other document

JPG, PNG, PDF
```

This upload is different from the mandatory manual complaint image.

---

# 14. Source Document vs Supporting Attachment

These two concepts must remain separate.

## Source Document

Represents the material from which the complaint originated.

Examples:

```text
newspaper.jpg
news_article.pdf
email_screenshot.png
```

It may go through OCR/LLM processing.

## Supporting Attachment

Represents evidence/supporting material attached to a manually registered complaint.

Example:

```text
garbage_photo.jpg
```

It is stored but does not trigger OCR/LLM extraction.

---

# 15. Complaint Data

The complaint record should include a registration source.

```json
"registrationSource": "manual"
```

or:

```json
"registrationSource": "document"
```

## Manual example

```json
{
  "complaintId": "CMP-000001",
  "registrationSource": "manual",
  "citizenName": "Rahul Sharma",
  "phoneNumber": "9876543210",
  "zone": "Zone B",
  "block": "Block 3",
  "ward": "12",
  "address": "Model Town",
  "title": "Garbage not collected",
  "description": "Garbage has not been collected.",
  "attachments": [
    {
      "fileName": "garbage.jpg",
      "fileType": "image/jpeg",
      "filePath": "..."
    }
  ],
  "status": "Registered"
}
```

## External-source example

```json
{
  "complaintId": "CMP-000002",
  "registrationSource": "document",
  "sourceDocument": {
    "type": "news",
    "fileName": "news_article.jpg",
    "fileType": "image/jpeg",
    "filePath": "..."
  },
  "citizenName": "Rahul Sharma",
  "phoneNumber": "9876543210",
  "zone": "Zone B",
  "block": "Block 3",
  "ward": "12",
  "address": "Model Town",
  "title": "Garbage accumulation",
  "description": "...",
  "status": "Registered"
}
```

---

# 16. Backend Registration Logic

## Manual route

```text
Receive manual complaint data
        ↓
Validate required fields
        ↓
Validate mandatory image
        ↓
Validate Block
        ↓
Determine/verify Zone from Block
        ↓
Map Officer using Block
        ↓
Generate Complaint ID
        ↓
Save complaint + attachment metadata
        ↓
Return success
```

No OCR.

No LLM.

## External-source route

```text
Receive source file
        ↓
Validate file
        ↓
OCR / document extraction
        ↓
LLM-assisted field extraction
        ↓
Return structured draft data
        ↓
Operator reviews/edits
        ↓
Confirm & Register
        ↓
Validate final complaint
        ↓
Determine/verify Zone from Block
        ↓
Map Officer
        ↓
Save complaint + source document metadata
        ↓
Return success
```

---

# 17. Common Downstream Workflow

Once either route produces final complaint data:

```text
Final Complaint Data
        ↓
Block
        ↓
Determine Zone
        ↓
Officer Mapping
        ↓
Complaint Registered
        ↓
Assigned
        ↓
In Progress
        ↓
Resolution Submitted
        ↓
Pending Approval
        ↓
Approved / Closed
```

Resolution submission does not itself close the complaint.

Higher-authority approval is required for closure.

---

# 18. Recommended Frontend Components

Keep the React implementation simple and modular.

Recommended structure:

```text
Frontend/src/
├── components/
│   ├── ManualComplaintForm.tsx
│   ├── SourceDocumentUpload.tsx
│   ├── FileUpload.tsx
│   └── LocationFields.tsx
│
├── data/
│   └── locationData.ts
│
├── pages/
│   └── ComplaintFormPage.tsx
│
├── services/
│   ├── complaintApi.ts
│   └── sourceProcessingApi.ts
│
└── types/
    └── complaint.ts
```

The exact component split can remain smaller if the current codebase does not yet require all of these files.

---

# 19. Recommended Data/Mapping Approach

Use a single data-driven source for the currently available location relationship:

```text
Block → Zone
```

Example:

```ts
export const locationData = [
  { block: "Block 1", zone: "Zone A" },
  { block: "Block 2", zone: "Zone A" },
  { block: "Block 3", zone: "Zone B" }
];
```

The same relationship should eventually be validated by the backend.

Do not create a fake Ward dataset merely to support a dropdown.

When official Ward data becomes available later, the Ward field can be upgraded without changing the overall complaint model.

---

# 20. APIs

## Manual registration

```http
POST /api/complaints
```

Used only after manual form validation.

## External source processing

A separate endpoint should be used for document processing, for example:

```http
POST /api/complaints/process-source
```

Its responsibility is to process the uploaded source and return extracted draft information.

The final complaint should only be created after operator review and confirmation.

---

# 21. Validation Rules

### Manual Entry

Required:

```text
Citizen Name
Phone Number
Block
Zone
Address
Complaint Title
Complaint Description
Complaint Image
```

Optional:

```text
Ward
```

### External Source

Required initially:

```text
Source Type
Source Document
```

After extraction, the final complaint data must satisfy the normal complaint validation rules before registration.

---

# 22. What is being used and why

## React + TypeScript

Used for the operator interface because the existing project already uses React and TypeScript and the registration page requires interactive form state.

## Vite

Used as the existing frontend build/development setup.

## Node.js + Express

Used for backend APIs and business logic. This keeps the current MVP architecture simple.

## Local JSON storage

Used for the current MVP because the project is not yet using a database.

## Data-driven Block → Zone mapping

Used instead of hard-coded conditions so the official location data can be changed without rewriting UI logic.

## Block-first selection

Used because the currently available reliable location data is centered around Blocks. The operator must see all Blocks immediately rather than being forced to select a Zone first.

## Derived Zone

Zone is determined from the selected Block so the operator cannot accidentally submit an invalid Block/Zone combination.

## Optional Ward text input

Used because structured Ward data is not currently available. This preserves the ability to record Ward information when the operator knows it without creating inaccurate dropdown data.

## Mandatory image for Manual Entry

Used because the complaint raised through manual entry must have an image as supporting evidence. This image is stored only and does not trigger OCR/LLM processing.

## Separate source-document route

Used because news/email/PDF complaints require a fundamentally different intake process involving OCR/LLM extraction.

## OCR + LLM only for external sources

Used to extract structured complaint fields from unstructured source material. Keeping this outside the manual route avoids unnecessary processing and keeps the normal workflow deterministic.

## Operator review after extraction

Used because OCR/LLM output should be treated as a draft. The operator must verify and correct extracted information before it becomes the official complaint record.

## `registrationSource`

Used to preserve whether the complaint was created through manual entry or external-source processing. This will be useful for audit/history and future analytics.

---

# 23. Current MVP Scope

### Implement now

- Manual complaint entry
- Mandatory complaint image
- Block-first dropdown
- All Blocks visible without selecting Zone first
- Automatic Zone filtering/fill based on selected Block
- Optional Ward text field
- Address
- Complaint title
- Complaint description
- External source upload
- News / Email / Other source type
- Image/PDF upload for external source
- Separate processing action
- Clear OR separation
- Manual validation
- Source-file validation
- Common complaint registration after final data is ready

### Prepare architecture for later

- OCR
- LLM extraction
- Extracted-field review
- Source-document processing API

### Do not implement yet unless specifically required

- Citizen login
- Citizen dashboard
- Officer dashboard
- Advanced analytics
- Maps/geocoding
- WhatsApp
- SMS/email notifications
- Database/Supabase
- Automatic AI classification
- Complex microservice architecture

---

# 24. Final Design Principle

The registration page follows one simple rule:

> **Two independent intake methods, one common complaint workflow.**

```text
MANUAL
Operator enters data
+
Mandatory image
+
No OCR/LLM
        │
        │
        ├──────────────┐
        │              │
        ▼              ▼
                 FINAL COMPLAINT
                       DATA
                         │
                         ▼
                   Block → Zone
                         │
                         ▼
                  Officer Mapping
                         │
                         ▼
                    WORKFLOW


DOCUMENT
Upload news/email/PDF/image
+
OCR
+
LLM
+
Operator review
        │
        └───────────────┘
```

The location rule is equally simple:

```text
Operator sees ALL BLOCKS immediately
            ↓
Operator selects Block
            ↓
System determines Zone
            ↓
Zone shows only the matching Zone
            ↓
Ward remains optional free text
```

This is the source-of-truth workflow for the next implementation stage.
