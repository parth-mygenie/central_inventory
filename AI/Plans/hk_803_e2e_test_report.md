# Hells Kitchen (RID 803) — Full E2E Test Report
**Date:** 2026-07-10
**Account:** owner@hellskitchen.com / Qplazm@10
**Master RID:** 803

---

## 1. Hierarchy Tree ✅ (5/5 children created, all tokens working)

```
A (Master, RID 803) — owner@hellskitchen.com
├── B (Central, RID 804) — owner@hkcentral.com
│   └── C (Franchise, RID 807) — owner@hkoutletsouth.com
├── C2 (Central, RID 805) — owner@hkalphacentral.com
│   └── D (Franchise, RID 808) — owner@hkoutletnorth.com
└── E (Franchise, RID 806) — owner@hkexpress.com
```

All 6 accounts login successfully. Child login format: `owner@{restaurantname}.com` / `Qplazm@10`

---

## 2. Catalogue ✅

### Stock Categories
| ID | Name |
|----|------|
| 1529 | Proteins |
| 1530 | Grains |
| 1531 | Produce |

### Inventory Items (Raw Materials)
| ID | Title | Unit | Conv Unit | Factor |
|----|-------|------|-----------|--------|
| 18136 | Chicken | kg | gm | 1000 |
| 18137 | Lamb | kg | gm | 1000 |
| 18138 | Pasta | kg | gm | 1000 |
| 18139 | Bread Flour | kg | gm | 1000 |
| 18140 | Tomatoes | kg | gm | 1000 |
| 18141 | Olive Oil | ltr | ml | 1000 |

### Food Categories
| ID | Name | Tax |
|----|------|-----|
| 8268 | Mains | 5% GST |
| 8269 | Sides | 5% GST |

### Foods
| ID | Name | Price | Category |
|----|------|-------|----------|
| 215452 | Grilled Chicken | ₹350 | Mains |
| 215453 | Lamb Ragu Pasta | ₹450 | Mains |
| 215454 | Garlic Bread | ₹120 | Sides |
| 215455 | Marinara Sauce Cup | ₹80 | Sides |

---

## 3. Recipes ✅

### Sub-Recipes
| Name | Unit | Source | Status |
|------|------|--------|:------:|
| Marinara Base | portion | `store-sub-recipe` (standalone, `subunit` field) | ✅ Created |
| Marinara Sauce Cup | batch | Auto-created from manufactured recipe 9509 | ✅ Created |

**Note:** Standalone `store-sub-recipe` works when using `subunit` field (not `unit`).

### Regular Recipes
| ID | Food | Ingredients |
|----|------|-------------|
| 9506 | Grilled Chicken | Chicken 300gm, Olive Oil 20ml |
| 9507 | Lamb Ragu Pasta | Lamb 200gm, Pasta 200gm, Tomatoes 100gm |
| 9508 | Garlic Bread | Bread Flour 100gm, Olive Oil 15ml |

### Manufactured Recipe
| ID | Food | is_manufactured | Sub-Recipe ID | FG Inventory ID |
|----|------|:---------------:|:------------:|:---------------:|
| 9509 | Marinara Sauce Cup | ✅ true | 192 | 18142 |

Manufacturing spec: 1 batch → 8 cups, BOM: Tomatoes 2000gm + Olive Oil 200ml

---

## 4. Vendors ✅
| ID | Name |
|----|------|
| 240 | Metro Wholesale |
| 241 | Farm Direct |

---

## 5. Purchase Orders ✅

### PO-803-2026-0001 (Metro Wholesale)
| Line | Item | Qty | Unit | Rate | Batch | Expiry |
|------|------|-----|------|------|-------|--------|
| 98 | Chicken | 20 | kg | ₹250 | HK-CHKN-001 | 2026-12-31 |
| 99 | Lamb | 10 | kg | ₹600 | HK-LAMB-001 | 2026-12-31 |
| 100 | Pasta | 15 | kg | ₹120 | HK-PAST-001 | 2027-06-30 |
| 101 | Bread Flour | 25 | kg | ₹45 | HK-FLOR-001 | 2027-06-30 |
| 102 | Tomatoes | 30 | kg | ₹40 | HK-TOMA-001 | 2026-08-15 |
| 103 | Olive Oil | 10 | ltr | ₹500 | HK-OLIV-001 | 2027-12-31 |

**Lifecycle:** draft → approved → sent → received → closed ✅
**Receive field:** `batch` (not `batch_number`) — segments created with batch + expiry ✅

### Segment Verification Post-Receive
```
Chicken: seg=568, batch=HK-CHKN-001, exp=2026-12-31, qty=20
  bucket: with_batch_and_expiry qty=20 ✅
```

---

