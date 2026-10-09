# PWA & In-App Notification Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement PWA installability (manifest, icons, meta tags) and an end-to-end In-App Notification Center with PostgreSQL persistence (dual-write in `pushService.ts`), authenticated API endpoints (`GET /api/notifications`, `PATCH /api/notifications/:id/read`), and an interactive notification bell dropdown in `Topbar.tsx`.

**Architecture:**
- **Frontend PWA Installability**: Web App Manifest (`manifest.json`), standard and maskable icon suite (192px and 512px generated from `mcl-logo.png`), and iOS/Android meta tags in `Frontend/index.html`.
- **Backend Persistence**: Migration `007_create_notifications_table.sql` ensuring `notifications` table has `url TEXT` and proper indices; `pushService.ts` dual-writes all statutory alerts to `notifications` table alongside Web Push.
- **Backend Notification API**: `server/routes/notificationRoutes.ts` mounted at `/api/notifications` providing `GET /api/notifications`, `PATCH /api/notifications/:id/read`, and `PATCH /api/notifications/read-all`.
- **Frontend Notification Center**: `Frontend/src/layout/Topbar.tsx` notification bell with unread badge counter, popover menu styled using existing `.notification-menu` and color-stripe design system from `App.css`, one-click deep-linking, mark-as-read actions, and periodic polling.

**Tech Stack:** React 19, TypeScript, Express, PostgreSQL (`pg`), Web Push API, HTML5 PWA Manifest.

**Spec Reference:** `docs/context-handoff.md` (Section 6.1 & 6.2) and `Punjab-Municipal-Corporation-Act-1976.pdf`.

## Global Constraints
- Commit format strictly follows: `<what we have done in that part> : <description of that task>`.
- Commit 1: `PWA installability : added web app manifest, icons, and index.html PWA tags`
- Commit 2: `In-app notification center : implemented notifications API, pushService dual-write, and Topbar notification bell dropdown`
- Ponytail ultra mode: minimal dependencies, zero build-time bloat, reuse existing CSS classes in `Frontend/src/App.css`.

---

## Proposed Changes

### Phase 1: PWA Installability (Commit 1)

#### Task 1: Generate PWA Icons & Web App Manifest
**Files:**
- Create: `Frontend/public/manifest.json`
- Create: `Frontend/public/icon-192.png`
- Create: `Frontend/public/icon-512.png`
- Create: `Frontend/public/icon-maskable-192.png`
- Create: `Frontend/public/icon-maskable-512.png`
- Modify: `Frontend/index.html`

- [x] **Step 1: Generate high-resolution icons (192px and 512px) from `mcl-logo.png`**
  Generate `icon-192.png`, `icon-512.png`, `icon-maskable-192.png`, and `icon-maskable-512.png` using Python PIL with appropriate padding and transparency.

- [x] **Step 2: Create `Frontend/public/manifest.json`**
  Configure app name "MCL Building Branch", short_name "MCL-BB", `theme_color: "#0b1957"`, `background_color: "#ffffff"`, `display: "standalone"`, and icon entries.

- [x] **Step 3: Update `Frontend/index.html`**
  Add manifest link, `theme-color` meta tag, `apple-touch-icon`, and iOS web app meta tags.

- [x] **Step 4: Verify Frontend Build**
  Run: `npm --prefix Frontend run build`
  Expected: Clean compilation, assets copied to `Frontend/dist/`.

- [x] **Step 5: Commit Phase 1**
  ```bash
  git add Frontend/public/manifest.json Frontend/public/icon-*.png Frontend/index.html
  git commit -m "PWA installability : added web app manifest, icons, and index.html PWA tags"
  ```

---

### Phase 2: In-App Notification Center (Commit 2)

#### Task 2: Database Migration & pushService.ts Dual-Write
**Files:**
- Create: `server/migrations/007_create_notifications_table.sql`
- Modify: `server/services/pushService.ts`

