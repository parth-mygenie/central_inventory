# Central Inventory - PRD

## Original Problem Statement
Central Inventory app — full operational validation and hierarchy rule diagnosis.

## Architecture
- **Frontend**: React 19 + CRACO + Tailwind + Radix UI
- **Backend**: FastAPI proxy → preprod.mygenie.online POS API
- **Auth**: POS V1 login + profile enrichment → token in MongoDB

## What's Been Implemented

### Session 1 — Repo Setup (25 May)
### Session 2 — Full Diagnosis (25 May) — 14 integration failures
### Session 3 — Contract Stabilization (25 May) — 10 fixes, 11/11 API tests
### Session 4 — Full E2E Testing (25 May) — 18/18 frontend tests
### Session 5 — Hierarchy Validation Diagnosis (25 May)

**Finding:** Central → Franchise dispatch fails with `INVALID_HIERARCHY` because:
- POS operational settings schema has NO `allow_central_direct_franchise` setting
- The setting `allow_master_direct_franchise` only controls Master→Franchise
- The setting `allow_lateral_central_transfer` only controls Central↔Central
- Central→Franchise is NOT covered by any setting → POS defaults to REJECT
- This SAME edge DID work in January 2026 e2e tests (regression)
- Full diagnosis: `/app/memory/central_inventory/CENTRAL_INVENTORY_HIERARCHY_VALIDATION_DIAGNOSIS.md`

**Resolution path:** POS backend team needs to add `allow_central_direct_franchise` to settings schema

## P0 Blocking Items
1. **POS backend**: Add `allow_central_direct_franchise` operational setting
2. **POS credentials**: Login credentials not working (401) — need valid test accounts

## P2 Known UI Gaps
- Transfer history Source/Destination show "—"
- Store Detail header shows "Store #1" instead of name
- Transfer Detail From/To show "—"
