# BUG-055 — Intake Artifact (Gate 1)

> **ID:** BUG-055
> **Type:** BUG
> **Registered:** 2026-10-19
> **Agent Role:** INTAKE
> **Severity:** P2 — MEDIUM
> **Related to:** CR-047 (Add Stock Spreadsheet UX — omission from implementation)
> **Sprint:** S5

---

## Problem Statement (A1)

The Add Stock form (`/purchase`) does not expose an **Invoice #** field. The
backend `add-purchase` API accepts `invoice_number` as an optional string, and
`api.js` exposes `checkInvoiceNumber()` for duplicate detection — but the form
never adds the field, never sets state for it, and never passes it in the
`addPurchase()` payload. Storekeepers cannot record which supplier invoice a
purchase corresponds to.

---

## Code Reality Check

```bash
grep -c "invoiceNumber\|invoice_number\|Invoice #" \
  frontend/src/components/central-inventory/AddStockPurchaseForm.jsx
# → 0
```

**Code Reality: NONE** — no invoice # state, no input field, no payload key exists
in AddStockPurchaseForm.jsx.

`api.js` does NOT need modification — `addPurchase()` (line 796) is a raw
payload passthrough. Adding `invoice_number` to the payload in the form is
sufficient.

---

## Duplicate Check

| Check | Result |
|-------|--------|
| CR-040 Invoice Number Duplicate Pre-Check | **DISTINCT** — CR-040 adds duplicate detection in the PO screen (PurchaseOrderDetail.jsx). A1 is about the Add Stock form (AddStockPurchaseForm.jsx). Different file, different screen. |
| SESSION_HANDOVER_20261019_001.md Priority 2 | **MATCHES** — handover flagged "Invoice number field (AddStockPurchaseForm) — investigation done, not yet registered". A1 is exactly this. |
| BUG-054 (keyboard nav) | DISTINCT |

**Duplicate check: DISTINCT. Anticipated in SESSION_HANDOVER_20261019_001.md but never registered.**

---

## Evidence

| Type | Detail |
|------|--------|
| Code trace | `AddStockPurchaseForm.jsx` lines 207–233: payload has `vendor_id`, `purchase_date`, `payment_type`, `tot_amount`, `item_total`, `tot_fair`, `tot_tax`, `partial_payments`, `purchase_items` — **no `invoice_number`** |
| API contract | `checkInvoiceNumber()` in api.js (line 430) confirms API accepts `invoice_number` field; backend GET vendor-item-list returns `invoice_number` per row (confirmed in G-039 investigation) |
| Source | OWNER-REPORTED (A1, 2026-10-19) |
| Confidence | CONFIRMED — absent in code, supported by API |

---

## Fix Scope

**File:** `AddStockPurchaseForm.jsx` only — api.js unchanged.

| Step | Detail |
|------|--------|
| 1 | Add `const [invoiceNumber, setInvoiceNumber] = useState("")` with other header state (~line 60) |
| 2 | Add optional Invoice # `<Input>` in the header strip (near vendor, date, fare fields) |
| 3 | Add `...(invoiceNumber.trim() && { invoice_number: invoiceNumber.trim() })` to `payload` at line ~233 |

Optional but recommended: wire to `checkInvoiceNumber()` for live duplicate
detection (same pattern as CR-040 in PurchaseOrderDetail.jsx). Owner to
decide whether duplicate check is in scope for this fix.

---

## Blast Radius

| Metric | Value |
|--------|-------|
| Files affected | 1 — `AddStockPurchaseForm.jsx` |
| api.js | NO change needed |
| Other screens | NONE |
| Scope | SMALL — ~3 additions (state, input, payload key) |

---

## Severity Classification

**P2 — MEDIUM**

- Invoice # is optional metadata; the purchase itself can still be created
- Workaround: record invoice # separately outside the app
- Impact grows if owner uses Purchase Report (CR-051) to reconcile invoices —
  purchases made before this fix will have no `invoice_number` in the ledger

---

## Open Questions

**Q1 — Duplicate check:** Should the Invoice # input trigger
`checkInvoiceNumber(vendorId, invoiceNumber)` with a warning (same as
CR-040 in PO Receive)? Or just store the value without live checking?

Owner to decide. Recommendation: show a warning toast only (non-blocking),
consistent with CR-040 pattern.

---

## Next Step

→ **BUG FIX agent** (SMALL scope, 1 file, no Gate 3 plan needed).
Await owner answer on Q1 before implementing.
