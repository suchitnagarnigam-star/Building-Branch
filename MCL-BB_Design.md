# MCL-BB — Frontend Design Specification

---

## Design Intent

MCL-BB is a civic operations tool used by municipal officers and documentation operators in Ludhiana. The interface must feel trustworthy, fast, and low on visual noise. It is not a consumer product — it is a daily-use internal tool. The design should communicate authority and clarity, not energy or personality. Operators process many complaints per shift; the interface should minimise cognitive load and let them work without reading the screen.

---

## Token System

### Color Palette

| Name | Hex | Role |
|---|---|---|
| `--navy` | `#1A2A4A` | Primary brand, sidebar background |
| `--navy-light` | `#243557` | Sidebar hover, active state |
| `--slate` | `#F2F4F8` | Page background |
| `--white` | `#FFFFFF` | Card and panel surfaces |
| `--ink` | `#1C1C1E` | Primary text |
| `--muted` | `#6B7280` | Secondary text, labels |
| `--border` | `#E4E6EB` | Dividers, card borders |
| `--accent` | `#2563EB` | Primary actions, links, active nav |
| `--accent-light` | `#EFF4FF` | Active nav background tint |
| `--success` | `#16A34A` | Approved / closed status |
| `--warning` | `#D97706` | Pending / in progress status |
| `--danger` | `#DC2626` | Rejected / error status |
| `--neutral-status` | `#6B7280` | Registered / assigned status |

### Typography

Single typeface: **Inter** (Google Fonts).

| Role | Size | Weight | Usage |
|---|---|---|---|
| Page title | 20px | 600 | Top navbar page name |
| Section heading | 16px | 600 | Card headers, section labels |
| Body | 14px | 400 | Form labels, table data, descriptions |
| Small / meta | 12px | 400 | Timestamps, status badges, helper text |
| Button | 14px | 500 | All buttons |
| Input | 14px | 400 | Form fields |

Line height: 1.6 for body. No all-caps labels. No tracked-out eyebrows.

### Spacing

| Token | Value |
|---|---|
| `--space-xs` | 4px |
| `--space-sm` | 8px |
| `--space-md` | 16px |
| `--space-lg` | 24px |
| `--space-xl` | 32px |
| `--space-2xl` | 48px |

### Border Radius

| Element | Radius |
|---|---|
| Cards, panels | `8px` |
| Buttons | `6px` |
| Inputs | `6px` |
| Badges / pills | `20px` |
| Sidebar items | `6px` |

### Shadows

```css
--shadow-card: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
--shadow-dropdown: 0 4px 12px rgba(0,0,0,0.12);
--shadow-modal: 0 8px 32px rgba(0,0,0,0.16);
```

---

## Layout Architecture

The app uses a fixed two-column shell: a left sidebar and a main content area with a top navbar.

```
┌──────────────────────────────────────────────────┐
│  TOP NAVBAR (fixed, 56px tall, full width)       │
├────────────┬─────────────────────────────────────┤
│            │                                     │
│  SIDEBAR   │   MAIN CONTENT AREA                 │
│  (fixed,   │   (scrollable)                      │
│  240px)    │                                     │
│            │                                     │
│            │                                     │
└────────────┴─────────────────────────────────────┘
```

- Sidebar: fixed, 240px wide, `--navy` background, full viewport height minus navbar
- Top navbar: fixed, 56px tall, white background, `border-bottom: 1px solid var(--border)`
- Main content: `margin-left: 240px`, `padding-top: 56px`, scrollable, `background: var(--slate)`
- Content inner max-width: `1100px`, centered with `padding: 24px`

---

## Top Navbar

**Height:** 56px  
**Background:** `--white`  
**Border:** `1px solid var(--border)` on bottom  

### Left section
- MCL logo or wordmark (small, 24px tall)
- Current page name (16px, 600 weight, `--ink`) — updates as the user navigates

### Right section (flex row, gap 12px)
- **Search** — icon button (`ti-search`). Opens a global search overlay on click. Searches complaints by ID, citizen name, or ward.
- **Notifications** — icon button (`ti-bell`) with a red dot badge if unread. Dropdown shows last 5 notifications (new complaint assigned, resolution submitted, approval required).
- **User menu** — avatar circle (initials) + name + designation. Dropdown with: Profile, Settings, Logout.

---

## Sidebar

**Width:** 240px  
**Background:** `--navy`  
**Text:** `#CBD5E1` (default), `#FFFFFF` (active/hover)  
**Position:** Fixed left, below navbar  

