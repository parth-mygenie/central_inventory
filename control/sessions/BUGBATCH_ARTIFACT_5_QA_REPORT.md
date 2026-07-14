# QA Report (Artifact #5) — BUG-023, BUG-021, BUG-020, BUG-022 (Batch)

> **Date:** 2026-06-14
> **Tester:** Testing Subagent (automated)
> **Status:** ALL PASS (6/6)

---

## BUG-023: DollarSign → IndianRupee

| # | Test | Result |
|---|------|:------:|
| F1 | Production Run Form → cost card shows ₹ icon | **PASS** — "₹7.00 (₹1.40/piece)" |
| F2 | Production History → Unit Cost / Total Cost shows ₹ | **PASS** — "₹4.9K TOTAL", "₹2.48" |
| F3 | Sub-Recipe Master → cost card shows ₹ | **PASS** — icon correct |

## BUG-021: Remove Adjust Stock Card

| # | Test | Result |
|---|------|:------:|
| D1 | Operations Hub Quick Actions — no Adjust Stock | **PASS** — card gone, others intact |

## BUG-020: "Unknown: —" → Store Names

| # | Test | Result |
|---|------|:------:|
| C1 | Store Detail / History — From/To show real names | **PASS** — "german fluid", "Cost Test Outlet", etc. |

## BUG-022: Gate Page → Auto-Redirect

| # | Test | Result |
|---|------|:------:|
| E1 | /purchase → /purchase/orders when PO required | **PASS** — redirect works |

## Files Changed

| File | Change |
|------|--------|
| `ProductionRunForm.jsx` | DollarSign → IndianRupee (import + usage) |
| `ProductionHistory.jsx` | DollarSign → IndianRupee (import + 2 usages) |
| `SubRecipeMaster.jsx` | DollarSign → IndianRupee (import + usage) |
| `RecipeCatalogue.jsx` | DollarSign → IndianRupee (import only) |
| `OperationsHub.jsx` | Removed Adjust Stock card block |
| `StoreDetail.jsx` | Added useRestaurantMap, resolved From/To by ID |
| `AddStockPurchaseForm.jsx` | Gate page → `<Navigate to="/purchase/orders" replace />` |

---

## Owner Signoff: PENDING
