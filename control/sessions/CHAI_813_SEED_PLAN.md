# Seed Plan — Chai Restaurant (RID 813) — Full Setup

> **Created:** 2026-06-14
> **Restaurant:** chai (owner@chai.com, RID 813)
> **Status:** Phases 1-5.2 COMPLETE, Phase 5.3 BLOCKED (POS API bug)
> **Purpose:** Complete reference for any agent to set up or resume the chai hierarchy from scratch

---

## TARGET HIERARCHY

```
Central Store: chai (RID 813) — owner@chai.com
├── Master Store: Chai Master North (RID 814) — manager@chaimasternorth.com
│   ├── Outlet: Chai Outlet N1 (RID 816) — outlet.n1@chai.com
│   ├── Outlet: Chai Outlet N2 (RID 817) — outlet.n2@chai.com
│   ├── Outlet: Chai Outlet N3 (RID 818) — outlet.n3@chai.com
│   ├── Outlet: Chai Outlet N4 (RID 819) — outlet.n4@chai.com
│   ├── Outlet: Chai Outlet N5 (RID 820) — outlet.n5@chai.com
│   └── Outlet: Chai Outlet N6 (RID 821) — outlet.n6@chai.com
└── Master Store: Chai Master South (RID 815) — manager@chaimastersouth.com
    ├── Outlet: Chai Outlet S1 (RID 822) — outlet.s1@chai.com
    ├── Outlet: Chai Outlet S2 (RID 823) — outlet.s2@chai.com
    ├── Outlet: Chai Outlet S3 (RID 824) — outlet.s3@chai.com
    ├── Outlet: Chai Outlet S4 (RID 827) — outlet.south4@chai.com
    ├── Outlet: Chai Outlet S5 (RID 825) — outlet.s5@chai.com
    └── Outlet: Chai Outlet S6 (RID 826) — outlet.s6@chai.com

Vendors:
  Farmfresh Organics  (ID 237) — Flours, Jaggery, Spices, Baking agents
  Dairy & Fats Co     (ID 238) — GSM, Margarine, Milk, Oil, Egg Replacer, Vanilla
  NutSeed Traders     (ID 239) — Nuts, Seeds, Dry Fruits, Oats, Choco Chips, Fresh produce
```

All passwords: `Qplazm@10`

---

## CREDENTIALS

| Role | Email | Password | RID |
|------|-------|----------|:---:|
| Central (TOP) | `owner@chai.com` | `Qplazm@10` | 813 |
| Master North (MID) | `manager@chaimasternorth.com` | `Qplazm@10` | 814 |
| Master South (MID) | `manager@chaimastersouth.com` | `Qplazm@10` | 815 |
| Outlet N1 | `outlet.n1@chai.com` | `Qplazm@10` | 816 |
| Outlet N2 | `outlet.n2@chai.com` | `Qplazm@10` | 817 |
| Outlet N3 | `outlet.n3@chai.com` | `Qplazm@10` | 818 |
| Outlet N4 | `outlet.n4@chai.com` | `Qplazm@10` | 819 |
| Outlet N5 | `outlet.n5@chai.com` | `Qplazm@10` | 820 |
| Outlet N6 | `outlet.n6@chai.com` | `Qplazm@10` | 821 |
| Outlet S1 | `outlet.s1@chai.com` | `Qplazm@10` | 822 |
| Outlet S2 | `outlet.s2@chai.com` | `Qplazm@10` | 823 |
| Outlet S3 | `outlet.s3@chai.com` | `Qplazm@10` | 824 |
| Outlet S4 | `outlet.south4@chai.com` | `Qplazm@10` | 827 |
| Outlet S5 | `outlet.s5@chai.com` | `Qplazm@10` | 825 |
| Outlet S6 | `outlet.s6@chai.com` | `Qplazm@10` | 826 |

---

## API REFERENCE

```
PROXY_URL = https://<deploy>.preview.emergentagent.com/api
POS_URL   = https://preprod.mygenie.online/api/v2/vendoremployee

# Login → get token
POST /api/proxy/auth/login
  {"email":"...","password":"...","fcm_token":"central_inventory_web"}

# All V2 calls go through proxy
POST/GET /api/proxy/v2/{path}
  Header: Authorization: Bearer {token}
```

---

## PHASE 1: LOGIN (✅ COMPLETE)

```bash
# Login as Central
curl -s -X POST "$API/api/proxy/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@chai.com","password":"Qplazm@10","fcm_token":"central_inventory_web"}'
# Expect: token + restaurant_type_flag:"master" + restaurant_id:813
```

