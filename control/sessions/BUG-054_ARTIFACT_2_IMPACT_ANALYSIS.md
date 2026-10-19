# BUG-054 — Gate 2: Impact Analysis

> **ID:** BUG-054
> **Gate:** 2 — Impact Analysis
> **Role:** PLANNING
> **Date:** 2026-10-19
> **Assigned to:** BUG-054 (Dispatch Screen Keyboard Navigation Gaps — B1/B2/B3/B4)
> **Intake ref:** `control/sessions/BUG-054_ARTIFACT_1_INTAKE.md`
> **Stage Dispatch:** Impact Analysis only — stop at Gate 2.

---

## Step 0 — Code Reality Check

```bash
grep -n "onKeyDown" frontend/src/components/central-inventory/DirectDispatchForm.jsx
# → lines 612, 622 — CategoryCombobox sub-component ONLY (the category filter dropdown)
#   Neither the search toolbar input (line 457) nor the qty Input (line 741)
#   has any onKeyDown. Both are confirmed absent.
```

**Code Reality: NONE** — no keyboard handlers exist at either target location.
The two `onKeyDown` hits in the file (lines 612, 622) are inside the
`CategoryCombobox` sub-component's own dropdown navigation — completely
unrelated to B1 or B2.

---

## Step 1 — Conflict Pre-Check

### L7 — Last modifier of DirectDispatchForm.jsx

`DirectDispatchForm.jsx` has been touched by: CR-023, CR-025, BUG-033,
BUG-036, and most recently **CR-050 + BUG-053** (full rewrite, 2026-10-19,
last session). L7 entry is from 2026-07-11; the CR-050 rewrite post-dates it.

### Registry — active items on same file

| ID | Status | Conflict? |
|----|:------:|:---------:|
| BUG-006 | ACCEPTED | No — won't be fixed |
| BUG-012 | DEFERRED | No — backend blocked |
| CR-033 | QA | No — code already done |
| BUG-033 | IMPLEMENTED | No — code already done |
| BUG-036 | IMPLEMENTED | No — code already done |
| CR-050 | IMPLEMENTED | No — BUG-054 builds on top of it |
| **BUG-054** | OPEN | This item |

**Conflict verdict: NONE.** The file's current state (post CR-050+BUG-053
full rewrite) is the baseline. BUG-054 adds to that baseline with no
in-flight items competing for the same lines.

Execution order note: BUG-054 MUST be applied to the CR-050 post-rewrite
version (current `19oct` branch state). Do NOT base edits on pre-CR-050 line
numbers.

---

## Step 2 — Gate 2: Impact Analysis

### 2.1 Data Flow Trace

#### B1 — Search Enter (missing `onKeyDown` on search input)

```
User types "amer" in search toolbar input (line 457–478)
  → onChange (line 462): updates searchText, expands matching categories in collapsedCats
  → React re-renders → getFilteredGrouped(dispatchRows) returns filtered grouped rows
  → User presses Enter
  → NO onKeyDown → browser default (form submit or nothing) — event not consumed

DESIRED path (after fix):
  → onKeyDown Enter:
     1. Call getFilteredGrouped(dispatchRows) with current searchText
     2. Find first row in first visible group → firstRow
     3. setDispatchRows: set firstRow.included = true
        (B3 resolution: auto-check so qty is active)
     4. document.querySelector(`[data-testid="dispatch-qty-${firstRow.invMasterId}"]`)
        .focus() + .select()
```

State read: `dispatchRows` (array), `searchText`, `getFilteredGrouped` (function in scope)
State written: `dispatchRows` → one row's `included` field set to `true`
DOM interaction: `.focus()` + `.select()` on a qty input
Hooks touched: none
API calls: none

---

#### B2 — Qty Enter (missing `onKeyDown` on qty Input)

