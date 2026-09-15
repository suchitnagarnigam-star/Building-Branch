# MCL Building Branch — Master Project Document

> **Master Reference for Product, Workflow, Architecture, Prototype and Scope**

## 1. Project Overview

MCL Building Branch is an internal operational platform for Municipal Corporation Ludhiana's Building Branch. It is evolving beyond complaint registration into a connected system for complaint intake, BI field visits, building violation cases, evidence, notices, follow-up, status tracking, delayed-case monitoring, notifications and analytics.

The system is for internal officers. It is not currently a public portal.

---

# 2. Project Problem

Building-related matters can involve multiple officers, physical visits, evidence, reports, notices, follow-up periods and senior decisions. The system should make it possible to know:

- What was received
- Where it relates to
- Who is responsible
- Whether BI visited
- What evidence exists
- What BI reported
- Whether ATP reviewed it
- Whether a building already has a case
- How long a matter has been pending
- Whether notices were issued
- Which cases are delayed
- Which cases are serious
- Officer workload and performance

---

# 3. Core Objectives

1. Digitize complaint intake.
2. Map complaints to responsible BI and ATP.
3. Digitize BI field visits and evidence.
4. Keep official status changes under authorized roles.
5. Keep complaints and enforcement cases distinct but linkable.
6. Track notices and follow-up.
7. Automatically flag delayed cases.
8. Provide analytics using operational data.
9. Support notifications through a PWA direction.

---

# 4. Core Design Principles

## Internal System First
The current portal is for officers and internal workflow.

## Complaints and Cases Are Different
A complaint is information received about a possible issue. A case is an actionable building/violation matter. They may connect but should not be merged into one concept.

## Evidence Is Mandatory for BI Updates
Every BI update requires:
- Evidence image
- Written description/report

The backend must enforce both requirements.

## BI Does Not Control Official Status
BI performs field work and submits information. ATP and authorized higher roles manage official status.

## Flags Are Separate From Status
Example:
- Status: Pending
- Flag: Delayed
- Score: 87

## Analytics Should Use Real Data
The prototype should connect analytics to the operational database rather than only using mock values.

## Preserve History
Status changes and important field actions should remain traceable.

---

# 5. Users and Roles

## BI — Building Inspector
Responsible for:
- Field visits
- Inspections
- Evidence collection
- Field reports
- Notice recording
- Reinspection

BI cannot arbitrarily change official complaint or case status.

## ATP — Assistant Town Planner
Responsible for:
- Reviewing BI updates
- Routine workflow decisions
- Closing/keeping pending where authorized
- Routing actionable matters
- Monitoring BI responsibility

ATP performance is directly influenced by BI performance under the ATP's responsibility.

## MTP
Higher-level oversight and visibility for serious and delayed matters.

## JC
Higher-level oversight, serious case visibility and performance monitoring.

## Super Admin
Full system oversight, administration and future configuration capability.

---

# 6. System Scope

## In Scope
- Complaint registration
- Manual complaint entry
- Existing document/OCR/AI intake capabilities where applicable
- Officer assignment
- BI field visits
- Evidence upload
- BI reports
- Proactive BI cases
- Complaint-to-case linkage
- Notices
- Notice period tracking
- Reinspection
- Serious enforcement stage
- Status history
- Delayed case flags
- Case scoring/ranking
- Analytics
- Notifications
- PWA

## Not Immediate Prototype Scope
- Public citizen portal
- Full WhatsApp integration
- Advanced offline PWA
- Complete legal automation
- Perfect role-specific dashboards
- Fully configurable workflow engine
- Complex scoring configuration

---

# 7. Two Core Workflows

## Workflow A — Complaint-Driven
A complaint enters the system and is investigated.

## Workflow B — BI-Initiated Case
BI independently identifies a potential violation and creates a case.

```mermaid
flowchart LR
    A[External Complaint] --> B[Complaint Workflow]
    C[BI Identifies Violation] --> D[Proactive Case Workflow]
    B --> E{Outcome}
    E -->|Close| F[Closed Complaint]
    E -->|Existing Matter| G[Linked Existing Case]
    E -->|New Violation| H[New Enforcement Case]
    D --> H
```

