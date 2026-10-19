# BUG-057 — Intake Artifact (Gate 1)

> **ID:** BUG-057
> **Type:** BUG
> **Registered:** 2026-10-19
> **Agent Role:** INVESTIGATION → INTAKE
> **Severity:** P2 — MEDIUM
> **Related to:** CR-047 (Add Stock Spreadsheet UX — keyboard nav gap)
> **Sprint:** S5
> **Investigation:** `control/sessions/INVESTIGATION_20261019_ADDSTOCK_KEYBOARD.md`

---

## Problem Statement

On the Add Stock form (`/purchase`), pressing **Enter** in the **Expiry** (date)
field of any row jumps focus to the **next row's Qty** field. The correct
target is the **next row's Item** search button (`item-select-{idx+1}`).

The item search is always the first field a storekeeper fills on a new row —
jumping to Qty skips the item selection step, forcing them to click back.

---

## Root Cause

`SpreadsheetRow.handleKeyDown("expiry", e)` at line 682:

```javascript
// WRONG — "qty" not "item" is focused on expiry Enter:
else document.getElementById(`qty-${idx + 1}`)?.focus();
```

The item combobox trigger is a `<button data-testid="item-select-{idx}">` —
no `id` attribute, so `getElementById` cannot reach it. The function
hardcodes `qty-{idx+1}` as the jump target.

**Secondary gap:** When the last row is complete and `onTabFromLast()` adds a
new row (line 681), no focus is set after the row is added — browser falls
to the next tab-stop which is also the qty field.

---

## Fix Scope (2 changes, same function, ~6 lines)

**Change A — line 682** (non-last or incomplete row):
```javascript
// FIXED:
document.querySelector(`[data-testid="item-select-${idx + 1}"]`)?.focus();
```

**Change B — lines 681-682** (last-row + valid — after addRow):
```javascript
if (isLast && row.itemId && Number(row.qty) > 0 && row.batch) {
  onTabFromLast();
  setTimeout(() => document.querySelector(`[data-testid="item-select-${idx + 1}"]`)?.focus(), 50);
}
```
`setTimeout 50ms` matches the existing pattern at line 718.

---

## Code Reality

**NONE** — correct focus target absent; wrong target (`qty-{idx+1}`) hardcoded.

---

## Blast Radius

| Metric | Value |
|--------|-------|
| Files | 1 — `AddStockPurchaseForm.jsx` |
| Lines changed | ~6 (lines 679-683) |
| Other files | NONE |
| Scope | SMALL |

---

## Severity

**P2 — MEDIUM** — keyboard workflow degraded; workaround: click item cell manually.

---

## Open Questions

None. Root cause confirmed. No owner decision needed.

---

## Next Step

→ **BUG FIX agent** directly (SMALL, 1 file, fix fully specified).
Can be batched with BUG-055 (same file, same BUG FIX session).
