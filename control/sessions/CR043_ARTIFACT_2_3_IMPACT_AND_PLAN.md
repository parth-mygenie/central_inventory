# CR-043 — Pushed Catalog Lock UI + Child Edit Policy (G-028 + G-029)

> **Gates:** 2 + 3 combined | **Planned:** 2026-07-11 | **Agent:** PLANNING
> **Source:** `AI/openGaps/gap_validation.md` — G-028 + G-029 FULLY RESOLVED
> **Code Reality:** NONE — no `is_pushed_managed`, no catalog-policy calls, no handling of `PUSHED_CATALOG_LOCKED` / `CHILD_CATALOG_POLICY_DENIED` 403s anywhere in frontend/src.

---

## 1. Impact Analysis (Gate 2)

### What backend now provides (verified 2026-07-07)

**G-028 (push lock):**
- Read flags: `is_pushed_managed` on foods-list, get-inventory-master, sub-recipes (+ `pushed_from_parent_restaurant_id`, `pushed_source_entity_id`)
- Write lock: delete/update on pushed items → **403** `{error_code:"PUSHED_CATALOG_LOCKED"}`. Stock-qty paths (add-stock, update-stock) correctly exempt.

**G-029 (child policy):**
- `GET /franchise/catalog-policy/{childId}` (master token) → `{policy_editable, resolved_policy:{allow_child_catalog_create/update/delete, allow_child_inventory_create/update/delete}, stored_policy}`
- `POST /franchise/catalog-policy/{childId}` `{policy:{...}}` → updates
- Child blocked writes → **403** `{error_code:"CHILD_CATALOG_POLICY_DENIED"}`

### Data flow (target)
1. Catalogue list screens read `is_pushed_managed` → lock badge + disabled Edit/Delete (tooltip "Managed by hierarchy push").
2. Defense-in-depth: even when UI misses a case, catch 403 error codes centrally → friendly toast (not raw axios error).
3. StoreManagement (Central Store = API master view): per-child "Catalogue Policy" panel with 6 toggles.

### Affected files

| File | Change | Risk |
|------|--------|:---:|
| `frontend/src/services/api.js` | +2 methods `getCatalogPolicy`, `updateCatalogPolicy`; export | LOW |
| `frontend/src/lib/formatters.js` (or small new `lib/apiErrors.js`) | `friendlyCatalogError(err)` mapping the 2 error codes | LOW |
| `frontend/src/components/central-inventory/ProductCatalogue.jsx` | Lock badge + disabled edit/delete on `is_pushed_managed` foods; 403 toast mapping | MEDIUM |
| `frontend/src/components/central-inventory/SubRecipeMaster.jsx` | Same for sub-recipes | LOW |
| `frontend/src/components/central-inventory/RecipeCatalogue.jsx` | Same for recipes (recipe of pushed food) | LOW |
| `frontend/src/components/central-inventory/IngredientCatalogue.jsx` | Lock badge on pushed inventory items (definition edits only — stock qty actions stay enabled) | MEDIUM |
| `frontend/src/components/central-inventory/StoreManagement.jsx` | Child detail: Catalogue Policy card (6 switches, master-only, `policy_editable` gate) | MEDIUM |

### Terminology caution (CI-R1)
Policy applies to children as seen from API-master (UI "Central Store"). All labels via `terminology.js` maps — e.g. "What {childName} can edit locally". Never render raw `master/central/franchise`.

### Conflict pre-check
- `IngredientCatalogue.jsx`: CR-042 (this batch) → **CR-043 AFTER CR-042**.
- `SubRecipeMaster.jsx`: BUG-034 toggle stub (IMPLEMENTED, QA pending) — additive, parallel-safe.
- `StoreManagement.jsx`: BUG-040 (QA_PASS) — additive card, parallel-safe.

### Open Questions (owner)
1. Locked actions: disable with tooltip (recommended) or hide entirely?
2. Policy editor placement: StoreManagement child expanded/detail view OK?
3. Default when `policy_editable=false` for viewer: hide card or show read-only? **Recommendation: read-only view.**

