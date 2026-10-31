# BUG-059 — ARTIFACT 1: INTAKE
> **ID:** BUG-059
> **Title:** Add Stock — BATCH Enter Skips Date Field (keyup transfer bug)
> **Date:** 2026-10-20
> **Severity:** P2 — MEDIUM
> **Source:** OWNER-REPORTED
> **Confidence:** CONFIRMED (Chromium behaviour verified in code)

---

## Description
In the procurement spreadsheet, pressing Enter on the BATCH field should move focus to the
Expiry date field. Instead, the date field is focused for ~0ms and immediately skipped —
the next item row's search opens instead.

Owner's desired flow: BATCH → Enter → date field → [type date] → Enter → next row.

## Root Cause
`SpreadsheetRow.handleKeyDown("batch", e)`:
1. `e.preventDefault()` + `document.getElementById('expiry-{idx}')?.focus()`
   → date input receives focus

Chromium behaviour: when focus changes during `keydown`, the subsequent `keyup` fires on the
**newly focused element**. So the date input's `onKeyUp` fires with `e.key === "Enter"` and
`handleKeyDown("expiry", e)` immediately advances to next row before user types anything.

Note: `<input type="date">` sub-fields (mm/dd/yyyy) respond to Tab/ArrowRight for internal
navigation, not Enter. Making Enter step through sub-fields requires a custom date picker component.

## Evidence
- Code trace: `handleKeyDown` line 682–705; expiry `onKeyUp` line 808
- BUG-057 context: `onKeyUp` was introduced (replacing `onKeyDown`) to work around Chromium
  swallowing keydown on date inputs — but this also introduced the focus-transfer race.

## Steps to Reproduce
1. Login → /purchase → Manual Entry
2. Add an item, enter qty, rate
3. Tab/Enter to Batch field — type or accept auto-batch
4. Press Enter
5. **Expected:** Date field focuses, user can type date, Enter moves to next row
6. **Actual:** Date field flashes focus, next row's item search opens immediately

## Blast Radius
- Files: 1 (`AddStockPurchaseForm.jsx` — `SpreadsheetRow` component)
- Scope: SMALL (~5 lines)
- Hotspot files: NO

## Duplicate Check
DISTINCT — BUG-057 was about Popover not opening from expiry Enter. This is the inverse:
focus arriving at date triggers premature advance.

## Fix Approach
```jsx
// In SpreadsheetRow:
const justFocused = useRef(false);

// expiry <Input>:
onFocus={() => { justFocused.current = true; }}
onKeyUp={e => {
  if (justFocused.current) { justFocused.current = false; return; }
  handleKeyDown("expiry", e);
}}
```
Drops the spurious keyup that fires when focus arrives. After this, Enter on the date field
(once user has focused it intentionally) advances to next row as expected.