---

## PHASE 2: CREATE HIERARCHY (✅ COMPLETE — 14 stores)

### 2.1 Create Masters (as Central)

```bash
# Master North
curl -s -X POST "$API/api/proxy/v2/franchise/create" \
  -H "Authorization: Bearer $CENTRAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Chai Master North","email":"manager@chaimasternorth.com","phone":"9100000001","password":"Qplazm@10","address":"North Region Hub","child_type":"central"}'
# child_type:"central" = business "Master Store" (terminology inversion)

# Master South
curl -s -X POST "$API/api/proxy/v2/franchise/create" \
  -H "Authorization: Bearer $CENTRAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Chai Master South","email":"manager@chaimastersouth.com","phone":"9100000002","password":"Qplazm@10","address":"South Region Hub","child_type":"central"}'
```

### 2.2 Create Outlets (login as each Master first)

```bash
# Login as Master North → create 6 outlets
# child_type:"franchise" = business "Outlet"
curl -s -X POST "$API/api/proxy/v2/franchise/create" \
  -H "Authorization: Bearer $MASTER_NORTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Chai Outlet N1","email":"outlet.n1@chai.com","phone":"9110000001","password":"Qplazm@10","address":"North Outlet 1 - Mall Road","child_type":"franchise"}'
# Repeat for N2-N6, then login as Master South and repeat for S1-S6
```

**IMPORTANT:** Create outlets from their parent Master's session (not Central) to ensure correct `parent_restaurant_id` assignment.

---

## PHASE 3: CREATE VENDORS (✅ COMPLETE — 3 vendors)

```bash
# As Central
curl -s -X POST "$API/api/proxy/v2/inventory/add-vendor" \
  -H "Authorization: Bearer $CENTRAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"vendor_name":"Farmfresh Organics","phone":"9200000001","email":"sales@farmfreshorganics.com","address":"Agri Market, Sector 12"}'

curl -s -X POST "$API/api/proxy/v2/inventory/add-vendor" \
  -d '{"vendor_name":"Dairy & Fats Co","phone":"9200000002","email":"orders@dairyfats.com","address":"Cold Storage Zone, Industrial Area"}'

curl -s -X POST "$API/api/proxy/v2/inventory/add-vendor" \
  -d '{"vendor_name":"NutSeed Traders","phone":"9200000003","email":"bulk@nutseedtraders.com","address":"Wholesale Market, Ring Road"}'
```

**Field name:** `vendor_name` (NOT `name`)

### Vendor-Item Overlap Map (for intelligence testing)

| Ingredient | Vendor A (Farmfresh) | Vendor B (Dairy) | Vendor C (NutSeed) |
|------------|:---:|:---:|:---:|
| GSM (Butter) | — | PRIMARY | Higher ₹ |
| Wheat Flour | PRIMARY | — | Higher ₹ |
| Jaggery Powder | PRIMARY | Higher ₹ | — |
| Oats | Higher ₹ | — | PRIMARY |
| Almonds | — | — | ONLY |
| Milk | — | PRIMARY | Higher ₹ |
| Egg Replacer | Higher ₹ | PRIMARY | — |

This triggers: Vendor Price Comparison bars, "Cheapest for X items" badge, "TIP" banner, multi-PO auto-group.

---

## PHASE 4: RAW MATERIAL CATALOG (✅ COMPLETE — 8 categories + 42 items)

### 4.1 Create Categories

```bash
# Field name: category_name (NOT name)
curl -s -X POST "$API/api/proxy/v2/inventory/stock-item-categories/store" \
  -H "Authorization: Bearer $CENTRAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"category_name":"Flours"}'
# Repeat for: Fats & Dairy, Sweeteners, Leavening, Nuts & Seeds, Spices & Flavoring, Dry Fruits & Others, Fresh Produce
```

**Created Category IDs:**

| ID | Name |
|:--:|------|
| 1548 | Flours |
| 1549 | Fats & Dairy |
| 1550 | Sweeteners |
| 1551 | Leavening |
| 1552 | Nuts & Seeds |
| 1553 | Spices & Flavoring |
| 1554 | Dry Fruits & Others |
| 1555 | Fresh Produce |

### 4.2 Create Raw Material Items

