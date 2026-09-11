# MCL-BB --- Product & Implementation Plan v2

**Last updated:** 2026-09-10

## Product Direction

MCL-BB is evolving into a Building Violation Detection, Challan, Notice
and Enforcement Workflow Management System. It retains external
complaint/document intake while adding BI field discovery.

## Two Case Entry Paths

### A. External Case

Mail, physical document, complaint, ATP or other authorized officer →
operator/authorized user creates case → location mapping → BI
assignment.

Existing external-source processing remains: upload → Mistral OCR →
Claude structured extraction → operator review/edit → registration.

### B. BI Field Discovery

BI finds suspected violation → captures image/evidence → adds
location/property/problem details → creates violation record → records
field visit.

Both paths enter the same operational lifecycle.

## Updated Core Workflow

``` mermaid
flowchart TD
A[Case Entry] --> B1[External Case]
A --> B2[BI Field Discovery]
B1 --> C1[Register and Assign BI]
B2 --> C2[Create Violation Record]
C1 --> D[BI Site Visit]
C2 --> D
D --> E[Visit Report and Evidence]
E --> F{Violation / Action Required?}
F -->|No| G[Invalid / No Action]
G --> H[Closed]
F -->|Yes| I[BI Issues Challan]
I --> J[Upload Challan Image]
J --> K[Record Challan]
K --> L[Notify Challan Recipient]
K --> M[Notify Property Owner]
K --> N[Notify Zone ATP]
K --> O[Start Notice Period]
O --> P[Midway Reminder]
P --> Q{Corrective Action Completed?}
Q -->|Yes| R[ATP / Higher Authority Updates Status]
R --> S[Resolved / Closed]
Q -->|No| T[Notice Expires]
T --> U[Notify BI / Escalation Recipients]
U --> V[BI Reinspection]
V --> W[Detailed Follow-up Report]
W --> X[ATP / MTP / JC Review]
X --> Y[Existing Government Enforcement Process]
Y --> Z[Record Final Outcome]
```

## BI Authority

BI does not require ATP pre-approval to issue a challan. BI must record
the visit, findings, evidence and challan image.

## Notice Period

Exact duration is **TBD** and must be configurable. Store `issued_at`,
`notice_period_days`, `reminder_at`, `expires_at`, and status. Current
expected range is approximately 3--7 days but must not be hard-coded.

## Notifications

Immediately after challan issuance: - Person against whom challan is
issued. - Property owner. - ATP of the relevant zone. - BI receives
successful action confirmation.

Midway: - Reminder primarily to the person against whom the challan is
issued.

After expiry: - Recipient rules configurable for BI, ATP, MTP, JC and
other authorities. - BI must receive reinspection task.

Avoid duplicate notifications if the property owner and challan
recipient are the same person.

## Role Model

-   **Operator:** external case intake and document processing.
-   **BI:** field discovery, visits, evidence, reports, challans,
    reinspections.
-   **ATP:** zone dashboard, challan monitoring, status updates and
    escalation participation.
-   **MTP:** higher-level review and escalations.
-   **JC:** city-level monitoring, escalations, analytics and authorized
    status/action updates.

## Architecture Decision

Use **one backend and one frontend codebase**. Do not split core logic
between a main web app and PWA.

Backend owns: - RBAC - workflow transitions - challan rules - notice
scheduling - notification recipients - audit history - escalation

Frontend owns: - role-based UI - dashboards - mobile layouts - forms -
PWA installation - push subscription - notification display and click
handling

## Current Stack

-   React 19 + TypeScript + Vite
-   Node.js + Express 5 + TypeScript
-   PostgreSQL via `pg`
-   Mistral OCR
-   Anthropic Claude structured extraction
-   `server/uploads/`
-   Google Sheets integration
-   PWA: Web Push, service worker, manifest and basic caching

## Target Frontend Structure

``` text
Frontend/src/
├── app/
├── modules/
│   ├── complaints/
│   ├── violations/
│   ├── inspections/
│   ├── challans/
│   ├── notices/
│   ├── reports/
│   ├── notifications/
│   └── analytics/
├── dashboards/
│   ├── bi/
│   ├── atp/
│   ├── mtp/
│   └── jc/
├── auth/
├── layout/
├── shared/
├── pwa/
└── App.tsx
```

## Target Backend Structure

``` text
server/
├── app.ts
├── routes/
├── modules/
│   ├── complaints/
│   ├── violations/
│   ├── inspections/
│   ├── challans/
│   ├── notices/
│   ├── reports/
│   ├── notifications/
│   └── users/
├── workflow/
│   ├── events/
│   ├── handlers/
│   └── state-machine/
├── services/
├── db/
├── uploads/
└── shared/
```

Migrate incrementally; do not perform a risky big-bang refactor.

## Workflow Events

-   CASE_CREATED
-   CASE_ASSIGNED
-   BI_FIELD_VIOLATION_CREATED
-   BI_VISIT_REPORTED
-   CHALLAN_ISSUED
-   NOTICE_STARTED
-   NOTICE_REMINDER_DUE
-   VIOLATION_RESOLVED
-   NOTICE_EXPIRED
-   REINSPECTION_REQUIRED
-   REINSPECTION_COMPLETED
-   FOLLOWUP_REPORT_SUBMITTED
-   CASE_ESCALATED
-   FINAL_ACTION_RECORDED

## PWA Scope

Phase 1: installability, Web Push, deep links, camera/file uploads and
basic caching.

Deferred: full offline database, conflict resolution, large-file offline
queues and complex background sync.

## Implementation Order

1.  Preserve current complaint registration.
2.  Add authentication/RBAC foundation.
3.  Add role-aware dashboards and workflow history.
4.  Add BI assigned-case workflow.
5.  Add BI field-discovery workflow.
6.  Add visit reports/evidence.
7.  Add challan creation and challan image upload.
8.  Add push subscriptions and event-driven notifications.
9.  Add configurable notice scheduler and midpoint reminder.
10. Add reinspection and escalation.
11. Add analytics/future channels later.

## Non-Negotiable Rules

-   BI can issue challan without ATP pre-approval.
-   Critical authority rules are backend-enforced.
-   Notifications are event-driven.
-   Notice timing is configurable.
-   ATP and higher authorities have dashboards and notification access
    in the same application.
-   BI gets a mobile-first PWA experience from the same frontend
    codebase.
