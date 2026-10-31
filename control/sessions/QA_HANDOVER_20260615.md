# QA Handover — Sprint S3 Implementation Batch

> **From:** IMPLEMENTATION Agent
> **To:** QA Agent
> **Date:** 2026-06-15
> **Sprint:** S3
> **Preview URL:** `https://c461f1eb-85c7-4a22-9473-69a045470e4f.preview.emergentagent.com`

---

## Scope

**16 items requiring QA** — 9 CRs (previously implemented, QA reports exist but need re-verification on fresh deployment) + 7 BUGs (just implemented this session).

---

## Test Accounts

| Role | Email | Password | RID | Use For |
|------|-------|----------|:---:|---------|
| Central Store (TOP) | `manager@germanfluid.com` | `Qplazm@10` | 806 | Primary testing — all screens visible |
| Master Store (MID) | `manager@centralkitchenalpha.com` | `Qplazm@10` | 807 | Hierarchy toggle, limited nav |
| Outlet (BOTTOM) | `manager@outletdirectone.com` | `Qplazm@10` | 809 | Outlet-scoped screens |
| Central (Chai) | `owner@chai.com` | `Qplazm@10` | 813 | Alternative hierarchy for cross-checking |

---

## PART A: BUG-029 through BUG-035 (Just Implemented — Priority)

### BUG-029 — Consumption 0.0 fix (HIGH)
**File:** `IngredientCatalogue.jsx`
**What changed:** Added name-based fallback join in consumptionMap. When `ingredient_id` from daily-consumption-report doesn't match `inventory_master_id` from stock-inventory, falls back to matching by `stock_title` ↔ `ingredient_name`.

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| 1 | Consumption shows for known items | Login (germanfluid) → Raw Material Master → Expand "Whole Wheat Flour" | Daily Consumption shows non-zero value (e.g. "X.X kg/day"), not "—" |
| 2 | Days of Stock calculates | Same expanded row | Days of Stock shows a number (not "—") |
| 3 | Items without consumption show dash | Expand an item with no consumption history | Daily Consumption = "—", Days of Stock = "—" (graceful fallback) |

---

### BUG-030 — PO Create Residual Fixes (HIGH)
**File:** `PurchaseOrderCreate.jsx`
**What changed:** 6 sub-fixes — display_qty, daily-consumption-report API for DoC, rate=0 to API, search in By Item Need, KPIs fixed.

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| 1 | Stock shows display_qty | Purchase → Create PO → Select any vendor | Stock column shows human-readable qty (e.g. "29.87 kg" not "29865") |
| 2 | Days Will Last uses real consumption | Same screen | Days Will Last column reflects daily-consumption-report data, not purchase-history estimate |
| 3 | Rate sent as 0 to API | Create PO with items → Submit | PO created successfully (API receives expected_rate: 0). Check backend logs or PO detail. |
| 4 | By Item Need: search bar | Switch to "By Item Need" tab | Search bar visible above item table. Type ingredient name → filters correctly. |
| 5 | By Item Need: display_qty | By Item Need tab → Stock column | Shows display_qty (e.g. "3.21 kg" not "3210") |
| 6 | By Item Need: vendor picker | Find item with no purchase history | Vendor dropdown shows all vendors (not just "Pick vendor" disabled) |
| 7 | KPIs correct | By Item Need tab → KPI cards | Out of Stock / Low Stock counts match actual display_qty-based counts |

---

### BUG-031 — RM Stock Tab Cleanup (MEDIUM)
**File:** `StockInventorySummary.jsx`
**What changed:** Conditional tabs based on URL type param, "Sub Recipe" filtered from category dropdown, KPIs reflect filtered type.

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| 1 | RM Stock shows only Raw tab | Click "RM Stock" in sidebar (navigates to `/inventory?type=raw`) | Only "Raw Materials (44)" tab visible. No "All" or "Finished Goods" tab. |
| 2 | FG Stock shows only FG tab | Click "FG Stock" in sidebar (navigates to `/inventory?type=fg`) | Only "Finished Goods" tab visible. |
| 3 | Full inventory shows all tabs | Navigate to `/inventory` (no type param) | All 3 tabs visible: All, Finished Goods, Raw Materials |
| 4 | Sub Recipe not in categories | RM Stock → open "All Categories" dropdown | "Sub Recipe" does NOT appear in the list |
| 5 | KPIs match filtered type | RM Stock page | "Total Items" shows 44 (raw count), not 75 (all count). Low Stock count matches raw materials only. |

