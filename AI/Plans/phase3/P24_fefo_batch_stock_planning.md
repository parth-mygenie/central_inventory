# P24 — FEFO Consumption + Batch-Accurate Stock Summary — API Validation + Frontend Planning

> **Status:** PLANNING + API VALIDATION — no code changes
> **Author:** E1 agent, 29 May 2026
> **API validation:** 19 probes against live POS API (preprod.mygenie.online)
> **Actors:** Master/killua (rid=1), DemoFranchise2 (rid=784), DemoFranchise3 (rid=785)
> **FEFO scenario:** Stock transferred killua→DemoFranchise3, orders at DemoFranchise2

---

## 0. API Validation Summary (29 May 2026)

### Endpoints Confirmed

| Endpoint | Method | Status | New? |
|----------|--------|--------|------|
| `/inventory/stock-inventory` | GET | **WORKING** | No (unchanged) |
| `/inventory/stock-inventory/{id}` | GET | **WORKING** | **YES** |
| `/inventory/wastage-report` | POST | **WORKING** | Extended |

### New Detail Endpoint: GET /inventory/stock-inventory/{id}

| # | Actor | Item | HTTP | Segments | Consumption | Notes |
|---|-------|------|:---:|:---:|:---:|-------|
| F3 | F3 (785) | maida (17001) | 200 | **2** | 0 | MAIDA-BATCH-01 × 2, exp 2026-12-31, src=782 |
| F4 | F3 (785) | Cooking Oil (17000) | 200 | 0 | 0 | No segments, qty=0 |
| F5 | Master | maida (16981) | 200 | **3** | 0 | 2 named batches + 1 legacy null batch; unsegmented=10000 |
| F6 | Master | Cooking Oil (16980) | 200 | **4** | 0 | OIL-BATCH-01, FINAL-OIL-01, 2 test batches; reconciled |
| F7 | F3 | red meat (17003) | 200 | **2** | 0 | MEAT-BATCH-01 × 2; **MISMATCH** agg=250 vs seg=4000 |
| F8 | F3 | patri (17002) | 200 | **2** | 0 | FINAL-PATRI-01 × 2; near-reconciled (3950 vs 4000) |
| F9 | F2 (784) | Cooking Oil (16996) | 200 | 0 | **2** | -500 stock, 2 consumption lines (no FEFO alloc) |
| F10 | F2 (784) | maida (16997) | 200 | 0 | **2** | -1000 stock, 2 lines from order 869321+869307 |
| F16 | Master | Invalid ID 99999 | **404** | — | — | `{code:"not_found"}` |
| F17 | Master | F2's item 16996 | **404** | — | — | Cross-store scoped (can't see other store's items) |
| F18 | Master | Own item, no date | 200 | 4 | 0 | Defaults: last 7 days |

---

## 1. Confirmed Response Shape: Stock Detail

```json
{
  "summary": {
    "id": 17001,
    "category_id": 1493,
    "stock_title": "maida",
    "unit": "kg",
    "small_unit": "gm",
    "type": "inventory",
    "is_low_stock": false,
    "cal_quantity": "2000.00",
    "quantity": "2.000",
    "display_unit": "kg",
    "display_qty": "2.00",
    "min_qty_alert": "500.00",
    "min_unit_alert": "gm",
    "status": "1",
    "physical_qty": "",
    "category_name": "veggies",
    "vendor_id": null,
    "vendor_name": ""
  },
  "quantity_reconciliation": {
    "aggregate_cal_quantity": 2000,
    "segment_total_cal_quantity": 2000,
    "unsegmented_remainder_cal": 0
  },
  "segments": [
    {
      "segment_id": 22,
      "batch": "MAIDA-BATCH-01",
      "expiry_date": "2026-12-31",
      "cal_quantity": 1000,
      "display_qty": 1,
      "source_restaurant_id": 782
    }
  ],
  "consumption_summary": {
    "from_date": "2026-05-01",
    "to_date": "2026-05-29",
    "total_consumed_cal": 0
  },
  "consumption_lines": [
    {
      "consumption_date": "2026-05-29",
      "order_id": 869321,
      "food_item": "aloo parantha",
      "quantity_deducted_cal": 250,
      "addon_id": null,
      "segment_allocations": [],
      "batch": null,
      "expiry_date": null
    }
  ]
}
```