```bash
# MUST send as JSON array (not single object)
# Valid units: "kg", "ltr", "piece" — "gm", "ml", "litre" are REJECTED
curl -s -X POST "$API/api/proxy/v2/inventory/add-inventory" \
  -H "Authorization: Bearer $CENTRAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '[
    {"stock_title":"Whole Wheat Flour","unit":"kg","category_id":1548,"min_qty_alert":5},
    {"stock_title":"Ragi Flour","unit":"kg","category_id":1548,"min_qty_alert":2}
  ]'
```

**Complete Inventory Master (42 items):**

| ID | Ingredient | Unit | Category ID | Category |
|:--:|-----------|:----:|:-----------:|----------|
| 17772 | Whole Wheat Flour | kg | 1548 | Flours |
| 17773 | Ragi Flour | kg | 1548 | Flours |
| 17774 | Jowar Flour | kg | 1548 | Flours |
| 17775 | Maida | kg | 1548 | Flours |
| 17776 | Rice Flour | kg | 1548 | Flours |
| 17777 | GSM | kg | 1549 | Fats & Dairy |
| 17806 | Lilly Margarine | kg | 1549 | Fats & Dairy |
| 17807 | Nutrelite Butter | kg | 1549 | Fats & Dairy |
| 17808 | Milk | ltr | 1549 | Fats & Dairy |
| 17809 | Oil | ltr | 1549 | Fats & Dairy |
| 17810 | Jaggery Powder | kg | 1550 | Sweeteners |
| 17778 | Icing Sugar | kg | 1550 | Sweeteners |
| 17779 | Sugar | kg | 1550 | Sweeteners |
| 17780 | Baking Powder | kg | 1551 | Leavening |
| 17781 | Baking Soda | kg | 1551 | Leavening |
| 17782 | Egg Replacer | kg | 1551 | Leavening |
| 17783 | Almonds | kg | 1552 | Nuts & Seeds |
| 17784 | Cashew | kg | 1552 | Nuts & Seeds |
| 17785 | Peanuts | kg | 1552 | Nuts & Seeds |
| 17786 | White Sesame | kg | 1552 | Nuts & Seeds |
| 17787 | White Till Powder | kg | 1552 | Nuts & Seeds |
| 17811 | Sunflower Seeds | kg | 1552 | Nuts & Seeds |
| 17812 | Pumpkin Seeds | kg | 1552 | Nuts & Seeds |
| 17813 | Vanilla Essence | ltr | 1553 | Spices & Flavoring |
| 17814 | Elachi Powder | kg | 1553 | Spices & Flavoring |
| 17815 | Ajwain | kg | 1553 | Spices & Flavoring |
| 17788 | Jeera | kg | 1553 | Spices & Flavoring |
| 17789 | Chilli Powder | kg | 1553 | Spices & Flavoring |
| 17790 | Salt | kg | 1553 | Spices & Flavoring |
| 17791 | Raisins | kg | 1554 | Dry Fruits & Others |
| 17792 | Dates | kg | 1554 | Dry Fruits & Others |
| 17793 | Oats | kg | 1554 | Dry Fruits & Others |
| 17794 | Coconut Powder | kg | 1554 | Dry Fruits & Others |
| 17795 | Choco Chips | kg | 1554 | Dry Fruits & Others |
| 17796 | Wheat Bran | kg | 1554 | Dry Fruits & Others |
| 17797 | Carrot | kg | 1555 | Fresh Produce |
| 17798 | Green Chilli | kg | 1555 | Fresh Produce |
| 17799 | Mint | kg | 1555 | Fresh Produce |
| 17800 | Curry Leaves | kg | 1555 | Fresh Produce |
| 17801 | Coriander Leaves | kg | 1555 | Fresh Produce |
| 17802 | Kasuri Methi | kg | 1555 | Fresh Produce |
| 17803 | Garlic | kg | 1555 | Fresh Produce |

---

## PHASE 5: PRODUCTS & RECIPES

### 5.1 Food Categories (✅ COMPLETE)

| ID | Name |
|:--:|------|
| 7900 | Jaggery Cookies |
| 7901 | Sugar Cookies |
| 7902 | Kharis |

### 5.2 Food Products (✅ COMPLETE — 19 foods)