---

# 8. Complaint Workflow

## 8.1 Complaint Sources
Complaints may arrive through:
- Email
- Post
- Physical documents
- Other external sources
- Manual entry

## 8.2 Intake Data
The receiving officer records or verifies:
- Title
- Description
- Location
- Zone
- Ward
- Area/block
- Source
- Supporting documents/images

Public complaints do not require geotagging.

## 8.3 Assignment
The system maps:
- Responsible BI
- Responsible ATP

based on administrative/geographical responsibility.

## 8.4 Notifications
After creation:
- BI is notified
- ATP is notified

```mermaid
flowchart TD
    A[Complaint Received] --> B{Source}
    B -->|Manual| C[Officer enters complaint]
    B -->|Email/Post/Document| D[Upload document]
    D --> E[OCR/AI extraction where applicable]
    E --> F[Officer review and correction]
    C --> G[Validate complaint]
    F --> G
    G --> H[Identify Zone/Ward/Area]
    H --> I[Map BI and ATP]
    I --> J[Create complaint]
    J --> K[Notify BI]
    J --> L[Notify ATP]
    K --> M[BI field visit]
```

---

# 9. BI Complaint Visit

BI visits the location mentioned in the complaint.

BI must submit:

1. Evidence image proving the visit
2. Description/report explaining the situation

The backend must reject incomplete submissions.

```mermaid
flowchart TD
    A[BI receives complaint] --> B[Visit location]
    B --> C[Capture/upload evidence]
    C --> D[Write field report]
    D --> E{Backend validation}
    E -->|Image/report missing| F[Reject submission]
    F --> C
    E -->|Valid| G[Submit BI update]
    G --> H[Notify ATP]
```

---

# 10. ATP Review of Complaint

ATP reviews the BI update.

Possible outcomes:

## Close
No actionable issue exists.

## Existing Case
The building/location already has a running matter. The complaint remains a record and is linked where possible.

## New Actionable Violation
No relevant existing case exists and BI finds an actionable violation. A new case is created/initiated.

```mermaid
flowchart TD
    A[ATP reviews BI update] --> B{Decision}
    B -->|No action| C[Close complaint]
    B -->|Existing matter| D[Link complaint to existing case]
    B -->|New violation| E[Create enforcement case]
```

---

# 11. Proactive BI Case Workflow

BI may independently identify a violation without receiving a complaint.

The BI creates a case with:
- BI identity
- Zone/ward/area
- Building/location information
- Latitude
- Longitude
- Evidence
- Description/report
- Other inspection fields

```mermaid
flowchart TD
    A[BI identifies violation] --> B[Open case form]
    B --> C[Enter building/location data]
    C --> D[Capture coordinates]
    D --> E[Upload evidence]
    E --> F[Enter BI report]
    F --> G{Validation}
    G -->|Invalid| H[Reject submission]
    H --> E
    G -->|Valid| I[Create case]
    I --> J[ATP review/monitoring]
```

---

# 12. Connecting Complaints and Cases

A complaint can:
1. Close without becoming a case
2. Be linked to an existing case
3. Lead to a new enforcement case

A proactive BI inspection starts directly as a case.

```mermaid
flowchart TD
    A[Complaint] --> B[BI Visit]
    B --> C[Evidence + Report]
    C --> D[ATP Review]
    D --> E{Decision}
    E -->|Close| F[Closed Complaint]
    E -->|Existing Case| G[Link to Existing Case]
    E -->|New Violation| H[New Case]
    I[Proactive BI Inspection] --> H
```

Important implementation principle: a complaint about a building with an existing matter should not automatically create an unrelated duplicate case.

---

# 13. Evidence and Geolocation

Every BI update requires evidence and a report.

Geolocation implementation still requires final technical confirmation.

Possible approaches:
- Application/native camera with coordinates
- Browser/device geolocation during capture
- Existing geotagged image
- Separate image + latitude/longitude

Recommended prototype direction:
- Store evidence image
- Store latitude
- Store longitude
- Avoid depending only on EXIF metadata until tested

