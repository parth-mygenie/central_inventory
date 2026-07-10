# Central Inventory — PRD

## Problem Statement
Full E2E testing on Hells Kitchen (RID 803) hierarchy — all transfer directions, production, PO with correct contracts.

## Architecture
- **Backend**: FastAPI proxy → MyGenie POS preprod APIs + MongoDB
- **Frontend**: React 19 + Tailwind + Radix UI + CRACO

## What's Been Implemented — 2026-07-10

### Hells Kitchen (RID 803) — ALL TESTS PASSING
1. **Hierarchy 5/5**: B(804), C(807), C2(805), D(808), E(806) — all tokens working
2. **Catalogue**: 3 stock cats, 6 inv items, 2 food cats, 4 foods
3. **Recipes**: 3 regular + 1 manufactured (SR 192, FG 18142) + 1 standalone sub-recipe
4. **PO lifecycle**: PO-803-2026-0001 with correct `batch` field → segments have batch+expiry
5. **Production**: PRD-2026-0001, 5 batches Marinara, cost ₹900
6. **8/8 transfer directions**: Master→Central, Master→Franchise, Central→Franchise, Central→Central(lateral), Central→other's Franchise(cross), Franchise→Franchise(lateral)
7. **G-031 endpoints**: All 7 deployed and verified

### Key Operational Settings (master 803)
- `production_enabled: true`
- `allow_lateral_central_transfer: true`
- `allow_lateral_franchise_transfer: true`
- `allow_cross_central_franchise_dispatch: true`

### API Contract Confirmed
- PO receive: `batch` (not `batch_number`)
- Sub-recipe: `subunit` (not `unit`)
- Production expiry: `YYYY-MM-DD` format
- Lateral transfers: `lateral/initiate` endpoint + master approval
- Cross-central: `initiate` endpoint with ops flag enabled

### Reports (AI/ directory — append only)
- `AI/Plans/hk_803_e2e_test_report.md` — Full initial test
- `AI/Plans/hk_803_retest_addendum.md` — Retest with production + lateral transfers
- `AI/Plans/hg_799_e2e_test_report.md` — Previous Heaven Garden test
- `AI/curls/hk_phase1_hierarchy.sh` — Hierarchy creation
- `AI/curls/hk_phase2to4_catalogue_po.sh` — Catalogue + PO
- `AI/curls/hg_phase*.sh` — Heaven Garden scripts (preserved)