| Food ID | Name | Category | Price ₹ |
|:-------:|------|:--------:|:-------:|
| 206275 | Sesame Cookies With Jaggery | 7900 | 25 |
| 206276 | Cashew Cookies With Jaggery | 7900 | 30 |
| 206277 | Whole wheat Elachi Cookies With Jaggery | 7900 | 25 |
| 206278 | Coconut Cookies With Jaggery | 7900 | 25 |
| 206279 | Dates Cookies With Jaggery | 7900 | 28 |
| 206280 | Ajwain Cookies With Jaggery | 7900 | 25 |
| 206281 | Jeera Cookies With Jaggery | 7900 | 25 |
| 206282 | Almond Cookies With Jaggery | 7900 | 35 |
| 206283 | Ragi Cookies With Jaggery | 7900 | 25 |
| 206284 | Oats Cookies With Jaggery | 7900 | 25 |
| 206285 | Choco Chip Cookies With Jaggery | 7900 | 30 |
| 206286 | Ragi Elachi Cookies With Jaggery | 7900 | 25 |
| 206287 | Multi Millet Cashew Cookies With Jaggery | 7900 | 30 |
| 206288 | Multiseed Cookies With Jaggery | 7900 | 35 |
| 206289 | Carrot Cookies With Jaggery | 7900 | 25 |
| 206290 | Wheat Bran Cookies With Jaggery | 7900 | 25 |
| 206291 | Sweet Masala Cookies With Sugar | 7901 | 20 |
| 206292 | Methi Khari | 7902 | 15 |
| 206293 | Garlic Khari | 7902 | 15 |

### 5.3 Sub-Recipes with BOM (❌ BLOCKED — POS API bug)

**API:** `POST /recipe/store-sub-recipe`

**Known field mappings (discovered via testing):**
- `sub_recipe_name` → DB `name` column (NOT `name` — POS ignores `name` field)
- `food_name` → stored separately
- `qty` → output quantity (works as-is)
- `unit` → **BROKEN** — POS controller does NOT read `unit` from request body for DB `unit` column. Tested: `unit`, `sub_recipe_unit`, `output_unit`, `unit_id`, `unit_name`, `uom`, `measure_unit`. ALL result in NULL. Same failure on restaurant 806. Existing 806 sub-recipes were NOT created via this API.
- `ingredients` → array of `{ingredient_id, ingredient_qty, ingredient_unit}`
- `ingredient_unit` uses `"gm"` (NOT `"kg"`) per existing 806 data

**BLOCKER:** POS backend `RecipeController@sub_recipes_store` (line 570) does not map any request field to the `unit` DB column. Needs POS backend fix.

**When unblocked, use this payload pattern:**

```bash
curl -s -X POST "$API/api/proxy/v2/recipe/store-sub-recipe" \
  -H "Authorization: Bearer $CENTRAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sub_recipe_name": "Sesame Cookies With Jaggery",
    "food_name": "Sesame Cookies With Jaggery",
    "prepration_time": 0,
    "serve_people": 1,
    "unit": "piece",
    "qty": 21,
    "ingredients": [
      {"ingredient_id": 17810, "ingredient_qty": 65, "ingredient_unit": "gm"},
      {"ingredient_id": 17777, "ingredient_qty": 30, "ingredient_unit": "gm"},
      ...
    ]
  }'
```

**NOTE:** When the POS fix is applied, the correct `unit` field name may be different. Test with a single recipe first.

#### COMPLETE BOM DATA — ALL 19 RECIPES

All quantities below are in **gm** (for `ingredient_unit: "gm"`) or **ml** (for `ingredient_unit: "ml"`).  
Inventory IDs reference the table in Phase 4.2.

---

**Recipe 1: Sesame Cookies With Jaggery** — Output: 21 piece

| Ingredient | Inv ID | Qty | Unit |
|-----------|:------:|:---:|:----:|
| Jaggery Powder | 17810 | 65 | gm |
| GSM | 17777 | 30 | gm |
| Whole Wheat Flour | 17772 | 45 | gm |
| Baking Soda | 17781 | 1 | gm |
| Egg Replacer | 17782 | 2 | gm |
| Vanilla Essence | 17813 | 1 | ml |
| White Till Powder | 17787 | 20 | gm |
| Oil | 17809 | 5 | ml |
| White Sesame | 17786 | 30 | gm |

---

**Recipe 2: Cashew Cookies With Jaggery** — Output: 21 piece

| Ingredient | Inv ID | Qty | Unit |
|-----------|:------:|:---:|:----:|
| Jaggery Powder | 17810 | 30 | gm |
| GSM | 17777 | 15 | gm |
| Whole Wheat Flour | 17772 | 60 | gm |
| Baking Powder | 17780 | 2 | gm |
| Egg Replacer | 17782 | 2 | gm |
| Vanilla Essence | 17813 | 1 | ml |
| Cashew | 17784 | 35 | gm |
| Salt | 17790 | 1 | gm |
| Milk | 17808 | 30 | ml |