---

# 14. Section 270 Workflow

Section 270 is currently understood as an optional first notice/challan stage.

If BI decides no notice is required:
- Submit evidence/report
- ATP reviews

If BI issues Section 270:
1. Issue notice through official field process
2. Record notice information
3. Record number/data
4. Upload notice image/document
5. Start notice period

Exact legal requirements should be verified against official source material before production.

```mermaid
flowchart TD
    A[BI case inspection] --> B{Issue Section 270?}
    B -->|No| C[Submit evidence + report]
    C --> D[ATP review]
    B -->|Yes| E[Issue Section 270]
    E --> F[Record notice details]
    F --> G[Upload notice document]
    G --> H[Start 3-day period]
```

---

# 15. Three-Day Notice Period

After Section 270:
- A 3-day period starts
- Future reminders can be generated
- External WhatsApp integration is later scope
- Portal remains officer-only for now

If action happens:
- Authorized officer reviews
- Official status may be updated

If no action happens:
- BI and ATP receive expiry notification
- BI revisits the location

```mermaid
flowchart TD
    A[Section 270 issued] --> B[3-day timer]
    B --> C{Action taken?}
    C -->|Yes| D[Authorized review]
    D --> E[Close/update status]
    C -->|No| F{Period expired?}
    F -->|No| B
    F -->|Yes| G[Notify BI and ATP]
    G --> H[BI reinspection]
```

---

# 16. Section 269 Serious Enforcement Stage

After expiry and reinspection, the matter may enter the serious Section 269 stage.

BI submits:
- New evidence
- Updated report
- Relevant Section 269 information/documents
- Enforcement classification

Current remembered categories:
- Compoundable
- Non-compoundable
- Demolition

These legal details must be verified against official sources before production implementation.

After this stage, visibility should be provided to:
- ATP
- MTP
- JC
- Super Admin

The application tracks the workflow and records. Actual government/legal field actions are outside the application's direct responsibility.

```mermaid
flowchart TD
    A[Period expires] --> B[BI reinspection]
    B --> C[New evidence]
    C --> D[Updated report]
    D --> E[Section 269]
    E --> F{Classification}
    F -->|Compoundable| G[Compensation/correction path]
    F -->|Non-compoundable| H[Serious enforcement]
    F -->|Demolition| I[Demolition path]
    G --> J[Senior visibility]
    H --> J
    I --> J
    J --> K[Authorized review/action]
```

---

# 17. Status Ownership

## BI
Can:
- Submit field updates
- Upload evidence
- Write reports
- Record notice information

Cannot:
- Change official complaint/case status arbitrarily

## ATP
Handles routine review and status decisions.

## MTP / JC / Super Admin
Receive higher-level visibility and handle serious/authorized decisions according to administrative authority.

```mermaid
flowchart LR
    BI[BI: Evidence + Reports] --> ATP[ATP: Routine Review/Status]
    ATP --> CASE[Case Lifecycle]
    CASE --> MTP[MTP Oversight]
    CASE --> JC[JC Oversight]
    CASE --> SA[Super Admin Oversight]
```

---

# 18. Status History

Do not only store `current_status`.

Store:
- Previous status
- New status
- Changed by
- Changed at
- Reason/note

This supports:
- Accountability
- Timeline
- Analytics
- Time-in-state calculation
- Delay detection

---

# 19. Automatic Flagging

Flags are separate from status.

A case can be:
- Pending
- Delayed flag
- Score 82

The system automatically evaluates:
- Time in current state
- Overall duration
- Severity/stage

Current prototype baseline:
> Approximately 3 weeks before automatic delayed flagging

The threshold should later become configurable.

Flagged cases:
- Appear in dedicated analytics
- Are ranked by score
- Become visible to higher authorities
- Can generate notifications

```mermaid
flowchart TD
    A[Status history] --> B[Calculate time in state]
    B --> C[Evaluate severity]
    C --> D[Calculate score]
    D --> E{Threshold reached?}
    E -->|No| F[Normal monitoring]
    E -->|Yes| G[Create/update delayed flag]
    G --> H[Rank flagged case]
    H --> I[Analytics]
    I --> J[Higher authority notification]
```