```
User presses Enter inside qty <Input> (line 741–748)
  → NO onKeyDown → browser default — nothing
  → DispatchRow has no awareness of sibling rows (it only receives its own row data)

DESIRED path (after fix):
  → onKeyDown Enter (inside DispatchRow component):
     1. e.preventDefault()
     2. querySelectorAll('[data-testid^="dispatch-qty-"]') → NodeList of all qty inputs
     3. Find current input index
     4. If next input exists: next.focus() + next.select()
        (B4: next row auto-checks itself when user types qty — see B4 below)
```

State read: none (pure DOM query)
State written: none
DOM interaction: `.focus()` + `.select()` on next row's qty input
Props needed: `row.invMasterId` (already in scope to identify current input)
API calls: none

Note: DispatchRow does not have access to the full `dispatchRows` array or
`setDispatchRows`. The B2 fix uses DOM querying via `data-testid` attributes
(already present at line 748) rather than prop drilling or a ref array.
This is appropriate — focus management does not need to go through React state.

---

#### B3 — Default unchecked → qty disabled (compounds B1)

```
After B1 fires and focuses the qty input:
  → qty input has disabled={!row.included} (line 747)
  → row.included = false (default, line 253)
  → focus lands on a disabled input → keystrokes silently blocked
  → storekeeper is stuck again

FIX: B1 handler sets included=true (step 3 above) BEFORE calling .focus()
  → By the time focus lands, React has re-rendered with included=true
  → qty input is no longer disabled → storekeeper can type immediately

Secondary B3 issue — clicking qty does NOT toggle included (line 700 guard):
  handleRowClick skips INPUT tag → clicking qty doesn't trigger row select
  This pre-existing behavior is resolved by B4 (removing disabled guard)
  so the user can click directly into qty without needing checkbox first.
```

No additional state changes beyond what B1 already handles.

---

#### B4 — Auto-select row on qty entry

```
Current:
  disabled={!row.included || submitting} (line 747)
  → qty input is not focusable/editable unless row is already checked
  → storekeeper must click checkbox, then type — two separate gestures

DESIRED: typing a qty auto-selects the row
  → Remove !row.included from disabled guard (line 747)
    qty input becomes always editable (unless submitting)
  → Add onKeyDown Enter to qty (B2 handler already covers next-row jump)
  → In onKeyDown Enter: before jumping to next row, check current row:
      if (Number(row.qty) > 0 && !row.included) onUpdate("included", true)

Why Enter-only (not onChange)?
  See Open Questions Q1. Short answer: auto-checking on every keystroke
  (onChange) feels aggressive — a partial "1" typed into a 10-quantity
  field would auto-check before the storekeeper commits. Enter-only matches
  owner description: "when we PRESS send quantity it should get selected".
```

State written: `row.included` via `onUpdate("included", true)` — same path
as existing checkbox onChange (line 717). No new state paths.

Line 770 note — FEFO source `<select>` also has `disabled={!row.included}`:
  This guard STAYS. Once B4 auto-checks the row (on Enter), the FEFO source
  select auto-enables. The source is not needed before the storekeeper
  commits a qty anyway — FEFO auto-selects it via updateDispatchRow's qty
  branch (lines 290–295). No change to line 770.

---

### 2.2 Affected Files

| File | Change type | Lines | Risk |
|------|------------|-------|:----:|
| `DirectDispatchForm.jsx` | Additive + 1 guard removal | 477, 746, 747 | MEDIUM |

**No other file is affected.** DirectDispatchForm.jsx is a page-level component
with no exports. No other component imports it. No api.js changes. No
new hooks. No new state.

---

### 2.3 Detailed Change Map

#### Change 1 — Search input `onKeyDown` (B1 + B3)

| | Detail |
|-|--------|
| File | `DirectDispatchForm.jsx` |
| Location | After line 476 (after the `onChange` closing brace), before `data-testid` |
| Current | `<input ... onChange={...} data-testid="dispatch-search-input" />` |
| Add | `onKeyDown` prop, +8 lines |
| Risk | **LOW** — additive only. No existing state changed. Enter key was previously unhandled (no regression). |

