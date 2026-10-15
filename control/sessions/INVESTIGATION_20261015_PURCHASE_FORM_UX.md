# INVESTIGATION REPORT — Purchase Form UX (7 Issues)

> **Date:** 2026-10-15
> **Agent Role:** INVESTIGATION
> **Scope:** AddStockPurchaseForm.jsx — 7 owner-reported UX gaps
> **Credentials used:** manager@testcentral.com / Qplazm@10 (RID 807, Master Store)
> **Code edits:** NONE — investigation only
> **Mockup:** `/app/control/sessions/purchase_form_mockup.html`

---

## Environment Check

| Check | Result |
|-------|--------|
| Login (manager@testcentral.com) | ✅ Token issued, RID 807 |
| restaurant_type returned | ⚠️ `null` (this account has no restaurant_type set) |
| get-vendor API | ⚠️ 404 on proxy `/api/proxy/v2/get-vendors` → correct path is `/proxy/v2/inventory/get-vendor` |
| get-inventory-master | 0 items for this account (no seeded data on RID 807) |
| stock-inventory | 0 items |

> **Note:** API probing for data shape done against known working account (RID 806) via existing API docs and contracts in `AI/Plans/`.

---

## Issue-by-Issue Root Cause Analysis

---

### Issue 1 — Multi-Vendor Support on Single Page

#### Current Behaviour
`vendorId` is a **single shared state** for the entire session (line 42, `AddStockPurchaseForm.jsx`). All lines in a purchase share the same vendor:
```js
// Line 42
const [vendorId, setVendorId] = useState("");
// Line 142 — all lines get same vendorId
vendor_id: Number(vendorId),
```

#### API Reality
`POST /inventory/add-stock/{inventoryMasterId}` already accepts `vendor_id` in the body. Since each line is **already submitted as a separate API call** (line 138: `for (const line of validLines)`), the API already supports per-line vendor.

#### Root Cause Classification
**Frontend gap only.** The backend is ready. The frontend just renders one shared vendor picker instead of one per item row.

#### Fix Location
- `AddStockPurchaseForm.jsx` — `createEmptyLine()` (line 47) add `vendorId: ""`
- `updateLine()` (line 97) — already handles per-line state
- Confirm view (line 217) — add per-line vendor display
- Submit (line 142) — use `line.vendorId` instead of shared `vendorId`
- Remove top-level vendor card block

#### Blast Radius: SMALL (1 file)

---

### Issue 2 — Total Amount Auto-Calculate from Unit Price × Quantity

#### Current Behaviour
`Unit Price` and `Total Amount` are **independent manual inputs** (lines 489–498). No formula binding. User must type both. The fields are only shown when `showCommercial` is true (line 487).

```jsx
// Line 494-497 — both are free-form, no computed link
<Input value={line.price} onChange={(e) => updateLine(idx, "price", e.target.value)} />
<Input value={line.amount} onChange={(e) => updateLine(idx, "amount", e.target.value)} />
```

#### API Reality
`add-stock` payload accepts both `price` (unit price) and `tot_amount` (total). They can differ (e.g., discount applied). Auto-compute is safe — the user can still override `tot_amount`.

#### Root Cause Classification
**Frontend gap only.** Simple computed property missing in `updateLine`.

#### Fix Location
- `AddStockPurchaseForm.jsx` line 97 `updateLine()` — when field is `"price"` or `"quantity"`, also auto-compute `row.amount = price × qty`. Total Amount becomes read-only unless price is empty.

#### Blast Radius: SMALL (1 file, 10 lines)

---

### Issue 3 — Partial Payment Support (e.g. Cash + Tab)

#### Current Behaviour
Single `paymentType` Select (lines 516–524) with values: `Cash | Credit | Online`. One type per purchase session. No split capability.

#### API Reality
```
// From P35 contract (add-stock payload):
"payment_type": "Cash"  // single string only
```
Verified across all API docs (`P17P18P19`, `P35` contract) — **the backend `add-stock` API only accepts a single `payment_type` string**. No `payments: [{type, amount}]` field exists.

#### Root Cause Classification
**Backend gap (potential G-035).** The API does not support partial/split payment recording. Options:

| Option | Notes |
|--------|-------|
| A — Frontend multi-row UI, pick dominant type to API | UX improvement only, no split recorded at backend |
| B — New backend field `payment_splits: [{type,amount}]` | Requires backend change → file G-035 |
| C — Use `notes` or free-text field to record split | Quick workaround |

**Recommended:** Option A for now (frontend shows cash+credit rows, sends whichever is larger as `payment_type`). File G-035 to track proper backend split support.

#### Blast Radius: SMALL (1 file for UI) + potential new backend gap G-035

---

### Issue 4 — Auto Batch Label from Purchase Date + Item Name

#### Current Behaviour
Batch label is a free-text input (line 478). Placeholder shows "e.g. MAIDA-MAY-01" — it's a hint, not auto-generated.

