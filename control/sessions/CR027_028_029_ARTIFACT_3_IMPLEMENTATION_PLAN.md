# CR-027 / CR-028 / CR-029 — Implementation Plan (Artifact 3)

> **CRs:** CR-027 (Nav Restructure), CR-028 (Product Catalog), CR-029 (Stock Inventory Split)
> **Date:** 2026-06-13
> **Author:** E1 agent
> **Mock Freeze:** CR-027 navigation mock FROZEN 2026-06-13
> **Depends on:** Artifact 2 (Impact Analysis) — all questions resolved

---

## 1. Execution Order

```
CR-027 (Nav Restructure) — MUST go first
  Step 1: screenVisibility.js — new screen IDs + section-aware NAV_ITEMS
  Step 2: Sidebar.jsx — collapsible section grouping
  Step 3: App.js — route changes + redirects + new imports
  Step 4: OperationsHub.jsx — Quick Action label/path updates
  Step 5: Extract SubRecipeMaster.jsx from RecipeCatalogue.jsx
  Step 6: Merge HierarchySummary into HierarchyManagement → StoreManagement
    ↓
CR-029 (Stock Inventory Split) — independent, quick
  Step 7: useStockInventory.js — add stockType filter
  Step 8: StockInventorySummary.jsx — tab bar (FG / Raw / All)
    ↓
CR-028 (Product Catalog) — largest, last
  Step 9: ProductCatalogEditor.jsx — full rewrite with bulk editor
  Step 10: Absorb Recipe + Addon into Product Catalog
  Step 11: Delete old files (RecipeCatalogue.jsx, AddonRecipeCatalogue.jsx)
```

---

## 2. CR-027 — Navigation Restructure

### Step 1: screenVisibility.js (FROZEN — owner-approved change)

**Add new screen IDs:**
```js
"scr-raw-material-master": { master: FULL, central: HIDDEN, franchise: HIDDEN },
"scr-product-catalog":     { master: FULL, central: HIDDEN, franchise: HIDDEN },
"scr-sub-recipe-master":   { master: FULL, central: HIDDEN, franchise: HIDDEN },
"scr-purchase":            { master: FULL, central: FULL,   franchise: HIDDEN },
"scr-vendor-management":   { master: FULL, central: FULL,   franchise: HIDDEN },
"scr-store-management":    { master: FULL, central: FULL,   franchise: HIDDEN },
"scr-wastage-report":      { master: FULL, central: FULL,   franchise: FULL  },
```

**Replace flat NAV_ITEMS with section-aware structure:**
```js
export const NAV_SECTIONS = [
  {
    id: "dashboard",
    label: "Dashboard",
    items: [
      { id: "operations-hub", screen: "scr-01-operations-hub", label: "Operations Hub", path: "/", icon: "LayoutDashboard" },
    ],
  },
  {
    id: "inward",
    label: "Inward",
    items: [
      { id: "vendor-management", screen: "scr-vendor-management", label: "Vendor Management", path: "/vendor-management", icon: "Building2" },
      { id: "raw-material-master", screen: "scr-raw-material-master", label: "Raw Material Master", path: "/raw-materials", icon: "Beaker" },
      { id: "purchase", screen: "scr-purchase", label: "Purchase", path: "/purchase", icon: "ShoppingCart" },
    ],
  },
  {
    id: "production",
    label: "Production",
    items: [
      { id: "sub-recipe-master", screen: "scr-sub-recipe-master", label: "Sub-Recipe Master", path: "/sub-recipe-master", icon: "BookOpen" },
      { id: "production", screen: "scr-production", label: "Run Production", path: "/production/new", icon: "Factory" },
      { id: "production-history", screen: "scr-production", label: "Production History", path: "/production/history", icon: "ClipboardList" },
    ],
  },
  {
    id: "outward",
    label: "Outward",
    items: [
      { id: "store-management", screen: "scr-store-management", label: "Store Management", path: "/store-management", icon: "GitBranch" },
      { id: "product-catalog", screen: "scr-product-catalog", label: "Product Catalog", path: "/product-catalog", icon: "UtensilsCrossed" },
      { id: "stock-inventory", screen: "scr-stock-inventory", label: "Stock Inventory", path: "/inventory", icon: "Package" },
      { id: "pending-queues", screen: "scr-05-pending-queues", label: "Pending Queues", path: "/queues", icon: "Inbox" },
      { id: "history-ledger", screen: "scr-history-ledger", label: "History & Ledger", path: "/history", icon: "ScrollText" },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    items: [
      { id: "consumption-report", screen: "scr-consumption-report", label: "Consumption Report", path: "/reports/consumption", icon: "BarChart3" },
      { id: "wastage-report", screen: "scr-wastage-report", label: "Wastage Report", path: "/wastage/report", icon: "TrendingDown" },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    items: [
      { id: "settings", screen: "scr-settings", label: "Settings", path: "/settings", icon: "Settings" },
    ],
  },
];
```

