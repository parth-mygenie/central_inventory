# IMPACT ANALYSIS — Forward Push Module-Level Selection Screen

> **Date:** 2026-10-31
> **Agent Role:** PLANNING (Gate 2 only)
> **Item:** New CR (unregistered — to be registered at INTAKE)
> **Source:** `INVESTIGATION_20261031_MODULE_PUSH_SCREEN.md`
> **Code Reality:** NONE — no module push wizard code exists in the codebase

---

## 0. Conflict Pre-Check

### Target File Conflict Scan

| Target File | Other Open Items Touching It | Conflict? |
|-------------|------------------------------|:---------:|
| `api.js` (line 978) | CR-045 (IMPLEMENTED), CR-047 (IMPLEMENTED), CR-051 (IN_PROGRESS), many QA_PASS items | **NO** — our change is at `pushBundle()` line 978. CR-045 wired `reversePushFromChild()` (line 999). CR-047 already modified `pushBundle()` (added `categoryIds`). CR-051 is on `getVendorItemListFull` (different area). All changes are additive and non-overlapping. |
| `useHierarchyManagement.js` (line 108) | CR-045 (IMPLEMENTED — wired `executeReverse`, different callback) | **NO** — CR-045 only added `executeReverse/fetchReverseForm/resetReverse`. Our change is to `executePush` which is a separate callback. Parallel-safe. |
| `StoreManagement.jsx` (lines ~460-520) | CR-032 (QA), CR-043 (QA_PASS), BUG-040 (QA_PASS) | **NO** — CR-032 is screen audit (different sections). CR-043 added `CatalogPolicyCard` (expanded detail area). BUG-040 fixed indirect outlet label. Our changes add a new button in the child row actions (line ~468-488) and a new dialog mount (line ~504-518 area). Additive, non-overlapping. |
| `ModulePushWizardDialog.jsx` (NEW) | None | **NO** — new file, no conflicts possible. |

**Verdict: No conflicts. All changes are additive and parallel-safe with existing open items.**

---

## 1. Data Flow Trace

### 1.1 Push-Form GET — Data Retrieval

```
User clicks "Push Modules" button on a child row
  → StoreManagement sets modulePushTarget state
    → ModulePushWizardDialog opens (receives target={id, name, ...})
      → useEffect calls api.getPushForm(childId)
        → GET /proxy/v2/franchise/push-form/{childId}
          → server.py generic proxy → preprod.mygenie.online
            → Response: {parent, child, source_entities, child_existing, push_summary}
              → push_summary.breakdown has per-module {source, child_matched}
                → UI renders module checkboxes with counts
```

**API response shape** (confirmed by curl, RID 828→827):

```
push_summary.breakdown:
  categories:            { source: N, child_matched: N }
  stock_item_categories: { source: N, child_matched: N }
  foods:                 { source: N, child_matched: N }
  addons:                { source: N, child_matched: N }
  ingredients:           { source: N, child_matched: N }
  sub_recipes:           { source: N, child_matched: N }
  recipes:               { source: N, child_matched: N }
  roles:                 { source: N, child_matched: N }

push_summary:
  status: "synced" | "partial" | "stale"
  total_source: N
  total_child_matched: N
  total_behind: N
  target_seeded: boolean
```

### 1.2 Push POST — Execution with Module Scope

```
User selects modules → clicks "Push" → confirm step → execute
  → ModulePushWizardDialog calls executePush(childId, { modules: [...] })
    → useHierarchyManagement.executePush()
      → api.pushBundle(childId, { modules: [...] })
        → POST /proxy/v2/franchise/push/{childId}
          → Body: { push_food_bundle: true, modules: ["ingredients", "foods", ...] }
            → server.py proxy → preprod.mygenie.online
              → 200 OK: { results: { ingredients: {inserted, updated, failed}, ... } }
                → UI renders per-module results table
```

### 1.3 Cache Invalidation Path

**Current state:** `pushBundle()` does NOT call `_invalidateCatalogCaches()`. The reverse push (`reversePushFromChild`) does (line 1012).

**Current CategoryPushDialog workaround:** After push success, `handlePushComplete()` (StoreManagement.jsx:199) manually calls `fetchList()` + `api.getPushForm()` to refresh data.

**Implication for Module Push:** The new dialog will need either:
- (A) `pushBundle()` to chain `_invalidateCatalogCaches()` (consistent with reverse push pattern, benefits both CategoryPushDialog and ModulePushWizardDialog), OR
- (B) Manual invalidation in the new dialog's onComplete callback (keeps current inconsistency)

**Recommendation:** Option A — add `_invalidateCatalogCaches()` to `pushBundle()`. This is consistent with `reversePushFromChild` and automatically benefits the existing `CategoryPushDialog` path too.

---

## 2. Affected Files — Detailed Line-Level Analysis

