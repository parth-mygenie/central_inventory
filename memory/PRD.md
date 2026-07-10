# Central Inventory — PRD

## Problem Statement
Pull repo `https://github.com/parth-mygenie/central_inventory.git` (branch `6-07-26`), set up the environment, then perform full E2E testing:
- Create hierarchy tree under `owner@heavengarden.com` (RID 799, master)
- Create catalogue: categories, foods, ingredients, sub-recipes, recipes (regular + manufactured)
- Vendor purchase through PO
- Production runs
- Stock transfers in all directions
- Test new PO receive import endpoints from validation-6-7
- Document results in AI/ folder

## Architecture
- **Backend**: FastAPI (Python) — proxy to MyGenie POS preprod APIs + MongoDB for local state
- **Frontend**: React 19 + Tailwind CSS + Radix UI + shadcn components, bundled via CRACO
- **Database**: MongoDB (local, `test_database`)
- **External APIs**: MyGenie POS preprod (v1 & v2)

## What's Been Implemented

### 2026-07-10: Repo Pull + Full E2E Test
1. **Repo pulled** from `6-07-26` branch, .env files created, dependencies installed, app running
2. **Hierarchy created** (3 of 5 children): B(800), C2(801), E(802) under master A(799)
3. **Catalogue setup**: 3 stock categories, 6 inventory items, 3 food categories, 4 foods
4. **Recipes**: 3 regular + 1 manufactured (auto sub-recipe + FG inventory)
5. **Vendors**: Fresh Farms(238), Spice World(239)
6. **PO lifecycle**: 2 POs created → approved → sent → received → closed (full lifecycle)
7. **Bundle push**: Pushed to all 3 children (categories, ingredients, foods, recipes)
8. **Transfers**: 3 dispatched (Master→B, Master→C2, Master→E)
9. **New endpoints tested**: stock-ledger(✅), wastage-reasons(✅), 7 others(❌ not deployed)
10. **Full report**: `/app/AI/Plans/hg_799_e2e_test_report.md`

## Blockers Found
- Child account login: POS API `common-login` rejects newly created hierarchy children
- Production run: `INVENTORY_NOT_ENABLED` even after settings update
- Cross-store transfers: Require child tokens (UNAUTHORIZED_ACTION from master)
- PO receive doesn't populate batch on segments → forces filter_bucket for transfers
- New G-031 routes: Not deployed to preprod for RID 799 hierarchy

## Test Scripts Created (AI/curls/)
- `hg_phase1_hierarchy_create.sh`
- `hg_phase2_catalogue.sh`
- `hg_phase3to5_recipes_vendors_po.sh`
- `hg_phase6_production_transfers.sh`

## Next Tasks
- POS admin: Activate child accounts (B, C2, E) for login
- POS admin: Enable inventory management for RID 799
- POS admin: Deploy G-031 routes (receive-import, catalog-policy, return/eligible)
- Create C (franchise under B) and D (franchise under C2) once child tokens available
- Complete all transfer directions once child tokens available
- Production run once inventory enabled