Sketch:
```javascript
onKeyDown={e => {
  if (e.key !== "Enter") return;
  e.preventDefault();
  const groups = getFilteredGrouped(dispatchRows);
  const firstRow = Object.values(groups)[0]?.[0];
  if (!firstRow) return;
  const idx = dispatchRows.findIndex(r => r.invMasterId === firstRow.invMasterId);
  if (idx >= 0) setDispatchRows(prev => {
    const next = [...prev];
    next[idx] = { ...next[idx], included: true };
    return next;
  });
  document.querySelector(`[data-testid="dispatch-qty-${firstRow.invMasterId}"]`)
    ?.focus();
}}
```

Note: `setDispatchRows` + `.focus()` in same event handler is safe — React
batches the state update; focus fires synchronously after. The disabled guard
removal (Change 2) ensures the qty input is always focusable so `.focus()`
lands regardless of `included` state at the moment of the DOM call.

---

#### Change 2 — Qty input `disabled` guard (B3 + B4 root condition)

| | Detail |
|-|--------|
| File | `DirectDispatchForm.jsx` |
| Location | Line 747 |
| Current | `disabled={!row.included \|\| submitting}` |
| Change | `disabled={submitting}` (remove `!row.included`) |
| Risk | **MEDIUM** — behavior change. Unchecked rows now have an editable qty field. Mitigated by: (a) submit gate at line 316 still requires `r.included && qty > 0 && sourceSelector`; (b) B4 auto-checks when Enter is pressed — so unchecked rows with a typed value get checked before dispatch. Visual consequence: a storekeeper can type into a qty field without first clicking the checkbox — this IS the desired UX from B4. |

Regression check: if a storekeeper types a qty on a row but never presses
Enter or clicks the checkbox, `row.included` stays false → row is excluded
from dispatch by line 316. No accidental dispatch possible.

---

#### Change 3 — Qty input `onKeyDown` (B2 + B4 trigger)

| | Detail |
|-|--------|
| File | `DirectDispatchForm.jsx` |
| Location | After `onChange` on line 746, before `disabled` on line 747 |
| Current | `onChange={e => onUpdate("qty", e.target.value)}` (no onKeyDown) |
| Add | `onKeyDown` prop, +6 lines |
| Risk | **LOW** — additive only. Enter key was previously unhandled. DOM query targets existing `data-testid` attributes. |

Sketch:
```javascript
onKeyDown={e => {
  if (e.key !== "Enter") return;
  e.preventDefault();
  if (Number(row.qty) > 0 && !row.included) onUpdate("included", true);
  const all = Array.from(
    document.querySelectorAll('[data-testid^="dispatch-qty-"]')
  );
  const cur = all.indexOf(e.target);
  if (cur >= 0 && cur + 1 < all.length) {
    all[cur + 1].focus();
    all[cur + 1].select();
  }
}}
```

DOM query note: `[data-testid^="dispatch-qty-"]` is unique to this form
(data-testid naming convention per CI codebase). No collision risk with
other forms since DirectDispatchForm is a full-page component with its
own route.

---

### 2.4 Risk Assessment

| Change | Risk | Mitigation |
|--------|:----:|-----------|
| Change 1 — search onKeyDown | LOW | Additive. Enter was unhandled before. No regression path. |
| Change 2 — remove `!row.included` from disabled | MEDIUM | Submit gate (line 316) still requires `included=true`. Accidental dispatch impossible. |
| Change 3 — qty onKeyDown | LOW | Additive. DOM query uses existing unique data-testid. |

**Overall risk: LOW-MEDIUM.** All changes are in one leaf-level component.
No API, no hooks, no shared state.

---

### 2.5 Downstream Consumers

| Consumer | Impact |
|----------|--------|
| `handleSubmit` (line 323) | No change — still reads `includedRows` filtered by `r.included && qty > 0 && sourceSelector` |
| `DispatchCategorySection` | No change — receives `rows` prop, passes to `DispatchRow` |
| `DispatchRow` | Changes 2 + 3 are here — self-contained |
| `CategoryCombobox` | No change — its own `onKeyDown` at lines 612+622 is unrelated |
| `api.js` | No change |
| `App.js` / routes | No change |
| Other screens | No change — DirectDispatchForm has no exports |