---

### BUG-032 — Stock Inventory Expanded Row (HIGH)
**Files:** `useStockInventory.js`, `StockInventorySummary.jsx`
**What changed:** Option C hybrid segment loading (background call without consumption), expiry risk inline dates, Adjust Stock button removed.

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| 1 | FEFO segments load | RM Stock → wait ~6 seconds → expand any item with stock (e.g. Ajwain on chai account) | FEFO SEGMENTS section shows batch rows with batch ID, expiry date, qty, unit cost. NOT "No segments". |
| 2 | Expiry Risk shows dates | RM Stock → wait for background load | Expiry Risk column shows days (e.g. "2d" in red, "92d" in grey). NOT "—" for items with segments. |
| 3 | Expiry Risk color coding | Check items with various expiry dates | Expired = red "Expired", <14d = amber, ≥14d = grey |
| 4 | Adjust Stock removed | Expand any item → Quick Actions | Only: Record Wastage, Dispatch, View Full Detail. NO "Adjust Stock" button. |
| 5 | Initial load is fast | Navigate to RM Stock | Page renders within ~3s with basic data. Segments fill in after ~6s background load. |

**Important:** The background segment load takes ~6 seconds. If you expand a row immediately after page load, segments may not be ready yet. Wait ~6-8 seconds or refresh.

---

### BUG-033 — Quick Action Pre-Selection (MEDIUM)
**Files:** `DirectDispatchForm.jsx`, `WastageEntryForm.jsx`
**What changed:** Both forms now read `?item=` URL param and pre-select the ingredient.

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| 1 | Wastage pre-select | RM Stock → expand item → click "Record Wastage" | Wastage form opens with that ingredient pre-selected in dropdown |
| 2 | Dispatch pre-select | RM Stock → expand item → click "Dispatch" | Dispatch form opens. If item is in dispatch needs table, it's visible. If not, it's added as a manual row. |
| 3 | No param = normal behavior | Navigate directly to `/wastage/new` (no ?item=) | Normal empty form, no pre-selection |

---

### BUG-034 — Sub-Recipe Delete → Toggle (MEDIUM)
**File:** `SubRecipeMaster.jsx`
**What changed:** Red "Delete" button replaced with Active/Inactive toggle switch. Backend API pending — shows toast stub.

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| 1 | Toggle visible | Sub-Recipe Master → select any sub-recipe | "Active" label + toggle switch visible in header (top-right). NO red "Delete" button. |
| 2 | Toggle interaction | Click the toggle switch | Toast appears: "Status toggle saved" + "Backend API pending — will sync when available." |
| 3 | No delete confirmation | Check for delete dialog | No delete confirmation dialog appears anywhere |
| 4 | BOM row delete still works | Edit sub-recipe → click trash icon on ingredient row | Individual ingredient row removed (this is different from recipe delete — should still work) |

---

### BUG-035 — Production History Ingredient Qty (MEDIUM)
**File:** `ProductionHistory.jsx`
**What changed:** `computeAllocQty` function sums batch quantities with unit normalization when ingredient-level `quantity_consumed` is null.

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| 1 | Ingredient qty shows total | Production History → expand any run → Consumed Ingredients table | Qty column shows computed total (e.g. "1000.00"), NOT "—" |
| 2 | Unit normalization | If ingredient has batches in gm and kg | Total correctly normalized (e.g. 500gm + 1kg = 1.5 kg) |
| 3 | Expandable batches still work | Click ingredient row with batch segments | Batch rows expand showing per-batch qty, unit cost, alloc cost |

---

## PART B: CRs Previously Implemented (Re-verification on Fresh Deployment)

These CRs were implemented in prior sessions. QA reports exist but this is a fresh `15-06-v2` branch deployment. Verify core functionality still works.

