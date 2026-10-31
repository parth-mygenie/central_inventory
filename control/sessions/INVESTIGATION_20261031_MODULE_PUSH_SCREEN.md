# INVESTIGATION REPORT — Forward Push: New Module-Level Selection Screen

> **Date:** 2026-10-31
> **Investigator:** Agent (INVESTIGATION role)
> **Account:** manager@mygenietest002.com (RID 828, Central Store → child 827 franchise)
> **Scope:** Add a separate "Module Push" screen alongside the existing category-based push; Pull screen stays untouched.

---

## 1. The Request

Owner wants a **new screen** (dialog) for pushing catalogue to a child store that lets them pick **individual modules** (Ingredients, Foods, Recipes, etc.) — the same UX pattern the Pull dialog (`ReversePushWizardDialog`) already uses. 

**Constraints:**
- The existing `CategoryPushDialog` (category-scoped push) stays as-is — no changes.
- The existing `ReversePushWizardDialog` (Pull) stays as-is — no changes.
- The new screen operates **alongside** category-based push, not replacing it.

---

## 2. Backend Readiness — CONFIRMED ✅

### 2.1 Push POST (`POST /franchise/push/{childId}`) accepts `modules`

Proven in prior investigation (2026-07-16, `INVESTIGATION_CATEGORY_SCOPED_PUSH_20260716.md`, Curl 6):

```
POST /franchise/push/815
Body: { "push_food_bundle": true, "category_ids": [8381], "modules": ["categories","foods","recipes"] }
→ 200 OK — only categories/foods/recipes pushed, others skipped
```

The `modules` parameter works on forward push the same way it works on reverse push. Same whitelist applies:

```
categories, stock_item_categories, addons, sub_recipes, ingredients, stock_items, foods, recipes
```

### 2.2 Push-Form GET (`GET /franchise/push-form/{childId}`) returns per-module data

Curl-probed today (RID 828 → child 827):

```json
{
  "parent": { "id": 828, "name": "Mygenietest002", "restaurant_type_flag": "master" },
  "child": { "id": 827, "name": "Mygenietest001", "restaurant_type_flag": "franchise" },
  "source_entities": {
    "categories": [],      // list of { id, name }
    "foods": [],           // list of { id, name }
    "addons": [],          // list of { id, name }
    "ingredients": [187],  // list of { id, stock_title, unit }
    "sub_recipes": [],
    "recipes": [],
    "roles": [13]
  },
  "child_existing": {
    "category_names": [],
    "food_names": [],
    "addon_names": [],
    "ingredient_names": [189],
    "sub_recipe_names": [],
    "recipe_names": [],
    "role_names": [13]
  },
  "push_summary": {
    "total_source": 200,
    "total_child_matched": 200,
    "total_behind": 0,
    "status": "synced",
    "target_seeded": true,
    "breakdown": {
      "categories":            { "source": 0,   "child_matched": 0 },
      "stock_item_categories": { "source": 0,   "child_matched": 0 },
      "foods":                 { "source": 0,   "child_matched": 0 },
      "addons":                { "source": 0,   "child_matched": 0 },
      "ingredients":           { "source": 187, "child_matched": 187 },
      "sub_recipes":           { "source": 0,   "child_matched": 0 },
      "recipes":               { "source": 0,   "child_matched": 0 },
      "roles":                 { "source": 13,  "child_matched": 13 }
    }
  }
}
```

**Key insight:** `push_summary.breakdown` gives per-module `source` count and `child_matched` count — exactly what the Pull wizard uses to render module checkboxes with "behind" counts.

### 2.3 No backend changes needed

