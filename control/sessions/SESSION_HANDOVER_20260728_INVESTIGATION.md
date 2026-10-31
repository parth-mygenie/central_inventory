# SESSION HANDOVER — 2026-07-28

> **Agent Role:** INVESTIGATION (Role 6)
> **Items Worked:** 4 investigation scenarios (no registered IDs — exploratory/owner-directed)
> **Registry Synced:** NO (investigations only — no code changes, no items to register)
> **Scope Drift:** NONE

## What Was Done

### Investigation 1 — Whole Milk Litre Unit Issue on Dispatch
- **Accounts:** owner@palmcentral.com (RID 813, master), owner@palmruby.com (RID 814, franchise)
- **Symptom:** Whole Milk purchased in litres shows 0.06/0.01 avail in dispatch source selector
- **Root cause:** POS API `add-stock` endpoint does NOT convert litre→ml (×1000) when storing `cal_quantity`. Works correctly for kg→gm. ALL litre items affected (Caramel Sauce, Heavy Cream, Vanilla Syrup, Whole Milk — all show 1000× too-small quantities).
- **Classification:** POS API backend bug. No frontend fix needed.
- **Evidence:** `stock-inventory` and `source-options` curl probes show cal_quantity=70, display_qty=0.07 for Whole Milk. Coffee Beans (kg) correctly shows cal=50000, display=50.
- **Secondary:** Batch name "iiio" renders ambiguously as "kilo" in sans-serif fonts (data entry cosmetic issue).

### Investigation 2 — Reverse-Push-Form 404 vs Push-Form 200
- **Symptom:** `GET /franchise/reverse-push-form/from/675` returns 404 while `GET /franchise/push-form/675` returns 200, both with double `/api/api/` prefix
- **Root cause:** POS Laravel backend does NOT have the `reverse-push-form/from/{id}` route registered. Confirmed via direct POS curl — `NotFoundHttpException` from Laravel's `AbstractRouteCollection.php:43`.
- **Classification:** POS API route missing. L9 register says "BACKEND CLOSED" but endpoint doesn't exist on preprod.
- **Note:** Double `/api/api/` is a separate deployment config issue (REACT_APP_BACKEND_URL includes `/api`), but doesn't cause the 404.
- **When triggered:** Store Management → click "Pull" button on a franchise child → ReversePushWizardDialog opens → calls `fetchReverseForm(target.id)`.

### Investigation 3 — Data Creation + Category-Scoped Push Verification
- **Accounts:** owner@hellskitchen.com (RID 803, master) → owner@noi.com (RID 820, franchise)
- **Data created on master (803):**
  - 3 food categories (Appetizers=8474, Desserts=8475, Beverages=8476)
  - 3 stock item categories (Dairy=1724, Baking=1725, Fresh Produce=1726)
  - 15 new ingredients (Cream, Butter, Eggs, Parmesan Cheese, Sugar, Cocoa Powder, Vanilla Extract, All Purpose Flour, Lettuce, Garlic, Lemon, Beef Tenderloin, Salmon Fillet, Puff Pastry, Mushrooms)
  - 10 new foods (Caesar Salad ₹220, Bruschetta ₹180, Mushroom Soup ₹190, Beef Wellington ₹850, Pan-Seared Salmon ₹650, Chicken Parmesan ₹420, Chocolate Lava Cake ₹280, Tiramisu ₹320, Panna Cotta ₹260, Fresh Lemonade ₹120)
  - 10 recipes with full ingredient breakdowns
- **Push to noi (820):** Category-scoped push (8474, 8475, 8476) — 40 items inserted, 0 failures
- **Verification:** 7/7 recipes with ALL ingredients matching master exactly. 3 missing recipes (Beef Wellington, Pan-Seared Salmon, Chicken Parmesan) correctly excluded — they belong to Mains category (not in push scope).
- **Also pushed to HK Express (806):** Same 3-category push — 7/7 recipe ingredients identical.
- **Franchise create failure:** POS API returns 500 on `POST /franchise/create` for RID 803. Cannot create new children.

### Investigation 4 — Reverse Push (Pull) from Mantri → disneyland
- **Accounts:** owner@disneyland.com (RID 821, master) → owner@mantri.com (RID 675, franchise)
- **Reverse-push-form:** Works (200) for this hierarchy — unlike RID 803 which returns 404.
- **Pull executed:** 933 items pulled, 0 failures.
- **Verification results:**

| Item | Mantri (source) | disneyland (target) | Status |
|------|:---------------:|:-------------------:|--------|
| Food Categories | 56 | 56 | ALL present |
| Foods | 187 | 186 | 1 deduped (duplicate name "Vada Pav + Fries + Cold Coffee") |
| Ingredients | 421 (368 unique) | 357 | ALL 368 unique names present. 11 case-variants deduped |
| Recipes | 3 | 3 | ALL ingredients MATCH |
| Sub-Recipes | 1 | 1 | Present |
| Addons | 145 | 145 | ALL present |
| Addon Recipes | 107 | 107 | ALL 107 ingredient sets MATCH |

- **Genuinely missing: ZERO.** All count gaps from POS API's correct deduplication of duplicate names and case variants.

## What Was NOT Done (and why)

- **No code changes** — all 4 items are INVESTIGATION role (no code edits per AGENT_PROMPT.md Role 6 rules)
- **No registry updates** — these are owner-directed exploratory investigations, not registered CRs/BUGs
- **No new BUG/CR registrations** — awaiting owner decision on whether to formalize the findings

## State of Each Item

| Item | Classification | Action Needed |
|------|---------------|---------------|
| Whole Milk litre issue | POS API backend bug | Escalate to POS team: `add-stock` doesn't convert litre→ml |
| Reverse-push 404 (RID 803) | POS API route missing | Escalate: route exists for RID 821 but not 803 |
| Franchise create 500 (RID 803) | POS API server error | Escalate: `POST /franchise/create` returns 500 for hells kitchen |
| Category-scoped push | VERIFIED WORKING | No action — 0 failures, perfect ingredient matching |
| Reverse push Mantri→disneyland | VERIFIED WORKING | No action — 933 items, 0 failures, 0 genuinely missing |

## Next Agent Should

1. **INTAKE role** if owner wants to register the POS API issues as formal BUGs:
   - BUG: `add-stock` litre→ml conversion failure (all litre items affected)
   - BUG: `reverse-push-form/from/{id}` returns 404 for certain restaurant hierarchies
   - BUG: `franchise/create` returns 500 for RID 803
2. **INVESTIGATION role** if owner wants to probe additional hierarchies or test more push/pull scenarios
3. **No frontend code work needed** — all issues are POS API backend-side

## Files Created/Modified

| File | Change |
|------|--------|
| control/sessions/SESSION_HANDOVER_20260728_INVESTIGATION.md | This handover document |
| memory/mn_*.json, memory/dl_*.json | Temporary data snapshots for Mantri/disneyland comparison (can be cleaned up) |

## Test Accounts Used

| Email | RID | Type | Hierarchy |
|-------|:---:|------|-----------|
| owner@hellskitchen.com | 803 | master | hells kitchen (TOP) |
| owner@hkexpress.com | 806 | franchise | child of 803 |
| owner@noi.com | 820 | franchise | child of 803 |
| owner@palmcentral.com | 813 | master | palm central (TOP) |
| owner@palmruby.com | 814 | franchise | child of 813 |
| owner@disneyland.com | 821 | master | disneyland (TOP) |
| owner@mantri.com | 675 | franchise | child of 821 |
