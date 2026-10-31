# IMPLEMENTATION PLAN — Forward Push "Push by Module" Screen

> **Date:** 2026-10-31
> **Agent Role:** PLANNING (Gate 3)
> **Item:** CR-MODPUSH (unregistered — to be formally registered at INTAKE)
> **Depends On:** Gate 2 Impact Analysis (`CR-MODPUSH_ARTIFACT_2_IMPACT_ANALYSIS.md`)
> **Code Reality:** NONE

---

## Owner Decisions (Locked)

| # | Question | Decision |
|---|----------|----------|
| Q1 | Combinable scoping | **Module + optional category filter** — after picking modules, an optional step lets the user narrow by categories |
| Q2 | Which modules | **6 core modules** — Categories, Foods, Addons, Ingredients, Sub-Recipes, Recipes (same as Pull wizard's `PREVIEW_MODULES`) |
| Q3 | Roles | **Exclude** — no Roles checkbox |
| Q4 | Button placement | **Next to existing Push button** in the child row actions |
| Q5 | Button label | **"Push by Module"** |

---

## Scope Lock

**Files WILL change:**
1. `frontend/src/services/api.js` — lines 977-984 area + line 1321 area (export)
2. `frontend/src/hooks/useHierarchyManagement.js` — lines 108, 112
3. `frontend/src/components/central-inventory/StoreManagement.jsx` — lines 22, 25, 52, ~198, ~474, ~518
4. **NEW** `frontend/src/components/central-inventory/ModulePushWizardDialog.jsx`

**Files will NOT touch:**
- `CategoryPushDialog` (inside StoreManagement.jsx lines 644-960)
- `ReversePushWizardDialog.jsx`
- `terminology.js`, `screenVisibility.js` (FROZEN)
- `server.py` (proxy-only)
- `App.js` (no new routes)

---

## Execution Sequence

Execute in this order to avoid intermediate compile errors:

```
1. api.js           — add FORWARD_PUSH_MODULES + modify pushBundle + add export
2. useHierarchyManagement.js — forward modules in executePush
3. ModulePushWizardDialog.jsx — create NEW file (the dialog component)
4. StoreManagement.jsx        — import + state + button + dialog mount
```

---

## Edit 1: `frontend/src/services/api.js`

### Edit 1a — Add `FORWARD_PUSH_MODULES` constant (after line 984)

**Current** (line 984-985):
```js
  return client.post(`/proxy/v2/franchise/push/${childId}`, body, { timeout: 100000 });
}

// CR-045 — Reverse push (master pulls catalogue upward from a legacy outlet).
```

**New** (insert between line 984 and 986):
```js
  return client
    .post(`/proxy/v2/franchise/push/${childId}`, body, { timeout: 100000 })
    .then((r) => { _invalidateCatalogCaches(); return r; });
}

// CR-MODPUSH — Valid module labels for forward push (same whitelist as reverse push).
const FORWARD_PUSH_MODULES = [
  "categories", "stock_item_categories", "addons", "sub_recipes",
  "ingredients", "stock_items", "foods", "recipes",
];

// CR-045 — Reverse push (master pulls catalogue upward from a legacy outlet).
```

### Edit 1b — Modify `pushBundle()` to accept `modules` (line 978)

**Current** (line 977-984):
```js
// CR-047 — category_ids mandatory for category-scoped push; G-031 timeout kept
function pushBundle(childId, { categoryIds } = {}) {
  const body = { push_food_bundle: true };
  if (Array.isArray(categoryIds) && categoryIds.length > 0) {
    body.category_ids = categoryIds;
  }
  return client.post(`/proxy/v2/franchise/push/${childId}`, body, { timeout: 100000 });
}
```

**New**:
```js
// CR-047 — category_ids for category-scoped push; CR-MODPUSH — modules for module-scoped push; G-031 timeout kept
function pushBundle(childId, { categoryIds, modules } = {}) {
  const body = { push_food_bundle: true };
  if (Array.isArray(categoryIds) && categoryIds.length > 0) {
    body.category_ids = categoryIds;
  }
  if (Array.isArray(modules) && modules.length > 0) {
    const filtered = modules.filter((m) => FORWARD_PUSH_MODULES.includes(m));
    if (filtered.length > 0 && filtered.length < FORWARD_PUSH_MODULES.length) {
      body.modules = filtered;
    }
  }
  return client
    .post(`/proxy/v2/franchise/push/${childId}`, body, { timeout: 100000 })
    .then((r) => { _invalidateCatalogCaches(); return r; });
}
```

**Note:** The `FORWARD_PUSH_MODULES` constant must be declared BEFORE `pushBundle` uses it. Since `pushBundle` is a function declaration (hoisted), and `FORWARD_PUSH_MODULES` is a const, insert the constant AFTER `pushBundle` but BEFORE reverse push section — or move the constant ABOVE `pushBundle`. The safe approach: declare the constant at line 977 (before pushBundle).

**Revised edit order — combined Edit 1a+1b:**

Replace lines 977-984 entirely with:

```js
// CR-MODPUSH — Valid module labels for forward push (same whitelist as reverse push).
const FORWARD_PUSH_MODULES = [
  "categories", "stock_item_categories", "addons", "sub_recipes",
  "ingredients", "stock_items", "foods", "recipes",
];

// CR-047 — category_ids for category-scoped push; CR-MODPUSH — modules for module-scoped push; G-031 timeout kept
function pushBundle(childId, { categoryIds, modules } = {}) {
  const body = { push_food_bundle: true };
  if (Array.isArray(categoryIds) && categoryIds.length > 0) {
    body.category_ids = categoryIds;
  }
  // CR-MODPUSH — optional module scoping (same pattern as reversePushFromChild)
  if (Array.isArray(modules) && modules.length > 0) {
    const filtered = modules.filter((m) => FORWARD_PUSH_MODULES.includes(m));
    if (filtered.length > 0 && filtered.length < FORWARD_PUSH_MODULES.length) {
      body.modules = filtered;
    }
  }
  return client
    .post(`/proxy/v2/franchise/push/${childId}`, body, { timeout: 100000 })
    .then((r) => { _invalidateCatalogCaches(); return r; });
}
```

### Edit 1c — Add `FORWARD_PUSH_MODULES` to exports (line ~1321 area)

**Current** (line 1320-1325):
```js
  pushBundle,
  getHierarchyHistory,
  // CR-045 — Reverse push (master pulls catalogue upward from a legacy outlet)
  getReversePushFromChild,
  reversePushFromChild,
  REVERSE_PUSH_MODULES,
```

**New**:
```js
  pushBundle,
  FORWARD_PUSH_MODULES, // CR-MODPUSH
  getHierarchyHistory,
  // CR-045 — Reverse push (master pulls catalogue upward from a legacy outlet)
  getReversePushFromChild,
  reversePushFromChild,
  REVERSE_PUSH_MODULES,
```

---

## Edit 2: `frontend/src/hooks/useHierarchyManagement.js`

### Edit 2a — Add `modules` to `executePush` signature (line 108)

**Current** (lines 107-112):
```js
  // CR-047 — category-scoped push; G-031 409 handling kept
  const executePush = useCallback(async (childId, { categoryIds } = {}) => {
    setPushLoading(true);
    setPushError(null);
    try {
      const resp = await api.pushBundle(childId, { categoryIds });
```

**New**:
```js
  // CR-047 — category-scoped push; CR-MODPUSH — module-scoped push; G-031 409 handling kept
  const executePush = useCallback(async (childId, { categoryIds, modules } = {}) => {
    setPushLoading(true);
    setPushError(null);
    try {
      const resp = await api.pushBundle(childId, { categoryIds, modules });
```

---

## Edit 3: **NEW** `frontend/src/components/central-inventory/ModulePushWizardDialog.jsx`

Create new file. Full component spec below.

**Structure:** 5-step wizard dialog.

```
Steps:
  "modules"   → Module checkboxes (6 core)
  "categories" → Optional category filter (collapsible, skippable)
  "confirm"    → Review what will be pushed
  "pushing"    → Loading with elapsed timer
  "results"    → Per-module results table
```

**Props:** `{ open, onClose, target, onPushComplete }`
- `target` = `{ id, name, restaurantTypeFlag }` (the child store)

**Data flow:**
1. On open → `api.getPushForm(target.id)` → get push_summary, source_entities, child_existing
2. Show module checkboxes from `push_summary.breakdown` (6 core modules)
3. Optional: show category checkboxes from `source_entities.categories`
4. On execute → `api.pushBundle(target.id, { modules, categoryIds })` via hook's `executePush`
5. Show results table

**Key implementation details:**

```jsx
// Module list — 6 core, no roles (owner decision Q2, Q3)
const PUSH_PREVIEW_MODULES = ["categories", "foods", "addons", "ingredients", "sub_recipes", "recipes"];

// Module labels
const MODULE_LABELS = {
  categories: "Categories",
  foods: "Products",
  addons: "Addons",
  ingredients: "Ingredients",
  sub_recipes: "Sub-Recipes",
  recipes: "Recipes",
};
```

**Category filter step (owner decision Q1):**
- Rendered as a collapsible section ("Narrow by categories") with a "Skip — push all categories" hint
- Uses `source_entities.categories` from push-form response
- Pre-selects categories already pushed (same logic as CategoryPushDialog)
- Only visible when `selectedModules` includes "categories" or "foods" (modules that are category-scoped)
- If no categories selected → don't send `category_ids` (push all)

**StatusChip helper:** Reuse same pattern as `ReversePushWizardDialog` lines 32-48.

**Results table:** Same pattern as `ReversePushWizardDialog` lines 257-336 (Module × Inserted/Updated/Failed + totals row).

**Elapsed timer:** Same pattern as `ReversePushWizardDialog` lines 228-255 (stage messages, reassurance at 15s+).

**Imports needed:**
```jsx
import React, { useState, useEffect } from "react";
import api from "@/services/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState } from "@/components/common/StateDisplays";
import { mapRestaurantTypeShort } from "@/lib/terminology";
import { Layers, AlertCircle, Loader2, Check, Info, Search, ChevronDown, ChevronRight, Upload } from "lucide-react";
```

**Estimated size:** ~350-400 lines (larger than ReversePushWizardDialog's 367 because of the optional category filter step).

---

## Edit 4: `frontend/src/components/central-inventory/StoreManagement.jsx`

### Edit 4a — Add import (after line 25)

**Current** (line 25):
```js
import ReversePushWizardDialog from "./ReversePushWizardDialog"; // CR-045
```

**New**:
```js
import ReversePushWizardDialog from "./ReversePushWizardDialog"; // CR-045
import ModulePushWizardDialog from "./ModulePushWizardDialog"; // CR-MODPUSH
```

### Edit 4b — Add `Layers` icon (line 22)

**Current** (lines 19-23):
```js
import {
  GitBranch, Search, Plus, ChevronDown, ChevronRight, RefreshCw, Loader2,
  Upload, Mail, Phone, MapPin, Calendar, Check, ArrowRight, ArrowLeft, Shield, Save,
  ArrowDownToLine, Package, CheckSquare, Square, Eye,
} from "lucide-react";
```

**New**:
```js
import {
  GitBranch, Search, Plus, ChevronDown, ChevronRight, RefreshCw, Loader2,
  Upload, Mail, Phone, MapPin, Calendar, Check, ArrowRight, ArrowLeft, Shield, Save,
  ArrowDownToLine, Package, CheckSquare, Square, Eye, Layers,
} from "lucide-react";
```

### Edit 4c — Add state (after line 52)

**Current** (line 52):
```js
  const [pushDialogCategoryData, setPushDialogCategoryData] = useState(null); // CR-047 — cached push-form for category badges
```

**New**:
```js
  const [pushDialogCategoryData, setPushDialogCategoryData] = useState(null); // CR-047 — cached push-form for category badges
  const [modulePushTarget, setModulePushTarget] = useState(null); // CR-MODPUSH — module push dialog
```

### Edit 4d — Add `handleModulePushComplete` callback (after line 221, after handlePushComplete)

Insert after the closing `};` of `handlePushComplete` (line 221):

```js
  // CR-MODPUSH — called after successful module push from ModulePushWizardDialog
  const handleModulePushComplete = async (childId) => {
    setModulePushTarget(null);
    fetchList();
    try {
      const resp = await api.getPushForm(childId);
      const data = resp?.data?.data || resp?.data;
      const summary = data?.push_summary;
      if (summary) {
        setPushStatusMap(prev => ({ ...prev, [childId]: { behind: summary.total_behind, status: summary.status === "synced" ? "synced" : "stale" } }));
      }
    } catch {}
  };
```

### Edit 4e — Add "Push by Module" button (after line 474, after existing Push button)

**Current** (lines 474-475):
```jsx
                          )}
                          {/* CR-045 — Pull from Outlet: master persona + franchise row (two-gate) */}
```

**New**:
```jsx
                          )}
                          {/* CR-MODPUSH — Push by Module: module-scoped push with optional category filter */}
                          {ps && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px] px-2 gap-1"
                              onClick={(e) => { e.stopPropagation(); setModulePushTarget(child); }}
                              data-testid={`module-push-btn-${child.id}`}
                              title="Push specific modules to this outlet"
                            >
                              <Layers className="h-3 w-3" /> Push by Module
                            </Button>
                          )}
                          {/* CR-045 — Pull from Outlet: master persona + franchise row (two-gate) */}
```

### Edit 4f — Add dialog mount (after line 518, after CategoryPushDialog)

**Current** (lines 518-520):
```jsx
      />

      {/* G-031 — Forward push loading overlay */}
```

**New**:
```jsx
      />

      {/* CR-MODPUSH — Module Push Wizard Dialog */}
      <ModulePushWizardDialog
        open={!!modulePushTarget}
        onClose={() => setModulePushTarget(null)}
        target={modulePushTarget}
        onPushComplete={handleModulePushComplete}
      />

      {/* G-031 — Forward push loading overlay */}
```

---

## Verification Matrix

| Edit # | File | Change Description | How to Verify | Automated? |
|:------:|------|--------------------|---------------|:---:|
| 1a+1b | api.js:977-984 | `FORWARD_PUSH_MODULES` const + `pushBundle` accepts `modules` + cache invalidation | `grep -n "FORWARD_PUSH_MODULES\|modules" api.js` → constant exists, pushBundle sends modules, chain includes `_invalidateCatalogCaches` | NO |
| 1c | api.js:~1321 | Export `FORWARD_PUSH_MODULES` | `grep "FORWARD_PUSH_MODULES" api.js` includes export line | NO |
| 2a | useHierarchyManagement.js:108,112 | `executePush` accepts and forwards `modules` | `grep "modules" useHierarchyManagement.js` → in signature + api.pushBundle call | NO |
| 3 | ModulePushWizardDialog.jsx (NEW) | Full wizard component | Browser: open Store Management → click "Push by Module" on a child → dialog opens with module checkboxes + optional category filter + confirm + push + results | NO |
| 4a | StoreManagement.jsx:~26 | Import `ModulePushWizardDialog` | `grep "ModulePushWizardDialog" StoreManagement.jsx` → import line exists | NO |
| 4b | StoreManagement.jsx:~22 | `Layers` icon imported | `grep "Layers" StoreManagement.jsx` → in lucide import | NO |
| 4c | StoreManagement.jsx:~53 | `modulePushTarget` state | `grep "modulePushTarget" StoreManagement.jsx` → useState exists | NO |
| 4d | StoreManagement.jsx:~222 | `handleModulePushComplete` callback | `grep "handleModulePushComplete" StoreManagement.jsx` → function exists | NO |
| 4e | StoreManagement.jsx:~475 | "Push by Module" button in child row | Browser: see "Push by Module" button next to "Push" button per child row | NO |
| 4f | StoreManagement.jsx:~519 | `ModulePushWizardDialog` mounted | `grep "ModulePushWizardDialog" StoreManagement.jsx` → JSX mount exists | NO |
| E2E | All files | Full flow: click → modules → optional categories → confirm → push → results | Browser: complete end-to-end push with module selection | NO |

---

## Post-Code Registry Checklist

For the IMPLEMENTATION agent to execute after coding:

```
- [ ] registry.json: CR-MODPUSH → status: IMPLEMENTED, artifact_refs updated
- [ ] L3: row added for CR-MODPUSH with new status
- [ ] L7: every created/modified file listed:
        - frontend/src/services/api.js (MODIFIED)
        - frontend/src/hooks/useHierarchyManagement.js (MODIFIED)
        - frontend/src/components/central-inventory/StoreManagement.jsx (MODIFIED)
        - frontend/src/components/central-inventory/ModulePushWizardDialog.jsx (NEW)
- [ ] Code markers: // CR-MODPUSH comment in every modified file
- [ ] Dashboard drift check: node control/gen_dashboard_data.js --check → PASS
```

---

## Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|:----------:|:------:|-----------|
| R1 | `pushBundle()` signature change breaks CategoryPushDialog | VERY LOW | HIGH | `modules` param is additive + undefined. Existing caller passes `{ categoryIds }` only — `modules` defaults to undefined, not sent. |
| R2 | `_invalidateCatalogCaches()` on pushBundle causes double-refresh | LOW | NONE | CategoryPushDialog manually refreshes after push. Double-invalidation is harmless (just an extra fresh fetch). |
| R3 | Category filter in ModulePushWizardDialog is confusing | LOW | LOW | It's opt-in (collapsed by default). Hint text: "Skip to push all categories". |
| R4 | New button overflows child row on narrow viewports | LOW | LOW | Same compact `h-6 text-[10px]` styling. 3 buttons (Push, Push by Module, Pull) should fit — test at mobile. |
| R5 | push_summary.breakdown missing | LOW | MEDIUM | Graceful fallback: if breakdown missing, show flat "Push everything" UX without checkboxes. |

---

## Handover → Owner for Gate 4

Plan ready at `control/sessions/CR-MODPUSH_ARTIFACT_3_IMPLEMENTATION_PLAN.md`.

- **4 files** (1 new + 3 modified), estimated **~400-440 lines** added across all files.
- Code Reality: **NONE** (greenfield implementation).
- Scope lock: see table above.
- Verification matrix: **11 checks** (0 automated, 11 manual).
- Owner decisions: all 5 locked (Q1-Q5).
- **Awaiting Gate 4 GO.**
