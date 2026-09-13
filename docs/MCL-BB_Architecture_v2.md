# MCL-BB --- Architecture v2

## System Shape

``` text
MCL-BB Frontend
├── BI Mobile/PWA
└── ATP / MTP / JC Dashboards
        ↓
API Backend
├── Workflow + RBAC
├── Notification Service
├── OCR & Claude Extraction Service
└── Google Drive & Sheets Sync
        ↓
PostgreSQL + Google Drive (Evidence/Attachments) + Google Sheets
```

## Backend

Authoritative for RBAC, state transitions, BI challan authority, notice
dates, reminders, recipients, escalation, Google Drive folder creation/file storage, and audit history.

## Event Flow

Business action → transaction/state update → domain event →
notification/scheduler handlers → in-app and push delivery.

Example: BI issues challan → create challan → status history →
`CHALLAN_ISSUED` → resolve recipient/owner/ATP → notifications → notice
schedule.

## PWA

Handles manifest, installability, service worker, push permission,
subscription registration, push display, notification deep links and
basic caching.

PWA does not decide workflow rules.

## Core Entities

-   Users
-   Roles/Permissions
-   Zones/Blocks
-   Cases
-   Complaints
-   Violations
-   Assignments
-   Inspections/Visit Reports
-   Challans
-   Notice Periods
-   Attachments
-   Notifications
-   Push Subscriptions
-   Workflow Events
-   Status History
-   Escalation Reports
-   Final Government Action Records

## High-Level States

REGISTERED → ASSIGNED → UNDER_INSPECTION → INVALID_NO_ACTION or
VIOLATION_RECORDED → CHALLAN_ISSUED → NOTICE_ACTIVE → RESOLVED or
NOTICE_EXPIRED → REINSPECTION_REQUIRED → REINSPECTION_COMPLETED →
ESCALATED → FINAL_ACTION_RECORDED → CLOSED.
