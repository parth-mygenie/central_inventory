# CR-018 Artifact 2 — Impact Analysis

> **CR ID:** CR-018
> **Title:** P25 — Wastage Report Enhancements
> **Artifact:** 2 (Impact Analysis)
> **Date:** 2026-06-13
> **Author:** E1 agent
> **Phase 7 Ref:** C-4 — "Top wasted items ranking, trend vs average, reason breakdown, drill-down to records, Export CSV"

---

## 1. Current State (WastageReport.jsx — 433 lines)

### Already Implemented (from prior CRs)

| Feature | Status | Lines |
|---------|:------:|:-----:|
| KPI cards (Total Records, Net Wastage, Batch Audited, Physical Count) | ✅ DONE | 242-293 |
| Filters: date range, waste_type (Loss/Gain), batch-audited toggle | ✅ DONE | 297-320 |
| Table: Date, Item, Type badge, Qty, Unit, Reason, Batch, Expiry, Source badge | ✅ DONE | 340-418 |
| FEFO batch drill-down (expandable segment allocations) | ✅ DONE | 98-136 |
| CSV export | ✅ DONE | 217-236 |
| Summary footer (Loss/Gain totals, store count) | ✅ DONE | 421-430 |
| Loading / Error / Empty states | ✅ DONE | 323-338 |

### Missing per Phase 7 Spec (C-4)

| Feature | Status | Description |
|---------|:------:|-------------|
| **Top wasted items ranking** | MISSING | Aggregate wastage_records by item_name, sort by total quantity, show top N |
| **Trend vs average** | MISSING | Compare current period wastage to previous period (or rolling average) |
| **Reason breakdown** | MISSING | Group records by waste_reason, show counts/percentages as visual breakdown |

---

## 2. API Validation

### 2.1 Endpoints Used

| Endpoint | Status | What It Returns |
|----------|:------:|-----------------|
| `POST /inventory/wastage-report` | ✅ Working | `summary`, `by_restaurant[]`, `wastage_records[]`, `segment_snapshot[]` |
| `GET /inventory/wastage-reasons` | ✅ Working | `reasons[]` — store-configured reason list |

### 2.2 Data Available for Enhancements

| Enhancement | Data Source | Computation |
|-------------|-----------|-------------|
| **Top wasted items** | `wastage_records[].item_name` + `wastage_records[].wastage_quantity` | Frontend aggregation: group by item_name, sum quantities, sort desc |
| **Reason breakdown** | `wastage_records[].waste_reason` | Frontend aggregation: group by waste_reason, count occurrences |
| **Trend vs average** | Two API calls with different date ranges, OR single call + client-side period split | Compare current range totals to previous equivalent period |

### 2.3 Data Availability

| Hierarchy | Records | Notes |
|-----------|:-------:|-------|
| 806 (ChocolateHut) | **0** | No wastage recorded yet — empty state |
| 1 (Legacy) | **0** | Previously had 8 records (P25 validation), now cleared |

**Impact:** All 3 enhancements must handle zero-record gracefully. Sections should not render when no data exists.

---

## 3. File Impact

### 3.1 Files Modified (1 file)

| # | File | Lines Now | Est. After | Change | Risk |
|---|------|:---------:|:----------:|--------|:----:|
| M1 | `WastageReport.jsx` | 433 | ~550 | Add 3 intelligence sections between KPI cards and filters row | LOW |

### 3.2 No New Files

All 3 enhancements are inline sections within the existing WastageReport component. No new hooks, no new components, no new API functions needed.

### 3.3 Files Referenced (Read-Only)

| File | Used For |
|------|----------|
| `services/api.js` | `getWastageReport()` — already returns full response shape |
| `hooks/useWastageReasons.js` | Not needed here — reasons come from wastage_records themselves |
| `lib/formatters.js` | `formatTimestamp()` — already imported |

### 3.4 No Frozen Files Touched

- `terminology.js` — not needed (wastage report is single-store, no hierarchy labels)
- `screenVisibility.js` — not touched (route/nav unchanged)
- `server.py` — not touched (proxy-only, no backend changes)

---

## 4. Enhancement Design

### 4.1 Top Wasted Items Ranking

