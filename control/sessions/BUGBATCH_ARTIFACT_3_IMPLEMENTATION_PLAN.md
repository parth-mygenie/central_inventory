# Deep Implementation Plan — BUG-B through BUG-H (7 items)

> **Date:** 2026-06-14
> **Artifact:** 3 — Implementation Plan (Deep)
> **BUG-A:** DEFERRED (backend G-023)
> **Estimated total:** ~2.5 hours

---

## PHASE 1: BUG-F — DollarSign → IndianRupee (5 min)

### File 1: `ProductionRunForm.jsx`

**Line 22:** Change import
```diff
-  DollarSign,
+  IndianRupee,
```

**Line 438:** Change usage
```diff
-  <DollarSign className="h-4 w-4 text-muted-foreground" />
+  <IndianRupee className="h-4 w-4 text-muted-foreground" />
```

### File 2: `ProductionHistory.jsx`

**Line 11:** Change import
```diff
-  Calendar, Hash, DollarSign, Layers, ShieldX, TrendingUp,
+  Calendar, Hash, IndianRupee, Layers, ShieldX, TrendingUp,
```

**Lines 199, 202:** Change usage (2 occurrences)
```diff
-  <InfoCell icon={DollarSign} label="Unit Cost" ...
+  <InfoCell icon={IndianRupee} label="Unit Cost" ...
-  <InfoCell icon={DollarSign} label="Total Cost" ...
+  <InfoCell icon={IndianRupee} label="Total Cost" ...
```

### File 3: `SubRecipeMaster.jsx`

**Line 13:** Change import
```diff
-  import { Search, Plus, Trash2, Loader2, BookOpen, RefreshCw, DollarSign, Calendar, Package, X } from "lucide-react";
+  import { Search, Plus, Trash2, Loader2, BookOpen, RefreshCw, IndianRupee, Calendar, Package, X } from "lucide-react";
```

**Line 405:** Change usage
```diff
-  <DollarSign className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
+  <IndianRupee className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
```

### File 4: `RecipeCatalogue.jsx`

**Line 12:** Change import
```diff
-  import { Search, Plus, Trash2, Loader2, BookOpen, ChevronDown, ChevronRight, X, DollarSign } from "lucide-react";
+  import { Search, Plus, Trash2, Loader2, BookOpen, ChevronDown, ChevronRight, X, IndianRupee } from "lucide-react";
```

Search for `DollarSign` usage in the file. If used in JSX, replace with `IndianRupee`. If import-only (unused), just fix the import.

### QA
| # | Test | Pass |
|---|------|------|
| F1 | Production Run Form → cost summary card shows ₹ icon (not $) | ₹ icon visible |
| F2 | Production History → Unit Cost and Total Cost cards show ₹ icon | ₹ icon visible |
| F3 | Sub-Recipe Master → intelligence cost card shows ₹ icon | ₹ icon visible |

---

## PHASE 1: BUG-D — Remove Adjust Stock Card (5 min)

### File: `OperationsHub.jsx`

**Delete lines 456–463** (the entire `canDo("adjust-stock")` block):

```jsx
// DELETE THIS BLOCK:
              {canDo("adjust-stock") && (
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/adjustment/new")}>
                  <CardContent className="py-3 px-4">
                    <p className="text-xs font-semibold" data-testid="qa-adjust">Adjust Stock</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Correct quantities</p>
                  </CardContent>
                </Card>
              )}
```

**No other file changes.** Route `/adjustment/new` and `StockAdjustmentForm.jsx` stay on disk (dormant).

### QA
| # | Test | Pass |
|---|------|------|
| D1 | Operations Hub → Quick Actions → no "Adjust Stock" card | Card absent |
| D2 | Other Quick Action cards still render (Purchase, Run Production, Request Stock, Record Wastage, Wastage Report) | All present |

---

## PHASE 2: BUG-C — Wire useRestaurantMap into StoreDetail (15 min)

### File: `StoreDetail.jsx`

**Step 1: Add import (after line 5)**
```jsx
import { useRestaurantMap } from "@/hooks/useRestaurantMap";
```

**Step 2: Call hook (after line 33, inside component)**
```jsx
const { restaurantMap } = useRestaurantMap();
```

