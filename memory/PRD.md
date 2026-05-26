# Central Inventory - PRD

## Original Problem Statement
Central Inventory management system for MyGenie — multi-restaurant hierarchy (master → central → franchise) with inventory transfer lifecycle management. P16 refined request-line lifecycle frontend implementation.

## Architecture
- **Frontend**: React 19 + Craco + TailwindCSS + Radix UI + Recharts
- **Backend**: FastAPI proxy to preprod.mygenie.online POS API (Laravel)
- **Database**: MongoDB (local session/cache), MySQL (POS backend)
- **External APIs**: `preprod.mygenie.online/api/v1` (auth), `preprod.mygenie.online/api/v2/vendoremployee` (all inventory transfer ops)

## What's Been Implemented
- [2026-05-26] Cloned repo from `26_5_26_1` branch
- [2026-05-26] P16 Lifecycle Revalidation — 16 API scenarios verified
- [2026-05-26] P16 Frontend Implementation — ALL 4 PHASES COMPLETE
- [2026-05-26] P16 Re-approve lifecycle rendering bug FIXED
- [2026-05-26] **E2E UAT PASS — Full multi-wave lifecycle verified (Transfer #112)**

### E2E UAT Results (Transfer #112)

| Step | Action | API Result | Frontend Verified |
|------|--------|-----------|-------------------|
| 1 | Create request (F786→C782, 0.4kg red meat) | T112 created, status=requested | N/A |
| 2 | Partial approve (0.3kg from seg 36) | status=partially_approved, hold=0.1 | Line: "Partially Approved", Breakdown: Req:0.4 Appr:0.3 Hold:0.1, Actions: Approve More visible |
| 3 | Second wave (approve remaining 0.1kg) | status=approved, hold=0, 2 waves | Line: "Approved", Hold gone, Approve More gone, Wave 1+2 audit trail |
| 4a | Dispatch | status=dispatched, 0.4kg dispatched | Timeline: 4 steps, Dispatched checkmark |
| 4b | Receive (full accept) | status=received | Terminal: "Received", all green, no actions, full breakdown preserved |

## Prioritized Backlog
- P1: OperationsHub dispute count card
- P2: Queue sub-filtering (requested vs partially_approved)
- P2: Approval wave collapsible audit per line

## Next Tasks
- Stakeholder review of P16 implementation
- Production deployment planning
