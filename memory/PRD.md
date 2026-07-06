# Central Inventory - PRD

## Overview
Central Inventory — multi-store inventory management for MyGenie POS ecosystem. Proxy/UI layer on preprod.mygenie.online.

## Architecture
- **Backend**: FastAPI (Python) — API proxy to POS API
- **Frontend**: React 19 + CRACO + Tailwind CSS + Radix UI/shadcn
- **Database**: MongoDB (token sessions)
- **External**: POS API v1/v2 at preprod.mygenie.online

## Source
- **Repo**: https://github.com/parth-mygenie/central_inventory.git
- **Branch**: 18-6-26

## Work Done

### 2026-07-02: Repo Pull + Initial Gap Validation
- Cloned repo, set up .env, installed deps, got running
- Initial validation: 15/22 gaps verified, 4 not deployed, 3 blocked by GuardsPushedCatalog

### 2026-07-07: Retest After Backend Deploy
- **P0 Fix verified:** GuardsPushedCatalog trait deployed — all controllers operational
- **22/22 resolved gaps fully verified ✅**
- Key new confirmations:
  - G-002: qty_before/after populated (46→41 on Rice transfer)
  - G-005: Stock ledger 140 rows, 4 source types
  - G-006: Return flow endpoints active
  - G-015/G-016: Import + invoice check deployed
  - G-020: Unit conversion write + read working
  - G-028: Pushed catalog lock enforced (PUSHED_CATALOG_LOCKED)
  - G-029: Child catalog policy CRUD + enforcement
  - G-030: Manufactured recipe creates auto sub-recipe + FG
- Full report: `/app/AI/openGaps/gap_validation.md`

## Test Accounts (835 Hierarchy)
- `owner@bholarchop.com` / `Qplazm@10` (RID 835, master)
- `manager@bccentralkitchen.com` / `Qplazm@10` (RID 837, central)
- `manager@bcoutletdirect.com` / `Qplazm@10` (RID 838, franchise)
- `manager@bcoutletsouth.com` / `Qplazm@10` (RID 839, franchise)

## Test Entities Created
- Vendor: id=241 "Test Vendor G002"
- Inventory items: "Biscuit Pack G020" (19032), "Rice Bag G020" (19033), "Plain Flour G020" (19034)
- Food: "G030 Test Dish" (206631)
- Recipe: id=9461 (manufactured, sub_recipe=642, FG=19035)
- Transfer: TRF-835-2026-0001 (id=243, Rice 5kg, 835→838, received)
- Wastage reason: id=23 "Vendor sent damaged"

## Still Open (not in validation scope)
- G-024: Invoice OCR for PO receive upload
- G-011: WebSocket infrastructure (P2 QoL)