---

**Recipe 3: Whole wheat Elachi Cookies With Jaggery** — Output: 28 piece

| Ingredient | Inv ID | Qty | Unit |
|-----------|:------:|:---:|:----:|
| Jaggery Powder | 17810 | 50 | gm |
| GSM | 17777 | 100 | gm |
| Whole Wheat Flour | 17772 | 120 | gm |
| Baking Powder | 17780 | 5 | gm |
| Baking Soda | 17781 | 3 | gm |
| Elachi Powder | 17814 | 2 | gm |
| Egg Replacer | 17782 | 2 | gm |
| Vanilla Essence | 17813 | 1 | ml |
| Milk | 17808 | 5 | ml |

---

**Recipe 4: Coconut Cookies With Jaggery** — Output: 28 piece

| Ingredient | Inv ID | Qty | Unit |
|-----------|:------:|:---:|:----:|
| Jaggery Powder | 17810 | 60 | gm |
| GSM | 17777 | 50 | gm |
| Whole Wheat Flour | 17772 | 75 | gm |
| Baking Powder | 17780 | 3 | gm |
| Baking Soda | 17781 | 2 | gm |
| Coconut Powder | 17794 | 30 | gm |
| Egg Replacer | 17782 | 2 | gm |
| Vanilla Essence | 17813 | 1 | ml |

---

**Recipe 5: Dates Cookies With Jaggery** — Output: 21 piece

| Ingredient | Inv ID | Qty | Unit |
|-----------|:------:|:---:|:----:|
| Jaggery Powder | 17810 | 45 | gm |
| GSM | 17777 | 40 | gm |
| Whole Wheat Flour | 17772 | 90 | gm |
| Dates | 17792 | 30 | gm |
| Baking Powder | 17780 | 2 | gm |
| Milk | 17808 | 15 | ml |
| Egg Replacer | 17782 | 4 | gm |
| Vanilla Essence | 17813 | 1 | ml |

---

**Recipe 6: Ajwain Cookies With Jaggery** — Output: 21 piece

| Ingredient | Inv ID | Qty | Unit |
|-----------|:------:|:---:|:----:|
| Jaggery Powder | 17810 | 40 | gm |
| GSM | 17777 | 55 | gm |
| Whole Wheat Flour | 17772 | 60 | gm |
| Rice Flour | 17776 | 15 | gm |
| Baking Powder | 17780 | 2 | gm |
| Egg Replacer | 17782 | 4 | gm |
| Vanilla Essence | 17813 | 1 | ml |
| Ajwain | 17815 | 3 | gm |

---

**Recipe 7: Jeera Cookies With Jaggery** — Output: 21 piece

| Ingredient | Inv ID | Qty | Unit |
|-----------|:------:|:---:|:----:|
| Jaggery Powder | 17810 | 60 | gm |
| GSM | 17777 | 65 | gm |
| Whole Wheat Flour | 17772 | 120 | gm |
| Baking Powder | 17780 | 2 | gm |
| Egg Replacer | 17782 | 6 | gm |
| Vanilla Essence | 17813 | 1 | ml |
| Jeera | 17788 | 5 | gm |
| Salt | 17790 | 1 | gm |
| Milk | 17808 | 20 | ml |

---

**Recipe 8: Almond Cookies With Jaggery** — Output: 21 piece

| Ingredient | Inv ID | Qty | Unit |
|-----------|:------:|:---:|:----:|
| Jaggery Powder | 17810 | 30 | gm |
| GSM | 17777 | 25 | gm |
| Whole Wheat Flour | 17772 | 60 | gm |
| Baking Powder | 17780 | 2 | gm |
| Egg Replacer | 17782 | 2 | gm |
| Vanilla Essence | 17813 | 1 | ml |
| Almonds | 17783 | 36 | gm |
| Salt | 17790 | 1 | gm |
| Milk | 17808 | 20 | ml |

---

**Recipe 9: Ragi Cookies With Jaggery** — Output: 21 piece

| Ingredient | Inv ID | Qty | Unit |
|-----------|:------:|:---:|:----:|
| Ragi Flour | 17773 | 60 | gm |
| GSM | 17777 | 110 | gm |
| Whole Wheat Flour | 17772 | 60 | gm |
| Jaggery Powder | 17810 | 60 | gm |
| Baking Powder | 17780 | 2 | gm |
| Egg Replacer | 17782 | 4 | gm |
| Vanilla Essence | 17813 | 1 | ml |
| Elachi Powder | 17814 | 2 | gm |

