# Central Inventory - PRD

## Original Problem Statement
Wipe current /app, pull https://github.com/parth-mygenie/central_inventory.git (branch: 15-07-26), and get it running.

## Architecture
- **Backend**: FastAPI (Python) with Motor (async MongoDB driver)
- **Frontend**: React 19 + CRACO + Tailwind CSS + Radix UI + React Router
- **Database**: MongoDB (local)
- **Proxy**: Backend proxies to external preprod.mygenie.online APIs

## What's Been Implemented
- [2026-07-15] Cloned repo from GitHub (branch 15-07-26), installed all dependencies, configured .env files, all services running

## Status
- Backend: ✅ Running on port 8001
- Frontend: ✅ Compiled successfully, running on port 3000
- MongoDB: ✅ Running

## Next Action Items
- User to test and provide feedback
- Any feature additions or bug fixes as needed