### Top section
- App name: **MCL-BB** in white, 15px, 600 weight
- Subtitle: "Complaint Management" in `#94A3B8`, 12px

### Navigation items

Each nav item: 40px tall, `border-radius: 6px`, `padding: 0 12px`, full width.

Active state: `background: var(--navy-light)`, left border `3px solid var(--accent)`, text white.  
Hover state: `background: rgba(255,255,255,0.06)`, text white.

| Icon | Label | Route | Visible to |
|---|---|---|---|
| `ti-layout-dashboard` | Dashboard | `/dashboard` | All |
| `ti-file-plus` | New complaint | `/complaints/new` | Operator |
| `ti-list` | All complaints | `/complaints` | All |
| `ti-user` | My complaints | `/complaints/mine` | Officer, ATP, MTP |
| `ti-clock-hour-3` | Pending approval | `/complaints/pending` | ATP, MTP, JC, C |
| `ti-chart-bar` | Analytics | `/analytics` | All |
| `ti-users` | Officers | `/officers` | Admin / ATP+ |
| `ti-settings` | Settings | `/settings` | Admin |

### Bottom section (pinned to bottom of sidebar)
- Logged-in user: avatar circle + name (white) + designation (`#94A3B8`, 12px)
- Logout button: `ti-logout`, `#94A3B8`, hover red tint

---

## Status Badge System

Used consistently across all complaint lists, detail screens, and dashboards.

| Status | Color | Badge style |
|---|---|---|
| Registered | `--neutral-status` | Gray pill |
| Assigned | `#2563EB` | Blue pill |
| In progress | `--warning` | Amber pill |
| Resolution submitted | `#7C3AED` | Purple pill |
| Pending approval | `--warning` | Amber pill |
| Approved / Closed | `--success` | Green pill |
| Rejected | `--danger` | Red pill |
| Rework required | `--danger` | Red pill |

Badge: `padding: 3px 10px`, `border-radius: 20px`, `font-size: 12px`, `font-weight: 500`, background is 10% opacity of the text color.

---

## Screen Specifications

---

### 1. Login Screen

**Route:** `/login`  
**Layout:** Centered card, no sidebar, no navbar. Full-height slate background.

**Card** (400px wide, white, `border-radius: 12px`, `padding: 40px`):
- MCL logo (top center)
- Heading: "Sign in to MCL-BB" (20px, 600)
- Subtext: "Ludhiana Municipal Corporation — Complaint Management" (13px, muted)
- Divider

**Fields:**
- Username — text input, full width
- Password — password input, full width, show/hide toggle (`ti-eye` / `ti-eye-off`)
- Designation — select dropdown (Inspector, ATP, MTP, JC, C, Operator)

**Buttons:**
- "Sign in" — primary, full width, `--accent` background. On success → Dashboard.

**Error state:**
- Inline red helper text below the password field: "Incorrect username or password."

---

### 2. Dashboard

**Route:** `/dashboard`  
**Layout:** Full layout with sidebar + navbar.  
**Page title in navbar:** "Dashboard"

#### Stat cards row (4 cards, equal width, `gap: 16px`)

Each card: white background, `border-radius: 8px`, `padding: 20px`, `--shadow-card`.

| Card | Value | Sub-label |
|---|---|---|
| Total complaints | count | All time |
| Open complaints | count | Registered + Assigned + In progress |
| Pending approval | count | Awaiting ATP / MTP sign-off |
| Closed today | count | Approved today |

Card layout: large number (28px, 600), label below (13px, muted), small colored icon top-right.

#### Complaints table (below stat cards)

**Header row:**
- "Recent complaints" (16px, 600)
- Right side: filter bar — Zone dropdown, Block dropdown, Ward dropdown, Status dropdown (all small selects, inline)
- "Export" button (ghost, `ti-download`)

**Table columns:**
- Complaint ID
- Citizen
- Ward
- Assigned officer
- Status (badge)
- Registered (date)
- Action (`ti-eye` icon → complaint detail)

**Table behavior:**
- 10 rows per page, pagination at bottom
- Clicking any row → Complaint detail screen
- Sortable by: Registered date, Status

---

### 3. New Complaint — Entry Method

**Route:** `/complaints/new`  
**Page title:** "New complaint"

Two large option cards, centered, stacked vertically (or side by side on wide screens):

**Card A — Manual entry**
- Icon: `ti-edit` (32px, `--accent`)
- Heading: "Fill in the form"
- Body: "Enter complaint details manually. Use when the operator has received the complaint by phone or email."
- Button: "Start manual entry" → `/complaints/new/manual`

