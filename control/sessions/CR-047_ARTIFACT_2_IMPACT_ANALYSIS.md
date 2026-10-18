# CR-047 — Gate 2: Impact Analysis

> **ID:** CR-047
> **Artifact:** 2 — Impact Analysis
> **Role:** PLANNING
> **Date:** 2026-10-18
> **Agent:** PLANNING
> **Credential used for API probes:** owner@mygenietest002.com / Qplazm@10 (RID 828, type: master)
> **Code Reality:** PARTIAL (form exists, spreadsheet/add-purchase/split-payment = NONE)
> **Feeds:** CR-047_ARTIFACT_3_IMPLEMENTATION_PLAN.md (Gate 3 — next step)

---

## Conflict Pre-Check (Step 1)

### L7 File Ownership check

| File | Last Modifier | Last Item | Risk |
|------|--------------|-----------|------|
| `AddStockPurchaseForm.jsx` | CR-039 (2026-07-11) | Template download + file upload + parse preview + continue to PO | ✅ No open item |
| `api.js` | BUG-047 (2026-07-24) | deleteAddonRecipe payload fix | ✅ No open item |

**Conflict conclusion:** NONE — both files were last touched in July and no other item is currently in-flight on them. Safe to plan.

---

## API Probes (Step 1b — live verification)

### Probe 1 — add-purchase (new endpoint)
```
POST /api/proxy/v2/inventory/add-purchase
Credential: owner@mygenietest002.com / RID 828

Request payload:
{
  "vendor_id": 282,
  "purchase_date": "2026-10-18",
  "payment_type": "Cash",
  "tot_amount": 160,
  "item_total": 160,
  "tot_fair": 0,
  "tot_tax": 0,
  "purchase_items": [
    { "Ingredient": 20856, "Unit": "kg", "quantity": 2,
      "rate": 80, "Amount": 160,
      "batch": "MAKKHAN-OCT-18", "expiry_date": "2027-01-01" }
  ]
}

Response: HTTP 200
{
  "purchase_details": {
    "id": 8005,
    "transaction_id": "PUR-828-20261018-8005",
    "tot_amount": 160,
    "payment_type": "Cash",
    "purchase_date": "2026-10-18",
    "vendor_id": 282,
    "restaurant_id": 828
  },
  "transaction_id": "PUR-828-20261018-8005",
  "partial_payments": [],
  "added_items": [
    { "id": 13786, "ingredient": 20856, "stock_quantity": 2, "sunit": "kg",
      "purchase_id": 8005, "batch": "MAKKHAN-OCT-18", "expiry_date": "2027-01-01" }
  ]
}
```
**RESULT: ✅ CONFIRMED. Endpoint live, proxy handles it, no server.py change needed.**

### Probe 2 — get-inventory-master (item list for combobox)
```
GET /api/proxy/v2/inventory/get-inventory-master
RID 828 → 75 items across 2 categories
Categories: "Vegetables & Herbs" (74 items), "desi dairy" (1 item: makkhan)
Item shape: { id, stock_title, unit, display_unit, category_id: {id, name}, ... }
```
**RESULT: ✅ CONFIRMED. 75 items, `category_id.name` for grouping in combobox.**

### Probe 3 — get-vendor (vendor list)
```
GET /api/proxy/v2/inventory/get-vendor
RID 828 → 1 vendor: { id: 282, vendor_name: "masala dairy",
  contact_person_name: "masala man", contact_number: null }
```
**RESULT: ✅ CONFIRMED. Single vendor for this account — dropdown works.**

### Probe 4 — split payment (partial_payments[])
```
Confirmed from INVESTIGATION_20261016_ADD_PURCHASE_API.md (RID 807):
{ payment_type: "partial", partial_payments: [{payment_mode:"Cash",amount:1500},{payment_mode:"UPI",amount:960,transaction_id:"..."}] }
⚠ Backend does NOT validate sum(partial_payments.amount) === tot_amount — frontend MUST enforce.
```
**RESULT: ✅ CONFIRMED. Frontend validation required.**

---

## Data Flow Trace (Step 2)

### Current flow (to be replaced by CR-047)

```
[User action: fill card form, click Review & Confirm]
     ↓
AddStockPurchaseForm.jsx:handleSubmit() [line 134]
  → for loop over validLines
  → per item: api.addStockPurchase(line.itemId, payload) [line 152]
     ↓
api.js:addStockPurchase(inventoryMasterId, payload) [line 790]
  → POST /proxy/v2/inventory/add-stock/{inventoryMasterId}
  → payload: { quantity, unit, vendor_id, batch, expiry_date, purchase_date, payment_type, price, tot_amount }
  → on success: _invalidateStockCaches()
     ↓
backend/server.py:proxy_v2() [PASS-THROUGH — no transform]
  → POST preprod.mygenie.online/api/v2/vendoremployee/inventory/add-stock/{id}
     ↓
AddStockPurchaseForm.jsx [line 163–166]
  → successCount++ per item → toast("N items added") → setSuccessResult
```