---

### 2.6 Open Questions (owner decisions needed)

**Q1 — B4 trigger: Enter-only vs. onChange (auto-check as user types)?**

| Option | Behavior | Pros | Cons |
|--------|----------|------|------|
| **Enter-only** *(recommended)* | Row auto-checks when Enter is pressed in qty | Aligns with owner description "when we PRESS send qty"; no surprise mid-type | User must press Enter to commit (but they need to anyway for B2 next-row) |
| onChange | Row auto-checks as user types (e.g. after first digit) | Most immediate | Could feel jittery — typing "1" on the way to "10" auto-checks the row |

*Recommendation: Enter-only (proposed above in Change 3 sketch).*

**Q2 — Auto-uncheck when qty is cleared?**

If a storekeeper types 10, row auto-checks. They then clear the field back
to empty. Should the row auto-uncheck?

| Option | Behavior |
|--------|----------|
| Auto-uncheck *(simpler)* | qty="" or "0" → `included=false`. Clean. Row disappears from dispatch count. |
| Don't auto-uncheck *(safer)* | Row stays checked even with empty qty. Submit gate already requires `qty > 0` so it won't be dispatched. Storekeeper must manually uncheck. |

*Recommendation: don't auto-uncheck. Fewer surprises. Submit gate is sufficient guard.*

Both Q1 and Q2 affect only Change 3 (onKeyDown handler). If owner prefers
different behaviour, the handler sketch above can be adjusted with ≤3 lines
changed.

---

### 2.7 Verification Matrix (seeds Gate 6 QA)

| Edit # | File | Change Description | How to Verify | Test ID |
|--------|------|--------------------|---------------|:-------:|
| 1 | `DirectDispatchForm.jsx` line ~476 | search onKeyDown Enter → first row auto-checks + qty focused | Browser: type "amer" in search → Enter → American Corn checkbox becomes checked + qty input is focused and editable | V1 |
| 2 | `DirectDispatchForm.jsx` line 747 | `disabled` guard removes `!row.included` | Browser: click on any qty field of unchecked row → cursor appears, typing works | V2 |
| 3 | `DirectDispatchForm.jsx` line ~746 | qty onKeyDown Enter → auto-checks row if qty>0 + focus jumps to next row | Browser: type "10" in first qty → Enter → row 1 auto-checks, cursor jumps to row 2's qty | V3 |
| 4 | Regression: dispatch still submits only included rows | Line 316 submit gate unchanged | Browser: type qty on a row but do NOT press Enter or checkbox → submit → that row NOT in payload | V4 |
| 5 | Regression: FEFO source auto-selects on qty entry | `updateDispatchRow` qty branch unchanged | Browser: type qty on batched item → FEFO allocation appears in source column | V5 |
| 6 | Regression: FEFO source stays disabled on unchecked row | Line 770 guard unchanged | Browser: type qty on unchecked row → source select stays visually disabled until Enter auto-checks row | V6 |

---

## Summary

| Field | Value |
|-------|-------|
| Code Reality | NONE — handlers completely absent at target locations |
| Conflict | NONE — no parallel active work on same file |
| Files changed | 1 — `DirectDispatchForm.jsx` |
| Total edits | 3 (2 additive `onKeyDown` props + 1 guard removal) |
| Lines added | ~14 (+8 search, +6 qty) |
| Lines modified | 1 (line 747 disabled guard) |
| Risk | LOW-MEDIUM (Change 2 is the only behaviour change; mitigated by submit gate) |
| API changes | NONE |
| Hook changes | NONE |
| Backend changes | NONE |
| Open Questions | 2 (Q1: trigger timing; Q2: auto-uncheck) — both affect only Change 3 sketch |

**Gate 2 complete. Awaiting owner answers on Q1+Q2 before Gate 3.**
