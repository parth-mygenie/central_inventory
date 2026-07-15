# CR-045 — Intake (Artifact #1)

# Reverse Push Frontend Adoption (Master-Initiated, Feature-Flagged)

---

## Problem Statement

The POS backend on `preprod.mygenie.online` has shipped a **reverse push** capability that lets a **Master** (Central Store) seed its catalogue **upward from a legacy Franchise (Outlet)** — the inverse of the existing forward push. Live curl-probe against `owner@bholechature.com` (master 809) ↔ `owner@kunafamahal.com` (franchise 689) confirms all four endpoints respond with success and the payload shape matches the owner-supplied contract.

The Central Inventory frontend has **no code path for reverse push today** (verified: `grep reverse-push frontend/src` → 0 hits). Masters must currently ask backend/DB support to seed their catalogue from a legacy outlet, which is manual, error-prone, and blocks self-serve migration onboarding.

### Source

- **Owner-supplied** API contract (2026-02-15 chat).
- **Live-verified** in Investigation Report `control/sessions/INVESTIGATION_REPORT_REVERSE_PUSH_20260215.md` (this session).

### Symptoms / Business impact

1. Legacy franchises that predate their master's catalogue cannot self-migrate. Ops team runs the pull server-side, one migration at a time.
2. No UI feedback on "how much would be pulled" — masters can't preview the delta before committing.
3. Onboarding lead time for a new master with N legacy outlets scales linearly with manual work.

### Root Cause

Missing feature (green-field). Not a bug.

---

## Scope

### In Scope (per owner-locked answers in Investigation Report §7)

| # | Item | File | Estimate |
|---|------|------|----------|
| 1 | Add `getReversePushFromChild(childId)` + `reversePushFromChild(childId, {push_food_bundle, enforce_child_lock, modules})` | `frontend/src/services/api.js` (~line 928, near `getPushForm`/`pushBundle`) | ~40 lines + cache invalidation constants |
| 2 | Add master-only reverse state + callbacks (`reverseForm`, `reverseResults`, `reverseLoading`, `reverseError`, `fetchReverseForm`, `executeReverse`, `resetReverse`) | `frontend/src/hooks/useHierarchyManagement.js` (~line 21) | ~60 lines |
| 3 | Parameterise / extend `PushWizardDialog` for reverse direction: source(child) → target(self/master), optional module multi-select, `enforce_child_lock` checkbox, per-module results renderer | `frontend/src/components/central-inventory/HierarchyManagement.jsx` (dialog at line 164) | ~120 lines |
| 4 | Row-level "Pull from Outlet" action on child rows (master persona only), gated behind a feature flag | `frontend/src/components/central-inventory/StoreManagement.jsx` (~line 32) | ~30 lines |
| 5 | Feature flag primitive (options: env var OR new `frontend/src/lib/featureFlags.js`) — decision in PLANNING | new file OR `.env` | ~10 lines |

### Out of Scope

- **Franchise-initiated reverse push** — owner: MASTER only. FE never calls `POST /franchise/reverse-push/{parentId}` or the master-self+`child_restaurant_id` variant. Only the two `from/{childId}` endpoints.
- **`backend/server.py`** — proxy-only, generic `/proxy/v2/{path}` catch-all already forwards (verified §2.5 of investigation).
- **`frontend/src/lib/terminology.js`** — **FROZEN** (R2). New copy lives in the wizard component.
- **`frontend/src/lib/screenVisibility.js`** — **FROZEN** (R2). Do NOT add visibility rules there. Use the feature flag primitive instead.
- **Destructive-write confirmation UX** (type-name-to-execute) — owner: NO.
- **Approval / pending queue** — owner: one-shot.
- **Audit history tab** — `_audit.table:"central_push_log"` exists in the POST response but exposing it in UI is deferred.
- **Modules filter on GET** — owner: not supported. Filter is POST-body only. Do not send `modules` on the form call.

---

## Requirements

### R1 — Preview endpoint wired

- `api.getReversePushFromChild(childId)` calls `GET /api/proxy/v2/franchise/reverse-push-form/from/{childId}`.
- Response `{ data: { direction, source, target, source_entities, target_existing, push_summary } }` surfaced via `useHierarchyManagement.reverseForm`.
- Wrapped in the existing `_cached()` layer with a short TTL (60s recommended).
- `foods[].price` treated as string; `Number()`-wrap before arithmetic (CI-R3 pattern).

### R2 — Execute endpoint wired

- `api.reversePushFromChild(childId, body)` calls `POST /api/proxy/v2/franchise/reverse-push/from/{childId}` with:
  - `push_food_bundle: true` (always)
  - `enforce_child_lock: <boolean>` (from wizard checkbox, default `false`)
  - `modules: [...]` (optional; omit if user did not narrow selection; **real array**, not comma string)
- On success, cache-invalidates: `/franchise/push-form/*`, `/franchise/reverse-push-form/*`, `/franchise/hierarchy*`, `/inventory/stock-inventory*`, `/inventory/category*`, `/food-item*`, `/recipe*`, `/addon*`, `/sub-recipe*`, `/roles*`.

