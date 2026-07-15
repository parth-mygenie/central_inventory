# CR-045 — Impact Analysis + Implementation Plan (Artifacts #2 + #3)

# Reverse Push Frontend Adoption (Master-Initiated, Feature-Flagged)

---

> **Author:** PLANNING agent
> **Date:** 2026-02-15
> **Intake:** `control/sessions/CR045_ARTIFACT_1_INTAKE.md`
> **Investigation:** `control/sessions/INVESTIGATION_REPORT_REVERSE_PUSH_20260215.md`
> **Code Reality:** NONE (green-field frontend adoption; backend live)
> **Scope Lock:** Files WILL change → `services/api.js`, `hooks/useHierarchyManagement.js`, `components/central-inventory/StoreManagement.jsx`, `components/central-inventory/ReversePushWizardDialog.jsx` (**NEW**), `lib/featureFlags.js` (**NEW**), `.env.example` (docs). Files that will NOT be touched → `terminology.js` (frozen), `screenVisibility.js` (frozen), `backend/server.py` (proxy-only), `HierarchyManagement.jsx` (out of primary user flow — mounting via `StoreManagement.jsx` only).

---

## PART A — Impact Analysis (Gate 2)

### A.1 Data-flow trace

```
Master user opens Store Management (/stores)
  └─ StoreManagement.jsx renders row per child (already exists)
      └─ NEW: if isMaster && child.restaurantTypeFlag === "franchise" && FEATURE_REVERSE_PUSH
              → show "Pull from Outlet" row action
      └─ user clicks → setReversePullTarget(child)
         └─ ReversePushWizardDialog mounts (NEW)
             ├─ useEffect → hook.fetchReverseForm(child.id)
             │    └─ api.getReversePushFromChild(child.id)                 // NEW
             │       └─ GET /proxy/v2/franchise/reverse-push-form/from/{childId}
             │          → server.py:165 catch-all → PREPROD Laravel
             │          ← { success, data:{ direction:"reverse", source, target, source_entities, target_existing, push_summary } }
             │    → setReverseForm(...)
             ├─ Preview step renders: source (child) → target (self/master),
             │   push_summary chip, per-module counters, optional module multi-select,
             │   enforce_child_lock checkbox
             └─ user clicks "Pull Now"
                 └─ hook.executeReverse(child.id, { push_food_bundle:true, enforce_child_lock, modules? })
                    └─ api.reversePushFromChild(child.id, body)             // NEW
                       └─ POST /proxy/v2/franchise/reverse-push/from/{childId}
                          ← { data:{ results:{ 8 modules + _audit + _diagnostics } } }
                    → cache invalidation (catalog + hierarchy)
                    → setReverseResults(...) → Results step renders
```

### A.2 Affected files (with line references)

| # | File | Lines Touched (approx) | Risk | Downstream Consumers |
|:-:|------|-----------------------|:----:|----------------------|
| 1 | `frontend/src/lib/featureFlags.js` **NEW** | ~15 (whole file) | LOW | Imported by StoreManagement.jsx |
| 2 | `frontend/src/services/api.js` | +~40 near line 928 (`getPushForm`/`pushBundle` neighbourhood); +~15 near line 128 (new `_invalidateCatalogCaches` helper); +2 lines in export block near 1236 | **MEDIUM** (hotspot file, R5) | Called by useHierarchyManagement.js |
| 3 | `frontend/src/hooks/useHierarchyManagement.js` | +~60 (state block ~line 21, callbacks ~line 86, return block ~line 138) | LOW | Consumed by StoreManagement.jsx |
| 4 | `frontend/src/components/central-inventory/ReversePushWizardDialog.jsx` **NEW** | ~240 (whole file) | MEDIUM (UX-heavy) | Mounted by StoreManagement.jsx |
| 5 | `frontend/src/components/central-inventory/StoreManagement.jsx` | +~25 (import + state + row-action + mount) | LOW | End-user UI |
| 6 | `frontend/.env` (docs only — do NOT auto-add) | 0 (protected file, R-CRITICAL) | none | Owner opts in manually |

**Total scope:** 2 new files, 3 modified files, ~380 net new lines. Blast radius **MEDIUM** as declared in intake.

### A.3 Conflict pre-check (L7)

