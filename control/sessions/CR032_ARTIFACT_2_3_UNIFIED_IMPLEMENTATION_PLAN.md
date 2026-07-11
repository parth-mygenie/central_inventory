# CR-032 — Unified Implementation Plan (UX Redesign + Bug Fixes)

> **Date:** 2026-06-14
> **Scope:** Store Management, Product Catalog, Stock Inventory, Pending Queues, History & Ledger
> **Replaces:** Previous Artifact 2-3 (bug-fix-only plan)
> **Estimated effort:** ~28h

---

## API Probing Results (2026-06-14)

| API | Status | Notes |
|-----|:------:|-------|
| `GET /inventory/stock-inventory?include_segments=true&segment_limit=3&include_consumption=true` | ✅ WORKS | Returns `segments_preview[]`, `consumption_summary{}` per item. **G-022 NOT NEEDED.** |
| `POST /inventory-transfer/history` | ✅ EXISTS | Need to verify if `items_count` or `lines[]` is returned. Root cause investigation for O-15. |
| `POST /inventory-transfer/pending-queues` | ✅ EXISTS | Same items-count investigation needed for O-14. |
| All Recipe/Addon Recipe CRUD APIs | ✅ EXISTS | Already in api.js: `getRecipeList`, `getRecipeDetail`, `createRecipe`, `updateRecipe`, `deleteRecipe`, `getAddonRecipes`, etc. |

---

## Files Affected

| File | Change Type | Current Lines | Estimated After | Risk |
|------|-------------|:------------:|:---------------:|:----:|
| `StoreManagement.jsx` | **FULL REWRITE** | 32 | ~600 | HIGH |
| `HierarchySummary.jsx` | UNUSED (Summary tab killed) | 249 | 249 (keep file, remove import) | LOW |
| `ProductCatalogue.jsx` | **MAJOR REWRITE** | 355 | ~800 | HIGH |
| `RecipeCatalogue.jsx` | **FULL REWRITE** (master-detail BOM) | 296 | ~500 | HIGH |
| `AddonRecipeCatalogue.jsx` | **FULL REWRITE** (master-detail BOM) | 180 | ~400 | HIGH |
| `StockInventorySummary.jsx` | **MAJOR REWRITE** (expandable rows) | 574 | ~700 | HIGH |
| `PendingQueues.jsx` | EDIT (bug fixes) | 473 | ~485 | MEDIUM |
| `HistoryLedger.jsx` | EDIT (bug fix) | 807 | ~815 | LOW |
| `App.js` | EDIT (remove orphaned redirects) | — | — | LOW |
| `services/api.js` | EDIT (update `getStockInventory` params) | 1035 | ~1050 | LOW |

---

## Phase 0: Bug Fixes First (3h) — Quick Wins

### 0.1 — Fix "0 items" (O-14, O-15) — SHARED ROOT CAUSE

**Investigation plan:**
1. Curl `POST /inventory-transfer/history` and inspect response for `items_count` or `lines[]`
2. Curl `POST /inventory-transfer/pending-queues` and inspect
3. Find where `formatItemsCount()` is called in `HistoryLedger.jsx` and `PendingQueues.jsx`
4. Fix: use `transfer.items_count || transfer.lines?.length || transfer.line_count || 0`

Files: `HistoryLedger.jsx`, `PendingQueues.jsx`, possibly `lib/formatters.js`

### 0.2 — Fix Requester Name Swap (O-13) — PendingQueues.jsx

For **request-type** transfers:
- `from_restaurant` = FULFILLER (Central Store — you)
- `to_restaurant` = REQUESTER (Outlet)

Current code shows `from → to` which reads as "german fluid → Outlet Direct One" with subtitle "german fluid requesting from you" — WRONG.

Fix logic:
```javascript
const isRequest = item.type === "request" || item.type === "modification_request";
if (isRequest) {
  headerTitle = `${toName} → ${fromName}`;        // "Outlet requesting from Central"
  subtitle = `${toName} requesting from you`;
} else {
  headerTitle = `${fromName} → ${toName}`;         // "Central dispatching to Outlet"  
  subtitle = `Dispatching to ${toName}`;
}
```

Must test from Central (806) AND Outlet (809) perspectives.