### R3 — Wizard UX (master persona only)

- Reads `reverseForm` → renders source (Outlet) → target (Central Store/self) with `TypeBadge`.
- Preview step shows per-module counts from `push_summary.breakdown`, status chip (`synced` / `partial` / `stale`), and side-by-side `source_entities` vs `target_existing` (name-only column; full DB rows collapsed).
- Optional multi-select for `modules` labels: `categories, stock_item_categories, addons, sub_recipes, ingredients, stock_items, foods, recipes`. Default = "All". `ingredients` label maps to inventory_master; **do NOT expose the raw `inventory_master` label**.
- Checkbox for `enforce_child_lock` (default off), with tooltip explaining the parent-control implication.
- Execute button confirms in-place (no type-name-to-confirm).
- Results step renders the 8 result modules including `stock_item_categories` and `stock_items` that were NOT in the preview (footer note).
- `_diagnostics.link_repair` shown behind a "Show details" toggle. `_audit` hidden.

### R4 — Discovery gated by feature flag

- "Pull from Outlet" row action on child rows in `StoreManagement.jsx`, **hidden unless the feature flag is on**.
- Only shown when actor is `restaurant_type_flag === "master"` AND the row is a `franchise`.
- Flag mechanism finalised in PLANNING (Gate 3).

### R5 — Error handling

Frontend must handle these live-verified error responses gracefully (fallback to `message` when `error_code` is absent):

| `error_code` | Message | Toast copy suggestion |
|--------------|---------|-----------------------|
| `BUNDLE_ONLY_PUSH` | Bundle-only push enforced. | (should never occur — we always send `push_food_bundle:true`; log if seen) |
| _none_ (403) | Forbidden hierarchy action | "You can't pull from this outlet." |
| _none_ (404) | Parent/Child restaurant not found | "Outlet not found. Refresh and try again." |
| _none_ | Invalid reverse push parent type | "Outlet is not eligible for reverse push." |

### R6 — No regression

- Forward push (`getPushForm` + `pushBundle`) continues to work in `HierarchyManagement.jsx` and `StoreManagement.jsx`.
- Non-master users do not see any new UI (no data-testid, no CTA, no wizard entry).
- Franchise users see NO reverse-push CTA even with the flag on (out of scope per owner).

---

## API Contract Reference (live-verified 2026-02-15)

### GET `reverse-push-form/from/{childId}` (master token)

Response shape:

```json
{
  "success": true,
  "message": "Reverse push form data fetched successfully",
  "data": {
    "direction": "reverse",
    "source": { "id": <childId>, "restaurant_type_flag": "franchise", "parent_restaurant_id": <masterId> },
    "target": { "id": <masterId>, "restaurant_type_flag": "master", "parent_restaurant_id": null },
    "source_entities": {
      "categories":  [ /* full rows */ ],
      "foods":       [ { "id","name","price":"string","category_id" } ],
      "addons":      [ /* full rows */ ],
      "ingredients": [ { "id","stock_title","unit" } ],
      "sub_recipes": [ ],
      "recipes":     [ { "id","name" } ],
      "roles":       [ /* full rows */ ]
    },
    "target_existing": {
      "category_names": [], "food_names": [], "addon_names": [],
      "ingredient_names": [], "sub_recipe_names": [], "recipe_names": [], "role_names": []
    },
    "push_summary": {
      "total_source": N, "total_child_matched": N, "total_behind": N,
      "breakdown": { "<module>": { "source": N, "child_matched": N }, ... },
      "status": "synced" | "partial" | "stale"
    }
  }
}
```

**Do NOT send `modules` query param on this endpoint** — owner confirmed it is ignored.

### POST `reverse-push/from/{childId}` (master token)

Body:

```json
{
  "push_food_bundle": true,
  "enforce_child_lock": false,
  "modules": ["ingredients","sub_recipes"]
}
```

- `modules` is **optional**. Omit = push everything (default).
- Must be a **real JSON array**, not a comma-joined string.
- Unknown labels are silently skipped.
- Valid labels: `categories, stock_item_categories, addons, sub_recipes, ingredients, stock_items, foods, recipes`.
- Use `ingredients` for the inventory_master table — **not** `inventory_master`.

Response (contract):

```json
{
  "success": true,
  "message": "Reverse push completed successfully",
  "data": {
    "direction": "reverse",
    "source": {...},
    "target": {...},
    "results": {
      "categories":            { "inserted":N,"updated":N,"failed":N,"warnings":N },
      "stock_item_categories": { ... },
      "addons":                { ..., "note": "No source records found in source restaurant" },
      "sub_recipes":           { ... },
      "ingredients":           { ... },
      "stock_items":           { ... },
      "foods":                 { ... },
      "recipes":               { ... },
      "_audit":       { "table": "central_push_log", "enabled": true },
      "_diagnostics": {
        "warning_total": N,
        "warning_by_module": {},
        "link_repair": { "fixed_recipe_addon_id":N, "fixed_addon_recipe_id":N,
                         "fixed_inventory_category_id":N, "fixed_food_recipe_id":N }
      }
    }
  }
}
```

