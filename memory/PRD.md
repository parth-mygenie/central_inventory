# Central Inventory - PRD

## Original Problem Statement
Wipe current /app, pull -> https://github.com/parth-mygenie/central_inventory.git, branch -> 18-6-26, don't need to focus anywhere or need to test anything, just pull and run. Get tech stack from repo, it's public, no special key, everything in repo.

## Architecture & Tech Stack
- **Backend**: FastAPI (Python) + Motor (async MongoDB driver) + uvicorn
- **Frontend**: React 19 + Tailwind CSS + CRACO + Radix UI + React Router v7 + Recharts
- **Database**: MongoDB (local)
- **External APIs**: MyGenie POS preprod APIs (v1/v2) for auth and data proxy

## What's Been Implemented
- **2026-06-18**: Pulled repo from GitHub (branch `18-6-26`), created .env files, installed dependencies, started services
  - Backend running on port 8001 (FastAPI)
  - Frontend running on port 3000 (React/CRACO)
  - MongoDB running locally
  - App loads successfully with login page

## Core Modules (from repo)
- Login/Auth (via MyGenie POS API proxy)
- Operations Hub (Dashboard)
- Vendor Management
- Raw Materials / Ingredient Catalogue
- Purchase Orders
- Sub-Recipe Master
- Production (Run, History)
- Store Management
- Product Catalogue
- Stock Inventory
- Pending Queues
- History Ledger
- Dispatch, Request Stock, Stock Adjustment, Wastage
- Reports (Consumption, Wastage)
- Operational Settings

## Backlog
- No additional tasks requested by user at this time
