# Central Inventory - PRD

## Original Problem Statement
Wipe current /app, pull https://github.com/parth-mygenie/central_inventory.git (branch 16-7-25-1), and run it. No testing or feature work needed.

## Architecture
- **Frontend**: React 19 + Craco + TailwindCSS + Radix UI + Recharts
- **Backend**: FastAPI (Python) — proxy layer to MyGenie POS preprod API
- **Database**: MongoDB (via Motor async driver)
- **Auth**: Proxied to MyGenie POS API (`preprod.mygenie.online`)

## What's Been Implemented (July 16, 2026)
- Cloned repo from GitHub (branch `16-7-25-1`)
- Created platform-specific `.env` files (MONGO_URL, REACT_APP_BACKEND_URL)
- Installed all backend (pip) and frontend (yarn) dependencies
- Both services running via supervisor — backend on 8001, frontend on 3000
- App fully operational: login page renders, API proxy responds

## Core Features (from repo)
- Login via MyGenie vendor account
- Operations Hub dashboard
- Inventory management (stock, purchases, dispatches)
- Production runs & sub-recipe master
- Vendor & store management
- Purchase orders (list, create, detail)
- Wastage tracking & reports
- Daily consumption reports
- Hierarchy/store detail views

## Next Action Items
- User to provide any specific feature requests or bug fixes