### Key Field Matrix

| Field | Type | Notes |
|-------|------|-------|
| `summary` | object | Same fields as stock-inventory list row + `vendor_id/vendor_name` |
| `summary.cal_quantity` | **STRING** | e.g., "2000.00" — parse to float |
| `summary.is_low_stock` | boolean | True when below min_qty_alert |
| `quantity_reconciliation.aggregate_cal_quantity` | number | `inventory_master.cal_quantity` |
| `quantity_reconciliation.segment_total_cal_quantity` | number | Sum of all segment quantities |
| `quantity_reconciliation.unsegmented_remainder_cal` | number | Diff: aggregate - segment total (>0 = legacy data) |
| `segments[]` | array | FEFO-ordered on-hand batches |
| `segments[].segment_id` | number | Unique segment row ID |
| `segments[].batch` | string\|null | Batch name; null = legacy unsegmented |
| `segments[].expiry_date` | string\|null | "YYYY-MM-DD"; null = no expiry |
| `segments[].cal_quantity` | number | Quantity in smallest unit |
| `segments[].display_qty` | number | Display quantity in display_unit |
| `segments[].source_restaurant_id` | number | Which store supplied this batch |
| `consumption_summary` | object | Aggregate consumption in period |
| `consumption_lines[]` | array | Per-order consumption events |
| `consumption_lines[].segment_allocations` | array | FEFO batch-level deductions (empty when legacy) |
| `consumption_lines[].batch` | string\|null | First allocation batch (null when legacy) |
| `consumption_lines[].expiry_date` | string\|null | First allocation expiry |

### Query Parameters

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `consumption_from` | string (YYYY-MM-DD) | 7 days ago | Start of consumption period |
| `consumption_to` | string (YYYY-MM-DD) | today | End of consumption period |
| `consumption_limit` | number | 50 (cap 200) | Max consumption lines |

---

## 2. Confirmed Response Shape: Wastage Report (Extended)

### New Fields per wastage_records[] Row

| Field | Type | Notes |
|-------|------|-------|
| `segment_allocations_json` | string\|null | Raw JSON from DB (parse at API layer) |
| `source_type` | string\|null | `"hierarchy_wastage"` \| `"physical_count"` \| `"sub_recipe_count"` \| null (legacy) |
| `segment_allocations` | array | Parsed from JSON; empty when null |
| `batch` | string\|null | First allocation batch |
| `expiry_date` | string\|null | First allocation expiry |

### New Filters

| Filter | Type | Notes |
|--------|------|-------|
| `has_batch` | boolean | Only rows with `segment_allocations_json` populated |
| `include_segments` | boolean | Adds `segment_snapshot[]` — current on-hand segments |

### segment_snapshot[] Shape (when include_segments=true)

```json
{
  "id": 22,
  "restaurant_id": 785,
  "stock_title": "maida",
  "unit_id": 1,
  "batch": "MAIDA-BATCH-01",
  "expiry_date": "2026-12-31",
  "cal_quantity": "1000.00000000",
  "display_qty": "1.00000000"
}
```

### Critical Note
`segment_snapshot` is the **current** on-hand segments, NOT per-wastage-event audit. The per-event audit is in `wastage_records[].segment_allocations`.

---

## 3. FEFO Scenario Validation

### Scenario: killua@zoldyck.com → owner@demofranchise3.com

**Transfer path:** Master (rid=1) → DemoFranchise3 (rid=785)

### Initial Findings (29 May 2026 — afternoon)

