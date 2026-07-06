# Central Inventory - PRD

## Overview
Central Inventory is a multi-store inventory management system built for MyGenie's POS ecosystem. Proxy/UI layer on top of preprod.mygenie.online POS API.

## Architecture
- **Backend**: FastAPI (Python) — API proxy to POS API
- **Frontend**: React 19 + CRACO + Tailwind CSS + Radix UI/shadcn
- **Database**: MongoDB (token sessions)
- **External**: POS API v1/v2 at preprod.mygenie.online

## Source
- **Repo**: https://github.com/parth-mygenie/central_inventory.git
- **Branch**: 18-6-26

## Work Done (2026-07-02)

### Session 1: Repo Pull
- Cloned repo, set up .env, installed deps, got services running

### Session 2: Gap Validation (Round 1 — 806 hierarchy)
- Initial validation of 22 gaps from L9 register
- Found G-025 (items_count) was still 0 at that point

### Session 3: Resolved Gap Validation (Round 2 — 835 + 806 hierarchies)
- Created restaurant tree under bholar chop (835):
  - BC Central Kitchen (837, central)
  - BC Outlet Direct (838, franchise, direct)
  - BC Outlet South (839, franchise, nested under 837)
- Pushed catalogue to all children
- **Validated 22 resolved/discarded gaps against POS preprod**
- **Key findings:**
  - 15/22 gaps VERIFIED RESOLVED ✅
  - G-025 NOW resolved (items_count populated — was 0, now works)
  - **CRITICAL: `GuardsPushedCatalog` trait not deployed** — global blocker for all inventory/recipe/food controllers
  - G-005 (stock-ledger), G-015 (parse-import), G-016 (check-invoice), G-029 (catalog-policy) — routes not deployed
  - G-006 partially deployed (initiate works, eligible 404)
- Full report at `/app/AI/openGaps/gap_validation.md`

## Test Accounts
- `owner@bholarchop.com` / `Qplazm@10` (RID 835, master)
- `manager@bccentralkitchen.com` / `Qplazm@10` (RID 837, central)
- `manager@bcoutletdirect.com` / `Qplazm@10` (RID 838, franchise)
- `manager@bcoutletsouth.com` / `Qplazm@10` (RID 839, franchise)
- `manager@germanfluid.com` / `Qplazm@10` (RID 806, master — old hierarchy)

## Priority Backlog
- P0: Deploy GuardsPushedCatalog trait (global blocker)
- P1: Deploy return/eligible route (G-006)
- P1: Deploy stock-ledger route (G-005)
- P2: Deploy parse-import, import-template, check-invoice-number, catalog-policy routes
