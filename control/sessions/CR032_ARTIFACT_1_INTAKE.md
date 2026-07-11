# CR-032 — Artifact 1: Intake (Outward Screens Audit)

> **Date:** 2026-06-13
> **Scope:** Store Management, Product Catalog, Stock Inventory, Pending Queues, History & Ledger

---

## Screen 1: Store Management (`/store-management`)

### What's Working ✅
- Tab layout: Summary + Manage Stores (CR-027 merge of HierarchySummary + HierarchyManagement)
- Manage Stores: 5 children visible (3 Master, 2 Outlet + 1 sub-outlet)
- Type badges (Master/Outlet) with correct color coding
- Push Status with staleness detection ("Stale — 53 items behind", "57 items behind")
- Push Now / Push buttons per store
- Create Store button
- Store type filter tabs (All/Master Stores/Outlets) with counts
- "5 direct children" count display
- Push History expandable section

### Issues Found ⚠️
| # | Issue | Severity | Root Cause |
|---|-------|----------|------------|
| O-1 | **"test 1" store visible** — appears to be test data from P23 hierarchy probing (BUG-014). Shows "Stale — 57 items behind". | LOW | Known issue (BUG-014). Test entity cleanup needed in preprod. |
| O-2 | **Alpha Outlet One shows "—" for email, created, push status** — missing data for this store | MEDIUM | Data issue. Store exists in hierarchy but metadata incomplete. Could be a child-of-child that the API returns differently. |
| O-3 | **Summary tab (HierarchySummary) not verified** — needs separate screenshot. May show stale or missing data. | MEDIUM | Needs testing. |
| O-4 | **No "Edit Store" action** — can only create and push, can't edit store details | LOW | May be intentional (POS manages store details). |

---

## Screen 2: Product Catalog (`/product-catalog`)

### What's Working ✅
- 3 tabs: Foods, Categories, Addons
- Foods: search, add, edit, delete with confirmation dialog
- "Has Recipe" column with cross-reference from actual recipe data — working ("Yes" badges)
- Categories: CRUD functional
- Addons: CRUD functional
- Status badges (Active/Inactive)
- data-testid on all elements

### Issues Found ⚠️
| # | Issue | Severity | Root Cause |
|---|-------|----------|------------|
| O-5 | **Very few products (2 foods)** — this might be a data issue, but the screen should handle large datasets with pagination | LOW | Data-dependent. UI works with small and large sets. |
| O-6 | **No recipe CRUD in Product Catalog** — per CR-027 navigation restructure, recipes were supposed to be accessible from Product Catalog. Currently only Foods/Categories/Addons. Recipe management is only via the separate RecipeCatalogue component which has no route in the current navigation. | HIGH | Missing implementation. CR-027 removed the old `/catalogue/recipes` route and redirects to `/product-catalog`, but `ProductCatalogue.jsx` doesn't include a Recipes tab. `RecipeCatalogue.jsx` exists but is orphaned. |
| O-7 | **No addon recipe CRUD in Product Catalog** — same as above. `AddonRecipeCatalogue.jsx` exists but orphaned after CR-027 route changes. | HIGH | Same as O-6. Old route `/catalogue/addon-recipes` redirects to `/product-catalog` but tab doesn't exist. |
| O-8 | **Food price shows raw number without currency** — "10", "20" instead of "₹10", "₹20" | LOW | Display format. |

---

## Screen 3: Stock Inventory (`/inventory`)

### What's Working ✅
- CR-029 FG/Raw split: All (47), Finished Goods (4), Raw Materials (43) tabs
- KPI cards: Total Items (47), Low Stock (1), Categories (4)
- Search, Category filter, Sort (Low Stock First)
- Hierarchy toggle visible ("My store" switch) — CR-016
- Low stock highlight (coffee beans in red with "Low" badge)
- Expiry Risk column with "View detail" links
- Pending column
- Days of Cover column
- CSV export button
- Refresh with staleness indicator ("just now")
- Click-through to Stock Detail (`/inventory/:id`)

### Issues Found ⚠️
| # | Issue | Severity | Root Cause |
|---|-------|----------|------------|
| O-9 | **"Days of Cover" shows "-0d" for some items** (Baking Powder, Baking Soda) — negative zero is a display artifact | LOW | Floating point rounding. `Math.round()` can produce `-0`. Should use `Math.abs()` or clamp to 0. |
| O-10 | **"Back" button at top of Stock Inventory** — this is a main nav screen, not a drill-down. The back button is misleading. | MEDIUM | UI inconsistency. Likely leftover from when this was a child route. Should be removed or hidden for top-level nav. |
| O-11 | **Store label shows "Store #806"** — should show actual store name from login context, or use terminology mapping | LOW | Display. Header shows "Central Store — Store #806". Could show "german fluid" instead. |
| O-12 | **CR-016 hierarchy toggle needs re-QA** — toggle exists but per registry, hook fix was applied and re-test is pending | MEDIUM | Known: CR-016 IN_PROGRESS, RE-QA-REQUIRED. |

