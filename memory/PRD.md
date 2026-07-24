# Central Inventory PRD

## Problem Statement
Wipe current /app, pull from https://github.com/parth-mygenie/central_inventory.git (branch 18-7-26), and run the app.

## Tech Stack
- **Frontend**: React 19, Tailwind CSS 3, Radix UI, Recharts, React Router DOM, CRACO, Lucide React
- **Backend**: FastAPI (Python), Motor (async MongoDB driver), Uvicorn
- **Database**: MongoDB (local)
- **Auth**: MyGenie vendor account (external auth proxy)

## What's Been Implemented (July 24, 2026)
- Cloned repo from branch `18-7-26`
- Restored platform .env files (REACT_APP_BACKEND_URL, MONGO_URL, DB_NAME, CORS_ORIGINS)
- Installed all backend (pip) and frontend (yarn) dependencies
- Both services running successfully via supervisor
- App loads with Central Inventory login page

## Architecture
- Backend on port 8001 (supervisor-managed)
- Frontend on port 3000 (supervisor-managed, CRACO)
- MongoDB on default port 27017
- API routes proxied via `/api` prefix

## Status: ✅ Running
