# BUG-058 + BUG-059 — ARTIFACT 3: IMPLEMENTATION PLAN
> **IDs:** BUG-058, BUG-059
> **Artifact:** 3 — Implementation Plan (Gate 3)
> **Date:** 2026-10-20
> **Role:** PLANNING
> **Impact Analysis:** `control/sessions/BUG-058_059_ARTIFACT_2_IMPACT_ANALYSIS.md`
> **Target file:** `frontend/src/components/central-inventory/AddStockPurchaseForm.jsx` (883 lines)

---

## Scope Lock

**Files WILL change:**
- `frontend/src/components/central-inventory/AddStockPurchaseForm.jsx`

**Files will NOT touch:**
- `frontend/src/services/api.js` — no API changes
- `frontend/src/lib/screenVisibility.js` — FROZEN, untouched
- `frontend/src/lib/terminology.js` — FROZEN, untouched
- `backend/server.py` — no proxy changes
- Any other file

---

## Execution Order

```
Edit 1  (BUG-059) → line 2          React import — add useRef
Edit 2  (BUG-059) → line 656        SpreadsheetRow — add justFocused ref
Edit 3  (BUG-059) → lines 805–809   Expiry Input — add onFocus + onKeyUp guard
Edit 4  (BUG-058) → lines 302–320   Confirm header — add Fare + Invoice # cells
Edit 5  (BUG-058) → lines 346–351   Grand Total footer — add subtotal breakdown
```

Rationale: BUG-059 edits first because they are higher in the file (lines 2, 656, 805) and each is independent. BUG-058 edits are lower (302–351 in the confirm block). No ordering dependency between the two bugs.

---

## Edit 1 — BUG-059: Add `useRef` to React import
**File:** `AddStockPurchaseForm.jsx`
**Line:** 2

**Current code:**
```javascript
import { useState, useEffect, useCallback, useMemo } from "react";
```

**New code:**
```javascript
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
```

**Code marker:** already on line 1 (`// CR-047 ...`) — add `// BUG-059` inline comment at same line or on line 2 as suffix comment.

**Verification:** `grep -n "useRef" frontend/src/components/central-inventory/AddStockPurchaseForm.jsx | head -3` → shows line 2.

---

## Edit 2 — BUG-059: Add `justFocused` ref inside SpreadsheetRow
**File:** `AddStockPurchaseForm.jsx`
**Line:** 656 (after `const [search, setSearch] = useState("")`)

**Current code (lines 654–658):**
```javascript
function SpreadsheetRow({ idx, row, inventoryItems, ownStock, itemIdCount, isLast, canDelete, onUpdate, onDelete, onTabFromLast }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const isDuplicate = row.itemId && (itemIdCount[row.itemId] || 0) > 1;
```

**New code:**
```javascript
function SpreadsheetRow({ idx, row, inventoryItems, ownStock, itemIdCount, isLast, canDelete, onUpdate, onDelete, onTabFromLast }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const justFocused = useRef(false); // BUG-059: guard against keyup firing on focus-transfer from batch

  const isDuplicate = row.itemId && (itemIdCount[row.itemId] || 0) > 1;
```

**Verification:** `grep -n "justFocused" frontend/src/components/central-inventory/AddStockPurchaseForm.jsx` → shows 3 lines (ref declaration + onFocus + onKeyUp guard after Edit 3).

---

## Edit 3 — BUG-059: Add `onFocus` + `onKeyUp` guard on Expiry input
**File:** `AddStockPurchaseForm.jsx`
**Lines:** 805–809

**Current code:**
```jsx
        <Input id={`expiry-${idx}`} data-testid={`expiry-input-${idx}`}
          type="date" value={row.expiry} autoComplete="off"
          onChange={e => onUpdate("expiry", e.target.value)}
          onKeyUp={e => handleKeyDown("expiry", e)}
          className="h-[28px] text-xs" />
```

**New code:**
```jsx
        <Input id={`expiry-${idx}`} data-testid={`expiry-input-${idx}`}
          type="date" value={row.expiry} autoComplete="off"
          onChange={e => onUpdate("expiry", e.target.value)}
          onFocus={() => { justFocused.current = true; }}
          onKeyUp={e => { // BUG-059: skip the keyup that fires when focus arrives from batch Enter
            if (justFocused.current) { justFocused.current = false; return; }
            handleKeyDown("expiry", e);
          }}
          className="h-[28px] text-xs" />
```

