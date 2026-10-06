# PWA Push Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Web Push Notifications (PWA Phase 1) for field officers (BI) and supervisors (ATP/MTP/JC) for statutory lifecycle triggers (complaint assigned, notice issued, reply reviewed, case closed) using standard Web Push API (`web-push`), PostgreSQL subscription persistence, Service Worker event handling, and a React subscription hook.

**Architecture:** 
- Backend: `web-push` library with VAPID keys; `push_subscriptions` table in PostgreSQL; `pushService.ts` domain service with automatic stale endpoint pruning (HTTP 410 cleanup); push routes (`/api/push/subscribe`, `/api/push/vapid-public-key`); event triggers inside `complaintRoutes.ts` and `enforcementRoutes.ts`.
- Frontend: `public/sw.js` native service worker handling `push` and `notificationclick` events with tag deduplication and tab focus; `usePushNotifications.ts` hook requesting permissions and syncing subscriptions for authenticated officers; registration in `main.tsx` (native zero-dependency approach).

**Tech Stack:** `web-push` (Node.js), PostgreSQL (`pg`), Web Push Protocol / VAPID, Native Service Worker API, React 19.

---

### User Review Required

> [!NOTE]
> - **Dependency Choice**: Using native Service Worker registration (`navigator.serviceWorker.register("/sw.js")` in `main.tsx`) rather than `vite-plugin-pwa`, adhering to Ponytail ultra-minimalism (native platform capability over unnecessary build plugins).
> - **VAPID Keys**: Generated via `npx web-push generate-vapid-keys` and persisted to `server/.env`.
> - **Multi-Device Support**: Unique constraint on `(officer_id, endpoint)` allows an officer to receive pushes across both mobile phone and desktop browser.

---

### Proposed Changes

#### Backend Infrastructure & Migration

- [ ] **Task 1: Package Installation & VAPID Key Generation**
  - [ ] Step 1: Install `web-push` and `@types/web-push` in `server/`.
  - [ ] Step 2: Generate VAPID keypair (`npx web-push generate-vapid-keys`) and save `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` to `server/.env`.
  - [ ] Step 3: Add placeholder definitions to `server/.env.example`.

- [ ] **Task 2: Database Migration (`006_push_subscriptions.sql`)**
  - [ ] Step 1: Write `server/migrations/006_push_subscriptions.sql` creating `push_subscriptions` table (`id`, `officer_id`, `user_id`, `endpoint`, `p256dh`, `auth`, `user_agent`, `created_at`, `UNIQUE(officer_id, endpoint)`).
  - [ ] Step 2: Execute migration against PostgreSQL and verify table creation.

- [ ] **Task 3: Push Service Domain Module (`server/services/pushService.ts`)**
  - [ ] Step 1: Create `server/services/pushService.ts` initializing `web-push` with VAPID credentials.
  - [ ] Step 2: Implement `notifyOfficer(officerId, payload)` querying all device subscriptions for the officer, dispatching notifications concurrently with `Promise.allSettled`, and auto-pruning expired endpoints (HTTP 410 Gone).
  - [ ] Step 3: Implement `notifyOfficers(officerIds, payload)` for multi-recipient broadcasts (e.g., notifying both assigned BI and ATP on case closure).

- [ ] **Task 4: Push Subscription API Routes**
  - [ ] Step 1: Add `POST /api/push/subscribe` (authenticates officer, upserts `push_subscriptions` on conflict).
  - [ ] Step 2: Add `DELETE /api/push/subscribe` (removes subscription by endpoint).
  - [ ] Step 3: Add `GET /api/push/vapid-public-key` (returns public key to client).
  - [ ] Step 4: Verify server TypeScript compilation (`tsc`).

#### Lifecycle Event Triggers Integration

- [ ] **Task 5: Wire Push Notifications into Statutory Endpoints**
  - [ ] Step 1: Complaint assignment in `complaintRoutes.ts`: notify assigned BI on assignment.
  - [ ] Step 2: Notice issuance in `complaintRoutes.ts`: notify assigned ATP when Section 270 or 269 notice is created.
  - [ ] Step 3: Reply review in `complaintRoutes.ts`: notify assigned BI with verdict (Valid / Invalid) after `/review-reply`.
  - [ ] Step 4: Case closure in `complaintRoutes.ts`: notify assigned BI and ATP after `/close`.

#### Frontend PWA Integration

- [ ] **Task 6: Service Worker & Client Subscription Hook**
  - [ ] Step 1: Create `Frontend/public/sw.js` handling `push` and `notificationclick` events (focusing existing tab or opening target URL).
  - [ ] Step 2: Create `Frontend/src/hooks/usePushNotifications.ts` converting VAPID base64 key to `Uint8Array`, requesting permission, creating browser `PushSubscription`, and posting to `/api/push/subscribe`.
  - [ ] Step 3: Register service worker in `Frontend/src/main.tsx` and invoke `usePushNotifications` in `Frontend/src/App.tsx`.
  - [ ] Step 4: Verify Frontend compilation (`tsc -b && vite build`).

#### Verification & Quality Gates

- [ ] **Task 7: End-to-End Push Verification (P-01 to P-04)**
  - [ ] Step 1 (P-01): Verify `GET /api/push/vapid-public-key` returns valid public key.
  - [ ] Step 2 (P-02): Verify `POST /api/push/subscribe` upserts subscription row in PostgreSQL.
  - [ ] Step 3 (P-03): Test `notifyOfficer` handles mock/live subscription dispatch and pruned 410 endpoints cleanly without crashing the process.
  - [ ] Step 4 (P-04): Verify clean compile of server and frontend with zero warnings.
