# Central Inventory — PRD

## Problem Statement
Central Inventory management app for MyGenie POS — multi-store hierarchy (Master > Central > Franchise) with inventory transfers, stock management, catalogue, and reporting.

## Tech Stack
- **Frontend**: React 19, Tailwind CSS 3, Radix UI, Recharts, React Router v7, React Hook Form, Zod, craco, Lucide icons, Axios
- **Backend**: Python FastAPI, Motor (async MongoDB driver), httpx, Pydantic v2, python-jose (JWT), bcrypt, litellm, openai, google-genai
- **Database**: MongoDB (local)
- **External**: Proxies to `preprod.mygenie.online` POS API

## Architecture
- Backend acts as API proxy to MyGenie POS preprod APIs (V1 auth, V2 vendor endpoints)
- Frontend is a Central Inventory management UI with login, inventory, transfers, catalogue, and reports
- Auth: real POS API login (no local auth)

## What's Been Implemented

### Initial Setup (May 29, 2026)
- Cloned repo from GitHub (branch 29_5_26_1)
- Created `.env` files with platform defaults
- Installed all Python/JS dependencies
- Both services running via supervisor

### P22 Daily Consumption Report (May 29, 2026)
- Full report page with date range filter, store multi-selector, hierarchy toggle
- KPI cards, ingredient summary table, consumption details (collapsible), by-store rollup
- Ingredient drill-down, loading/error/empty states
- 12/12 frontend tests passed (100%)

### P23 Hierarchy Management — Planning Complete (May 29, 2026)
- **24 API probes** against live POS API — all 6 endpoints validated
- Created: `AI/Plans/phase3/P23_hierarchy_management_planning.md`
- Created: `AI/Plans/api_implementation_status_p23_addendum.md`
- Created: `AI/curls/p23_hierarchy_management_curls.sh`
- 3 test entities created during probing (rid=787, 788, 789)
- Implementation plan: 3 phases, ~11-14h total

## Backlog

### P0 — None

### P1 — P23 Implementation
- Phase 1: Hierarchy list + create dialog (~5-6h)
- Phase 2: Bundle push wizard + results viewer (~4-5h)
- Phase 3: Push history table + pagination (~2-3h)

### P2 — Enhancements
- PDF/CSV export for consumption report
- Chart visualization for consumption trends
- Ingredient drill-down to transfers (cross-reference)
- Child deletion/deactivation (no API found yet)