**Verification:**
1. Enter on Batch field → date input is focused (was already working)
2. Date field stays focused → user can type / arrow-key through mm/dd/yyyy
3. Press Enter on date field → `justFocused.current` is false → `handleKeyDown("expiry", e)` fires → advances to next row
4. Tab from Batch → date: `onFocus` sets `justFocused = true`, Tab keyup fires → guard fires → `justFocused` cleared → date stays focused (Tab does not trigger the guard's early return because Tab does not reach `onKeyUp` in the same way — but even if it does, only the first keyup is skipped, keeping date active)

---

## Edit 4 — BUG-058: Confirm header — add Fare + Invoice # cells
**File:** `AddStockPurchaseForm.jsx`
**Lines:** 302–320 (header strip inside confirm block)

**Current code:**
```jsx
          <div className="px-4 py-2.5 border-b bg-muted/30">
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Vendor</p>
                <p className="font-medium">{selectedVendor?.vendor_name || vendorId}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Date</p>
                <p className="font-medium">{purchaseDate}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Payment</p>
                <p className="font-medium text-[11px]">
                  {isSplit
                    ? legs.filter(l => l.mode && Number(l.amount) > 0).map(l => `${l.mode}: ₹${Number(l.amount).toFixed(2)}`).join(" + ")
                    : (legs[0]?.mode || "—")}
                </p>
              </div>
            </div>
          </div>
```

**New code:**
```jsx
          <div className="px-4 py-2.5 border-b bg-muted/30">
            {/* BUG-058: flex-wrap so Fare + Invoice # appear naturally when present */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Vendor</p>
                <p className="font-medium">{selectedVendor?.vendor_name || vendorId}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Date</p>
                <p className="font-medium">{purchaseDate}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Payment</p>
                <p className="font-medium text-[11px]">
                  {isSplit
                    ? legs.filter(l => l.mode && Number(l.amount) > 0).map(l => `${l.mode}: ₹${Number(l.amount).toFixed(2)}`).join(" + ")
                    : (legs[0]?.mode || "—")}
                </p>
              </div>
              {Number(fare) > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Fare</p>
                  <p className="font-medium">₹{Number(fare).toFixed(2)}</p>
                </div>
              )}
              {invoiceNumber.trim() && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Invoice #</p>
                  <p className="font-medium font-mono text-[11px]">{invoiceNumber.trim()}</p>
                </div>
              )}
            </div>
          </div>
```

**Verification:**
- With fare > 0 + invoice #: header shows 5 items wrapped across 1–2 rows ✅
- With fare = 0, no invoice #: header shows 3 items, identical to today ✅
- With fare > 0, no invoice #: header shows 4 items ✅

---

## Edit 5 — BUG-058: Add items subtotal + fare breakdown before Grand Total
**File:** `AddStockPurchaseForm.jsx`
**Lines:** 346–351 (Grand Total footer row)

**Current code:**
```jsx
          <div className="px-4 py-2.5 border-t bg-green-50 flex justify-between items-center">
            <span className="text-[11px] font-medium text-green-700">Grand Total</span>
            <span className="text-sm font-bold text-green-700 tabular-nums">
              ₹ {fullPayableTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
```

**New code:**
```jsx
          {/* BUG-058: items subtotal + fare breakdown — shown only when fare > 0 */}
          {Number(fare) > 0 && (
            <div className="border-t">
              <div className="px-4 py-1.5 flex justify-between text-xs text-muted-foreground">
                <span>Items subtotal</span>
                <span className="tabular-nums">₹ {grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="px-4 py-1.5 flex justify-between text-xs text-muted-foreground border-t border-border/30">
                <span>Fare</span>
                <span className="tabular-nums">₹ {Number(fare).toFixed(2)}</span>
              </div>
            </div>
          )}
          <div className="px-4 py-2.5 border-t bg-green-50 flex justify-between items-center">
            <span className="text-[11px] font-medium text-green-700">Grand Total</span>
            <span className="text-sm font-bold text-green-700 tabular-nums">
              ₹ {fullPayableTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
```

**Verification:**
- fare = 0: breakdown not shown; Grand Total renders exactly as today ✅
- fare = 100, items = 500: Items subtotal ₹500.00, Fare ₹100.00, Grand Total ₹600.00 ✅
- Grand Total value unchanged (still `fullPayableTotal`) ✅

---

## Verification Matrix

| # | Bug | Edit # | File | Expected | Self-test method |
|---|-----|--------|------|----------|-----------------|
| V1 | BUG-058 | 4 | AddStockPurchaseForm.jsx | Header shows Fare when fare > 0 | Enter fare ₹100 → Review → check header |
| V2 | BUG-058 | 4 | AddStockPurchaseForm.jsx | Header shows Invoice # when non-empty | Enter invoice "INV-1" → Review → check |
| V3 | BUG-058 | 4 | AddStockPurchaseForm.jsx | Fare/Invoice # absent when not entered | Leave both blank → Review → only 3 cols |
| V4 | BUG-058 | 5 | AddStockPurchaseForm.jsx | Breakdown rows visible when fare > 0 | fare ₹100 → Review → Items sub + Fare rows |
| V5 | BUG-058 | 5 | AddStockPurchaseForm.jsx | Grand Total = items + fare (unchanged) | 2 items ₹500 + fare ₹100 → GT = ₹600 |
| V6 | BUG-058 | 5 | AddStockPurchaseForm.jsx | Breakdown absent when fare = 0 | No fare entered → no subtotal section |
| V7 | BUG-059 | 3 | AddStockPurchaseForm.jsx | Enter on Batch → date field focused, NOT skipped | Tab/Enter from batch → date input focused; cursor visible |
| V8 | BUG-059 | 3 | AddStockPurchaseForm.jsx | Date field accepts keyboard input after batch Enter | Enter batch → type date → date value updates |
| V9 | BUG-059 | 3 | AddStockPurchaseForm.jsx | Enter on date field → next row item search opens | Focus date → press Enter → row+1 item search opens |
| V10 | BUG-059 | 1+2 | AddStockPurchaseForm.jsx | No compile errors from useRef addition | `tail -5 /var/log/supervisor/frontend.out.log` → "Compiled" |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|:----------:|:------:|-----------|
| flex-wrap layout breaks on narrow screens | LOW | LOW | `gap-x-6 gap-y-2` gives natural wrapping — tested mentally with 5 items at 120px each on 375px screen → wraps to 2 rows cleanly |
| `justFocused` ref stale across rows | NONE | — | Each row has its OWN `SpreadsheetRow` instance, its own `justFocused` ref — no cross-row pollution |
| Tab from batch also triggers guard | NEGLIGIBLE | LOW | Tab moves to date via browser default tab order, not via `handleKeyDown`; `onKeyUp` fires for Tab but `justFocused` is only set on `onFocus` — and even if triggered, only one keyup is eaten |
| BUG-057 fix interaction (btn.focus + btn.click) | NONE | — | BUG-057 path fires when `isLast && itemId && qty>0 && batch` — completely separate from the expiry onKeyUp path |
| `Number(fare) > 0` when fare is empty string | NONE | — | `fare` state initialised as `0` (line 42), and the fare input uses `type="number"` min=0; `Number("")` is 0 |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-058 → status: "IMPLEMENTED", artifact_ref[3] path + DONE
- [ ] registry.json: BUG-059 → status: "IMPLEMENTED", artifact_ref[3] path + DONE
- [ ] L4_BUG_TRACKER.md: BUG-058 + BUG-059 rows → IMPLEMENTED
- [ ] L7_FILE_OWNERSHIP.md: AddStockPurchaseForm.jsx entry appended for BUG-058, BUG-059
- [ ] Code markers verified:
      grep -n "BUG-058\|BUG-059" frontend/src/components/central-inventory/AddStockPurchaseForm.jsx
      → must show at least 1 line each
- [ ] Dashboard: node control/gen_dashboard_data.js --check → PASS (exit code 0)
- [ ] Compile: tail -5 /var/log/supervisor/frontend.out.log → "Compiled" or "compiled"
```

---

## Handover → Owner (Gate 3 Complete)

```
Implementation Plan ready.
Artifact: control/sessions/BUG-058_059_ARTIFACT_3_IMPLEMENTATION_PLAN.md

5 edits across 1 file (AddStockPurchaseForm.jsx).
Scope lock: ONLY AddStockPurchaseForm.jsx changes. No other file touched.
Verification matrix: 10 checks (all browser/manual).
Owner decisions needed: NONE.

Awaiting Gate 4 GO to proceed to IMPLEMENTATION.
```
