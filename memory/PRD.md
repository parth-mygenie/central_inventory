# Central Inventory - PRD

## Problem Statement
Clone and run the Central Inventory app from `https://github.com/parth-mygenie/central_inventory.git` (branch `13-6-26`) as-is on Emergent platform.

## Tech Stack
- **Frontend**: React 19, Tailwind CSS 3, Radix UI, craco, react-router-dom, recharts, shadcn/ui
- **Backend**: FastAPI, Motor (async MongoDB driver), httpx (proxy to MyGenie POS API)
- **Database**: MongoDB (local)
- **External APIs**: MyGenie POS preprod API (auth + V2 proxy)

## Architecture
- Backend acts as a proxy to MyGenie's preprod POS API (`preprod.mygenie.online`)
- Auth flow: Login via `/api/proxy/auth/login` → proxies to MyGenie auth → enriches with restaurant context
- Generic V2 proxy: `/api/proxy/v2/{path}` → passes through to MyGenie V2 API
- Frontend: Multi-page app with login, operations hub, inventory management, hierarchy, stock transfers, wastage tracking, catalogue management, etc.

## What's Been Implemented
- **2026-01-XX**: Cloned repo from GitHub (branch `13-6-26`), installed all dependencies, restored `.env` files, started services. App running as-is with no modifications.

## Status
- Backend: RUNNING (FastAPI on port 8001)
- Frontend: RUNNING (React on port 3000, compiled successfully)
- App loads login page successfully

## Backlog
- No modifications requested. Running as-is per user instructions.