**Keep old NAV_ITEMS export as derived (backwards compat):**
```js
// Flatten sections for any code using old NAV_ITEMS
export const NAV_ITEMS = NAV_SECTIONS.flatMap(s => s.items);
```

**Update getVisibleNavItems → getVisibleNavSections:**
```js
export function getVisibleNavSections(restaurantType) {
  return NAV_SECTIONS.map(section => ({
    ...section,
    items: section.items.filter(item => canAccessScreen(item.screen, restaurantType)),
  })).filter(section => section.items.length > 0);
}
```

### Step 2: Sidebar.jsx — Collapsible Sections

**Rewrite (~180 lines):**
- Import `ChevronDown` from lucide + add `ShoppingCart`, `TrendingDown` to ICON_MAP
- Replace flat `visibleNav.map()` with `visibleNavSections.map()` 
- Each section: header with label + chevron toggle + collapsible item list
- Collapse state in `useState` with localStorage persistence
- Auto-expand section containing active route
- When sidebar is icon-only (collapsed mode): hide section headers, show only icons

**Key data-testids:**
```
data-testid="nav-section-{sectionId}"        → section header
data-testid="nav-section-{sectionId}-toggle"  → collapse toggle
data-testid="nav-{itemId}"                    → nav items (unchanged)
```

### Step 3: App.js — Routes + Redirects

**Add imports:**
```js
import SubRecipeMaster from "@/components/central-inventory/SubRecipeMaster";
import StoreManagement from "@/components/central-inventory/StoreManagement";
// ProductCatalogEditor — added in CR-028 step
```

**Change routes:**
```jsx
// New routes
<Route path="/vendor-management" element={<VendorManagement />} />
<Route path="/raw-materials" element={<IngredientCatalogue />} />
<Route path="/purchase" element={<AddStockPurchaseForm />} />
<Route path="/sub-recipe-master" element={<SubRecipeMaster />} />
<Route path="/store-management" element={<StoreManagement />} />
<Route path="/product-catalog" element={<ProductCatalogue />} />  // CR-028 replaces component

// Redirects (old → new)
<Route path="/vendors" element={<Navigate to="/vendor-management" replace />} />
<Route path="/catalogue/ingredients" element={<Navigate to="/raw-materials" replace />} />
<Route path="/catalogue/products" element={<Navigate to="/product-catalog" replace />} />
<Route path="/catalogue/recipes" element={<Navigate to="/product-catalog" replace />} />
<Route path="/catalogue/addon-recipes" element={<Navigate to="/product-catalog" replace />} />
<Route path="/procurement/new" element={<Navigate to="/purchase" replace />} />
<Route path="/hierarchy" element={<Navigate to="/store-management" replace />} />
<Route path="/hierarchy/manage" element={<Navigate to="/store-management" replace />} />

// Remove old direct routes
// (removed: /vendors, /catalogue/*, /procurement/new, /hierarchy, /hierarchy/manage)
```

