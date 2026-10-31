# BUG-058 + BUG-059 — ARTIFACT 2: IMPACT ANALYSIS (BATCH)
> **IDs:** BUG-058, BUG-059
> **Artifact:** 2 — Impact Analysis (Gate 2)
> **Date:** 2026-10-20
> **Role:** PLANNING
> **Stage dispatch:** Impact Analysis only — STOP at Gate 2 per owner instruction
> **File:** `frontend/src/components/central-inventory/AddStockPurchaseForm.jsx`

---

## Code Reality Check (Step 0)

```bash
grep -n "Fare\|fare\|invoiceNumber\|invoice_number\|justFocused\|grid-cols-3\|Grand Total" \
  frontend/src/components/central-inventory/AddStockPurchaseForm.jsx | head -20
```

**Results:**
- `fare` state: line 42 — exists, populated ✅
- `invoiceNumber` state: line 43 — exists, populated ✅
- `grid-cols-3` (confirm header): line 303 — 3 cols only, fare missing ✅
- `Grand Total` (review screen): line 347 — uses `fullPayableTotal`, no breakdown ✅
- `justFocused`: NOT FOUND — fix not yet implemented ✅
- `useRef`: NOT in import line 2 — must be added ✅

**Code Reality: NONE — neither fix exists in codebase. Safe to proceed.**

---

## Conflict Pre-Check (Step 1)

**L7 last modifier of `AddStockPurchaseForm.jsx`:** BUG-055 + BUG-057 (2026-10-19) — IMPLEMENTED, QA PASS.

**Registry scan — open items on same file:**

| Item | Title | Status |
|------|-------|--------|
| CR-030 | Inward Screens Audit | QA (touches file via PO gate redirect — not same region) |
| CR-039 | Procurement Excel/CSV Import | QA_PASS |
| CR-047 | Add Stock Spreadsheet UX | IMPLEMENTED |
| CR-052 | Bulk Stock Import | PROPOSED (no plan yet) |
| BUG-051 | Duplicate Item Gate | PROPOSED (no plan yet) |
| BUG-055 | Invoice # Field | IMPLEMENTED |
| BUG-057 | Expiry Enter Navigation | IMPLEMENTED |

**Conflict analysis:**
- CR-052 / BUG-051: PROPOSED with no plan — no code in flight. NOT in conflict.
- CR-030: touches `AddStockPurchaseForm.jsx` only for PO gate redirect (lines 131–132, `setBlocked`). BUG-058/059 work in lines 295–365 and SpreadsheetRow (~654+). **No overlap. NOT in conflict.**
- All IMPLEMENTED items: closed. No risk.

**Verdict: NO CONFLICTS. Both bugs are parallel-safe on this file.**

---

## BUG-058 — Impact Analysis

### Symptom
"Confirm Stock Purchase" review screen shows Vendor / Date / Payment header (3 cols).
Fare and Invoice # are not visible. Grand Total is correct (items + fare) but shows no breakdown.

### Data Flow Trace

```
State (main component, lines 40–54):
  fare            line 42:  Number — e.g. 100
  invoiceNumber   line 43:  String — e.g. "iiinu8"
  grandTotal      line 86:  useMemo — sum of row item totals (excl. fare)
  fullPayableTotal line 92: grandTotal + fare

confirmMode guard (line 295):
  if (confirmMode && isFormValid) → render review block

Review block render (lines 295–365):
  ┌─ Header strip (lines 302–321) ──────────────────────────────────┐
  │  <div className="grid grid-cols-3 gap-3 text-xs">               │
  │    <div> Vendor: {selectedVendor?.vendor_name} </div>           │
  │    <div> Date: {purchaseDate} </div>                            │
  │    <div> Payment: {isSplit ? legs… : legs[0]?.mode} </div>      │
  │    ← fare: NOT HERE                                             │
  │    ← invoiceNumber: NOT HERE                                    │
  └─────────────────────────────────────────────────────────────────┘
  ┌─ Grand Total footer (lines 346–351) ────────────────────────────┐
  │  <div className="px-4 py-2.5 border-t bg-green-50 ...">         │
  │    "Grand Total"  ₹ {fullPayableTotal}                         │
  │    ← No items subtotal line                                     │
  │    ← No fare breakdown line                                     │
  └─────────────────────────────────────────────────────────────────┘
```