---

## Screen 4: Pending Queues (`/queues`)

### What's Working ✅
- 4 tabs: Approvals (2), Ready to Dispatch (6), Receives, My Requests
- Card-based approval inbox with line-item visibility
- Fulfillment verdict badges ("Partial — 2 of 3 items", "Can fulfill")
- YOUR STOCK / AFTER APPROVAL projections per line
- Store health strip ("23 out 24 adequate")
- Age badges ("12h ago") with color escalation
- Reject / View Details / Partial Approve / Approve All quick actions
- Sort by "Oldest first"
- Insufficient stock warning (Sesame -4 piece shown in red)
- PO reference codes (TRF-806-2026-XXXX)
- data-testid on all elements

### Issues Found ⚠️
| # | Issue | Severity | Root Cause |
|---|-------|----------|------------|
| O-13 | **Requester store name shows "german fluid" instead of the requesting store's name** — in the card "german fluid → Outlet Direct One", "german fluid" is the source (self), not the requester. The subtitle says "german fluid requesting from you" which is wrong — it should be "Outlet Direct One requesting from you". | HIGH | Logic inversion. The source/destination labeling may be swapped for request-type transfers. Needs investigation in PendingQueues.jsx. |
| O-14 | **"0 items" in Ready to Dispatch tab** — not verified in this session, but from History screenshot all transfers show "0 items". May be a shared bug in items count calculation. | MEDIUM | Needs investigation. `formatItemsCount` may not be receiving line data. |

---

## Screen 5: History & Ledger (`/history`)

### What's Working ✅
- 2 tabs: Transfer History (13) + Stock Ledger
- PO/Ref column with `TRF-806-2026-XXXX` format (real `reference_code` from API)
- Status badges: Received, Partially Received, Approved, Rejected, Withdrawn — all rendering correctly
- Type badges: Direct Dispatch, Request, Modification
- Direction badges (Out)
- Source and Destination columns with store names resolved
- Date range picker
- Search by ID or store
- Status filter tabs (Requested, Partially Approved, Approved, etc.)
- All/Incoming/Outgoing filter
- Export CSV + Refresh buttons
- Click-through "View" action per row

### Issues Found ⚠️
| # | Issue | Severity | Root Cause |
|---|-------|----------|------------|
| O-15 | **"0 items" in Items column for ALL transfers** — every single transfer shows "0 items". This is clearly a bug. Transfer lines exist (we can see them in Pending Queues detail), but the history list view isn't counting them. | HIGH | `formatItemsCount` may be called with wrong argument, or the history API doesn't return `items_count` / `lines` array. Needs investigation in `HistoryLedger.jsx`. |
| O-16 | **Stock Ledger tab not verified** — needs separate testing. This tab derives entries from transfer details which requires additional API calls. | MEDIUM | Needs testing. |

---

## Summary: Prioritized Fix List

| Priority | ID | Screen | Issue | Effort |
|----------|-----|--------|-------|--------|
| **HIGH** | O-6 | Product Catalog | **Recipe tab orphaned** — no route after CR-027 | 2h |
| **HIGH** | O-7 | Product Catalog | **Addon Recipe tab orphaned** — same issue | 1h (bundled with O-6) |
| **HIGH** | O-13 | Pending Queues | **Requester name swapped** (shows self instead of requester) | 2h |
| **HIGH** | O-15 | History & Ledger | **"0 items" for all transfers** — items count broken | 2h |
| MEDIUM | O-2 | Store Mgmt | Alpha Outlet One missing metadata | 1h |
| MEDIUM | O-10 | Stock Inventory | Misleading "Back" button on main nav screen | 15min |
| MEDIUM | O-12 | Stock Inventory | CR-016 hierarchy toggle re-QA | 2h |
| MEDIUM | O-14 | Pending Queues | "0 items" in dispatch tab (may share root cause with O-15) | 1h |
| LOW | O-1 | Store Mgmt | "test 1" test data visible (BUG-014) | External cleanup |
| LOW | O-4 | Store Mgmt | No "Edit Store" action | 2h |
| LOW | O-8 | Product Catalog | No currency symbol on price | 15min |
| LOW | O-9 | Stock Inventory | "-0d" Days of Cover display | 15min |
| LOW | O-11 | Stock Inventory | "Store #806" instead of store name | 30min |
