# Central Inventory - PRD

## Original Problem Statement
Wipe current /app and pull from https://github.com/parth-mygenie/central_inventory.git branch 25_5_26_2. Run as-is without testing.

## Architecture
- **Backend**: FastAPI (Python) - Proxy to MyGenie POS API (preprod.mygenie.online)
- **Frontend**: React 19 + Tailwind CSS + Radix UI + shadcn/ui + craco
- **Database**: MongoDB (local, motor async driver)
- **Auth**: Proxied login via MyGenie vendor employee API

## What's Been Implemented (Jan 2026)
- Cloned repo from branch `25_5_26_2`
- Restored environment variables (.env files)
- Installed all Python and Node.js dependencies
- Backend running on port 8001 (uvicorn via supervisor)
- Frontend running on port 3000 (craco via supervisor)
- Both services compiled and running successfully

## Key Screens (from App.js routes)
- `/login` - Login Page (MyGenie vendor auth)
- `/` - Operations Hub (SCR-01)
- `/hierarchy` - Hierarchy Summary (SCR-02)
- `/store/:id` - Store Detail (SCR-03)
- `/queues` - Pending Queues (SCR-05)
- `/history` - History Ledger
- `/dispatch/new` - Direct Dispatch Form
- `/request/new` - Request Stock Form
- `/adjustment/new` - Stock Adjustment Form
- `/wastage/new` - Wastage Entry Form
- `/wastage/report` - Wastage Report
- `/transfer/:id` - Transfer Detail (SCR-09)

## Backlog
- P0: None (app running as-is per request)
- P1: User may want feature additions or modifications
- P2: Address ESLint warnings (useEffect dependency)
