# Central Inventory - PRD

## Original Problem Statement
Pull branch `19_05_26` from `https://github.com/parth-mygenie/central_inventory.git` and set up as-is.

## Architecture
- **Backend**: FastAPI (Python) — API proxy to `preprod.mygenie.online` with local seed data enrichment
- **Frontend**: React 19 + Tailwind CSS + Radix UI + Craco
- **Database**: MongoDB (used for status checks, main data from seed_data.py)
- **Auth**: Proxied to MyGenie preprod auth API

## User Personas
- **Central Store (master)**: Top-level — full access to all screens and actions
- **Master Store (central)**: Mid-level — manages outlets, can approve/dispatch
- **Outlet (franchise)**: Bottom-level — limited, read-only on most screens

## Core Requirements
- Login via MyGenie vendor account
- Operations Hub dashboard with pending counts
- Hierarchy Summary with store listing (Master Stores / Outlets tabs)
- Store Detail with stock summary, batch drilldown, transactions
- Pending Queues (Approval, Receive, My Requests)
- Transfer Detail (read-only)
- Terminology mapping: backend "master"→"Central Store", "central"→"Master Store", "franchise"→"Outlet"

## What's Been Implemented (May 19, 2026)
- Full codebase pulled from GitHub branch `19_05_26`
- Backend running with FastAPI proxy + seed data enrichment
- Frontend running with all screens: Login, Operations Hub, Hierarchy Summary, Store Detail, Pending Queues, Transfer Detail
- All tests passing (100% backend, 100% frontend)

## Key Seed Data
- Restaurants: My Genie (1), DemoCentral1 (781), DemoCentral2 (782), DemoFranchise1-4 (783-786)
- Transfer IDs: 101-112 covering all statuses
- 16 inventory items

## P0/P1/P2 Features Remaining
- **P0**: Write API integration (dispatch, approve, reject, receive, cancel) — currently blocked
- **P1**: KPI Dashboard (pending owner definition)
- **P1**: Reports screen (marked "coming soon")
- **P2**: Stock adjustment, wastage recording
- **P2**: Real-time updates

## Backlog / Next Tasks
- Enable write operations when backend resolution is available
- Define KPI metrics with product owner
- Build Reports screen
- Add unit conversion support
