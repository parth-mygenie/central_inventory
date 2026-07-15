# CR-035 — Implementation Plan (Artifact #3) — Updated

# Store Creation 2-Step Flow + Outlet Visibility — Complete Plan

---

## PART A: 2-STEP CREATE & PUSH WIZARD

*(Unchanged from original plan — included here for completeness)*

### File: `StoreManagement.jsx`

**Replace** the inline create form (lines 198-229) with a 2-step wizard inside the same Card.

#### New State (add after line 50)

```javascript
const [createStep, setCreateStep] = useState(1);
const [createProgress, setCreateProgress] = useState("");
```

#### New Handler: `handleCreateAndPush` (replace `handleCreate` lines 120-132)

```javascript
const handleCreateAndPush = async () => {
  if (!formName.trim() || !formEmail.trim() || !formPassword) return;
  setCreating(true);
  setCreateProgress("creating");
  try {
    const result = await createChild({
      name: formName, email: formEmail, phone: formPhone,
      password: formPassword, address: formAddress, childType: formType,
    });
    const newChildId = result?.data?.id || result?.id;
    if (newChildId) {
      setCreateProgress("pushing");
      try {
        await api.pushBundle(newChildId);
        toast({ title: "Store created and catalog pushed" });
      } catch {
        toast({ title: "Store created but push failed. Use Push button to retry.", variant: "destructive" });
      }
    } else {
      toast({ title: "Store created" });
    }
    setShowAddForm(false); setCreateStep(1);
    setFormName(""); setFormEmail(""); setFormPhone(""); setFormPassword(""); setFormAddress("");
    fetchList();
  } catch (e) {
    toast({ title: e?.response?.data?.message || "Failed to create store", variant: "destructive" });
  } finally { setCreating(false); setCreateProgress(""); }
};

const handleNext = () => {
  if (!formName.trim() || !formEmail.trim() || !formPassword) {
    toast({ title: "Please fill all required fields", variant: "destructive" });
    return;
  }
  setCreateStep(2);
};
```

#### Step 1 UI: Store Details

Same 6 fields in 3-column grid. Buttons: Cancel + Next →

#### Step 2 UI: Review & Push

- Summary banner: "Creating: {name} as {type}"
- 7 catalog count cards in 2 rows (4+3):

| Row | Cards |
|-----|-------|
| 1 | Categories, Ingredients, Products, Recipes |
| 2 | Sub-Recipes, Addons, Addon Recipes |

- Data from `createMeta.available_entities`
- Label mapping: `foods` → "Products"
- Cards with count=0: `opacity-40`
- Loading state: "Creating store..." → "Pushing catalog..."
- Buttons: ← Back + Create & Push

#### Imports to Add

```javascript
Check, ArrowRight, ArrowLeft  // from lucide-react (add to existing import)
```

---

## PART B: OUTLET VISIBILITY FROM CENTRAL

### Discovery

**`hierarchy-detail` API** returns a `restaurants` array with ALL stores in the hierarchy when called with any child's `store_restaurant_id`:

```
POST /inventory-transfer/hierarchy-detail { store_restaurant_id: 814 }
→ restaurants: [
    { restaurant_id: 814, restaurant_name: "Chai Master North", restaurant_type: "central" },
    { restaurant_id: 815, restaurant_name: "Chai Master South", restaurant_type: "central" },
    { restaurant_id: 816, restaurant_name: "Chai Outlet N1", restaurant_type: "franchise" },
    ... (all 14 stores)
  ]
```

This is **already being called** in `StoreManagement.jsx` lines 80-103 (the child health fetch). We just need to extract the `restaurants` array from one of those responses.

### Implementation

#### File: `StoreManagement.jsx`

**Step 1:** In the existing `useEffect` (lines 77-103) that fetches health per child, also extract the `restaurants` list from the first successful response.

**New state:**
```javascript
const [allStores, setAllStores] = useState([]);
```

**In the existing health fetch useEffect (lines 77-103):**

After line 83 (`api.getHierarchyDetail({ storeRestaurantId: c.id })`), extract `restaurants` from the response:

```javascript
// Inside the .then() block (around line 84-102):
// Extract full restaurant list from first successful hierarchy-detail call
let allRestaurants = [];
children.slice(0, 15).forEach((child, idx) => {
  if (results[idx].status === "fulfilled" && allRestaurants.length === 0) {
    const d = results[idx].value?.data?.data || results[idx].value?.data;
    allRestaurants = d?.restaurants || [];
  }
});
if (allRestaurants.length > 0) setAllStores(allRestaurants);
```

**Step 2:** Build the combined children list for display.

When `isTopLevel` and `allStores` is populated:
- Direct children = Masters (from `children` state, type `central`)
- Outlets = items from `allStores` where `restaurant_type === "franchise"`
- Combined list = Masters + Outlets

