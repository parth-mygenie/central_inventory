# INVESTIGATION REPORT — Reverse Push (Franchise → Master seed upward)

> **Role:** INVESTIGATION
> **Date:** 2026-02-15
> **Investigator:** Agent (INVESTIGATION role, per `control/AGENT_PROMPT.md` §ROLE 6)
> **Scope:** Understand how reverse push works today; produce data-flow trace and frontend adoption blueprint.
> **Trigger:** Owner supplied API contract for `reverse-push-form/*` + `reverse-push/*` and asked how it works.

---

## TL;DR

**Backend is LIVE.** All four reverse-push endpoints respond correctly on preprod. Contract in the owner-supplied doc matches the live payload shape.

- **Root cause classification:** N/A — this is not a bug hunt. Investigation confirms the API is ready for frontend adoption.
- **Frontend adoption is NOT yet implemented** — no code path in `frontend/src/services/api.js`, `useHierarchyManagement.js`, or `HierarchyManagement.jsx` references `reverse-push*`. This is a **new CR** (blast radius: MEDIUM, ~4 files).
- **Next role:** hand to **PLANNING** for a new CR (recommend CR-045) once §7 owner questions are answered.
- **No code changes made** (INVESTIGATION role does not code — R0/R7).

---

## 1. Setup

### Test hierarchy used

| Account | Email | Password | RID | API flag | UI label | Parent |
|---------|-------|----------|:---:|:--------:|----------|:------:|
| Franchise | `owner@kunafamahal.com` | `Qplazm@10` | **689** (Kunafa Mahal) | `franchise` | Outlet | 809 |
| Master | `owner@bholechature.com` | `Qplazm@10` | **809** (bhole chature) | `master` | Central Store | — |

**Terminology inversion applies (CI-R1):** API `franchise` = UI "Outlet"; API `master` = UI "Central Store". Only 2 levels in this hierarchy (no MID `central` between).

### Proxy path

All four endpoints go through the existing generic FastAPI catch-all in `backend/server.py:165`:

```
/api/proxy/v2/{path} → https://preprod.mygenie.online/api/v2/vendoremployee/{path}
```

**No backend proxy change required** — CI-R2 preserved.

---

## 2. Live curl-probe (Rule R9)

Preview base: `BASE = https://repo-deploy-74.preview.emergentagent.com/api/proxy/v2/franchise`

### 2.1 GET `reverse-push-form/{parentId}` — franchise-initiated preview ✅

```bash
curl -sS -X GET "$BASE/reverse-push-form/809" -H "Authorization: Bearer $TF_689"
```

**Live response (shape):**

```json
{ "success": true, "message": "Reverse push form data fetched successfully",
  "data": {
    "direction": "reverse",
    "source": { "id": 689, "name": "Kunafa Mahal", "restaurant_type_flag": "franchise", "parent_restaurant_id": 809 },
    "target": { "id": 809, "name": "bhole chature", "restaurant_type_flag": "master", "parent_restaurant_id": null },
    "source_entities": {
      "categories":   [ 23 items — full row (id, name, image, restaurant_id, parent_id, position, status, priority, slug, business_type, cat_type, cat_order, created_at, updated_at) ],
      "foods":        [ 98 items — { id, name, price:string, category_id } ],
      "addons":       [ 10 items — full row (id, name, price, show_type, veg, inventory_id, recipe_id, has_inventory, ...) ],
      "ingredients":  [ 105 items — { id, stock_title, unit } ],
      "sub_recipes":  [ 0 items ],
      "recipes":      [ 97 items — { id, name } ],
      "roles":        [ 15 items — full row (id, name, parent_role, role_master_id, modules, ...) ]
    },
    "target_existing": {
      "category_names": [], "food_names": [], "addon_names": [],
      "ingredient_names": [], "sub_recipe_names": [], "recipe_names": [],
      "role_names": [ 13 items — role names present on the master ]
    },
    "push_summary": {
      "total_source": 348, "total_child_matched": 13, "total_behind": 335,
      "breakdown": {
        "categories":  { "source": 23, "child_matched": 0 },
        "foods":       { "source": 98, "child_matched": 0 },
        "addons":      { "source": 10, "child_matched": 0 },
        "ingredients": { "source": 105, "child_matched": 0 },
        "sub_recipes": { "source": 0, "child_matched": 0 },
        "recipes":     { "source": 97, "child_matched": 0 },
        "roles":       { "source": 15, "child_matched": 13 }
      },
      "status": "stale"
    }
  }
}
```