| Check | Result |
|-------|--------|
| `POST /franchise/push/{childId}` accepts `modules` | ✅ Verified (prior investigation) |
| `POST /franchise/push/{childId}` accepts `category_ids` | ✅ Verified |
| `POST /franchise/push/{childId}` accepts both together | ✅ Verified — scopes by category AND module |
| `GET /franchise/push-form/{childId}` returns per-module breakdown | ✅ Verified (today's curl) |
| Proxy forwards correctly | ✅ Generic proxy in server.py |

---

## 3. Current Code Architecture

### 3.1 Existing Push Flow (Category-Scoped) — STAYS UNCHANGED

| Layer | File | Lines | What It Does |
|-------|------|:-----:|-------------|
| API | `api.js:978-983` | `pushBundle()` | Sends `{ push_food_bundle: true, category_ids: [...] }` — **does NOT send `modules`** |
| API | `api.js:969-974` | `getPushForm()` | GET push-form with optional `categoryIds` for preview |
| Hook | `useHierarchyManagement.js:108-128` | `executePush()` | Calls `pushBundle(childId, { categoryIds })` |
| UI | `StoreManagement.jsx:644-960` | `CategoryPushDialog` | Category checklist + preview + push results. **No module checkboxes.** |
| Trigger | `StoreManagement.jsx:468` | `Push` button per child row | Opens `CategoryPushDialog` |

### 3.2 Existing Pull Flow (Module-Scoped) — REFERENCE PATTERN, STAYS UNCHANGED

| Layer | File | Lines | What It Does |
|-------|------|:-----:|-------------|
| API | `api.js:999-1013` | `reversePushFromChild()` | Sends `{ push_food_bundle: true, modules: [...] }` |
| API | `api.js:994-997` | `getReversePushFromChild()` | GET reverse-push-form |
| Hook | `useHierarchyManagement.js:167-187` | `executeReverse()` | Calls `reversePushFromChild(childId, opts)` |
| UI | `ReversePushWizardDialog.jsx` (367 lines) | Separate component | 4-step wizard: preview→confirm→pushing→results. Module checkboxes in preview step. |
| Trigger | `StoreManagement.jsx:481` | `Pull` button per franchise row | Opens `ReversePushWizardDialog` |

### 3.3 Key Pattern Difference

| Feature | Pull Dialog | Push Dialog |
|---------|------------|-------------|
| Module checkboxes | ✅ Yes (6 modules from `PREVIEW_MODULES`) | ❌ No |
| Category checkboxes | ❌ No | ✅ Yes (main feature) |
| `modules` sent to API | ✅ Yes (filtered by whitelist) | ❌ Never |
| Push-form data used | `push_summary.breakdown` for per-module counts | `source_entities.categories` for category list |
| Wizard steps | preview → confirm → pushing → results | category-select → preview → pushing → results |

---

## 4. What's Needed for the New "Module Push" Screen

### 4.1 New Component: `ModulePushWizardDialog.jsx`

A **new file** — separate dialog component. Does NOT modify the existing `CategoryPushDialog`.

**UX Flow** (mirroring Pull wizard pattern):

```
Step 1 — Preview:
  - Show parent → child direction badge (same as Pull's From/To cards, but arrow goes DOWN)
  - Show overall push_summary status (synced/partial/stale)
  - Show module checkboxes with source counts and "behind" counts:
    □ Categories (12 at source, +3 behind)
    □ Foods (45 at source, +5 behind)
    □ Ingredients (187 at source, +0 behind)
    ... etc.
  - "Leave all unchecked to push everything" (same UX as Pull)
  - Optional: combine with category_ids if owner wants both scoping dimensions

Step 2 — Confirm:
  - Summary of what will be pushed
  - Module list if scoped
  - Confirm button

Step 3 — Pushing:
  - Elapsed timer with reassurance messages (same pattern as Pull)

Step 4 — Results:
  - Per-module inserted/updated/failed table (same as Pull)
```

### 4.2 API Layer Changes: `api.js`

`pushBundle()` at line 978 currently does NOT accept or send `modules`. Needs:

```js
// CURRENT (line 978-983):
function pushBundle(childId, { categoryIds } = {}) {
  const body = { push_food_bundle: true };
  if (Array.isArray(categoryIds) && categoryIds.length > 0) {
    body.category_ids = categoryIds;
  }
  return client.post(`/proxy/v2/franchise/push/${childId}`, body, { timeout: 100000 });
}

// NEEDED:
function pushBundle(childId, { categoryIds, modules } = {}) {
  const body = { push_food_bundle: true };
  if (Array.isArray(categoryIds) && categoryIds.length > 0) {
    body.category_ids = categoryIds;
  }
  if (Array.isArray(modules) && modules.length > 0) {
    const PUSH_MODULES = ["categories","stock_item_categories","addons","sub_recipes",
                          "ingredients","stock_items","foods","recipes"];
    const filtered = modules.filter(m => PUSH_MODULES.includes(m));
    if (filtered.length > 0 && filtered.length < PUSH_MODULES.length) {
      body.modules = filtered;
    }
  }
  return client.post(`/proxy/v2/franchise/push/${childId}`, body, { timeout: 100000 });
}
```

### 4.3 Hook Layer Changes: `useHierarchyManagement.js`

`executePush()` at line 108 currently only passes `categoryIds`. Needs to also accept and forward `modules`.

### 4.4 StoreManagement Integration

A new button or entry point in the child row (alongside existing "Push" and "Pull" buttons), e.g.:

```jsx
<Button onClick={() => setModulePushTarget(child)}>
  <Layers className="h-3 w-3" /> Push Modules
</Button>
```

Plus dialog mount:

```jsx
<ModulePushWizardDialog
  open={!!modulePushTarget}
  onClose={() => setModulePushTarget(null)}
  target={modulePushTarget}
/>
```

---

## 5. Scope & Risk Assessment

### 5.1 Files That WILL Change

| # | File | Change | Risk |
|---|------|--------|:----:|
| 1 | `api.js:978-983` | Add `modules` parameter to `pushBundle()` | LOW — additive, backward-compatible (no `modules` = push everything, same as today) |
| 2 | `useHierarchyManagement.js:108` | Add `modules` to `executePush()` signature | LOW — additive |
| 3 | `StoreManagement.jsx` | Add trigger button + dialog mount (~10 lines) | LOW — additive |
| 4 | **NEW** `ModulePushWizardDialog.jsx` | New component (~300-370 lines, mirrors `ReversePushWizardDialog` pattern) | MEDIUM — new file, but follows proven pattern |

### 5.2 Files That Will NOT Change

| File | Why |
|------|-----|
| `CategoryPushDialog` (inside StoreManagement.jsx lines 644-960) | Existing category push stays untouched per owner directive |
| `ReversePushWizardDialog.jsx` | Pull screen stays untouched per owner directive |
| `terminology.js` | FROZEN |
| `screenVisibility.js` | FROZEN |
| `server.py` | Proxy-only, no changes needed |

### 5.3 Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|:----------:|:------:|-----------|
| `pushBundle()` change breaks existing category push | LOW | HIGH | The `modules` param is additive. Existing callers don't pass it, so behavior is identical. |
| Module push + category push confusion | LOW | LOW | They're separate buttons with distinct UX. Module push is "Push Modules", category push is "Push". |
| Push timeout for large module sets | LOW | MEDIUM | Existing 100s timeout already handles this. Add elapsed timer in UI. |
| `push_summary.breakdown` missing on some API versions | LOW | LOW | Already confirmed present on preprod. Graceful fallback if absent. |

---

## 6. Comparison: New Module Push vs Existing Pull

The new Module Push dialog should mirror the Pull wizard's UX pattern closely:

| Feature | Pull Wizard (existing) | Module Push Wizard (proposed) |
|---------|----------------------|------------------------------|
| Direction | Outlet → Central (pull up) | Central → Outlet (push down) |
| Preview source | `reverse-push-form/from/{childId}` | `push-form/{childId}` (already used) |
| Summary data | `push_summary.breakdown` | `push_summary.breakdown` (same structure) |
| Module checkboxes | 6 modules (PREVIEW_MODULES) | 8 modules (full whitelist) |
| Enforce child lock | ✅ Checkbox | Not applicable (push always overwrites) |
| Results table | Module × inserted/updated/failed | Module × inserted/updated/failed (same) |
| File | `ReversePushWizardDialog.jsx` | `ModulePushWizardDialog.jsx` (new) |

---

## 7. Open Questions for Owner

1. **Should module push and category push be combinable?** E.g., "Push only Ingredients + Recipes, scoped to these 3 categories." The API supports both `modules` and `category_ids` together. The new screen could include category filtering as an optional sub-step, or keep it purely module-based.

2. **Which modules to show by default?** The Pull wizard shows 6 (`PREVIEW_MODULES`). The API has 8 modules. Should the Module Push wizard show all 8, or skip `stock_item_categories` and `stock_items` (which are auto-seeded with `ingredients`)?

3. **Roles module?** The push-form includes `roles` in breakdown. Should the Module Push wizard include roles, or exclude them (roles push may be unexpected for a "catalogue" push)?

4. **Button placement:** Should the "Push Modules" button appear:
   - (A) Next to the existing "Push" button in the child row actions?
   - (B) Inside the expanded store detail card?
   - (C) Both?

5. **Naming:** "Push Modules" or "Push by Module" or something else?

---

## 8. Classification

**Frontend gap.** Backend is fully ready. All data for the new screen is already available in existing API endpoints.

**Recommended next step:** Hand to **PLANNING** for Gates 2-3 (Impact Analysis + Implementation Plan) after owner answers the open questions above.

---

## 9. Effort Estimate

| Component | Effort |
|-----------|--------|
| `ModulePushWizardDialog.jsx` (new) | ~300-370 lines (mirrors proven Pull wizard pattern) |
| `api.js` change | ~8 lines (additive) |
| `useHierarchyManagement.js` change | ~3 lines (additive) |
| `StoreManagement.jsx` integration | ~15 lines (button + dialog mount) |
| **Total** | **~330-400 lines, 4 files (1 new + 3 modified)** |
| **Estimated time** | 1 session (IMPLEMENTATION role) |
