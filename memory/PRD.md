# Central Inventory - PRD

## Original Problem Statement
1. Pull https://github.com/parth-mygenie/central_inventory.git (branch 16-7-26) and run
2. QA role: test reverse pull, PO by vendor/item, direct dispatch, request stock, quantity tracking
3. Investigation role: why raw materials not showing after pull from 541 to palm collection

## Architecture
- **Frontend**: React 19 + Craco + Tailwind CSS + Radix UI + Recharts + React Router v7
- **Backend**: FastAPI proxy → preprod.mygenie.online (zero business logic)
- **Database**: MongoDB (local, for session tokens only)
- **Auth**: Proxied to MyGenie POS V1 API

## What's Been Implemented
- [2026-07-16] Cloned repo, installed deps, deployed to preview environment
- [2026-07-16] QA Testing — 8/8 test cases PASS (test malai / Kunafa Mahal hierarchy)
- [2026-07-16] Investigation — palm collection (812) / The Palm House (541) raw materials issue

## Investigation Summary (2026-07-16)
- **Issue:** Raw Material Master showed "No Ingredients" after reverse pull from franchise 541
- **Root Cause:** Initial reverse pull was incomplete — pulled `ingredients` (inventory_master) but NOT `stock_items` (stock records). The Raw Material Master uses `getStockInventory()` not `getInventoryMaster()`, so items without stock records don't appear.
- **Fix:** Re-ran full reverse pull (all modules) → 2 stock_item_categories + 45 stock_items created
- **Result:** 59 ingredients now visible on Raw Material Master ✅

## QA Report Summary (2026-07-16)
- ✅ Reverse Pull, PO by Vendor/Item, Direct Dispatch, Request Stock, Quantity Tracking

## Accounts Used
- manager@testmalai.com (master, RID 811) / manager@kunafamahal.com (franchise, RID 689)
- captain@palmcollection.com (master, RID 812) / owner@palmhouse.com (franchise, RID 541)

## Next Action Items
- Awaiting owner direction for further testing or feature work
- POS API concern: reverse-push-form incorrectly reports 0 for stock_items/categories