- `api.js` — last touched by CR-037→044 batch (2026-07-11); no in-progress items currently editing it.
- `useHierarchyManagement.js` — last touched during P23 baseline; no in-progress items.
- `StoreManagement.jsx` — last touched by CR-043 (CatalogPolicyCard, G-029) and BUG-040 (indirect outlet labels); no in-progress items on it. **Parallel-safe** with any pending CR that doesn't also touch this file.
- `HierarchyManagement.jsx` — NOT touched by this CR (deliberate — reduce risk).
- `terminology.js`, `screenVisibility.js` — FROZEN, not touched. ✓

**Verdict:** No conflicts. Execute independently of any other in-progress item.

### A.4 Risk register

| # | Risk | Severity | Mitigation |
|:-:|------|:--------:|------------|
| R1 | `api.js` cache layer regression — new cache key clashes with existing `getPushForm:*` prefix | HIGH | Use distinct cache key namespace `getReversePushFromChild:*`; add new `_invalidateCatalogCaches()` helper with clearly scoped prefix list; run smoke test against forward push after edits (verify no invalidation of forward-push preview when reverse fires — should invalidate both intentionally). |
| R2 | Modules multi-select silently pushes wrong scope (unknown labels skipped by backend) | MEDIUM | Frontend uses a **whitelist constant** for the 8 valid labels (typed source-of-truth in `api.js`); wizard renders only those. `inventory_master` label banned in wizard copy (Investigation §7-q6). |
| R3 | Master accidentally pulls from wrong outlet (destructive relative to master state) | MEDIUM | Owner explicitly declined type-to-confirm (Q8). Mitigation: preview shows target = master's own name and totals; confirm modal shows both. |
| R4 | `foods[].price` as string → NaN if used in arithmetic in wizard | LOW | Wizard only displays counts, not prices. If a future rev shows price, wrap `Number()` (CI-R3). |
| R5 | Feature flag envelope forgotten (feature accidentally exposed to non-legacy masters) | HIGH | Two-gate check: `isMaster && child.restaurantTypeFlag === "franchise" && FEATURE_REVERSE_PUSH`. Default `FEATURE_REVERSE_PUSH = false` in `featureFlags.js`. Owner explicitly opts in per deploy via env override. |
| R6 | Post-execute stale reads on Store Management (child_matched counts still show old value) | MEDIUM | On successful POST, invalidate `getPushForm:*` AND `getReversePushFromChild:*` cache keys. StoreManagement's push-status polling naturally re-fetches on next render tick. |
| R7 | Race: user re-opens wizard mid-mutation → duplicate POST | LOW | Existing `pushLoading` pattern in the hook (single-flight) reused as `reverseLoading`; execute button disabled while `reverseLoading` is true. |
| R8 | Error code missing on 4xx paths (§3 of investigation) | LOW | Frontend defensive: fall back to `message` when `error_code` is absent; user-friendly toast copy in R5 of intake. |

### A.5 Verification matrix (seeds Gate 6 QA test cases)

| # | File | Change | How to Verify | Automated? |
|:-:|------|--------|---------------|:---:|
| V1 | `featureFlags.js` | Flag defaults to false | Import in a test — `expect(featureFlags.reversePush).toBe(false)` (manual: `console.log` in dev tools) | Manual |
| V2 | `api.js:getReversePushFromChild` | Wraps GET with `_cached` TTL | Curl through preview URL, verify 2nd call returns cached (network tab shows only 1 request within TTL window) | Manual |
| V3 | `api.js:reversePushFromChild` | POSTs correct body shape | Intercept in dev tools; assert body has `push_food_bundle:true`, optional `modules` as array (not string), `enforce_child_lock` boolean | Manual |
| V4 | `api.js` invalidation | Post-execute clears catalog caches | Fire reverse push → immediately re-open forward push wizard for same child → verify fresh fetch (not from cache) | Manual |
| V5 | `useHierarchyManagement.js` | State symmetric to push state | Read hook return object in React DevTools; verify 4 reverse fields present | Manual |
| V6 | `ReversePushWizardDialog.jsx` | Preview renders source/target correctly (source=child franchise, target=self master) | Master login → click "Pull from Outlet" → wizard shows `Kunafa Mahal` in From column, `bhole chature` in To column | Manual (Playwright feasible) |
| V7 | Modules multi-select | Selecting 2 modules → POST body has `modules:["ingredients","sub_recipes"]` (array) | Playwright checkbox flow + intercept network | Manual |
| V8 | `enforce_child_lock` checkbox | Toggle changes payload | Playwright + intercept | Manual |
| V9 | Results renderer | 8 modules including `stock_item_categories` + `stock_items` display | Trigger reverse push against a real outlet (test env only), verify all 8 rows visible in results | Manual |
| V10 | Feature-flag gate | Row action HIDDEN when `FEATURE_REVERSE_PUSH=false` | Master login with flag off → no "Pull from Outlet" button in any row | Playwright |
| V11 | Persona gate | Franchise user does NOT see the CTA even with flag on | Franchise login with flag on → no button visible | Playwright |
| V12 | Regression: forward push still works | `handlePush(childId)` on a central row still executes forward push | Master login → "Push" button on central row → toast success | Playwright |
| V13 | Regression: catalog policy card still loads | Expand a child row → CatalogPolicyCard renders (unchanged) | Master login → expand → observe policy switches | Manual |
| V14 | Error surface: 403 forbidden | Wrong actor gets friendly toast | Franchise token → force-call the endpoint via dev console → toast reads "You can't pull from this outlet." | Manual |
| V15 | Compile clean | 0 new warnings | `tail -20 /var/log/supervisor/frontend.out.log` after edits | Manual |

