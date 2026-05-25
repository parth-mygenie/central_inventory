# Central Inventory - PRD

## Original Problem Statement
User requested to wipe /app and pull the repo `https://github.com/parth-mygenie/central_inventory.git` (branch `25_5_26_AJ`) as-is, without any modifications or tests. Just pull and run.

## Architecture & Tech Stack
- **Frontend**: React 19 with CRACO, Tailwind CSS, Radix UI components, Recharts
- **Backend**: FastAPI (Python) with Motor (async MongoDB driver)
- **Database**: MongoDB
- **External API**: Proxies to `preprod.mygenie.online` for vendor/inventory operations

## What Was Done
- **Date**: May 25, 2026
- Wiped existing /app contents (preserved .emergent and .git platform folders)
- Cloned repo from branch `25_5_26_AJ`
- Created .env files for backend (MONGO_URL, DB_NAME) and frontend (REACT_APP_BACKEND_URL)
- Installed all backend Python dependencies via pip
- Installed all frontend Node dependencies via yarn
- Started both services via supervisor — both running successfully
- Frontend compiles and loads (Central Inventory login page visible)
- Backend API responds correctly at /api/

## Core Features (from repo)
- MyGenie vendor account authentication (external API)
- Central Inventory management
- Stock request functionality
- Real-time inventory updates (via hooks)

## Status
- App is running as-is from the repo with no code modifications
