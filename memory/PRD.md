# Central Inventory - PRD

## Problem Statement
Pull repo from https://github.com/Abhi-mygenie/central-iventory.git (branch: 15-june), wipe existing /app, and get the app running.

## Architecture
- **Backend**: FastAPI (Python) — acts as a proxy to `preprod.mygenie.online` POS API, with MongoDB (motor) for token session storage
- **Frontend**: React 19 (CRA + craco), Tailwind CSS, Radix UI/shadcn components, Recharts, react-router-dom v7
- **Database**: MongoDB (local, via motor async driver)
- **External API**: preprod.mygenie.online (POS system)

## What's Been Implemented (2026-06-15)
- Cloned repo from `15-june` branch
- Set up backend .env with MONGO_URL, DB_NAME, CORS_ORIGINS, PREPROD API base URLs
- Set up frontend .env with REACT_APP_BACKEND_URL and WDS_SOCKET_PORT
- Installed Python dependencies (FastAPI, motor, httpx, etc.)
- Installed frontend dependencies (React, Radix UI, Tailwind, etc.)
- Both services running via supervisor (backend:8001, frontend:3000)
- App verified live: login page renders, backend API responds

## Key Features (from repo)
- Login via MyGenie vendor account (proxy to POS API)
- Inventory hierarchy & store management
- Transfer operations (initiate, approve, dispatch, receive, cancel)
- Stock inventory & FEFO batch detail
- Vendor management, procurement, purchase orders
- Recipe & sub-recipe catalogue
- Production runs
- Daily consumption & wastage reports
- Operational settings

## Backlog
- No testing was requested by user for this session