### Step 4: OperationsHub.jsx — Quick Action Updates

```
"Add Stock (Vendor)" → "Purchase"
navigate("/procurement/new") → navigate("/purchase")
navigate("/hierarchy") → navigate("/store-management")
```

3 string/path changes, 0 logic changes.

### Step 5: Extract SubRecipeMaster.jsx

**Source:** `RecipeCatalogue.jsx` lines 190-296 (SubRecipesTab + SubRecipeFormDialog)

**New file:** `components/central-inventory/SubRecipeMaster.jsx` (~150 lines)
- Extract `SubRecipesTab` function → make it the default export with page wrapper
- Extract `SubRecipeFormDialog` function → keep as internal component
- Add page header with icon + title "Sub-Recipe Master"
- Add search bar (not present in current sub-recipes tab)
- Keep `IngredientComposer` import

### Step 6: StoreManagement — Merge HierarchySummary

**Current state:**
- `HierarchySummary.jsx` (250 lines) — store health overview with tabs (Master Stores / Outlets)
- `HierarchyManagement.jsx` (729 lines) — CRUD for stores + push bundles + history

**New file:** `StoreManagement.jsx` (~800 lines)
- Rename `HierarchyManagement.jsx` → `StoreManagement.jsx`
- Add a "Summary" tab at the top that renders `HierarchySummary` content
- Tabs: **Summary** | **Manage Stores** | **Push History**
- Summary tab = current HierarchySummary (store health grid)
- Manage Stores tab = current HierarchyManagement main content
- Push History tab = current HierarchyManagement history section

**Alternative (simpler):** Keep both components, but `StoreManagement.jsx` is a thin wrapper:
```jsx
export default function StoreManagement() {
  return (
    <Tabs defaultValue="manage">
      <TabsList>
        <TabsTrigger value="summary">Summary</TabsTrigger>
        <TabsTrigger value="manage">Manage Stores</TabsTrigger>
      </TabsList>
      <TabsContent value="summary"><HierarchySummary /></TabsContent>
      <TabsContent value="manage"><HierarchyManagement /></TabsContent>
    </Tabs>
  );
}
```
This is **lower risk** — reuses existing components without rewriting 979 combined lines.

---

## 3. CR-029 — Stock Inventory Split

### Step 7: useStockInventory.js — Add Stock Type Filter

Add to hook:
```js
const [stockType, setStockType] = useState("all"); // "all" | "fg" | "raw"

// Filter stocks by type
const filteredStocks = useMemo(() => {
  if (stockType === "fg") return stocks.filter(s => s.type === "SubRecipe" || s.is_sub_recipe === true);
  if (stockType === "raw") return stocks.filter(s => s.type === "inventory" && !s.is_sub_recipe);
  return stocks;
}, [stocks, stockType]);

// Per-type counts
const fgCount = stocks.filter(s => s.type === "SubRecipe" || s.is_sub_recipe === true).length;
const rawCount = stocks.filter(s => s.type === "inventory" && !s.is_sub_recipe).length;
```

Return: `stockType, setStockType, filteredStocks, fgCount, rawCount`

### Step 8: StockInventorySummary.jsx — Tab Bar

Add tab bar above KPI cards:
```jsx
<Tabs value={stockType} onValueChange={setStockType}>
  <TabsList>
    <TabsTrigger value="all">All ({totalItems})</TabsTrigger>
    <TabsTrigger value="fg">Finished Goods ({fgCount})</TabsTrigger>
    <TabsTrigger value="raw">Raw Materials ({rawCount})</TabsTrigger>
  </TabsList>
</Tabs>
```

KPIs recalculate based on `filteredStocks`. Table renders `filteredStocks` instead of `stocks`.

~30 lines added, 0 lines deleted.

---

## 4. CR-028 — Product Catalog Overhaul (Deferred Detail)