### CR-016 — Stock Inventory Hierarchy Toggle
| # | Test | Expected |
|---|------|----------|
| 1 | Login as Central (germanfluid) → RM Stock → "My store" toggle | Toggle visible. Switch ON → hierarchy data loads, store heatmap appears |
| 2 | Login as Outlet → RM Stock | Toggle NOT visible (outlets can't see hierarchy) |

### CR-026 — Production Unit Module
| # | Test | Expected |
|---|------|----------|
| 1 | Run Production screen loads | Central login → Run Production → recipe list, BOM, coverage data |
| 2 | Production History screen loads | Production History → run list with KPIs, expandable rows |

### CR-027 — Navigation Restructure
| # | Test | Expected |
|---|------|----------|
| 1 | Sidebar groups | DASHBOARD, INWARD, PRODUCTION, OUTWARD, REPORTS, SETTINGS sections visible |
| 2 | Correct items per group | INWARD: Vendor Management, Raw Material Master, Purchase, RM Stock. PRODUCTION: Sub-Recipe Master, Run Production, Production History. OUTWARD: Store Management, Product Catalog, FG Stock, Pending Queues, History & Ledger |

### CR-029 — Stock Inventory Split (FG vs RM)
| # | Test | Expected |
|---|------|----------|
| 1 | FG Stock link | Sidebar "FG Stock" → `/inventory?type=fg` → only FG tab |
| 2 | RM Stock link | Sidebar "RM Stock" → `/inventory?type=raw` → only RM tab |

### CR-030 — Inward Screens Audit
| # | Test | Expected |
|---|------|----------|
| 1 | Vendor Management | Master-detail layout, purchase intelligence KPIs |
| 2 | Raw Material Master | Expandable rows, intelligence panel, "Used In" column |
| 3 | Purchase → PO List | PO list with status tabs, KPI cards |
| 4 | Purchase → Create PO | By Vendor + By Item Need modes work |

### CR-031 — Production Screens Audit
| # | Test | Expected |
|---|------|----------|
| 1 | Sub-Recipe Master | Master-detail, BOM editor, Active toggle (BUG-034) |
| 2 | Run Production | Recipe selection, BOM display |
| 3 | Production History | Expandable runs, KPIs, staleness, cost trend |

### CR-032 — Outward Screens Audit
| # | Test | Expected |
|---|------|----------|
| 1 | Store Management | Unified view, store cards |
| 2 | Product Catalog | 5 tabs, recipe BOM |
| 3 | Stock Inventory | Tabs, expandable rows, FEFO segments |
| 4 | Pending Queues | Queue tabs, approve/reject actions |

### CR-033 — Action Screens Audit
| # | Test | Expected |
|---|------|----------|
| 1 | Direct Dispatch | Coverage selector, destination health strip |
| 2 | Request Stock | Coverage-based ordering |
| 3 | Wastage Entry | Monthly context, anomaly warnings |
| 4 | Transfer Detail | FROM/TO labels, post-action projection |

### CR-034 — Recipe & Sub-Recipe API Contract Fix
| # | Test | Expected |
|---|------|----------|
| 1 | Create sub-recipe | Sub-Recipe Master → Add → fill name, qty, unit, ingredients → Save | Success (API field names corrected) |
| 2 | Create recipe | Product Catalog → Recipes tab → Add | Success |

---

## Regression Spot-Checks

After testing the above, verify these adjacent features still work:

| # | Check | How |
|---|-------|-----|
| 1 | Login flow | Login/Logout for all 3 account types |
| 2 | Operations Hub | Dashboard loads, KPIs display, quick actions navigate correctly |
| 3 | Consumption Report | Reports → Consumption Report → data loads |
| 4 | Wastage Report | Reports → Wastage Report → data loads |
| 5 | Settings | Settings screen loads and shows config |

---

## Known Limitations (Not Bugs)

1. **BUG-034 toggle is UI stub** — backend API for active/inactive not yet available. Toast says "Backend API pending".
2. **Consumption data** — depends on POS API `daily-consumption-report`. Some items may show "—" if no consumption recorded.
3. **Segment background load** — takes ~6s after initial page load. Expiry Risk and FEFO sections update after this delay.
4. **`include_consumption` param** — removed from background load due to 30s proxy timeout. Consumption in expanded rows uses existing `consumption_summary` from basic call (may be empty).

---

## Artifacts Reference

| Artifact | Path |
|----------|------|
| Impact Analysis | `control/sessions/BUGBATCH_029_035_ARTIFACT_2_IMPACT_ANALYSIS.md` |
| Implementation Plan | `control/sessions/BUGBATCH_029_035_ARTIFACT_3_IMPLEMENTATION_PLAN.md` |
| Session Handover | `control/sessions/SESSION_HANDOVER_20260615_IMPL.md` |
| Previous QA Reports | `control/sessions/CR0*_ARTIFACT_5_QA_REPORT.md` |

---

*Self-test: 7/7 BUG edits compiled. BUG-031 + BUG-032 screenshot-verified. EXIT GATE: all 5 checks PASS.*