### Affected Files

| File | Lines | Change Type | Risk |
|------|-------|-------------|------|
| `AddStockPurchaseForm.jsx` | 303 | Widen `grid-cols-3` → `grid-cols-2 sm:grid-cols-5` (or conditionally 3/4/5) | LOW |
| `AddStockPurchaseForm.jsx` | 346–351 | Add items subtotal + fare rows before Grand Total | LOW |

**No other file affected.** Review screen is fully self-contained in this single render block.

### Risk Assessment

| Change | Risk | Reason |
|--------|------|--------|
| Widening header grid | LOW | Purely additive, no state change |
| Adding fare + invoice # cells | LOW | Read-only display of existing state variables |
| Adding subtotal breakdown rows | LOW | Read-only arithmetic, `grandTotal` already computed |
| Conditional rendering (only if fare > 0 / invoiceNumber set) | LOW | Standard React conditional |

**No API calls. No state mutations. No downstream consumers of this render block.**

### Downstream Consumers
None — the confirm screen is a dead-end render. User either clicks "Back to Edit" (sets `confirmMode=false`) or "Confirm & Add Stock" (calls `handleSubmit`). Neither path is affected by adding display fields.

### Open Questions
None. Business rules clear:
- Show Fare only if `Number(fare) > 0`
- Show Invoice # only if `invoiceNumber.trim()` is non-empty
- Items subtotal always shown when fare > 0 (to make the breakdown meaningful)

---

## BUG-059 — Impact Analysis

### Symptom
Pressing Enter on the BATCH input focuses the Expiry date field for ~0ms, then immediately
advances to the next row's item search. User cannot type a date.

### Root Cause (confirmed — Chromium keyup-transfer behaviour)

```
handleKeyDown("batch", e) — fires on batch's onKeyDown:
  e.preventDefault()
  document.getElementById('expiry-{idx}')?.focus()   → date input gains focus

Chromium: keyup fires on element with focus at release time (not at press time).
  → keyup fires on date input
  → date input's onKeyUp={e => handleKeyDown("expiry", e)} fires
  → handleKeyDown("expiry", e): "expiry" is index 3 (last in order[])
  → !e.shiftKey → advance to next row
  → date field skipped entirely
```

### Data Flow Trace

```
SpreadsheetRow component (line 654):
  function SpreadsheetRow({ idx, row, … }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    ← useRef NOT imported, NOT used anywhere in SpreadsheetRow

  handleKeyDown(field, e) — line 682:
    order = ["qty", "rate", "batch", "expiry"]
    Enter/Tab on "batch" (index 2):
      → e.preventDefault()
      → document.getElementById('expiry-{idx}').focus()   ← focuses date input

  Expiry <Input> — line 804–809:
    <Input id={`expiry-${idx}`}
      type="date"
      value={row.expiry}
      onChange={e => onUpdate("expiry", e.target.value)}
      onKeyUp={e => handleKeyDown("expiry", e)}           ← BUG SITE
      className="h-[28px] text-xs" />

  handleKeyDown("expiry", e) with Enter:
    index = 3 (last) → else branch:
      !e.shiftKey → if (isLast && row.itemId && qty > 0 && row.batch):
        onTabFromLast() + focus new row's item search
      else:
        focus next row's item-select button
    → Either way: leaves date field immediately
```

### Affected Files

| File | Lines | Change Type | Risk |
|------|-------|-------------|------|
| `AddStockPurchaseForm.jsx` | 2 | Add `useRef` to React import | LOW |
| `AddStockPurchaseForm.jsx` | ~657 | Add `const justFocused = useRef(false)` inside SpreadsheetRow | LOW |
| `AddStockPurchaseForm.jsx` | 804–809 | Add `onFocus` + guard in `onKeyUp` on expiry Input | LOW |

**No other file affected.** `SpreadsheetRow` is a file-local component, not exported.

### Risk Assessment

| Change | Risk | Reason |
|--------|------|--------|
| Add `useRef` to import | NONE | Additive import only |
| Add ref inside SpreadsheetRow | NONE | Local to component, no external consumers |
| Add `onFocus` to expiry input | LOW | Only sets a ref flag — no re-render, no side effects |
| Guard in `onKeyUp` | LOW | Early return skips advance on first keyup only |
| Interaction with BUG-057 fix | NONE | BUG-057 was about Popover open from expiry Enter (different path). `btn.focus(); btn.click()` in BUG-057 runs when `isLast + batch + qty` — completely different condition. No overlap. |