- [ ] **Step 1: Write migration `007_create_notifications_table.sql`**
  Create `notifications` table if not exists, and add `url TEXT DEFAULT '/'` column idempotently with indices on `recipient_officer_id` and `read_at`.

- [ ] **Step 2: Execute migration against PostgreSQL**
  Run migration script to ensure `url` column is live in Neon database.

- [ ] **Step 3: Update `PushPayload` interface and dual-write in `notifyOfficer`**
  In `server/services/pushService.ts`:
  Add optional `type`, `entityType`, `entityId` to `PushPayload`.
  In `notifyOfficer(officerId, payload)`:
  Execute `INSERT INTO notifications (recipient_officer_id, type, entity_type, entity_id, title, body, url, read_at, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, NOW())` alongside web-push dispatch.

- [ ] **Step 4: Verify dual-write with a test invocation**
  Run node script to verify row is inserted into `notifications` table.

---

#### Task 3: Notification API Endpoints
**Files:**
- Create: `server/routes/notificationRoutes.ts`
- Modify: `server/app.ts`

- [ ] **Step 1: Implement `server/routes/notificationRoutes.ts`**
  - `GET /api/notifications`: Returns last 50 notifications for current officer (`req.user.officerId`) or all if `superadmin`, plus `unreadCount`.
  - `PATCH /api/notifications/:id/read`: Marks a single notification as read (`read_at = NOW()`).
  - `PATCH /api/notifications/read-all`: Marks all unread notifications for current officer as read.

- [ ] **Step 2: Mount routes in `server/app.ts`**
  Import `notificationRoutes` and register `app.use("/api/notifications", notificationRoutes)`.

- [ ] **Step 3: Verify server compilation and endpoint tests**
  Run: `npm --prefix server run build`
  Verify `GET /api/notifications` returns 200 JSON with mock or seeded notification.

---

#### Task 4: Notification Bell Dropdown in Topbar.tsx
**Files:**
- Modify: `Frontend/src/layout/Topbar.tsx`

- [ ] **Step 1: Add Notification Bell state & API methods in `Topbar.tsx`**
  - Fetch notifications on mount and set up 30-second polling interval.
  - Implement `markAsRead(id, url)` and `markAllAsRead()`.
  - Add click-outside ref handler to dismiss menu.

- [ ] **Step 2: Render Notification Bell & Dropdown in `topbar__header-controls`**
  - Use `.notification-wrap`, `.notification-dot`, `.notification-menu`, `.notification-item`, `.notification-item__stripe` classes from `App.css`.
  - Show unread badge dot / count when `unreadCount > 0`.
  - Display list of notifications with relative timestamp (e.g., "5m ago"), title, body, and type stripe.
  - Clicking an item marks it as read, closes the menu, and calls `navigate(item.url)`.
  - Header displays "Notifications" and "Mark all read" button.
  - Empty state displays "No notifications yet".

- [ ] **Step 3: Verify Frontend compilation and interactions**
  Run: `npm --prefix Frontend run build`
  Expected: Clean build with zero TypeScript errors.

- [ ] **Step 4: Commit Phase 2**
  ```bash
  git add server/migrations/007_create_notifications_table.sql server/services/pushService.ts server/routes/notificationRoutes.ts server/app.ts Frontend/src/layout/Topbar.tsx
  git commit -m "In-app notification center : implemented notifications API, pushService dual-write, and Topbar notification bell dropdown"
  ```

---

## Verification Plan

### Automated Checks
1. `npm --prefix server run build` - passes with 0 errors.
2. `npm --prefix Frontend run build` - passes with 0 errors.
3. Database table verification: confirms `url` column exists on `notifications`.
4. Endpoint test: `GET /api/notifications` returns 200 with JSON payload.
5. Notification click test: `PATCH /api/notifications/:id/read` updates `read_at`.

### Manual Checks
1. DevTools > Application > Manifest shows valid PWA with icons and theme color.
2. Topbar displays notification bell with active unread badge.
3. Clicking bell opens menu; clicking item navigates to case/complaint and clears unread status.

