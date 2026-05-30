# Central Inventory — PRD

> **Last updated:** 29 May 2026
> **Consolidated ledger:** `AI/Plans/PROJECT_LEDGER.md` (canonical — replaces this PRD for detailed status)

## Quick Status

| Phase | Status | Tests |
|-------|--------|:-----:|
| Slices 1-4 (Foundation) | CLOSED (23 May) | Passed |
| Slice 5 (Phases 0-7) | CLOSED (24 May) | 55/57 |
| P17-P20 (Phase 2 features) | IMPLEMENTED | All pass |
| P21 Catalogue + Gaps | IMPLEMENTED | 17/17 FE + 30/30 BE |
| P22 Consumption Report | IMPLEMENTED (29 May) | 12/12 FE |
| P23 Hierarchy Management | IMPLEMENTED (29 May) | 12/12 FE |
| P24 FEFO Batch Stock | **PLANNED + API VALIDATED** | Awaiting impl |
| P21 Smart Dispatch | **PLANNED** (brainstorm) | Awaiting impl |

## Tech Stack
- Frontend: React 19, Tailwind CSS 3, Radix UI, Lucide, Axios, craco
- Backend: FastAPI proxy → preprod.mygenie.online POS API
- Database: MongoDB (session storage only)

## Source of Truth Hierarchy
1. `AI/Plans/PROJECT_LEDGER.md` — consolidated status + handoff
2. `AI/Plans/api_implementation_status_p{XX}_addendum.md` — per-phase API evidence
3. `AI/Plans/phase{N}/P{XX}_*.md` — detailed planning docs
4. `AI/curls/p{XX}_*.sh` — API validation curl evidence
5. `memory/central_inventory/SYSTEM_HANDOVER_DOCUMENT.md` — architecture reference
6. `memory/test_credentials.md` — all test accounts + data notes

## Next Priority
1. P24 FEFO detail panel implementation (~10-13h)
2. P20 hierarchy toggle (~3-4h)
3. P21 smart dispatch Phase 1 (~4-5h)
