# PRD — Central Inventory CR Requirement Planning + API Verification Tool

## Original Problem Statement
CR Requirement Planning for MyGenie POS Central Inventory Module + Build Internal API Verification Tool (Phase 1 support module).

## Architecture & Tasks Done
1. **CR Requirement Planning** (PLANNING ONLY — no code implementation of inventory module)
   - Output: `/app/memory/central_inventory/CENTRAL_INVENTORY_CR_REQUIREMENT_PLANNING.md` (2281 lines, 28 sections)
   - Raw Reference Docs: `/app/memory/central_inventory/raw_reference/`

2. **Internal API Verification Tool** (BUILT & TESTED)
   - Backend: FastAPI proxy endpoint + verification CRUD + API catalog
   - Frontend: React developer console at `/verify` route
   - Stack: React + Tailwind + FastAPI + MongoDB
   - 17/17 backend tests passed, all frontend features working

## Tech Stack
- Frontend: React 19, Tailwind CSS, Phosphor Icons, IBM Plex Sans + JetBrains Mono fonts
- Backend: FastAPI, httpx (proxy), Motor (MongoDB async)
- Database: MongoDB (api_verifications collection)
- External API: preprod.mygenie.online (MyGenie POS backend)

## User Personas
1. Developer/Admin using API Verification Tool
2. Central Store Manager (top-level, manages all stock distribution)
3. Master Store Manager (mid-level, manages regional stock + outlets)
4. Outlet Manager (bottom-level, receives stock, manages consumption)

## Core Requirements (Static)
- CRITICAL: Backend terminology is INVERTED (backend master = business Central, backend central = business Master, backend franchise = business Outlet)
- Three-level inventory hierarchy: Central → Master → Outlet
- Internal API verification tool before frontend integration
- Comprehensive Phase 1 (production-grade)

## What's Been Implemented
- [Jan 2026] CR Requirement Planning Document — all 16 stages completed
- [Jan 2026] Internal API Verification Tool — fully built and tested
  - 20 pre-configured APIs in catalog (6 groups)
  - Proxy-based API testing (no CORS issues)
  - Terminology mapping warnings (scans responses for master/central/franchise)
  - 9 verification statuses
  - Save/load/delete evidence records in MongoDB
  - Dark developer-console aesthetic (Swiss + Retro-Futurism)

## Prioritized Backlog
### P0 — Blocking
- Owner must answer 50+ questions from CR planning
- API verification execution with real tokens
- Missing APIs: stock adjustment, wastage, return, recipe, permissions

### P1 — High Priority
- Terminology mapping owner confirmation
- MVP scope approval
- Frontend analysis (after API verification)

### P2 — Medium Priority
- Central Inventory UI implementation
- UI/UX detailed design
- Implementation planning
- QA planning

## Next Tasks
1. Collect owner answers to question packet
2. Obtain test tokens for Central/Master/Outlet roles
3. Execute API verification using the built tool
4. Capture actual response evidence
5. Confirm terminology mapping with owner
6. Proceed to frontend analysis and UI implementation