**Card B — Upload image or PDF**
- Icon: `ti-file-upload` (32px, `--accent`)
- Heading: "Upload a document"
- Body: "Upload a scanned complaint form or PDF. The system will extract the details automatically."
- Button: "Upload file" → `/complaints/new/upload`

---

### 4. Complaint Form — Manual Entry

**Route:** `/complaints/new/manual`  
**Page title:** "Register complaint"  
**Layout:** Single column, max-width 720px, white card, `padding: 32px`

**Section: Citizen details**
- Citizen name — text input (required)
- Phone number — tel input (required), 10-digit validation

**Section: Location**

The three dropdowns are interdependent. Selecting any one auto-fills or filters the others.

- Zone — select (Zone-A, Zone-B, Zone-C, Zone-D)
- Block — select (filters based on Zone. If Block selected first, Zone auto-fills.)
- Ward — select (filters based on Block. If Ward selected first, Zone and Block auto-fill.)
- Address — textarea, 3 rows (required)

Helper text below Ward: "Selecting any one field will auto-fill the others."

**GIS mapping (collapsible section, collapsed by default)**
- Toggle: "Add location pin (optional)" with `ti-map-pin` icon
- When expanded: pincode text input + Leaflet map embed (280px tall)
- Helper: "This is for visual reference only and does not affect officer mapping."

**Section: Complaint details**
- Complaint title — text input (required)
- Complaint description — textarea, 5 rows (required)

**Section: Attachments**
- File upload area — dashed border, `border-radius: 8px`, `padding: 24px`, center-aligned text: "Drop files here or click to upload"
- Accepts: JPG, PNG, PDF
- After upload: thumbnail grid with filename, size, and remove (`ti-x`) button per file

**Form footer (sticky bottom bar on scroll)**
- "Cancel" — ghost button → Dashboard
- "Submit complaint" — primary button → triggers mapping → Confirmation screen

**Validation:**
- All required fields highlighted red on failed submit
- Inline error message below each invalid field

---

### 5. Upload — Image / PDF

**Route:** `/complaints/new/upload`  
**Page title:** "Upload complaint document"  
**Layout:** Single column, max-width 600px, white card, `padding: 32px`

**Upload zone:**
- Large dashed box (full width, 200px tall)
- `ti-upload` icon (40px, muted)
- "Drop your file here, or click to browse"
- Accepts: JPG, PNG, PDF
- Shows filename + size after selection

**Processing state (replaces upload zone):**
- Spinner animation
- "Reading document…" → "Extracting fields…"
- Estimated: 3–8 seconds

**Actions:**
- "Process document" — primary button (disabled until file selected)
- "Cancel" — ghost → Dashboard

On success → OCR Preview screen.  
On error → inline error: "Could not extract data from this file. Try a clearer scan or enter manually."

---

### 6. OCR Preview and Edit

**Route:** `/complaints/new/preview`  
**Page title:** "Review extracted data"  
**Layout:** Same as manual form, max-width 720px, white card

**Top banner:**
- Info strip: `ti-sparkles` icon — "Fields were filled from your uploaded document. Review and correct before submitting."
- Background: `--accent-light`, border-left `3px solid --accent`

**Fields (same as manual form, pre-filled, fully editable):**

Low-confidence fields (LLM uncertain) are highlighted:
- Yellow left border on the input
- Helper text below: "Check this field — extracted with low confidence."

**Uploaded file preview:**
- Thumbnail sidebar (right side, 180px wide on desktop): shows the uploaded image or a PDF page preview
- Operator can cross-reference as they edit

**Actions (sticky footer):**
- "Re-upload" — ghost → Upload screen
- "Submit complaint" — primary → Mapping → Confirmation

---

### 7. Confirmation Screen

**Route:** `/complaints/confirm/:id`  
**Page title:** "Complaint registered"  
**Layout:** Single column, max-width 560px, centered

**Success banner:**
- `ti-circle-check` icon (40px, green)
- "Complaint registered" (20px, 600)
- Complaint ID in large monospace: `MCL-BB-0042` (accent color)

**Details panel (white card):**
- Complaint title
- Ward
- Assigned officer — name + phone (click to call on mobile)
- Assigned ATP — name
- WhatsApp notification — "Sent ✓" (green)

**Actions:**
- "View complaint" — primary → Complaint detail
- "Register another" — ghost → New complaint entry
- "Back to dashboard" — ghost → Dashboard

---

### 8. All Complaints List

**Route:** `/complaints`  
**Page title:** "Complaints"

