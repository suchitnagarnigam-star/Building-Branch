# MCL-BB --- Demolition Integration Handoff

## Purpose

This is the single implementation handoff for integrating Demolition
into the existing MCL Building Branch web application. Do not redesign
the existing workflow. Extend the current Case-based workflow from
Section 269 onward.

## Current baseline

Already handled: - Complaint / Proactive Visit - Block → Zone
filtering/assignment - BI / ATP assignment - BI field inspection - Case
creation - Construction Status - Compoundable / Partly Compoundable /
Non-Compoundable - Section 269 notice - Violator Reply - Case Status
History - Existing Case Detail page

**Critical distinction:** Section 269 Notice is not the final Demolition
Order.

Target:
`269 Notice → Violator Reply → Reply Review → Demolition Eligibility → Demolition Order → Compliance Period → Appeal/Stay → Owner Compliance or MCL Demolition → Evidence → Cost Recovery → ATP Closure`

## Final workflow

``` mermaid
flowchart TD
 A[Complaint / Proactive Visit] --> B[Block]
 B --> C[Zone Auto-Filter / Auto-Fill]
 C --> D[BI / ATP Assignment]
 D --> E[BI Field Inspection]
 E --> F{Inspection Outcome}
 F -->|No Violation| G[Existing Closure Flow]
 F -->|Violation Found| H[Existing Section 270 / Reply Flow]
 F -->|Complete & Violated| I[Case]
 H --> J[Construction Status]
 I --> J
 J --> K{Construction Status}
 K -->|Compoundable| L[Compounding Flow]
 K -->|Partly Compoundable| M[Compoundable Portion + 269 for Non-Compoundable Portion]
 K -->|Non-Compoundable| N[Section 269 Notice]
 M --> N
 N --> O[Violator Reply]
 O --> P[Reply Review]
 P --> Q{Reply Outcome}
 Q -->|Resolved| R[ATP Closure]
 Q -->|Unresolved / Eligible| S[Demolition Order]
 S --> T[Compliance Period]
 T --> U{Appeal / Stay?}
 U -->|Yes| V[Appeal / Court Stay Pending]
 V --> U
 U -->|No| W{Owner Complied?}
 W -->|Yes| X[Verification + Evidence]
 X --> R
 W -->|No| Y[Corporation / MCL Demolition Action]
 Y --> Z{Demolition Result}
 Z -->|Full Demolition| AA[Evidence + Cost Recovery]
 Z -->|Partial Demolition| AB[Record Remaining Violation]
 Z -->|Further Action| AC[Further Action Pending]
 AA --> R
 AB --> AC
```

## Core rules

1.  Case remains the central entity; do not create a separate demolition
    case.
2.  Existing Case/Complaint/Property/Location/Officer/269/Reply
    information is auto-fetched.
3.  Do not allow demolition unless backend confirms eligibility.
4.  Reply Review must precede final demolition eligibility.
5.  Appeal/stay blocks demolition execution while active.
6.  Partial demolition with a remaining violation does not close the
    case.
7.  Important transitions go into `case_status_history`.
8.  Preserve working Complaint, Inspection, Construction Status and 269
    logic.

## Important 269 correction

Do not call the earlier Section 270 stage a hard-coded "3-Day Reply
Period". The minimum 3-day rule belongs to the Section 269(1) demolition
period. Use: - Earlier stage: `Reply / Compliance Opportunity` - After
demolition order: `Demolition Compliance Period`

## Demolition Step 1 --- Demolition Order

Entry:
`Case Detail → 269 Notice → Reply → Reply Review → Unresolved/Eligible → Initiate Demolition`

### Auto/read-only

-   Case ID
-   Complaint ID(s)
-   Property/address
-   Block, Zone, Ward if available
-   Owner/Violator
-   BI
-   ATP
-   Construction Status
-   269 Notice/date/document
-   Violator Reply
-   Reply Review Status
-   Existing Case Evidence

### Required

-   Demolition Order Number
-   Order Date
-   Delivery/Service Date
-   Specified Demolition Period
-   Reason
-   Demolition Order Document

### Auto

`Compliance Deadline = Delivery/Service Date + Specified Period`

Validate `Specified Period >= 3 days`. Do not force exactly 3 days.

### Appeal / Stay

`Appeal Filed? No/Yes`

If Yes: - Appeal Number - Appeal Date - Court/Authority - Appeal
Document - Stay Granted? Yes/No

