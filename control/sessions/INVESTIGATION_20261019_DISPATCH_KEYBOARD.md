# INVESTIGATION REPORT — Dispatch Screen Keyboard Navigation
> **Date:** 2026-10-19
> **Role:** INVESTIGATION
> **Triggered by:** Owner-reported (B1, B2, B3) + Owner-added (B4)
> **File:** `frontend/src/components/central-inventory/DirectDispatchForm.jsx`
> **Outcome:** 4 root causes confirmed in code → register as BUG-054 (batch)

---

## Session Context

The previous session handover (SESSION_HANDOVER_20261019_001.md) already
identified B1 and B2 in "What Was NOT Done" / Priority 3:

> *"Dispatch keyboard nav — investigation done, not yet registered as BUG"*

Owner has now formally reported B1, B2, B3 and added B4. This session
confirms all four root causes via code trace and registers BUG-054.

---

## Data Flow Trace

```
User types in search box (line 457-478)
  → onChange fires (line 462): updates searchText + expands matching categories
  → NO onKeyDown handler → Enter key press is swallowed by browser

User edits qty in DispatchRow (line 741-748)
  → onChange fires (line 746): calls onUpdate("qty", value)
  → NO onKeyDown handler → Enter key press does nothing

DispatchRow checkbox (line 716-720):
  → default: included = false (line 253)
  → disabled={!row.included} on qty input (line 747)
  → storekeeper MUST click checkbox before qty field becomes active

Row click (line 699-702):
  → handleRowClick toggles row.included
  → But clicking on the qty INPUT tag is excluded from this toggle
    (line 700: if INPUT → return early, don't toggle)
  → So clicking the qty field does NOT auto-check the row either
```

---

## B1 — Search Enter → row focus

| Field | Value |
|-------|-------|
| File | `DirectDispatchForm.jsx` |
| Line | 457 (`<input>` open) — 477 (`data-testid` close) |
| Code | Plain `<input>` (not shadcn) with `onChange` only, **no `onKeyDown`** |
| Symptom | Pressing Enter in the search box does nothing |
| Expected | Enter should focus first visible matching row's qty field |
| Root cause | Missing `onKeyDown` handler — Enter key event unhandled |

**Confirmed code (lines 457-478):**
```javascript
<input
  className="h-7 border border-input rounded-md px-2 text-xs ..."
  placeholder="Search item…"
  value={searchText}
  onChange={e => { ... }}
  // ← NO onKeyDown HERE
  data-testid="dispatch-search-input"
/>
```

**Fix scope:** +8 lines after line 476 (after `onChange` block closes)

---

## B2 — Qty Enter → next row

| Field | Value |
|-------|-------|
| File | `DirectDispatchForm.jsx` |
| Line | 741 (qty `<Input>` open) — 748 (`data-testid` close) |
| Code | shadcn `<Input>` with `value`, `onChange`, `disabled` — **no `onKeyDown`** |
| Symptom | Pressing Enter in qty field does nothing |
| Expected | Enter should move focus to next row's qty field |
| Root cause | Missing `onKeyDown` handler on qty Input in `DispatchRow` component |

**Confirmed code (lines 741-748):**
```javascript
<Input type="number" min="0" step="1"
  className="h-6 w-16 text-xs ..."
  value={row.qty}
  onChange={e => onUpdate("qty", e.target.value)}
  disabled={!row.included || submitting}
  // ← NO onKeyDown HERE
  data-testid={`dispatch-qty-${row.invMasterId}`} />
```

**Fix scope:** +6 lines after `onChange` on line 746

---

## B3 — Default unchecked → qty disabled blocks keyboard flow

| Field | Value |
|-------|-------|
| File | `DirectDispatchForm.jsx` |
| Lines | 253 (default), 747 (disabled guard), 700 (row click guard) |
| Root cause A | Line 253: `included: false` — all rows default to unchecked |
| Root cause B | Line 747: `disabled={!row.included}` — qty disabled when unchecked |
| Root cause C | Line 700: `if (INPUT → return)` — clicking qty field skips the row-click toggle |
| Symptom | Even if B1 fix focuses qty, the input is disabled → storekeeper is still blocked |
| Expected | Enter from search should auto-check the row AND focus its qty field |

**Confirmed code (line 253):**
```javascript
included: false,   // CR-050 — default unchecked; storekeeper opts in
```

**Confirmed code (line 747):**
```javascript
disabled={!row.included || submitting}
```

**Confirmed code (line 700):**
```javascript
const handleRowClick = (e) => {
  if (["INPUT", "SELECT", "BUTTON", "A", "OPTION"].includes(e.target.tagName)) return;
  // ↑ Clicking on the qty <input> tag skips toggle — row stays unchecked
  onUpdate("included", !row.included);
};
```

**Compounding effect on B1:**
B1's Enter handler must also call `onUpdate("included", true)` before `.focus()`.
Otherwise the qty input is focused but still disabled → focus jumps there but typing still blocked.

---

## B4 — Auto-select row when qty is entered (new, owner-added)

| Field | Value |
|-------|-------|
| File | `DirectDispatchForm.jsx` |
| Lines | 746 (qty onChange), 747 (disabled guard) |
| Owner description | "when we press send quantity it should get selected" |
| Root cause | qty `onChange` (line 746) does NOT auto-set `included: true` |
| Secondary cause | `disabled={!row.included}` blocks typing in the first place |

