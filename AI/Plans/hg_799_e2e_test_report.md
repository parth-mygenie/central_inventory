# Heaven Garden (RID 799) — Full E2E Test Report
**Date:** 2026-07-10
**Account:** owner@heavengarden.com / Qplazm@10
**Master RID:** 799

---

## 1. Hierarchy Tree

### Target Structure
```
A (Master, RID 799) — owner@heavengarden.com
├── B (Central, RID 800) — central_b@heavengarden.com
│   └── C (Franchise) — franchise_c@heavengarden.com [NOT CREATED — B login blocked]
├── C2 (Central, RID 801) — central_c2@heavengarden.com
│   └── D (Franchise) — franchise_d@heavengarden.com [NOT CREATED — C2 login blocked]
└── E (Franchise, RID 802) — franchise_e@heavengarden.com
```

### Results

| Store | Type | RID | Parent | Status | Notes |
|-------|------|-----|--------|:------:|-------|
| A (heaven garden) | master | 799 | — | ✅ Created (pre-existing) | owner@heavengarden.com |
| B (HG Central Kitchen B) | central | 800 | 799 | ✅ Created | central_b@heavengarden.com |
| C2 (HG Central Kitchen C2) | central | 801 | 799 | ✅ Created | central_c2@heavengarden.com |
| E (HG Outlet E) | franchise | 802 | 799 | ✅ Created | franchise_e@heavengarden.com |
| C (franchise under B) | franchise | — | 800 | ❌ BLOCKED | B token unavailable |
| D (franchise under C2) | franchise | — | 801 | ❌ BLOCKED | C2 token unavailable |

### Blocker: Child Login
**Issue:** Newly created hierarchy children cannot login via `common-login` endpoint.
- `central_b@heavengarden.com` / `Qplazm@10` → `Invalid credentials`
- `central_c2@heavengarden.com` / `Qplazm@10` → `Invalid credentials`
- `franchise_e@heavengarden.com` / `Qplazm@10` → `Invalid credentials`

**Root Cause:** POS API's `franchise/create` creates restaurant + vendor but vendor employee may not be loginable immediately. May need POS admin activation or separate employee creation.

**Impact:** Cannot create C/D (need B/C2 tokens), cannot test cross-store transfers from children.

---

## 2. Catalogue Setup

### Stock Item Categories ✅
| ID | Name | Status |
|----|------|:------:|
| 1513 | Spices | ✅ |
| 1514 | Dairy | ✅ |
| 1515 | Dry Goods | ✅ |

### Inventory Items (Raw Materials) ✅
| ID | Title | Unit | Category | Has Conversion | Consumption Unit |
|----|-------|------|----------|:--------------:|-----------------|
| 18108 | Cumin Seeds | kg | 1513 | ✅ | gm (×1000) |
| 18109 | Turmeric Powder | kg | 1513 | ✅ | gm (×1000) |
| 18110 | Milk | ltr | 1514 | ❌ | — |
| 18111 | Paneer | kg | 1514 | ✅ | gm (×1000) |
| 18112 | Rice | kg | 1515 | ✅ | gm (×1000) |
| 18113 | Flour | kg | 1515 | ✅ | gm (×1000) |

### Food Categories ✅
| ID | Name | Tax |
|----|------|-----|
| 8256 | Main Course | 5% GST |
| 8257 | Breads | 5% GST |
| 8258 | Beverages | 5% GST |

### Foods ✅
| ID | Name | Price | Category |
|----|------|-------|----------|
| 215436 | Paneer Tikka Masala | ₹250 | Main Course |
| 215437 | Jeera Rice | ₹150 | Main Course |
| 215438 | Butter Naan | ₹60 | Breads |
| 215439 | Masala Chai | ₹40 | Beverages |

---

## 3. Recipes

### Regular Recipes ✅
| Recipe ID | Food | Ingredients |
|-----------|------|-------------|
| 9490 | Paneer Tikka Masala | Paneer 150gm, Cumin 3gm, Turmeric 5gm |
| 9491 | Jeera Rice | Rice 300gm, Cumin 10gm |
| 9492 | Butter Naan | Flour 100gm, Milk 20ml |

