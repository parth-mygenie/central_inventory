# Central Inventory - PRD

## Problem Statement
Pull repo https://github.com/parth-mygenie/central_inventory.git (branch: 30_5_26_1), wipe existing /app, and run as-is.

## Tech Stack
- **Backend**: Python FastAPI + Motor (async MongoDB driver) + httpx
- **Frontend**: React 19 + Tailwind CSS + Radix UI + CRACO + Recharts
- **Database**: MongoDB
- **Key Libraries**: axios, react-router-dom, zod, react-hook-form, lucide-react, sonner

## Architecture
- Backend acts as a proxy to MyGenie preprod APIs (V1 auth, V2 vendor employee endpoints)
- Frontend is a central inventory management dashboard
- MongoDB stores token sessions and status checks

## What's Been Implemented
- [Jan 2026] Cloned repo from GitHub branch `30_5_26_1`, restored platform .env files, installed all dependencies, both services running successfully.

## Status
- Backend: RUNNING (API responding at /api/)
- Frontend: COMPILED with warnings only (no errors)
- App accessible at preview URL