---

## PART B — Implementation Plan (Gate 3)

Execute in this order. Each step lists exact edit + verification.

### Execution sequence

1. Create `featureFlags.js` (foundation).
2. Edit `api.js` (adds 2 methods + cache helper; must be verifiable before UI wires in).
3. Edit `useHierarchyManagement.js` (state + callbacks).
4. Create `ReversePushWizardDialog.jsx` (UI).
5. Edit `StoreManagement.jsx` (mount wizard + row action + flag gate).

---

### Step 1 — Create `frontend/src/lib/featureFlags.js`

**NEW file. Full content:**

```js
// CR-045 — Feature flags primitive.
// Extensible per-flag registry. Values are static at build time.
// Override in preview/prod via .env: REACT_APP_FEATURE_REVERSE_PUSH=true.

function bool(v, fallback = false) {
  if (v === undefined || v === null) return fallback;
  const s = String(v).toLowerCase().trim();
  return s === "true" || s === "1" || s === "yes" || s === "on";
}

const featureFlags = {
  // Reverse push — master pulls catalogue upward from a legacy outlet.
  // Feature-flagged / legacy-only per owner (2026-02-15).
  reversePush: bool(process.env.REACT_APP_FEATURE_REVERSE_PUSH, false),
};

export default featureFlags;
```

**Verification:** import in dev console → `featureFlags.reversePush === false` (default).

---

### Step 2 — Edit `frontend/src/services/api.js`

#### 2a. Add catalog-cache invalidation helper (insert AFTER line 137, before line 138 `function invalidateAll`).

**Current context (lines 128-138):**
```js
/** Invalidate all inventory/catalogue caches (after stock mutations) */
function _invalidateStockCaches() {
  _invalidateCache([
    "getStockInventory:",
    "getInventoryMaster:",
    "getHierarchyDetail:",
    "getStockDetail:",
    "getStockLedger:", // CR-037 — ledger includes grn/production/wastage rows
  ]);
}
```

**Insert after (before `function invalidateAll`):**
```js
/** CR-045 — Invalidate all catalogue caches (after reverse push mutation
 *  that writes categories/foods/addons/ingredients/sub_recipes/recipes/roles
 *  into the master). Broad by design because reverse push touches everything. */
function _invalidateCatalogCaches() {
  _invalidateCache([
    "getPushForm:",
    "getReversePushFromChild:",
    "getHierarchyList:",
    "getHierarchyDetail:",
    "getHierarchySummary:",
    "getInventoryMaster:",
    "getStockInventory:",
    "getFoodList:",       // if such cache key exists — no-op if absent
    "getRecipeList:",     // safe no-op if not cached
    "getSubRecipeList:",
    "getAddonRecipes:",
    "getWastageReasons:",
  ]);
}
```

#### 2b. Add the 2 reverse-push API methods (insert AFTER line 934, i.e. right after `pushBundle`).