### Manufactured Recipe ✅ (Auto Sub-Recipe + FG Created)
| Recipe ID | Food | is_manufactured | Sub-Recipe ID | FG Inventory ID |
|-----------|------|:---------------:|:------------:|:---------------:|
| 9493 | Masala Chai | ✅ true | 187 | 18114 |

**Manufactured details:**
- Output: 1 batch → 10 cups (conversion factor)
- BOM: Milk 1000ml, Cumin Seeds 5gm, Turmeric Powder 3gm
- POS ingredients: 1× FG item (Masala Chai, 18114)

### Sub-Recipes ✅
| ID | Name | Unit | Source |
|----|------|------|--------|
| 187 | Masala Chai | batch | Auto-created from manufactured recipe 9493 |

**Note:** Standalone sub-recipe creation via `store-sub-recipe` fails due to POS API bug (DB column `unit` not populated from request fields). Only manufactured-recipe auto-creation works.

---

## 4. Vendors ✅

| ID | Name | Email | Phone |
|----|------|-------|-------|
| 238 | Fresh Farms | vendor@freshfarms.com | — |
| 239 | Spice World | vendor@spiceworld.com | — |

---

## 5. Purchase Orders (PO) ✅

### PO Lifecycle: Create → Approve → Send → Receive → Close

| PO ID | Ref Code | Vendor | Items | Status | Invoice |
|-------|----------|--------|:-----:|:------:|---------|
| 28 | PO-799-2026-0001 | Fresh Farms | 4 | ✅ closed | INV-HG-001 |
| 29 | PO-799-2026-0002 | Spice World | 2 | ✅ closed | INV-HG-002 |

**PO1 Items (Fresh Farms):**
| Line ID | Item | Qty | Unit | Rate |
|---------|------|-----|------|------|
| 92 | Rice | 50 | kg | ₹80 |
| 93 | Flour | 30 | kg | ₹45 |
| 94 | Milk | 20 | ltr | ₹60 |
| 95 | Paneer | 10 | kg | ₹350 |

**PO2 Items (Spice World):**
| Line ID | Item | Qty | Unit | Rate |
|---------|------|-----|------|------|
| 96 | Cumin Seeds | 5 | kg | ₹500 |
| 97 | Turmeric Powder | 3 | kg | ₹300 |

**PO API Field Contract:**
- Create: `lines[].inventory_master_id`, `ordered_qty`, `ordered_unit`, `expected_rate`
- Receive: `receive_lines[].line_id`, `received_qty`, `actual_rate`, `batch_number`, `expiry_date`
- Note: `batch_number` in PO receive does NOT populate segment batch in stock inventory

---

## 6. Push Bundles ✅

| Target | RID | Categories | Ingredients | Foods | Recipes |
|--------|-----|:----------:|:-----------:|:-----:|:-------:|
| B (Central) | 800 | 3 ins | 7 ins | 4 ins | 4 ins |
| C2 (Central) | 801 | 3 ins | 7 ins | 4 ins | 4 ins |
| E (Franchise) | 802 | 3 ins | 7 ins | 4 ins | 4 ins |

---

## 7. Transfers

### Completed ✅

| Transfer ID | Ref Code | From | To | Items | Status |
|-------------|----------|------|-----|:-----:|:------:|
| 254 | TRF-799-2026-0001 | Master(799) | Central B(800) | Rice 5kg, Flour 3kg, Paneer 2kg | ✅ dispatched |
| 255 | TRF-799-2026-0002 | Master(799) | Central C2(801) | Cumin 1kg, Rice 5kg | ✅ dispatched |
| 258 | TRF-799-2026-0003 | Master(799) | Franchise E(802) | Rice 3kg | ✅ dispatched |

### Blocked / Not Possible From Master Token

