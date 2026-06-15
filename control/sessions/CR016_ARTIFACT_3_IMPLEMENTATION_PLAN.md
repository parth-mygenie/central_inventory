# CR-016 Artifact 3 — Implementation Plan

> **CR ID:** CR-016
> **Title:** P20-Phase2 — Stock Inventory Hierarchy Toggle
> **Artifact:** 3 (Implementation Plan)
> **Date:** 2026-06-13
> **Author:** E1 agent

---

## 1. Execution Order

```
Step 1 (api.js) → Step 2 (hook) → Step 3 (UI) → Step 4 (loading/error) → Test
```

Single phase. No blockers. All changes in one delivery.

---

## 2. Step 1: API Layer Update (`services/api.js`) — 15 min

### Current Code
```js
function _getStockInventory() {
  return client.get("/proxy/v2/inventory/stock-inventory").then((resp) => {
    const data = resp.data;
    if (data?.current_stocks) {
      data.current_stocks = data.current_stocks.map(normalizeStockItem);
    }
    return resp;
  });
}
const getStockInventory = _cached("getStockInventory", TTL.LONG, _getStockInventory);
```

### Target Code
```js
function _getStockInventory({ includeHierarchy } = {}) {
  const params = includeHierarchy ? "?include_hierarchy=true" : "";
  return client.get(`/proxy/v2/inventory/stock-inventory${params}`).then((resp) => {
    const data = resp.data;
    if (data?.current_stocks) {
      data.current_stocks = data.current_stocks.map(normalizeStockItem);
    }
    return resp;
  });
}
const getStockInventory = _cached("getStockInventory", TTL.LONG, _getStockInventory);
```

**Backward compatible:** Existing callers (`useStockInventory`, `useStockIntelligence`) call with no args → defaults to `{}` → no hierarchy → same behavior. Cache key changes from `getStockInventory:[]` to `getStockInventory:[{}]` for default calls — but `_invalidateStockCaches()` uses prefix match, so both are invalidated.

---

## 3. Step 2: Hook Update (`hooks/useStockInventory.js`) — 30 min

### Current State
- 64 lines, self-store only
- No `useLoginContext` import
- No hierarchy state
- Returns: `stocks, loading, error, refresh, lastFetched, isStale, totalItems, lowStockItems, lowStockCount, categoryCounts`

### Changes Required

1. Import `useLoginContext`
2. Add `canToggleHierarchy` derived from role
3. Add `showHierarchy` / `setShowHierarchy` toggle state
4. Add `hierarchySummary` and `hierarchyContext` state
5. Update `fetchInventory` to pass `includeHierarchy` when toggle is ON
6. Re-fetch when `showHierarchy` changes
7. Add hierarchy returns

### Target Hook Shape
```js
export function useStockInventory({ staleAfterMs = 5 * 60 * 1000 } = {}) {
  const { isTopLevel, isMiddleLevel } = useLoginContext();
  const canToggleHierarchy = isTopLevel || isMiddleLevel;
  const [showHierarchy, setShowHierarchy] = useState(false);

  // Existing state
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  const fetchIdRef = useRef(0);

  // New hierarchy state
  const [hierarchySummary, setHierarchySummary] = useState(null);
  const [hierarchyContext, setHierarchyContext] = useState(null);
  const [hierarchyLoading, setHierarchyLoading] = useState(false);
  const [hierarchyError, setHierarchyError] = useState(null);

  const fetchInventory = useCallback(async () => {
    const id = ++fetchIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const includeHierarchy = showHierarchy && canToggleHierarchy;
      const resp = await api.getStockInventory(includeHierarchy ? { includeHierarchy: true } : {});
      if (id !== fetchIdRef.current) return;
      const data = resp.data;
      setStocks(data.current_stocks || []);
      setHierarchySummary(data.hierarchy_summary || null);
      setHierarchyContext(data.hierarchy_context || null);
      setLastFetched(Date.now());
    } catch (err) {
      if (id !== fetchIdRef.current) return;
      setError(err?.response?.data?.message || "Failed to load stock inventory");
    } finally {
      if (id === fetchIdRef.current) setLoading(false);
    }
  }, [showHierarchy, canToggleHierarchy]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // ... existing derived values (isStale, lowStockItems, categoryCounts) ...

  return {
    // Existing
    stocks, loading, error, refresh: fetchInventory,
    lastFetched, isStale, totalItems, lowStockItems, lowStockCount, categoryCounts,
    // New — hierarchy
    canToggleHierarchy,
    showHierarchy,
    setShowHierarchy,
    hierarchySummary,
    hierarchyContext,
  };
}
```