**Toolbar:**
- Left: search input (complaint ID, citizen name, ward) with `ti-search` icon
- Right: Zone / Block / Ward / Status filters (small selects) + "Export CSV" button

**Table:** Same columns as dashboard table but full pagination (20 per page).  
**Empty state:** `ti-file-off` icon + "No complaints match your filters."

---

### 9. Complaint Detail

**Route:** `/complaints/:id`  
**Page title:** Complaint ID (`MCL-BB-0042`)  
**Layout:** Two-column on desktop (content left, sidebar right), single column on mobile

#### Left — main content

**Header:**
- Complaint ID (14px, muted) above title
- Complaint title (20px, 600)
- Status badge + registered date
- "Back" breadcrumb: `← All complaints`

**Citizen and location panel (white card):**
- Grid: Citizen name | Phone | Zone | Block | Ward | Address

**Complaint details panel (white card):**
- Title
- Description (full)
- Attachments: thumbnail grid, each thumbnail opens full-size on click

**Activity timeline (white card):**
- Vertical timeline — each entry: colored dot + status label + timestamp + actor name
- Order: newest at top
- Entry types: Registered, Assigned, In progress, Resolution submitted, Pending approval, Approved, Rejected

#### Right — sidebar panel (280px)

**Assignment card:**
- Assigned officer(s): avatar + name + phone
- ATP: name

**Status card:**
- Current status badge (large)
- Days open counter

**Action card (role-dependent):**

*Operator sees:*
- "Edit complaint" — ghost
- No approval or resolution actions

*Officer sees:*
- "Submit resolution" — primary button → opens resolution modal

*ATP / MTP sees:*
- "Approve and close" — success button
- "Reject resolution" — danger ghost button

No action card shown if complaint is already Closed.

---

### 10. Resolution Modal

**Trigger:** "Submit resolution" button on complaint detail  
**Type:** Modal overlay, max-width 520px

**Content:**
- Heading: "Submit resolution"
- Subtext: "Once submitted, this complaint moves to 'Pending approval' and cannot be closed by you."
- Resolution notes — textarea (required), 5 rows
- Resolution photos — file upload, optional (JPG, PNG)

**Actions:**
- "Submit" — primary
- "Cancel" — ghost (closes modal)

On submit → complaint status updates to "Resolution submitted" → "Pending approval" → modal closes → detail screen refreshes.

---

### 11. Approve / Reject Modal

**Trigger:** "Approve and close" or "Reject resolution" buttons (ATP / MTP only)

**Approve modal:**
- Heading: "Approve and close complaint"
- Approval notes — textarea, optional
- Warning text: "This action is final. The complaint will be marked closed."
- "Confirm approval" — success button
- "Cancel" — ghost

**Reject modal:**
- Heading: "Reject resolution"
- Rejection reason — textarea, required
- "Send back to officer" — danger button
- "Cancel" — ghost

On approve → status: Approved / Closed → DB + Sheets sync → detail refreshes.  
On reject → status: Rejected / Rework required → officer notified → detail refreshes.

---

### 12. Analytics Dashboard

**Route:** `/analytics`  
**Page title:** "Analytics"

**Filter bar (top, sticky):**
- Date range picker (Last 7 days / 30 days / 90 days / Custom)
- Zone, Block, Ward dropdowns
- Designation filter (show data for: All / Inspector / ATP)

**Row 1 — Stat cards (same as dashboard, but with trend delta):**
- Total complaints: count + "+12 this week" in green/red

**Row 2 — Charts (two equal columns):**
- Left: "Complaints by status" — horizontal bar chart (one bar per status)
- Right: "Complaints over time" — line chart, X = date, Y = count

**Row 3 — Top performers table:**
- Columns: Officer name | Zone | Complaints assigned | Resolved | Avg days to resolve | Approval rate
- Sorted by resolved count descending by default

**Row 4 — Zone breakdown:**
- Card per zone (A, B, C, D)
- Mini bar: open vs closed vs pending

---

### 13. Officers List

**Route:** `/officers`  
**Page title:** "Officers"

**Table columns:**
- Name
- Designation
- Zone
- Blocks (comma-separated)
- Wards (count, e.g. "5 wards")
- Active complaints
- Actions: `ti-eye` (view) | `ti-edit` (edit)

**Add officer button (top right):** "Add officer" → officer form modal

**Officer form modal fields:**
- Name, phone, designation (select), department, zone (select), blocks (multi-select), wards (multi-select)

---

## Component Library

### Buttons

