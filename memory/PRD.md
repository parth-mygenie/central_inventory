# Central Inventory - PRD

## Original Problem Statement
Clone the `central_inventory` repo from GitHub (branch `25-7-26`), wipe the current `/app` directory, and get it running.

## Architecture
- **Frontend:** React (JSX) + Tailwind CSS + Craco (webpack config) + Shadcn UI
- **Backend:** Python FastAPI — acts as API proxy to MyGenie POS preprod API
- **Database:** MongoDB (local, for session/status tracking)
- **Auth:** Proxied through MyGenie vendor auth API

## What's Been Implemented (Jul 25, 2026)
- Cloned repo from `https://github.com/parth-mygenie/central_inventory.git` branch `25-7-26`
- Created `.env` files for backend (MONGO_URL, DB_NAME, CORS_ORIGINS) and frontend (REACT_APP_BACKEND_URL)
- Installed Python backend dependencies via pip
- Installed frontend Node dependencies via yarn
- Both services running via supervisor (backend:8001, frontend:3000)
- Backend API responding at `/api/` endpoint
- Frontend login page rendering correctly

## Core Features (from repo)
- Login via MyGenie vendor account (proxy auth)
- Operations Hub dashboard
- Hierarchy management (stores/franchises)
- Stock inventory management
- Transfer workflows (dispatch, request, approve, receive)
- Wastage tracking & reporting
- Vendor management
- Purchase order management
- Production runs & recipes
- Ingredient & product catalogues
- Daily consumption reports
- Operational settings

## Prioritized Backlog
- P0: App is running ✅
- P1: Verify login flow works with real credentials
- P2: Test full navigation and feature workflows
