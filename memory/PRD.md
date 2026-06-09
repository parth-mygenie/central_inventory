# Central Inventory — PRD

## Original Problem Statement
P26 API Validation Only — Validate G-012 (Request Catalog Categories) and G-013 (Reference Codes) against live POS API using new test hierarchy (Tokyo Garden 798 master → Kyoto Garden 799 franchise + Hokkaido Garden 800 franchise).

## Architecture
- **Frontend**: React 19 + CRACO + Tailwind CSS 3 + Radix UI + shadcn/ui
- **Backend**: FastAPI proxy → preprod.mygenie.online POS API
- **Database**: MongoDB (local session cache only)

## What's Been Implemented (June 9, 2026)
- Cloned branch `9-6-26` from GitHub repo
- Ran P26 validation: 10 API probes against live POS API
- Created validation addendum: `/app/AI/Plans/api_implementation_status_p26_addendum.md`

## P26 Validation Results
- **G-012 (Request Catalog Categories)**: ✅ PASS — all fields present, sorted, groupable
- **G-013 (Reference Codes)**: 🔴 PARTIAL — read path PASS, write path BLOCKED by POS API bug (empty reference_code + unique constraint)

## Critical Finding
POS API `POST /inventory-transfer/request` inserts empty string for `reference_code`. Unique constraint on column means only ONE new transfer can be created. All subsequent creates fail with SQL integrity violation. Requires POS API team fix.

## Prioritized Backlog
### P0 — Blockers
1. POS API team: Fix `reference_code` generation in write path

### P1 — Ready for Implementation (after POS fix)
2. G-012: Category grouping UI in `RequestStockForm` step 2
3. G-013: Display `reference_code` in TransferDetail, PendingQueues, HistoryLedger

### P2 — Deferred
4. P24 FEFO batch stock detail panel
5. P20 hierarchy toggle
6. P21 Smart Dispatch