| Check | Status | Details |
|-------|--------|---------|
| Transferred batches visible in segments[] | **YES** | F3 maida: 2 segments, MAIDA-BATCH-01, src=782 |
| FEFO ordering correct | **YES** | Soonest expiry first; null-batch legacy bucket last (Master maida seg=40) |
| inventory_master matches segment balance | **PARTIAL** | F3 maida: 2000=2000 ✓; F3 red meat: 250≠4000 ✗ |
| quantity_reconciliation near zero | **PARTIAL** | F3 maida: 0 ✓; Master maida: 10000 remainder; F3 red meat: 3750 gap |
| consumption_lines include segment alloc | **NO** | F2 consumption has segment_allocations:[] — predates FEFO code deployment |
| End-to-end trace possible | **PARTIAL** | Segments show source_restaurant_id; consumption lacks FEFO detail |

### Follow-Up: FEFO Proven Operational (29 May 2026 — evening)

**Order #869395** at F3 (mutton keema, 2026-05-30) produced conclusive FEFO evidence across 2 ingredients:

| Check | Status | Details |
|-------|--------|---------|
| fefo_consumption_enabled | **TRUE** | Resolved from Master settings, inherited by all stores |
| Transferred batches visible | **YES** | red meat: 2 segs, patri: 2 segs, maida: 2 segs |
| FEFO ordering correct | **YES** | seg_id=19 (lower=older) consumed before seg_id=30; seg_id=54 before seg_id=55 |
| inventory_master matches segment balance | **YES** | red meat 3250=3250; patri 3950=3950 |
| quantity_reconciliation balanced | **YES** | unsegmented_remainder=0 for both |
| consumption_lines include segment alloc | **YES** | Order #869395 has full allocations with batch, segment_id, qty_cal, expiry_date |
| End-to-end trace possible | **YES** | Transfer → batch → FEFO deduction → reconciliation all traceable |

