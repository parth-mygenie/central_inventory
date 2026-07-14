# Central Inventory — PRD / Memory

## Original Problem Statement (14 Jun/Jul 2026 session)
Wipe current /app, pull https://github.com/parth-mygenie/central_inventory.git branch `14-7-26`, and run it. No testing or feature work requested. Repo is public, no special keys required.

## Tech Stack (from repo)
- Backend: FastAPI (server.py), MongoDB via MONGO_URL/DB_NAME
- Frontend: React (CRA + craco, shadcn/ui, Tailwind)
- Backend also proxies to MyGenie preprod APIs (PREPROD_API_BASE_V1/V2, defaults to https://preprod.mygenie.online)
- Extra folders: AI/ (plans, curls), Master/, Outlet/, control/ (project management docs), scripts/ (seed/QA scripts)

## What Was Done (this session)
- Wiped /app (preserved .git, .emergent, memory)
- Cloned branch 14-7-26 into /app
- Recreated missing .env files:
  - backend/.env: MONGO_URL=mongodb://localhost:27017, DB_NAME=central_inventory, CORS_ORIGINS=*
  - frontend/.env: REACT_APP_BACKEND_URL=preview URL, WDS_SOCKET_PORT=443
- Installed backend pip deps + frontend yarn deps
- Restarted services via supervisor; backend API responds ("Central Inventory API Proxy"), frontend serves login page

## Notes
- App login is via MyGenie vendor account (external preprod API) — no local seed credentials known
- Local Mongo DB name assumed `central_inventory` (repo did not include .env)

## Backlog
- None requested. Await user direction.