```javascript
const displayChildren = useMemo(() => {
  if (!isTopLevel || allStores.length === 0) return children;
  
  // Get outlet IDs not in direct children
  const directIds = new Set(children.map(c => c.id));
  const outlets = allStores
    .filter(s => s.restaurant_type === "franchise" && !directIds.has(s.restaurant_id))
    .map(s => ({
      id: s.restaurant_id,
      name: s.restaurant_name,
      restaurantTypeFlag: s.restaurant_type,
      email: "",  // Not available from hierarchy-detail
      isNested: true,  // Flag for UI grouping
    }));
  
  return [...children, ...outlets];
}, [children, allStores, isTopLevel]);
```

**Step 3:** Use `displayChildren` instead of `children` in:
- Filter logic (line 106-115) — replace `children` with `displayChildren`
- Count computation (line 117-118) — use `displayChildren`
- Table rendering (line 256) — use `filtered` (which derives from `displayChildren`)

**Step 4:** Update the filter tabs to show correct counts:

```javascript
const masterCount = displayChildren.filter(c => c.restaurantTypeFlag === "central").length;
const outletCount = displayChildren.filter(c => c.restaurantTypeFlag === "franchise").length;
```

This makes "Outlet (12)" show correctly instead of "Outlet (0)".

**Step 5:** Visual differentiation for outlets.

Outlets in the table get a subtle left indent or a parent label:

```jsx
<TableCell className="py-2.5 font-semibold text-sm">
  {child.isNested && <span className="text-[9px] text-muted-foreground mr-1">↳</span>}
  {child.name}
</TableCell>
```

No other changes — the existing push status, health columns, expand row all work with the outlet's `id`.

#### File: `useHierarchyManagement.js`

**No changes needed.** The `restaurants` data comes from the existing `getHierarchyDetail` call already made in StoreManagement.jsx.

---

## EXECUTION ORDER

| Step | Task | File | Depends On |
|:----:|------|------|:----------:|
| 1 | Add `createStep`, `createProgress`, `allStores` state | StoreManagement.jsx | — |
| 2 | Add `handleCreateAndPush`, `handleNext` functions | StoreManagement.jsx | — |
| 3 | Replace inline form with 2-step wizard JSX | StoreManagement.jsx | Steps 1-2 |
| 4 | Extract `restaurants` from hierarchy-detail response | StoreManagement.jsx | — |
| 5 | Build `displayChildren` with merged outlets | StoreManagement.jsx | Step 4 |
| 6 | Update filter/count/table to use `displayChildren` | StoreManagement.jsx | Step 5 |
| 7 | Add `Check, ArrowRight, ArrowLeft` to imports | StoreManagement.jsx | — |

Steps 1-3 (Part A) and 4-6 (Part B) are independent — can be implemented in either order.

---

## DATA-TESTID ADDITIONS

| Element | data-testid |
|---------|------------|
| Step indicator | `create-store-steps` |
| Next button (Step 1) | `create-store-next` |
| Back button (Step 2) | `create-store-back` |
| Create & Push button | `submit-create-store` (existing) |
| Catalog count card | `catalog-count-{key}` |
| Nested outlet indicator | `nested-outlet-{id}` |

---

## QA PLAN

### Part A: 2-Step Wizard

| # | Test | Pass Criteria |
|---|------|--------------|
| Q1 | Click Create Store → Step 1 shows | 6 fields + step indicator visible |
| Q2 | Click Next without required fields | Toast error, stays on Step 1 |
| Q3 | Fill fields, click Next | Step 2: summary + 7 catalog count cards |
| Q4 | Back returns to Step 1 | Fields preserved |
| Q5 | Create & Push succeeds | Toast, form closes, list refreshes, store "Synced" |
| Q6 | Cancel closes form | Form hidden |

### Part B: Outlet Visibility

| # | Test | Pass Criteria |
|---|------|--------------|
| Q7 | Central Store Management page load | "All (14)" shows, "Outlet (12)" tab has count |
| Q8 | Click Outlet tab | 12 outlets listed with ↳ indicator |
| Q9 | Click Master tab | 2 masters listed |
| Q10 | Outlet rows show health (OOS/Low/OK) | Data from hierarchy-detail |
| Q11 | Master-level login unchanged | Master North sees 6 outlets only |

---

## WHAT DOESN'T CHANGE

- ExpandedStoreDetail component (lines 327-415)
- Existing Push button per store row
- useHierarchyManagement.js hook
- api.js
- backend server.py

---

## ESTIMATED EFFORT

| Task | Time |
|------|------|
| Part A: 2-step wizard | 30 min |
| Part B: outlet visibility | 20 min |
| Testing | 15 min |
| **Total** | **~65 min** |


---

## IMPLEMENTATION DEVIATION NOTES (Added 2026-06-14)

> These notes document differences between this plan and the actual implementation.

1. **Catalog count keys corrected during QA:** The API's `available_entities` returns numeric counts (not arrays) with different keys than assumed. Corrected mapping:
   - `stock_item_categories` → `categories`
   - `inventory_items` → `ingredients`
   - `addon_recipes` → `roles` (API doesn't return addon_recipes separately)
   - Added `typeof === "number"` check since API returns counts as integers, not arrays
2. **7th card:** Changed from "Addon Recipes" to "Roles" to match actual API response.
3. **`useHierarchyManagement.js`:** Confirmed no changes needed (noted correctly in plan, but listed in Art 2 as affected).