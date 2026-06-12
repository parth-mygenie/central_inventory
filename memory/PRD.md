# Central Inventory — PRD

## Problem Statement
1. Clone and run Central Inventory from `parth-mygenie/central_inventory` (branch `13-6-26`) as-is
2. Perform end-to-end validation of P30 M0 Production Flow using fresh entities against preprod POS API

## Tech Stack
- **Frontend**: React 19, Tailwind CSS 3, Radix UI, craco, react-router-dom, recharts
- **Backend**: FastAPI proxy → preprod.mygenie.online POS API
- **Database**: MongoDB (local, for token sessions)
- **External**: MyGenie POS preprod API (restaurant 806)

## Architecture
- Backend proxies all calls to MyGenie POS API v1/v2
- Auth: POS vendor employee login enriched with restaurant context
- Frontend: Multi-page app for inventory management, transfers, production

## What's Been Implemented
- **2026-06-13**: Cloned repo, installed deps, started services
- **2026-06-13**: Full P30 M0 Production validation:
  - Created hierarchy: 806(master) → 807(central) → 808(central) → 809(franchise)
  - Added 33 new ingredients from Excel recipe data (44 total)
  - Created 2 vendors, purchased same ingredients at 2 price points
  - Created 3 new sub-recipes (Sesame, Ragi, Oats cookies)
  - Ran 4 production batches (PRD-0002 through PRD-0005)
  - Verified FEFO ordering, segment reconciliation, cost inheritance
  - Documented 2 critical blockers (transfer ref code collision, child login failure)

## Validation Status
- **Full report**: `/app/AI/Plans/P30_M0_PRODUCTION_VALIDATION_REPORT.md`
- Catalogue/GRN/Production: ✅ All pass
- Transfers: ❌ Blocked (POS backend bugs)
- Child store auth: ❌ Blocked

## Backlog
- P0: Fix transfer reference code collision (POS backend)
- P0: Fix child store login after franchise/create (POS backend)
- P1: Re-validate all transfer flows after fixes
- P1: Consumption testing with POS orders
- P2: Push updated ingredients to children, re-push bundles