**Insert:**
```js
// CR-045 — Reverse push (master pulls catalogue upward from a legacy outlet)
function _getReversePushFromChild(childId) {
  return client.get(`/proxy/v2/franchise/reverse-push-form/from/${childId}`);
}
// GET is cached with SHORT TTL — payload changes only when the outlet mutates its catalogue.
const getReversePushFromChild = _cached("getReversePushFromChild", TTL.SHORT, _getReversePushFromChild);

// Valid module labels per POS contract. `ingredients` maps to inventory_master —
// do NOT expose the raw "inventory_master" label anywhere.
const REVERSE_PUSH_MODULES = [
  "categories", "stock_item_categories", "addons", "sub_recipes",
  "ingredients", "stock_items", "foods", "recipes",
];

function reversePushFromChild(childId, { enforceChildLock = false, modules } = {}) {
  const body = { push_food_bundle: true, enforce_child_lock: !!enforceChildLock };
  // Only include modules key if the caller narrowed the scope.
  if (Array.isArray(modules) && modules.length > 0) {
    // Filter to whitelist so unknown labels never reach the API.
    const filtered = modules.filter((m) => REVERSE_PUSH_MODULES.includes(m));
    if (filtered.length > 0 && filtered.length < REVERSE_PUSH_MODULES.length) {
      body.modules = filtered;
    }
  }
  return client
    .post(`/proxy/v2/franchise/reverse-push/from/${childId}`, body)
    .then((r) => { _invalidateCatalogCaches(); return r; });
}
```

#### 2c. Export the new methods (edit lines 1221-1223 area — the `getPushForm, pushBundle, getHierarchyHistory` block).

**Current:**
```js
  getPushForm,
  pushBundle,
  getHierarchyHistory,
```

**Replace with:**
```js
  getPushForm,
  pushBundle,
  getHierarchyHistory,
  // CR-045 — Reverse push
  getReversePushFromChild,
  reversePushFromChild,
  REVERSE_PUSH_MODULES,
```

**Verification:** `import api from '@/services/api'` → `typeof api.reversePushFromChild === "function"` ✓. Curl through preview URL for GET returns cached result on 2nd call.

---

### Step 3 — Edit `frontend/src/hooks/useHierarchyManagement.js`

#### 3a. Add reverse state (insert AFTER line 24, before line 26 `// History state`).

**Current (lines 20-25):**
```js
  // Push state
  const [pushForm, setPushForm] = useState(null);
  const [pushResults, setPushResults] = useState(null);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushError, setPushError] = useState(null);
```

**Insert immediately after line 24:**
```js
  // CR-045 — Reverse push state (master pulls upward from a legacy outlet)
  const [reverseForm, setReverseForm] = useState(null);
  const [reverseResults, setReverseResults] = useState(null);
  const [reverseLoading, setReverseLoading] = useState(false);
  const [reverseError, setReverseError] = useState(null);
```

#### 3b. Add callbacks (insert AFTER line 116, right after `executePush`, before `fetchHistory` at line 118).

**Insert:**
```js
  // CR-045 — Reverse push callbacks
  const fetchReverseForm = useCallback(async (childId) => {
    setReverseLoading(true);
    setReverseError(null);
    setReverseResults(null);
    try {
      const resp = await api.getReversePushFromChild(childId);
      setReverseForm(resp.data?.data || resp.data);
    } catch (err) {
      setReverseError(err?.response?.data?.message || "Failed to load reverse push preview");
      setReverseForm(null);
    } finally {
      setReverseLoading(false);
    }
  }, []);

  const executeReverse = useCallback(async (childId, opts = {}) => {
    setReverseLoading(true);
    setReverseError(null);
    try {
      const resp = await api.reversePushFromChild(childId, opts);
      const d = resp.data?.data || resp.data;
      setReverseResults(d.results || d);
      return d;
    } catch (err) {
      const data = err?.response?.data;
      setReverseError(data?.message || "Reverse push failed");
      throw err;
    } finally {
      setReverseLoading(false);
    }
  }, []);

  const resetReverse = useCallback(() => {
    setReverseForm(null);
    setReverseResults(null);
    setReverseError(null);
  }, []);
```

#### 3c. Extend return object (edit lines 138-144).

**Current:**
```js
  return {
    children, listMeta, parentInfo, allowedChildTypes, listLoading, listError, fetchList,
    nestedFranchises, fetchNestedFranchises,
    createMeta, fetchCreateMeta, createChild,
    pushForm, pushResults, pushLoading, pushError, fetchPushForm, executePush, resetPush,
    history, historyMeta, historyLoading, fetchHistory,
  };
```

**Replace with:**
```js
  return {
    children, listMeta, parentInfo, allowedChildTypes, listLoading, listError, fetchList,
    nestedFranchises, fetchNestedFranchises,
    createMeta, fetchCreateMeta, createChild,
    pushForm, pushResults, pushLoading, pushError, fetchPushForm, executePush, resetPush,
    // CR-045 — Reverse push
    reverseForm, reverseResults, reverseLoading, reverseError,
    fetchReverseForm, executeReverse, resetReverse,
    history, historyMeta, historyLoading, fetchHistory,
  };
```