**Problems in this flow:**
1. N API calls for N items — no atomicity, partial failure possible
2. Old endpoint is deprecated, does not support split payment
3. No `transaction_id` returned (old response has no `PUR-RID-DATE-ID`)
4. Payment modes hardcoded as Cash/Credit/Online (wrong — should be Cash/Card/UPI/Bank Transfer/Others)

### New flow (CR-047 target)

```
[User action: type in spreadsheet row, Tab/Enter to next cell]
     ↓
AddStockPurchaseForm.jsx [rewritten spreadsheet table]
  → ItemSearchCombobox: fuzzy search over inventoryItems[] (75 items, grouped by category)
  → qty entry → autoBatch() fires: "{ITEM_ABBREV}-{MON}-{DD}"
  → computeTotal(qty, rate) → Amount = qty × rate
  → Tab on last field → new row auto-opens
     ↓
[User action: single/split payment toggle]
  → Single: select one of Cash/Card/UPI/Bank Transfer/Others
  → Split: "+ Add payment" adds partial_payments[] rows
  → Live balance check: sum(partials) vs grand total
     ↓
[User action: Review → Confirm & Add Stock]
     ↓
AddStockPurchaseForm.jsx:handleSubmit() [rewritten]
  → ONE call: api.addPurchase(payload) [NEW function in api.js]
  → payload: {
      vendor_id, purchase_date, payment_type, tot_amount, item_total, tot_fair:0, tot_tax:0,
      [partial_payments] (only if split),
      purchase_items: [{ Ingredient, Unit, quantity, rate, Amount, batch, expiry_date }]
    }
     ↓
api.js:addPurchase(payload) [NEW at ~line 791]
  → POST /proxy/v2/inventory/add-purchase
  → on success: _invalidateStockCaches()
     ↓
backend/server.py:proxy_v2() [PASS-THROUGH — no change]
     ↓
AddStockPurchaseForm.jsx [success handler — rewritten]
  → setSuccessResult({ count: added_items.length, transactionId, vendor })
  → Success screen shows: "N items added · PUR-828-20261018-8005"
```

---

## Affected Files (Step 2)

### File 1: `frontend/src/services/api.js`

| Edit | Location | Change | Risk |
|------|----------|--------|------|
| A1 | After line 792 | Add `addPurchase(payload)` function: `POST /proxy/v2/inventory/add-purchase` + `_invalidateStockCaches()` | LOW — isolated new function |
| A2 | Line 790–791 | Keep `addStockPurchase` intact (do NOT remove — may still be used elsewhere). Add `// CR-047 — DEPRECATED after CR-047 ships` comment | LOW — no behaviour change |
| A3 | Line 1239 (exports) | Add `addPurchase` to exports object | LOW |

**Risk assessment:** LOW. New function doesn't touch existing cache logic or existing functions.

**Grep check:**
```
grep -rn "addStockPurchase" frontend/src/ --include="*.jsx" --include="*.js"
→ Confirm only AddStockPurchaseForm.jsx uses it (safe to deprecate in-place)
```

### File 2: `frontend/src/components/central-inventory/AddStockPurchaseForm.jsx`

This is a **FULL REWRITE** of the Manual Entry tab + handleSubmit + success screen. The Upload Invoice tab (CR-039 work, lines 261–383) is **PRESERVED UNCHANGED**.

| Section | Current Lines | Change | Risk |
|---------|--------------|--------|------|
| State declarations | 23–46 | Add: `rows[]`, `splitPayments[]`, `grandTotal`, keep existing vendor/date state | LOW |
| `createEmptyLine()` | 46–48 | Keep as-is (reused in spreadsheet rows) | NONE |
| `fetchData()` | 50–93 | Unchanged (correct API calls, correct PO-required check) | NONE |
| `updateLine()` | 97–112 | Extend: add `autoBatch()` trigger when `itemId` + `quantity` both set | LOW |
| Payment section | 509–525 | Replace: Cash/Credit/Online `<Select>` → Cash/Card/UPI/Bank Transfer/Others; add split toggle + `partial_payments[]` rows | MEDIUM |
| Items section | 420–506 | Replace: card-per-item stacked layout → `<table>` spreadsheet with `<tbody>` rows. Same data per row, different layout | MEDIUM |
| `handleSubmit()` | 134–168 | Replace: per-item loop calling `addStockPurchase()` → single call to `addPurchase()` with `purchase_items[]` array | HIGH — payload shape completely changes |
| Success screen | 190–203 | Extend: add `transactionId` display (`PUR-828-YYYYMMDD-ID`) | LOW |
| Confirm screen | 205–253 | Extend: add unit price + total per line, grand total, transaction preview | LOW |
| `isValid` check | 118 | Extend: add split payment balance check (must balance if split) | LOW |

