# Central Inventory — PRD

## Problem Statement
Full E2E testing on Hells Kitchen (RID 803) hierarchy with correct API contracts.

## Architecture
- **Backend**: FastAPI proxy → MyGenie POS preprod APIs + MongoDB
- **Frontend**: React 19 + Tailwind + Radix UI + CRACO

## What's Been Implemented — 2026-07-10

### Hells Kitchen (RID 803) Full E2E Test
1. **Hierarchy**: 5/5 children created (B=804, C=807, C2=805, D=808, E=806), all tokens working
2. **Catalogue**: 3 stock categories, 6 inventory items (with kg→gm conversion), 2 food categories, 4 foods
3. **Recipes**: 3 regular + 1 manufactured (auto sub-recipe 192 + FG 18142). Standalone sub-recipe created with `subunit` field
4. **Vendors**: Metro Wholesale (240), Farm Direct (241)
5. **PO**: PO-803-2026-0001 full lifecycle with correct `batch` field → segments have batch+expiry
6. **Push bundles**: All 3 direct children received catalogue (2 cats, 7 inv, 4 food, 4 recipes each)
7. **Transfers**: 5 successful (Master→B, Master→C2, Master→E, B→C, C2→D) using `segment_id` mode
8. **New G-031 endpoints**: All deployed and verified (import-template, parse-import, receive-import-template, check-invoice-number, catalog-policy, return/eligible, stock-ledger)

### Key API Contract Corrections
- PO receive: `batch` (not `batch_number`)
- Sub-recipe: `subunit` (not `unit`)
- Source selector: `segment_id` mode requires batch+expiry on segment
- Hierarchy transfers: Only Master→Central, Master→Franchise, Central→own Franchise allowed

### Blockers
- Production run: `INVENTORY_NOT_ENABLED` — needs `restaurants.inventory='Yes'` in POS DB
- Central→Central, Central→other's franchise, Franchise→Franchise: `INVALID_HIERARCHY` (by design)

## Reports
- `/app/AI/Plans/hk_803_e2e_test_report.md` — Full test report
- `/app/AI/Plans/hg_799_e2e_test_report.md` — Previous Heaven Garden test
- `/app/AI/curls/hk_phase1_hierarchy.sh` — Hierarchy creation script
- `/app/AI/curls/hk_phase2to4_catalogue_po.sh` — Catalogue + PO script
