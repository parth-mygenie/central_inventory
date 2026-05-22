# Central Inventory - PRD

## Problem Statement
Clone and run the Central Inventory application from GitHub repo `parth-mygenie/central_inventory` (branch: `final_for_working_22_5_26`). No code modifications — just get it running.

## Architecture
- **Backend**: FastAPI (Python) — proxy server that forwards requests to `preprod.mygenie.online` APIs with seed data enrichment
- **Frontend**: React (CRA + CRACO) with Tailwind CSS, Radix UI, shadcn/ui components
- **Database**: MongoDB (used for status checks; main data is proxied/seeded)
- **Auth**: Proxied to MyGenie preprod auth API

## Tech Stack
- FastAPI + Motor (async MongoDB) + httpx (HTTP proxy)
- React 19 + React Router 7 + Axios + Recharts + Radix UI
- Tailwind CSS 3 + shadcn/ui component library

## Key Screens
1. **Login** — Email/password auth via MyGenie preprod API
2. **Operations Hub** (SCR-01) — Dashboard overview
3. **Hierarchy Summary** (SCR-02) — Store hierarchy with transfer summaries
4. **Store Detail** (SCR-03) — Individual store inventory/transfers
5. **Pending Queues** (SCR-05) — Approval/receive pending transfers
6. **Transfer Detail** (SCR-09) — Individual transfer details

## What's Been Implemented (Jan 2026)
- [x] Cloned repo from GitHub (branch: final_for_working_22_5_26)
- [x] Restored environment files (MONGO_URL, REACT_APP_BACKEND_URL)
- [x] Installed backend Python dependencies
- [x] Installed frontend Node.js dependencies
- [x] Both services running via supervisor
- [x] Backend API verified responding
- [x] Frontend compiled and serving login page

## Seed Data Accounts (from seed_data.py)
- `abhishek@kalabahia.com` → My Genie (master, ID=1)
- `owner@democentral1.com` → DemoCentral1 (central, ID=781)
- `owner@democentral2.com` → DemoCentral2 (central, ID=782)
- `owner@demofranchise1.com` → DemoFranchise1 (franchise, ID=783)
- Various other demo accounts

## Next Action Items
- User to test login with their MyGenie preprod credentials
- Any feature additions or bug fixes as requested