**Key correction:** Earlier finding "fefo_consumption_enabled appears OFF for F2" was incorrect. The flag is ON everywhere (True, inherited from Master). F2 consumption (orders #869307, #869321 on 2026-05-28) simply predated the FEFO code deployment. The transition point is visible within a single day's orders at F3: orders #869375-#869380 = legacy, order #869395 = FEFO active.

### Key Observations

1. **FEFO consumption is OPERATIONAL** — proven by order #869395 with segment_allocations on 2 ingredients
2. **FEFO tie-breaking** — when expiry dates match, lower segment_id (earlier created) is consumed first
3. **Addon consumption is also FEFO-aware** — patri consumed via addon_id=12630 has segment_allocations
4. **Reconciliation self-heals** — earlier mismatches (red meat 250≠4000, patri 3950≠4000) are now balanced after FEFO consumption normalized the ledger
5. **Legacy null-batch segments** — Master maida seg=40 has batch=null, exp=null (legacy bucket, consumed last per FEFO rules)
6. **Transition visible in data** — same-day orders show clear legacy→FEFO switchover

---

## 4. Component Architecture

### Route

```js
// Stock detail is a drill-down from StockInventorySummary
// Not a separate route — opens as a dialog/panel from the inventory list
```

### Component Map

```
StockInventorySummary.jsx (existing)
  └── StockDetailPanel.jsx (NEW)
        ├── ItemSummaryCard          — name, qty, unit, category, vendor, low-stock alert
        ├── ReconciliationBadge      — aggregate vs segment comparison
        ├── SegmentTable             — FEFO-ordered batches with batch name, expiry, qty, source
        │     └── SegmentRow         — per-batch: batch, expiry, qty, source store badge
        │         └── ExpiryBadge    — color-coded: green (>30d), amber (7-30d), red (<7d/expired)
        ├── ConsumptionSection       — date-filtered consumption log
        │     ├── ConsumptionKPIs    — total consumed in period
        │     └── ConsumptionTable   — per-order: date, order, food item, qty, batch allocation
        └── ExpandedWastageSection   — wastage records with batch detail (if present)
```

### Hook

```js
// hooks/useStockDetail.js
function useStockDetail(inventoryMasterId) {
  // Fetches: GET /inventory/stock-inventory/{id}
  // State: summary, segments, reconciliation, consumptionLines, loading, error
  // Returns: { summary, segments, reconciliation, consumption, loading, error, fetch }
}
```

### API Layer Additions

```js
// api.js
getStockDetail(inventoryMasterId, { consumptionFrom, consumptionTo, consumptionLimit })
// Existing wastage report already works — extend with has_batch + include_segments params
```

---

## 5. UX Design

### 5.1 Stock Detail Panel (opened from inventory list row click)

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Back to Inventory    maida                                    │
│                                                                 │
│ ┌───────────── Summary ──────────────────────────────────────┐ │
│ │ Quantity: 2.00 kg   Category: veggies   Vendor: —          │ │
│ │ Min Alert: 500 gm   Status: In Stock                       │ │
│ │ Reconciliation: ✓ Balanced (segment=2000, aggregate=2000)  │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌───────────── FEFO Segments (2) ────────────────────────────┐ │
│ │ # │ Batch          │ Expiry     │ Qty    │ Source          │ │
│ │───┼────────────────┼────────────┼────────┼─────────────────│ │
│ │ 1 │ MAIDA-BATCH-01 │ 31 Dec 26  │ 1.00kg │ DemoCentral2   │ │
│ │   │                │ 🟢 216 days│        │                 │ │
│ │ 2 │ MAIDA-BATCH-01 │ 31 Dec 26  │ 1.00kg │ DemoCentral2   │ │
│ │   │                │ 🟢 216 days│        │                 │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌───────────── Consumption (May 1-29) ───────────────────────┐ │
│ │ Total consumed: 0 (no orders in period)                     │ │
│ │ [Change dates: May 01 ▾ — May 29 ▾]                       │ │
│ └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Consumption Lines (when data exists — e.g., F2 Cooking Oil)

```
┌───────────── Consumption Lines (2) ──────────────────────────┐
│ Total consumed: 500 ml                                        │
│                                                               │
│ Date    │ Order   │ Food Item      │ Qty    │ Batch          │
│─────────┼─────────┼────────────────┼────────┼────────────────│
│ 29 May  │ #869321 │ aloo parantha  │ 250    │ — (legacy)     │
│ 28 May  │ #869307 │ aloo parantha  │ 250    │ — (legacy)     │
│                                                               │
│ ⚠ No FEFO batch allocations — consumption via legacy path    │
└──────────────────────────────────────────────────────────────┘
```

### 5.3 Reconciliation States

| State | Display | Color |
|-------|---------|-------|
| Balanced (unsegmented=0, agg=seg) | "✓ Balanced" | Green |
| Unsegmented remainder > 0 | "⚠ {n} unsegmented" | Amber |
| Mismatch (agg ≠ seg_total + unseg) | "✗ Mismatch: {diff}" | Red |

### 5.4 Expiry Badges

| Days until expiry | Badge | Color |
|-------------------|-------|-------|
| > 30 days | "X days" | Green |
| 7-30 days | "X days" | Amber |
| 1-7 days | "X days!" | Red |
| Expired | "EXPIRED" | Red bold |
| No expiry | "No expiry" | Gray |

---

## 6. Visibility Rules

| Element | All Roles |
|---------|:---------:|
| Stock detail panel | **Visible** (click any item in inventory list) |
| Segment table | Visible (shows "No batches" if segments=[]) |
| Reconciliation badge | Visible (informational) |
| Consumption section | Visible (date-filtered) |

No new role restrictions — detail is a read-only drill-down from existing stock inventory.

---

## 7. Risk Analysis

| Risk | Severity | Mitigation |
|------|----------|------------|
| Reconciliation mismatches (agg ≠ seg total) | **HIGH** | Show mismatch badge; do NOT hide the discrepancy |
| consumption_lines have empty segment_allocations (legacy) | MEDIUM | Show "— (legacy)" for batch column; add note about FEFO status |
| Negative stock values in summary | MEDIUM | Display as-is with warning; existing P22 pattern |
| segment.batch = null (legacy bucket) | LOW | Display as "Legacy (untracked)" |
| segment.expiry_date = null | LOW | Display as "No expiry" gray badge |
| Cross-store item detail returns 404 | LOW | Only allow detail for own-store items (backend enforced) |
| consumption_limit cap at 200 | LOW | Add pagination note if truncated |
| cal_quantity in summary is STRING | LOW | Parse to float at API normalization layer |
| segment_snapshot on wastage report is current state, not event-time | MEDIUM | Clear UX labeling: "Current on-hand segments" |

---

## 8. Implementation Plan

### Phase 1: Stock Detail Panel (~5-6h)

**Scope:** Item summary + segment table + reconciliation badge + expiry badges
**Files:**
- `StockDetailPanel.jsx` — new component (dialog or side panel)
- `useStockDetail.js` — hook
- `api.js` — add `getStockDetail`
- `StockInventorySummary.jsx` — add row click → open detail

**Risk:** LOW — additive, no existing flow changes

### Phase 2: Consumption Section (~3-4h)

**Scope:** Consumption date filter + consumption lines table + FEFO allocation display
**Files:**
- Enhance `StockDetailPanel.jsx` with ConsumptionSection
- Date range selector for consumption period

**Risk:** LOW — read-only display

### Phase 3: Wastage Report Enhancement (~2-3h)

**Scope:** Add batch column to wastage report + segment_snapshot toggle
**Files:**
- Enhance existing `WastageReport.jsx`
- `api.js` — extend `getWastageReport` with `has_batch` + `include_segments` params

**Risk:** LOW — extends existing report

**Total: ~10-13h, 3 phases.**

### Rollout Order

1. **Phase 1 first** — segment visibility is the core value
2. **Phase 2 second** — consumption with FEFO allocations when available
3. **Phase 3 last** — wastage batch detail is supplementary

---

## 9. FEFO End-to-End Trace Summary

### What CAN be traced today:

```
Transfer from Master (src=1) → F3 (785):
  ├── segments[].source_restaurant_id = 782 (DemoCentral2 was intermediary)
  ├── segments[].batch = "MAIDA-BATCH-01"
  ├── segments[].expiry_date = "2026-12-31"
  └── segments[].cal_quantity = 1000 per segment

F2 (784) consumption (legacy — NOT via FEFO):
  ├── consumption_lines[].order_id = 869307, 869321
  ├── consumption_lines[].food_item = "aloo parantha"
  ├── consumption_lines[].quantity_deducted_cal = 250, 500
  └── consumption_lines[].segment_allocations = [] (empty — legacy path)
```

### What CANNOT be traced today:
- FEFO batch-level deductions at F2 (fefo_consumption_enabled appears OFF)
- Per-segment consumption audit (segment_allocations empty on existing consumption lines)
- Wastage segment audit (all existing wastage records have segment_allocations_json=null)

### When fefo_consumption_enabled is turned ON:
- `consumption_lines[].segment_allocations` will populate with `{segment_id, batch, deducted_cal, expiry_date}`
- `wastage_records[].segment_allocations` will populate similarly
- Reconciliation gaps should converge to zero after backfill

---

## 10. Open Questions

1. **Is fefo_consumption_enabled ON for any test store?** — F2 consumption lacks FEFO allocations, suggesting it's OFF. F3 has segments but no consumption to verify.

2. **Should detail panel show segment_snapshot from wastage report too?** — Recommendation: No — keep wastage and stock detail separate. The stock detail segments[] is authoritative.

3. **How to handle reconciliation mismatch UX?** — Recommendation: Show the numbers honestly with color coding. Don't attempt to "fix" in frontend.

4. **Should we show source_restaurant_id as store name?** — Yes — resolve via hierarchy_scope or children list. Use "Unknown" as fallback.

5. **Pagination for consumption_lines?** — Default 50, cap 200. If near cap, show "Showing 200 of potentially more — narrow date range."
