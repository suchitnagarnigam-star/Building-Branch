# MCL-BB Field Inspection & Violation Report --- UI + Logic Refinement Brief

## Purpose

Refine the existing **Field Inspection & Violation Report** page in the
MCL-BB React application.

The current implementation is only a rough functional UI. The next
implementation must make the page look and behave like a professional
internal municipal/government application while reusing the project's
existing data and architecture.

**Do not create hardcoded officer or block data.**

------------------------------------------------------------------------

# 1. Existing Project Context

MCL-BB is a Building Complaint Monitoring System for the Municipal
Corporation Ludhiana.

Current stack:

-   Frontend: React 19 + TypeScript + Vite
-   Backend: Node.js + Express + TypeScript
-   Existing backend API: `GET /api/officers`
-   Officer source of truth: `server/data/officers.json`
-   Existing location mapping/data already exists in the project.
-   Existing lightweight routing uses hash routes.
-   New page route: `/field-inspection`

The existing application already has a professional government-style
shell with:

-   Punjab Government / Municipal Corporation Ludhiana header
-   Dark blue sidebar
-   MCL-BB branding
-   Dashboard
-   New Complaint
-   Field Inspection
-   All Complaints
-   Analytics
-   Officers
-   Settings

Do not redesign the entire application shell unless necessary. The main
task is to make the **Field Inspection page** professionally designed
and consistent with the existing application.

------------------------------------------------------------------------

# 2. Current Field Inspection Page

Current file:

``` text
Frontend/src/pages/FieldInspectionPage.tsx
```

The current page contains these sections:

1.  Report Information
2.  Location & Jurisdiction
3.  Building & Violator Details
4.  Location Evidence
5.  NOTICE UNDER SECTION 270(1) / PMC ACT, 1976
6.  Cancel / Register Inspection actions

The current page is visually poor because:

-   The form fields are stretched almost across the entire page.
-   The form does not use the available horizontal space effectively.
-   Radio buttons are badly positioned and appear far away from their
    labels.
-   Sections do not have enough visual hierarchy.
-   The page looks like a raw HTML form instead of a professional
    application.
-   The ATP field looks like a disabled/empty placeholder rather than
    mapped information.
-   GPS capture is visually weak.
-   Photo upload/capture area is too basic.
-   The notice section is barely visible.
-   Required fields are not visually emphasized enough.
-   The action area is too small and disconnected from the form.
-   There is too much unused/poorly structured whitespace.
-   There are no useful loading/error states for real data.
-   Officer and block data are currently hardcoded and must be removed.

------------------------------------------------------------------------

# 3. CRITICAL DATA REQUIREMENT --- officers.json

There is already a real officer roster:

``` text
server/data/officers.json
```

Do NOT hardcode values such as:

``` text
Officer 1
Officer 2
Officer 3
```

or create another duplicate officer dataset in the frontend.

The backend already exposes:

``` text
GET /api/officers
```

Use that existing API.

The officer records contain fields such as:

``` json
{
  "officerId": "OFF-001",
  "name": "Sh. Kapil Dev",
  "mobile": "90410-22742",
  "designation": "ATP",
  "zone": "A",
  "blocks": ["2", "3", "4", "5"]
}
```

The actual roster includes BI, ATP and other BI-related designations.

## Reporting Officer

For the current MVP:

-   Show a dropdown populated from the real `/api/officers` data.
-   Store/use the `officerId` as the selected value.
-   Display the officer's name clearly.
-   Prefer showing designation alongside the name where useful.

Example:

``` text
Select Reporting Officer

Sh. Kapil Dev                         ATP
Sh. Gurwinder Singh                  BI
Sh. Harminder Makkar                 BI
...
```

Do not hardcode these options.

### Future authentication requirement

The long-term design is:

``` text
currentLoginUser
        ↓
Reporting Officer
```

The reporting officer should eventually be automatically derived from
the logged-in user rather than selected manually.

However, **do not redesign authentication now**.

For the current MVP, keep the dropdown but make it use real officer
data. Structure the code so that replacing the dropdown with
`currentLoginUser` later is straightforward.

------------------------------------------------------------------------

# 4. ATP Mapping Requirement

Do not use a hardcoded ATP field.

The supervising ATP must be derived from the selected location.

The officer data contains:

-   `designation`
-   `zone`
-   `blocks`

Therefore, after a block is selected:

