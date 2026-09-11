# MCL-BB --- Updated Operational Workflow v2

## Entry Path A --- External Case

Mail / document / complaint / ATP / officer → authorized user creates
case → BI assignment → site visit.

## Entry Path B --- BI Field Discovery

BI finds suspected violation → captures evidence → adds location/details
→ creates violation → field visit report.

## Unified Workflow

BI site visit → report + evidence → invalid/no action **or** BI issues
challan directly → challan image → notice period.

## Challan Notifications

-   Challan recipient: yes
-   Property owner: yes
-   Zone ATP: yes
-   BI: successful action confirmation

## Notice

Day 0: challan issued\
Midpoint: reminder to challan recipient\
Expiry: compliance check

Exact duration: TBD and configurable.

## Resolved

Corrective action → ATP/higher authority updates status →
resolved/closed.

## Non-compliant

Notice expires → BI reinspection → detailed report/evidence → ATP/MTP/JC
escalation → existing government process → final outcome recorded.

## Notification Matrix

  ----------------------------------------------------------------------------------------------------------
  Event       BI             ATP                MTP                JC                 Recipient   Owner
  ----------- -------------- ------------------ ------------------ ------------------ ----------- ----------
  Case        Yes            Optional           No                 No                 No          No
  assigned                                                                                        

  Challan     Confirmation   Yes                Configurable       Configurable       Yes         Yes
  issued                                                                                          

  Midway      No             Dashboard          Optional           Optional           Yes         Optional
  reminder                                                                                        

  Notice      Yes            Yes/configurable   Yes/configurable   Yes/configurable   No          No
  expired                                                                                         

  Follow-up   Confirmation   Yes                Yes                Yes                No          No
  report                                                                                          
  ----------------------------------------------------------------------------------------------------------

``` mermaid
flowchart TD
A[Case Entry] --> B1[External Case]
A --> B2[BI Field Discovery]
B1 --> C1[Register and Assign BI]
B2 --> C2[Create Violation Record]
C1 --> D[BI Site Visit]
C2 --> D
D --> E[Visit Report + Evidence]
E --> F{Action Required?}
F -->|No| G[Invalid / No Action]
G --> H[Closed]
F -->|Yes| I[BI Issues Challan]
I --> J[Upload Challan Image]
J --> K[Record Challan]
K --> L[Notify Recipient / Owner / ATP]
K --> M[Start Notice]
M --> N[Midway Reminder]
N --> O{Resolved?}
O -->|Yes| P[Authorized Status Update]
P --> Q[Closed]
O -->|No| R[Expiry]
R --> S[BI Reinspection]
S --> T[Follow-up Report]
T --> U[ATP / MTP / JC]
U --> V[Government Process]
```
