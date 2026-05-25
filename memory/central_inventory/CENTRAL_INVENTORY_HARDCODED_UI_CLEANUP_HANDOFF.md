# Central Inventory Hardcoded UI Cleanup Handoff

> **Date:** 24 May 2026
> **From:** Hardcoded UI Audit Agent
> **To:** Phase 6 Polish + Validation + Regression Implementation Agent

---

## 1. Audit Document Path

`/app/memory/central_inventory/CENTRAL_INVENTORY_HARDCODED_UI_AUDIT_BEFORE_PHASE_6.md`

## 2. Recommended Cleanup Strategy

**Strategy B — Replace with feature-specific status**

Remove global stale read-only messaging. Keep deferred-feature-specific indicators.

## 3. Exact Files to Change

### 3.1 `src/components/layout/AppHeader.jsx` — Remove "Read-only Mode" badge

Remove lines 40–43:
```jsx
<div className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
  <Shield className="h-3 w-3" />
  Read-only Mode
</div>
```

Also remove `Shield` from the lucide-react import if no longer used by remaining code (check `restaurantTypeUnknown` badge still uses it — if yes, keep the import).

### 3.2 `src/components/central-inventory/ContextSelector.jsx` — Remove Phase 1 banner

Remove lines 141–144:
```jsx
{/* Read-only mode notice */}
<div className="mt-2 text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200 inline-block">
  Phase 1 Limited Slice — Read-only mode. Write operations pending backend resolution.
</div>
```

### 3.3 `src/components/layout/LoginPage.jsx` — Replace footer text

Replace line 89–91:
```jsx
<p className="text-[10px] text-muted-foreground text-center mt-4">
  Phase 1 — Read-only preview. Write operations pending backend resolution.
</p>
```

With:
```jsx
<p className="text-[10px] text-muted-foreground text-center mt-4">
  Central Inventory — MyGenie
</p>
```

### 3.4 `src/services/api.js` — Update stale comment

Replace lines 11–12:
```js
 * Read APIs only for Phase 1 Slice 1.
 * Write APIs are intentionally omitted (UNIT_CONVERSION_NOT_DEFINED blocker).
```

With:
```js
 * Read APIs (Slice 1-3) + Write APIs (Slice 4 transfers + Slice 5 adjustment/wastage).
```

## 4. Files NOT to Change

| File | Reason |
|------|--------|
| `screenVisibility.js` | Reports "comingSoon" is accurate |
| `Sidebar.jsx` | "(soon)" rendering logic is correct |
| `TransferDetail.jsx` | Edit noop is correct deferred behavior |
| `useCentralInventoryRealtime.js` | Future-scope comments still accurate |
| Any Phase 2/3/4 components | Already correct |

## 5. Scope Guard

- Only remove/replace the 4 items listed above
- Do NOT remove deferred-feature indicators
- Do NOT change permission logic
- Do NOT change role behavior
- Do NOT modify backend
- Do NOT update `/app/memory/final/`

## 6. Build/Smoke Checklist After Cleanup

| # | Check | Expected |
|---|-------|----------|
| 1 | `webpack compiled successfully` | pass |
| 2 | Login page shows neutral footer text | pass |
| 3 | Operations Hub: no yellow "Phase 1" banner | pass |
| 4 | Header: no "Read-only Mode" amber badge | pass |
| 5 | Header: `restaurantTypeUnknown` badge still works if applicable | pass |
| 6 | Reports sidebar still shows "(soon)" | pass |
| 7 | Edit Transfer button still renders (noop) | pass |
| 8 | All 3 roles can still log in and see correct buttons | pass |

## 7. Recommended Next Agent

`Central Inventory Slice 5 Phase 6 Polish + Validation + Regression Implementation Agent`

This cleanup should be the **first task** in Phase 6, before validation and regression checks.

---

*End of Cleanup Handoff*