---

**Recipe 10: Oats Cookies With Jaggery** — Output: 21 piece

| Ingredient | Inv ID | Qty | Unit |
|-----------|:------:|:---:|:----:|
| Jaggery Powder | 17810 | 65 | gm |
| GSM | 17777 | 35 | gm |
| Whole Wheat Flour | 17772 | 50 | gm |
| Baking Soda | 17781 | 2 | gm |
| Egg Replacer | 17782 | 2 | gm |
| Vanilla Essence | 17813 | 1 | ml |
| Raisins | 17791 | 15 | gm |
| Oats | 17793 | 60 | gm |
| Salt | 17790 | 1 | gm |
| Milk | 17808 | 5 | ml |

---

**Recipe 11: Choco Chip Cookies With Jaggery** — Output: 21 piece

| Ingredient | Inv ID | Qty | Unit |
|-----------|:------:|:---:|:----:|
| Jaggery Powder | 17810 | 45 | gm |
| GSM | 17777 | 28 | gm |
| Whole Wheat Flour | 17772 | 30 | gm |
| Baking Soda | 17781 | 4 | gm |
| Egg Replacer | 17782 | 4 | gm |
| Vanilla Essence | 17813 | 1 | ml |
| Choco Chips | 17795 | 32 | gm |
| Oats | 17793 | 32 | gm |
| Milk | 17808 | 4 | ml |

---

**Recipe 12: Ragi Elachi Cookies With Jaggery** — Output: 21 piece

| Ingredient | Inv ID | Qty | Unit |
|-----------|:------:|:---:|:----:|
| Jaggery Powder | 17810 | 40 | gm |
| GSM | 17777 | 40 | gm |
| Ragi Flour | 17773 | 45 | gm |
| Whole Wheat Flour | 17772 | 15 | gm |
| Baking Powder | 17780 | 2 | gm |
| Elachi Powder | 17814 | 2 | gm |
| Milk | 17808 | 5 | ml |
| Egg Replacer | 17782 | 4 | gm |
| Vanilla Essence | 17813 | 1 | ml |

---

**Recipe 13: Multi Millet Cashew Cookies With Jaggery** — Output: 21 piece

| Ingredient | Inv ID | Qty | Unit |
|-----------|:------:|:---:|:----:|
| Jaggery Powder | 17810 | 60 | gm |
| GSM | 17777 | 60 | gm |
| Jowar Flour | 17774 | 45 | gm |
| Ragi Flour | 17773 | 45 | gm |
| Whole Wheat Flour | 17772 | 15 | gm |
| Baking Powder | 17780 | 3 | gm |
| Cashew | 17784 | 10 | gm |
| Milk | 17808 | 15 | ml |
| Egg Replacer | 17782 | 4 | gm |
| Vanilla Essence | 17813 | 1 | ml |

---

**Recipe 14: Multiseed Cookies With Jaggery** — Output: 21 piece

| Ingredient | Inv ID | Qty | Unit |
|-----------|:------:|:---:|:----:|
| Jaggery Powder | 17810 | 100 | gm |
| GSM | 17777 | 58 | gm |
| Whole Wheat Flour | 17772 | 73 | gm |
| Baking Soda | 17781 | 2 | gm |
| Egg Replacer | 17782 | 2 | gm |
| Vanilla Essence | 17813 | 2 | ml |
| Salt | 17790 | 1 | gm |
| Sunflower Seeds | 17811 | 15 | gm |
| Cashew | 17784 | 15 | gm |
| Peanuts | 17785 | 15 | gm |
| Almonds | 17783 | 15 | gm |
| White Sesame | 17786 | 15 | gm |
| Pumpkin Seeds | 17812 | 15 | gm |
| Milk | 17808 | 5 | ml |

---

**Recipe 15: Carrot Cookies With Jaggery** — Output: 21 piece

| Ingredient | Inv ID | Qty | Unit |
|-----------|:------:|:---:|:----:|
| Jaggery Powder | 17810 | 50 | gm |
| GSM | 17777 | 57 | gm |
| Whole Wheat Flour | 17772 | 50 | gm |
| Baking Soda | 17781 | 2 | gm |
| Egg Replacer | 17782 | 2 | gm |
| Vanilla Essence | 17813 | 1 | ml |
| Raisins | 17791 | 30 | gm |
| Oats | 17793 | 45 | gm |
| Salt | 17790 | 1 | gm |
| Carrot | 17797 | 10 | gm |
| Coconut Powder | 17794 | 15 | gm |