---

# 20. Case Scoring

The final scoring formula is not yet decided.

Primary factors:
1. Time stuck in state / total duration
2. Severity/stage

Conceptual direction:

```text
Case Score =
Time Factor
+ Severity Factor
+ Future Administrative Factors
```

Possible future factors:
- Number of follow-ups
- Linked complaints
- Repeated delays
- Notice expiry
- Administrative priority

For the prototype, keep the formula simple and explainable.

---

# 21. Analytics

Analytics is a major priority because non-technical stakeholders are highly interested in it.

## Access Direction
- BI: no analytics
- ATP: analytics
- MTP: analytics
- JC: analytics
- Super Admin: analytics

For now, analytics can remain broadly similar for ATP and above.

## BI Metrics
- Assigned matters
- Cases identified
- Completed
- Closed
- Pending
- Daily performance
- Weekly performance
- Monthly performance
- Time in stages

## ATP Context
ATP performance should reflect the performance of BIs under that ATP's responsibility.

## Higher Oversight
Show:
- Pending
- Closed
- Flagged
- High-severity
- BI performance
- ATP context
- Trends

```mermaid
flowchart TD
    A[Complaints] --> G[Analytics Data Layer]
    B[Cases] --> G
    C[Field Visits] --> G
    D[Status History] --> G
    E[Flags] --> G
    F[Notices] --> G
    G --> H[KPI Metrics]
    G --> I[Officer Performance]
    G --> J[Flagged Cases]
    G --> K[Severity Trends]
    H --> L[Analytics Dashboard]
    I --> L
    J --> L
    K --> L
```

Analytics should derive from operational data rather than manually maintained counters where possible.

---

# 22. Notifications

Important notification events:
- Complaint assigned
- BI update submitted
- ATP review required
- Section 270 issued
- Reminder before expiry
- Notice period expired
- Section 269 serious stage
- Case delayed/flagged

Notifications support workflow but do not replace status history.

---

# 23. PWA Requirements

The application should become a PWA.

Immediate focus:
> Notifications

Prototype PWA scope:
- Manifest
- Installable application
- Service worker
- Basic notification infrastructure
- In-app notification center

Later:
- Advanced offline support
- Background sync
- More advanced push infrastructure

---

# 24. Proposed Modules

1. Complaint Intake
2. Assignment
3. BI Field Work
4. Case Management
5. Notice Management
6. Workflow and Status
7. Flags and Scoring
8. Analytics
9. Notifications
10. Administration

---

# 25. Data Architecture Direction

This is a proposed direction and must be reconciled with the actual current PostgreSQL schema before migrations.

## complaints
Stores complaint intake.

Possible concepts:
- complaint_id
- source
- title
- description
- location
- zone
- ward
- area
- assigned BI
- assigned ATP
- current status
- timestamps

## cases
Stores enforcement/building violation matters.

Possible concepts:
- case_id
- source type
- primary complaint
- building/location identity
- latitude
- longitude
- assigned BI
- assigned ATP
- current status
- severity
- timestamps

## case_complaints
Links multiple complaints to one case.

## field_visits
Stores BI visits and reports.

## visit_evidence
Stores images/evidence metadata.

## notices
Stores:
- Notice type
- Number
- Issuer
- Date
- Expiry
- Documents
- Classification

## case_status_history
Tracks status transitions.

## case_flags
Stores delayed/escalation flags separately from status.

## notifications
Stores in-app/PWA notification records.

---

# 26. Conceptual ER Diagram

```mermaid
erDiagram
    OFFICERS ||--o{ COMPLAINTS : assigned
    OFFICERS ||--o{ CASES : responsible
    COMPLAINTS ||--o{ CASE_COMPLAINTS : linked
    CASES ||--o{ CASE_COMPLAINTS : contains
    CASES ||--o{ FIELD_VISITS : has
    FIELD_VISITS ||--o{ VISIT_EVIDENCE : contains
    CASES ||--o{ NOTICES : has
    CASES ||--o{ CASE_STATUS_HISTORY : tracks
    CASES ||--o{ CASE_FLAGS : generates
    OFFICERS ||--o{ NOTIFICATIONS : receives
```