### 0.3 — Stock Inventory Quick Fixes (O-9, O-10, O-11)

- **O-10:** Remove "← Back" button from `StockInventorySummary.jsx`
- **O-9:** Fix "-0d": `const doc = Math.max(0, Math.round(calQty / dailyConsumption)); display = doc === 0 ? "—" : \`${doc}d\`;`
- **O-11:** Show `restaurantName` from `useLoginContext()` instead of "Store #806"

### 0.4 — Product Catalog Price Fix (O-8)

- Add "₹" prefix to food/addon price columns in `ProductCatalogue.jsx`

### Test checkpoint:
- History → verify items count non-zero
- Pending Queues → verify requester name correct for request-type
- Stock Inventory → no back button, no "-0d", store name shows

---

## Phase 1: Store Management — Full Rewrite (7h)

### Current → Target

| Current (32 lines wrapper + 728 HierarchyManagement + 249 HierarchySummary) | Target (~600 lines single component) |
|---|---|
| 2 tabs: Summary + Manage | **Single unified view** — no tabs |
| Summary = separate health table | Health columns (OOS/Low/OK) in main table |
| Manage = flat list with Push buttons | **Expandable rows** with full detail |
| Create Store = popup dialog | **Inline form** above table |
| No per-store stock health detail | Expanded row: stock KPIs + OOS items + push history |

### Layout Structure

