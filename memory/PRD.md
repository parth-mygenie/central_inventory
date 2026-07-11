# Central Inventory - PRD

## Overview
Central Inventory management system by MyGenie. Cloned from `https://github.com/parth-mygenie/central_inventory.git`, branch `11-07-26`.

## Architecture
- **Backend**: FastAPI (Python) — API proxy to MyGenie preprod POS APIs + local MongoDB
- **Frontend**: React 19 + Craco + Tailwind CSS + Radix UI / shadcn components
- **Database**: MongoDB (local via Motor async driver)
- **Auth**: Proxied to MyGenie preprod vendor employee login

## What's Been Implemented (July 11, 2026)
- Repo cloned and deployed successfully
- Backend running on port 8001 (FastAPI + uvicorn)
- Frontend running on port 3000 (React via Craco)
- Environment variables configured (.env files restored)
- All dependencies installed (pip + yarn)
- App accessible at preview URL with login page rendering correctly

## Key Modules (from repo)
- Operations Hub, Hierarchy Summary, Store Management
- Stock Inventory, Ingredient/Product Catalogues
- Purchase Orders, Vendor Management
- Production Runs, Sub-Recipe Master
- Wastage Reports, Daily Consumption
- Direct Dispatch, Request Stock, Stock Adjustment
- History Ledger, Pending Queues

## Backlog
- No user-requested features pending — repo was pulled and run as-is
