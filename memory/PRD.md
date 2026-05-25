# Central Inventory — PRD

## Original Problem Statement
Pull repo from `https://github.com/parth-mygenie/central_inventory.git` (branch `24_5_26_1`), explore the tech stack, and get it running as-is. No modifications or testing needed.

## Architecture
- **Backend**: FastAPI (Python) — acts as a proxy to `preprod.mygenie.online` APIs + seed data enrichment
- **Frontend**: React 19 + Tailwind CSS + shadcn/ui (Radix) + craco build tool + react-router-dom v7
- **Database**: MongoDB via Motor (async driver) — used for status checks; main data is proxied from external API + seed data
- **Key Pattern**: Backend proxies auth to MyGenie POS API (token only). ALL restaurant context (type, ID, name, hierarchy, transfers, queues, history, stock) sourced from local seed_data.py. POS API is NOT the source of truth for restaurant context — this is by design for UX prototyping phase.

## Tech Stack
- Python 3.11, FastAPI 0.110, Motor 3.3, Pydantic 2.x, httpx
- React 19, react-router-dom 7.5, axios, recharts, shadcn/ui (Radix), Tailwind 3.4, craco
- MongoDB (local)

## Core Features
- Login (proxied auth to MyGenie vendor API)
- Operations Hub dashboard
- Hierarchy Summary & Store Detail views
- Pending Queues (approval, receive, my requests)
- Transfer Detail view with status timeline
- History Ledger
- Direct Dispatch, Request Stock, Stock Adjustment, Wastage Entry forms
- Wastage Report

## User Personas (from seed data)
- Central Store users (abhishek@kalabahia.com, killua@zoldyck.com → My Genie, ID=1)
- Master Store owners (owner@democentral1.com → ID=781, owner@democentral2.com → ID=782)
- Outlet owners (owner@demofranchise1-4.com → IDs 783-786)

## What's Been Implemented
- [2025-05-24] Cloned repo, restored .env files, installed dependencies, started services — app running as-is
- [2025-05-24] Login context collision bug investigation completed (root cause: killua@zoldyck.com missing from EMAIL_RESTAURANT_MAP + frontend hard default to Central Store)
- [2025-05-24] Bug fix: P0 added killua@zoldyck.com to seed_data.EMAIL_RESTAURANT_MAP, P1 hardened frontend fallback (null instead of "master" default)
- [2025-05-24] POS API Source-of-Truth Verification: CONFIRMED — POS API returns NO restaurant context fields. ALL context comes from seed_data.py. Acceptable for UX prototyping; blocks production.
- [2025-05-24] POS API Context Migration Phase 1: COMPLETE — Login context now sourced from POS API `GET /api/v1/vendoremployee/profile → restaurants[0]`. Token→restaurant_id persisted in MongoDB.
- [2025-05-25] SEED SHUTDOWN COMPLETE — Removed `import seed_data`, `SEED_FALLBACK_ENABLED`, 5 dedicated seed-backed handlers, `_get_actor_restaurant`. All V2 endpoints now pass through generic proxy to real POS API. Fixed 2 hardcoded frontend IDs in RequestStockForm.jsx. Added `parent_restaurant_id` to useLoginContext.js. Zero seed data in any real flow.

## Architecture Notes
- **SEED SHUTDOWN COMPLETE (25 May 2026):** Zero seed data in any real Central Inventory flow
- POS API login → POS API profile (`GET /api/v1/vendoremployee/profile`) → `restaurants[0]` for all context
- ALL V2 endpoints (hierarchy, queues, transfers, history, stock, wastage) go through generic pass-through proxy to real POS API
- `seed_data.py` exists in repo but is NOT imported or used by server.py
- Token→restaurant_id persisted in MongoDB `token_sessions` collection
- Frontend uses `parent_restaurant_id` from POS profile for dynamic parent resolution (no hardcoded IDs)

## Backlog
- Delete `seed_data.py` file (currently unused but still in repo)
- Slice 5 owner smoke test
- Slice 5 closure documentation

## Next Tasks
- **Seed Shutdown QA** — Verify all flows use real POS API data
- Slice 5 owner smoke test
- Slice 5 closure documentation
