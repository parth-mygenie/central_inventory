# Code-Gate (Artifact #4) — BUG-023, BUG-021, BUG-020, BUG-022 (Batch)

> **Date:** 2026-06-14
> **Status:** APPROVED — all 4 are low-risk, no frozen files, no API changes

---

## BUG-023: DollarSign → IndianRupee (5 min)

| # | Check | Result |
|---|-------|--------|
| 1 | Frozen files? | NO |
| 2 | API changes? | NO |
| 3 | Regression risk? | NONE — 1:1 icon swap |

| File | Change |
|------|--------|
| `ProductionRunForm.jsx` | Import + usage: `DollarSign` → `IndianRupee` (lines 22, 438) |
| `ProductionHistory.jsx` | Import + usage: `DollarSign` → `IndianRupee` (lines 11, 199, 202) |
| `SubRecipeMaster.jsx` | Import + usage: `DollarSign` → `IndianRupee` (lines 13, 405) |
| `RecipeCatalogue.jsx` | Import: `DollarSign` → `IndianRupee` (line 12) — verify if used in JSX |

---

## BUG-021: Remove Adjust Stock Card (5 min)

| # | Check | Result |
|---|-------|--------|
| 1 | Frozen files? | NO — OperationsHub.jsx only |
| 2 | API changes? | NO |
| 3 | Regression risk? | NONE — card removal, route/component kept on disk |

| File | Change |
|------|--------|
| `OperationsHub.jsx` | Delete the `canDo("adjust-stock")` card block (~7 lines around 456-463) |

---

## BUG-020: "Unknown: —" → Restaurant Name Resolution (15 min)

| # | Check | Result |
|---|-------|--------|
| 1 | Frozen files? | NO |
| 2 | API changes? | NO — uses existing `useRestaurantMap` hook already working in HistoryLedger, PendingQueues, TransferDetail |
| 3 | Regression risk? | LOW — adding hook import + ID→name lookup in existing render |

| File | Change |
|------|--------|
| `StoreDetail.jsx` | Import `useRestaurantMap`, call hook, resolve `from_restaurant_id`/`to_restaurant_id` to names in transaction rows |

**Key check:** Verify the `transactions[]` from hierarchy-detail response include `from_restaurant_id` and `to_restaurant_id` fields. Owner confirmed they do (Impact Analysis Q4).

---

## BUG-022: Gate Page Auto-Redirect (10 min)

| # | Check | Result |
|---|-------|--------|
| 1 | Frozen files? | NO — AddStockPurchaseForm.jsx only |
| 2 | API changes? | NO |
| 3 | Regression risk? | LOW — replaces gate page with auto-redirect. Covers all entry points (Quick Action + Sidebar). |

| File | Change |
|------|--------|
| `AddStockPurchaseForm.jsx` | When `require_po_for_purchase === true`, replace gate page render with `<Navigate to="/purchase/orders" replace />` |

---

*All 4 approved to proceed. Implementation order: BUG-023 → BUG-021 → BUG-020 → BUG-022.*
