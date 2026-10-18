# BUG-047 — Impact Analysis + Implementation Plan

> **Created:** 2026-07-24
> **Role:** PLANNING
> **Code Reality:** PARTIAL — Component exists (CR-011), payload/API contract mismatches
> **Scope Lock:** Files WILL change: `AddonRecipeCatalogue.jsx`, `api.js`. Files will NOT touch: everything else.

---

## Gate 2: Impact Analysis

### Data Flow Trace

```
User clicks "Create Addon Recipe"
  → AddonRecipeDetail.handleSave() [AddonRecipeCatalogue.jsx:161]
    → Builds payload [lines 164-168]    ← ❌ BREAKS HERE (missing fields, wrong ingredient keys)
      → api.createAddonRecipe(payload) [api.js:918]
        → client.post("/proxy/v2/product/store-addon-recipe", payload)
          → server.py proxy_v2() → preprod.mygenie.online
            → POS validation fails → "The given data was invalid."
              → Error caught [line 174] → toast shown to user
```

### Affected Files

| # | File | Lines | Risk | Impact |
|---|------|-------|:----:|--------|
| 1 | `AddonRecipeCatalogue.jsx` | 164-168 | **HIGH** | Payload construction — core of the bug |
| 2 | `AddonRecipeCatalogue.jsx` | 200 | LOW | Addon select `onValueChange` — UX auto-fill |
| 3 | `api.js` | 920 | LOW | `deleteAddonRecipe` — missing `reason` body |

### Downstream Consumers

- `ProductCatalogue.jsx` embeds `AddonRecipeCatalogue` (line 48) — **no change needed**
- `api.js` export list (line 1268-1270) — **no change needed** (function signatures unchanged)
- Cache layer — `getAddonRecipes` is NOT cached (no `_cached()` wrapper), so no invalidation concern

### Risk Assessment

| Risk | Level | Mitigation |
|------|:-----:|-----------|
| Payload format breaks existing update flow | MEDIUM | Test update AND create paths after fix |
| RecipeCatalogue already uses correct format | LOW | Reference implementation confirmed working |
| api.js HIGH-RISK file touched | LOW | Only 1 line change, isolated to addon recipe delete |

### Open Questions

None — all root causes confirmed with curl evidence against live POS API.

---

## Gate 3: Implementation Plan

### Execution Sequence

1. **Edit 1** — Fix `api.js:920` (delete reason) — isolated, lowest risk
2. **Edit 2** — Fix `AddonRecipeCatalogue.jsx:200` (name auto-fill) — UX fix
3. **Edit 3** — Fix `AddonRecipeCatalogue.jsx:164-168` (payload) — core fix

### Edit 1: `api.js` line 920 — Add `reason` body to `deleteAddonRecipe`

**File:** `frontend/src/services/api.js`
**Line:** 920

**Current code:**
```javascript
function deleteAddonRecipe(id) { return client.delete(`/proxy/v2/product/delete-addon-recipe/${id}`); }
```

**New code:**
```javascript
function deleteAddonRecipe(id) {
  return client.delete(`/proxy/v2/product/delete-addon-recipe/${id}`, {
    data: { reason: "Deleted from Central Inventory" }
  });
}
```

**Reference:** `deleteRecipe()` same file uses identical pattern.

**Verification:** `curl -X DELETE .../delete-addon-recipe/{id} -d '{"reason":"..."}' → 200 with success message`

---

### Edit 2: `AddonRecipeCatalogue.jsx` line 200 — Auto-fill name on addon selection

**File:** `frontend/src/components/central-inventory/AddonRecipeCatalogue.jsx`
**Line:** 200

**Current code:**
```jsx
<Select value={addonId} onValueChange={setAddonId}>
```

**New code:**
```jsx
<Select value={addonId} onValueChange={(v) => { setAddonId(v); const a = addons.find(a => String(a.id) === v); if (a) setName(a.name || ""); }}>
```

**Reference:** `RecipeCatalogue.jsx` line 330 uses identical pattern for food selection.

**Verification:** In browser — select addon from dropdown → Recipe Name field auto-fills with addon name.

---

### Edit 3: `AddonRecipeCatalogue.jsx` lines 164-168 — Fix payload

**File:** `frontend/src/components/central-inventory/AddonRecipeCatalogue.jsx`
**Lines:** 164-168

**Current code:**
```javascript
      const payload = {
        name, addon_name: name, addon_id: addonId ? Number(addonId) : undefined,
        ingredients: ingredients.filter(i => i.ingredient_id && Number(i.ingredient_qty) > 0).map(i => ({
          ingredient_id: Number(i.ingredient_id), ingredient_qty: Number(i.ingredient_qty), ingredient_unit: i.ingredient_unit,
        })),
      };
```

**New code:**
```javascript
      const payload = {
        name, addon_name: name, addon_id: addonId ? Number(addonId) : undefined,
        preparation_time: 0, serves_people: 1, serve_time: 0,
        ingredients: ingredients.filter(i => i.ingredient_id && Number(i.ingredient_qty) > 0).map(i => ({
          id: Number(i.ingredient_id), qty: Number(i.ingredient_qty), unit: i.ingredient_unit,
        })),
      };
```

**Changes:**
1. Added `preparation_time: 0, serves_people: 1, serve_time: 0` (required by POS validation)
2. Changed ingredient keys: `ingredient_id → id`, `ingredient_qty → qty`, `ingredient_unit → unit` (required by POS AddOnController.php:850)

**Reference:** `RecipeCatalogue.jsx` lines 257-268 uses identical format.

**Verification:**
- `curl -X POST .../store-addon-recipe -d '{...full payload...}' → 200 with recipe_id`
- In browser — create addon recipe → success toast, recipe appears in list

---

### Verification Matrix

| Edit # | File | Change Description | How to Verify | Automated? |
|:------:|------|--------------------|---------------|:---:|
| 1 | `api.js:920` | Delete sends `reason` body | curl DELETE with reason → 200 | NO |
| 2 | `AddonRecipeCatalogue.jsx:200` | Addon select auto-fills recipe name | Browser: select addon → name fills | NO |
| 3 | `AddonRecipeCatalogue.jsx:164-168` | Payload has `preparation_time`, `serves_people`, correct ingredient keys | curl POST store-addon-recipe → 200 | NO |
| 4 | (regression) | Existing edit flow still works | Browser: edit existing addon recipe → save → success | NO |
| 5 | (regression) | Webpack compiles clean | `tail -5 frontend.out.log` → "compiled" | YES |

### Post-Code Registry Checklist

```
- [ ] registry.json: BUG-047 → status: RESOLVED, artifact_refs updated
- [ ] L4: row updated with new status
- [ ] L7: AddonRecipeCatalogue.jsx + api.js listed as BUG-047 modifications
- [ ] Code markers: // BUG-047 comment in every modified file
- [ ] Dashboard drift check: node control/gen_dashboard_data.js --check → PASS
```

---

## Scope Lock Declaration

**Files WILL change:**
- `frontend/src/components/central-inventory/AddonRecipeCatalogue.jsx` (2 edits)
- `frontend/src/services/api.js` (1 edit, line 920 only)

**Files will NOT touch:**
- `backend/server.py` (proxy only, no changes needed)
- `RecipeCatalogue.jsx` (reference only)
- `terminology.js` (frozen)
- `screenVisibility.js` (frozen)
- All other files