**Key new utility functions (internal to component, no shared file needed yet):**

```javascript
// Auto-generate batch label: {3-char item abbrev}-{MON}-{DD}
function autoBatch(stockTitle) {
  const abbrev = stockTitle.slice(0,3).toUpperCase().replace(/\s/g,'');
  const now = new Date();
  const mon = now.toLocaleString('en',{month:'short'}).toUpperCase();
  const dd = String(now.getDate()).padStart(2,'0');
  return `${abbrev}-${mon}-${dd}`;
}

// Compute line total
function computeTotal(qty, rate) {
  const q = Number(qty), r = Number(rate);
  return (!isNaN(q) && !isNaN(r) && q > 0 && r > 0) ? (q * r).toFixed(2) : "";
}

// Grand total across all rows
function computeGrandTotal(rows) {
  return rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
}
```

**Note on `ItemSearchCombobox`:** The intake doc says "create shared utilities" but at this scope, implement directly inside the rewritten component using Radix `Command` (already imported in the codebase via shadcn). No new file needed for CR-047; extract to shared component in CR-048 planning phase if needed.

### File 3: `backend/server.py`

**NO CHANGE NEEDED.** The existing catch-all `@api_router.api_route("/proxy/v2/{path:path}")` at line 165 already handles `POST /proxy/v2/inventory/add-purchase` transparently.

---

## Downstream Consumer Check (Step 2)

| Consumer | Uses | Impact |
|----------|------|--------|
| `PostSubmitConfirmation.jsx` | Rendered on success; takes `itemCount`, `summary`, `destinationName` | No change to component. `handleSubmit` updates `successResult` shape → extend to include `transactionId`. No risk. |
| `useWriteAction.js` | Used for `execute()` wrapper | NOT used in new single-call path. `handleSubmit` calls `api.addPurchase()` directly. Remove `execute()` dependency for submit path. |
| `getStockInventory` cache | Invalidated by `_invalidateStockCaches()` | ✅ Already invalidated by `addStockPurchase` — no change to cache layer needed |
| `getInventoryMaster` cache | Invalidated by `_invalidateStockCaches()` | ✅ Same as above |
| CR-039 Upload Invoice tab | Lines 261–383 of current file | **PRESERVED UNCHANGED** — spreadsheet rewrite only touches Manual Entry tab |
| `poRequired` redirect | Lines 182–184 | **PRESERVED UNCHANGED** — `DIRECT_PURCHASE_REQUIRES_PO` error handling stays |

---

## Risk Register (Step 2)

| # | Risk | Level | Mitigation |
|---|------|:-----:|-----------|
| R1 | Keyboard Tab/Enter navigation in `<table>` cells interferes with browser native tab order | MEDIUM | Use `onKeyDown` handlers on each `<input>`: `if(e.key==='Tab'||e.key==='Enter') { e.preventDefault(); focusNextCell(idx, field) }`. Standard pattern used in spreadsheet UIs. |
| R2 | `api.js` export list at line 1239 — new `addPurchase` must be added; if missed, runtime `is not a function` error | LOW | Self-test: `grep "addPurchase" frontend/src/services/api.js` must show 3 hits (declaration, export, component import). |
| R3 | Split payment balance validation: frontend must enforce `sum(partial_payments.amount) === tot_amount` since backend silently accepts unbalanced splits | MEDIUM | Disable "Confirm" button until `splitBalanced === true`. Show live diff badge: `₹2,460 / ₹2,460 ✓` or `₹1,500 entered of ₹2,460 ⚠`. |
| R4 | `Command` combobox (Radix) with 75+ items — performance with every keystroke | LOW | `useMemo` filter over `inventoryItems` — standard pattern. 75 items is well below threshold. |
| R5 | CR-039 Upload Invoice tab (lines 261–383) is preserved unchanged — risk of accidental edit | LOW | Scope-lock comment `// CR-039 — DO NOT MODIFY (upload invoice tab)` at top of that section. |
| R6 | `useWriteAction.execute()` is removed from the submit path — if `useWriteAction` has side effects (loading state, error display) that must be preserved | LOW | Verify: `useWriteAction` is only used for `submitting` state. Replace with local `const [submitting, setSubmitting] = useState(false)` in rewritten submit path. |

---

## Open Questions for Owner (Step 2)

**None.** All owner decisions were resolved in Intake (CR-047_ARTIFACT_1_INTAKE.md) and confirmed in INVESTIGATION_20261016_ADD_PURCHASE_API.md.

