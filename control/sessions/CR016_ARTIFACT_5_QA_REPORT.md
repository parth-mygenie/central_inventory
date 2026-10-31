# CR-016 Artifact 5 — QA Report (Re-QA)

> **CR ID:** CR-016
> **Title:** P20-Phase2 — Stock Inventory Hierarchy Toggle
> **Artifact:** 5 (QA Report)
> **Date:** 2026-06-13
> **Test Report:** `/app/test_reports/iteration_44.json`
> **Overall Status:** ✅ ALL PASS (7/7)

---

## Test Results

| # | Test | Status | Evidence |
|---|------|:------:|----------|
| T1 | Central Store (master) — toggle visible, default OFF, label "My store" | ✅ PASS | data-state='unchecked', 4th KPI/heatmap not visible |
| T2 | Toggle ON — hierarchy elements appear | ✅ PASS | Label→"All stores", 4th KPI "7 Stores in Scope", alert "52 low stock across 7 stores", 7 heatmap cards |
| T3 | Toggle OFF — hierarchy section removed | ✅ PASS | Label→"My store", KPI/banner/heatmap removed, own-store table remains |
| T4 | Master Store (central) — toggle visible | ✅ PASS | Toggle present, "Master Store — Store #807" |
| T5 | Outlet (franchise) — toggle NOT visible | ✅ PASS | No toggle element found, "Outlet — Store #809" |
| T6 | Heatmap card details | ✅ PASS | Store names, terminology mapping (master→Central Store, central→Master Store, franchise→Outlet), ratio badge, progress bar, sorted worst-first |
| T7 | CR-029 tabs work with hierarchy toggle | ✅ PASS | FG(4)/Raw(43)/All(47) tabs filter independently, hierarchy elements persist across tab switches |

## Key Verifications

- **Role gating**: `canToggleHierarchy = isTopLevel || isMiddleLevel` — correctly hides for franchise
- **API integration**: `?include_hierarchy=true` returns `hierarchy_summary` with `by_store[]` per-store breakdown
- **Terminology**: `mapRestaurantType()` correctly inverts API terms in heatmap cards
- **Heatmap sorting**: Worst low-stock ratio first (verified)
- **mixed-unit `total_display_qty`**: NOT displayed anywhere (only ratios and counts shown)
- **CR-029 compatibility**: Stock type tabs (FG/Raw/All) work independently of hierarchy toggle

## Issues Found

**None.** All features working as specified in the implementation plan.

## Conclusion

CR-016 passes re-QA. Ready for owner signoff.
