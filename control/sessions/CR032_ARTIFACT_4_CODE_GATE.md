# CR-032 Artifact 4 — Code-Gate Review

> **CR ID:** CR-032
> **Title:** Outward Screens Audit (Store Mgmt, Product Catalog, Stock Inventory, Pending Queues, History & Ledger)
> **Date:** 2026-06-13
> **Status:** APPROVED — Proceed to implementation

---

## Pre-Implementation Checklist

| # | Check | Status | Notes |
|---|-------|:------:|-------|
| 1 | Artifacts 0-3 complete | PASS | Session-Start, Intake, Impact+Plan all done |
| 2 | UX freezes approved | PASS | All 5 screens: Store Mgmt, Product Catalog, Stock Inventory, Pending Queues, History & Ledger |
| 3 | No frozen files in scope | PASS | All 5 files listed as "modified in S3" (tracking), NOT in frozen list. App.js editable. |
| 4 | APIs validated | PASS | No new APIs. All existing: `getRecipeList`, `getAddonRecipes`, `getTransferHistory`, `getPendingQueues` etc. |
| 5 | No backend changes | PASS | Proxy-only server untouched |
| 6 | Backward compatible | PASS | Recipe/Addon tabs are additive. Bug fixes are display-only. Back button removal is cosmetic. |

## Change Summary

| Metric | Value |
|--------|-------|
| Files changed | 5 (ProductCatalogue, HistoryLedger, PendingQueues, StockInventorySummary, App.js) |
| New files | 0 |
| Lines added | ~255 |
| Backend changes | 0 |
| Risk level | **HIGH** (Recipe tab integration in ProductCatalogue is a major edit; requester name fix in PendingQueues is logic-sensitive) |
| Estimated effort | ~8.5h |

## Key Risks Acknowledged

| Risk | Verdict |
|------|---------|
| **Recipe tab breaks Product Catalog** | HIGH — ~200 lines added. Importing `RecipeCatalogue` + `AddonRecipeCatalogue` as tab content. Must verify existing Foods/Categories/Addons tabs are unaffected. |
| **Requester name fix swaps labels** | HIGH — direction-sensitive logic (request-type vs dispatch-type). Must test both Central and Outlet perspectives. |
| **Items count fix in History** | MEDIUM — root cause investigation needed. May require `getTransferDetails()` per-row (N+1) if history API doesn't include line items. |
| **Back button removal** | LOW — cosmetic only |
| **"-0d" fix in Stock Inventory** | LOW — `Math.max(0, ...)` guard |
| **Store name in Stock Inventory** | LOW — use `restaurantName` from `useLoginContext()` |

## Phase Priorities

| Phase | Risk | Must Test |
|-------|:----:|-----------|
| 1. Recipe/Addon tabs in Product Catalog | HIGH | All 5 tabs load, CRUD in each, no regression on Foods |
| 2. Items count in History | MEDIUM | Verify non-zero counts, check both tabs |
| 3. Requester name in Pending Queues | HIGH | Both request-type and dispatch-type, Central + Outlet views |
| 4. Stock Inventory fixes | LOW | No back button, no "-0d", store name |
| 5. Price format | LOW | Visual only |

## Gate Decision

**APPROVED** — 5 files, ~255 lines, no frozen files, no backend changes. HIGH risk on Phase 1 (recipe tabs) and Phase 3 (requester logic) — both require thorough testing. Existing component imports (`RecipeCatalogue`, `AddonRecipeCatalogue`) are available in codebase.