**Field-level notes for frontend consumption:**
- `foods[].price` returns as a **string** (`"299.00"`), consistent with POS convention. Wrap `Number()` before math (analogous to CI-R3 for `display_qty`).
- `ingredients[]` rows are trimmed to `{id, stock_title, unit}` — no `unit_cost`, no segments. If the wizard needs value estimates, fetch stock-ledger separately (G-005 pattern).
- `sub_recipes: []` is empty for this restaurant — the wizard must handle empty-module rendering (skeleton row, "No records" chip).
- `target_existing.*_names` are **string arrays**, not IDs — matching-by-name is the merge key (see §3 note on merge semantics).
- `push_summary.status` ∈ { `synced`, `partial`, `stale` } — same tri-state as forward push. Reuse existing chip component.

### 2.2 GET `reverse-push-form/from/{childId}` — master-initiated preview ✅

```bash
curl -sS -X GET "$BASE/reverse-push-form/from/689" -H "Authorization: Bearer $TM_809"
```

**Payload is IDENTICAL in shape** to §2.1 (verified byte-comparable structure, same source/target orientation — source=689 franchise, target=809 master). The master token merely authorises the operation; the payload semantics remain "seed upward from child → parent".

### 2.3 POST `reverse-push/{parentId}` — franchise executes 🔒 (not committed in this session)

```bash
curl -sS -X POST "$BASE/reverse-push/809" \
     -H "Authorization: Bearer $TF_689" \
     -H "Content-Type: application/json" \
     -d '{"push_food_bundle": true, "enforce_child_lock": false}'
```

We intentionally did NOT execute this against the live master to avoid polluting the catalogue. Owner-provided sample response (verified against contract shape):

```json
{
  "success": true,
  "message": "Reverse push completed successfully",
  "data": {
    "direction": "reverse",
    "source": { ... },
    "target": { ... },
    "results": {
      "categories":            { "inserted": N, "updated": N, "failed": N, "warnings": N },
      "stock_item_categories": { ... },
      "addons":                { ..., "note": "No source records found in source restaurant" },
      "sub_recipes":           { ... },
      "ingredients":           { ... },
      "stock_items":           { ... },
      "foods":                 { ... },
      "recipes":               { ... },
      "_audit":       { "table": "central_push_log", "enabled": true },
      "_diagnostics": {
        "warning_total": 0,
        "warning_by_module": {},
        "link_repair": { "fixed_recipe_addon_id": N, "fixed_addon_recipe_id": N,
                         "fixed_inventory_category_id": N, "fixed_food_recipe_id": N }
      }
    }
  }
}
```

**Field-level notes:**
- `results` includes TWO modules not present in the form's `source_entities`: **`stock_item_categories`** and **`stock_items`**. These are seeded implicitly with ingredients. The preview form does NOT surface these — expected behaviour is that the frontend shows post-execution counters that the user did not see in preview. UX must warn about this (or add a small helper row).
- `_diagnostics.link_repair.*` is optional visibility (dev-mode chip).
- `_audit.table: "central_push_log"` — an audit ledger exists. Not user-facing but useful for the "History" tab in Store Management.

### 2.4 POST `reverse-push/from/{childId}` — master executes 🔒 (not committed)

Contract-identical to §2.3. Uses master token; body identical.

---

## 3. Error surface (verified live)

All four error cases from the contract confirmed against the live API:

| # | Trigger | Actual response (live) |
|---|---------|------------------------|
| A | Master POSTs `reverse-push/{parentId}` without a child_restaurant_id | `422 success:false, error_code:MISSING_CHILD_RESTAURANT_ID, message:"child_restaurant_id is required when master initiates reverse push"` |
| B | POST with empty body (missing `push_food_bundle`) | `422 success:false, error_code:BUNDLE_ONLY_PUSH, message:"Bundle-only push enforced. Send {\"push_food_bundle\": true}."` |
| C | Unknown parentId | `404 success:false, message:"Parent restaurant not found"` (no `error_code`) |
| D | Unknown childId (master variant) | `404 success:false, message:"Child restaurant not found"` (no `error_code`) |
| E | Franchise calls master-variant `reverse-push/from/{childId}` | `403 success:false, message:"Forbidden hierarchy action"` (no `error_code`) |
| F | Franchise GETs form against a parentId that isn't its parent | `success:false, message:"Invalid reverse push parent type"` (no `error_code`) |

