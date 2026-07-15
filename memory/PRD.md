# Central Inventory - PRD

## Original Problem Statement
Clone https://github.com/parth-mygenie/central_inventory.git (branch: 15-07-26) and run it. Then investigate and fix G-031 (Reverse Push stock_items 500).

## Architecture
- **Backend**: FastAPI (Python) proxy-only layer → preprod.mygenie.online POS API
- **Frontend**: React 19 + CRACO + Tailwind CSS + Radix UI + React Router
- **Database**: MongoDB (local, for session/status only)
- **POS Backend**: preprod.mygenie.online (Laravel/MySQL — external, not controlled)

## What's Been Implemented
- [2026-07-15] Cloned repo, installed deps, configured env, all services running
- [2026-07-15] G-031 INVESTIGATION: Verified all 4 rounds of backend fixes (stock_items dedupe, per-module commits, concurrency guard 409, N+1 speedup)
- [2026-07-15] G-031 BUG FIX: Proxy timeout 30→50s for push paths, axios per-call 50s, 409 handling, not_seeded StatusChip

## Current Status
- Backend: ✅ Running, proxy timeout fixed
- Frontend: ✅ Compiled, 409 handling + not_seeded wired
- All push operations (forward + reverse) succeed through proxy

## Prioritized Backlog
- P1: QA re-run of iteration_59 Phases 2a-2e through wizard (not just curl)
- P2: Monitor backend response times — 50s timeout gives 2-17s headroom
- P2: Skipped module badge (deferred — round 4 removed skipped:true, stock_items is now normal synced module)

## Test Credentials
- Master (RID 809): owner@bholechature.com / Qplazm@10
- Franchise (RID 689): owner@kunafamahal.com / Qplazm@10
- Central (RID 806): manager@germanfluid.com / Qplazm@10
