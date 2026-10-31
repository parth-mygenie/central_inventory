# CR-040 — Invoice Number Duplicate Pre-Check (G-016)

> **Gates:** 2 + 3 combined | **Planned:** 2026-07-11 | **Agent:** PLANNING
> **Source:** `AI/openGaps/gap_validation.md` — G-016 FULLY RESOLVED
> **Code Reality:** PARTIAL — `PurchaseOrderDetail.jsx` receive form already captures `invoiceNumber` (state line 75) and sends it on receive; no duplicate check exists anywhere.

---

## 1. Impact Analysis (Gate 2)

### What backend now provides (verified 2026-07-07)
`POST /proxy/v2/inventory/purchase-order/check-invoice-number` `{vendor_id, invoice_number}` →
`{status:true, data:{available:true|false, existing_purchase_id, existing_purchase_order_id, existing_po_reference_code}}`

### Data flow (target)
```
PO Detail → Receive Goods form → invoice number input onBlur (debounced)
  → api.checkInvoiceNumber(vendorId, invoiceNumber)
  → available=false → inline amber warning: "Invoice already used on PO {existing_po_reference_code}"
  → non-blocking (backend accepts duplicates; we warn, not block)
```

### Affected files

| File | Change | Risk |
|------|--------|:---:|
| `frontend/src/services/api.js` | +1 method `checkInvoiceNumber` | LOW |
| `frontend/src/components/central-inventory/PurchaseOrderDetail.jsx` | onBlur check + warning UI in receive form (invoice input near state line 75 / receive form ~line 345+) | LOW |

### Conflict pre-check
`PurchaseOrderDetail.jsx`: BUG-044 (QA_PASS, not closed) touched it. Additive → parallel-safe; prefer execution after BUG-038→045 close.

### Open Questions (owner)
1. Warn-only (recommended) or hard-block receive on duplicate?

## 2. Implementation Plan (Gate 3)

### Edits

**Edit 1 — api.js (+ after `closePO`, ~line 1011):**
```js
// CR-040 — G-016 invoice duplicate pre-check
function checkInvoiceNumber(vendorId, invoiceNumber) {
  return client.post("/proxy/v2/inventory/purchase-order/check-invoice-number", {
    vendor_id: vendorId, invoice_number: invoiceNumber,
  });
}
```
Export it.

**Edit 2 — PurchaseOrderDetail.jsx.** Add state `invoiceCheck` (`null | {available, ref}`). On invoice input blur (and 500ms debounce on change), if non-empty + `po.vendor_id`: call `checkInvoiceNumber`; set state. Render under input:
- `available:false` → amber alert `data-testid="invoice-duplicate-warning"`: "⚠ Invoice already recorded against {existing_po_reference_code || 'another PO'}"
- `available:true` → subtle green "Invoice number available"
Clear on input change. Non-blocking — Receive button unaffected.

### Scope lock
- **WILL change:** `api.js`, `PurchaseOrderDetail.jsx`
- **Will NOT touch:** PO Create/List, server.py, any other screen

### Verification Matrix

| # | File | Change | How to Verify | Automated? |
|---|------|--------|---------------|:---:|
| 1 | api.js | method | curl check-invoice-number `{vendor_id, invoice_number:"INV-CR040-1"}` → available:true | YES |
| 2 | PODetail | warning shows | Receive a PO with invoice X, open another PO same vendor, type X → warning w/ PO ref | NO |
| 3 | PODetail | non-blocking | Warning shown but Receive still submits | NO |

### Post-code registry checklist
- [ ] registry.json: CR-040 → IMPLEMENTED · L3 · L7 · `// CR-040` markers · dashboard `--check` PASS