### Step 9-11: Full Rewrite

CR-028 is the largest change (~600-800 line new component). Implementation plan will be detailed when we pick it up. Key decisions already locked:

- **Excel-like grid** with inline cell editing
- **Mandatory category** — validation + pre-picker on new row
- **Grouped by category** — collapsible category sections
- **Recipe/Addon inline** — expand row to see linked recipe + addons
- **Column toggles** — show/hide columns
- **Export CSV** — download product list
- **Import** — PARKED for now
- **Bulk save** — PARKED (single-item saves with progress)

---

## 5. Testing Strategy

### CR-027 Tests

| # | Test | Method |
|---|------|--------|
| T1 | All 6 sidebar sections render with correct items | Screenshot |
| T2 | Section collapse/expand works | Screenshot |
| T3 | Active page auto-expands its section | Screenshot |
| T4 | Old routes redirect to new routes (8 redirects) | Curl + navigate |
| T5 | All 3 roles see correct nav items (Central/Master/Franchise) | Screenshot per role |
| T6 | Sub-Recipe Master page loads at /sub-recipe-master | Screenshot |
| T7 | Store Management shows Summary + Manage tabs | Screenshot |
| T8 | OperationsHub Quick Actions use new paths | Screenshot |

### CR-029 Tests

| # | Test | Method |
|---|------|--------|
| T9 | Stock Inventory shows 3 tabs: All / FG / Raw | Screenshot |
| T10 | FG tab shows only SubRecipe items | Screenshot |
| T11 | Raw tab shows only inventory items | Screenshot |
| T12 | KPIs update per tab | Screenshot |

---

## 6. File Change Summary

| # | File | CR | Action | Lines |
|---|------|:---:|--------|:-----:|
| 1 | `lib/screenVisibility.js` | 027 | MODIFY — add screens, replace NAV_ITEMS with NAV_SECTIONS | ~204→280 |
| 2 | `components/layout/Sidebar.jsx` | 027 | REWRITE — collapsible sections | ~114→180 |
| 3 | `App.js` | 027 | MODIFY — routes + redirects | ~122→145 |
| 4 | `OperationsHub.jsx` | 027 | MODIFY — 3 string changes | ~565 (minor) |
| 5 | `SubRecipeMaster.jsx` | 027 | CREATE — extracted from RecipeCatalogue | ~150 new |
| 6 | `StoreManagement.jsx` | 027 | CREATE — wrapper over HierarchySummary + HierarchyManagement | ~40 new |
| 7 | `hooks/useStockInventory.js` | 029 | MODIFY — add stockType filter | ~82→100 |
| 8 | `StockInventorySummary.jsx` | 029 | MODIFY — add tab bar | ~547→580 |
| 9 | `ProductCatalogEditor.jsx` | 028 | CREATE — full rewrite (future) | ~600-800 new |
| 10 | `RecipeCatalogue.jsx` | 028 | DELETE (after extraction) | -296 |
| 11 | `AddonRecipeCatalogue.jsx` | 028 | DELETE (after absorption) | -181 |
| 12 | `hooks/useLoginContext.js` | 027 | MODIFY — add `visibleNavSections` | ~196→205 |

**Net: +750-950 new lines, -477 deleted, ~8 files modified**

---

## 7. Rollback Plan

All changes are additive or have redirects. Rollback = revert to flat NAV_ITEMS, restore old route paths, restore deleted components.

| Risk | Rollback |
|------|----------|
| Sidebar sections break | Revert Sidebar.jsx to flat nav rendering |
| Route redirects loop | Remove redirect routes, restore old direct routes |
| SubRecipeMaster missing features | Restore RecipeCatalogue.jsx, add nav item back |
| StoreManagement tabs broken | Restore separate HierarchySummary + HierarchyManagement nav items |

---

*Implementation plan complete. Pending: owner approval for CR-027 (frozen file change to screenVisibility.js), then proceed to implementation.*
