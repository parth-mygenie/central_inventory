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
**Files created/modified:**
- `frontend/src/components/central-inventory/DailyConsumptionReport.jsx` — full report page
- `frontend/src/hooks/useConsumptionReport.js` — data fetching hook
- `frontend/src/services/api.js` — added `getDailyConsumptionReport`
- `frontend/src/lib/screenVisibility.js` — added `scr-consumption-report` + updated nav (removed "Reports (soon)")
- `frontend/src/App.js` — added `/reports/consumption` route

**Features:**
- Date range filter with presets
- Store multi-selector (master/central only, from hierarchy_scope)
- "Include all stores" hierarchy toggle (master/central only)
- KPI cards: Ingredients Tracked, Total Consumed, Stores Reporting, Period
- Ingredient Summary Table with search, sort, negative stock warnings
- Consumption Details Table (collapsible, sorted by date desc)
- By Store Rollup section (multi-store mode only)
- Ingredient drill-down (click summary row → filtered details)
- Loading, error, empty states
- 403 invalid_scope error handling
- Quantities displayed as-is (strings with units, no aggregation of mixed units)

**Testing:** 12/12 frontend tests passed (100%)

## Backlog
- P0: None
- P1: PDF/CSV export for consumption report
- P2: Chart visualization for consumption trends
- P2: Ingredient drill-down to transfers (cross-reference)
