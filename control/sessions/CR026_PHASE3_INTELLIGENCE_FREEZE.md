# CR-026 Phase 3 — Production Intelligence UI — Extended Planning Freeze

> **CR ID:** CR-026 Phase 3
> **Title:** Production Intelligence UI
> **Status:** FROZEN — Owner approved 2026-06-13. All 9 elements unblocked. Implementation proceeds against this mock.
> **Date:** 2026-06-13
> **Preview:** `/__dev/previews/P28_production_intelligence.html`

---

## Mock Screens (4 screens, 9 elements)

### Screen 1: Operations Hub — Production Intelligence
- **P3-1** FG Low Stock NBA Banner — amber banner: "2 finished goods are low on stock at outlets — consider running production" with "Run Production" CTA
- **P3-2** Production KPI Card — 5th KPI card: FG Low Stock count (blue accent), "Last produced: X days ago" detail line

### Screen 2: Production Run Form — Intelligence Layers
- **P3-3** Sub-recipe sort by demand — recipes sorted lowest FG stock first, with stock count badge (red/amber/green) and FG stock number right-aligned
- **P3-4** Ingredient health strip — horizontal bar per ingredient row showing stock level (% of min_qty_alert), color-coded: green >50%, amber 20-50%, red <20%
- **P3-5** Coverage estimate — blue card: "930 Elachi Cookies covers ~7 days across 3 outlets" with consumption rate context

### Screen 3: Post-Production Confirmation — Next Best Action
- **P3-6** Post-production NBA — green cards below confirmation: "Dispatch to Outlet Direct One (0 in stock, 3 pending requests)" with "Dispatch Now" button

### Screen 4: Production History — Staleness & Cost Intelligence
- **P3-7** Summary KPIs — 3 cards: Total Runs, Total FG Produced, Total Material Cost — **UNBLOCKED (G-018 closed)**
- **P3-8** Sub-recipe staleness indicator — per-recipe row with staleness badge — **UNBLOCKED (G-018 closed)**
- **P3-9** Cost trend — bar chart with % change — **UNBLOCKED (G-018 closed)**

---

## Element Matrix

| # | Element | Screen | Data Source | Blocked? | Priority |
|---|---------|--------|------------|:--------:|:--------:|
| P3-1 | FG Low Stock NBA Banner | OperationsHub | getStockInventory (is_low_stock on FG items) | No | HIGH |
| P3-2 | Production KPI Card | OperationsHub | useStockIntelligence — FG detection | No | HIGH |
| P3-3 | Sub-recipe sort by demand | ProductionRunForm | getStockInventory + getSubRecipeList | No | HIGH |
| P3-4 | Ingredient health strip | ProductionRunForm | stockMap (cal_quantity vs min_qty_alert) | No | MEDIUM |
| P3-5 | Coverage estimate | ProductionRunForm | getDailyConsumptionReport | No | MEDIUM |
| P3-6 | Post-production NBA | PostProductionConfirmation | getHierarchyDetail + getPendingQueues | No | HIGH |
| P3-7 | Summary KPIs | ProductionHistory | getProductionRunHistory | No | HIGH |
| P3-8 | Staleness indicator | ProductionHistory | getProductionRunHistory | No | HIGH |
| P3-9 | Cost trend | ProductionHistory | getProductionRunHistory | No | MEDIUM |

## Implementation Order

```
Batch 1 (HIGH priority):
  P3-1 + P3-2 → OperationsHub.jsx + useStockIntelligence.js
  P3-3         → ProductionRunForm.jsx
  P3-6         → ProductionRunForm.jsx (post-confirmation section)
  P3-7 + P3-8  → ProductionHistory.jsx (wire real API — G-018 CLOSED)

Batch 2 (MEDIUM priority):
  P3-4         → ProductionRunForm.jsx (ingredient table enhancement)
  P3-5         → ProductionRunForm.jsx + useProductionRun.js (add consumption fetch)
  P3-9         → ProductionHistory.jsx (cost trend chart)
```

## Files Touched

| File | Elements | Change |
|------|----------|--------|
| `hooks/useStockIntelligence.js` | P3-1, P3-2 | Add FG item detection: `fgItems`, `fgLowStockItems`, `fgLowStockCount`, `lastProductionDate` |
| `components/central-inventory/OperationsHub.jsx` | P3-1, P3-2 | Add production NBA banner (before stale approvals) + FG Low Stock KPI card |
| `components/central-inventory/ProductionRunForm.jsx` | P3-3, P3-4, P3-5, P3-6 | Sort sub-recipes by demand, add health bar column, coverage card, post-production NBA section |
| `hooks/useProductionRun.js` | P3-5, P3-6 | Add: fetchConsumption (for coverage), fetchHierarchyStores (for NBA) |
| `components/central-inventory/ProductionHistory.jsx` | P3-7, P3-8, P3-9 | Add KPI section, staleness rows, cost trend (all G-018 stub) |

## Design Rules (from Phase 7 Freeze)

- 3-color palette: Red (problem), Amber (caution), Neutral gray
- Blue accent permitted for new production intelligence elements (consistent with KPI card)
- Green for positive indicators (sufficient, fresh, coverage)
- Monospace for all numeric values
- No new colors beyond the established palette

---

*This document is FROZEN. Implementation proceeds against this spec + mock. Changes require owner re-approval.*