| Direction | Error | Root Cause |
|-----------|-------|------------|
| Central B(800) → Franchise C | N/A | C not created (B login blocked) |
| Central B(800) → Franchise E(802) | `UNAUTHORIZED_ACTION` | Master can't initiate FROM child stores |
| Central B(800) → Central C2(801) | `UNAUTHORIZED_ACTION` | Master can't initiate FROM child stores |
| Central C2(801) → Franchise D | N/A | D not created (C2 login blocked) |
| Franchise E(802) → Central B(800) | `UNAUTHORIZED_ACTION` | Master can't initiate FROM child stores |

**Transfer Source Selector Notes:**
- Segments from PO receive have `batch=null, expiry=date` → classified as "legacy"
- `mode: "segment_id"` → `LEGACY_SELECTOR_REQUIRED` (blocked for no-batch segments)
- `mode: "filter_bucket"` with `without_batch_only` → `INVALID_SOURCE_SELECTOR` (POS API only accepts `batch_state:"null", expiry_state:"null"`)
- **Working:** Stock added via `add-stock` without expiry → `without_batch_and_expiry` bucket → ✅ transfers succeed
- **Root cause:** PO receive endpoint doesn't propagate `batch_number` to stock segments

---

## 8. Production Run

| Status | Error Code | Message |
|:------:|------------|---------|
| ❌ BLOCKED | `INVENTORY_NOT_ENABLED` | "Inventory management is not enabled for this restaurant." |

**Note:** `operational-settings/update` was called with `production_enabled:true` and `inventory_enabled:true` — setting update returned success but production still blocked. May need POS admin to enable inventory management at the restaurant level.

---

## 9. New Endpoints (validation-6-7 Resolve)

### Routes Tested

| Endpoint | Method | Status | Notes |
|----------|--------|:------:|-------|
| `purchase-order/{id}/receive-import-template` | GET | ❌ 404 | Route not deployed on preprod |
| `purchase-order/{id}/parse-receive-import` | POST | ❌ 404 | Route not deployed on preprod |
| `purchase-order/import-template` | GET | ❌ 404 | Route not deployed on preprod |
| `purchase-order/parse-import` | POST | ❌ 405 | MethodNotAllowed — route exists but POST not registered |
| `purchase-order/check-invoice-number` | POST | ❌ 405 | MethodNotAllowed |
| `franchise/catalog-policy/{id}` | GET/POST | ❌ 404 | Route not deployed |
| `inventory-transfer/return/eligible` | GET | ❌ 404 | Route not deployed |
| `inventory-transfer/stock-ledger` | POST | ✅ 200 | Works but 0 entries for this hierarchy |
| `inventory/wastage-reasons` | GET | ✅ 200 | 4 reasons (Spillage, Pilferage, Expired, Others) |

**Conclusion:** Most G-031 routes from validation-6-7 are NOT deployed to POS preprod for the RID 799 hierarchy. The previous validation (gap_validation.md) was done on RID 835 (bholar chop) where these routes were already deployed. The deployment may be restaurant-specific or needs a fresh `php artisan route:clear` + migration.

---

## 10. Stock Summary (After All Operations)

### Master (RID 799) — Final Stock
| Item | Quantity | Unit |
|------|:--------:|------|
| Cumin Seeds | 10000 | gm (10 kg) |
| Flour | 50000 | gm (50 kg) |
| Masala Chai | 0 | batch |
| Milk | 40000 | ml (40 ltr) |
| Paneer | 20000 | gm (20 kg) |
| Rice | 87000 | gm (87 kg) |
| Turmeric Powder | 7000 | gm (7 kg) |

---

## Appendix: Account Registry

| Email | Password | Type | RID | Login Status |
|-------|----------|------|-----|:------------:|
| owner@heavengarden.com | Qplazm@10 | master | 799 | ✅ Works |
| central_b@heavengarden.com | Qplazm@10 | central | 800 | ❌ Invalid credentials |
| central_c2@heavengarden.com | Qplazm@10 | central | 801 | ❌ Invalid credentials |
| franchise_e@heavengarden.com | Qplazm@10 | franchise | 802 | ❌ Invalid credentials |
| franchise_c@heavengarden.com | Qplazm@10 | franchise | — | Not created |
| franchise_d@heavengarden.com | Qplazm@10 | franchise | — | Not created |
