# Approved Preview Screenshot Index

> **Date:** 2026-06-01
> **Location:** `frontend/public/__dev/previews/`
> **Total Files:** 9
> **Total Screens Covered:** 24 + 3 modals + 2 inline elements = 29 elements

---

## Preview File Index

| # | File | Size (lines) | Screens Covered | Status |
|---|------|:------------:|:---------------:|:------:|
| 1 | `A1_operations_hub.html` | 364 | A1 Hub + Post-Submit Confirmation + Your Latest Request + Cross-Item Expiry Scan | VERIFIED |
| 2 | `B1_request_stock.html` | 307 | B1 Intelligent PO (Suggested Reorder tab shown, Manual Request tab defined) | VERIFIED |
| 3 | `B2_pending_queues.html` | 345 | B2 Pending Queues (3 approval cards: stale, aging, fresh) + empty state pattern defined | VERIFIED |
| 4 | `B3_transfer_detail.html` | 343 | B3 Transfer Detail (Requester Store Snapshot, Impact Summary, Line Items, Actions, Disabled Explanation) | VERIFIED |
| 5 | `B5_direct_dispatch.html` | 285 | B5 Direct Dispatch (Destination picker, Health strip, Needs table, FEFO segments, Duplicate warning) | VERIFIED |
| 6 | `B6_B7_B8_modals.html` | 288 | B6 Source Selector modal + B7 Receive Dialog + B8 Dispute Resolution | VERIFIED |
| 7 | `C_stock_operations.html` | 594 | C1 Adjustment + C2 Wastage + C3 Procurement (Upload Invoice + Manual Entry tabs) + C4 Wastage Report | VERIFIED |
| 8 | `D_stock_visibility.html` | 350 | D1 Stock Inventory Summary + D2 Stock Detail (FEFO) + D3 History/Ledger + D4 Status Timeline (2 variants) | VERIFIED |
| 9 | `E_configuration.html` | 339 | E1 Settings + E2 Vendors + E3-E6 Catalogue + E7 Consumption Report + E8 Hierarchy Management | VERIFIED |

---

## Coverage Matrix

| Phase 7 Screen ID | Screen Name | Preview File | Covered? |
|:------------------:|------------|:------------:|:--------:|
| A-1 | Operations Hub | A1 | YES |
| B-1 | Request Stock (Intelligent PO) | B1 | YES |
| B-2 | Pending Queues (Approval Inbox) | B2 | YES |
| B-3 | Transfer Detail | B3 | YES |
| B-4 | Direct Dispatch | B5 | YES |
| B-5 | Source Selector | B6_B7_B8 | YES |
| B-6 | Receive Dialog | B6_B7_B8 | YES |
| B-7 | Approve Wave Dialog | B6_B7_B8 (B6 section) | PARTIAL — approve wave not explicitly shown; source selector shown instead. Approve wave intelligence defined in text. |
| B-8 | Dispute Resolution | B6_B7_B8 | YES |
| B-9 | Post-Submit Confirmation | A1 (inline) | YES |
| C-1 | Stock Adjustment | C | YES |
| C-2 | Wastage Entry | C | YES |
| C-3 | Procurement (3-mode) | C | YES |
| C-4 | Wastage Report | C | YES |
| D-1 | Stock Inventory Summary | D | YES |
| D-2 | Stock Detail Panel (FEFO) | D | YES |
| D-3 | History & Ledger | D | YES |
| D-4 | Status Timeline | D | YES |
| E-1 | Operational Settings | E | YES |
| E-2 | Vendor Management | E | YES |
| E-3 | Ingredient Catalogue | E | YES |
| E-4 | Product Catalogue | E (same pattern as E-3) | IMPLIED |
| E-5 | Recipe Catalogue | E (same pattern as E-3) | IMPLIED |
| E-6 | Addon Recipe Catalogue | E (same pattern as E-3) | IMPLIED |
| E-7 | Daily Consumption Report | E | YES |
| E-8 | Hierarchy Management | E | YES |

---

## Notes

1. **B-7 (Approve Wave Dialog):** Phase 7 describes this as an enhancement to the existing `ApproveWaveDialog.jsx`. The preview file `B6_B7_B8_modals.html` shows the Source Selector (B6), Receive Dialog (B7), and Dispute Resolution (B8). The Approve Wave Dialog intelligence (FEFO badges, auto-select FEFO, over-approve warning) is described in text within Phase 7 spec but not separately previewed. **This is acceptable** — the intelligence elements are clear from the spec and follow the same badge/warning patterns visible in other modals.

2. **E-4, E-5, E-6 (Product, Recipe, Addon-Recipe Catalogues):** Phase 7 spec states "Same pattern as E-3" for these screens. The E preview shows the Ingredients catalogue table with "Used in X recipes" and "Pushed to X stores" columns. The other catalogues replicate this exact pattern with entity-specific data. **No separate preview needed.**

3. **All intelligence legend sections** at the bottom of each preview are documentation aids, not UI elements to implement. They serve as implementation notes for developers.

---

## Access URLs (Preview Mode)

```
https://<app-url>/__dev/previews/A1_operations_hub.html
https://<app-url>/__dev/previews/B1_request_stock.html
https://<app-url>/__dev/previews/B2_pending_queues.html
https://<app-url>/__dev/previews/B3_transfer_detail.html
https://<app-url>/__dev/previews/B5_direct_dispatch.html
https://<app-url>/__dev/previews/B6_B7_B8_modals.html
https://<app-url>/__dev/previews/C_stock_operations.html
https://<app-url>/__dev/previews/D_stock_visibility.html
https://<app-url>/__dev/previews/E_configuration.html
```

Dev dashboard: `https://<app-url>/__dev/index.html`
