# Central Inventory - PRD

## Original Problem Statement
Pull from https://github.com/parth-mygenie/central_inventory.git branch `27_5_26`, wipe existing /app, install and run as-is. No tests, no modifications.

## Tech Stack
- **Frontend**: React 19, Tailwind CSS, Radix UI, Recharts, React Router DOM, Craco, shadcn/ui components
- **Backend**: Python FastAPI, Motor (async MongoDB), httpx (HTTP proxy to MyGenie POS API)
- **Database**: MongoDB (local)
- **External APIs**: MyGenie POS preprod API (v1 auth, v2 vendor operations)

## Architecture
- Backend acts as a proxy to MyGenie's preprod POS API (`preprod.mygenie.online`)
- Auth proxied through `/api/proxy/auth/login` → POS common-login
- V2 endpoints proxied through `/api/proxy/v2/{path}` → POS vendor employee API
- Frontend is a Central Inventory management app for MyGenie vendors

## What's Been Implemented (May 26, 2026)
- Cloned repo from branch `27_5_26`
- Restored `.env` files (MONGO_URL, REACT_APP_BACKEND_URL, etc.)
- Installed all Python and Node dependencies
- Both backend and frontend services running successfully
- App accessible with login page displayed

## Status
- Backend: RUNNING (FastAPI on port 8001)
- Frontend: RUNNING (React on port 3000)
- MongoDB: RUNNING
- App: Live and accessible

## Next Action Items
- None (user requested pull & run only)
