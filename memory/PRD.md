# Central Inventory - PRD

## Original Problem Statement
Wipe current /app, pull from https://github.com/parth-mygenie/central_inventory.git branch `26_5_26_1` as-is, get tech stack from repo, don't run any tests, just pull and run. Public repo.

## Architecture
- **Frontend**: React 19 + Craco + TailwindCSS + Radix UI + Recharts
- **Backend**: FastAPI (Python) + Motor (async MongoDB driver)
- **Database**: MongoDB
- **External APIs**: Proxies to preprod.mygenie.online for POS API

## What's Been Implemented
- [2025-05-26] Cloned repo from `26_5_26_1` branch, installed all dependencies, services running successfully
- Backend API responding at `/api/`
- Frontend compiled and serving the Central Inventory login page

## Core Features (from repo)
- Login context with vendor authentication
- Operations Hub (SCR-01)
- Hierarchy Summary (SCR-02)
- Store Detail (SCR-03)
- Pending Queues (SCR-05)
- Transfer Detail (SCR-09)
- History Ledger
- Direct Dispatch, Request Stock, Stock Adjustment, Wastage Entry/Report forms

## Backlog / Next Tasks
- User to provide any additional feature requests or bug fixes
- Seed data available in `backend/seed_data.py` if needed
