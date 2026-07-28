# Central Inventory — PRD

## Original Problem Statement
Clone the `central_inventory` repository (branch `28-7-26`) from GitHub into `/app`, install dependencies, and run both backend and frontend. No modifications, no testing.

## Architecture
- **Frontend:** React 19 + CRACO + Tailwind CSS 3 + Radix UI + React Router DOM 7 + Recharts + Axios
- **Backend:** FastAPI + Motor (async MongoDB) + httpx (proxy to preprod POS API) + Pydantic v2 + Uvicorn
- **Database:** MongoDB (local)
- **External API:** preprod.mygenie.online (POS API proxy)

## What's Been Implemented (2026-07-28)
- Cloned repo from `https://github.com/parth-mygenie/central_inventory.git` branch `28-7-26`
- Backend dependencies installed, `.env` configured with platform MONGO_URL/DB_NAME
- Frontend dependencies installed, `.env` configured with platform REACT_APP_BACKEND_URL
- Both services running via supervisor (backend:8001, frontend:3000)
- Verified: Backend API responds, Frontend login page renders

## Prioritized Backlog
- No modifications requested — app running as-is from repo