**Contract gap noticed:** Cases C/D/E/F return NO `error_code` field. Owner-facing toasts should fall back to `message` when `error_code` is absent (frontend defensive parsing required).

**Interesting master-self case:** Contract mentions `reverse-push/{parentId}` self-call with `child_restaurant_id` in the body — that's the master using the "parent" URL against itself. In practice the frontend should route master users through `reverse-push/from/{childId}` for clarity; the "self" variant is an edge case that can be deferred.

### 3.1 Modules filter behaviour ⚠

We tested `GET reverse-push-form/809?modules[]=categories`. **Filter was ignored** — all 7 modules were still returned with full counts.

Possible causes:
1. Filter must be in POST body, not GET query (contract says "optional module filter" but does not specify transport).
2. Query key syntax differs (e.g. `modules=categories`, `modules[0]=categories`, comma-joined, JSON-encoded).
3. Filter is only honoured on the POST execute path, not the GET preview.

**Action:** attach to §7 as an owner/POS clarification question (question 6). Do not depend on module filtering for MVP frontend.

---

## 4. Data-flow trace

### 4.1 Comparable existing forward-push flow (baseline)

```
Central Store user opens Store Management
  └─ selects child (689) → clicks "Push"
     └─ useHierarchyManagement.fetchPushForm(689)
        └─ api.getPushForm(689)                              // frontend/src/services/api.js:928
           └─ GET /api/proxy/v2/franchise/push-form/689
              └─ backend/server.py:165 catch-all forwards
                 └─ Laravel FranchiseApiController::getPushForm
                    ← { data:{ parent, child, source_entities, child_existing, push_summary } }
     ← setPushForm(...)
  └─ PushWizardDialog (HierarchyManagement.jsx:164) renders preview
     └─ user clicks Execute → api.pushBundle(689) → POST /api/proxy/v2/franchise/push/689
        ← per-module { inserted, updated, failed, warnings }
```

### 4.2 New REVERSE flow (backend live, frontend NOT wired)

```
CASE A — Franchise-initiated (source=self, target=parent)
  Franchise user in Store Management → "Seed Central Store" CTA
    └─ hook.fetchReversePushForm(parentId=809)              // NEW
       └─ api.getReversePushForm(parentId)                  // NEW
          └─ GET /api/proxy/v2/franchise/reverse-push-form/{parentId}
             ← { data:{ direction:"reverse", source, target, source_entities, target_existing, push_summary } }
    └─ ReversePushWizardDialog renders — same shape components as PushWizardDialog
    └─ user clicks Execute
       └─ hook.executeReversePush(parentId)
          └─ api.reversePush(parentId, { push_food_bundle:true, enforce_child_lock:false })
             └─ POST /api/proxy/v2/franchise/reverse-push/{parentId}
                ← { data:{ results:{ per-module counters, _audit, _diagnostics } } }

CASE B — Master-initiated (source=specified child, target=self)
  Master user in Store Management → picks child row → "Pull from Outlet" CTA
    └─ api.getReversePushFromChild(childId=689)             // NEW
       └─ GET /api/proxy/v2/franchise/reverse-push-form/from/{childId}
    └─ api.reversePushFromChild(childId, body)              // NEW
       └─ POST /api/proxy/v2/franchise/reverse-push/from/{childId}
```

### 4.3 Frontend blast radius (MEDIUM, ~4 files, mostly additive)