``` text
Selected Block
      ↓
Zone
      ↓
Find officer where:
  designation === "ATP"
  AND zone matches
  AND blocks contains selected block
      ↓
Supervising ATP
```

Example:

``` text
Block: 3
Zone: A

Supervising ATP:
Sh. Kapil Dev
ATP
90410-22742
```

The ATP should be displayed as a professional read-only information
card, not as a blank disabled-looking input.

For example:

``` text
SUPERVISING ATP

Sh. Kapil Dev
ATP • Zone A

📞 90410-22742
```

If no ATP is found:

``` text
No supervising ATP could be mapped for this block.
```

Do not invent an ATP.

------------------------------------------------------------------------

# 5. Block and Zone Data

Do NOT hardcode:

``` text
Block 1
Block 2
Block 3
```

Use the existing location data/mapping already present in the project.

The project already follows the rule:

``` text
Block → Zone
```

Zone should be derived from the selected block.

The backend is authoritative for final submission, but the frontend
should provide immediate UI feedback.

Desired behavior:

``` text
Select Block
      ↓
Automatically determine Zone
      ↓
Display Zone as read-only mapped information
      ↓
Use Block + Zone to map ATP
```

Do not make Zone an independently editable field if it is derived from
Block.

Do not create a second independent block-zone dataset unless the
existing project architecture requires it.

------------------------------------------------------------------------

# 6. Required Form Structure

Keep the following overall structure.

## Section 1 --- Report Information

Fields:

### Source of Report \*

Options:

-   Complaint Based
-   Field Visit

Use a professional segmented/radio control instead of plain browser
radio buttons.

### Reporting Officer \*

Current MVP:

-   Real officer dropdown from `/api/officers`.

Future:

-   Automatically populated from `currentLoginUser`.

### Supervising Official / ATP

Automatically mapped from selected Block.

Show:

-   Name
-   Designation
-   Mobile
-   Zone if useful

Do not make it manually editable.

------------------------------------------------------------------------

# 7. Section 2 --- Location & Jurisdiction

Fields:

### Block \*

Real block dropdown.

### Zone

Auto-mapped from Block.

Read-only.

### Ward

Optional text input.

Do not create a Ward dependency or Ward dropdown.

### Location / Landmark \*

Text input.

Use a clear placeholder such as:

``` text
Enter exact location, property address or nearby landmark
```

### GPS Location \*

Provide a professional location capture component.

Before capture:

``` text
GPS location not captured
```

Button:

``` text
Capture Current Location
```

After successful capture, display something like:

``` text
Location captured

Latitude: 30.xxxxx
Longitude: 75.xxxxx
Accuracy: ±12 m
```

Include loading and error states.

Do not use fake coordinates.

Use browser/device geolocation when implementing the actual
functionality.

------------------------------------------------------------------------

# 8. Section 3 --- Building & Violator Details

### Building Type \*

Use a professional segmented/card selection:

-   Residential
-   Commercial
-   Industrial
-   Other

If `Other` is selected:

``` text
Specify Building Type *
```

appears.

### Violator Name \*

Text input.

### Mobile Number

Optional.

### Brief Description / Construction Details \*

Large textarea.

The field should comfortably support detailed descriptions.

------------------------------------------------------------------------

# 9. Section 4 --- Location Evidence

This section is important.

Label:

``` text
Geotagged Photos *
```

Provide a professional upload/capture area rather than two small plain
buttons.

Recommended design:

``` text
┌─────────────────────────────────────────────┐
│                                             │
│          📷                                 │
│      Add inspection photos                  │
│                                             │
│  Capture a photo or upload from device      │
│                                             │
│  [ Capture Photo ]  [ Upload Photo ]        │
│                                             │
└─────────────────────────────────────────────┘
```

After photos are added:

-   Show thumbnails.
-   Show filename if appropriate.
-   Allow removing an image.
-   Show geolocation status for each photo when available.
-   Make it obvious that these are inspection evidence photos.

Important:

A geotagged photo should eventually have location information captured
at inspection time.

Do not rely only on EXIF metadata.

The application should capture/store:

``` text
latitude
longitude
accuracy
timestamp
```

for the photo/inspection location when the real upload logic is
implemented.

------------------------------------------------------------------------

# 10. Section 5 --- NOTICE UNDER SECTION 270(1)

This is legally important and should have stronger visual hierarchy.

Display:

``` text
NOTICE UNDER SECTION 270(1)
PMC ACT, 1976
```

The section should be visually highlighted.

The following fields are REQUIRED:

### Notice Number \*