---

# 27. Backend Principles

## Server-Side Validation
Backend validates:
- Required evidence
- Required report
- Role authorization
- Valid status transitions
- Required notice data

## Workflow Authority
Frontend requests actions.

Backend:
1. Validates
2. Performs transition
3. Stores history
4. Generates notifications where needed

## Preserve Existing Work
Do not unnecessarily break current complaint functionality.

Integrate incrementally.

---

# 28. Frontend and UX Direction

Important screens:
1. Dashboard
2. Complaint list
3. Complaint detail
4. BI work queue
5. BI field visit form
6. ATP review
7. Case detail
8. Status timeline
9. Notice details
10. Flagged cases
11. Analytics
12. Notifications

UX principle:

```text
Complaint
↓
Assignment
↓
Field Visit
↓
Evidence
↓
Report
↓
Review
↓
Case
↓
Action
```

A non-technical stakeholder should be able to follow this story visually.

---

# 29. Prototype Scope

## P0 — Must Work
- Existing complaint registration stable
- Assignment
- BI evidence
- BI report
- Backend validation
- ATP review
- Case creation
- Complaint-to-case linkage
- Proactive case
- Real-data analytics
- Flagged cases

## P1 — Strong Demo Value
- Section 270
- 3-day period
- Section 269
- Status timeline
- Notifications
- PWA setup

## P2 — Later
- WhatsApp
- Advanced scoring
- Fine-grained role analytics
- Full legal automation
- Advanced offline PWA

---

# 30. Prototype Demo Story

## Story A — Complaint to Case
1. Register complaint
2. Assign BI and ATP
3. BI visits
4. BI uploads evidence
5. BI writes report
6. ATP reviews
7. Show close/existing case/new case
8. Create actionable case
9. Demonstrate Section 270
10. Demonstrate expiry
11. Demonstrate reinspection
12. Demonstrate Section 269
13. Show analytics

## Story B — Proactive Case
BI independently:
- Finds violation
- Creates case
- Adds location
- Adds evidence
- Adds report

## Story C — Delayed Case
Show seeded/realistic old case:
- Old state timestamp
- Automatic flag
- Score
- Ranking
- Higher visibility

---

# 31. Single-Developer Plan

## Primary Developer
Focus on:
- Integration
- Database
- Backend
- Frontend wiring
- Analytics

## Yuvi Support
Focus on difficult/high-leverage work:
- Architecture
- Schema review
- Workflow edge cases
- Debugging blockers
- Analytics/scoring
- Notification/PWA decisions
- Documentation

## Phases

### Phase 1 — Stabilize
- Compare current branches
- Choose base
- Verify working features
- Find mock data
- Freeze scope

### Phase 2 — Data Foundation
- Cases
- Visits
- Evidence
- Status history
- Flags

### Phase 3 — Connected Workflow
- Complaint → BI visit
- BI validation
- ATP review
- Complaint → case
- Proactive case

### Phase 4 — Analytics
- Replace mocks
- KPI cards
- Pending/closed
- BI performance
- ATP context
- Flagged ranking

### Phase 5 — Demo Polish
- Realistic seed data
- Fix navigation
- Loading/error states
- Demo rehearsal
- Basic PWA

---

# 32. Two-Developer Plan

## Developer A — Backend/Data
- PostgreSQL schema
- Migrations
- Cases
- Visits/evidence
- Notices
- Status history
- Flags/scoring
- Notifications API
- Analytics queries

## Developer B — Frontend/UX
- Complaint/case screens
- BI forms
- ATP review
- Analytics dashboard
- Flagged cases
- Timeline
- PWA
- Notification UI
- Demo polish

Daily agreement should cover:
- API contracts
- Schema changes
- Workflow transitions

---

# 33. Yuvi's Support Role

Yuvi does not need to own all implementation.

Highest-value contribution:
- Architecture decisions
- Schema review
- Complaint/case relationship
- Difficult debugging
- Analytics design
- Scoring design
- Documentation
- Stakeholder presentation