---

## 4. Step 3: UI Changes (`StockInventorySummary.jsx`) — 1.5h

### 4.1 New Imports

```js
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { mapRestaurantType, getStoreTypeBadge } from "@/lib/terminology";
import { Store, Building2 } from "lucide-react"; // heatmap card icons
```

### 4.2 Hook Destructuring Update

```js
const {
  stocks, loading, error, refresh, lastFetched, isStale,
  totalItems, lowStockCount, categoryCounts,
  // NEW
  canToggleHierarchy, showHierarchy, setShowHierarchy,
  hierarchySummary, hierarchyContext,
} = useStockInventory();
```

### 4.3 Hierarchy Toggle (in header area, next to Refresh button)

```jsx
{canToggleHierarchy && (
  <div className="flex items-center gap-2">
    <Switch
      data-testid="hierarchy-toggle"
      checked={showHierarchy}
      onCheckedChange={setShowHierarchy}
    />
    <Label className="text-xs text-muted-foreground">
      {showHierarchy ? "All stores" : "My store"}
    </Label>
  </div>
)}
```

### 4.4 Fourth KPI Card (conditional, after Categories card)

```jsx
{showHierarchy && hierarchySummary && (
  <Card data-testid="kpi-stores-in-scope">
    <CardContent className="py-4 px-4 flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
        <Building2 className="h-5 w-5 text-blue-600" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold">{hierarchySummary.total_stores_in_scope}</p>
        <p className="text-xs text-muted-foreground">Stores in Scope</p>
      </div>
    </CardContent>
  </Card>
)}
```

KPI grid changes from `grid-cols-3` to `grid-cols-3 lg:grid-cols-4` when hierarchy is shown.

### 4.5 Low-Stock Alert Banner (below KPI cards, above table)

```jsx
{showHierarchy && hierarchySummary?.totals?.low_stock_rows > 0 && (
  <div
    data-testid="hierarchy-low-stock-alert"
    className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-red-800"
  >
    <AlertTriangle className="h-4 w-4 shrink-0" />
    <p className="text-xs font-medium">
      {hierarchySummary.totals.low_stock_rows} low stock items across {hierarchySummary.total_stores_in_scope} stores
    </p>
  </div>
)}
```

### 4.6 Store Heatmap Grid (below existing table)

```jsx
{showHierarchy && hierarchySummary?.by_store && (
  <div data-testid="store-heatmap" className="mt-6">
    <h2 className="text-sm font-semibold mb-3">Store Stock Health</h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {hierarchySummary.by_store
        .sort((a, b) => {
          const ratioA = a.stock_rows > 0 ? a.low_stock_rows / a.stock_rows : 0;
          const ratioB = b.stock_rows > 0 ? b.low_stock_rows / b.stock_rows : 0;
          return ratioB - ratioA; // worst first
        })
        .map((store) => (
          <StoreHeatmapCard
            key={store.restaurant_id}
            store={store}
            onClick={() => navigate(`/store/${store.restaurant_id}`)}
          />
        ))}
    </div>
  </div>
)}
```

### 4.7 StoreHeatmapCard (inline component in same file)