```
Primary:   background --accent, white text, hover darken 8%
Ghost:     transparent, --border border, --ink text, hover --slate background
Danger:    transparent, --danger border, --danger text, hover --danger bg at 8% opacity
Success:   transparent, --success border, --success text, hover --success bg at 8% opacity
Disabled:  50% opacity, cursor not-allowed
```

All buttons: `height: 36px`, `padding: 0 16px`, `border-radius: 6px`, `font-size: 14px`, `font-weight: 500`.

### Inputs

```
height: 36px
padding: 0 12px
border: 1px solid var(--border)
border-radius: 6px
font-size: 14px
background: white

focus:  border-color: --accent, box-shadow: 0 0 0 3px rgba(37,99,235,0.12)
error:  border-color: --danger, helper text in --danger below
```

Textarea: same border/focus, `min-height: 96px`, `resize: vertical`.

### Cards

```
background: white
border: 1px solid var(--border)
border-radius: 8px
padding: 20px 24px
box-shadow: var(--shadow-card)
```

Section heading inside card: 15px, 600, `--ink`, `margin-bottom: 16px`, optional `border-bottom: 1px solid var(--border)` + `padding-bottom: 12px`.

### Tables

```
width: 100%
border-collapse: collapse
font-size: 14px

th: background --slate, 12px, 500, --muted, padding 10px 16px, text-align left
td: padding 12px 16px, border-bottom 1px solid var(--border)
tr:hover: background #F8F9FB
```

---

## Responsive Behavior

| Breakpoint | Changes |
|---|---|
| > 1024px | Full two-column layout. Sidebar always visible. |
| 768–1024px | Sidebar collapses to icon-only (48px wide). Tooltip on hover shows label. |
| < 768px | Sidebar hidden. Top navbar shows hamburger (`ti-menu-2`). Sidebar slides in as drawer overlay. Two-column complaint detail collapses to single column. |

---

## Notification Dropdown

Triggered by `ti-bell` in navbar. Appears as a popover below the icon, `min-width: 320px`, `box-shadow: var(--shadow-dropdown)`.

**Each notification item:**
- Colored left border (matches status color)
- Title (14px, 500): e.g. "Resolution submitted — MCL-BB-0042"
- Body (12px, muted): officer name + ward
- Timestamp (12px, muted): "2 hours ago"
- Unread dot (blue, 6px) on the right if unread

**Footer:**
- "Mark all as read" — text button
- "View all notifications" → future full notifications page

---

## Empty States

Used when a table or list has no results.

```
Centered vertically in the container
ti-{relevant icon} at 40px, --muted color
Heading: 15px, 500, --ink  e.g. "No complaints found"
Body: 13px, --muted        e.g. "Try adjusting your filters."
Optional: primary CTA button
```

---

## Toast Notifications

System feedback after actions (complaint submitted, status updated, error).

**Position:** Bottom-right corner, stacked if multiple  
**Width:** 320px  
**Duration:** 4 seconds auto-dismiss (error toasts stay until dismissed)

```
Success:  green left border, ti-check icon
Error:    red left border,   ti-alert-circle icon
Info:     blue left border,  ti-info-circle icon
```

Content: one-line message (14px). Optional "Undo" or "View" text link.

---

## Implementation Notes

- Use **React** with a component library (Shadcn/ui or plain CSS modules) for the portal
- All icons from **Tabler Icons** (outline only)
- Font loaded from Google Fonts: `Inter`, weights 400 + 500 + 600
- Sidebar nav items rendered conditionally based on `user.role` from auth context
- Complaint status badge color driven by a single `statusConfig` map — never inline
- All dropdowns in the complaint form (Zone / Block / Ward) share a single `useLocationState` hook that handles interdependency logic
- Form validation with **React Hook Form** or native HTML5 + custom error display
- Tables use client-side pagination for MVP; replace with server-side when complaint volume grows

---

## Key Design Rules (Non-Negotiable)

1. Sidebar is always `--navy`. No other background color for the sidebar.
2. All status badges use the defined status color map. No ad-hoc colors.
3. Role-dependent action buttons are rendered conditionally — never shown and disabled.
4. The complaint form "Submit" button is the only primary button on the screen.
5. All form fields show inline errors, not a summary block at the top.
6. The confirmation screen is always shown after submission — never skip straight to the list.
7. Officer and ATP names on the confirmation screen are always links to their profiles.
8. Modals always have a cancel button. Destructive actions always require a confirmation modal.
9. Empty states always have a next action — never just a message.
10. Mobile sidebar is a drawer, not a collapsed icon bar.
