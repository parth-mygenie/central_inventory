# Central Inventory - PRD

## Original Problem Statement
Wipe current /app, pull https://github.com/parth-mygenie/central_inventory.git branch `9-6-26` as-is. Get tech stack from repo and get it running.

## Architecture & Tech Stack
- **Frontend**: React 19 + CRACO + Tailwind CSS 3 + Radix UI + shadcn/ui components + Recharts + React Router v7
- **Backend**: FastAPI (Python) + Motor (async MongoDB driver) + httpx (proxy to preprod POS API)
- **Database**: MongoDB (local)
- **External APIs**: Proxies to `preprod.mygenie.online` POS API (V1 auth, V2 vendor employee)
- **Build Tools**: CRACO (Create React App Configuration Override), Yarn
- **Key Libraries**: Pydantic, python-jose (JWT), bcrypt, litellm, openai, stripe, pandas

## What's Been Implemented (June 9, 2026)
- Cloned branch `9-6-26` from GitHub repo
- Created `.env` files for both frontend and backend with platform-specific config
- Installed all Python backend dependencies (125 packages)
- Installed all frontend Node.js dependencies via yarn
- Both services running successfully via supervisor
- App loads correctly - showing Central Inventory login page

## App Features (from codebase)
- Login via MyGenie vendor account (proxy auth)
- Operations Hub (SCR-01)
- Hierarchy Summary & Management
- Store Detail views
- Pending Queues
- Transfer Detail
- History Ledger
- Direct Dispatch, Request Stock, Stock Adjustment forms
- Wastage Entry & Reports
- Operational Settings
- Vendor Management
- Stock Purchase/Procurement
- Stock Inventory Summary & Detail
- Ingredient/Product/Recipe/Addon-Recipe Catalogues
- Daily Consumption Reports

## Backlog
- No testing performed (per user request)
- ESLint warnings in HierarchyManagement.jsx and PendingQueues.jsx (non-blocking)