**Verification:** React DevTools inspect hook return; assert `reverseForm`, `executeReverse`, `resetReverse` are present.

---

### Step 4 — Create `frontend/src/components/central-inventory/ReversePushWizardDialog.jsx`

**NEW file. Full content sketch below** (final tighter code produced during IMPLEMENTATION):

```jsx
import React, { useState, useEffect, useMemo } from "react";
import api from "@/services/api";
import useHierarchyManagement from "@/hooks/useHierarchyManagement";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState } from "@/components/common/StateDisplays";
import { mapRestaurantTypeShort } from "@/lib/terminology";
import { ArrowDownToLine, AlertCircle, Loader2, Check, Wrench, Info } from "lucide-react";

// CR-045 — Reverse Push Wizard (master pulls catalogue upward from a legacy outlet)

// Human copy for the 8 module labels. `inventory_master` label is intentionally
// hidden — we surface "Ingredients" instead per owner directive.
const MODULE_LABELS = {
  categories: "Categories",
  stock_item_categories: "Stock Item Categories",
  addons: "Addons",
  sub_recipes: "Sub-recipes",
  ingredients: "Ingredients",
  stock_items: "Stock Items",
  foods: "Foods",
  recipes: "Recipes",
};

// Preview form returns 7 modules; POST result returns these same 7 plus
// stock_item_categories and stock_items (seeded implicitly with ingredients).
const PREVIEW_MODULES = ["categories", "foods", "addons", "ingredients", "sub_recipes", "recipes"];

function StatusChip({ status }) {
  const map = {
    synced:  { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Synced" },
    partial: { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Partial" },
    stale:   { bg: "bg-red-50 text-red-700 border-red-200", label: "Stale" },
  };
  const s = map[status] || map.stale;
  return <span className={`text-[10px] px-2 py-0.5 rounded border ${s.bg}`} data-testid={`reverse-status-${status || "unknown"}`}>{s.label}</span>;
}

export default function ReversePushWizardDialog({ open, onClose, target }) {
  const {
    reverseForm, reverseResults, reverseLoading, reverseError,
    fetchReverseForm, executeReverse, resetReverse,
  } = useHierarchyManagement();

  const [step, setStep] = useState("preview"); // preview | confirm | pushing | results
  const [selectedModules, setSelectedModules] = useState([]); // empty = push everything
  const [enforceChildLock, setEnforceChildLock] = useState(false);

  useEffect(() => {
    if (open && target) {
      resetReverse();
      setStep("preview");
      setSelectedModules([]);
      setEnforceChildLock(false);
      fetchReverseForm(target.id);
    }
  }, [open, target]);

  useEffect(() => {
    if (reverseResults) setStep("results");
  }, [reverseResults]);

  const sourceName = reverseForm?.source?.name || target?.name || "Outlet";
  const targetName = reverseForm?.target?.name || "Central Store";
  const summary = reverseForm?.push_summary || {};
  const breakdown = summary.breakdown || {};

  const handleExecute = async () => {
    setStep("pushing");
    try {
      await executeReverse(target.id, {
        enforceChildLock,
        modules: selectedModules.length > 0 ? selectedModules : undefined,
      });
    } catch { /* error shown via reverseError */ }
  };

  const toggleModule = (mod) => {
    setSelectedModules((prev) => prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]);
  };

  const renderPreview = () => (
    <div className="space-y-3" data-testid="reverse-push-preview">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-accent/30 rounded-md p-2">
          <p className="text-muted-foreground text-[10px] uppercase">From (Outlet)</p>
          <p className="font-medium">{sourceName}</p>
          <Badge variant="outline" className="text-[10px]">{mapRestaurantTypeShort(reverseForm?.source?.restaurant_type_flag)}</Badge>
        </div>
        <div className="bg-accent/30 rounded-md p-2">
          <p className="text-muted-foreground text-[10px] uppercase">To (Central Store)</p>
          <p className="font-medium">{targetName}</p>
          <Badge variant="outline" className="text-[10px]">{mapRestaurantTypeShort(reverseForm?.target?.restaurant_type_flag)}</Badge>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <StatusChip status={summary.status} />
        <span className="text-xs text-muted-foreground">
          {summary.total_source ?? 0} at outlet · {summary.total_child_matched ?? 0} already at central · <strong>{summary.total_behind ?? 0} to pull</strong>
        </span>
      </div>

      <div>
        <p className="text-xs font-medium mb-1.5">Modules to pull (leave all unchecked to pull everything):</p>
        <div className="grid grid-cols-2 gap-1.5">
          {PREVIEW_MODULES.map((mod) => {
            const bd = breakdown[mod] || { source: 0, child_matched: 0 };
            const behind = Math.max(0, (bd.source || 0) - (bd.child_matched || 0));
            const isSelected = selectedModules.includes(mod);
            return (
              <label key={mod} className="flex items-center gap-2 text-xs bg-accent/20 rounded px-2 py-1.5 cursor-pointer" data-testid={`reverse-module-${mod}`}>
                <Checkbox checked={isSelected} onCheckedChange={() => toggleModule(mod)} />
                <span className="flex-1">{MODULE_LABELS[mod]}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{bd.source || 0}</span>
                {behind > 0 && <span className="font-mono text-[10px] text-amber-700">+{behind}</span>}
              </label>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
          <Info className="h-3 w-3" /> Stock Item Categories and Stock Items are seeded automatically with Ingredients.
        </p>
      </div>

      <label className="flex items-start gap-2 text-xs cursor-pointer" data-testid="reverse-enforce-lock-checkbox">
        <Checkbox checked={enforceChildLock} onCheckedChange={(v) => setEnforceChildLock(!!v)} className="mt-0.5" />
        <span>
          <span className="font-medium">Enforce child lock</span>
          <span className="block text-[10px] text-muted-foreground">Marks pulled records as parent-managed so the outlet cannot edit them going forward.</span>
        </span>
      </label>

      <DialogFooter>
        <Button variant="outline" size="sm" onClick={onClose} data-testid="reverse-cancel-btn">Cancel</Button>
        <Button size="sm" onClick={() => setStep("confirm")} data-testid="reverse-next-btn">Review & Pull</Button>
      </DialogFooter>
    </div>
  );

  const renderConfirm = () => (
    <div className="space-y-3" data-testid="reverse-push-confirm">
      <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-800">
        <p className="font-medium flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> Confirm Pull</p>
        <p className="mt-1">This will pull catalogue data from <strong>{sourceName}</strong> into <strong>{targetName}</strong>. Same-name records at the central are updated; new records are inserted.</p>
        {enforceChildLock && <p className="mt-1"><strong>Enforce child lock is ON</strong> — pulled records become read-only at {sourceName}.</p>}
        {selectedModules.length > 0 && (
          <p className="mt-1">Modules: {selectedModules.map((m) => MODULE_LABELS[m]).join(", ")}.</p>
        )}
        {selectedModules.length === 0 && <p className="mt-1">Modules: pulling everything.</p>}
      </div>
      <DialogFooter>
        <Button variant="outline" size="sm" onClick={() => setStep("preview")} data-testid="reverse-back-btn">Back</Button>
        <Button size="sm" onClick={handleExecute} data-testid="reverse-confirm-btn">Pull Now</Button>
      </DialogFooter>
    </div>
  );

  const renderPushing = () => (
    <div className="flex flex-col items-center py-8 gap-3" data-testid="reverse-loading">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Pulling catalogue from {sourceName}…</p>
    </div>
  );

  const renderResults = () => {
    if (!reverseResults) return null;
    const modules = {};
    const diagnostics = reverseResults._diagnostics || {};
    for (const [k, v] of Object.entries(reverseResults)) {
      if (k.startsWith("_")) continue;
      if (typeof v === "object" && v !== null && "inserted" in v) modules[k] = v;
    }
    const total = { inserted: 0, updated: 0, failed: 0 };
    Object.values(modules).forEach((m) => {
      total.inserted += m.inserted || 0;
      total.updated  += m.updated  || 0;
      total.failed   += m.failed   || 0;
    });
    return (
      <div className="space-y-3" data-testid="reverse-push-results">
        <div className="flex items-center gap-2 text-emerald-600">
          <Check className="h-5 w-5" />
          <span className="text-sm font-medium">Pull complete — {targetName} updated from {sourceName}</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Module</TableHead>
              <TableHead className="text-xs text-right">Inserted</TableHead>
              <TableHead className="text-xs text-right">Updated</TableHead>
              <TableHead className="text-xs text-right">Failed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(modules).map(([k, v]) => (
              <TableRow key={k} data-testid={`reverse-result-row-${k}`}>
                <TableCell className="text-xs">{MODULE_LABELS[k] || k}</TableCell>
                <TableCell className="text-xs text-right font-mono">{v.inserted || 0}</TableCell>
                <TableCell className="text-xs text-right font-mono">{v.updated || 0}</TableCell>
                <TableCell className={`text-xs text-right font-mono ${v.failed > 0 ? "text-destructive font-semibold" : ""}`}>{v.failed || 0}</TableCell>
              </TableRow>
            ))}
            <TableRow className="font-semibold">
              <TableCell className="text-xs">Total</TableCell>
              <TableCell className="text-xs text-right font-mono">{total.inserted}</TableCell>
              <TableCell className="text-xs text-right font-mono">{total.updated}</TableCell>
              <TableCell className={`text-xs text-right font-mono ${total.failed > 0 ? "text-destructive" : ""}`}>{total.failed}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        {diagnostics.link_repair && Object.values(diagnostics.link_repair).some((n) => n > 0) && (
          <details className="bg-accent/30 rounded-md p-2 text-[10px]">
            <summary className="font-medium flex items-center gap-1 cursor-pointer"><Wrench className="h-3 w-3" /> Link repairs</summary>
            {Object.entries(diagnostics.link_repair).map(([k, v]) => (
              <p key={k} className="text-muted-foreground pl-4">{k.replace(/_/g, " ")}: {v}</p>
            ))}
          </details>
        )}
        <DialogFooter>
          <Button size="sm" onClick={onClose} data-testid="reverse-done-btn">Done</Button>
        </DialogFooter>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg" data-testid="reverse-push-wizard-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ArrowDownToLine className="h-4 w-4" />
            {step === "results" ? "Pull Complete" : `Pull from ${sourceName}`}
          </DialogTitle>
        </DialogHeader>

        {reverseLoading && step === "preview" && !reverseForm && <LoadingState lines={3} />}

        {reverseError && step !== "results" && (
          <div className="flex items-center gap-2 text-destructive text-sm py-2" data-testid="reverse-error">
            <AlertCircle className="h-4 w-4" /> {reverseError}
          </div>
        )}

        {step === "preview" && reverseForm && !reverseLoading && renderPreview()}
        {step === "confirm" && renderConfirm()}
        {step === "pushing" && !reverseResults && renderPushing()}
        {step === "results" && renderResults()}
      </DialogContent>
    </Dialog>
  );
}
```

