# Central Inventory - PRD

## Architecture
- **Frontend**: React 19 + CRACO + Tailwind + Radix UI
- **Backend**: FastAPI proxy → preprod.mygenie.online POS API
- **Auth**: POS V1 login + profile → token in MongoDB

## What's Been Implemented

### Session 1-4 — Setup, Diagnosis, Contract Stabilization, E2E Testing
- 10 API contract fixes, 18/18 E2E tests passed

### Session 5 — Hierarchy Diagnosis
- Found `allow_cross_central_franchise_dispatch` setting controls cross-branch edges

### Session 6 — Request Stock Flow E2E Testing (25 May 2026)
- **24/24 tests PASSED** against real POS APIs
- Two NEW endpoints tested and verified: `request-sources`, `request-catalog`
- Full hierarchy validation tested across all actor types
- Cross-branch flag (`allow_cross_central_franchise_dispatch`) tested ON and OFF
- All POS credentials discovered and verified (7 users, password: Qplazm@10)
- Full results: `/app/memory/central_inventory/REQUEST_STOCK_E2E_TEST_RESULTS.md`

### Key Findings
1. `request-sources` and `request-catalog` are now deployed and working
2. Current `RequestStockForm.jsx` uses WRONG APIs (`getHierarchySummary` + `getInventoryMaster`)
3. Must switch to `request-sources` → `request-catalog` → `request` flow
4. `source_inventory_master_id` must come from SOURCE store catalog, not child's inventory
5. `source-options` requires SOURCE store token — child cannot query parent segments
6. `filter_bucket` is the safe default selector for requests

## Backlog
### P0 — Request Stock Frontend Rewrite
- [ ] Add `requestSources()` API method
- [ ] Add `requestCatalog(sourceRestaurantId)` API method
- [ ] Rewrite RequestStockForm: Step 1 source picker → Step 2 catalog → Step 3 submit
- [ ] Use `source_inventory_master_id` from catalog
- [ ] Add optional `from_restaurant_id` for non-default sources
- [ ] Gate submit by `can_submit_request`

### P2 — Known UI Gaps
- Transfer history Source/Destination show "—"
- Store Detail header shows "Store #1" instead of name
- pending-queues items have `id: null` (need to handle gracefully)