Recap of confirmed decisions:
| Decision | Answer |
|----------|--------|
| Payment modes | Cash, Card, UPI, Bank Transfer, Others |
| UPI ref field | Optional |
| Fare (`tot_fair`) | Exposed, default 0 |
| Tax (`tot_tax`) | Hidden, always 0 |
| Transaction ID on success | Yes — show `PUR-828-...` |
| Add-to-catalogue | Inline modal (backlogged — not in CR-047 scope) |
| `useWriteAction` for loop | Remove from new single-call submit path |

---

## Scope Lock Declaration

**Files WILL change:**
1. `frontend/src/components/central-inventory/AddStockPurchaseForm.jsx` — Manual Entry tab rewrite + handleSubmit + success screen
2. `frontend/src/services/api.js` — add `addPurchase()` function + export

**Files will NOT touch:**
- `backend/server.py` (proxy handles add-purchase already)
- `frontend/src/lib/terminology.js` (FROZEN)
- `frontend/src/lib/screenVisibility.js` (FROZEN)
- `frontend/src/components/central-inventory/PurchaseOrderCreate.jsx` (CR-048 scope)
- `frontend/src/components/central-inventory/PurchaseOrderDetail.jsx` (CR-049 scope)
- CR-039 Upload Invoice tab (lines 261–383 of AddStockPurchaseForm.jsx — PRESERVED)

---

## Verification Matrix (seeds Gate 6 QA)

| # | File | Change | How to Verify | Automated? |
|---|------|--------|---------------|:---:|
| V1 | api.js | `addPurchase()` exists and exported | `grep -n "addPurchase" frontend/src/services/api.js` → 3+ hits | NO |
| V2 | AddStockPurchaseForm.jsx | Spreadsheet table renders (not cards) | Browser: Manual Entry tab → items section shows `<table>` with columns | NO |
| V3 | AddStockPurchaseForm.jsx | Vendor select + item combobox + qty + batch + expiry in one row | Browser: enter 1 item, Tab through all cells without mouse | NO |
| V4 | AddStockPurchaseForm.jsx | Auto-batch fires when item + qty both set | Browser: select Tomato, enter qty 10 → batch auto-fills "TOM-OCT-18" | NO |
| V5 | AddStockPurchaseForm.jsx | computeTotal fires on qty/rate entry | Browser: qty 10, rate 25 → Amount auto-fills "250.00" | NO |
| V6 | AddStockPurchaseForm.jsx | New row opens automatically when last field complete | Browser: Tab out of last field of row 1 → row 2 appears | NO |
| V7 | AddStockPurchaseForm.jsx | Grand total bar shows running total | Browser: add 2 rows with rates → grand total updates | NO |
| V8 | AddStockPurchaseForm.jsx | Single payment: Cash/Card/UPI/Bank Transfer/Others | Browser: open payment section → 5 options, NOT Cash/Credit/Online | NO |
| V9 | AddStockPurchaseForm.jsx | Split payment: 2 payment rows balance check | Browser: split ₹160 as Cash ₹100 + UPI ₹60 → "₹160 / ₹160 ✓"; Cash ₹100 only → shows deficit | NO |
| V10 | AddStockPurchaseForm.jsx | Single API call on submit (not loop) | Browser Network tab: exactly 1 POST to /add-purchase on confirm | NO |
| V11 | AddStockPurchaseForm.jsx | Success screen shows transaction_id | Browser: after submit → "PUR-828-20261018-XXXX" visible on success | NO |
| V12 | AddStockPurchaseForm.jsx | CR-039 Upload Invoice tab unchanged | Browser: switch to Upload Invoice tab → still shows OCR zone + Excel upload | NO |
| V13 | AddStockPurchaseForm.jsx | poRequired redirect still works | Curl: if settings.require_po_for_purchase=true → redirect to /purchase/orders | NO |
| V14 | api.js | _invalidateStockCaches() called after addPurchase | Code review: `addPurchase` must chain `.then(r => { _invalidateStockCaches(); return r; })` | NO |

---

## Gate 2 Summary

| Field | Value |
|-------|-------|
| Code reality | PARTIAL (card form exists, spreadsheet+new API = NONE) |
| Conflict | NONE |
| Files WILL change | 2 (`AddStockPurchaseForm.jsx`, `api.js`) |
| Files NOT touching | 5+ (server.py, frozen files, other CR files) |
| Risks | 6 identified (R3 split-payment balance = MEDIUM; R1 keyboard nav = MEDIUM; rest LOW) |
| API probed live? | YES — add-purchase confirmed, transaction_id PUR-828-20261018-8005 created |
| Owner decisions needed | NONE — all resolved at Intake |
| Verification steps | 14 checks, all manual browser verification |

**→ Gate 2 COMPLETE. Ready for Gate 3 (Implementation Plan).**
**→ Owner can proceed directly to Gate 3 — no questions to answer.**
