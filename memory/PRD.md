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
- [2025-05-24] POS API Context Migration Phase 1: COMPLETE — Login context now sourced from POS API `GET /api/v1/vendoremployee/profile → restaurants[0]`. Seed fallback gated behind `SEED_FALLBACK_ENABLED` env flag (default: false). Token→restaurant_id persisted in MongoDB. Zero frontend changes.

## Architecture Notes
- POS API (`preprod.mygenie.online`) login endpoint returns: token, permissions, role_names, login_type — but NOT restaurant_type_flag, restaurant_id, or restaurant_name
- **Phase 1 COMPLETE:** Proxy now calls `GET /api/v1/vendoremployee/profile` after login to get `restaurants[0]` with all context fields
- EMAIL_RESTAURANT_MAP in seed_data.py is now ONLY used as demo/dev fallback (gated by `SEED_FALLBACK_ENABLED` env flag, default false)
- Token→restaurant_id persisted in MongoDB `token_sessions` collection (survives server restart)
- All inventory, transfer, queue, history data endpoints still use seed_data.py (Phase 2/3 scope)
- Write operations (dispatch, approve, etc.) pass through to POS API

## Backlog
- P0-PRODUCTION: Migrate restaurant context from seed_data to POS API (blocks production deployment)
- P0-PRODUCTION: Migrate inventory/transfer/queue/history data to POS API (blocks production deployment)
- P2: Persist _token_restaurant_map to MongoDB (currently in-memory, volatile on server restart)
- P2: Change _get_actor_restaurant() default from restaurant_id=1 to 401 error

## POS API Discovery (24 May 2026)
- `GET /api/v1/vendoremployee/profile` returns `restaurants[]` with: id, name, restaurant_type_flag, parent_restaurant_id — ALL required context fields
- `GET /api/v2/vendoremployee/franchise/list` returns parent/children hierarchy
- Verified for all 4 user types via runtime API probes
- Migration plan ready: Phase 1 (login context) has ZERO blockers

## Next Tasks
- **P0: Phase 1 POS API Context Migration** — Replace EMAIL_RESTAURANT_MAP with POS API profile call in server.py
- QA validation of login context collision fix
- Slice 5 owner smoke test
- Slice 5 closure documentation
