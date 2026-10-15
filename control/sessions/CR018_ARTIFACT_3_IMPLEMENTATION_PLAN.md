# CR-018 Artifact 3 — Implementation Plan

> **CR ID:** CR-018
> **Title:** P25 — Wastage Report Enhancements
> **Artifact:** 3 (Implementation Plan)
> **Date:** 2026-06-13
> **Mock Freeze:** CR-018 mock FROZEN 2026-06-13
> **Depends on:** Artifact 2 (Impact Analysis)

---

## 1. Execution Order

```
Step 1: Add date-fns imports (subDays, differenceInDays)
Step 2: Add client-side aggregation logic (useMemo)
Step 3: Add trend fetch (previous period API call)
Step 4: Add Period Comparison UI
Step 5: Add Top Wasted Items UI
Step 6: Add Reason Breakdown UI
Step 7: Empty state guards
```

Single file change. Single delivery. No dependencies between steps.

---

## 2. Step 1: Imports

Add to WastageReport.jsx:
```js
import { format, subDays, differenceInDays } from "date-fns";
```
`subDays` and `differenceInDays` already in date-fns (installed in package.json). No new packages.

---

## 3. Step 2: Client-Side Aggregation (useMemo)

### Top Wasted Items
```js
const topWastedItems = useMemo(() => {
  if (entries.length === 0) return [];
  const byItem = {};
  for (const e of entries) {
    const key = e.item_name || "Unknown";
    if (!byItem[key]) byItem[key] = { name: key, totalQty: 0, unit: e.unit || "", count: 0 };
    byItem[key].totalQty += Number(e.wastage_quantity) || 0;
    byItem[key].count += 1;
  }
  const sorted = Object.values(byItem).sort((a, b) => b.totalQty - a.totalQty);
  const totalQty = sorted.reduce((s, i) => s + i.totalQty, 0);
  return sorted.slice(0, 5).map((item, idx) => ({
    ...item,
    rank: idx + 1,
    pct: totalQty > 0 ? ((item.totalQty / totalQty) * 100).toFixed(1) : "0",
    barWidth: totalQty > 0 ? (item.totalQty / sorted[0].totalQty) * 100 : 0,
  }));
}, [entries]);
```

### Reason Breakdown
```js
const reasonBreakdown = useMemo(() => {
  if (entries.length === 0) return [];
  const byReason = {};
  for (const e of entries) {
    const key = e.waste_reason || "Unknown";
    byReason[key] = (byReason[key] || 0) + 1;
  }
  const total = entries.length;
  const sorted = Object.entries(byReason)
    .map(([reason, count]) => ({ reason, count, pct: ((count / total) * 100).toFixed(0) }))
    .sort((a, b) => b.count - a.count);
  const maxCount = sorted[0]?.count || 1;
  return sorted.map(r => ({ ...r, barWidth: (r.count / maxCount) * 100 }));
}, [entries]);
```

### Loss/Gain Counts
```js
const lossCount = useMemo(() => entries.filter(e => e.waste_type === "Loss").length, [entries]);
const gainCount = useMemo(() => entries.filter(e => e.waste_type === "Gain").length, [entries]);
```

---

## 4. Step 3: Trend Fetch (Previous Period)

Add state:
```js
const [prevPeriodData, setPrevPeriodData] = useState(null);
const [trendLoading, setTrendLoading] = useState(false);
```

Add effect (fires after main data loads, only when entries > 0):
```js
useEffect(() => {
  if (!reportData || entries.length === 0) { setPrevPeriodData(null); return; }
  
  let from, to, daySpan;
  if (dateRange?.from && dateRange?.to) {
    from = dateRange.from;
    to = dateRange.to;
    daySpan = differenceInDays(to, from) + 1;
  } else {
    to = new Date();
    from = subDays(to, 30);
    daySpan = 30;
  }
  
  const prevTo = subDays(from, 1);
  const prevFrom = subDays(prevTo, daySpan - 1);
  
  setTrendLoading(true);
  api.getWastageReport({
    restaurantIds: getRestaurantIds(),
    fromDate: format(prevFrom, "yyyy-MM-dd"),
    toDate: format(prevTo, "yyyy-MM-dd"),
  }).then(resp => {
    setPrevPeriodData(resp.data);
  }).catch(() => {
    setPrevPeriodData(null);
  }).finally(() => setTrendLoading(false));
}, [reportData, entries.length, dateRange, getRestaurantIds]);
```