## 6. Push Bundles ✅

| Target | RID | Categories | Ingredients | Foods | Recipes |
|--------|-----|:----------:|:-----------:|:-----:|:-------:|
| B | 804 | 2 ins | 7 ins | 4 ins | 4 ins |
| C2 | 805 | 2 ins | 7 ins | 4 ins | 4 ins |
| E | 806 | 2 ins | 7 ins | 4 ins | 4 ins |

---

## 7. Transfers

### Completed ✅

| # | Ref | From | To | Items | Status | Mode |
|---|-----|------|-----|-------|:------:|------|
| T1 | TRF-803-2026-0001 | Master(803) | Central B(804) | Chicken 5kg, Pasta 3kg | ✅ received | segment_id |
| T2 | TRF-803-2026-0002 | Master(803) | Central C2(805) | Lamb 3kg, Tomatoes 5kg | ✅ received | segment_id |
| T3 | TRF-803-2026-0003 | Master(803) | Franchise E(806) | Flour 5kg, Olive Oil 2ltr | ✅ received | segment_id |
| T4 | TRF-803-2026-0004 | Central B(804) | Franchise C(807) | Chicken 2kg | ✅ dispatched | segment_id |
| T5 | TRF-805-... | Central C2(805) | Franchise D(808) | Lamb 1kg | ✅ dispatched | segment_id |

### Rejected (Expected POS Hierarchy Rules)

| # | From | To | Error | Reason |
|---|------|-----|-------|--------|
| T6 | Central B(804) | Central C2(805) | `INVALID_HIERARCHY` | Central→Central not allowed |
| T7 | Central B(804) | Franchise D(808) | `INVALID_HIERARCHY` | Can't transfer to other central's child |
| T8 | Franchise E(806) | Franchise C(807) | `INVALID_HIERARCHY` | Franchise→Franchise not allowed |

**Valid hierarchy transfer edges:**
- Master → Central ✅
- Master → Franchise (direct child) ✅
- Central → own Franchise ✅
- All other combinations → `INVALID_HIERARCHY` (by design)

---

## 8. Production Run

| Status | Error | Root Cause |
|:------:|-------|------------|
| ❌ BLOCKED | `PRODUCTION_NOT_ENABLED` | `restaurants.inventory` column not set to `'Yes'` |

Requires POS admin: `UPDATE restaurants SET inventory='Yes' WHERE id=803`

---

## 9. New Endpoints (G-031 Deployed) ✅

| Endpoint | Method | HTTP | Result |
|----------|--------|:----:|--------|
| `purchase-order/import-template` | GET | 200 | ✅ 11,801 bytes (.xlsx) |
| `purchase-order/parse-import` | POST | 200 | ✅ Validation: `file` required |
| `purchase-order/{id}/receive-import-template` | GET | 200 | ✅ 11,852 bytes (.xlsx) |
| `purchase-order/check-invoice-number` | POST | 200 | ✅ `available: true` |
| `franchise/catalog-policy/{id}` | GET | 200 | ✅ Full resolved_policy |
| `inventory-transfer/return/eligible` | GET | 200 | ✅ 0 eligible (expected) |
| `inventory-transfer/stock-ledger` | POST | 200 | ✅ Operational |

---

## 10. API Contract Notes

### PO Receive: `batch` not `batch_number`
```json
{"line_id": 98, "received_qty": 20, "actual_rate": 250, "batch": "HK-CHKN-001", "expiry_date": "2026-12-31"}
```

### Sub-Recipe Create: `subunit` not `unit`
```json
{"sub_recipe_name": "Marinara Base", "prepration_time": 20, "serve_people": 4, "subunit": "portion", "qty": 1, "ingredients": [...]}
```

### Source Selector for `segment_id` mode (requires batch + expiry on segment)
```json
{"mode": "segment_id", "segment_id": 568}
```

### Filter Bucket State Reference
| bucket | batch_state | expiry_state |
|--------|-------------|--------------|
| without_batch_and_expiry | "null" | "null" |
| without_batch_only | "null" | "value" + expiry_date |
| without_expiry_only | "value" + batch | "null" |
| with_batch_and_expiry | "value" | "value" |

---

## Appendix: Account Registry

| Email | Type | RID | Login |
|-------|------|-----|:-----:|
| owner@hellskitchen.com | master | 803 | ✅ |
| owner@hkcentral.com | central | 804 | ✅ |
| owner@hkalphacentral.com | central | 805 | ✅ |
| owner@hkexpress.com | franchise | 806 | ✅ |
| owner@hkoutletsouth.com | franchise | 807 | ✅ |
| owner@hkoutletnorth.com | franchise | 808 | ✅ |

All passwords: `Qplazm@10`