---

**Recipe 16: Wheat Bran Cookies With Jaggery** — Output: 21 piece

| Ingredient | Inv ID | Qty | Unit |
|-----------|:------:|:---:|:----:|
| Jaggery Powder | 17810 | 50 | gm |
| GSM | 17777 | 50 | gm |
| Whole Wheat Flour | 17772 | 65 | gm |
| Baking Powder | 17780 | 3 | gm |
| Wheat Bran | 17796 | 15 | gm |
| Milk | 17808 | 15 | ml |
| Egg Replacer | 17782 | 4 | gm |
| Vanilla Essence | 17813 | 1 | ml |

---

**Recipe 17: Sweet Masala Cookies With Sugar** — Output: 220 piece

| Ingredient | Inv ID | Qty | Unit |
|-----------|:------:|:---:|:----:|
| GSM | 17777 | 1000 | gm |
| Maida | 17775 | 1500 | gm |
| Ajwain | 17815 | 150 | gm |
| Chilli Powder | 17789 | 30 | gm |
| Green Chilli | 17798 | 100 | gm |
| Icing Sugar | 17778 | 500 | gm |
| Salt | 17790 | 40 | gm |
| Egg Replacer | 17782 | 30 | gm |
| Mint | 17799 | 100 | gm |
| Curry Leaves | 17800 | 100 | gm |
| Coriander Leaves | 17801 | 100 | gm |
| Baking Powder | 17780 | 20 | gm |

---

**Recipe 18: Methi Khari** — Output: 100 piece

| Ingredient | Inv ID | Qty | Unit |
|-----------|:------:|:---:|:----:|
| Maida | 17775 | 3500 | gm |
| Salt | 17790 | 60 | gm |
| Sugar | 17779 | 150 | gm |
| GSM | 17777 | 150 | gm |
| Lilly Margarine | 17806 | 1450 | gm |
| Ajwain | 17815 | 35 | gm |
| Jeera | 17788 | 35 | gm |
| Chilli Powder | 17789 | 45 | gm |
| Kasuri Methi | 17802 | 50 | gm |

---

**Recipe 19: Garlic Khari** — Output: 100 piece

| Ingredient | Inv ID | Qty | Unit |
|-----------|:------:|:---:|:----:|
| Maida | 17775 | 3500 | gm |
| Salt | 17790 | 60 | gm |
| Sugar | 17779 | 150 | gm |
| GSM | 17777 | 150 | gm |
| Lilly Margarine | 17806 | 1450 | gm |
| Nutrelite Butter | 17807 | 300 | gm |
| Garlic | 17803 | 450 | gm |

---

### 5.4 Link Recipes to Foods (blocked by 5.3)

```bash
# After sub-recipes are created, link each to its food product:
curl -s -X POST "$API/api/proxy/v2/recipe/store-recipe" \
  -H "Authorization: Bearer $CENTRAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "food_id": 206275,
    "sub_recipe_id": <sub_recipe_id>,
    "prepration_time": 0,
    "output_qty": 21,
    "output_unit": "piece",
    "ingredients": [...]
  }'
```

---

## PHASE 6: PUSH CATALOG TO ALL STORES (⏸ waiting)

```bash
# For each child store ID:
curl -s -X POST "$API/api/proxy/v2/franchise/push/{child_id}" \
  -H "Authorization: Bearer $CENTRAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"push_food_bundle": true}'
# Push to: 814, 815, 816-821, 822-827 (14 stores)
```

---

## PHASE 7: PURCHASE ORDERS — STOCK + VENDOR INTELLIGENCE (⏸ waiting)

### 7.1 Primary POs (3 — one per vendor)

```bash
# PO → Farmfresh Organics: Flours + Jaggery + Spices + Baking
# PO → Dairy & Fats Co: GSM + Margarine + Milk + Oil + Egg Replacer + Vanilla
# PO → NutSeed Traders: Nuts + Seeds + Dry Fruits + Oats + Choco Chips + Fresh
```

### 7.2 Overlap POs (3 — for vendor intelligence)

