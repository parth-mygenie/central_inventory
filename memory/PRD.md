# Central Inventory — PRD

> **Last updated:** 29 May 2026 (evening — P24 FEFO validated)
> **Consolidated ledger:** `AI/Plans/PROJECT_LEDGER.md` (canonical)

## Quick Status

| Phase | Status | Tests |
|-------|--------|:-----:|
| Slices 1-5 | CLOSED | Passed |
| P17-P21 | IMPLEMENTED | All pass |
| P22 Consumption Report | IMPLEMENTED | 12/12 FE |
| P23 Hierarchy Management | IMPLEMENTED | 12/12 FE |
| P24 FEFO Batch Stock | **PLANNED + FEFO PROVEN OPERATIONAL** | Awaiting impl |

## Key P24 Finding (29 May 2026)
FEFO consumption IS operational. Order #869395 at F3 (DemoFranchise3) confirmed:
- `segment_allocations` populated with batch/segment_id/qty/expiry
- Earliest-created segment consumed first (FEFO order correct)
- `inventory_master` matches segment totals (reconciliation balanced)
- Both recipe and addon ingredients are FEFO-aware

## Next Priority
1. P24 FEFO detail panel implementation (~10-13h)
2. P20 hierarchy toggle (~3-4h)
3. P21 smart dispatch Phase 1 (~4-5h)