Compute delta:
```js
const trendDelta = useMemo(() => {
  if (!prevPeriodData || !summary) return null;
  const current = Number(summary.net_wastage) || 0;
  const previous = Number(prevPeriodData.summary?.net_wastage) || 0;
  if (previous === 0 && current === 0) return null;
  const pctChange = previous > 0 ? (((current - previous) / previous) * 100).toFixed(0) : current > 0 ? 100 : 0;
  return {
    current,
    previous,
    pctChange: Number(pctChange),
    direction: current > previous ? "up" : current < previous ? "down" : "flat",
    currentRecords: summary.total_records || 0,
    previousRecords: prevPeriodData.summary?.total_records || 0,
    currentStores: summary.applied_restaurant_ids?.length || 0,
    previousStores: prevPeriodData.summary?.applied_restaurant_ids?.length || 0,
  };
}, [summary, prevPeriodData]);
```

---

## 5. Steps 4-6: UI Sections

### Placement (in render, between KPI grid and filter row):
```
{/* KPI Cards */}
...existing KPI grid...

{/* CR-018: Intelligence Section */}
{entries.length > 0 && (
  <>
    {/* Period Comparison */}
    {trendDelta && <PeriodComparison ... />}
    
    {/* Top Wasted + Reason Breakdown side-by-side */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-5">
      {topWastedItems.length > 0 && <TopWastedCard ... />}
      {reasonBreakdown.length > 0 && <ReasonBreakdownCard ... />}
    </div>
  </>
)}

{/* Filters */}
...existing filters...
```

### Data-testids
```
data-testid="period-comparison"
data-testid="trend-current"
data-testid="trend-previous"
data-testid="trend-delta"
data-testid="top-wasted-items"
data-testid="top-wasted-item-{rank}"
data-testid="reason-breakdown"
data-testid="reason-row-{index}"
data-testid="loss-gain-summary"
```

### Reason Color Map (inline)
```js
const REASON_COLORS = {
  "Expired": "bg-red-500",
  "Spillage": "bg-amber-500",
  "Pilferage": "bg-violet-500",
  "Hierarchy wastage": "bg-blue-500",
  _default: "bg-slate-400",
};
```

---

## 6. Step 7: Empty State Guards

- All 3 sections wrapped in `{entries.length > 0 && ...}`
- Period Comparison additionally guarded by `{trendDelta && ...}`
- Top Wasted guarded by `{topWastedItems.length > 0 && ...}`
- Reason Breakdown guarded by `{reasonBreakdown.length > 0 && ...}`
- Trend loading shows subtle skeleton inside Period Comparison card

---

## 7. Testing Checklist

| # | Test | Method |
|---|------|--------|
| T1 | Empty state: 0 records → no intelligence sections shown | Screenshot (806 hierarchy) |
| T2 | With data: all 3 sections render (if test data available) | Screenshot or curl validation |
| T3 | Existing KPIs, filters, table, CSV still work | Screenshot |
| T4 | Date range change → trend recalculates | Interaction test |
| T5 | Reason colors match mock (red/amber/violet/blue/gray) | Visual |
| T6 | Responsive: 2-col → 1-col on narrow viewport | Screenshot |

---

## 8. File Change Summary

| File | Action | Lines Added | Risk |
|------|--------|:-----------:|:----:|
| `WastageReport.jsx` | Modify | ~120 | LOW |

**Total: ~120 lines added to 1 file. No new files. No backend changes.**

---

*Plan frozen per approved mock. Proceed to implementation.*
