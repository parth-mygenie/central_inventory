# Central Inventory - PRD

## Original Problem Statement
Wipe current /app, pull https://github.com/parth-mygenie/central_inventory.git (branch: 15-6-implementation-v1), and get it running. Public repo, no special keys needed.

## Architecture
- **Backend**: FastAPI (Python) with Motor (async MongoDB driver), httpx for API proxy to preprod.mygenie.online
- **Frontend**: React 19 + CRACO + Tailwind CSS + Radix UI + React Router v7 + Recharts
- **Database**: MongoDB (local)
- **Pattern**: Backend acts as API proxy to MyGenie POS preprod APIs (V1 auth, V2 vendor operations)

## What's Been Implemented (June 15, 2026)
- Cloned repo from `15-6-implementation-v1` branch
- Preserved `.git` and `.emergent` folders for Emergent platform
- Restored environment variables (MONGO_URL, REACT_APP_BACKEND_URL, etc.)
- Installed all Python backend dependencies (FastAPI, Motor, httpx, etc.)
- Installed all frontend dependencies (React 19, Radix UI, Tailwind, etc.)
- Both services running successfully via supervisor
- App accessible at https://central-inv-v1.preview.emergentagent.com

## Key Features (from codebase)
- Login via MyGenie vendor accounts (proxy to preprod API)
- Operations Hub dashboard
- Hierarchy/Store management
- Stock inventory (FEFO), purchase orders, vendor management
- Production runs, sub-recipe master
- Dispatch, stock requests, adjustments, wastage tracking
- History ledger, pending queues
- Daily consumption & wastage reports
- Ingredient & product catalogues
- Operational settings

## Prioritized Backlog
- No additional tasks requested yet

## Next Tasks
- Awaiting user direction