---

# 34. Suggested 1–1.5 Week Prototype Timeline

## Day 1
- Compare `ad-dev` and `uv-dev`
- Choose base
- Run application
- Confirm database
- Freeze scope

## Day 2
- Connect BI form to backend
- Evidence upload
- Report validation

## Day 3
- Case model
- Complaint-to-case link
- ATP review
- Status history

## Day 4
- Proactive BI case
- Coordinates
- Evidence
- Reports

## Day 5
- Real analytics
- Pending/closed
- BI metrics
- ATP context

## Day 6
- Flagging
- Score ranking
- Notice demo data

## Day 7
- Notifications
- PWA basics
- End-to-end test

## Buffer
- Bugs
- UI polish
- Demo preparation
- Workflow corrections

---

# 35. What Must Not Delay the Prototype

Do not spend excessive prototype time on:
- Perfect legal automation
- Complete AI redesign
- Full role hierarchy
- Complex configurable scoring
- Full WhatsApp
- Perfect EXIF geotagging
- Extensive offline PWA
- Rebuilding working modules

Important principle:

> Prefer connecting existing screens to real data over building disconnected new screens.

---

# 36. Future Scope

Potential later work:
- Advanced RBAC
- Configurable officer/area mapping
- Advanced analytics
- Heatmaps and trends
- Configurable scoring
- WhatsApp integration
- Full offline PWA
- Building identity matching
- Duplicate complaint detection
- AI case summarization

---

# 37. Open Decisions and Verification

## Legal Verification
Verify official requirements for:
- Section 269
- Section 270
- Classifications
- Required documents

## Geotagging
Finalize:
- Camera approach
- Permission model
- Coordinate capture

## Score Formula
Finalize after workflow stabilizes.

## Flag Threshold
Current baseline:
- Approximately 3 weeks

Later configurable.

## Role-Specific Analytics
Prototype:
- Broadly same for ATP and above

Later:
- Fine-grained access.

## Existing Case Matching
Define how to identify:
- Same building
- Same location
- Existing matter

---

# 38. Master End-to-End Workflow

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

---

# 39. Implementation Priorities

## Priority 1 — Reality
Confirm:
- Current branch state
- What works
- What is mock
- Missing backend connections

## Priority 2 — Connected Workflow
Make this real:

```text
Complaint
→ Assignment
→ BI Visit
→ Evidence
→ Report
→ ATP Review
→ Case
```

## Priority 3 — Analytics
Because stakeholders care about it:
- Real data
- KPIs
- Performance
- Flagged cases

## Priority 4 — Notice Workflow
Demonstrate:
- 270
- Timer
- Reinspection
- 269

## Priority 5 — Notifications/PWA
Minimum viable implementation.

---

# 40. Definition of a Successful Prototype

A successful prototype should allow a non-technical stakeholder to understand:

> A complaint enters the system. Responsible officers are assigned. BI visits and submits evidence and a report. ATP reviews the matter. If an actionable violation exists, it becomes or links to a case. Notices and follow-up can be tracked. Serious matters gain higher-level visibility. Delayed cases are automatically flagged and ranked. Analytics show workload, performance and pending matters. Notifications support timely action.

Technically, the prototype should demonstrate:
- Real database persistence
- Connected frontend/backend
- Evidence handling
- Workflow validation
- Status history
- Complaint/case relationship
- Analytics from real operational data
- Delayed flags
- Scoring direction
- Notification/PWA readiness

---

# Final Guiding Principle

MCL Building Branch should not become a collection of unrelated features.

Every feature should improve at least one of:

1. Complaint workflow
2. BI field workflow
3. Case/enforcement lifecycle
4. Accountability
5. Analytics
6. Timely action
7. Stakeholder understanding

If it does not improve one of these, it should not take priority during the current prototype phase.

---

## Document Status

**Document:** MASTER.md

**Purpose:** Single master reference for project discussion, workflow, architecture, scope and implementation planning.

**Current prototype target:** Approximately 1–1.5 weeks.

**Workflow source:** Clarified project discussion. Legal details explicitly marked for future official verification.