**Step 3: Add resolver helper (after line 80, before the return)**
```jsx
const resolveStore = (id, apiType, apiName) => {
  const mapped = restaurantMap[String(id)];
  const displayType = mapRestaurantType(mapped?.type || apiType);
  const displayName = mapped?.name || apiName;
  if (!displayName || displayName === "—") {
    return id ? `${displayType} #${id}` : "—";
  }
  return `${displayType}: ${displayName}`;
};
```

**Step 4: Replace lines 302-303**

Current:
```jsx
<TableCell className="text-xs">{mapRestaurantType(txn.from_restaurant_type)}: {txn.from_restaurant_name || "—"}</TableCell>
<TableCell className="text-xs">{mapRestaurantType(txn.to_restaurant_type)}: {txn.to_restaurant_name || "—"}</TableCell>
```

Replace with:
```jsx
<TableCell className="text-xs">{resolveStore(txn.from_restaurant_id, txn.from_restaurant_type, txn.from_restaurant_name)}</TableCell>
<TableCell className="text-xs">{resolveStore(txn.to_restaurant_id, txn.to_restaurant_type, txn.to_restaurant_name)}</TableCell>
```

### Data Flow
```
API returns: { from_restaurant_id: 813, from_restaurant_name: null, from_restaurant_type: undefined }
                                          ↓
useRestaurantMap resolves: restaurantMap["813"] = { name: "chai", type: "master" }
                                          ↓
resolveStore(813, undefined, null) → mapRestaurantType("master") + "chai" → "Central Store: chai"
```

### QA
| # | Test | Pass |
|---|------|------|
| C1 | Login as Chai Central (`owner@chai.com`), navigate to Store Detail for child 818 | Transactions show store names (not "Unknown: —") |
| C2 | From column shows `Central Store: chai` or similar | Resolved name, not "Unknown" |
| C3 | To column shows `Master Store: Chai Master North` or similar | Resolved name |
| C4 | Stores with no transactions still render normally | No regression |

---

## PHASE 3: BUG-E — Auto-redirect PO Gate (10 min)

### File: `AddStockPurchaseForm.jsx`

**Step 1: Add `useEffect` import (already imported line 1 — verify)**

**Step 2: Add auto-redirect effect after line 91** (after `useEffect(() => { fetchData(); }, [fetchData]);`):
```jsx
// BUG-E: Auto-redirect to PO list when PO is required
useEffect(() => {
  if (poRequired) {
    navigate("/purchase/orders", { replace: true });
  }
}, [poRequired, navigate]);
```

**Step 3: Remove the gate page render block (lines 176–191)**

Delete:
```jsx
  if (poRequired) {
    return (
      <div data-testid="procurement-po-gate" className="flex flex-col items-center justify-center py-16 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-500 mb-3" />
        <h2 className="text-sm font-semibold mb-1">Direct Stock Entry Disabled</h2>
        ...
      </div>
    );
  }