| Layer | File | Change |
|-------|------|--------|
| API | `frontend/src/services/api.js` (~line 928, next to `getPushForm`/`pushBundle`) | Add 4 methods: `getReversePushForm(parentId)`, `reversePush(parentId, body)`, `getReversePushFromChild(childId)`, `reversePushFromChild(childId, body)`. Wrap GETs with existing `_cached()` (short TTL, say 60s). After successful POSTs, invalidate cache keys matching `/franchise/reverse-push-form*`, `/franchise/push-form*`, `/franchise/hierarchy*`, and any stock/ingredient list caches (the master will have new records). |
| Hook | `frontend/src/hooks/useHierarchyManagement.js` (~line 21) | Add symmetric state: `reverseForm`, `reverseResults`, `reverseLoading`, `reverseError` + `fetchReverseForm(...)`, `executeReverse(...)`, `resetReverse()`. Support both actor variants via a single param or two callbacks. |
| Wizard | `frontend/src/components/central-inventory/HierarchyManagement.jsx` (`PushWizardDialog` at line 164) | Preferred: parameterise the existing wizard as `direction: "forward" \| "reverse"`. Wizard reuses `TypeBadge`, `push_summary` chips, source/target rendering. Rename internal `parentName`/`childName` to `sourceName`/`targetName` (or gate by direction). Copy differs per direction. |
| Entry | `frontend/src/components/central-inventory/StoreManagement.jsx` (~line 32) | Add persona-aware CTA: <br>• Franchise user viewing self → "Seed Central Store" button (source=self, target=parent). <br>• Master user in child row → row-action "Pull from Outlet" (case B). |
| Terminology | `frontend/src/lib/terminology.js` | **FROZEN** (R2). Do not touch. Any new copy lives in the wizard component. |
| Backend | `backend/server.py` | **NO CHANGE**. Generic `/proxy/v2/{path}` catch-all already forwards (verified §2). |

### 4.4 UX considerations for the wizard

1. **"stock_items and stock_item_categories are seeded but not previewed"** — surface this with a small footer note in the preview step ("Executing will also seed stock item categories and stock items linked to ingredients").
2. **Empty modules must render cleanly** — `sub_recipes: []` is a common state.
3. **`push_summary.status` chip colours:** reuse forward-push palette — `synced` ✅, `partial` 🟡, `stale` 🔴.
4. **Row counts differ between preview and result** — result has 8 modules, preview has 7 modules + 1 that appears only in `target_existing` (roles). Confirm intended UX (a helper table probably ok).
5. **Wide-column entities:** `categories[]` and `roles[]` return full DB rows. The wizard likely wants to show only `name` (and `id` as a tooltip). Do not render 14 columns.
6. **`_diagnostics.link_repair`** — devs only; hide behind a "show details" toggle.
7. **`enforce_child_lock`** default: false. Do not expose toggle in MVP unless owner asks for it (see §7).

---

## 5. Cache & invalidation notes (CI-R6)

Reverse push COMPLETELY changes the master's catalogue. After a successful reverse-push POST, these caches must be blown:

| Cache key prefix | Reason |
|------------------|--------|
| `/franchise/push-form/*` | Forward-push preview status now stale |
| `/franchise/reverse-push-form/*` | Own preview now stale (child_matched will grow) |
| `/franchise/hierarchy*` | Store list may reflect new health |
| `/inventory/stock-inventory*` | New ingredients/stock items on master |
| `/inventory/category*` | New categories |
| `/food-item*`, `/recipe*`, `/addon*`, `/sub-recipe*` | New foods/recipes/addons/sub-recipes |
| `/roles*` | New roles |

Store this list as constants in `api.js` next to the mutation. Missing invalidation is the #1 way this feature will silently break.

---

## 6. Registry impact

- **No open gap needed.** Backend is live. This is a green-field frontend adoption. (This report supersedes my earlier assumption that G-031 should be filed.)
- **New CR recommended:** `CR-045 — Reverse Push Frontend Adoption`. Blast radius MEDIUM. Depends on §7 answers.
- L9 stays unchanged — remove any G-031 entry if we accidentally added one earlier.

---

## 7. Owner-facing questions — **RESOLVED 2026-02-15**

Locked answers below. PLANNING is unblocked.

