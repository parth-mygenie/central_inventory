# Hells Kitchen (RID 803) — Retest Addendum: Production + Advanced Transfers
**Date:** 2026-07-10 (post ops-settings fix)
**Ref:** Reply to `hk_803_e2e_test_report.md`

---

## Issues Resolved

### Issue 1: Production Run — RESOLVED ✅

**Root Cause:** `production_enabled: false` in operational settings (not `restaurants.inventory`).

**Fix Applied:**
```json
POST /inventory-transfer/operational-settings/update
{ "restaurant_id": 803, "settings": { "production_enabled": true } }
```

**Production Run Result:**
| Field | Value |
|-------|-------|
| Run ID | 37 |
| Reference | PRD-2026-0001 |
| Sub-Recipe | 192 (Marinara Sauce Cup) |
| Output | 5 batches → FG inv 18142 |
| Total Cost | ₹900 |
| Unit Cost | ₹22.50/batch |
| BOM Consumed | Tomatoes 10kg (₹400) + Olive Oil 1ltr (₹500) |
| Segment Allocations | seg 572 (Tomatoes, HK-TOMA-001) + seg 573 (Olive Oil, HK-OLIV-001) |

**Date format note:** `expiry_date` must be `YYYY-MM-DD` (not `DD-MM-YYYY`). First attempt failed with SQL datetime format error.

---

### Issue 2: Advanced Transfers T6-T8 — ALL RESOLVED ✅

**Fix Applied:**
```json
POST /inventory-transfer/operational-settings/update
{
  "restaurant_id": 803,
  "settings": {
    "allow_lateral_central_transfer": true,
    "allow_lateral_franchise_transfer": true,
    "allow_cross_central_franchise_dispatch": true
  }
}
```

### Transfer Results

| # | Ref | Route | Endpoint | Type | Status | Notes |
|---|-----|-------|----------|------|:------:|-------|
| T6 | TRF-803-2026-0006 | B(804) → C2(805) | `lateral/initiate` | lateral | ✅ dispatched | Required master approval first |
| T7 | TRF-803-2026-0007 | B(804) → D(808) | `initiate` | dispatch | ✅ dispatched | Cross-central franchise (auto-dispatch) |
| T8 | TRF-803-2026-0008 | E(806) → C(807) | `lateral/initiate` | lateral | ✅ dispatched | Required master approval first |

### Lateral Transfer Lifecycle
```
lateral/initiate → pending_lateral_approval → master approve → approved → dispatch → dispatched → receive
```

### Transfer Direction Summary (All 8 Directions Tested)

| Direction | Endpoint | Ops Flag | Result |
|-----------|----------|----------|:------:|
| Master → Central | `initiate` | (default on) | ✅ T1 |
| Master → Franchise | `initiate` | `allow_master_direct_franchise` | ✅ T3 |
| Central → own Franchise | `initiate` | (default on) | ✅ T4, T5 |
| Central → Central (lateral) | `lateral/initiate` | `allow_lateral_central_transfer` | ✅ T6 |
| Central → other's Franchise | `initiate` | `allow_cross_central_franchise_dispatch` | ✅ T7 |
| Franchise → Franchise (lateral) | `lateral/initiate` | `allow_lateral_franchise_transfer` | ✅ T8 |

---

## Complete Transfer Registry (803 Hierarchy)

| ID | Ref | From | To | Items | Status | Type |
|----|-----|------|-----|-------|:------:|------|
| 259 | TRF-803-2026-0001 | Master(803) | Central B(804) | Chicken 5kg, Pasta 3kg | received | dispatch |
| 260 | TRF-803-2026-0002 | Master(803) | Central C2(805) | Lamb 3kg, Tomatoes 5kg | received | dispatch |
| 261 | TRF-803-2026-0003 | Master(803) | Franchise E(806) | Flour 5kg, Olive Oil 2ltr | received | dispatch |
| 262 | TRF-803-2026-0004 | Central B(804) | Franchise C(807) | Chicken 2kg | dispatched | dispatch |
| 263 | TRF-803-2026-0005 | Central C2(805) | Franchise D(808) | Lamb 1kg | dispatched | dispatch |
| 264 | TRF-803-2026-0006 | Central B(804) | Central C2(805) | Pasta 1kg | dispatched | lateral |
| 265 | TRF-803-2026-0007 | Central B(804) | Franchise D(808) | Chicken 1kg | dispatched | dispatch |
| 266 | TRF-803-2026-0008 | Franchise E(806) | Franchise C(807) | Flour 1kg | dispatched | lateral |

**8/8 transfer directions tested and passing.**

---

## Final Scorecard

| Area | Status | Notes |
|------|:------:|-------|
| Hierarchy (5 children) | ✅ Pass | All 6 tokens working |
| Catalogue (categories, inv, food) | ✅ Pass | 3 stock cats, 6 inv items, 4 foods |
| Sub-recipe (standalone) | ✅ Pass | `subunit` field |
| Recipes (regular × 3) | ✅ Pass | 9506, 9507, 9508 |
| Manufactured recipe + FG | ✅ Pass | 9509 → SR 192, FG 18142 |
| Vendors | ✅ Pass | Metro(240), Farm(241) |
| PO lifecycle (with `batch`) | ✅ Pass | PO-803-2026-0001, closed |
| Segments with batch+expiry | ✅ Pass | `segment_id` mode works |
| Push bundles (3 children) | ✅ Pass | 2 cats, 7 inv, 4 food, 4 recipes each |
| Production run | ✅ Pass | PRD-2026-0001, cost=₹900 |
| Master → Central (T1, T2) | ✅ Pass | segment_id dispatch |
| Master → Franchise (T3) | ✅ Pass | segment_id dispatch |
| Central → own Franchise (T4, T5) | ✅ Pass | segment_id dispatch |
| Central → Central lateral (T6) | ✅ Pass | lateral/initiate + master approve |
| Central → other's Franchise (T7) | ✅ Pass | cross-central dispatch |
| Franchise → Franchise lateral (T8) | ✅ Pass | lateral/initiate + master approve |
| G-031 new endpoints | ✅ Pass | 7/7 operational |