**Current onChange (line 746):**
```javascript
onChange={e => onUpdate("qty", e.target.value)}
```
No auto-check. No side-effect on `included`.

**Desired behavior:**
- Typing a quantity (value > 0) → row auto-selects (`included: true`)
- Clearing the quantity → row auto-deselects (`included: false`)
- This removes the manual checkbox-click step entirely for the common case

**Implementation options for BUG FIX role:**

| Option | Description | Trade-off |
|--------|-------------|-----------|
| A | Remove `disabled`, auto-check in onChange when val>0, auto-uncheck when empty | Cleanest UX — user just types. No pre-click needed. |
| B | Keep `disabled`, but on focus event of disabled input → auto-check row, then re-focus | Slight delay (two events) but preserves original disabled visual |
| C | Keep `disabled`, B1 Enter focus also auto-checks. B4 only via Enter path. | Partial fix — doesn't help mouse users who click qty directly |

**Recommendation (for BUG FIX):** Option A — remove `disabled`, auto-check in onChange.
The row click already toggles `included`, so the checkbox is still clickable to unselect.

---

## Interaction Map (all 4 bugs together)

```
CURRENT FLOW (broken):
  Type "amer" → Enter → nothing ← B1
  Click row/checkbox → qty enabled → type value → Enter → nothing ← B2
  Click qty directly → row stays unchecked → qty blocked ← B3+B4

DESIRED FLOW (after fix):
  Type "amer" → Enter → first matching row auto-checked + qty focused ← B1+B3
  Type qty → row auto-checks ← B4
  Press Enter in qty → next row auto-checked + qty focused ← B2+B3
```

---

## Root Cause Classification

| Bug | Category | Action |
|-----|----------|--------|
| B1 | Frontend bug — missing event handler | → BUG FIX: add `onKeyDown` to search input |
| B2 | Frontend bug — missing event handler | → BUG FIX: add `onKeyDown` to qty Input |
| B3 | Frontend bug — disabled guard blocks keyboard flow | → BUG FIX: B1+B2 handlers must also call `onUpdate("included", true)` |
| B4 | Frontend bug — missing auto-select on qty entry | → BUG FIX: remove disabled, auto-check in qty onChange |

No backend dependency. No API changes needed. All fixes in `DirectDispatchForm.jsx`.

---

## Blast Radius

```bash
grep -n "onKeyDown\|dispatch-search\|dispatch-qty\|included.*false" \
  frontend/src/components/central-inventory/DirectDispatchForm.jsx
```

| Metric | Value |
|--------|-------|
| Files affected | 1 — `DirectDispatchForm.jsx` |
| Hotspot files | NO (not in HIGH-RISK list) |
| Other screens affected | NONE |
| Scope | SMALL — 4 targeted additions, 1 line modified |
| Other components needed | `data-testid` attributes already present for DOM query |

---

## Evidence

| Type | Detail |
|------|--------|
| Screenshot | Owner-provided (dispatch/new — shows search field, qty field, unchecked rows) |
| Code trace | B1: line 457-478 (no `onKeyDown`); B2: line 741-748 (no `onKeyDown`); B3: line 253 + 747; B4: line 746 |
| Handover reference | SESSION_HANDOVER_20261019_001.md → "Priority 3 — Register + fix Dispatch keyboard navigation" |
| Confidence | CONFIRMED — all 4 root causes verified in code |
| Source | OWNER-REPORTED (B1/B2/B3) + OWNER-ADDED (B4) |

---

## Duplicate Check

| Check | Result |
|-------|--------|
| SESSION_HANDOVER_20261019_001.md | B1+B2 anticipated as BUG-054 — MATCHES |
| BUG-053 | Different bug (header layout, all items, manual rows) — DISTINCT |
| Any prior keyboard nav bug | None found in registry.json or L4 — DISTINCT |

**Duplicate check: DISTINCT. B4 extends scope beyond what handover described.**

---

## Recommended Fix Sequence (for BUG FIX role)

```
Step 1 — B3/B4 root condition:
  Line 747: remove disabled={!row.included} from qty <Input>
  Line 746: onChange → also call onUpdate("included", true) when val > "0"
            also call onUpdate("included", false) when val === "" or "0"

Step 2 — B1 (search Enter):
  Lines 476-477: add onKeyDown to search <input>
  Handler: if Enter → find first visible row via getFilteredGrouped()
           → call setDispatchRows to check that row (included: true)
           → document.querySelector(`[data-testid="dispatch-qty-<id>"]`).focus()
           → .select() to highlight existing qty

Step 3 — B2 (qty Enter):
  Line 746: add onKeyDown to qty <Input>
  Handler: if Enter → querySelectorAll('[data-testid^="dispatch-qty-"]')
           → find current index → focus next + .select()
           → (next row already auto-checks itself via B4 fix when user types)
```

Total: ~14 lines added (B1: +8, B2: +6), 1 line modified (B3/B4: remove `disabled` condition)

---

## Next Step

→ **BUG FIX agent** for BUG-054.
All fixes in `DirectDispatchForm.jsx` only.
No Gate 3 plan needed (contained changes, SMALL blast radius).
