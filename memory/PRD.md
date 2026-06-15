# Central Inventory PRD

## Problem Statement
Pull and run the Central Inventory app from GitHub repo `parth-mygenie/central_inventory.git`, branch `15-06-v2`.

## Architecture
- **Backend**: FastAPI (Python) — proxy server to MyGenie preprod APIs + MongoDB for local state
- **Frontend**: React (CRA via CRACO) + Tailwind CSS + Radix UI + Recharts
- **Database**: MongoDB (local)
- **Key features**: Central inventory management, POS API proxy (auth, V2 endpoints), stock management, production runs, wastage reports, catalogue management

## What's Been Implemented
- **2025-06-15**: Cloned repo from `15-06-v2` branch, created `.env` files, installed all dependencies, services running successfully.

## Status
- Backend: ✅ Running on port 8001
- Frontend: ✅ Running on port 3000 (compiled with warnings only)
- MongoDB: ✅ Running
- API: ✅ Responding at `/api/`

## Next Tasks
- User to review and provide further instructions
