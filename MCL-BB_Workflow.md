# MCL-BB — Updated MVP Workflow

## 1. Main Change

There will be **no citizen dashboard**.

Citizens can report complaints through calls, emails, or other channels. The **documentation operator** enters those complaints into the application.

The operator will:
1. Receive the complaint.
2. Enter all details in the form.
3. Upload complaint images/multimedia.
4. Select Zone → Block → Ward.
5. Submit the complaint.
6. The system automatically maps the responsible officer(s) and ATP.
7. Notifications are sent to the relevant people.

---

## 2. Location Structure

Ludhiana has:

```text
4 Zones
├── Zone-A
├── Zone-B
├── Zone-C
└── Zone-D
```

There are **13 blocks**.

Important: **one officer can be assigned to multiple blocks**.

Do not design the system as:

```text
1 officer = 1 block
```

Instead:

```text
Officer A → Block 1 + Block 4
Officer B → Block 2 + Block 5 + Block 7
```

The mapping must come from data, not hard-coded assumptions.

---

## 3. Complaint Registration Form

The operator should enter:

```text
Citizen name
Phone number
Complaint title
Complaint description
Zone
Block
Ward
Complaint address/location
Images / multimedia
```

Location selection remains:

```text
Zone → Block → Ward
```

---

## 4. Automatic Mapping

After submission:

```text
Complaint
   ↓
Zone
   ↓
Block
   ↓
Ward
   ↓
Find responsible officer(s)
   ↓
Find relevant ATP
   ↓
Send notifications
```

The mapping must support an officer having multiple blocks/wards.

---

## 5. Officer Hierarchy

The workflow is:

```text
Inspector / Officer
        ↓
      ATP
        ↓
      MTP
        ↓
       JC
        ↓
        C
```

The complaint should move through the required authority levels as needed.

---

## 6. Resolution Is Not Closure

This is a critical rule.

When the Inspector/Officer completes the work and submits a resolution:

```text
Inspector/Officer
       ↓
Resolution Submitted
       ↓
Pending Higher Approval
```

The complaint **must not close automatically**.

It closes only after approval by the appropriate higher authority, such as:

```text
ATP / MTP
```

Suggested status flow:

```text
Registered
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

If approval is rejected:

```text
Pending Approval
   ↓
Rejected / Rework Required
   ↓
Inspector/Officer
   ↓
Resolution Submitted again
```

Resolution submission and final closure must remain separate.

---

## 7. Notifications

After registration and mapping, notify:

- Assigned Inspector/Officer
- Relevant ATP

Later, notifications can also be sent when:
- Officer submits a resolution.
- ATP/MTP approves or rejects the resolution.

For the first MVP, keep notification implementation simple.

---

## 8. Multimedia

The operator should be able to upload complaint images/multimedia.

The complaint record should store file information such as:

```text
file name
file type
file path / URL
upload time
```

Do not put image binary data directly into `complaints.json`.

For the local MVP, a simple uploads folder is enough. Cloud storage can be added later.

---

## 9. Complaint Data

A complaint should contain roughly:

```text
complaintId

citizen
├── name
└── phone

complaint
├── title
├── description
└── address

location
├── zone
├── block
└── ward

multimedia
└── uploaded files

assignment
├── inspector/officer
└── ATP

workflow
├── current status
├── resolution
├── approval status
└── approval authority

timestamps
├── createdAt
├── resolutionSubmittedAt
└── closedAt
```

Exact fields can be finalized during implementation.

---

## 10. Officer Data

Officer records must support multiple blocks:

```json
{
  "officerId": "OFF-001",
  "name": "Officer Name",
  "designation": "Inspector",
  "department": "B&R",
  "zone": "Zone-A",
  "blocks": ["Block-1", "Block-4"],
  "wards": ["Ward-2", "Ward-3"]
}
```

Higher authorities such as ATP, MTP, JC and C should also have their own role/records.

Their approval responsibilities should be separate from basic location mapping.

---

## 11. What Changes in the Current Project

### Remove / do not build
- Citizen dashboard
- Citizen login
- Citizen complaint tracking

### Keep
- Complaint registration form
- Zone → Block → Ward
- Backend API
- Local JSON storage for MVP
- Automatic officer mapping
- Complaint ID generation

### Add
- Documentation operator workflow
- Multimedia upload
- Multiple-block officer mapping
- ATP mapping
- Notifications
- Resolution submission
- ATP/MTP approval
- Separate resolution and closure states
- Workflow/history data

---

## 12. Recommended Implementation Order

```text
1. Update complaint form for operator workflow
        ↓
2. Add multimedia upload
        ↓
3. Update officer data
        ↓
4. Update mapping for multiple blocks
        ↓
5. Add ATP mapping
        ↓
6. Update complaint JSON structure
        ↓
7. Add workflow/status handling
        ↓
8. Add resolution submission
        ↓
9. Add ATP/MTP approval
        ↓
10. Add notifications
        ↓
11. Add final closure logic
```

## Key Rules

1. No citizen dashboard.
2. Documentation operator enters complaints received through calls/emails/etc.
3. Location hierarchy is **Zone → Block → Ward**.
4. There are 4 zones and 13 blocks.
5. One officer can handle multiple blocks.
6. Mapping is automatic and data-driven.
7. Inspector/Officer and ATP should be notified.
8. Resolution submission does **not** close a complaint.
9. Higher-authority approval is required for closure.
10. Keep resolution and closure as separate states.
11. Keep the MVP simple and avoid unnecessary technologies.
