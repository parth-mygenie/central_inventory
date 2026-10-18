# Investigation Report — Raw Materials Not Showing After Pull

> **Date:** 2026-07-16  
> **Agent Role:** INVESTIGATION  
> **Issue:** Raw Material Master page shows "No Ingredients" on palm collection (812, master) after reverse pull from The Palm House (541, franchise)  
> **Accounts:** `captain@palmcollection.com` (master, RID 812) / `owner@palmhouse.com` (franchise, RID 541)

---

## Root Cause Classification

| Category | Action |
|----------|--------|
| **Backend gap (API behavior)** | POS reverse-push API completed partially — pulled `ingredients` but not `stock_items`. Reverse-push-form incorrectly reported 0 items for stock_items/stock_item_categories. |

---

## Investigation Steps

### Step 1: Login & Verify Hierarchy
- palm collection (RID 812, master) — parent
- The Palm House (RID 541, franchise, parent: 812) — child

### Step 2: API Probes

| Endpoint | Master (812) | Franchise (541) |
|----------|:------------:|:---------------:|
| `get-inventory-master` | **55 items** (46 from pull + 9 pre-existing) | 46 items |
| `stock-inventory` (current_stocks) | **Only 13 items** (all "Premium" category) | 46 items (all "BAR") |
| `stock-item-categories` | 1 category ("Premium") | 2 categories ("veggie", "BAR") |

**Key finding:** Inventory master had 55 items (pull worked for definitions), but stock-inventory only had 13 items. The 46 pulled items from franchise had NO stock records.

### Step 3: Frontend Code Trace

`IngredientCatalogue.jsx` → `IngredientsTab` (line 407):
```javascript
api.getStockInventory()  // ← uses stock-inventory, NOT get-inventory-master
```
- Returns `current_stocks` — only items WITH stock entries appear
- The 46 pulled items had no stock entries → they don't appear

### Step 4: Reverse-Push-Form Analysis

The form for pulling from 541 showed:
```
stock_item_categories: 0 to pull  ← INCORRECT — franchise had 2 categories not on master
stock_items: 0 to pull            ← INCORRECT — 46 stock items existed on franchise
ingredients: 46 to pull           ← correct
```

This reveals the form endpoint had a bug/inconsistency — it reported 0 items to pull for stock-related modules, even though they hadn't been synced.

### Step 5: Re-Pull Execution

Running `POST /franchise/reverse-push/from/541` again produced:

| Module | Inserted | Updated | Failed |
|--------|----------|---------|--------|
| categories | 0 | 48 | 0 |
| **stock_item_categories** | **2** | 0 | 0 |
| addons | 0 | 41 | 0 |
| ingredients | 0 | 46 | 0 |
| **stock_items** | **45** | 0 | 0 |
| foods | 0 | 473 | 0 |
| recipes | 0 | 47 | 0 |

**The re-pull successfully created the missing stock records!**

### Step 6: Post-Fix Verification

After re-pull:
- Stock inventory: **59 items** (46 BAR + 13 Premium)
- Stock item categories: **3** (Premium, veggie, BAR)
- Raw Material Master page: **Shows all 59 ingredients** ✅

---

## Root Cause

The initial reverse pull was **incomplete**. The POS API's reverse-push endpoint pulled `ingredients` (inventory_master definitions) but failed to create `stock_items` (stock inventory records) and `stock_item_categories` during the first execution.

**Most likely cause:** The first pull may have been executed with module filtering (only certain modules selected), OR the POS API had a dependency ordering issue where `stock_items` couldn't be created without `stock_item_categories` being present first. The franchise's items were in the "BAR" category which didn't exist on the master — the stock_item_categories pull may have silently failed or been skipped.

The reverse-push-form endpoint also incorrectly showed `stock_item_categories: 0` and `stock_items: 0` to pull, which was misleading — these items had NOT been synced yet.

---

## Resolution

**Action taken:** Executed a full reverse pull (all modules, no filtering) from franchise 541:
```
POST /api/proxy/v2/franchise/reverse-push/from/541
Body: { "push_food_bundle": true, "enforce_child_lock": false }
```

**Result:** 2 stock_item_categories + 45 stock_items created. Raw Material Master now shows all 59 ingredients.

---

## Recommendation

1. **For future pulls:** Always ensure "leave all unchecked" (pull everything) when doing reverse pulls. Do NOT selectively pick modules, as stock_items depend on stock_item_categories being present.

2. **POS API concern:** The reverse-push-form endpoint incorrectly reported 0 items for stock_items/stock_item_categories even though they weren't synced. This is a backend gap worth filing.

3. **Frontend consideration:** The Raw Material Master page uses `getStockInventory()` not `getInventoryMaster()`. Items exist in the inventory master but don't appear until stock records are created. This is by design (you can't manage stock without stock records), but it can be confusing when a pull is incomplete.
