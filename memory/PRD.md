# Central Inventory - PRD

## Original Problem Statement
User requested to wipe current /app, pull https://github.com/parth-mygenie/central_inventory.git (branch 16-7-26), and get it running. No testing needed, just pull and run.

## Architecture
- **Frontend**: React 19 + Craco + Tailwind CSS + Radix UI + Recharts + React Router v7
- **Backend**: FastAPI + Motor (async MongoDB) + httpx (proxy to preprod.mygenie.online)
- **Database**: MongoDB (local)
- **Auth**: Proxied to MyGenie preprod API

## What's Been Implemented
- [2025-07-16] Cloned repo from GitHub (branch 16-7-26) into /app
- [2025-07-16] Set up .env files with platform-specific URLs (MONGO_URL, REACT_APP_BACKEND_URL)
- [2025-07-16] Installed backend Python dependencies (requirements.txt)
- [2025-07-16] Installed frontend Node.js dependencies (yarn install)
- [2025-07-16] Both services running via supervisor - backend on :8001, frontend on :3000
- [2025-07-16] Verified: Backend API responds, Frontend compiles and renders login page

## Key Components
- Backend acts as API proxy to MyGenie preprod servers
- Frontend is a Central Inventory management system with ~40+ components
- Login authenticates via MyGenie vendor account

## Next Action Items
- User can now use the app and request feature additions or bug fixes