**Verification:** V6-V9, V14 in matrix. Also compile check V15.

---

### Step 5 — Edit `frontend/src/components/central-inventory/StoreManagement.jsx`

#### 5a. Add imports (top of file, after existing imports).

**Insert after line 20 (`import { friendlyCatalogError } ...`):**

```js
import ReversePushWizardDialog from "./ReversePushWizardDialog"; // CR-045
import featureFlags from "@/lib/featureFlags";                    // CR-045
import { ArrowDownToLine } from "lucide-react";                   // CR-045
```

*(If `ArrowDownToLine` is already in the existing lucide-react import block on line 16-19, merge it there instead of a new import line.)*

#### 5b. Add reverse-pull state (near line 43, next to existing `pushing` state).

**Current (line 43):**
```js
  const [pushing, setPushing] = useState(null);
```

**Insert immediately after line 43:**
```js
  const [reversePullTarget, setReversePullTarget] = useState(null); // CR-045
```

#### 5c. Add row-action button + feature-flag/persona gate (near line 413-427, the existing Push button `<TableCell>`).

**Current context (lines 413-427):**
```js
                      <TableCell className="py-2.5">
                        {ps && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-[10px] px-2 gap-1"
                            onClick={(e) => { e.stopPropagation(); handlePush(child.id); }}
                            disabled={pushing === child.id}
                            data-testid={`push-btn-${child.id}`}
                          >
                            {pushing === child.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                            Push
                          </Button>
                        )}
                      </TableCell>
```

