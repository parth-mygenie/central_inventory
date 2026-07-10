# Agent Handover — Central Inventory (Chai 813 Setup)

> **Date:** 2026-06-14
> **From:** Session Agent (QA + Chai Setup)
> **To:** Next Agent
> **Priority:** Resume Phase 5.3 once POS backend fix is confirmed

---

## READ THESE FILES IN ORDER

| # | File | What You Learn | Time |
|---|------|----------------|:----:|
| 1 | **This file** | Where things stand, what to do next | 2 min |
| 2 | `control/AGENT_PROMPT.md` | Project rules, terminology inversion, frozen files | 5 min |
| 3 | `control/sessions/CHAI_813_SEED_PLAN.md` | **THE PLAN** — all 10 phases, 19 recipes with BOM, all IDs, API quirks | 10 min |
| 4 | `control/sessions/QA_VALIDATION_REPORT_CR030_031_032_033.md` | QA status of 4 CRs (all pass) | 3 min |
| 5 | `memory/test_credentials.md` | Login credentials for both 806 and 813 hierarchies | 1 min |

**Do NOT read the full governance stack (L0-L9) unless you need to modify code. For seed execution, the seed plan doc is self-contained.**

---

## WHAT WAS DONE THIS SESSION

### Task A: QA Validation (COMPLETE)
- Cloned `14-june-1` branch, set up and ran the app
- Full QA of CR-030/031/032/033 — 27 screens tested, all pass, report filed
- Read entire governance stack (L0-L9, all frozen docs)

### Task B: Chai 813 Hierarchy Setup (PARTIALLY COMPLETE)

| Phase | Status | What Exists |
|:-----:|:------:|-------------|
| 1 | ✅ | Central `chai` (813) verified |
| 2 | ✅ | 2 Masters (814, 815) + 12 Outlets (816-827) — all parent chains correct |
| 3 | ✅ | 3 Vendors (237, 238, 239) with planned overlap for intelligence |
| 4 | ✅ | 8 categories (1548-1555) + 42 raw material items (17772-17815) |
| 5.1 | ✅ | 3 food categories (7900-7902) |
| 5.2 | ✅ | 19 food products (206275-206293) |
| **5.3** | **❌ BLOCKED** | Sub-recipe creation — POS API bug |
| 5.4-10 | ⏸ | Not started |

---

## THE BLOCKER — AND WHAT TO DO

### POS API Bug: `POST /recipe/store-sub-recipe`

**Problem:** The `unit` DB column is always NULL regardless of what field you send.

**What was tested (all failed):**
- Fields: `unit`, `sub_recipe_unit`, `output_unit`, `unit_id`, `unit_name`, `uom`, `measure_unit`
- Formats: JSON, form-data, multipart
- Targets: Direct POS API, through proxy
- Restaurants: Both 813 AND 806 fail identically

**What DID work:**
- `sub_recipe_name` maps to DB `name` column (NOT `name` — POS ignores the `name` field)
- `qty`, `ingredients`, `food_name`, `serve_people`, `prepration_time` all work

**Root cause:** `RecipeController@sub_recipes_store` (line 570 in POS backend) does not read any request field into the `unit` column. The existing 806 sub-recipes were created through a different mechanism (admin panel or direct DB), not this API.

### When Owner Says "Fixed"

1. Test with ONE recipe first:
```bash
TOKEN=$(curl -s -X POST "$API/api/proxy/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"owner@chai.com","password":"Qplazm@10","fcm_token":"central_inventory_web"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

curl -s -X POST "$API/api/proxy/v2/recipe/store-sub-recipe" \
  -H "Authorization: Bearer $TOKEN" \
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
      {"ingredient_id": 17777, "ingredient_qty": 30, "ingredient_unit": "gm"}
    ]
  }'
```

2. If `unit` field name changed, owner will tell you the new field name. Update the payload accordingly.

