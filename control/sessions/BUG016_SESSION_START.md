# Session-Start — BUG-016: display_qty String Arithmetic TypeError

> **Date:** 2026-06-01 (retroactive)
> **Agent:** E1 (found by testing_agent_v3, iteration_29)
> **BUG:** BUG-016
> **Status:** FIXED

---

## Issue
POS API returns `display_qty` as a string. StockAdjustmentForm.jsx and WastageEntryForm.jsx
performed arithmetic on this value without conversion, causing:
```
TypeError: ((itemObj.display_qty || 0) + Number(...)).toFixed is not a function
```

String `"24.82"` is truthy, so `(string || 0)` returns the string. `string + Number(10)` = `"24.8210"`.
`"24.8210".toFixed(2)` throws TypeError.

## Root Cause
Missing `Number()` wrapper on API response field before arithmetic.

## Fix
Wrapped all `itemObj.display_qty` references in `Number()`:
```js
Number(itemObj.display_qty || 0) + Number(quantity)
```

## Files Fixed
- StockAdjustmentForm.jsx (lines 182-201)
- WastageEntryForm.jsx (line 134)

## Prevention
Added to L2 Handover Protocol: "POS API returns display_qty as a string. Always wrap in Number()."
