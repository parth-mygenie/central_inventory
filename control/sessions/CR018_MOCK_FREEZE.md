# CR-018 Wastage Report Intelligence — Mock Freeze

> **CR ID:** CR-018
> **Title:** P25 — Wastage Report Enhancements
> **Status:** FROZEN — Owner approved 2026-06-13
> **Preview:** `/__dev/previews/CR018_wastage_report_intelligence.html`

---

## Frozen Elements

### 3 New Intelligence Sections (between KPI cards and filters)

| # | Section | Placement | Data Source |
|---|---------|-----------|------------|
| 1 | **Period Comparison** | Full-width card below KPIs | Two API calls: current period + shifted previous period |
| 2 | **Top Wasted Items** | Left column (50%) below Period Comparison | Client-side aggregation of `wastage_records[]` by `item_name` |
| 3 | **Reason Breakdown** | Right column (50%) beside Top Wasted | Client-side grouping of `wastage_records[]` by `waste_reason` |

### Period Comparison

- Current period total (qty + records + stores) on left
- Previous equivalent period total on right
- Delta arrow in center: red ▲ if wastage increased, green ▼ if decreased, with % change
- Period labels derived from date range picker (or default last 30d vs prior 30d)

### Top Wasted Items (Ranked)

- Top 5 items by total `wastage_quantity`
- Each row: rank number, item name, total qty (red), proportional bar, % of total
- Bar colors: #1 red, #2-3 amber, #4-5 gray
- Sorted descending by quantity

### Reason Breakdown

- Group by `waste_reason`, count occurrences
- Each row: color dot, reason name, proportional bar, count + percentage
- Color mapping: Expired=red, Spillage=amber, Pilferage=violet, Hierarchy=blue, Others=gray
- Loss vs Gain mini-summary at bottom

### Existing Elements (Unchanged)

- KPI cards: Total Records, Net Wastage, Batch Audited, Physical Count
- Filters: date range, waste type, batch-audited toggle
- Table: Date, Item, Type, Qty, Unit, Reason, Batch, Expiry, Source
- FEFO batch drill-down, CSV export, summary footer

### Empty State Behavior

- All 3 intelligence sections **hidden** when `entries.length === 0`
- Period Comparison shows "No previous data" when prior period has 0 records
- Existing empty state message unchanged

### Layout

- Full-width content area (no max-width constraint)
- Intelligence sections use responsive grid (2-col on desktop, 1-col on mobile)

---

*This mock is FROZEN. Implementation proceeds against this spec. Changes require owner re-approval.*