### Date of Notice \*

### Photo of Notice \*

The notice section may technically be collapsible, but because all its
fields are compulsory, it should be:

-   expanded by default, OR
-   clearly marked as required and impossible to overlook.

For the current implementation, prefer:

``` tsx
const [noticeOpen, setNoticeOpen] = useState(true);
```

Use a professional highlighted panel rather than a simple text button.

Example visual hierarchy:

``` text
┌────────────────────────────────────────────────┐
│ ⚠  NOTICE UNDER SECTION 270(1)                 │
│    PMC ACT, 1976                                │
│                                                │
│    Notice details are required for registration│
│                                                │
│    Notice Number *       Date of Notice *      │
│    [____________]        [___________]         │
│                                                │
│    Photo of Notice *                            │
│    [ Upload / Capture Notice ]                 │
└────────────────────────────────────────────────┘
```

------------------------------------------------------------------------

# 11. Professional UI Design Requirements

The page should look like a serious municipal/government internal
application.

## Overall layout

Use:

``` text
Page Header
    ↓
Short introductory text
    ↓
Form sections as cards/panels
    ↓
Clear final action area
```

Avoid making the form a single giant undifferentiated block.

Use a centered content container with a sensible maximum width.

Do not stretch every input from the sidebar to the far right edge of the
browser.

Recommended conceptual layout:

``` text
┌──────────────────────────────────────────────────────┐
│ Building Field Inspection & Violation Report         │
│ Record inspection and violation details...            │
├──────────────────────────────────────────────────────┤
│ 1  Report Information                                │
│                                                      │
│ Source of Report                                     │
│ [ Complaint Based ] [ Field Visit ]                  │
│                                                      │
│ Reporting Officer              Supervising ATP       │
│ [ Select officer ▼ ]            [ ATP information ]  │
├──────────────────────────────────────────────────────┤
│ 2  Location & Jurisdiction                           │
│                                                      │
│ Block                 Zone                           │
│ [ Select block ▼ ]    [ Zone A ]                     │
│                                                      │
│ Ward                  Location / Landmark            │
│ [___________]         [________________________]     │
│                                                      │
│ GPS Location                                         │
│ [ Capture Current Location ]                         │
├──────────────────────────────────────────────────────┤
│ 3  Building & Violator Details                       │
│ ...                                                  │
├──────────────────────────────────────────────────────┤
│ 4  Location Evidence                                 │
│ [ Professional photo upload area ]                  │
├──────────────────────────────────────────────────────┤
│ 5  NOTICE UNDER SECTION 270(1)                       │
│ ...                                                  │
├──────────────────────────────────────────────────────┤
│                         [Cancel] [Register Inspection]│
└──────────────────────────────────────────────────────┘
```

------------------------------------------------------------------------

# 12. Visual Style

Follow the existing application's visual language.

Prefer:

-   dark navy/blue accents
-   white cards
-   light neutral page background
-   subtle borders
-   subtle shadows
-   rounded corners, but not excessive
-   professional typography
-   clear section headings
-   consistent field heights
-   good vertical spacing
-   clear required markers
-   accessible focus states
-   responsive behavior

Do not introduce a completely unrelated design system.

Avoid:

-   huge empty areas
-   browser-default radio layouts
-   browser-default button styling
-   tiny buttons
-   giant full-width inputs when a two-column layout is appropriate
-   excessive gradients
-   excessive animations
-   decorative elements that reduce usability

------------------------------------------------------------------------

# 13. Field Layout

Use a responsive grid.

Desktop:

``` text
2 columns where appropriate
```

For example:

``` text
Reporting Officer       Supervising ATP
Block                   Zone
Ward                    Location / Landmark
Violator Name           Mobile Number
Notice Number           Date of Notice
```

Full-width fields:

-   Brief Description / Construction Details
-   GPS section
-   Photo evidence
-   Notice photo
-   Any other field that genuinely needs full width

Mobile:

``` text
1 column
```

Do not allow the layout to become cramped.

------------------------------------------------------------------------

# 14. Loading and Error States

When fetching officers:

Show a proper state such as:

``` text
Loading officers...
```

If the API fails:

``` text
Unable to load officer data.
Please try again.
```

Do not silently render fake officers.

The same principle applies to future location/ATP mapping.

------------------------------------------------------------------------

# 15. TypeScript Requirements

Create/reuse a proper type such as:

``` ts
type Officer = {
  officerId: string;
  name: string;
  mobile: string;
  designation: string;
  zone: string;
  blocks: string[];
};
```