```
┌──────────────────────────────────────────────────────────────────────┐
│ Store Management                                                      │
│                                                                       │
│ [All 5] [Master 3] [Outlet 2]   [Search...]         [+ Create Store] │
│                                                                       │
│ ┌── INLINE ADD FORM (when + clicked) ─────────────────────────────┐  │
│ │ Name / Type / Email / Phone / Password / Address                 │  │
│ │ [Cancel] [Create Store]                                          │  │
│ └──────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│ ┌── TABLE ─────────────────────────────────────────────────────────┐  │
│ │ Name          │Type   │Email       │Push Status│OOS│Low│OK│Push  │  │
│ │ CK Alpha      │Master │mgr@cka..  │Stale 54 🔴│10 │ 0│ 1│[Push]│  │
│ │ ▼ EXPANDED ─────────────────────────────────────────────────────│  │
│ │ │ STORE INFO            │ STOCK HEALTH        │ PUSH HISTORY    │  │
│ │ │ Email, Phone, Created │ OOS/Low/OK KPIs     │ Last 3 pushes   │  │
│ │ │ Address               │ OOS items list      │                 │  │
│ │ │ [Push Now] 54 behind  │ "Almonds 0kg, ..."  │                 │  │
│ │ └───────────────────────┴─────────────────────┴─────────────────│  │
│ │ CK Beta       │Master │mgr@ckb..  │Stale 57 🔴│11 │ 0│ 0│[Push]│  │
│ └──────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### Implementation Steps

**1.1 — Rewrite `StoreManagement.jsx`** (currently 32-line wrapper → ~600 lines)

Absorb the functionality from `HierarchyManagement.jsx` into a single component with Pattern B (expandable rows). DO NOT import HierarchySummary anymore.

State:
- `children[]` (from `getHierarchyList`)
- `loading`, `error`
- `typeFilter` ("all" | "master" | "outlet")
- `search`
- `showAddForm` (boolean)
- `expandedChildId` (which store's detail is expanded)
- `childHealth{}` (per-store: OOS/Low/OK counts from `getHierarchyDetail`)
- `childPushForm{}` (per-store: push status from `getPushForm`)
- `childPushHistory[]` (from `getHierarchyHistory`)

On mount:
1. `api.getHierarchyList({ limit: 25 })` → children list
2. For each child (batch): `api.getHierarchyDetail({ storeRestaurantId: child.id })` → compute OOS/Low/OK counts for table columns

On row expand:
1. `api.getPushForm(childId)` → push status + items behind count
2. `api.getHierarchyHistory()` → push history (filter by child, last 3)

**1.2 — Table columns:**
- Name (bold)
- Type (badge: "Master" orange / "Outlet" blue)
- Email
- Push Status: "Stale — X behind" (red) / "Synced" (green) / "—"
- OOS (red number), Low (amber number), OK (green number)
- Push action button (if stale)

**1.3 — Type filter pills:**
- "All (5)" / "Master (3)" / "Outlet (2)" — filter table

**1.4 — Inline Add Form:**
- Shown when "+ Create Store" clicked. Green left border card above table.
- Fields: Name, Type (Master/Outlet dropdown), Email, Phone, Password, Address
- "Cancel" hides form. "Create Store" calls `api.createHierarchyChild(payload)`.
- On success: toast, form hides, reload list

**1.5 — Expanded Row Detail:**
- **Left:** Store info (email, phone, created, address) + "Push Now" button with "X items behind"
- **Middle:** Stock Health KPIs (3 cards: OOS red, Low amber, OK green) + OOS items mini list (max 5, "+X more")
- **Right:** Push History (last 3: date, items pushed, status)

**1.6 — `HierarchySummary.jsx` becomes unused**
- Remove import from `StoreManagement.jsx`
- Keep file in codebase (don't delete — may be useful later)
- Update `L7_FILE_OWNERSHIP.md`: note as "orphaned, not deleted"

### Test checkpoint:
- Login as Central (806) → /store-management → single unified view (no tabs)
- Table shows OOS/Low/OK columns
- Type filter works
- Click store → expand → stock health + push history
- Push Now → pushes + reloads
- Create Store → inline form → create → appears in table

---

## Phase 2: Product Catalog — Add Recipe + Addon Recipe Tabs (8h)

### Current → Target

| Current (355 lines, 3 tabs) | Target (~800 lines, 5 tabs) |
|---|---|
| Foods, Categories, Addons | + **Recipes** (master-detail BOM editor) + **Addon Recipes** (same) |
| RecipeCatalogue.jsx orphaned | Integrated as Tab 3 |
| AddonRecipeCatalogue.jsx orphaned | Integrated as Tab 5 |
| No sub-recipe visibility in recipes | Purple/green BOM sections with expandable sub-recipe tree |
| No cost breakdown | Total recipe cost = sub-recipe cost + direct cost |

### Tab Layout
```
[ Foods | Food Categories | Recipes | Addons | Addon Recipes ]
```

### Implementation Steps

**2.1 — Add tabs to `ProductCatalogue.jsx`**
- Add `TabsTrigger` for "Recipes" and "Addon Recipes"
- Import rewritten `RecipeTab` and `AddonRecipeTab` components
- Keep Foods, Categories, Addons tabs untouched
- Fix O-8: add "₹" prefix to food/addon prices

**2.2 — Rewrite `RecipeCatalogue.jsx` as master-detail BOM editor**

The current RecipeCatalogue is a simple table. Rewrite as:

```
┌──────────────────┬──────────────────────────────────────────────┐
│ RECIPES (35%)     │ RECIPE DETAIL (65%)                          │
│                   │                                               │
│ [Search...]       │ Recipe: Whole Wheat Elachi Cookies [Delete]  │
│ [+ Add Recipe]    │                                               │
│                   │ ┌─ Form ──────────────────────────────────┐  │
│ ┌──────────────┐  │ │ Linked Food: [dropdown]                 │  │
│ │ coffe        │  │ │ Prep Time: [30] Serves: [1]             │  │
│ │ 2 ing, 0 sub │  │ │ Output: [1] [piece ▾]                   │  │
│ ├──────────────┤  │ └─────────────────────────────────────────┘  │
│ │▶ whole wheat │  │                                               │
│ │  elachi  ◄───│  │ ┌─ BILL OF MATERIALS ─────────────────────┐  │
│ │ 1 ing, 1 sub │  │ │ ▐ SUB-RECIPES (purple border)           │  │
│ └──────────────┘  │ │ │ ▼ Elachi Cookie Dough × 1 batch       │  │
│                   │ │ │   ├── Wheat Flour    200 gm            │  │
│                   │ │ │   ├── Jaggery        100 gm            │  │
│                   │ │ │   └── Elachi         5 gm              │  │
│                   │ │ │ [+ Add Sub-Recipe]                     │  │
│                   │ │ │                                         │  │
│                   │ │ ▐ DIRECT INGREDIENTS (green border)      │  │
│                   │ │ │ Milk  50 ml                            │  │
│                   │ │ │ [+ Add Ingredient]                     │  │
│                   │ │ └────────────────────────────────────────┘  │
│                   │ │                                               │
│                   │ │ ┌─ COST BREAKDOWN ──────────────────────┐  │
│                   │ │ │ Sub-Recipe Cost: ₹45                   │  │
│                   │ │ │ Direct Ingredients: ₹2                 │  │
│                   │ │ │ Total: ₹47/piece                       │  │
│                   │ │ └────────────────────────────────────────┘  │
│                   │ │ [Save Changes]                              │
└──────────────────┴──────────────────────────────────────────────┘
```

Key features:
- **Sub-recipe detection:** Build map `subRecipeMap[inventory_id] → subRecipe`. When displaying recipe ingredients: `ingredient.isSubRecipe = !!subRecipeMap[ingredient.ingredient_id]`
- **Purple section (sub-recipes):** Expandable rows. Each shows sub-recipe name + qty + unit. Expand → shows child ingredients (read-only from sub-recipe data).
- **Green section (direct ingredients):** Editable rows: ingredient dropdown + qty + unit + remove
- **Unified picker dropdown:** Two sections: "SUB-RECIPES (4)" and "RAW MATERIALS (47)". Pick sub-recipe → purple section. Pick raw material → green section.
- **Cost breakdown:** Sub-recipe cost (from segment unit_cost × qty per ingredient) + direct cost = total ₹/unit
- **CRUD:** Create, Update, Delete recipes via existing API methods

Data on mount:
1. `api.getRecipeList()` → recipe list
2. `api.getSubRecipeList()` → for sub-recipe detection + picker
3. `api.getInventoryMaster()` → for ingredient picker
4. `api.getFoodsList()` → for "Linked Food" dropdown
5. `api.getStockInventory({ includeSegments: true })` → for cost calculation

On recipe select: `api.getRecipeDetail(id)` → full recipe with ingredients

**2.3 — Rewrite `AddonRecipeCatalogue.jsx` as master-detail BOM editor**

Same pattern as Recipes tab, but:
- Linked to Addon (from `getAddonList()`) instead of Food
- List from `getAddonRecipes()`
- CRUD: `createAddonRecipe`, `updateAddonRecipe`, `deleteAddonRecipe`
- Extra: "Addons without recipe" section from `getAddonsWithoutRecipe()`

### Test checkpoint:
- Product Catalog → all 5 tabs render
- Recipes tab → master-detail layout, select recipe, see BOM with purple/green sections
- Expand sub-recipe → shows child ingredients
- Cost breakdown shows values
- Create/edit/delete recipe works
- Foods/Categories/Addons tabs unaffected (regression)

---

## Phase 3: Stock Inventory — Expandable Rows (6h)

### Current → Target

| Current (574 lines) | Target (~700 lines) |
|---|---|
| Click row → navigate to `/inventory/:id` | **Click row → expand inline** (segments + consumption + actions) |
| "← Back" button | Removed |
| "Store #806" | Store name from login context |
| "-0d" display bug | Fixed to "—" |

### Implementation Steps

**3.1 — Update `getStockInventory()` call** to include segments + consumption

In `useStockInventory.js` or `StockInventorySummary.jsx`:
```javascript
api.getStockInventory({ includeSegments: true, segmentLimit: 5, includeConsumption: true })
```

This returns `segments_preview[]` and `consumption_summary{}` per item — **no N+1 calls needed**.

**3.2 — Add expandable row behavior**

State: `expandedItemId`

Click row → toggle expand. Expanded section has 3 columns:

**Left: FEFO Segments**
- Table: Batch, Expiry (with "Expiring Soon" amber badge if <14d), Qty, Unit Cost
- Top 5 segments (from `segments_preview`), FEFO order
- Expired: red strikethrough
- If more: "+ X more" → link to `/inventory/:id` (full detail)

**Middle: Consumption**
- Daily Rate: `consumption_summary.total_consumed_cal / date_range_days` → "X gm/day"
- 7-Day Total: `consumption_summary.total_consumed_cal` → "X gm"
- Days of Cover: `cal_quantity / daily_rate` → "76 days" green/amber/red

**Right: Quick Actions**
- "Record Wastage" → `/wastage/new?item={id}`
- "Dispatch" → `/dispatch/new?item={id}`
- "Adjust Stock" → `/adjustment/new?item={id}`
- "View Full Detail →" → `/inventory/{id}` (existing StockDetailPanel)

**3.3 — Apply bug fixes (already in Phase 0)**

O-9, O-10, O-11 are done in Phase 0.

### Test checkpoint:
- Stock Inventory loads with segments data
- Click row → expand → FEFO segments + consumption + quick actions
- Quick action buttons navigate correctly
- "View Full Detail" goes to existing detail page
- No "-0d", no back button, store name correct

---

## Implementation Order

| Order | Phase | Screen | Effort | Risk |
|:-----:|-------|--------|:------:|:----:|
| 1 | Phase 0 | Bug fixes (O-13, O-14, O-15, O-9, O-10, O-11, O-8) | 3h | MEDIUM |
| 2 | Phase 1 | StoreManagement.jsx full rewrite | 7h | HIGH |
| 3 | Phase 2 | ProductCatalogue + RecipeCatalogue + AddonRecipeCatalogue | 8h | HIGH |
| 4 | Phase 3 | StockInventorySummary.jsx expandable rows | 6h | HIGH |

**Total estimated: ~24h** (reduced from 28h — some work overlaps with CR-030 Phase 0)

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|:-----------:|:------:|------------|
| Store Management rewrite breaks existing CRUD | MEDIUM | HIGH | Keep `createHierarchyChild` and `pushBundle` calls identical. Test create + push flows. |
| Recipe BOM editor too complex | MEDIUM | MEDIUM | Start with read-only BOM display, then add editing. Sub-recipe expansion is read-only (from sub-recipe data). |
| Stock Inventory segments increase page load time | LOW | LOW | API confirmed fast (<2s for 48 items with segments). |
| Items count fix requires N+1 calls | MEDIUM | MEDIUM | Investigate API response first. Prefer using existing field over per-transfer detail calls. |
| Requester name fix breaks dispatch-type cards | MEDIUM | HIGH | Test both request-type AND dispatch-type from both Central AND Outlet perspectives. |

---

## Dependencies

| Dependency | Status | Impact |
|-----------|:------:|--------|
| `stock-inventory` with segments+consumption | ✅ CONFIRMED | Phase 3 expandable rows |
| Recipe/Addon Recipe CRUD APIs | ✅ IN api.js | Phase 2 tabs |
| `getSubRecipeList()` | ✅ EXISTS | Phase 2 sub-recipe detection |
| `getHierarchyDetail()` per child | ✅ EXISTS | Phase 1 health columns |
| G-022 (aggregated stock endpoint) | ✅ NOT NEEDED | API already supports params |

---

## Files Created / Modified / Orphaned

| Action | File | Reason |
|--------|------|--------|
| REWRITE | `StoreManagement.jsx` | Single unified view replaces tab wrapper |
| ORPHAN | `HierarchySummary.jsx` | Summary tab killed; keep file, remove import |
| REWRITE | `ProductCatalogue.jsx` | 5 tabs, Recipe/Addon tabs added |
| REWRITE | `RecipeCatalogue.jsx` | Master-detail BOM editor |
| REWRITE | `AddonRecipeCatalogue.jsx` | Master-detail BOM editor |
| REWRITE | `StockInventorySummary.jsx` | Expandable rows |
| EDIT | `PendingQueues.jsx` | Requester name fix + items count fix |
| EDIT | `HistoryLedger.jsx` | Items count fix |
| EDIT | `App.js` | Remove orphaned redirect routes |
| EDIT | `services/api.js` | Update `getStockInventory` params |

---

## Governance Updates Required

1. `control/registry.json` — update CR-032 artifact refs, status to IN_PROGRESS
2. `control/L1_CONTROL_DASHBOARD.md` — note Summary tab killed
3. `control/L7_FILE_OWNERSHIP.md` — HierarchySummary.jsx orphaned, StoreManagement.jsx rewritten
4. `control/L9_OPEN_GAPS_REGISTER.md` — G-022 marked NOT NEEDED
5. `node control/gen_dashboard_data.js` — regenerate

---

*This plan supersedes the previous Artifact 2-3 (bug-fix-only plan). Implementation proceeds against UX freeze specs.*