If stay is granted: - Stay Date - Stay Order - Court Direction if
applicable

Result: `Appeal / Stay Pending`; demolition execution is blocked.

## Demolition Step 2 --- Demolition / Compliance Action

First select: - Owner Complied - Full Demolition Completed - Partial
Demolition Completed - Appeal / Court Stay - Further Action Required

### Owner Complied

Required: - Compliance Date - Verification Date - Verification Remarks -
Verification Evidence

Then → ATP Closure.

### Full Demolition

Required: - Demolition Date - Executed By - Execution Remarks -
Demolition Evidence - Execution Report where applicable

Then → Cost Recovery where applicable → ATP Closure.

### Partial Demolition

Required: - Demolition Date - Demolished Portion - Remaining Violation -
Evidence - Remarks

Result: case remains open → Further Action Pending.

### Appeal / Court Stay

Record appeal/stay reference, authority, date, order, next hearing if
available, directions/remarks. Case remains open and execution is
blocked.

### Further Action

Required: - Reason - Next Action - Remarks

Optional: - Expected Action Date - Supporting Document

Result: Further Action Pending; case remains open.

## Database design

Keep:

``` text
cases
 ├── construction_status
 ├── construction_parts
 ├── notices
 │    └── 269 Notice
 ├── violator_replies
 ├── demolition_records        ← NEW
 ├── demolition_evidence       ← NEW only if existing evidence cannot be reused
 ├── case_status_history
 └── case_closures
```

Use one `demolition_records` entity rather than separate tables for full
demolition, partial demolition, appeal, owner compliance and cost
recovery.

Recommended fields:

``` text
demolition_id
case_id
demolition_order_number
order_date
delivery_date
specified_period_days
compliance_deadline
appeal_filed
appeal_number
appeal_date
appeal_authority
appeal_document
stay_granted
stay_date
stay_document
compliance_status
action_type
action_date
executed_by
demolished_portion
remaining_violation
remarks
cost_incurred
recovery_applicable
recovery_amount
recovery_status
recovery_reference
created_by
created_at
updated_at
```

Do not create separate `full_demolition`, `partial_demolition`,
`appeal`, `owner_compliance` and `cost_recovery` tables unless the
existing schema proves a separate entity is necessary.

## Evidence

Follow the existing pattern:
`PostgreSQL = metadata/relationships; Google Drive = uploaded files`.

Logical relationship:
`Case → Demolition Record → Demolition Evidence → Google Drive`

Metadata should include:
`file_name, mime_type, drive_file_id, drive_file_url, uploaded_by, uploaded_at`.

## Backend

Do not rewrite working Construction Status / 269 code unnecessarily. Add
the missing layers:

`269 Notice → Reply → Reply Review → Demolition Eligibility → Demolition Order → Compliance/Appeal → Demolition Action → Evidence/Cost Recovery → ATP Closure`

Recommended APIs:

``` text
POST /api/cases/:caseId/review-reply
POST /api/cases/:caseId/demolition-order
GET  /api/cases/:caseId/demolition
POST /api/cases/:caseId/demolition-action
```

Follow existing project API conventions if they differ.

## State transition logic

``` mermaid
stateDiagram-v2
 [*] --> SECTION_269_ISSUED
 SECTION_269_ISSUED --> REPLY_RECEIVED
 REPLY_RECEIVED --> REPLY_REVIEWED
 REPLY_REVIEWED --> RESOLVED: violation resolved
 REPLY_REVIEWED --> DEMOLITION_ELIGIBLE: unresolved
 RESOLVED --> READY_FOR_CLOSURE
 DEMOLITION_ELIGIBLE --> DEMOLITION_ORDER_ISSUED
 DEMOLITION_ORDER_ISSUED --> AWAITING_COMPLIANCE
 AWAITING_COMPLIANCE --> APPEAL_PENDING: appeal/stay
 APPEAL_PENDING --> AWAITING_COMPLIANCE: legally cleared
 AWAITING_COMPLIANCE --> OWNER_COMPLIED
 AWAITING_COMPLIANCE --> DEMOLITION_ACTION: no compliance
 OWNER_COMPLIED --> VERIFICATION
 VERIFICATION --> READY_FOR_CLOSURE
 DEMOLITION_ACTION --> FULL_DEMOLITION
 DEMOLITION_ACTION --> PARTIAL_DEMOLITION
 DEMOLITION_ACTION --> FURTHER_ACTION
 FULL_DEMOLITION --> COST_RECOVERY
 COST_RECOVERY --> READY_FOR_CLOSURE
 PARTIAL_DEMOLITION --> FURTHER_ACTION
```