**Replace with:**
```js
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-1">
                          {ps && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-[10px] px-2 gap-1"
                              onClick={(e) => { e.stopPropagation(); handlePush(child.id); }}
                              disabled={pushing === child.id}
                              data-testid={`push-btn-${child.id}`}
                            >
                              {pushing === child.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                              Push
                            </Button>
                          )}
                          {/* CR-045 — Pull from Outlet: master-only, franchise rows only, feature-flag gated */}
                          {featureFlags.reversePush && isTopLevel && child.restaurantTypeFlag === "franchise" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px] px-2 gap-1"
                              onClick={(e) => { e.stopPropagation(); setReversePullTarget(child); }}
                              data-testid={`reverse-pull-btn-${child.id}`}
                              title="Pull catalogue from this outlet into your central store"
                            >
                              <ArrowDownToLine className="h-3 w-3" /> Pull
                            </Button>
                          )}
                        </div>
                      </TableCell>
```

#### 5d. Mount the wizard (before the closing `</div>` of the component's return, near line 441).

**Current (lines 440-442):**
```js
        </Card>
      )}
    </div>
  );
}
```

**Replace with:**
```js
        </Card>
      )}

      {/* CR-045 — Reverse Push Wizard */}
      {featureFlags.reversePush && (
        <ReversePushWizardDialog
          open={!!reversePullTarget}
          onClose={() => setReversePullTarget(null)}
          target={reversePullTarget}
        />
      )}
    </div>
  );
}
```

