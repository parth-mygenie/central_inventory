# Central Inventory - PRD

## Original Problem Statement
Central Inventory — multi-store hierarchy stock management module for MyGenie POS.
Current session: Investigation of Category-Scoped Forward Push API.

## Architecture
- **Frontend**: React 19 + Craco + TailwindCSS + Radix UI + Recharts
- **Backend**: FastAPI (Python) — proxy-only layer to `preprod.mygenie.online/api/v2/vendoremployee`
- **Database**: MongoDB (via Motor async driver) — local session/cache only
- **Auth**: Proxied to MyGenie POS API

## What's Been Implemented (July 16, 2026)
- Repo cloned from GitHub (branch `16-7-25-1`), deployed and running
- **Investigation completed**: Category-scoped forward push API
  - All 6 curl scenarios verified against live POS API
  - Test data seeded on Palm hierarchy (813→814,815): 4 stock item cats, 15 ingredients, 3 sub-recipes, 4 recipes
  - Pre-selection mechanism identified (frontend-only, no backend changes)
  - Full report: `control/sessions/INVESTIGATION_CATEGORY_SCOPED_PUSH_20260716.md`

## Prioritized Backlog
### P0/P1 — Next
- CR-046 (proposed): Category-Scoped Push Frontend Adoption
  - Category multi-select in push dialog
  - Preview integration with `category_selection_preview`
  - Pre-selection from `child_existing.category_names`

### P1 — Gap Adoption Pipeline (from L1)
- CR-037 → CR-044 (8 items planned, awaiting Gate 4 GO)

### P2 — Awaiting QA
- CR-045: Reverse Push Frontend Adoption
- BUG-029 through BUG-035

## Test Accounts (Palm Hierarchy)
| Email | Password | Role | RID |
|-------|----------|------|:---:|
| owner@palmcentral.com | Qplazm@10 | master | 813 |
| owner@palmbharat.com | Qplazm@10 | franchise | 815 |
| owner@palmruby.com | Qplazm@10 | franchise | 814 |