Reconcile these logical states with existing database enum/status names
before migration.

## Case Detail UI

Extend the existing `CaseDetailPage`; do not create a separate
Demolition Dashboard.

Sequence:
`Case Information → Inspection → Section 270/Reply → Construction Status → 269 Notice → Violator Reply → Reply Review → Demolition Order → Compliance/Appeal → Demolition Action → Cost Recovery → Status History → Closure`

Make the timeline dynamic and show only relevant actions/forms.

## Required / Optional / Auto

### Auto

Case ID, Complaint ID, Property, Address, Block, Zone, Ward,
Owner/Violator, BI, ATP, Construction Status, 269 Notice, 269
date/document, Reply, Reply Review Status, existing evidence.

### Demolition Order required

Order Number, Order Date, Delivery Date, Specified Period, Reason, Order
Document, Appeal decision.

### Appeal = Yes required

Appeal Number, Appeal Date, Court/Authority, Appeal Document, Stay
decision.

### Owner Complied required

Compliance Date, Verification Date, Verification Remarks, Verification
Evidence.

### Full Demolition required

Demolition Date, Executed By, Demolition Evidence, Execution Remarks.

### Partial Demolition required

Demolition Date, Demolished Portion, Remaining Violation, Evidence,
Remarks.

### Court Stay required

Stay Date, Court/Authority, Stay Order.

### Further Action required

Reason, Next Action, Remarks.

## Implementation order

1.  Inspect and preserve current 269 implementation.
2.  Implement Reply Review if missing.
3.  Define/enforce state transitions.
4.  Finalize `demolition_records`.
5.  Implement Demolition Order API.
6.  Implement compliance/appeal handling.
7.  Implement Demolition Action API.
8.  Link demolition evidence.
9.  Implement cost recovery.
10. Extend CaseDetailPage.
11. Add dynamic workflow/timeline.
12. Add closure restrictions.
13. Test every branch.

### Minimum test branches

``` text
269 → Reply → Resolved → Closure

269 → Reply → Unresolved → Demolition Order
    → Owner Complies → Verification → Closure

269 → Reply → Unresolved → Demolition Order
    → No Compliance → Full Demolition → Cost Recovery → Closure

269 → Reply → Unresolved → Demolition Order
    → Partial Demolition → Remaining Violation → Further Action

269 → Reply → Unresolved → Demolition Order
    → Appeal/Stay → Case remains open

269 → Reply → Unresolved → Demolition Order
    → Further Action → Case remains open
```

## AI implementation prompt

**Implement the MCL-BB Demolition workflow according to this file.**

First inspect the existing codebase, migrations/schema, current 269
implementation, reply implementation, CaseDetailPage, status values,
evidence storage and closure logic.

Do not redesign or rewrite working functionality. Extend the existing
Case-centered workflow from Section 269 onward.

Implement in this order: 1. Identify existing 269, reply,
status-history, evidence and closure structures. 2. Implement Reply
Review if missing. 3. Enforce valid state transitions so required stages
cannot be skipped. 4. Add `demolition_records` linked to `case_id`. 5.
Implement Demolition Order creation with order number/date, delivery
date, specified period, automatic deadline, minimum 3-day validation,
reason and document. 6. Add conditional appeal/stay handling. 7.
Implement Demolition/Compliance Action for Owner Complied, Full
Demolition, Partial Demolition, Appeal/Court Stay and Further Action. 8.
Link evidence using the existing storage pattern. 9. Add cost recovery
where Corporation/MCL demolition occurred. 10. Extend the existing
CaseDetailPage; do not create a separate demolition dashboard. 11.
Autofetch all existing
Case/Complaint/Property/Location/Officer/269/Reply information. 12. Make
fields conditional by outcome. 13. Prevent final closure when a stay,
remaining violation or unresolved further action exists. 14. Record
important transitions in case status history. 15. Do not change existing
Complaint, Inspection, Construction Status or working 269 behavior
unless required for integration.

Before changing files, report: - existing relevant tables/models -
existing statuses - existing 269/reply APIs - existing CaseDetailPage
structure - files to modify - new files/migrations required

Then implement the smallest safe change set following this handoff.

Do not invent fields, statuses, APIs or relationships when an existing
project equivalent already exists. Reuse existing project conventions.