### Downstream Consumers
None — `SpreadsheetRow` is a file-local component. `handleKeyDown` is file-local. No exports.

### Note on Sub-Field Navigation
Native `<input type="date">` sub-fields (mm / dd / yyyy in en-US locale) navigate with Tab
and ArrowLeft/ArrowRight, not Enter. Making Enter step through sub-fields requires replacing
the native date input with a custom picker. **This is out of scope for BUG-059.**

After the fix: flow will be:
```
[Batch field] → Enter → [Date field focused] → user types date (Tab/Arrow between sub-fields)
→ Enter → [next row item search opens]
```
This matches owner intent: "BATCH → Enter → date → Enter → next row".

### Open Questions
None. Implementation approach is unambiguous.

---

## Shared Summary

| Item | Files WILL change | Files will NOT touch | Scope |
|------|-------------------|----------------------|-------|
| BUG-058 | `AddStockPurchaseForm.jsx` (lines 303, 346–351) | All other files | SMALL |
| BUG-059 | `AddStockPurchaseForm.jsx` (lines 2, ~657, 804–809) | All other files | SMALL |

**Both bugs share the same file. Zero overlap between their respective edit regions.
They can be implemented in the same session without conflict.**

---

## Verification Matrix (seeds QA — Gate 6)

| # | Bug | Edit | How to Verify | Automated? |
|---|-----|------|---------------|:---:|
| V1 | BUG-058 | Header: Fare visible in review | Enter fare > 0 → Review → check header shows Fare row | NO |
| V2 | BUG-058 | Header: Invoice # visible in review | Enter invoice # → Review → header shows it | NO |
| V3 | BUG-058 | Header: no Fare row when fare = 0 | Leave fare blank → Review → no Fare row | NO |
| V4 | BUG-058 | Header: no Invoice # row when empty | Leave invoice # blank → Review → no Invoice # row | NO |
| V5 | BUG-058 | Subtotal breakdown: items + fare rows | fare > 0 → Review → items subtotal + fare lines shown | NO |
| V6 | BUG-058 | Grand Total = items + fare (unchanged) | 2 items ₹500 + fare ₹100 → Grand Total = ₹600 | NO |
| V7 | BUG-059 | Enter on batch → date field focused (not skipped) | Enter on batch → cursor lands in date input | NO |
| V8 | BUG-059 | Date field accepts typing after batch Enter | Enter batch → type date via keyboard → date value set | NO |
| V9 | BUG-059 | Enter on date field → next row opens | Focus date → press Enter → next row item search opens | NO |
| V10 | BUG-059 | Tab from batch → date still works | Tab from batch → date focused → Enter → next row | NO |

---

## Post-Code Registry Checklist (for IMPLEMENTATION agent)

```
- [ ] registry.json: BUG-058 → status: IMPLEMENTED, artifact_refs updated
- [ ] registry.json: BUG-059 → status: IMPLEMENTED, artifact_refs updated
- [ ] L3/L4: rows updated with new status
- [ ] L7: AddStockPurchaseForm.jsx entry added for BUG-058 + BUG-059
- [ ] Code markers: // BUG-058 at review header + footer edits
- [ ] Code markers: // BUG-059 at justFocused ref + onFocus + onKeyUp guard
- [ ] Dashboard drift check: node control/gen_dashboard_data.js --check → PASS
```

---

## Handover → Owner (Gate 2 Complete)

```
Impact Analysis complete for BUG-058 + BUG-059.
Artifact at: control/sessions/BUG-058_059_ARTIFACT_2_IMPACT_ANALYSIS.md

Both bugs: 1 file (AddStockPurchaseForm.jsx), no conflicts, no API changes.
Code Reality: NONE (fixes don't exist yet).
Scope: SMALL — 3 edit regions for BUG-058 (header grid, Grand Total footer), 3 for BUG-059 (import, ref, onKeyUp guard).
Verification matrix: 10 checks (all manual/browser).

Owner decisions needed: NONE — business rules and fix approach are unambiguous.

Awaiting Gate 3 (Implementation Plan) instruction.
```