Do not use `any`.

Keep the code easy to refactor later when authentication is implemented.

------------------------------------------------------------------------

# 16. Important Architecture Rule

Do not duplicate backend business data unnecessarily.

The data flow should be:

``` text
server/data/officers.json
          ↓
existing backend officer API
          ↓
FieldInspectionPage
```

NOT:

``` text
officers.json
      ↓
copy all officers manually
      ↓
new frontend constant
      ↓
FieldInspectionPage
```

Likewise, reuse the existing Block → Zone data/mapping instead of
creating unrelated hardcoded arrays.

------------------------------------------------------------------------

# 17. Future Current-Login-User Design

Do not implement authentication changes now.

But structure the Reporting Officer logic so that this future change is
simple.

Current MVP:

``` text
GET /api/officers
      ↓
Reporting Officer dropdown
```

Future:

``` text
currentLoginUser
      ↓
Reporting Officer
```

The selected value should therefore be an officer ID, not only a display
name.

------------------------------------------------------------------------

# 18. Validation Requirements

Required:

-   Source of Report
-   Reporting Officer
-   Block
-   Location / Landmark
-   GPS Location
-   Building Type
-   Specify Building Type if Other
-   Violator Name
-   Description
-   At least one geotagged inspection photo
-   Notice Number
-   Date of Notice
-   Notice Photo

Optional:

-   Ward
-   Mobile Number

Do not allow registration when required fields are missing.

Show validation messages close to the relevant fields.

------------------------------------------------------------------------

# 19. Current Implementation Scope

For this UI-refinement task, prioritize:

### Must implement now

-   Professional UI redesign
-   Real officer data from `/api/officers`
-   No hardcoded officers
-   Real block data
-   Block → Zone display
-   ATP mapping based on selected block + zone
-   Proper loading/error states
-   Professional form controls
-   Notice section expanded by default
-   Better photo evidence UI
-   Better GPS UI
-   Responsive layout
-   TypeScript types

### Can remain UI/placeholder for now

-   Final backend Field Inspection submission endpoint
-   PostgreSQL persistence for inspection records
-   Google Drive photo persistence
-   Actual geotagged photo upload pipeline
-   Full current-login-user authentication integration

Do not build those unrelated backend systems unless explicitly
requested.

------------------------------------------------------------------------

# 20. Do Not Break Existing Application

Do not modify unrelated complaint functionality.

Do not break:

-   complaint registration
-   external document workflow
-   officer API
-   existing navigation
-   dashboard
-   complaint list
-   complaint detail
-   existing application shell

Only make the changes required for the Field Inspection feature and its
supporting UI/data loading.

------------------------------------------------------------------------

# 21. Expected Result

After refinement, opening:

``` text
/field-inspection
```

should feel like a polished internal municipal inspection form.

The user should be able to:

1.  Select Complaint Based or Field Visit.
2.  Select a real reporting officer from the officer API.
3.  Select a real block.
4.  See the corresponding zone automatically.
5.  See the corresponding ATP automatically.
6.  Enter ward/location information.
7.  Capture GPS location.
8.  Select building type.
9.  Enter violator details.
10. Add inspection photos.
11. Fill the required Section 270(1) notice information.
12. See clear validation states.
13. Cancel or proceed to Register Inspection.

The implementation should be clean enough that the next step can be
adding the real Field Inspection backend without rewriting the UI.

------------------------------------------------------------------------

# 22. Final Instruction to the AI Implementing This

Before modifying the code:

1.  Inspect the existing `FieldInspectionPage.tsx`.
2.  Inspect the existing `/api/officers` implementation and response
    shape.
3.  Inspect `server/data/officers.json`.
4.  Inspect the existing location data/mapping.
5.  Reuse existing APIs/types/styles where possible.
6.  Do not invent data.
7.  Do not hardcode officer or block options.
8.  Do not redesign authentication.
9.  Then replace/refactor the Field Inspection page into a professional
    production-quality MVP UI.
10. Run the frontend TypeScript/build check after changes.
11. Report exactly which files were changed and why.

The most important requirements are:

**REAL DATA \> HARDCODED DATA**

**PROFESSIONAL UI \> RAW FORM**

**REUSE EXISTING ARCHITECTURE \> DUPLICATE DATA**

**CURRENT MVP DROPDOWN → FUTURE currentLoginUser**

**BLOCK → ZONE → ATP must be data-driven.**
