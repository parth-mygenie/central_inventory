# CR-041 — Segment unit_cost on Stock Detail (G-019)

> **Gates:** 2 + 3 combined | **Planned:** 2026-07-11 | **Agent:** PLANNING
> **Source:** `AI/openGaps/gap_validation.md` — G-019 FULLY RESOLVED
> **Code Reality:** PARTIAL — `StockInventorySummary.jsx` line 618 already renders `seg.unit_cost` in the expanded-row segment preview (BUG-032). `StockDetailPanel.jsx` FEFO batch table (`BatchInventorySection`, lines 185-260) has NO cost column. Production cost fields already consumed elsewhere (ProductionHistory etc.).

---

## 1. Impact Analysis (Gate 2)

### What backend now provides (verified 2026-07-07)
`GET /inventory/stock-inventory/{id}` → `segments[].unit_cost` (e.g. Almonds: seg 304 batch VA-ALMD-001 `unit_cost=1.4`, `cal_qty=1000`). Also on `production-run` detail `consumed_allocations[].segment_allocations[].unit_cost`.

**Cost basis unknown:** `unit_cost=1.4` against `cal_qty=1000` (gm) suggests per-cal-unit (₹/gm) pricing, i.e. ₹1400/kg. **R9 probe MUST confirm basis** (compare against a known purchase rate via vendor-item-list) before displaying "value" math. One wrong multiplier = wrong inventory valuation (R6 discipline applies).

### Affected files

| File | Change | Risk |
|------|--------|:---:|
| `frontend/src/components/central-inventory/StockDetailPanel.jsx` | `BatchInventorySection` (lines 185-260): +Unit Cost, +Batch Value columns; total value in section header | LOW-MEDIUM (math basis risk) |

### Conflict pre-check
`StockDetailPanel.jsx`: no open item touches it. Clear.

### Open Questions (owner)
1. Show batch value (qty × unit_cost) and section total value, or unit cost column only? **Recommendation: both, after basis confirmed.**

## 2. Implementation Plan (Gate 3)

### Edits

**Edit 1 — StockDetailPanel.jsx `BatchInventorySection`.**
- Table: add `Unit Cost` and `Value` header cells + row cells:
  - `unit_cost > 0` → `₹{Number(seg.unit_cost).toFixed(2)}` else "—"
  - Value = `Number(seg.cal_quantity ?? seg.available_quantity) * Number(seg.unit_cost)` (basis per probe; adjust multiplier if per-display-unit), `Number()` wrap everything (CI-R3/R6)
- Section header (line ~193-199): append total: `Total Value: ₹{sum}` when ≥1 segment has cost. Expired segments excluded from total (they're line-through in UI).
- data-testids: `batch-unit-cost-{segment_id}`, `batch-value-{segment_id}`, `batches-total-value`.

### Execution sequence
R9 probe (stock-inventory/17681 Almonds + cross-check vendor-item-list rate) → confirm basis → single-file edit.

### Scope lock
- **WILL change:** `StockDetailPanel.jsx`
- **Will NOT touch:** `StockInventorySummary.jsx` (already done), api.js, production screens

### Verification Matrix

| # | File | Change | How to Verify | Automated? |
|---|------|--------|---------------|:---:|
| 1 | probe | cost basis | curl stock-inventory/17681 → unit_cost=1.4 on 2 segments; cross-check rate | YES |
| 2 | StockDetailPanel | columns render | Browser `/inventory/17681` (806 login) → ₹1.40 per segment, value math correct | NO |
| 3 | StockDetailPanel | null-safe | Item without costs → "—", no NaN anywhere | NO |

### Post-code registry checklist
- [ ] registry.json: CR-041 → IMPLEMENTED · L3 · L7 · `// CR-041` marker · dashboard `--check` PASS
