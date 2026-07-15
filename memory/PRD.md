# Central Inventory - PRD

## Original Problem Statement
Clone https://github.com/parth-mygenie/central_inventory.git (branch: 15-07-26) and run it. Then investigate and fix G-031 (Reverse Push stock_items 500). Raise timeout to 100s and add loading UI.

## Architecture
- **Backend**: FastAPI (Python) proxy-only layer → preprod.mygenie.online POS API
- **Frontend**: React 19 + CRACO + Tailwind CSS + Radix UI + React Router
- **Database**: MongoDB (local, for session/status only)
- **POS Backend**: preprod.mygenie.online (Laravel/MySQL — external, not controlled)

## What's Been Implemented
- [2026-07-15] Cloned repo, installed deps, configured env, all services running
- [2026-07-15] G-031 INVESTIGATION: Verified all 4 rounds of backend fixes
- [2026-07-15] G-031 BUG FIX: Proxy timeout 30→50s, axios per-call 50s, 409 handling, not_seeded StatusChip
- [2026-07-15] G-031 IMPLEMENTATION: Timeout raised to 100s, enhanced loading UI with elapsed timer + stage messages for both push (overlay) and pull (dialog)

## Current Status
- Backend: ✅ Running, proxy timeout 100s for push endpoints
- Frontend: ✅ Compiled, loading UI + 409 handling + not_seeded wired
- EXIT GATE: ✅ All 5 checks pass (code markers ×11, compile 0 new warnings, dashboard drift PASS)

## Prioritized Backlog
- P1: QA re-run of iteration_59 Phases 2a-2e through wizard (UI-level)
- P2: Per-module progress bar (requires backend streaming — future)

## Test Credentials
- Master (RID 809): owner@bholechature.com / Qplazm@10
- Franchise (RID 689): owner@kunafamahal.com / Qplazm@10
- Central (RID 806): manager@germanfluid.com / Qplazm@10