#### Auto-Format Proposal
`{ITEM_SHORT_NAME}-{MON}-{DD}` derived from:
- `item.stock_title.split(" ")[0].toUpperCase()` → e.g., "MAIDA"
- `purchaseDate` → "OCT-15" from "2026-10-15"

**Result:** "MAIDA-OCT-15" — user can still edit it.

#### Fix Location
- `AddStockPurchaseForm.jsx` line 101: inside `if (field === "itemId")` block — set `row.batch` to generated value if batch is currently empty
- Also: add `useEffect` watching `purchaseDate` to regenerate batch for all lines where batch matches the old auto-pattern

#### Root Cause Classification
**Frontend gap only.**

#### Blast Radius: SMALL (1 file, ~15 lines)

---

### Issue 5 — Item Search + Add Option

#### Current Behaviour
`<Select>` dropdown (lines 443–454) renders all `inventoryItems` as `<SelectItem>`. No search/filter. On large catalogues (100+ items) this is unusable.

```jsx
// Line 443
<Select value={line.itemId} onValueChange={(v) => updateLine(idx, "itemId", v)}>
  <SelectContent>
    {inventoryItems.map((item) => <SelectItem .../>)}
  </SelectContent>
</Select>
```

#### Fix Location
Replace with Combobox pattern using `@/components/ui/command` + `@/components/ui/popover` (both exist in shadcn setup). Add "+ Add to Catalogue" option that navigates to `/catalogue`.

#### Root Cause Classification
**Frontend gap only.**

#### Blast Radius: SMALL (1 file, replaces Select block in item row)

---

### Issue 6 — Auto-Open New Item Row After Last Row Is Filled

#### Current Behaviour
`addLine()` (line 114) is only triggered by clicking "+ Add Another Item" button (line 503). No auto-progression.

#### Proposed Logic
```js
useEffect(() => {
  const last = lines[lines.length - 1];
  const lastComplete = last.itemId && Number(last.quantity) > 0
    && last.batch.trim() && last.expiryDate;
  if (lastComplete) addLine(); // auto-append empty row + scroll into view
}, [lines]);
```

Guard needed: only auto-add if the last line is the final one AND all 4 fields are filled AND `lines.length < MAX_LINES`.

#### Root Cause Classification
**Frontend gap only.**

#### Blast Radius: SMALL (1 file, ~15 lines + a ref for scroll)

---

### Issue 7 — Purchase Amount Missing on Review & Confirm Page

#### Current Behaviour (lines 206–252)
Confirm view shows: vendor, date, item name, batch, expiry, qty+unit, current→after stock delta.

**Missing from confirm view:**
- `line.price` (unit price per line)
- `line.amount` (total per line)
- Grand total = sum of all `line.amount`

```jsx
// Line 221-237 — no price/amount rendered
<div key={line.key} className="flex items-center justify-between text-xs">
  <div>
    <span>{item?.stock_title}</span>  // name
    {line.batch && <span>Batch: {line.batch}</span>}
    {line.expiryDate && <span>Exp: {line.expiryDate}</span>}
  </div>
  <div>
    <span>{line.quantity} {line.unit}</span>  // qty only
    {stock && <span>(now: ... → ... after)</span>}
  </div>
</div>
```

No `line.price` or `line.amount` display anywhere on the confirm page.

#### Fix Location
- Confirm view in `AddStockPurchaseForm.jsx` (lines 217–237): add per-line price + total columns
- Add grand total row below the item list

#### Root Cause Classification
**Frontend gap only.**

#### Blast Radius: SMALL (1 file, ~20 lines added to confirm view)

---

## Summary Table

| # | Issue | Category | Blast | API Gap? |
|---|-------|----------|:-----:|----------|
| 1 | Multi-vendor per line | Frontend gap | SMALL | None — API ready |
| 2 | Auto-calculate amount | Frontend gap | SMALL | None |
| 3 | Partial payment | Frontend + Backend gap | SMALL | **G-035 (potential new gap)** |
| 4 | Auto-batch label | Frontend gap | SMALL | None |
| 5 | Item search + add | Frontend gap | SMALL | None |
| 6 | Auto-open next item row | Frontend gap | SMALL | None |
| 7 | Amount on confirm page | Frontend gap | SMALL | None |

**6 of 7 are pure frontend gaps. 1 has a backend component (partial payment recording).**

---

## Recommended Next Steps

1. **Register as CR-047** (INTAKE role) — "Purchase Form UX Bundle" covering issues 1–7
2. **Register G-035** (if owner wants real split-payment backend recording) — "Add-stock API: split payment support"
3. **PLANNING role** for CR-047 — impact analysis + implementation plan (all in 1 file: `AddStockPurchaseForm.jsx`)
4. Review mockup at `/app/control/sessions/purchase_form_mockup.html` before proceeding to PLANNING

---

## Files Touched

None. Investigation only.