## 2. Implementation Plan (Gate 3)

### Edits

**Edit 1 — api.js (after `getHierarchyHistory`, ~line 864):**
```js
// CR-043 — G-029 child catalogue policy
function getCatalogPolicy(childId) {
  return client.get(`/proxy/v2/franchise/catalog-policy/${childId}`);
}
function updateCatalogPolicy(childId, policy) {
  return client.post(`/proxy/v2/franchise/catalog-policy/${childId}`, { policy });
}
```
Export both.

**Edit 2 — error mapping helper** (in `lib/formatters.js` or new tiny `lib/apiErrors.js`):
```js
// CR-043 — G-028/G-029 friendly 403 mapping
export function friendlyCatalogError(err) {
  const code = err?.response?.data?.error_code;
  if (code === "PUSHED_CATALOG_LOCKED") return "This item is managed by hierarchy push and can only be edited on the parent store.";
  if (code === "CHILD_CATALOG_POLICY_DENIED") return "This store is not permitted to make this catalogue change (set by parent).";
  return null;
}
```

**Edit 3 — ProductCatalogue.jsx.** Foods rows: `is_pushed_managed` → `<Badge>` "Pushed" (Lock icon, `data-testid="pushed-lock-{id}"`), Edit/Delete disabled + title tooltip. Wrap mutation catch: `friendlyCatalogError(e) || existing message` in toast.

**Edit 4 — SubRecipeMaster.jsx.** Same pattern on sub-recipe rows (fields confirmed present: `is_pushed_managed`, `pushed_from_parent_restaurant_id`).

**Edit 5 — RecipeCatalogue.jsx.** Same pattern + catch mapping on create/update/delete recipe.

**Edit 6 — IngredientCatalogue.jsx.** Lock badge on pushed items; disable definition edit dialog trigger; **stock qty quick-actions remain enabled** (spec: qty paths exempt). Catch mapping.

**Edit 7 — StoreManagement.jsx: Catalogue Policy card.** In child detail area: on expand, `getCatalogPolicy(childId)` → 6 `Switch`es (3 catalogue + 3 inventory), labels e.g. "Create catalogue items", save per-toggle or single Save → `updateCatalogPolicy`; disabled when `!policy_editable`. data-testids: `policy-card-{childId}`, `policy-toggle-{key}`, `policy-save-btn`.

### Execution sequence
api.js + helper → StoreManagement (policy) → catalogue screens 3→6. Compile check per file group (7 files = checkpoint protocol applies).

### Scope lock
- **WILL change:** `api.js`, `lib/formatters.js` (or new apiErrors.js), `ProductCatalogue.jsx`, `SubRecipeMaster.jsx`, `RecipeCatalogue.jsx`, `IngredientCatalogue.jsx`, `StoreManagement.jsx`
- **Will NOT touch:** `terminology.js`, `screenVisibility.js` (FROZEN), `server.py`, AddonRecipeCatalogue (no pushed flag confirmed — defer)

### Verification Matrix

| # | File | Change | How to Verify | Automated? |
|---|------|--------|---------------|:---:|
| 1 | api.js | policy CRUD | curl GET/POST catalog-policy/837 (835 master token) → resolved_policy round-trip | YES |
| 2 | catalogue screens | lock badges | Login central 837 (`manager@bccentralkitchen.com`) → pushed items badged, edit disabled | NO |
| 3 | error map | 403 toast | curl DELETE pushed food → 403; UI toast shows friendly text (forced via disabled-bypass test) | PARTIAL |
| 4 | StoreManagement | policy editor | 835 owner toggles allow_child_catalog_create off → child add-food blocked w/ friendly toast | NO |
| 5 | regression | qty paths open | Pushed item add-stock still works from child | NO |

### Post-code registry checklist
- [ ] registry.json: CR-043 → IMPLEMENTED · L3 · L7 · `// CR-043` markers · dashboard `--check` PASS