**Verification:** V6, V10, V11, V12 in matrix.

---

## PART C — Scope Lock

**Files WILL change (5 total):**
1. `frontend/src/lib/featureFlags.js` (NEW, ~15 lines)
2. `frontend/src/services/api.js` (+~55 lines)
3. `frontend/src/hooks/useHierarchyManagement.js` (+~60 lines)
4. `frontend/src/components/central-inventory/ReversePushWizardDialog.jsx` (NEW, ~240 lines)
5. `frontend/src/components/central-inventory/StoreManagement.jsx` (+~25 lines)

**Files will NOT touch:**
- `frontend/src/lib/terminology.js` (FROZEN)
- `frontend/src/lib/screenVisibility.js` (FROZEN)
- `frontend/src/components/central-inventory/HierarchyManagement.jsx` (deliberate — separate page, out of primary flow)
- `backend/server.py` (proxy-only, generic catch-all already forwards)
- `frontend/.env` (PROTECTED — owner sets `REACT_APP_FEATURE_REVERSE_PUSH=true` manually)
- `backend/.env`
- `frontend/package.json` (no new deps)
- All other files

**No new dependencies.** All imports come from existing shadcn/UI + lucide-react + hooks.

---

## PART D — Post-Code Registry Checklist (for IMPLEMENTATION agent)

- [ ] `control/registry.json`: CR-045 → status: `IMPLEMENTED`, `artifact_refs[2]` (Impact-Analysis) → `DONE` path `control/sessions/CR045_ARTIFACT_2_3_IMPACT_AND_PLAN.md`, `artifact_refs[3]` (Impl-Plan) → same path.
- [ ] `control/L1_CONTROL_DASHBOARD.md`: CR-045 row → `PLANNED` (after this artifact) → `IMPLEMENTED` (after code).
- [ ] `control/L7_FILE_OWNERSHIP.md`: New section "CR-045: Reverse Push Adoption (5 files: 2 new + 3 modified)".
- [ ] Code markers: `// CR-045` comment in every modified file at the change block.
- [ ] Dashboard drift check: `cd /app && node control/gen_dashboard_data.js --check` → exit 0.

---

## PART E — Verification Matrix Summary (bringing forward from A.5)

15 verifications total. 4 Playwright-friendly (V10, V11, V12, and a subset of V6/V7). Rest manual.

---

## PART F — Handover (→ Owner for Gate 4 → IMPLEMENTATION)

Plan ready. **5 edits across 5 files** (2 new + 3 modified). Code reality: NONE (green-field). Scope lock: see PART C. Verification matrix: 15 checks (mostly manual, ~4 Playwright).

**Owner decisions still pending Gate 4 GO:**

1. **Feature-flag mechanism:** confirm option (b) — new `frontend/src/lib/featureFlags.js` (agent recommendation). Alternatives: env-only, or per-restaurant API flag.
2. **Cache-invalidation scope:** confirm broad (12 prefixes in `_invalidateCatalogCaches`) vs conservative. Agent recommendation: broad — reverse push writes across all catalogue tables and rare-event execution frequency means the perf hit is acceptable.
3. **Severity P2:** confirm from intake (was agent-classified).
4. **Wizard placement:** row action on franchise rows in Store Management, confirmed by "Pull from Outlet" copy. OK to proceed?

**Awaiting Gate 4 GO.** Once approved, IMPLEMENTATION picks up with the exact edits in PART B.