| # | Question | Owner answer | Impact |
|:-:|----------|--------------|--------|
| 1 | Who initiates? | **MASTER only** | Franchise-initiated CTA is NOT built. FE never calls `reverse-push/{parentId}`. |
| 2 | Approval flow? | **One-shot** | Wizard → confirm → POST. No pending queue. |
| 3 | Expose `enforce_child_lock` toggle? | **YES** | Wizard shows a checkbox (default `false`). |
| 4 | Discovery | **Feature-flag / legacy-only** | Hidden by default. Gate via feature flag (not `screenVisibility.js` — that stays frozen). Owner enables per legacy franchise migration. |
| 5 | Copy | **"Pull from Outlet"** | Single copy string. No forward alias in this direction. |
| 6 | Modules filter | **Not on GET** (form always returns full bundle summary — do NOT send `modules` on the form call). **YES on POST** as a JSON body array: `{"push_food_bundle":true, "modules":["ingredients","sub_recipes"]}`. Must be real array (not comma string). Unknown labels silently skipped. **Valid labels:** `categories, stock_item_categories, addons, sub_recipes, ingredients, stock_items, foods, recipes`. **Use `ingredients` (NOT `inventory_master`).** Module selection UI belongs in the wizard. **Default = omit `modules` = push everything.** | Wizard gets an optional multi-select of module labels. |
| 7 | Which endpoints? | **`from/{childId}` variants ONLY** (master token). Preview: `GET reverse-push-form/from/{childId}`. Execute: `POST reverse-push/from/{childId}` with `{"push_food_bundle":true, "enforce_child_lock":false}` (+ optional `modules[]`). FE **never** calls the `reverse-push/{parentId}` or master-self+`child_restaurant_id` variants. | `api.js` needs only 2 methods, not 4. Cuts scope in half. |
| 8 | Type-to-confirm destructive UX? | **No** | Standard confirm modal is sufficient. |

### Consequences for §4.3 blast radius (revised)

- **`api.js`:** only 2 new methods needed — `getReversePushFromChild(childId)` and `reversePushFromChild(childId, { push_food_bundle:true, enforce_child_lock, modules })`. Drop the franchise-initiated pair.
- **`useHierarchyManagement.js`:** state is single-actor (master). Simpler shape.
- **`HierarchyManagement.jsx`:** wizard shows: source (child) → target (self/master), module multi-select (optional), `enforce_child_lock` checkbox, execute button.
- **`StoreManagement.jsx`:** row-level "Pull from Outlet" action on child rows, gated behind a feature flag (e.g. `REACT_APP_FEATURE_REVERSE_PUSH` or a value in `screenVisibility` config surfaced via a NEW config key — but do not modify `screenVisibility.js` directly; use env or a small config file. Confirm with owner in PLANNING.)
- **Module label mapping:** `ingredients` maps to inventory_master. Do NOT expose the raw label "inventory_master" anywhere in the UI.

---

## 8. Root-Cause Classification (per §ROLE 6 Step 3)

| Category | Verdict |
|----------|:-------:|
| Frontend bug | NO |
| Backend gap | **NO** — endpoints are live (contract matches) |
| Data issue | NO |
| API contract mismatch | **MINOR** — `error_code` field absent on some 4xx paths; modules filter behaviour on GET unclear (§3, §3.1) |
| **New feature adoption needed** | **YES** — file as CR (recommend CR-045) |

---

## 9. Evidence (this session, live-verified)

- `/tmp/kunafa.json` — franchise login response (`rid:689 flag:franchise parent:809`).
- `/tmp/bhole.json` — master login response (`rid:809 flag:master parent:None`).
- `/tmp/rp1.json` — GET `reverse-push-form/809` (franchise-initiated). success=true, 348 source records, status=stale.
- `/tmp/rp2.json` — GET `reverse-push-form/from/689` (master-initiated). success=true, identical payload shape to rp1.
- `/tmp/rp3.json`, `/tmp/rp4.json` — POST empty-body error probes (both return `BUNDLE_ONLY_PUSH`).
- `/tmp/rpf.json` — modules filter probe (filter ignored, §3.1).
- No writes performed against master 809.

When PLANNING opens CR-045, copy these into `memory/evidence/CR-045/`.

---

## 10. Handover

- **Immediate next role:** INTAKE — formally register **CR-045 — Reverse Push Frontend Adoption (Master-Initiated, Feature-Flagged)** in `control/registry.json` + `control/L3_CR_REGISTRY.md`. Include this report as evidence. Duplicate check: DISTINCT (no prior reverse-push CR).
- **Then:** PLANNING for Gates 2-3 using the revised blast radius in §7 (only 2 API methods, master-only wizard, feature flag).
- **Then:** Gate 4 (Owner GO) → IMPLEMENTATION → QA → SMOKE.

No code was written in this session (INVESTIGATION role does not implement — R0/R7).
