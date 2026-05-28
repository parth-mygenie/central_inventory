# Central Inventory - PRD

## Original Problem Statement
Wipe current /app, pull https://github.com/parth-mygenie/central_inventory.git (branch 28_5_26_ux) and run it. Public repo, no testing needed.

## Architecture
- **Backend**: FastAPI (Python) - API proxy to MyGenie preprod APIs + MongoDB
- **Frontend**: React 19 + Tailwind CSS + shadcn/ui (Radix) + CRACO build
- **Database**: MongoDB (local)
- **External APIs**: MyGenie preprod POS API (v1/v2)

## What's Been Implemented
- [2025-05-28] Cloned repo from branch `28_5_26_ux`, installed dependencies, started services
- Backend running on port 8001, Frontend on port 3000
- Login page visible and functional at preview URL

## Tech Stack
- React 19, react-router-dom, axios, recharts, lucide-react, shadcn/ui components
- FastAPI, motor (async MongoDB), httpx (proxy calls), pydantic
- MongoDB for session/token storage
- CRACO for CRA config overrides

## Status
- App pulled and running successfully
