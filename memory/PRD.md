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

## Architecture Notes
- POS API (`preprod.mygenie.online`) login endpoint returns: token, permissions, role_names, login_type — but NOT restaurant_type_flag, restaurant_id, or restaurant_name
- EMAIL_RESTAURANT_MAP in seed_data.py is the SOLE source of user→restaurant mapping
- All inventory, transfer, queue, history data is from seed_data.py (static/random)
- Write operations (dispatch, approve, etc.) pass through to POS API

## Backlog
- P0-PRODUCTION: Migrate restaurant context from seed_data to POS API (blocks production deployment)
- P0-PRODUCTION: Migrate inventory/transfer/queue/history data to POS API (blocks production deployment)
- P2: Persist _token_restaurant_map to MongoDB (currently in-memory, volatile on server restart)
- P2: Change _get_actor_restaurant() default from restaurant_id=1 to 401 error

## Next Tasks
- QA validation of login context collision fix
- Slice 5 owner smoke test
- Slice 5 closure documentation