### File 1: `frontend/src/services/api.js` (~1345 lines)

**HIGH-RISK FILE** (CI-R5) — 86 API methods + cache layer. View before editing.

| # | Location | Current Code | What Changes | Risk |
|---|----------|-------------|-------------|:----:|
| 1a | Line 978-983 | `pushBundle(childId, { categoryIds })` — no `modules` param | Add `modules` parameter + whitelist filtering (same pattern as `reversePushFromChild` line 999-1007) | **LOW** — additive. Existing callers don't pass `modules`, so their behavior is identical. Backward compatible. |
| 1b | Line 983 | `return client.post(...)` — no cache invalidation | Chain `.then(r => { _invalidateCatalogCaches(); return r; })` | **LOW** — consistent with `reversePushFromChild` line 1012. Existing CategoryPushDialog already manually refreshes data. |
| 1c | Line 989-992 | `REVERSE_PUSH_MODULES` constant | Add parallel `FORWARD_PUSH_MODULES` constant (same whitelist, or add "roles" if owner says yes) | **LOW** — new constant, no existing code affected. |
| 1d | Line 1320 | Export: `pushBundle,` | No change needed — already exported | **NONE** |

**Downstream consumers of `pushBundle`:**
- `useHierarchyManagement.js:112` — calls `api.pushBundle(childId, { categoryIds })`. Adding `modules` param is additive, doesn't break.
- `StoreManagement.jsx:734` — `CategoryPushDialog` calls `api.pushBundle(childId, { categoryIds })` directly. Adding `modules` param is additive, doesn't break (no `modules` passed = push everything, same as today).
- `HierarchyManagement.jsx:723` — **orphaned file** (not imported or routed anywhere). Not a concern.

### File 2: `frontend/src/hooks/useHierarchyManagement.js` (206 lines)

| # | Location | Current Code | What Changes | Risk |
|---|----------|-------------|-------------|:----:|
| 2a | Line 108 | `executePush(childId, { categoryIds } = {})` | Add `modules` to destructured options: `{ categoryIds, modules } = {}` | **LOW** — additive |
| 2b | Line 112 | `api.pushBundle(childId, { categoryIds })` | Forward `modules`: `api.pushBundle(childId, { categoryIds, modules })` | **LOW** — additive. `modules` is `undefined` when not passed, so existing callers unchanged. |

**Downstream consumers of `executePush`:**
- `StoreManagement.jsx:37` — destructured but **never called directly**. The `CategoryPushDialog` calls `api.pushBundle()` directly (line 734), bypassing `executePush`.
- `HierarchyManagement.jsx:723` — orphaned file.
- **New** `ModulePushWizardDialog.jsx` — will be the primary consumer of `executePush({ modules })`.

**Note:** `StoreManagement.jsx` destructures `executePush` but doesn't call it. The unused destructuring is harmless and doesn't need removal (avoid scope creep).

### File 3: `frontend/src/components/central-inventory/StoreManagement.jsx` (1065 lines)

| # | Location | Current Code | What Changes | Risk |
|---|----------|-------------|-------------|:----:|
| 3a | ~Line 25 (imports) | Imports `ReversePushWizardDialog` | Add import for `ModulePushWizardDialog` | **LOW** |
| 3b | ~Line 22 (lucide icons) | Icon imports | Add `Layers` icon (for "Push Modules" button) | **LOW** |
| 3c | ~Line 50-52 (state) | `pushDialogTarget`, `pushDialogCategoryData`, `reversePullTarget` | Add `modulePushTarget` state: `const [modulePushTarget, setModulePushTarget] = useState(null);` | **LOW** |
| 3d | ~Line 468-474 (child row actions) | `Push` button + `Pull` button | Add `Push Modules` button alongside existing buttons | **LOW** — additive. Existing buttons untouched. |
| 3e | ~Line 504-518 (dialog mounts) | `ReversePushWizardDialog` + `CategoryPushDialog` | Add `ModulePushWizardDialog` mount below existing dialogs | **LOW** — additive |
| 3f | ~Line 199-220 (handlePushComplete) | Handles post-push refresh for CategoryPushDialog | Add `handleModulePushComplete` callback (same pattern: close dialog, fetchList, refresh pushStatus) | **LOW** |

**No changes to:**
- `CategoryPushDialog` function (lines 644-960) — untouched per owner directive
- Existing `handlePush` function (line 193-196) — untouched
- Existing child row Push button (line 468) — untouched
- Existing Pull button (line 481) — untouched
- G-031 push loading overlay (lines 520-546) — untouched

### File 4: **NEW** `frontend/src/components/central-inventory/ModulePushWizardDialog.jsx`

