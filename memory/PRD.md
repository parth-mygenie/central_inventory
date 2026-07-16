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
- Test data seeded on Palm hierarchy (813→814,815): 4 stock item cats, 15 ingredients, 3 sub-recipes, 4 recipes
- Pre-selection mechanism identified (frontend-only)
- Report: `control/sessions/INVESTIGATION_CATEGORY_SCOPED_PUSH_20260716.md`

### Session 3: Planning — CR-047
- Impact Analysis + Implementation Plan written
- 3 files scoped: api.js, useHierarchyManagement.js, StoreManagement.jsx
- Plan: `control/sessions/CR047_ARTIFACT_2_3_IMPACT_AND_PLAN.md`

## Prioritized Backlog
### P1 — Next (Awaiting Gate 4 GO)
- **CR-047**: Category-Scoped Forward Push Frontend Adoption
  - CategoryPushDialog with category multi-select
  - Pre-selection from child_existing.category_names
  - Mandatory ≥1 category selection to push
  - Preview via category_selection_preview

### P1 — Gap Adoption Pipeline
- CR-037 → CR-044 (8 items planned)

### P2 — Awaiting QA
- CR-045: Reverse Push Frontend Adoption
- BUG-029 through BUG-036

## Test Accounts (Palm Hierarchy)
| Email | Password | Role | RID |
|-------|----------|------|:---:|
| owner@palmcentral.com | Qplazm@10 | master | 813 |
| owner@palmbharat.com | Qplazm@10 | franchise | 815 |
| owner@palmruby.com | Qplazm@10 | franchise | 814 |
