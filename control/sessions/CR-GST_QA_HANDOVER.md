# CR-GST — QA HANDOVER

> **Date:** 2026-10-31
> **Implementation Agent Self-Test:** 15/15 edits verified, compile PASS
> **Automated Test:** 13/13 frontend checks PASS (iteration_82)

---

## Test Credentials

- **Email:** manager@mygenietest002.com
- **Password:** Qplazm@10
- **Restaurant:** 828 (Mygenietest002, Central Store)

---

## Test Cases

### Purchase Form (/purchase → Manual Entry tab)

| # | Test Case | Expected Behavior |
|---|-----------|-------------------|
| 1 | Header strip fields | Vendor, Purchase Date, Invoice #, Fare, **Total GST**, Payment visible |
| 2 | Total GST input | `data-testid="tot-tax-input"`, accepts numeric, next to Fare |
| 3 | Table columns | #, Item, Qty, Unit, Unit Price, Amount, **GST**, Batch, Expiry — GST between Amount and Batch |
| 4 | Per-row GST input | `data-testid="gst-input-{i}"`, accepts numeric, placeholder "0" |
| 5 | Negative clamping | Enter -5 in Total GST → clamped to 0. Enter -3 in row GST → clamped to 0. |
| 6 | Tab order | Rate → GST → Batch (Tab key navigates correctly) |
| 7 | Auto-sync | Select item + qty + batch, enter row GST → Total GST auto-fills with sum |
| 8 | Row GST Total bar | Blue bar appears below green Grand Total bar when row GSTs > 0 |
| 9 | Payment includes GST | Single-leg payment amount = grandTotal + fare + totTax |
| 10 | Reset | Click Reset → Total GST, row GST, and all other fields clear |
| 11 | Confirm screen | Review shows: Total GST in header, GST column in table, breakdown with Items subtotal + Fare + Total GST |

### Purchase Report (/reports/purchase)

| # | Test Case | Expected Behavior |
|---|-----------|-------------------|
| 12 | GST column header | "GST" header visible between "Item Amt" and "Fare" |
| 13 | Existing data | Purchase with gst=null shows "—" in GST column |
| 14 | Multi-item purchase | Header row shows sum of line GSTs; sub-rows show per-item GST |

### End-to-End (not yet tested — requires real API submission)

| # | Test Case | Expected Behavior |
|---|-----------|-------------------|
| 15 | Submit purchase with GST | POST payload includes `tot_tax` and `purchase_items[].gst`. API returns success. |
| 16 | Report shows saved GST | After submission, refresh /reports/purchase → new purchase row shows GST values |

---

## Screenshots

- Purchase form with GST fields: verified in self-test (screenshot attached to iteration)
- Purchase report with GST column: verified in self-test (screenshot attached to iteration)
