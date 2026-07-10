# Central Inventory — PRD

## Problem Statement
Pull repo `https://github.com/parth-mygenie/central_inventory.git` (branch `6-07-26`), wipe current `/app`, and get it running. No modifications, no testing — just pull and run.

## Architecture
- **Backend**: FastAPI (Python) — proxy to MyGenie POS preprod APIs + MongoDB for local state
- **Frontend**: React 19 + Tailwind CSS + Radix UI + shadcn components, bundled via CRACO
- **Database**: MongoDB (local, `test_database`)
- **External APIs**: MyGenie POS preprod (v1 & v2)

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React 19, React Router 7, Tailwind CSS, Radix UI, Recharts, Lucide Icons |
| Backend | FastAPI, Motor (async MongoDB), httpx (HTTP proxy), Pydantic |
| Database | MongoDB (localhost:27017) |
| Build Tool | CRACO (Create React App Configuration Override) |

## What's Been Implemented
- **2026-07-10**: Pulled repo from GitHub branch `6-07-26`, created `.env` files, installed all dependencies, started all services. App running successfully with login page visible.

## Core Features (from repo)
- Login via MyGenie vendor account (proxy auth)
- Operations Hub dashboard
- Vendor Management, Raw Materials, Purchase Orders
- Sub-Recipe Master, Production Runs, Production History
- Store Management, Product Catalogue, Stock Inventory
- Pending Queues, History Ledger, Dispatch/Request/Adjustment/Wastage
- Daily Consumption & Wastage Reports
- Operational Settings

## Prioritized Backlog
- No tasks — user requested pull-and-run only

## Next Tasks
- Awaiting user instructions for any modifications or features