---

## Duplicate Check

- **Registry keyword scan** for `reverse`, `pull from outlet`, `seed upward`, `reverse-push` across `control/registry.json`, `L3_CR_REGISTRY.md`, `L4_BUG_TRACKER.md` → 0 hits.
- **Code reality check** for `reverse-push`, `reversePush`, `reverse_push` across `frontend/src/`, `backend/` → 0 hits (see Investigation Report §Code Reality section).
- **File overlap:** `services/api.js`, `hooks/useHierarchyManagement.js`, `components/central-inventory/HierarchyManagement.jsx`, `components/central-inventory/StoreManagement.jsx` — all previously touched by earlier CRs (CR-023 through CR-044), no items in the pipeline currently blocked on these files (per registry scan, only CR-044 status=`QA_PASS` awaiting owner signoff — not a merge conflict).

**Classification: DISTINCT.**

---

## Severity

Per rubric in `AGENT_PROMPT.md`:

| Severity | Trigger | Applies? |
|:---:|---|:---:|
| P0 | Stock data corruption, data loss, auth bypass | NO |
| P1 | Feature broken, no workaround, crash on core flow | NO — no existing feature is broken |
| **P2** | **Works but awkward** — self-serve migration workaround requires backend/DB help | **YES** |
| P3 | Dead code, missing test, doc stale | NO |

**Agent classification: P2** — feature-flagged legacy migration utility. Owner: confirm.

---

## Blast Radius

Grep-based estimate (`grep -rn` on target keywords in `frontend/src/`):

| File | Existing lines (roughly) | Added lines (est.) |
|------|:------------------------:|:------------------:|
| `services/api.js` | ~1144 | ~40 |
| `hooks/useHierarchyManagement.js` | ~146 | ~60 |
| `components/central-inventory/HierarchyManagement.jsx` | ~720 | ~120 |
| `components/central-inventory/StoreManagement.jsx` | ~500 | ~30 |
| new feature-flag file OR .env | 0 | ~10 |

- Blast radius: ~4-5 files (+1 optional new file).
- Hotspot files touched: `api.js` (HIGH-RISK — cache layer, R5). Yes.
- **Estimated scope: MEDIUM.**

---

## Open Questions / Owner Decisions Needed (for PLANNING)

1. **Feature flag mechanism:**
   - **(a)** env var `REACT_APP_FEATURE_REVERSE_PUSH=true`
   - **(b)** new file `frontend/src/lib/featureFlags.js` with per-flag booleans
   - **(c)** per-restaurant flag from the API (heavier — needs backend)

   Agent recommendation: **(b)** — small, discoverable, no env-per-deploy hassle, doesn't touch frozen files.

2. **Cache-invalidation blast:** after a successful reverse push, do we invalidate all 10 cache prefixes listed in Investigation §5, or start conservatively (just `/franchise/*` + `/inventory/stock-inventory*` + `/roles*`) and expand if we see stale reads? PLANNING should decide with performance context in mind.

3. **Wizard placement:** row-action on child row (space-efficient) or full-screen dialog CTA in Store Detail (more discoverable)? Owner said "row action" implicitly by choosing "Pull from Outlet" copy — confirm in Gate 4.

---

## Evidence

- **Investigation Report:** `control/sessions/INVESTIGATION_REPORT_REVERSE_PUSH_20260215.md` (this session)
- **Live curl outputs:** `/tmp/rp1.json`, `/tmp/rp2.json`, `/tmp/rp3.json`, `/tmp/rp4.json`, `/tmp/rpf.json` (ephemeral — should be copied to `memory/evidence/CR-045/` in PLANNING)
- **Login evidence:** `/tmp/kunafa.json` (franchise 689 token), `/tmp/bhole.json` (master 809 token)
- **Confidence:** CONFIRMED (all four endpoints reproduced live, all error cases reproduced live, contract shape matches owner-supplied doc)
- **Source:** OWNER-REPORTED + AGENT-VERIFIED

---

## Handover (→ PLANNING)

Item **CR-045** registered. Intake at `control/sessions/CR045_ARTIFACT_1_INTAKE.md`.

- Code reality: **NONE** (green-field frontend adoption).
- Duplicate check: **DISTINCT**.
- Severity: **P2** (agent-classified; awaiting owner confirmation).
- Blast radius: **MEDIUM** (~4-5 files, `api.js` hotspot touched).
- Evidence: **Live-captured** (curl + investigation report).
- Owner decisions needed:
  1. Feature-flag mechanism (recommend option b: `frontend/src/lib/featureFlags.js`).
  2. Cache invalidation strategy (broad vs conservative).
  3. Wizard placement confirmation.

Next: PLANNING agent for Gates 2-3 (Impact Analysis + Implementation Plan). Then Owner Gate 4 GO → IMPLEMENTATION.
