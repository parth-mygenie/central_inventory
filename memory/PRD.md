# Central Inventory - PRD

## Original Problem Statement
1. Pull https://github.com/parth-mygenie/central_inventory.git (branch 16-7-26) and run
2. QA role: test reverse pull, PO by vendor/item, direct dispatch, request stock, quantity tracking

## Architecture
- **Frontend**: React 19 + Craco + Tailwind CSS + Radix UI + Recharts + React Router v7
- **Backend**: FastAPI proxy → preprod.mygenie.online (zero business logic)
- **Database**: MongoDB (local, for session tokens only)
- **Auth**: Proxied to MyGenie POS V1 API

## What's Been Implemented
- [2026-07-16] Cloned repo, installed deps, deployed to preview environment
- [2026-07-16] QA Testing completed — 8/8 test cases PASS

## QA Report Summary (2026-07-16)
- ✅ Reverse Pull from Outlet (493 items pulled)
- ✅ PO by Vendor (PO-811-2026-0001, ₹1100)
- ✅ PO by Item Need (PO-811-2026-0002, ₹2460)
- ✅ PO Lifecycle (approve → send → receive)
- ✅ Direct Dispatch master→franchise (TRF-811-2026-0001)
- ✅ Request Stock franchise←master (TRF-811-2026-0002)
- ✅ Full receive cycle on both transfers
- ✅ Quantity tracking verified (all deltas match)

## Accounts Tested
- manager@testmalai.com (master, RID 811)
- manager@kunafamahal.com (franchise, RID 689)

## Next Action Items
- Awaiting owner direction for further testing or feature work
