# Central Inventory - PRD

## Original Problem Statement
Central Inventory — multi-store hierarchy stock management module for MyGenie POS.

## Architecture
- **Frontend**: React 19 + Craco + TailwindCSS + Radix UI + Recharts
- **Backend**: FastAPI (Python) — proxy-only layer to `preprod.mygenie.online/api/v2/vendoremployee`
- **Database**: MongoDB (via Motor async driver) — local session/cache only
- **Auth**: Proxied to MyGenie POS API

## What's Been Done (July 16, 2026)

### Session 1: Deployment
- Repo cloned from GitHub (branch `16-7-25-1`), deployed and running

### Session 2: Investigation — Category-Scoped Forward Push
- All 6 curl scenarios verified against live POS API
- Test data seeded on Palm hierarchy (813→814,815)
- Report: `control/sessions/INVESTIGATION_CATEGORY_SCOPED_PUSH_20260716.md`

### Session 3: Planning — CR-047
- Impact Analysis + Implementation Plan written
- Plan: `control/sessions/CR047_ARTIFACT_2_3_IMPACT_AND_PLAN.md`

### Session 4: Implementation — CR-047 (DONE, QA PASS 12/12)
- **3 files modified:**
  - `api.js` — `getPushForm` + `pushBundle` now accept optional `categoryIds`
  - `useHierarchyManagement.js` — `executePush` passes `categoryIds` through
  - `StoreManagement.jsx` — New `CategoryPushDialog` component
- **Features delivered:**
  - Mandatory category selection before push (no direct full-bundle push)
  - Pre-selection of previously-pushed categories
  - Auto-fetch resolution preview on toggle (debounced 400ms)
  - Category search, Select All, Deselect All
  - Push results with per-module inserted/updated counts
  - Category push history badges per store row (N/M categories)
  - Create-and-push flow also routes through category selection
- **Testing:** 12/12 frontend tests PASS (iteration_60.json)

## Prioritized Backlog
### P1 — Gap Adoption Pipeline
- CR-037 → CR-044 (8 items planned, awaiting Gate 4 GO)

### P2 — Awaiting QA
- CR-045: Reverse Push Frontend Adoption
- BUG-029 through BUG-036

## Test Accounts (Palm Hierarchy)
| Email | Password | Role | RID |
|-------|----------|------|:---:|
| owner@palmcentral.com | Qplazm@10 | master | 813 |
| owner@palmbharat.com | Qplazm@10 | franchise | 815 |
| owner@palmruby.com | Qplazm@10 | franchise | 814 |
