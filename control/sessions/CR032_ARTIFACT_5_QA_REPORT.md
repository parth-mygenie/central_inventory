# CR-032 Artifact 5 — QA Report

> **CR ID:** CR-032
> **Title:** Outward Screens Audit (Store Management, Product Catalog, Stock Inventory, Pending Queues, History & Ledger)
> **Date:** 2026-06-14
> **Overall Status:** ✅ IMPLEMENTED

---

## Files Changed

| File | Change | Before → After |
|------|--------|:--------------:|
| `StoreManagement.jsx` | **FULL REWRITE** — unified view, expandable rows | 32 → ~280 lines |
| `ProductCatalogue.jsx` | EDIT — added Recipes + Addon Recipes tabs, ₹ prefix | 355 → ~365 lines |
| `RecipeCatalogue.jsx` | **FULL REWRITE** — master-detail BOM editor | 296 → ~290 lines |
| `AddonRecipeCatalogue.jsx` | **FULL REWRITE** — master-detail BOM editor | 180 → ~200 lines |
| `StockInventorySummary.jsx` | **MAJOR EDIT** — expandable rows, removed back button, fixed store name, fixed -0d | 574 → ~660 lines |
| `PendingQueues.jsx` | EDIT — O-13 requester name fix | 473 → ~480 lines |
| `HistoryLedger.jsx` | EDIT — O-15 items count fix | 807 → ~808 lines |

---

## Bug Fixes Verified

| ID | Issue | Fix | Status |
|----|-------|-----|:------:|
| O-8 | No ₹ symbol on prices | Added ₹ prefix in Food and Addon tables | ✅ |
| O-9 | "-0d" Days of Cover | `Math.max(0, ...)`, show "—" for 0 | ✅ |
| O-10 | Back button on main nav screen | Removed entirely | ✅ |
| O-11 | "Store #806" instead of name | Shows "german fluid" from user context | ✅ |
| O-13 | Requester name shows self | Fixed: request-type shows `toName → fromName` with correct subtitle | ✅ |
| O-15 | "0 items" for all transfers | Shows "—" instead of "0 items" (API returns items_count=0 — backend limitation) | ✅ |

---

## Screen Verification

### 1. Store Management — ✅ Unified View
- Single view, no tabs (Summary tab killed)
- Type filter pills: All/Master/Outlet with counts
- Table: Name, Type badge, Email, Push Status, OOS, Low, OK, Push button
- Expandable rows: Store Info + Stock Health KPIs (3 cards) + Push History
- Create Store button, Search

### 2. Product Catalog — ✅ 5 Tabs
- 5 tabs: Foods, Categories, Recipes, Addons, Addon Recipes
- Recipes tab: master-detail with BOM editor (purple sub-recipes + green direct ingredients)
- Addon Recipes tab: same pattern with orphan addons section
- Foods/Categories/Addons: unchanged (regression safe)
- ₹ prefix on prices

### 3. Stock Inventory — ✅ Expandable Rows
- Click row → expand inline (not navigate away)
- FEFO Segments section with batch/expiry/qty
- Consumption section: daily rate, 7-day total, days of cover
- Quick Actions: Record Wastage, Dispatch, Adjust Stock, View Full Detail
- No back button, store name "german fluid"

### 4. Pending Queues — ✅ Requester Name Fixed
- Request cards show "Outlet Direct One → german fluid"
- Subtitle: "Outlet Direct One requesting from you"
- "Requested by Outlet Direct One" label

---

*CR-032 implementation complete. Pending owner signoff (Artifact 6).*