| PO # | Vendor | Items (overlap) | Rate vs Primary | Purpose |
|:----:|--------|-----------------|:---:|---------|
| 4 | Dairy & Fats Co | Wheat Flour | +15% | Price comparison bars |
| 5 | NutSeed Traders | Jaggery Powder | +10% | TIP banner trigger |
| 6 | Farmfresh Organics | GSM | +20% | Cheapest vendor badge |

### 7.3 Receive All POs

```bash
# For each PO:
curl -s -X POST "$API/api/proxy/v2/inventory/purchase-order/{po_id}/receive" \
  -H "Authorization: Bearer $CENTRAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lines": [
      {"line_id": ..., "received_qty": ..., "actual_rate": ..., "batch": "...", "expiry_date": "..."}
    ],
    "invoice_number": "INV-001"
  }'
```

---

## PHASE 8: PRODUCTION RUNS (⏸ waiting)

```bash
# For each of 19 sub-recipes:
curl -s -X POST "$API/api/proxy/v2/inventory/production-run/complete" \
  -H "Authorization: Bearer $CENTRAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sub_recipe_id": <id>,
    "quantity": <batch_multiplier>,
    "unit": "piece",
    "batch": "SESAME-20260614-001",
    "expiry_date": "2026-09-14"
  }'
```

---

## PHASE 9: DISTRIBUTION (⏸ waiting)

```bash
# Central → Master North (dispatch finished goods)
curl -s -X POST "$API/api/proxy/v2/inventory-transfer/initiate" \
  -H "Authorization: Bearer $CENTRAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to_restaurant_id": 814,
    "items": [
      {"source_inventory_master_id": <fg_id>, "quantity": 100, "unit": "piece", "source_selector": {...}}
    ]
  }'
# Repeat for Master South (815)
# Then Masters dispatch to their outlets
```

---

## PHASE 10: VERIFY INTELLIGENCE (⏸ waiting)

After all phases complete, verify:
- Operations Hub: NBA cards, KPIs, Store Health grid
- Vendor Management: 3 KPIs per vendor, monthly chart, recent purchases
- Raw Material Master: Avg Rate, Consumption, Days of Stock, Vendor Price Comparison
- PO Create: Cheapest vendor badges, TIP banner, multi-PO auto-group
- Sub-Recipe Master: Material Cost/batch, Last Produced, FG Stock
- Production History: KPIs, Staleness, Cost Trend
- Store Management: Push Status, OOS/Low/OK, Stock Health
- Stock Inventory: FG/Raw split, Days of Cover, FEFO segments
- Request Stock (Outlets): Consumption-based reorder suggestions

---

## KNOWN POS API FIELD NAME QUIRKS

| API | Field You'd Expect | Actual Field POS Wants | Notes |
|-----|-------------------|----------------------|-------|
| `add-vendor` | `name` | `vendor_name` | |
| `stock-item-categories/store` | `name` | `category_name` | |
| `add-inventory` | single object | **JSON array** `[{...}]` | Even for 1 item |
| `add-inventory` | `unit: "litre"` | `unit: "ltr"` | Valid: `kg`, `ltr`, `piece` only |
| `add-inventory` | `unit: "gm"` | REJECTED | Use `kg` and convert quantities |
| `store-sub-recipe` | `name` | `sub_recipe_name` | `name` field is ignored |
| `store-sub-recipe` | `unit` | **BROKEN** | No field maps to DB `unit` column — POS backend bug |
| `add-food` | — | Returns flat object (no `success` wrapper) | Parse `id` directly from response |
| `add-categories` (food) | — | Returns `{"message":"...", "category_id": N}` | |

---

## EXECUTION STATUS

| Phase | Status | Blocker |
|:-----:|:------:|---------|
| 1 | ✅ DONE | — |
| 2 | ✅ DONE | — |
| 3 | ✅ DONE | — |
| 4 | ✅ DONE | — |
| 5.1 | ✅ DONE | — |
| 5.2 | ✅ DONE | — |
| 5.3 | ❌ BLOCKED | POS API `store-sub-recipe` unit column bug |
| 5.4 | ⏸ | Needs 5.3 |
| 6 | ⏸ | Needs 5.4 |
| 7 | ⏸ | Needs 6 (push) + 4 (items exist, but need stock) |
| 8 | ⏸ | Needs 5.3 (sub-recipes) + 7 (raw material stock) |
| 9 | ⏸ | Needs 8 (finished goods stock) |
| 10 | ⏸ | Needs all above |

---

*Source: Excel file "Ingredients List - Recipe for cookies & kharis - Mygenie demo.xlsx" provided by owner on 2026-06-14*