3. Once one works, run all 19 recipes from `CHAI_813_SEED_PLAN.md` Phase 5.3.

4. Then proceed: 5.4 (link recipes) → 6 (push) → 7 (POs) → 8 (production) → 9 (distribution) → 10 (verify).

---

## KEY GOTCHAS (SAVE YOURSELF TIME)

| # | Gotcha | Correct Approach |
|---|--------|-----------------|
| 1 | POS field names don't match what you'd expect | `vendor_name` not `name`, `category_name` not `name`, `sub_recipe_name` not `name` |
| 2 | `add-inventory` requires JSON **array** `[{...}]` | Even for single item — `{...}` alone returns validation error |
| 3 | Valid inventory units: `kg`, `ltr`, `piece` ONLY | `gm`, `ml`, `litre` are all rejected by POS unit table |
| 4 | Sub-recipe `ingredient_unit` uses `"gm"` | Per existing 806 data — different from inventory `unit` which is `"kg"` |
| 5 | `add-food` returns flat object, no `{success, data}` wrapper | Parse `id` directly from response root |
| 6 | Create outlets FROM their parent Master session | Not from Central — ensures correct `parent_restaurant_id` |
| 7 | Terminology inversion is real | `child_type:"central"` creates a Master Store, `child_type:"franchise"` creates an Outlet |

---

## ENVIRONMENT

| Item | Value |
|------|-------|
| Branch | `14-june-1` |
| Deploy URL | `https://c933daf8-92c2-4edb-a4dd-0782f6409f84.preview.emergentagent.com` |
| Backend | FastAPI proxy on port 8001 (supervisor) — DO NOT MODIFY |
| Frontend | React 19 + Craco on port 3000 (supervisor) |
| POS API | `https://preprod.mygenie.online/api/v2/vendoremployee` |
| MongoDB | localhost:27017, DB: `central_inventory` |

---

## FILE MAP

| File | What |
|------|------|
| `control/sessions/CHAI_813_SEED_PLAN.md` | **Master seed plan** — all 19 recipes, all IDs, all phases |
| `control/sessions/QA_VALIDATION_REPORT_CR030_031_032_033.md` | QA report for 4 CRs |
| `control/sessions/QA_HANDOVER_CR030_031_032_033.md` | QA test brief from implementation agent |
| `scripts/create_inventory_items_v2.py` | Script that created 42 raw materials (Phase 4) |
| `scripts/create_foods.py` | Script that created 19 foods (Phase 5.2) |
| `scripts/create_sub_recipes_v2.py` | Script that FAILED on sub-recipes (Phase 5.3) — needs fix |
| `memory/test_credentials.md` | All test accounts |
| `memory/PRD.md` | Project status summary |

---

## WHAT NOT TO DO

1. **Do NOT re-create** stores, vendors, categories, items, or foods — they already exist. Verify with API calls first.
2. **Do NOT modify `server.py`** — it's proxy-only by architecture contract.
3. **Do NOT use `gm` as inventory unit** — POS rejects it. Use `kg` for inventory, `gm` for recipe ingredients.
4. **Do NOT create outlets from Central** — parent chain will be wrong. Login as each Master.
5. **Do NOT skip the single-recipe test** before bulk-creating all 19 sub-recipes.

---

## RESUME CHECKLIST

```
□ Read this file
□ Read CHAI_813_SEED_PLAN.md
□ Confirm POS API fix for store-sub-recipe unit field
□ Test ONE sub-recipe creation
□ Bulk-create remaining 18 sub-recipes (Phase 5.3)
□ Link recipes to foods (Phase 5.4)
□ Push catalog to 14 stores (Phase 6)
□ Create 6 POs with vendor overlap + receive (Phase 7)
□ Run production for 19 recipes (Phase 8)
□ Dispatch to Masters → Outlets (Phase 9)
□ Verify intelligence on all screens (Phase 10)
```

---

*End of Handover*
