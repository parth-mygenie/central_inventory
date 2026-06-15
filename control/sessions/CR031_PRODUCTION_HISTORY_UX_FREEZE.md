# CR-031 — Production History UX Freeze

> **Date:** 2026-06-13
> **Status:** FROZEN — Owner approved
> **Scope:** Production History screen (`/production/history` + `/production/:id`)
> **Pattern:** Full-width expandable rows (Pattern B — like Raw Material Master)

---

## Layout: KPIs + Filters + Table with Expandable Audit Detail

### Structure
```
┌──────────────────────────────────────────────────────────────────────┐
│ Production History                                     [+ New Run]   │
│                                                                      │
│ [From: ____] [To: ____]  [Search reference or recipe...]            │
│                                                                      │
│ ┌──────────┐ ┌──────────────────┐ ┌─────────────────────────────┐   │
│ │ Total    │ │ Total FG         │ │ Total Material Cost         │   │
│ │ Runs     │ │ Produced         │ │                             │   │
│ │    10    │ │    1,905         │ │   ₹4.9K (avg ₹2.57/unit)   │   │
│ └──────────┘ └──────────────────┘ └─────────────────────────────┘   │
│                                                                      │
│ ┌── SUB-RECIPE STALENESS ────────────────────────────────────────┐  │
│ │ Sesame Cookie    avg ₹9.50/u          [Produced 0d ago] 🟢     │  │
│ │ Oats Cookie      avg ₹7.20/u          [Produced 0d ago] 🟢     │  │
│ │ Ragi Cookie      avg ₹8.10/u          [Produced 5d ago] 🟡     │  │
│ │ Whole Wheat      avg ₹6.50/u          [Produced 15d ago] 🔴    │  │
│ └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│ ┌── COST TREND — Sesame Cookie ──────────────────────────────────┐  │
│ │ ₹1.91 avg unit cost (last 5 runs)    [-13.1%] 🟢              │  │
│ │ ▁ ▃ ▅ ▇ ▄  (sparkline bars)                                   │  │
│ └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│ ┌── ALL RUNS (10) ───────────────────────────────────────────────┐  │
│ │ Date    │ Reference      │ Recipe        │ Qty  │ U.Cost│Total │  │
│ │ 13 Jun  │ PRD-2026-0010  │ Sesame Cookie │ 30   │ ₹9.50│₹285  │  │
│ │ ▼ EXPANDED AUDIT DETAIL ──────────────────────────────────────│  │
│ │ │ Ref: PRD-2026-0010  Planned: 30  Actual: 30  Status: done  ││  │
│ │ │ Batch: SESAME-001   Expiry: 2026-12-31   Unit Cost: ₹9.50 ││  │
│ │ │                                                             ││  │
│ │ │ CONSUMED INGREDIENTS                                        ││  │
│ │ │ Ingredient    │ Qty Consumed │ Unit │ Line Cost             ││  │
│ │ │ Wheat Flour   │ 200          │ gm   │ ₹60                  ││  │
│ │ │ ▶ Segments... │              │      │                       ││  │
│ │ │ Sesame Till   │ 20           │ gm   │ ₹3.80                ││  │
│ │ │                                                             ││  │
│ │ │ OUTPUT: Sesame Cookie  30 pcs  [View in Stock →]           ││  │
│ │ └─────────────────────────────────────────────────────────────┘│  │
│ │ 13 Jun  │ PRD-2026-0009  │ Oats Cookie   │ 20   │ ₹7.20│₹144  │  │
│ │ 12 Jun  │ PRD-2026-0008  │ Ragi Cookie   │ 15   │ ₹8.10│₹121  │  │
│ └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Section 1: Header + Filters

| Element | Spec |
|---------|------|
| Title | "Production History" |
| "+ New Run" button | Navigates to `/production/new` |
| Date range picker | From / To date inputs. Filters runs + recalculates KPIs. (fixes P-9) |
| Search | Filter by reference code or recipe name (frontend filter). (fixes P-10) |

---

## Section 2: KPI Cards (3)

| KPI | Source | Display |
|-----|--------|---------|
| **Total Runs** | `runs.length` (filtered) | Large number |
| **Total FG Produced** | Sum of `actual_output_qty` across runs | Large number |
| **Total Material Cost** | Sum of `total_cost` across runs | "₹4.9K" with "avg ₹2.57/unit" sub-text |

KPIs **recalculate** when date filter changes.

---

## Section 3: Sub-Recipe Staleness

Per sub-recipe row showing:

| Column | Source | Display |
|--------|--------|---------|
| Recipe name | Grouped from runs | Bold text |
| Avg cost/unit | `totalCost / totalQty` per recipe | "avg ₹9.50/u" (monospace) |
| Last produced | Most recent `created_at` per recipe | Badge with color |

### Staleness Badge Colors

| Condition | Color | Text |
|-----------|-------|------|
| ≤ 5 days ago | Green | "Produced 0d ago" |
| 6–14 days ago | Amber | "Produced 8d ago" |
| > 14 days ago | Red | "Produced 15d ago" |
| Never produced | Red | "Never produced" |

---

## Section 4: Cost Trend

Shows last 5 runs of the most-produced recipe.

| Element | Display |
|---------|---------|
| Avg unit cost | "₹1.91" large |
| Trend badge | Green if declining, Amber if rising, with % change |
| Sparkline | 5 vertical bars, latest bar highlighted |

---

## Section 5: All Runs Table

### Table Columns

| Column | Source | Display |
|--------|--------|---------|
| Date | `created_at` | "13 Jun" |
| Reference | `reference_code` | "PRD-2026-0010" (monospace, bold) |
| Recipe | `recipe_name` or `output_stock_title` | Truncated |
| Qty | `actual_output_qty` + `output_unit` | "30 piece" |
| Unit Cost | `unit_cost` | "₹9.50" (monospace) |
| Total | `total_cost` | "₹285" (monospace, bold) |

Click row → expand audit detail below.

### Expanded Audit Detail

| Section | Content |
|---------|---------|
| **Summary** | Reference, Planned/Actual qty, Batch, Expiry, Unit Cost, Total Cost, Status |
| **Consumed Ingredients** | Table: Ingredient, Qty Consumed, Unit, Line Cost. Click row → expand segment allocations (batch, expiry, qty, unit_cost per segment). |
| **Output** | Finished good name + segment ID + "View in Stock →" link to `/inventory/{id}` |

---

## Role Gate

| Role | Access |
|------|--------|
| Central (master) | Full access |
| Master (central) | Full access |
| Outlet (franchise) | Blocked: "Production is only available for Central and Master stores" |

---

## API Calls

| Call | When | Cache TTL |
|------|------|:---------:|
| `getProductionRunHistory({ fromDate, toDate, limit })` | Page load + date filter change | SHORT (30s) |
| `getProductionRunDetail(runId)` | On row expand | MEDIUM (45s) |

---

## Issues Fixed

| ID | Issue | Fix |
|----|-------|-----|
| P-9 | No date filter | Date range picker added, recalculates KPIs |
| P-10 | No search | Search input filters by reference/recipe name |
| P-11 | Staleness sort direction | Most stale first (unchanged — intentional) |

---

## Mock Reference

| Mock | Description |
|------|-------------|
| `production_history_final` | Full layout: KPIs + staleness + cost trend + table + expanded audit |

---

*This document is FROZEN. Implementation proceeds against this spec. Changes require owner re-approval.*
