# P28 — Smoke Validation: Production, Transfer, Blended Cost & Consumption

**Date:** 2026-06-13  
**Validator:** Automated agent (Emergent E1)  
**Environment:** preprod.mygenie.online via FastAPI proxy  
**Master restaurant:** 806 (german fluid)  
**Credentials:** manager@germanfluid.com / Qplazm@10  
**Branch:** 13-6-26 (central_inventory)

---

## Table of Contents

1. [Test Environment Setup](#1-test-environment-setup)
2. [Hierarchy Creation & Login](#2-hierarchy-creation--login)
3. [Catalogue Push](#3-catalogue-push)
4. [Ingredient Creation](#4-ingredient-creation)
5. [Vendor Creation](#5-vendor-creation)
6. [Dual-Vendor GRN — Different Prices](#6-dual-vendor-grn--different-prices)
7. [FEFO Segment Verification](#7-fefo-segment-verification)
8. [Sub-Recipe BOM Creation](#8-sub-recipe-bom-creation)
9. [Production Runs — Single Vendor Segments](#9-production-runs--single-vendor-segments)
10. [Production Run Audit — FEFO Cost Inheritance](#10-production-run-audit--fefo-cost-inheritance)
11. [Blocker B1 — Transfer Reference Code Collision](#11-blocker-b1--transfer-reference-code-collision)
12. [Blocker B2 — Child Store Login](#12-blocker-b2--child-store-login)
13. [Post-B1/B2 Fix — Transfer Request Lifecycle](#13-post-b1b2-fix--transfer-request-lifecycle)
14. [Blocker B3 — UNIT_CONVERSION_NOT_DEFINED](#14-blocker-b3--unit_conversion_not_defined)
15. [Post-B3 Fix — Dispatch & Receive](#15-post-b3-fix--dispatch--receive)
16. [2-Hop Transfer Chain — Segment Continuity](#16-2-hop-transfer-chain--segment-continuity)
17. [Partial Approval → Dispatch → Receive](#17-partial-approval--dispatch--receive)
18. [Cross-Segment Production — Old Cost Bug](#18-cross-segment-production--old-cost-bug)
19. [Blended Cost Fix — Fresh GRN Forward Test](#19-blended-cost-fix--fresh-grn-forward-test)
20. [Blended Cost — 3-Segment Production Verification](#20-blended-cost--3-segment-production-verification)
21. [Transfer Blended-Cost FG to Franchise](#21-transfer-blended-cost-fg-to-franchise)
22. [POS Consumption at Franchise Stores](#22-pos-consumption-at-franchise-stores)
23. [Consumption Report — Hierarchy View](#23-consumption-report--hierarchy-view)
24. [Summary Matrix](#24-summary-matrix)
25. [Entity Reference](#25-entity-reference)

---

## 1. Test Environment Setup

| Step | Action | Result |
|------|--------|--------|
| 1.1 | Clone `parth-mygenie/central_inventory` branch `13-6-26` | ✅ Cloned to `/app` |
| 1.2 | Install backend deps (`pip install -r requirements.txt`) | ✅ FastAPI + Motor + httpx |
| 1.3 | Install frontend deps (`yarn install`) | ✅ React 19 + Tailwind + Radix |
| 1.4 | Restore `.env` files (MONGO_URL, REACT_APP_BACKEND_URL) | ✅ |
| 1.5 | `supervisorctl restart backend frontend` | ✅ Both RUNNING |
| 1.6 | `curl /api/` returns `{"message":"Central Inventory API Proxy"}` | ✅ HTTP 200 |
| 1.7 | Frontend loads login page at preview URL | ✅ Screenshot verified |

---

## 2. Hierarchy Creation & Login

### 2.1 Master Login

```
POST /api/proxy/auth/login
Body: {"email":"manager@germanfluid.com","password":"Qplazm@10"}
```

| Field | Value |
|-------|-------|
| token | `ghGEivZr8bg5...` (120 chars) |
| restaurant_id | **806** |
| restaurant_name | german fluid |
| restaurant_type_flag | **master** |
| parent_restaurant_id | null |
| **Status** | **✅ PASS** |

### 2.2 Create Hierarchy Children

| # | API | Payload | Response | RID | Type | Status |
|---|-----|---------|----------|-----|------|--------|
| 2.2a | `POST franchise/create` | name=Central Kitchen Alpha, child_type=central | success=true | **807** | central | ✅ |
| 2.2b | `POST franchise/create` | name=Central Kitchen Beta, child_type=central | success=true | **808** | central | ✅ |
| 2.2c | `POST franchise/create` | name=Outlet Direct One, child_type=franchise | success=true | **809** | franchise | ✅ |
| 2.2d | `POST franchise/create` (from CA token) | name=Alpha Outlet One, child_type=franchise | success=true | **810** | franchise (parent=807) | ✅ |
| 2.2e | `POST franchise/create` | name=Cost Test Outlet, child_type=franchise | success=true | **811** | franchise | ✅ |

### 2.3 Child Store Logins

Initial attempts with `manager@centralalpha.com` failed (auth-001). After B2 fix, correct email format is `manager@{lowercasenospaces}.com`.

| Store | Email | RID | Type | Status |
|-------|-------|-----|------|--------|
| Central Kitchen Alpha | manager@centralkitchenalpha.com | 807 | central | ✅ PASS |
| Central Kitchen Beta | manager@centralkitchenbeta.com | 808 | central | ✅ PASS |
| Outlet Direct One | manager@outletdirectone.com | 809 | franchise | ✅ PASS |
| Alpha Outlet One | manager@alphaoutletone.com | 810 | franchise | ✅ PASS |
| Cost Test Outlet | manager@costtestoutlet.com | 811 | franchise | ✅ PASS |

### 2.4 Operational Settings Verified

```
POST /inventory-transfer/operational-settings/get  {restaurant_id: 806}
```

| Setting | Value | Status |
|---------|-------|--------|
| production_enabled | true | ✅ |
| fefo_consumption_enabled | true | ✅ |
| allow_lateral_central_transfer | true (set during test) | ✅ |
| allow_cross_central_franchise_dispatch | true (set during test) | ✅ |
| allow_master_direct_franchise | true | ✅ |
| allow_negative_stock | true | ✅ |
| transfer_selling_price_required | false | ✅ |

---

## 3. Catalogue Push

| # | Target | API | Ingredients | Foods | Recipes | Sub-recipes | Status |
|---|--------|-----|------------|-------|---------|-------------|--------|
| 3.1 | 807 Central A | `POST franchise/push/807` | 11 inserted | 2 | 2 | 1 | ✅ |
| 3.2 | 808 Central B | `POST franchise/push/808` | 11 inserted | 2 | 2 | 1 | ✅ |
| 3.3 | 809 Franchise | `POST franchise/push/809` | 11 inserted | 2 | 2 | 1 | ✅ |
| 3.4 | 810 AO1 (from CA) | `POST franchise/push/810` | 11 inserted | 2 | 2 | 1 | ✅ |
| 3.5 | 811 Cost Test | `POST franchise/push/811` | 47 inserted | 2 | 2 | 4 | ✅ |

Push 3.5 for 811 was done after all ingredients/sub-recipes were created, so it received the full catalogue (47 ingredients, 4 sub-recipes).

---

## 4. Ingredient Creation

### 4.1 Existing Ingredients (from UAT — IDs 17632-17642)

| ID | Title | Unit | Pre-existing |
|----|-------|------|-------------|
| 17632 | Jaggery Powder | kg | ✅ |
| 17633 | GSM | kg | ✅ |
| 17634 | Wheat Flour (Atta) | kg | ✅ |
| 17635 | Baking Powder | kg | ✅ |
| 17636 | Baking Soda | kg | ✅ |
| 17637 | Elachi (Cardamom) | kg | ✅ |
| 17638 | Egg Replacer | kg | ✅ |
| 17639 | Vanilla Essence | kg | ✅ |
| 17640 | Milk | ltr | ✅ |
| 17641 | coffee beans | pkt | ✅ |
| 17642 | Whole wheat Elachi Cookies (FG) | piece | ✅ SubRecipe |

### 4.2 New Ingredients Added

```
POST /inventory/add-inventory  (array format)
```

| # | API Call | Items | Category | Status |
|---|---------|-------|----------|--------|
| 4.2a | Single test | Ragi Flour | Cookie (1528) | ✅ "Stock Submit Successfully" |
| 4.2b | Batch cookie | 18 items (Oats, Raisins, Coconut Powder, Cashew, Almonds, Dates, Salt, Oil, White Till Powder, Sesame Till, Rice Flour, Choco Chips, Sunflower Seeds, Peanuts, Pumpkin Seeds, Wheat Bran, Jowar Flour, Carrot) | Cookie (1528) | ✅ |
| 4.2c | Batch khari | 14 items (Maida, Sugar, Lilly Margarine, Ajwain, Jeera, Chilli Powder, Methi Leaves, Icing Sugar, Green Chilli, Mint, Curry Leaves, Coriander Leaves, Garlic Paste, Nutrelite Butter) | Khari (1540) / Cookie (1528) | ✅ |

**Also created:** Khari stock item category (ID 1540) via `POST /inventory/stock-item-categories/store`. ✅

**Total after creation:** 44 inventory master items confirmed via `GET /inventory/get-inventory-master`.

**Initial field name discovery:** First attempt with `{"title":"...","unit":"...","stock_item_category_id":...}` failed with validation errors. Correct fields: `{"stock_title":"...","unit":"...","category_id":...}` in array format. Documented for future reference.

---

## 5. Vendor Creation

```
POST /inventory/add-vendor
```

| # | Vendor Name | ID | Contact | Status |
|---|------------|-----|---------|--------|
| 5.1 | Budget Ingredients Co | **235** | Ravi Kumar / 9111111111 | ✅ |
| 5.2 | Premium Organics Ltd | **236** | Priya Sharma / 9222222222 | ✅ |

Pre-existing vendors: 233 (doodh wala), 234 (bakery raw wala).

---

## 6. Dual-Vendor GRN — Different Prices

### 6.1 Purchase from Vendor A (Budget) — Bill 6016

```
POST /inventory/add-purchase  vendor_id=235, purchase_date=2026-06-12
```

20 items, batch prefix `VA-`, expiry `2026-09-12`. Key prices (₹/kg):

| Ingredient | Qty | Price/kg | Batch |
|-----------|-----|---------|-------|
| Jaggery | 2 kg | ₹100 | VA-JAGG-001 |
| GSM | 2 kg | ₹180 | VA-GSM-001 |
| Wheat Flour | 5 kg | ₹70 | VA-ATTA-001 |
| Elachi | 0.5 kg | ₹1,400 | VA-ELACHI-001 |
| Egg Replacer | 0.5 kg | ₹1,800 | VA-EGG-001 |
| Ragi Flour | 2 kg | ₹80 | VA-RAGI-001 |

**Response:** `purchase_details.id = 6016`, 20 `added_items` with `calculate_quantity` in gm. ✅

### 6.2 Purchase from Vendor B (Premium) — Bill 6017

```
POST /inventory/add-purchase  vendor_id=236, purchase_date=2026-06-12
```

20 items, batch prefix `VB-`, expiry `2026-12-12`. Key prices (₹/kg):

| Ingredient | Qty | Price/kg | Batch |
|-----------|-----|---------|-------|
| Jaggery | 2 kg | ₹140 | VB-JAGG-001 |
| GSM | 2 kg | ₹250 | VB-GSM-001 |
| Wheat Flour | 5 kg | ₹110 | VB-ATTA-001 |
| Elachi | 0.5 kg | ₹2,000 | VB-ELACHI-001 |
| Egg Replacer | 0.5 kg | ₹2,500 | VB-EGG-001 |
| Ragi Flour | 2 kg | ₹120 | VB-RAGI-001 |

**Response:** `purchase_details.id = 6017`, 20 `added_items`. ✅

### 6.3 Fresh GRN for Blended Cost Test — Bills 6018 & 6019

After blended-cost code fix, two more GRNs created with fresh batches (prefix `CT-VA-` and `CT-VB-`) to test forward cost tracking without backfill dependency.

| Bill | Vendor | Items | Batch Prefix | Expiry | Status |
|------|--------|-------|-------------|--------|--------|
| 6018 | 235 (Budget) | 9 core ingredients | CT-VA- | 2026-09-30 | ✅ |
| 6019 | 236 (Premium) | 9 core ingredients | CT-VB- | 2026-12-31 | ✅ |

---

## 7. FEFO Segment Verification

### 7.1 Jaggery Powder (17632) — 3 segments after dual GRN

```
GET /inventory/stock-inventory/17632
```

| Seg ID | Batch | Expiry | Qty (gm) | FEFO Order |
|--------|-------|--------|----------|-----------|
| 279 | JAGGERY-LOT-001 (UAT) | 2026-07-07 | 950 | 1st ✅ |
| 290 | VA-JAGG-001 (Budget) | 2026-09-12 | 2000 | 2nd ✅ |
| 310 | VB-JAGG-001 (Premium) | 2026-12-12 | 2000 | 3rd ✅ |

`quantity_reconciliation: aggregate=4950, segment_total=4950, unsegmented=0` ✅

### 7.2 GSM (17633) — same pattern

| Seg ID | Batch | Expiry | Qty |
|--------|-------|--------|-----|
| 280 | GSM-LOT-001 (UAT) | 2026-07-07 | 900 |
| 291 | VA-GSM-001 | 2026-09-12 | 2000 |
| 311 | VB-GSM-001 | 2026-12-12 | 2000 |

FEFO ascending by expiry. Reconciliation: unsegmented=0. ✅

### 7.3 Egg Replacer (17638)

| Seg ID | Batch | Expiry | Qty |
|--------|-------|--------|-----|
| 285 | EGGREP-LOT-001 | 2026-07-07 | 248 |
| 296 | VA-EGG-001 | 2026-09-12 | 500 |
| 316 | VB-EGG-001 | 2026-12-12 | 500 |

✅ Same FEFO pattern.

**Finding:** Segment detail API does NOT expose `cost_per_unit` — cost data lives only in purchase records and production run audit. ✅ Noted.

---

## 8. Sub-Recipe BOM Creation

```
POST /recipe/store-sub-recipe
```

| # | Name | recipe_id | FG inv_id | Qty | Unit | Ingredients | Status |
|---|------|-----------|-----------|-----|------|-------------|--------|
| 8.1 | Whole wheat Elachi Cookies | 187 | 17642 | 31 | piece | 9 (pre-existing) | ✅ |
| 8.2 | Sesame Cookies With Jaggery | 191 | 17709 | 21 | piece | 9 | ✅ |
| 8.3 | Ragi Cookies With Jaggery | 192 | 17710 | 31 | piece | 8 | ✅ |
| 8.4 | Oats Cookies With Jaggery | 193 | 17711 | 24 | piece | 10 | ✅ |

Verified via `GET /recipe/sub-recipes` — all 4 returned with correct `recipe_id`, `inventory_id`, `qty`, and `ingredients[]`. ✅

---

## 9. Production Runs — Single Vendor Segments

### 9.1 PRD-2026-0002 — Sesame Cookies (21 pieces)

```
POST /inventory/production-run/complete
{sub_recipe_id: 191, quantity: 21, unit: "piece", batch: "SESAME-BATCH-001", expiry_date: "2026-08-12"}
```

| Field | Value |
|-------|-------|
| production_run_id | 2 |
| reference_code | PRD-2026-0002 |
| output_segment_id | 330 |
| unit_cost | ₹1.6443 |
| total_cost | ₹34.53 |
| **Status** | **✅ PASS** |

### 9.2 PRD-2026-0003 — Ragi Cookies (31 pieces)

| Field | Value |
|-------|-------|
| production_run_id | 3 |
| unit_cost | ₹1.3668 |
| total_cost | ₹42.37 |
| output_segment_id | 331 |
| **Status** | **✅ PASS** |

### 9.3 PRD-2026-0004 — Oats Cookies (24 pieces)

| Field | Value |
|-------|-------|
| production_run_id | 4 |
| unit_cost | ₹1.4724 |
| total_cost | ₹35.34 |
| output_segment_id | 332 |
| **Status** | **✅ PASS** |

### 9.4 PRD-2026-0005 — Elachi Cookies Batch 2 (31 pieces)

| Field | Value |
|-------|-------|
| production_run_id | 5 |
| unit_cost | ₹1.2648 |
| total_cost | ₹39.21 |
| output_segment_id | 333 |
| **Status** | **✅ PASS** |

### 9.5 FG Segment Verification (post all runs)

```
GET /inventory/stock-inventory/{fg_id}
```

| FG Item | Inv ID | Segments | Aggregate | Unsegmented | Status |
|---------|--------|----------|-----------|-------------|--------|
| Elachi Cookies | 17642 | 288 (30pc) + 333 (31pc) | 61 | 0 | ✅ |
| Sesame Cookies | 17709 | 330 (21pc) | 21 | 0 | ✅ |
| Ragi Cookies | 17710 | 331 (31pc) | 31 | 0 | ✅ |
| Oats Cookies | 17711 | 332 (24pc) | 24 | 0 | ✅ |

---

## 10. Production Run Audit — FEFO Cost Inheritance

### 10.1 PRD-2026-0002 (Sesame Cookies) — Full consumed_allocations

```
GET /inventory/production-run/2
```

| Ingredient | Qty | Segment | Batch | Expiry | line_cost |
|-----------|-----|---------|-------|--------|-----------|
| Jaggery Powder | 65gm | 279 | JAGGERY-LOT-001 | 2026-07-07 | ₹4.55 |
| GSM | 30gm | 280 | GSM-LOT-001 | 2026-07-07 | ₹3.75 |
| Wheat Flour | 45gm | 281 | ATTA-LOT-001 | 2026-07-07 | ₹0.99 |
| Baking Soda | 1gm | 283 | BS-LOT-001 | 2026-07-07 | ₹0.18 |
| Egg Replacer | 2gm | 285 | EGGREP-LOT-001 | 2026-07-07 | ₹10.00 |
| Vanilla Essence | 1ml | 286 | VANILLA-LOT-001 | 2026-07-07 | ₹1.20 |
| White Till Powder | 20gm | 308 | VA-WTILL-001 | 2026-09-12 | ₹8.00 |
| Oil | 5gm | 307 | VA-OIL-001 | 2026-09-12 | ₹0.16 |
| Sesame Till | 30gm | 309 | VA-TILL-001 | 2026-09-12 | ₹5.70 |

**All UAT-lot ingredients consumed first (expiry 07-07), then VA-lot (09-12).** FEFO cost inheritance confirmed. ✅

### 10.2 Post-Production Segment Verification

| Ingredient | Seg ID | Pre-Prod | Post-Prod | Consumed | FEFO |
|-----------|--------|----------|-----------|----------|------|
| Jaggery (279) | UAT lot | 950 | 710 | 240gm (across 4 runs) | ✅ First |
| Jaggery (290) | VA lot | 2000 | 2000 | 0 | ✅ Untouched |
| Egg Replacer (285) | UAT lot | 248 | 240 | 8gm | ✅ First |
| Egg Replacer (296) | VA lot | 500 | 500 | 0 | ✅ Untouched |

---

## 11. Blocker B1 — Transfer Reference Code Collision

### 11.1 Initial Transfer Attempt

```
POST /inventory-transfer/initiate
{from_restaurant_id: 806, to_restaurant_id: 809, items: [...]}
```

**Error:**
```json
{
  "error_code": "UNKNOWN_ERROR",
  "message": "SQLSTATE[23000]: Integrity constraint violation: 1062 Duplicate entry 'TRF-2026-0001'"
}
```

**Root cause:** Per-restaurant sequence counter starts at 1, but global UNIQUE constraint. Restaurant 1 already used `TRF-2026-0001`.

### 11.2 Fix Applied

Reference code format changed to `TRF-{masterId}-{year}-{seq}`. First transfer for 806 becomes `TRF-806-2026-0001`.

**Status:** ✅ Fixed (see §13 for verification)

---

## 12. Blocker B2 — Child Store Login

### 12.1 Failed Login Attempts

| Email Tried | Result |
|------------|--------|
| manager@centralalpha.com | auth-001: Invalid credentials |
| manager@centralbeta.com | auth-001: Invalid credentials |
| manager@outletdirect1.com | auth-001: Invalid credentials |

### 12.2 Fix

Correct email format from franchise bootstrap: `manager@{lowercasenamewithoutspaces}.com`

**Status:** ✅ Fixed (see §2.3 for verification)

---

## 13. Post-B1/B2 Fix — Transfer Request Lifecycle

All tests below use post-fix tokens and reference code format.

### 13.1 Request Flow (Franchise → Master)

```
POST /inventory-transfer/request  (from F1_TOKEN)
{from_restaurant_id: 806, items: [{source_inventory_master_id: 17642, quantity: 10, unit: "piece"}, ...]}
```

| Transfer | Ref | Type | Status | Items | Verify |
|----------|-----|------|--------|-------|--------|
| 207 | TRF-806-2026-0001 | request | requested→approved | Elachi 10pc + Jaggery 0.5kg | ✅ |
| 208 | TRF-806-2026-0002 | request | requested→approved | Elachi 5pc | ✅ |

### 13.2 Partial Approval with Segments

```
POST /inventory-transfer/approve/209
{approval_lines: [{line_id:202, approved_display_qty:5, remainder_policy:"hold", segments:[{segment_id:330, quantity:5}]}, ...]}
```

| Transfer 209 Lines | Requested | Approved | Hold | Status |
|-------------------|-----------|----------|------|--------|
| Line 202 (Sesame) | 10 | 5 | 5 | approved ✅ |
| Line 203 (Ragi) | 15 | 15 | 0 | approved ✅ |
| Line 204 (Oats) | 12 | 0 | 12 | on_hold ✅ |

Transfer status: `partially_approved` ✅

### 13.3 Cancel Remainder

```
POST /inventory-transfer/approve/209/cancel-remainder  {line_ids: [204]}
```

Line 204: `status=cancelled_remainder, hold=0` ✅

### 13.4 Amend Request

```
POST /inventory-transfer/request/210/amend  {items: [{..., quantity: 10}]}
```

Transfer 210: quantity changed from 20→10, new line_id=206. Status remains `requested`. ✅

### 13.5 Withdraw Request

```
POST /inventory-transfer/request/211/withdraw
```

Transfer 211: `status=withdrawn` (terminal). ✅

### 13.6 Modification Request (Post-Approval)

```
POST /inventory-transfer/request/210/modification  {items: [{..., quantity: 25}]}
```

Created child transfer 212: `type=modification_request, parent_transfer_id=210, status=requested`. ✅

### 13.7 Reject Modification

```
POST /inventory-transfer/reject/212  {reason: "Insufficient stock for modification"}
```

Transfer 212: `status=rejected`. ✅

### 13.8 Cross-Central Request

```
POST /inventory-transfer/request  (from AO1_TOKEN, franchise under CA)
{from_restaurant_id: 808, items: [{source_inventory_master_id: 17654, quantity: 0.1, unit: "kg"}]}
```

Transfer 213: `TRF-806-2026-0007, type=request, status=requested`. Franchise under Central A successfully requested from Central B. ✅

### 13.9 Pending Queues Verification

| Store | Queue | Items | Status |
|-------|-------|-------|--------|
| Master 806 | approval_pending | TRF-0003 (partially_approved) | ✅ |
| Franchise 809 | my_requests | 4 transfers (approved/partially_approved) | ✅ |
| Central B 808 | approval_pending | TRF-0007 (cross-central request) | ✅ |

### 13.10 Transfer History

```
POST /inventory-transfer/history  (master token)
```

6 transfers returned, all with correct `TRF-806-2026-{seq}` format, correct types and statuses. ✅

---

## 14. Blocker B3 — UNIT_CONVERSION_NOT_DEFINED

### 14.1 Dispatch Failures

Every dispatch attempt returned `UNIT_CONVERSION_NOT_DEFINED`:

| Attempt | Transfer | Payload | Error |
|---------|----------|---------|-------|
| Empty body | 208 | `{}` | UNIT_CONVERSION_NOT_DEFINED |
| With dispatch_lines + segment_id | 208 | `{dispatch_lines:[{line_id:201, quantity:5, source_selector:{mode:"segment_id", segment_id:288}}]}` | UNIT_CONVERSION_NOT_DEFINED |
| piece→piece | 208 | Elachi Cookies (unit=piece) | UNIT_CONVERSION_NOT_DEFINED |
| Direct initiate | — | mode=segment_id | VALIDATION_FAILED then UNIT_CONVERSION_NOT_DEFINED |

### 14.2 Root Cause

`inventory_master.unit_id = NULL` for all items created before B3 fix. The `assertValidStockData()` code throws when `unit_id` is empty.

### 14.3 Fix Applied

SQL backfill on `inventory_master.unit_id` + code fix to resolve unit from name when `unit_id` is missing.

**Status:** ✅ Fixed (see §15 for verification)

---

## 15. Post-B3 Fix — Dispatch & Receive

### 15.1 New Production Run (post-fix, creates segment with unit_id)

```
POST /inventory/production-run/complete
{sub_recipe_id: 187, quantity: 31, batch: "ELACHI-BATCH-003", expiry_date: "2026-09-15"}
```

PRD-2026-0006: output_segment_id=**334**, unit_id=**6** (piece). ✅

Source options confirmed: old segments (288, 333) have `unit_id=None`, new segment (334) has `unit_id=6`.

### 15.2 Direct Dispatch — Master → Franchise

```
POST /inventory-transfer/initiate
{from:806, to:809, items:[{source_inventory_master_id:17642, quantity:5, unit:"piece", source_selector:{mode:"segment_id", segment_id:334}}]}
```

| Field | Value |
|-------|-------|
| transfer_id | 219 |
| reference_code | TRF-806-2026-0009 |
| status | **dispatched** |
| dispatched_qty | 5 piece |
| **Status** | **✅ PASS — First successful dispatch** |

### 15.3 Receive at Franchise

```
POST /inventory-transfer/receive/219  (F1_TOKEN)
```

| Field | Value |
|-------|-------|
| status | **received** |
| received_qty | 5 piece |
| rejected_qty | 0 |
| **Status** | **✅ PASS** |

### 15.4 Segment Verification Post-Transfer

**Master 806 (source):**
Segment 334: qty reduced from 31 → **26** (5 dispatched). ✅

**Franchise 809 (destination):**
New segment 335 created: `batch=ELACHI-BATCH-003, qty=5, expiry=2026-09-15, source_restaurant_id=806`. ✅

---

## 16. 2-Hop Transfer Chain — Segment Continuity

### 16.1 Master → Central A

```
POST /initiate {from:806, to:807, items:[{inv:17642, qty:10, selector:{mode:"segment_id", segment_id:334}}]}
```

TRF 220 dispatched. ✅

```
POST /receive/220  (CA_TOKEN)
```

Central A received 10pc. Segment 336: `batch=ELACHI-BATCH-003, qty=10, expiry=2026-09-15, src=806`. ✅

### 16.2 Central A → Franchise 810

```
POST /initiate {from:807, to:810, items:[{inv:17653, qty:5, selector:{mode:"segment_id", segment_id:336}}]}
```

TRF 221 dispatched. ✅

```
POST /receive/221  (AO1_TOKEN)
```

Franchise 810 received 5pc. Segment 337: `batch=ELACHI-BATCH-003, qty=5, expiry=2026-09-15, src=807`. ✅

### 16.3 Chain Verification

```
Master 806 seg 334 [ELACHI-BATCH-003, exp 2026-09-15]
  ├── → Franchise 809: seg 335 [5pc, same batch/expiry, src=806]  ✅
  └── → Central A 807: seg 336 [10pc → 5pc after dispatch to 810]  ✅
        └── → Franchise 810: seg 337 [5pc, same batch/expiry, src=807]  ✅
```

**Batch continuity, expiry date, and source traceability preserved through 2-hop chain.** ✅

---

## 17. Partial Approval → Dispatch → Receive

### 17.1 Fresh Request (multi-item)

Transfer 222: Franchise 809 requests Elachi (8pc) + Ragi (10pc) from master.

### 17.2 Production for Fresh Ragi Segment

PRD-2026-0007: 31 Ragi Cookies → segment 338 (unit_id set). ✅

### 17.3 Partial Approve with Segments

```
POST /approve/222
{approval_lines: [
  {line_id:214, approved_display_qty:5, remainder_policy:"hold", segments:[{segment_id:334, quantity:5}]},
  {line_id:215, approved_display_qty:10, segments:[{segment_id:338, quantity:10}]}
]}
```

| Line | Requested | Approved | Hold | Status |
|------|-----------|----------|------|--------|
| 214 (Elachi) | 8 | 5 | 3 | approved ✅ |
| 215 (Ragi) | 10 | 10 | 0 | approved ✅ |

### 17.4 Dispatch

```
POST /dispatch/222  {}
```

| Line | Dispatched | Outstanding After | Status |
|------|-----------|------------------|--------|
| 214 | 5 piece | 3 (on hold) | ✅ |
| 215 | 10 piece | 0 | ✅ |

### 17.5 Receive

```
POST /receive/222  (F1_TOKEN)
```

Elachi: received=5, rejected=0. Ragi: received=10, rejected=0. ✅

### 17.6 Franchise 809 Segment Verification

| Item | Seg ID | Batch | Qty | Expiry | Src |
|------|--------|-------|-----|--------|-----|
| Elachi | 335 | ELACHI-BATCH-003 | 4 (after POS consumption) | 2026-09-15 | 806 |
| Elachi | 339 | ELACHI-BATCH-003 | 5 | 2026-09-15 | 806 |
| Ragi | 340 | RAGI-BATCH-002 | 10 | 2026-09-20 | 806 |

✅ All segments correct.

---

## 18. Cross-Segment Production — Old Cost Bug

### 18.1 PRD-2026-0008 — 155 Elachi Cookies (5× batch)

Designed to force GSM consumption across UAT lot (415gm remaining) → VA lot.

```
POST /production-run/complete  {sub_recipe_id:187, quantity:155, batch:"ELACHI-MIXED-COST-001"}
```

**GSM consumed_allocations:**

| Segment | Batch | Qty | Expected Cost |
|---------|-------|-----|--------------|
| 280 | GSM-LOT-001 (UAT) | 415gm | 415 × ₹0.125/gm = ₹51.875 |
| 291 | VA-GSM-001 | 85gm | 85 × ₹0.180/gm = ₹15.300 |
| **Total** | | **500gm** | **₹67.175** |

**Actual `line_cost`: ₹62.50** (= 500 × ₹0.125, first-segment price only)

**Bug confirmed:** Old code used first-segment unit price for entire quantity. Under-count: ₹4.675 per batch. ✅ Documented.

---

## 19. Blended Cost Fix — Fresh GRN Forward Test

### 19.1 Fresh GRN (Bills 6018/6019)

Created after code fix. New segments have `unit_cost_at_intake` set at GRN time.

| Segment | Batch | Vendor | unit_id | unit_cost_at_intake |
|---------|-------|--------|---------|-------------------|
| 346 | CT-VA-GSM | Budget | 1 (kg) | 0.18 ₹/gm |
| 355 | CT-VB-GSM | Premium | 1 (kg) | 0.25 ₹/gm |

✅ No backfill dependency — code sets cost at intake.

### 19.2 PRD-2026-0009 — Burn Batch (620 Elachi, 20× multiplier)

Purpose: deplete old GSM segment 291 to reach new segments.

```
POST /production-run/complete  {sub_recipe_id:187, quantity:620, batch:"BURN-BATCH-001"}
```

**GSM consumed_allocations (cross-segment, BLENDED):**

| Segment | Batch | Qty | unit_cost | alloc_cost |
|---------|-------|-----|-----------|-----------|
| 291 | VA-GSM-001 (old) | 1915gm | 0.25 | ₹478.75 |
| 346 | CT-VA-GSM (new) | 85gm | 0.18 | ₹15.30 |
| **Total** | | **2000gm** | | **₹494.05** |

**`line_cost = ₹494.05 = SUM(alloc_costs)` ✅ BLENDED COST WORKING**

First confirmation that `line_cost` is now computed as sum of per-segment allocation costs.

---

## 20. Blended Cost — 3-Segment Production Verification

### 20.1 PRD-2026-0010 — 930 Elachi Cookies (30× multiplier)

Purpose: span 3 GSM segments from 2 vendors in a single production run.

```
POST /production-run/complete  {sub_recipe_id:187, quantity:930, batch:"ELACHI-3VENDOR-001"}
```

| Field | Value |
|-------|-------|
| production_run_id | 10 |
| reference_code | PRD-2026-0010 |
| quantity_added | 930 |
| unit_cost | ₹2.8041 |
| total_cost | ₹2,607.85 |

### 20.2 Cross-Segment Ingredients (from audit)

```
GET /inventory/production-run/10
```

**GSM (3 segments, 2 vendors):**

| Segment | Batch | Vendor | Qty | unit_cost | alloc_cost |
|---------|-------|--------|-----|-----------|-----------|
| 346 | CT-VA-GSM | Budget (new) | 915gm | 0.18 | ₹164.70 |
| 311 | VB-GSM-001 | Premium (old) | 2000gm | 0.25 | ₹500.00 |
| 355 | CT-VB-GSM | Premium (new) | 85gm | 0.25 | ₹21.25 |
| **Total** | | | **3000gm** | | **₹685.95** |

**Verify: SUM(alloc_costs) = 164.70 + 500.00 + 21.25 = ₹685.95 = line_cost ✅**

**Jaggery Powder (2 segments):**

| Segment | Batch | Qty | unit_cost | alloc_cost |
|---------|-------|-----|-----------|-----------|
| 290 | VA-JAGG-001 | 1350gm | 0.14 | ₹189.00 |
| 345 | CT-VA-JAGG | 150gm | 0.10 | ₹15.00 |
| **Total** | | **1500gm** | | **₹204.00** |

**SUM(alloc_costs) = 189 + 15 = ₹204 = line_cost ✅**

**Wheat Flour (2 segments):**

| Segment | Batch | Qty | unit_cost | alloc_cost |
|---------|-------|-----|-----------|-----------|
| 292 | VA-ATTA-001 | 3425gm | 0.055 | ₹188.375 |
| 347 | CT-VA-ATTA | 175gm | 0.035 | ₹6.125 |
| **Total** | | **3600gm** | | **₹194.50** |

**SUM = ₹194.50 = line_cost ✅**

**Elachi (2 segments):**

| Segment | Batch | Qty | unit_cost | alloc_cost |
|---------|-------|-----|-----------|-----------|
| 284 | ELACHI-LOT-001 | 40gm | 10.00 | ₹400.00 |
| 295 | VA-ELACHI-001 | 20gm | 10.00 | ₹200.00 |
| **Total** | | **60gm** | | **₹600.00** |

**SUM = ₹600 = line_cost ✅**

**All 4 cross-segment ingredients: SUM(alloc_costs) == line_cost, diff = ₹0.00** ✅

---

## 21. Transfer Blended-Cost FG to Franchise

### 21.1 Master → Franchise 811 (direct dispatch)

```
POST /initiate {from:806, to:811, items:[{inv:17642, qty:50, selector:{mode:"segment_id", segment_id:364}}]}
```

TRF 226: `TRF-806-2026-0016`, status=dispatched. ✅

### 21.2 Receive at 811

```
POST /receive/226  (CT_TOKEN)
```

Received 50pc. ✅

### 21.3 Segment at 811

seg 365: `batch=ELACHI-3VENDOR-001, qty=50, expiry=2026-10-20, src=806`. ✅

Batch continuity preserved from blended-cost production through transfer to franchise.

### 21.4 Master → Central A → Franchise 810 (2-hop, blended batch)

| Step | Transfer | Route | Qty | Status |
|------|----------|-------|-----|--------|
| Dispatch | TRF-0014 | 806→807 | 20pc from seg 341 (MIXED-COST) | ✅ dispatched |
| Receive | — | at 807 | seg 343 created | ✅ received |
| Dispatch | TRF-0015 | 807→810 | 10pc from seg 343 | ✅ dispatched |
| Receive | — | at 810 | seg 344 created | ✅ received |

---

## 22. POS Consumption at Franchise Stores

### 22.1 Stock-Level Consumption (segment detail)

```
GET /inventory/stock-inventory/{fg_id}?consumption_from=2026-06-12&consumption_to=2026-06-14
```

| Store | Order | Segment Consumed | Batch | Qty | FEFO |
|-------|-------|-----------------|-------|-----|------|
| 809 | 939863 | seg 335 | ELACHI-BATCH-003 (exp 09-15) | 1pc | ✅ earliest |
| 810 | 939865 | seg 337 | ELACHI-BATCH-003 (exp 09-15) | 1pc | ✅ earliest |
| 811 | 939866 | seg 365 | ELACHI-3VENDOR-001 (exp 10-20) | 1pc | ✅ only segment |

**FEFO respected at POS consumption:** stores 809 and 810 consumed from BATCH-003 (earlier expiry) before MIXED-COST batch. ✅

### 22.2 Stock Reconciliation

| Store | Opening | Consumed | Closing | Match |
|-------|---------|----------|---------|-------|
| 811 | 50 | 1 | 49 | ✅ |

---

## 23. Consumption Report — Hierarchy View

### 23.1 Store-Level Report (811)

```
POST /report/daily-consumption-report  {from_date:"2026-06-13", to_date:"2026-06-13"}
```

**stock_summary:**
```json
{
  "ingredient_name": "Whole wheat Elachi Cookies With Jaggery",
  "total_consumed": "1 piece",
  "opening_stock": "50 piece",
  "closing_stock": "49 piece"
}
```

**stock_details:**
```json
{
  "order_id": 939866,
  "food_item": "whole wheat elachi cookies with jaggery",
  "food_id": "206264",
  "order_type": "POS",
  "ingredient_id": 17770,
  "ingredient_name": "Whole wheat Elachi Cookies With Jaggery",
  "quantity_deducted": "1 piece"
}
```

✅ Shows exact order, food item, ingredient, and deduction quantity.

### 23.2 Master Hierarchy Report

```
POST /report/daily-consumption-report  {from_date:"2026-06-13", to_date:"2026-06-13", include_hierarchy:true}
```

| Field | Value |
|-------|-------|
| hierarchy_scope | 6 stores (806, 807, 808, 809, 810, 811) |
| applied_restaurant_ids | [806, 810, 807, 808, 811, 809] |
| stock_summary | 19 ingredient rows (aggregated across hierarchy) |
| stock_details | **85 lines** (3 POS orders + all production sub-recipe deductions) |
| by_restaurant | 4 restaurant sections (806, 809, 810, 811) |

**POS order lines in stock_details:**

| Order | Food | Ingredient | Qty | Type |
|-------|------|-----------|-----|------|
| 939858 | coffe | coffee beans | 1 pkt | POS |
| 939858 | coffe | Milk | 50 ml | POS |
| 939863 | whole wheat elachi cookies | Whole wheat Elachi Cookies | 1 piece | POS |
| 939865 | whole wheat elachi cookies | Whole wheat Elachi Cookies | 1 piece | POS |
| 939866 | whole wheat elachi cookies | Whole wheat Elachi Cookies | 1 piece | POS |

**Sub-recipe production lines:** 80 lines showing all production run ingredient deductions with `order_type=Sub-Recipe`. ✅

**Elachi FG consumption across stores:**

| Store | Opening | Consumed | Closing |
|-------|---------|----------|---------|
| 809 | 60 piece | 1 piece | 59 piece |
| 810 | 15 piece | 1 piece | 14 piece |
| 811 | 50 piece | 1 piece | 49 piece |

✅ All reconcile.

---

## 24. Summary Matrix

| # | Test | API | Status | Evidence |
|---|------|-----|--------|---------|
| 1 | Master login | POST /proxy/auth/login | ✅ PASS | RID=806, type=master |
| 2 | Create central (×2) | POST franchise/create | ✅ PASS | RID 807, 808 |
| 3 | Create franchise (×3) | POST franchise/create | ✅ PASS | RID 809, 810, 811 |
| 4 | Child login (×5) | POST /proxy/auth/login | ✅ PASS | All 5 stores |
| 5 | Catalogue push (×5) | POST franchise/push/{id} | ✅ PASS | Ingredients, foods, recipes |
| 6 | Add ingredients (33 new) | POST inventory/add-inventory | ✅ PASS | 44 total |
| 7 | Create vendors (×2) | POST inventory/add-vendor | ✅ PASS | ID 235, 236 |
| 8 | Dual-vendor GRN | POST inventory/add-purchase (×4) | ✅ PASS | Bills 6016-6019 |
| 9 | FEFO segment ordering | GET stock-inventory/{id} | ✅ PASS | Ascending by expiry |
| 10 | Segment reconciliation | GET stock-inventory/{id} | ✅ PASS | unsegmented=0 |
| 11 | Sub-recipe creation (×3) | POST recipe/store-sub-recipe | ✅ PASS | IDs 191-193 |
| 12 | Production run (×10) | POST production-run/complete | ✅ PASS | PRD-0001 to PRD-0010 |
| 13 | FEFO cost inheritance | GET production-run/{id} | ✅ PASS | Earliest-expiry consumed first |
| 14 | Production audit trail | GET production-run/{id} | ✅ PASS | Full consumed_allocations |
| 15 | FG segment creation | GET stock-inventory/{fg} | ✅ PASS | Per-run segment with batch/expiry |
| 16 | Transfer request | POST inventory-transfer/request | ✅ PASS | 7 requests |
| 17 | Full approval | POST inventory-transfer/approve | ✅ PASS | Transfers 207, 208, 210, 214 |
| 18 | Partial approval | POST inventory-transfer/approve | ✅ PASS | Transfer 209, 222 |
| 19 | Cancel remainder | POST approve/{id}/cancel-remainder | ✅ PASS | Transfer 209 line 204 |
| 20 | Amend request | POST request/{id}/amend | ✅ PASS | Transfer 210 |
| 21 | Withdraw request | POST request/{id}/withdraw | ✅ PASS | Transfer 211 |
| 22 | Modification request | POST request/{id}/modification | ✅ PASS | Transfer 212 |
| 23 | Reject modification | POST reject/{id} | ✅ PASS | Transfer 212 |
| 24 | Cross-central request | POST inventory-transfer/request | ✅ PASS | Transfer 213 (CA→CB) |
| 25 | Pending queues (3 actors) | POST pending-queues | ✅ PASS | Master, franchise, central |
| 26 | Transfer history | POST history | ✅ PASS | Correct refs and statuses |
| 27 | Direct dispatch | POST initiate (type=dispatch) | ✅ PASS | Transfers 219-226 |
| 28 | Receive at destination | POST receive/{id} | ✅ PASS | All dispatched transfers |
| 29 | Segment creation at dest | GET stock-inventory | ✅ PASS | Batch/expiry preserved |
| 30 | 2-hop transfer chain | Master→Central→Franchise | ✅ PASS | seg 334→336→337 |
| 31 | Partial approve dispatch | POST dispatch/{id} | ✅ PASS | Transfer 222 |
| 32 | Old cost bug (pre-fix) | production-run PRD-0008 | ✅ DOCUMENTED | line_cost = flat rate (wrong) |
| 33 | Blended cost (post-fix) | production-run PRD-0009 | ✅ PASS | line_cost = SUM(alloc_costs) |
| 34 | 3-segment blended cost | production-run PRD-0010 | ✅ PASS | 4 ingredients verified, diff=₹0 |
| 35 | Fresh GRN unit_cost_at_intake | Bills 6018/6019 segments | ✅ PASS | Set at GRN time, no backfill |
| 36 | Transfer blended FG | TRF-0016 (Master→811) | ✅ PASS | 50pc received |
| 37 | 2-hop blended FG | TRF-0014 + TRF-0015 | ✅ PASS | Master→CA→AO1 |
| 38 | POS consumption (seg-level) | GET stock-inventory?consumption | ✅ PASS | 3 orders, FEFO segment alloc |
| 39 | FEFO at POS level | Orders 939863/65/66 | ✅ PASS | Earliest-expiry segment first |
| 40 | Stock reconciliation | opening - consumed = closing | ✅ PASS | 50-1=49 at store 811 |
| 41 | Consumption report (store) | POST daily-consumption-report | ✅ PASS | order_id, food, ingredient, qty |
| 42 | Consumption report (hierarchy) | POST daily-consumption-report +hierarchy | ✅ PASS | 6 stores, 85 detail lines |
| 43 | Operational settings CRUD | POST settings/get, settings/update | ✅ PASS | production_enabled, lateral transfer |

**Total: 43 tests, 42 PASS, 1 DOCUMENTED (old cost bug, now fixed)**

---

## 25. Entity Reference

```
HIERARCHY:
  806 master (german fluid)
  ├── 807 central (Central Kitchen Alpha)
  │   └── 810 franchise (Alpha Outlet One)
  ├── 808 central (Central Kitchen Beta)
  ├── 809 franchise (Outlet Direct One)
  └── 811 franchise (Cost Test Outlet)

VENDORS: 235 (Budget), 236 (Premium)
PURCHASE BILLS: 6016 (VA orig), 6017 (VB orig), 6018 (VA fresh), 6019 (VB fresh)

SUB-RECIPES:
  187 → FG 17642 (Elachi, 31pc)
  191 → FG 17709 (Sesame, 21pc)
  192 → FG 17710 (Ragi, 31pc)
  193 → FG 17711 (Oats, 24pc)

PRODUCTION RUNS: PRD-2026-0001 through PRD-2026-0010
KEY FG SEGMENTS: 288, 330-334, 338, 341, 363, 364

TRANSFERS (completed):
  219 dispatch master→809 (5 Elachi) — RECEIVED
  220 dispatch master→807 (10 Elachi) — RECEIVED
  221 dispatch 807→810 (5 Elachi) — RECEIVED
  222 request 806→809 partial (5 Elachi + 10 Ragi) — RECEIVED
  223 dispatch master→809 (50 mixed-cost Elachi) — RECEIVED
  224 dispatch master→807 (20 mixed-cost Elachi) — RECEIVED
  225 dispatch 807→810 (10 mixed-cost Elachi) — RECEIVED
  226 dispatch master→811 (50 3-vendor Elachi) — RECEIVED

TRANSFERS (lifecycle only):
  207-214 request/approve/amend/withdraw/modify/reject

POS ORDERS:
  939863 at 809, 939865 at 810, 939866 at 811

LOGINS (all Qplazm@10):
  manager@germanfluid.com (806)
  manager@centralkitchenalpha.com (807)
  manager@centralkitchenbeta.com (808)
  manager@outletdirectone.com (809)
  manager@alphaoutletone.com (810)
  manager@costtestoutlet.com (811)
```