| # | What | Complexity | Risk |
|---|------|-----------|:----:|
| 4a | 4-step wizard (preview → confirm → pushing → results) | ~300-370 lines | **MEDIUM** — new file, but mirrors proven `ReversePushWizardDialog` pattern exactly |
| 4b | Module checkboxes with push_summary.breakdown counts | Standard Checkbox + math | **LOW** |
| 4c | Confirm step with module summary | Static render | **LOW** |
| 4d | Elapsed timer during push | Copy pattern from ReversePushWizardDialog lines 228-255 | **LOW** |
| 4e | Results table (module × inserted/updated/failed) | Copy pattern from ReversePushWizardDialog lines 257-336 | **LOW** |

---

## 3. Files That Will NOT Change

| File | Why |
|------|-----|
| `CategoryPushDialog` (StoreManagement.jsx lines 644-960) | Owner directive: existing category push stays untouched |
| `ReversePushWizardDialog.jsx` (367 lines) | Owner directive: Pull screen stays untouched |
| `frontend/src/lib/terminology.js` | FROZEN (CI-R2) |
| `frontend/src/lib/screenVisibility.js` | FROZEN (CI-R2) |
| `backend/server.py` | Proxy-only (CI-R2). Generic proxy already forwards `modules` param. |
| `frontend/src/App.js` | No new routes needed — dialog opens from StoreManagement |

---

## 4. Risk Assessment Summary

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|:----------:|:------:|-----------|
| R1 | `pushBundle()` signature change breaks existing CategoryPushDialog | **VERY LOW** | **HIGH** | New `modules` param is additive. Existing callers don't pass it → behavior identical to today. `undefined` modules = push everything. |
| R2 | Cache invalidation addition to `pushBundle()` causes unexpected stale-data-flush | **LOW** | **LOW** | Consistent with `reversePushFromChild` pattern. CategoryPushDialog already manually refreshes. Invalidation only makes it more correct. |
| R3 | New button in child row breaks layout on narrow screens | **LOW** | **LOW** | Button uses same compact `h-6 text-[10px]` styling as existing Push/Pull buttons. Test at different viewport widths. |
| R4 | ModulePushWizardDialog has rendering issues on first build | **MEDIUM** | **LOW** | Follows proven ReversePushWizardDialog pattern line-by-line. Self-test will catch rendering issues. |
| R5 | `push_summary.breakdown` absent on some API versions / child types | **LOW** | **MEDIUM** | Curl-confirmed present on preprod (RID 828→827). Add graceful fallback: if `breakdown` missing, show "Preview unavailable" and allow pushing everything. |
| R6 | User confusion: two separate Push buttons with different behavior | **LOW** | **LOW** | "Push" = category-scoped (existing). "Push Modules" = module-scoped (new). Different icons, different labels, different dialogs. |

---

## 5. Open Questions for Owner (Surfaced from Investigation)

These are **business rule decisions** that affect implementation scope. Do NOT guess (Rule R3).

| # | Question | Options | Default if Unanswered |
|---|----------|---------|----------------------|
| Q1 | Should module push and category push be combinable in one operation? | A) Purely module-scoped (no categories). B) Optional category sub-filter within module push. | A — purely module-scoped. Simpler, matches Pull dialog pattern. |
| Q2 | Which modules to show? | A) All 8 backend modules. B) 6 core modules (skip stock_item_categories + stock_items — auto-seeded with ingredients). | B — 6 core, same as Pull wizard's `PREVIEW_MODULES`. |
| Q3 | Include Roles module? | A) Yes, include roles push. B) No, exclude roles from catalogue push. | B — exclude roles. Pull wizard also excludes roles from the checkbox list. |
| Q4 | Button placement in child row? | A) Next to existing Push button. B) Inside expanded detail card. C) Both. | A — next to existing Push button, consistent with Pull button placement. |
| Q5 | Button label and icon? | A) "Push Modules" + Layers icon. B) "Push by Module" + Package icon. C) Owner picks. | A — "Push Modules" + Layers icon. |

---

## 6. Scope Summary

| Metric | Value |
|--------|-------|
| Files changed | 3 existing + 1 new = **4 total** |
| Lines added (estimated) | ~330-400 |
| Lines modified (existing) | ~15-20 across 3 files |
| Lines deleted | 0 |
| Backend changes | 0 |
| Frozen files touched | 0 |
| New routes | 0 |
| New API methods | 0 (extending existing `pushBundle`) |
| New components | 1 (`ModulePushWizardDialog.jsx`) |
| Risk level | **LOW** overall (new file is MEDIUM, all existing-file changes are LOW) |

---

## 7. Handover → Gate 3

Impact Analysis complete. Gate 2 artifact filed.

**Next:** When owner is ready for Gate 3 (Implementation Plan), the PLANNING agent should:
1. Get owner answers on Q1-Q5
2. Write exact line-by-line edits for all 4 files
3. Write Verification Matrix
4. Write Post-Code Registry Checklist

**Awaiting owner decisions on Q1-Q5 before proceeding to Gate 3.**