```jsx
function StoreHeatmapCard({ store, onClick }) {
  const ratio = store.stock_rows > 0
    ? Math.round((store.low_stock_rows / store.stock_rows) * 100)
    : 0;
  const color = ratio === 0 ? "emerald" : ratio <= 50 ? "amber" : "red";

  return (
    <Card
      data-testid={`heatmap-card-${store.restaurant_id}`}
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-medium">{store.name}</p>
            <p className="text-[10px] text-muted-foreground">
              {mapRestaurantType(store.restaurant_type_flag)}
            </p>
          </div>
          <Badge variant="outline" className={`text-[10px] text-${color}-700 border-${color}-200 bg-${color}-50`}>
            {store.low_stock_rows}/{store.stock_rows}
          </Badge>
        </div>
        <Progress value={ratio} className="h-1.5" />
        <p className={`text-[10px] mt-1 ${ratio > 50 ? `text-${color}-700 font-semibold` : "text-muted-foreground"}`}>
          {store.low_stock_rows > 0
            ? `${store.low_stock_rows} low stock`
            : "All stocked"}
        </p>
      </CardContent>
    </Card>
  );
}
```

---

## 5. Step 4: Loading & Error States — 15 min

### Toggle ON → Hierarchy Loading
Own-store table stays visible. Hierarchy section shows skeleton:
```jsx
{showHierarchy && loading && !hierarchySummary && (
  <div className="mt-6">
    <LoadingState lines={3} />
  </div>
)}
```

### Hierarchy Fetch Error
Own-store data stays. Hierarchy shows inline error:
```jsx
{showHierarchy && error && !hierarchySummary && (
  <div className="mt-6">
    <ErrorState message="Failed to load hierarchy data" onRetry={refresh} />
  </div>
)}
```

### Toggle OFF
Hierarchy section unmounts. No fetch triggered (useEffect dependency on `showHierarchy` handles this — refetch with `includeHierarchy=false` restores default cache).

---

## 6. Data Testids

```
data-testid="hierarchy-toggle"
data-testid="kpi-stores-in-scope"
data-testid="hierarchy-low-stock-alert"
data-testid="store-heatmap"
data-testid="heatmap-card-{restaurant_id}"
```

---

## 7. Testing Checklist

| # | Test | Expected |
|---|------|----------|
| T1 | `/inventory` loads for Master — toggle visible | Toggle shown, default OFF |
| T2 | `/inventory` loads for Central — toggle visible | Toggle shown, default OFF |
| T3 | `/inventory` loads for Franchise — toggle hidden | No toggle, no hierarchy UI |
| T4 | Toggle ON (Master) — hierarchy data loads | Heatmap shows stores, KPI "N in scope" |
| T5 | Toggle OFF — hierarchy section removed | Own-store table stays, heatmap unmounts |
| T6 | Heatmap card click → navigates to `/store/{id}` | Store detail page opens |
| T7 | Low-stock alert banner shows when `low_stock_rows > 0` | Red banner above table |
| T8 | Cache: Hub → /inventory within 60s → no duplicate fetch | Network tab: 0 new calls |
| T9 | Cache: Toggle ON, OFF, ON within 60s → second ON cached | No new network call |
| T10 | `total_display_qty` NOT shown anywhere | Only ratio bars and counts |
| T11 | Heatmap sorted by worst ratio first | Highest low-stock % at top |

---

## 8. File Change Summary

| File | Change Type | Lines Added | Risk |
|------|------------|:-----------:|:----:|
| `services/api.js` | Modify `_getStockInventory` signature | ~5 | LOW |
| `hooks/useStockInventory.js` | Add hierarchy state + toggle + role gate | ~30 | LOW |
| `components/central-inventory/StockInventorySummary.jsx` | Toggle + KPI card + alert banner + heatmap grid + StoreHeatmapCard | ~120 | LOW |

**Total: ~155 lines added across 3 files. No new files. No backend changes.**

---

## 9. Rollback Plan

All changes are additive enhancements to existing files.

| Rollback | Action |
|----------|--------|
| api.js | Revert `_getStockInventory` to zero-arg version |
| Hook | Remove hierarchy state/toggle, revert to 64-line original |
| Component | Remove toggle, KPI card, banner, heatmap section, StoreHeatmapCard |

No existing functionality is modified. Toggle OFF = exact same behavior as before CR-016.
