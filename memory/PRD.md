# Central Inventory — PRD

## Original Problem Statement
Wipe current /app, pull https://github.com/parth-mygenie/central_inventory.git branch 26_5_26, and run as-is.

## Architecture
- **Backend**: FastAPI (Python) — acts as a proxy to MyGenie POS API (preprod.mygenie.online)
- **Frontend**: React 19 (CRA + craco) + Tailwind CSS + shadcn/ui (Radix primitives)
- **Database**: MongoDB (motor async driver) — stores token sessions and status checks
- **Auth**: Proxied through MyGenie POS API (`/api/v1/auth/vendoremployee/common-login`)

## Core Features
- Login via MyGenie vendor credentials
- Inventory hierarchy summary & detail views
- Pending transfer queues
- Transfer management (initiate, approve, reject, dispatch, receive, cancel)
- Request Stock 3-step flow (sources → catalog → request)
- Stock adjustments (increase/decrease)
- Wastage recording & reporting
- Transfer history with date filtering

## What's Been Implemented (26 May 2026)
- Cloned repo from branch `26_5_26` into /app
- Backend dependencies installed and running on port 8001
- Frontend dependencies installed and running on port 3000
- Both services verified operational via supervisor
- API health check confirmed (`/api/` returns proxy message)
- Frontend login page rendering confirmed via screenshot

## Environment
- `MONGO_URL` = local MongoDB
- `DB_NAME` = test_database
- `REACT_APP_BACKEND_URL` = https://stock-central-28.preview.emergentagent.com
- Backend proxies to `PREPROD_API_BASE_V1` / `PREPROD_API_BASE_V2` (defaults to preprod.mygenie.online)

## Backlog / Next Tasks
- P0: None — app running as-is per user request
- P1: Custom env vars for POS API credentials if needed
- P2: Production deployment configuration
