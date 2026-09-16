# MCL Building Branch — Prototype Scope, Demo Story & Development Plans

## Prototype Objective

The prototype must look complete to non-technical stakeholders while demonstrating the system's real complexity.

The strongest prototype is not the one with every feature. It is the one that shows a believable end-to-end government workflow with real data, evidence, status history, analytics and escalation.

---

# Recommended Demo Story

## Story A — Complaint to Case

1. Officer registers a complaint
2. System assigns BI and ATP
3. BI receives the work
4. BI visits the location
5. BI submits mandatory image and report
6. ATP reviews the update
7. Demonstrate close/pending/new-case decision
8. Route actionable matter into a case
9. Demonstrate optional Section 270
10. Show timer/expiry state
11. Demonstrate BI reinspection
12. Demonstrate Section 269 serious stage
13. Show higher-authority notification/visibility
14. Open analytics and show the case reflected in metrics

## Story B — Proactive BI Case

1. BI identifies a violation independently
2. BI creates a field case
3. Records location, coordinates, evidence and report
4. ATP workflow begins
5. Case appears in analytics

## Story C — Delayed Case

1. Seed/create a case with an old status timestamp
2. System calculates delay
3. Case becomes flagged
4. Score is calculated
5. Analytics ranks it among flagged cases
6. Higher authority visibility is demonstrated

---

# Prototype Priorities

## P0 — Must Work
- Existing complaint registration remains stable
- Complaint assignment to BI/ATP
- BI evidence + report submission
- Server-side validation
- ATP review/status action
- Basic case creation
- Real PostgreSQL-backed analytics
- Flagged case list
- Basic notifications

## P1 — Strong Demo Value
- Section 270 data/document flow
- 3-day timer state
- Section 269 stage
- Status history timeline
- PWA installation/push notification setup

## P2 — After Prototype
- WhatsApp integration
- Advanced scoring formula
- Perfect role-specific analytics
- Complete legal workflow automation
- Advanced offline PWA functionality

---

# Single-Developer Plan

## Role of Primary Developer
Own:
- Current branch integration
- Database schema
- Backend routes
- Frontend wiring
- Analytics

## Yuvi's Support Role
Focus on difficult tasks:
- Architecture decisions
- Schema review
- Workflow edge cases
- Mermaid/documentation
- Analytics design
- Notification/PWA technical decisions
- Debugging blockers

## Phase 1 — Stabilize
- Freeze feature list
- Compare `ad-dev` and `uv-dev`
- Choose integration base
- Confirm current complaint flow works
- Inventory mock data

## Phase 2 — Data Foundation
- Add minimal case model
- Add field visit/evidence
- Add status history
- Add flags
- Seed demo data

## Phase 3 — End-to-End Workflow
- Complaint -> BI visit
- BI update validation
- ATP review
- Complaint -> case linkage
- Proactive case

## Phase 4 — Analytics
- Replace mock values
- Add KPI cards
- Add pending/closed metrics
- Add BI/ATP performance
- Add flagged ranking

## Phase 5 — Demo Polish
- Seed believable data
- Fix broken navigation
- Improve loading/error states
- Prepare demo script
- Add PWA basics

---

# Two-Person Plan

## Developer A — Backend / Data / Workflow
- PostgreSQL schema
- Migrations
- Cases
- Visits/evidence
- Notices
- Status history
- Flags/scoring
- Notifications API
- Analytics queries

## Developer B — Frontend / UX / PWA
- Complaint/case screens
- BI visit forms
- ATP review screens
- Analytics dashboard
- Flagged cases UI
- Status timeline
- PWA manifest/service worker
- Notification UI
- Demo polish

## Yuvi — Architecture / Difficult Tasks
- Integration decisions
- Schema/workflow review
- Complex debugging
- Analytics and scoring decisions
- Stakeholder presentation

---

# Suggested 1–1.5 Week Prototype Sequence

## Day 1
- Freeze prototype scope
- Compare branches
- Choose base
- Verify current application
- Confirm database schema

## Day 2
- Implement minimal case + field visit schema
- Connect BI form to backend
- Enforce image/report validation

## Day 3
- Complaint-to-case linkage
- ATP review/status flow
- Status history

## Day 4
- Proactive BI case flow
- Evidence display
- Seed realistic demo records

## Day 5
- Analytics with real database data
- BI/ATP metrics
- Pending/closed counts

## Day 6
- Flagging + score ranking
- Serious-stage/notice demo data
- Notifications

## Day 7
- PWA basics
- Integration testing
- Demo workflow rehearsal

## Buffer Days
- Bug fixing
- UI polish
- Legal/workflow corrections
- Stakeholder feedback

---

# Rule for the Prototype

Whenever there is a choice between:
- building a new isolated screen, or
- connecting an existing screen to real data

prefer connecting the existing screen to real data.

The current project should feel like one connected system.
