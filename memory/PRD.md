# Central Inventory PRD

## Problem Statement
Central Inventory — multi-store hierarchy stock management module for MyGenie POS.

## Tech Stack
- **Frontend**: React 19, Tailwind CSS 3, Radix UI (shadcn), Recharts, React Router DOM, CRACO, Lucide React
- **Backend**: FastAPI (Python) — proxy-only to preprod.mygenie.online, Motor (async MongoDB driver), Uvicorn
- **Database**: MongoDB (local)
- **Auth**: MyGenie vendor account (external POS auth)

## What's Been Implemented (July 24, 2026)
- Cloned repo from branch `18-7-26`
- **BUG-047 RESOLVED**: Addon Recipe CRUD fixed (4 sub-issues, 9/9 tests pass)
- **BUG-048 RESOLVED**: Receive Transfer INVALID_STOCK_DATA — backend fix deployed & verified
  - Root cause: `assertValidStockData()` rejected negative `cal_quantity` on destination
  - Verified: dispatch flow, request flow, stuck transfers — all pass on 813→815 hierarchy

## Architecture
- Backend on port 8001 (supervisor-managed, proxy-only)
- Frontend on port 3000 (supervisor-managed, CRACO)
- All API routes proxied via `/api/proxy/v2/*` to preprod.mygenie.online

## Backlog
- CR-037→044: Gap Adoption Pipeline (awaiting Gate 4 GO)
- Request #319 in Approved status — can test dispatch when source has stock

## Status: ✅ Running, BUG-047 + BUG-048 RESOLVED
