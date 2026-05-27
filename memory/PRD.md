# Central Inventory - PRD

## Problem Statement
Pull and run the Central Inventory app from `https://github.com/parth-mygenie/central_inventory.git` (branch `27_5_26_2`) as-is.

## Architecture
- **Backend**: FastAPI (Python) — acts as API proxy to MyGenie POS preprod APIs
- **Frontend**: React 19 + Craco + Tailwind CSS + Radix UI + Recharts
- **Database**: MongoDB (via Motor async driver)
- **Auth**: Proxied through MyGenie vendor employee login

## What's Been Implemented (May 27, 2026)
- Cloned repo from GitHub branch `27_5_26_2`
- Created `.env` files for both backend and frontend with correct environment variables
- Installed all Python and Node.js dependencies
- Both services running successfully via supervisor

## Core Features (from repo)
- Login via MyGenie vendor account
- Central inventory hierarchy summary/detail
- Pending transfer queues
- Transfer management (initiate, approve, reject, dispatch, receive, cancel)
- Stock request flow (3-step: sources → catalog → request)
- Stock adjustments (increase/decrease)
- Wastage recording and reporting
- Franchise management
- Vendor management (CRUD)
- Procurement (add stock purchase)
- Operational settings

## Backlog
- P0: None — app pulled and running as requested
- P1: Testing with real MyGenie credentials
- P2: Any feature additions per user request
