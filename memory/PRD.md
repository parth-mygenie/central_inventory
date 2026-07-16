# Central Inventory - PRD

## Original Problem Statement
1. Pull https://github.com/parth-mygenie/central_inventory.git (branch 16-7-26) and run
2. QA role: test reverse pull, PO by vendor/item, direct dispatch, request stock, quantity tracking
3. Investigation: why raw materials not showing after pull from 541 to palm collection
4. Investigation: recipe creation form missing food dropdown
5. Bug Fix: BUG-046 — add food Select dropdown in recipe add mode

## Architecture
- **Frontend**: React 19 + Craco + Tailwind CSS + Radix UI + Recharts + React Router v7
- **Backend**: FastAPI proxy → preprod.mygenie.online (zero business logic)
- **Database**: MongoDB (local, for session tokens only)
- **Auth**: Proxied to MyGenie POS V1 API

## What's Been Implemented
- [2026-07-16] Cloned repo, installed deps, deployed to preview environment
- [2026-07-16] QA Testing — 8/8 test cases PASS (test malai / Kunafa Mahal hierarchy)
- [2026-07-16] Investigation #1 — palm collection raw materials: incomplete reverse pull (RESOLVED by re-pull)
- [2026-07-16] Investigation #2 — recipe food dropdown missing: frontend bug identified
- [2026-07-16] BUG-046 FIX — Added food Select dropdown in RecipeCatalogue.jsx add mode (lines 326-338)

## BUG-046 Summary
- **File:** `frontend/src/components/central-inventory/RecipeCatalogue.jsx`
- **Fix:** Replaced static `<p>` tag with `<Select>` dropdown in add mode, populated from `foods` prop
- **Registry:** Registered in registry.json, L4, L7. Dashboard data regenerated.
- **EXIT GATE:** All 5 checks PASS

## Accounts Used
- manager@testmalai.com (master, RID 811) / manager@kunafamahal.com (franchise, RID 689)
- captain@palmcollection.com (master, RID 812) / owner@palmhouse.com (franchise, RID 541)

## Next Action Items
- QA verification of BUG-046 (owner smoke test)
- POS API concern: reverse-push-form reports 0 for stock_items/categories incorrectly