```

**Note:** The `useEffect` fires after `poRequired` becomes `true` (set in fetchData). Loading screen shows briefly, then auto-redirects. Clean UX.

### Entry points covered
- Sidebar "Purchase" link → `/purchase` → `AddStockPurchaseForm` → auto-redirect
- Quick Action "Purchase" card → `/purchase` → `AddStockPurchaseForm` → auto-redirect

### QA
| # | Test | Pass |
|---|------|------|
| E1 | Login as Chai Central (PO required), click sidebar "Purchase" | Redirects to `/purchase/orders` (PO list) |
| E2 | Same login, click "Purchase" in Operations Hub Quick Actions | Same redirect |
| E3 | Login as store without PO requirement (806 hierarchy) → "Purchase" shows normal form | No redirect, form renders |

---

## PHASE 4: BUG-H — Food Edit Dialog → Sheet (30 min)

### File: `ProductCatalogue.jsx`

**Step 1: Change imports (line 10)**

Remove:
```jsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
```

Add:
```jsx
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from "@/components/ui/sheet";
```

**Note:** Keep `AlertDialog` imports (used for delete confirmation — unchanged).

**Step 2: Rename state (lines 59)**
```diff
-  const [dialogOpen, setDialogOpen] = useState(false);
+  const [sheetOpen, setSheetOpen] = useState(false);
```

**Step 3: Update triggers (lines 101, 119)**

Line 101:
```diff
-  onClick={() => { setEditFood(null); setDialogOpen(true); }}
+  onClick={() => { setEditFood(null); setSheetOpen(true); }}
```

Line 119:
```diff
-  onClick={() => { setEditFood(f); setDialogOpen(true); }}
+  onClick={() => { setEditFood(f); setSheetOpen(true); }}
```

**Step 4: Update component reference (line 128)**
```diff
-  <FoodFormDialog open={dialogOpen} onOpenChange={setDialogOpen} food={editFood} categories={categories} onSaved={load} />
+  <FoodFormSheet open={sheetOpen} onOpenChange={setSheetOpen} food={editFood} categories={categories} onSaved={load} recipeMap={recipeMap} />
```

Pass `recipeMap` for the Quick Info section.

**Step 5: Rewrite `FoodFormDialog` → `FoodFormSheet` (lines 133–176)**

```jsx
function FoodFormSheet({ open, onOpenChange, food, categories, onSaved, recipeMap }) {
  const [name, setName] = useState("");
  const [catId, setCatId] = useState("");
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (food) { setName(food.name || ""); setCatId(String(food.category?.id || "")); setPrice(String(food.price || "")); setDesc(food.description || ""); }
    else { setName(""); setCatId(""); setPrice(""); setDesc(""); }
  }, [food, open]);

  const save = async () => {
    if (!name.trim() || !price) return;
    setSaving(true);
    try {
      const payload = { name, category_id: Number(catId), price: Number(price), description: desc };
      if (food) await api.updateFood(food.id, payload);
      else await api.addFood(payload);
      toast({ title: food ? "Food updated" : "Food added" });
      onOpenChange(false); onSaved();
    } catch (e) {
      const d = e?.response?.data;
      const msg = d?.errors ? (Array.isArray(d.errors) ? d.errors.map(x => x.message).join(", ") : Object.values(d.errors).flat().join(", ")) : (d?.message || "Failed");
      toast({ title: msg, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const hasRecipe = food ? !!recipeMap[(food.name || "").toLowerCase()] : false;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[440px] flex flex-col">
        <SheetHeader>
          <SheetTitle>{food ? "Edit" : "Add"} Food</SheetTitle>
          <SheetDescription>{food ? food.name : "Create a new food item"}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 py-4">
          <div>
            <Label className="text-xs">Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} className="h-9 text-sm mt-1" data-testid="food-name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={catId} onValueChange={setCatId}>
                <SelectTrigger className="h-9 text-sm mt-1" data-testid="food-cat"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Price (₹) *</Label>
              <Input type="number" value={price} onChange={e => setPrice(e.target.value)} className="h-9 text-sm mt-1" data-testid="food-price" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Input value={desc} onChange={e => setDesc(e.target.value)} className="h-9 text-sm mt-1" data-testid="food-desc" />
          </div>

          {/* Quick Info section (edit mode only) */}
          {food && (
            <div className="rounded-lg bg-muted/50 border p-3 space-y-2" data-testid="food-quick-info">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Quick Info</p>
              <div className="flex flex-wrap gap-3 text-xs">
                <span>Recipe: <Badge variant="outline" className={`text-[10px] ${hasRecipe ? "text-emerald-700 border-emerald-200 bg-emerald-50" : ""}`}>{hasRecipe ? "Yes" : "—"}</Badge></span>
                <span>Status: <Badge variant="outline" className={`text-[10px] ${food.status === 1 ? "text-emerald-700 border-emerald-200 bg-emerald-50" : ""}`}>{food.status === 1 ? "Active" : "Inactive"}</Badge></span>
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="border-t pt-4">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} data-testid="cancel-food-btn">Cancel</Button>
          <Button onClick={save} disabled={saving || !name.trim() || !price} size="sm" data-testid="save-food-btn">
            {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
```

### QA
| # | Test | Pass |
|---|------|------|
| H1 | Click "Add Food" → sheet slides in from right | Animated slide-in, table visible behind overlay |
| H2 | Click edit pencil on "Sesame Cookie" → sheet shows pre-filled form | Name, Category, Price, Description populated |
| H3 | Quick Info shows "Recipe: Yes", "Status: Active" for foods with recipes | Badges correct |
| H4 | Save food → sheet closes, table refreshes | Toast "Food updated", row updated |
| H5 | Click ✕ or overlay → sheet closes | No save triggered |
| H6 | Delete (trash icon) still uses AlertDialog confirmation | Separate flow, unchanged |

---

## PHASE 5: BUG-B — Stock Inventory Split FG/RM (20 min)

### File 1: `screenVisibility.js` (FROZEN — Owner approved unfreeze)

**Inward section (lines 81-88):** Add RM Stock nav item after `purchase`:
```jsx
  {
    id: "inward",
    label: "Inward",
    items: [
      { id: "vendor-management", screen: "scr-vendor-management", label: "Vendor Management", path: "/vendor-management", icon: "Building2" },
      { id: "raw-material-master", screen: "scr-raw-material-master", label: "Raw Material Master", path: "/raw-materials", icon: "Beaker" },
      { id: "purchase", screen: "scr-purchase", label: "Purchase", path: "/purchase", icon: "ShoppingCart" },
      { id: "rm-stock", screen: "scr-stock-inventory", label: "RM Stock", path: "/inventory?type=raw", icon: "Package" },  // ← NEW
    ],
  },
```

**Outward section (lines 99-108):** Change Stock Inventory path to default to FG:
```diff
-  { id: "stock-inventory", screen: "scr-stock-inventory", label: "Stock Inventory", path: "/inventory", icon: "Package" },
+  { id: "stock-inventory", screen: "scr-stock-inventory", label: "FG Stock", path: "/inventory?type=fg", icon: "Package" },
```

### File 2: `StockInventorySummary.jsx`

**Step 1: Add `useSearchParams` import (line 2)**
```diff
-  import { useNavigate } from "react-router-dom";
+  import { useNavigate, useSearchParams } from "react-router-dom";
```

**Step 2: Read query param and init state (after line 60, inside component)**

Find existing `stockType` state. Current code (search for `useState` near stock type):
```jsx
const [stockType, setStockType] = useState("all");
```

Replace with:
```jsx
const [searchParams] = useSearchParams();
const defaultStockType = searchParams.get("type") || "all";
const [stockType, setStockType] = useState(defaultStockType);
```

**Step 3: Update page title based on context (inside the JSX header)**

Add title variant:
```jsx
<h1 className="text-lg font-bold">
  {defaultStockType === "raw" ? "Raw Material Stock" : defaultStockType === "fg" ? "Finished Goods Stock" : "Stock Inventory"}
</h1>
```

### QA
| # | Test | Pass |
|---|------|------|
| B1 | Sidebar → Outward → "FG Stock" | Opens `/inventory?type=fg`, FG tab selected by default |
| B2 | Sidebar → Inward → "RM Stock" | Opens `/inventory?type=raw`, Raw Materials tab selected by default |
| B3 | Tab switching still works | Click "All" / "Finished Goods" / "Raw Materials" tabs manually |
| B4 | Page title reflects context | "Finished Goods Stock" for FG, "Raw Material Stock" for RM |
| B5 | Direct URL `/inventory` still works | Shows All tab (backwards compatible) |

---

## PHASE 6: BUG-G — ProductionRunForm Master-Detail Rewrite (90 min)

### File: `ProductionRunForm.jsx` — Full Rewrite

#### What Stays (zero logic changes)
- All state variables (lines 39–45)
- `sortedRecipes` useMemo (lines 48–54)
- `selectedRecipe` useMemo (lines 56–59)
- `baseQty`, `unit`, `mult`, `totalQty` derivations (lines 61–64)
- `ingredientSegments` useEffect (lines 67–72)
- `ingredientRows` useMemo (lines 75–116)
- `insufficientCount`, `hasInsufficient`, `canSubmit` (lines 118–122)
- `totalEstimatedCost`, `estimatedUnitCost` (lines 124–133)
- `coverageEstimate` useMemo (lines 136–145)
- `handleRecipeSelect` (lines 147–157)
- `handleSubmit` (lines 159–178)
- `handleReset` (lines 180–188)
- Role gate (lines 191–199)
- Loading/error/disabled states (lines 201–214)
- PostProductionConfirmation (lines 217–230, 518–627) — returned as-is when `result` is set
- All `data-testid` attributes

#### What Changes: Layout Only (lines 232–515)

**Replace** the current vertical layout (lines 232–515) with:

```jsx
  // ── Master-Detail Production Run Form ──
  return (
    <div data-testid="production-run-form" className="py-4 px-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Factory className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold">Run Production</h1>
          <p className="text-xs text-muted-foreground">Select a sub-recipe, specify batch details, and execute.</p>
        </div>
      </div>

      <div className="flex gap-0 border rounded-lg overflow-hidden" style={{ minHeight: "550px" }}>

        {/* ═══ LEFT PANEL — Recipe List (30%) ═══ */}
        <div className="w-[280px] shrink-0 border-r bg-background p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Sub-Recipes <span className="font-normal">({sortedRecipes.length})</span>
            </span>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              data-testid="recipe-search"
              placeholder="Search..."
              value={recipeSearch}
              onChange={e => setRecipeSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>

          <div data-testid="sub-recipe-selector" className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
            {filteredRecipes.length === 0 && (
              <p className="text-xs text-muted-foreground py-4 text-center">No sub-recipes found</p>
            )}
            {filteredRecipes.map((sr) => {
              const fgStock = Number(stockMap[sr.inventory_id]?.cal_quantity) || 0;
              const isLow = stockMap[sr.inventory_id]?.is_low_stock;
              const isSelected = String(sr.recipe_id) === String(selectedRecipeId);
              return (
                <div
                  key={sr.recipe_id}
                  data-testid={`recipe-option-${sr.recipe_id}`}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? "border-primary bg-accent/30 shadow-sm"
                      : "border-border hover:border-primary/40"
                  } ${fgStock <= 0 ? "border-l-[3px] border-l-red-400" : isLow ? "border-l-[3px] border-l-amber-400" : ""}`}
                  onClick={() => handleRecipeSelect(String(sr.recipe_id))}
                >
                  <p className="text-sm font-semibold truncate">{sr.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {sr.qty} {sr.unit}/batch · {sr.ingredients?.length || 0} ing
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      fgStock <= 0 ? "bg-red-100 text-red-700" : isLow ? "bg-amber-100 text-amber-700" : "bg-emerald-50 text-emerald-700"
                    }`}>
                      {fgStock <= 0 ? "No stock" : isLow ? "Low" : "OK"}
                    </span>
                    <span className={`text-base font-bold tabular-nums font-mono ${
                      fgStock <= 0 ? "text-red-600" : isLow ? "text-amber-600" : "text-emerald-600"
                    }`}>{fgStock}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ RIGHT PANEL — Form + BOM + Confirm (70%) ═══ */}
        <div className="flex-1 p-5 overflow-y-auto bg-muted/20">
          {!selectedRecipe ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full text-center" data-testid="production-empty-state">
              <Factory className="h-10 w-10 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">Select a sub-recipe to start a production run</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">Recipes sorted by demand — lowest FG stock first</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Recipe header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold">{selectedRecipe.name}</h2>
                  <p className="text-xs text-muted-foreground">{selectedRecipe.qty} {unit} per batch · {selectedRecipe.ingredients?.length || 0} ingredients</p>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold tabular-nums font-mono ${
                    (Number(stockMap[selectedRecipe.inventory_id]?.cal_quantity) || 0) <= 0 ? "text-red-600"
                    : stockMap[selectedRecipe.inventory_id]?.is_low_stock ? "text-amber-600" : "text-emerald-600"
                  }`}>{Number(stockMap[selectedRecipe.inventory_id]?.cal_quantity) || 0}</p>
                  <p className="text-[9px] text-muted-foreground uppercase">FG Stock</p>
                </div>
              </div>

              {/* Batch Details section */}
              <Card>
                <CardContent className="py-4 px-4 space-y-3">
                  <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Batch Details</h3>
                  <div className="grid grid-cols-2 gap-3">
                    ... (multiplier, total output, batch label, expiry — same as current lines 294-363, just inside Card)
                  </div>
                </CardContent>
              </Card>

              {/* Coverage estimate — same as current lines 324-336 */}
              {coverageEstimate && ( ... )}

              {/* Ingredient BOM table — same as current lines 367-466 inside Card */}
              {mult > 0 && ingredientRows.length > 0 && (
                <Card>
                  <CardContent className="py-0 px-0">
                    <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-4 pt-3 pb-2">Ingredient Requirements</h3>
                    ... (same table as current lines 372-431)
                  </CardContent>
                </Card>
              )}

              {/* Cost summary — same as current lines 435-452, with IndianRupee icon (BUG-F) */}

              {/* Insufficient warnings — same as current lines 454-466 */}

              {/* Submit error — same as current lines 469-474 */}

              {/* Confirmation card — same as current lines 476-513 */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
```

#### New State (add after line 45)
```jsx
const [recipeSearch, setRecipeSearch] = useState("");
```

#### New Computed (add after `sortedRecipes` useMemo)
```jsx
const filteredRecipes = useMemo(() => {
  if (!recipeSearch.trim()) return sortedRecipes;
  const q = recipeSearch.toLowerCase();
  return sortedRecipes.filter(sr => sr.name?.toLowerCase().includes(q));
}, [sortedRecipes, recipeSearch]);
```

#### New Import (add to lucide-react import)
```diff
+  Search,
```

### data-testid Additions
| Element | data-testid |
|---------|------------|
| Recipe search input | `recipe-search` |
| Empty state (no recipe selected) | `production-empty-state` |

**All existing data-testid preserved:** `production-run-form`, `sub-recipe-selector`, `recipe-option-{id}`, `production-multiplier`, `production-total-qty`, `production-batch-label`, `production-expiry-date`, `coverage-estimate`, `pre-production-preview`, `ingredient-sufficient-{id}`, `ingredient-insufficient-{id}`, `ingredient-health-strip-{id}`, `estimated-cost-summary`, `negative-stock-blocked`, `negative-stock-warning`, `production-confirmation-card`, `confirm-run-production-btn`

### QA
| # | Test | Pass |
|---|------|------|
| G1 | Page loads with left panel (recipe list) + right panel (empty state) | Master-detail layout visible |
| G2 | Recipes sorted by demand (lowest FG first) | Sesame (6) before Oats (24) before Ragi (37) |
| G3 | Recipe search filters list | Type "ses" → only Sesame Cookie shows |
| G4 | Click recipe → right panel shows form | Header + batch details + empty BOM |
| G5 | Enter multiplier → total output computed | 30 × 50 = 1500 piece |
| G6 | Coverage estimate shows after multiplier | Blue card with days + stores |
| G7 | BOM table shows health bars, required, available, est. cost, status | All columns populated |
| G8 | Insufficient ingredient → red/amber warning banner | Banner appears below table |
| G9 | Cost summary shows ₹ icon (BUG-F) | ₹ not $ |
| G10 | Confirmation card appears when all fields filled | Green bordered card at bottom |
| G11 | "Confirm & Run Production" → API call → success | Post-production result screen |
| G12 | NBA dispatch suggestions show after success | Sorted by lowest FG stock |
| G13 | "Run Another" resets form | Back to empty state |
| G14 | Role gate: Outlet login → blocked message | "Production Not Available" |

---

## WHAT DOESN'T CHANGE

| File | Reason |
|------|--------|
| `backend/server.py` | Proxy-only, never modified |
| `services/api.js` | No new endpoints needed |
| `useProductionRun.js` | Hook logic unchanged |
| `useStockIntelligence.js` | Not touched |
| `PostProductionConfirmation` | Inner component, returned as-is |
| `StockAdjustmentForm.jsx` | Kept on disk (dormant) |
| `App.js` routes | No route changes |
| `terminology.js` | FROZEN, not touched |

---

## EXECUTION SUMMARY

| Phase | Bug | Files Modified | New Files | Frozen Files |
|:-----:|-----|:-:|:-:|:-:|
| 1 | BUG-F | 4 | 0 | 0 |
| 1 | BUG-D | 1 | 0 | 0 |
| 2 | BUG-C | 1 | 0 | 0 |
| 3 | BUG-E | 1 | 0 | 0 |
| 4 | BUG-H | 1 | 0 | 0 |
| 5 | BUG-B | 2 | 0 | 1 (approved) |
| 6 | BUG-G | 1 | 0 | 0 |
| **Total** | | **11 edits** | **0** | **1** |

---

*Ready for Artifact 4 (Code Gate) — owner approval before implementation begins.*