**Data:** Aggregate `wastage_records` by `item_name`, sum `wastage_quantity` per item, sort descending.

**UI:** Horizontal bar chart or ranked list (top 5-10 items). Each row shows:
- Item name
- Total quantity wasted + unit
- % of total wastage
- Loss vs Gain breakdown per item

**Placement:** Below KPI cards, above filters.

**Empty state:** Section hidden when 0 records.

### 4.2 Reason Breakdown

**Data:** Group `wastage_records` by `waste_reason`, count per reason.

**UI:** Compact breakdown showing:
- Reason name
- Count of records
- Percentage of total
- Color-coded bar (proportional width)

**Placement:** Next to or below top-wasted section (side-by-side on desktop).

**Empty state:** Section hidden when 0 records.

### 4.3 Trend vs Average

**Approach:** Compare current period to previous equivalent period.
- If user selected date range = 7 days → compare to previous 7 days
- If no date range → compare last 30 days to prior 30 days
- Show: current total, previous total, % change (up/down arrow + color)

**Data:** Requires a second API call with shifted date range. Use `getWastageReport()` with previous period dates.

**UI:** Compact trend card with:
- "This period: X records, Y qty"
- "Previous period: X records, Y qty"  
- Delta arrow (▲▼) with % change

**Placement:** Inline with KPI cards or below them.

**Empty state:** Shows "No previous data for comparison" when prior period has 0 records.

---

## 5. Risk Analysis

| # | Risk | Severity | Mitigation |
|---|------|:--------:|------------|
| R1 | Zero wastage data in 806 hierarchy | LOW | All sections hidden when entries.length === 0. Existing empty state handles it. |
| R2 | Trend comparison doubles API calls | LOW | Second call only fires when entries > 0 in current period. Uses same cached `getWastageReport`. |
| R3 | `waste_reason` free-text inconsistency ("Hierarchy wastage" vs "damage") | LOW | Aggregate as-is. No normalization needed — display raw reason strings. |
| R4 | Large record sets slow down client-side aggregation | LOW | useMemo on `entries` dependency. POS API naturally scopes to date range. |
| R5 | `wastage_quantity` mixed units across items | MEDIUM | Top-wasted ranking aggregates per item (same unit per item). Show unit next to quantity. |

---

## 6. Dependency Validation

| # | Dependency | Status | Notes |
|---|-----------|:------:|-------|
| 1 | `getWastageReport()` returns `wastage_records[]` with `item_name`, `wastage_quantity`, `waste_reason`, `waste_type` | ✅ | Confirmed in api.js lines 560-584 |
| 2 | `summary.total_loss`, `summary.total_gain`, `summary.net_wastage` | ✅ | Confirmed in api.js line 571 |
| 3 | `by_restaurant[]` available | ✅ | Confirmed in api.js line 573 |
| 4 | `useMemo` for client-side aggregation | ✅ | Already imported in WastageReport.jsx line 1 |
| 5 | `Card`, `Badge`, `Progress` UI components | ✅ | Already available and imported |
| 6 | Date range picker passes `dateRange.from` / `dateRange.to` | ✅ | Confirmed in WastageReport.jsx lines 160-161 |
| 7 | `format()` from date-fns for date arithmetic | ✅ | Already imported line 46 |
| 8 | `subDays`, `differenceInDays` from date-fns for trend period calc | ⚠️ | Need to add import — date-fns already in package.json |

---

## 7. Effort Estimate

| Step | Task | Est. |
|------|------|:----:|
| 1 | Top wasted items ranking (useMemo aggregation + UI) | 1h |
| 2 | Reason breakdown (useMemo grouping + visual bars) | 45min |
| 3 | Trend vs previous period (second API call + delta display) | 1.5h |
| 4 | Empty state handling + responsive layout | 30min |
| 5 | QA testing | 30min |
| **Total** | | **~4h** |

---

## 8. Summary

- **1 file modified** (`WastageReport.jsx`), ~120 lines added
- **0 new files**, **0 backend changes**, **0 frozen files touched**
- **0 API blockers** — all data available from existing `getWastageReport()` response
- **Risk: LOW** — additive sections, existing functionality untouched
- **Data note:** 806 hierarchy has 0 wastage records — enhancements will show empty states until wastage is recorded
