import { useState, useMemo } from "react";
import { useLoginContext } from "@/hooks/useLoginContext";
import useConsumptionReport from "@/hooks/useConsumptionReport";
import DateRangePicker from "@/components/common/DateRangePicker";
import { LoadingState, EmptyState, ErrorState } from "@/components/common/StateDisplays";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { mapRestaurantTypeShort } from "@/lib/terminology";
import {
  BarChart3,
  Search,
  ChevronDown,
  ChevronRight,
  CalendarDays,
  Beaker,
  Store,
  AlertTriangle,
  FileText,
  Loader2,
  X,
} from "lucide-react";
import { format, startOfMonth, endOfDay } from "date-fns";

/* ── Helpers ──────────────────────────────────────────────────── */

function parseQtyValue(str) {
  if (!str) return 0;
  const match = String(str).match(/^(-?\d+\.?\d*)/);
  return match ? parseFloat(match[1]) : 0;
}

function resolveStoreName(rid, scope) {
  const s = scope.find((h) => h.id === rid);
  return s ? s.name : `Store #${rid}`;
}

/* ── KPI Cards ────────────────────────────────────────────────── */

function KPICards({ summary, byRestaurant, appliedIds, dateRange, scope }) {
  const ingredientCount = summary.length;
  const uniqueStores = new Set(summary.map((s) => s.restaurant_id).filter(Boolean));
  const storesReporting = uniqueStores.size || (summary.length > 0 ? 1 : 0);
  const totalStores = appliedIds.length || 1;
  const totalConsumedRaw = byRestaurant.length > 0
    ? byRestaurant.reduce((sum, r) => sum + (r.total_consumed_raw || 0), 0)
    : null;

  const periodLabel = dateRange.length === 2
    ? `${format(new Date(dateRange[0] + "T00:00:00"), "d MMM")} - ${format(new Date(dateRange[1] + "T00:00:00"), "d MMM yyyy")}`
    : "—";

  const cards = [
    { label: "Ingredients Tracked", value: ingredientCount, icon: Beaker },
    { label: "Total Consumed", value: totalConsumedRaw != null ? totalConsumedRaw.toLocaleString() + " (raw)" : "—", icon: BarChart3 },
    { label: "Stores Reporting", value: `${storesReporting} of ${totalStores}`, icon: Store },
    { label: "Period", value: periodLabel, icon: CalendarDays },
  ];

  return (
    <div data-testid="consumption-kpi-cards" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <Card key={c.label} className="shadow-none border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <c.icon className="h-3.5 w-3.5" />
              <span className="text-[10px] uppercase tracking-wider font-medium">{c.label}</span>
            </div>
            <p data-testid={`kpi-${c.label.toLowerCase().replace(/\s+/g, "-")}`} className="text-lg font-semibold text-foreground">
              {c.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ── Ingredient Summary Table ─────────────────────────────────── */

function IngredientSummaryTable({ summary, scope, isMultiStore, onDrillDown }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("ingredient_name");
  const [sortDir, setSortDir] = useState("asc");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let items = summary;
    if (q) {
      items = items.filter(
        (r) =>
          r.ingredient_name?.toLowerCase().includes(q) ||
          r.category_name?.toLowerCase().includes(q)
      );
    }
    items = [...items].sort((a, b) => {
      if (sortKey === "total_consumed") {
        const av = parseQtyValue(a.total_consumed);
        const bv = parseQtyValue(b.total_consumed);
        return sortDir === "asc" ? av - bv : bv - av;
      }
      const av = (a[sortKey] || "").toLowerCase();
      const bv = (b[sortKey] || "").toLowerCase();
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return items;
  }, [summary, search, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortHeader = ({ k, children }) => (
    <TableHead
      className="cursor-pointer select-none text-xs"
      onClick={() => toggleSort(k)}
    >
      <span className="flex items-center gap-1">
        {children}
        {sortKey === k && <span className="text-[10px]">{sortDir === "asc" ? "\u25B2" : "\u25BC"}</span>}
      </span>
    </TableHead>
  );

  if (summary.length === 0) return null;

  return (
    <Card className="shadow-none border" data-testid="ingredient-summary-table">
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Beaker className="h-4 w-4" />
          Ingredient Summary ({summary.length})
        </CardTitle>
        <div className="relative w-48">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            data-testid="ingredient-search"
            placeholder="Search ingredients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 pl-7 text-xs"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHeader k="ingredient_name">Ingredient</SortHeader>
              <SortHeader k="category_name">Category</SortHeader>
              <TableHead className="text-xs">Opening</TableHead>
              <SortHeader k="total_consumed">Consumed</SortHeader>
              <TableHead className="text-xs">Closing</TableHead>
              {isMultiStore && <TableHead className="text-xs">Store</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row, i) => {
              const closingNeg = parseQtyValue(row.closing_stock) < 0;
              return (
                <TableRow
                  key={`${row.ingredient_id}-${row.restaurant_id || 0}-${i}`}
                  data-testid={`summary-row-${row.ingredient_id}`}
                  className="cursor-pointer hover:bg-accent/50"
                  onClick={() => onDrillDown?.(row)}
                >
                  <TableCell className="text-xs font-medium">{row.ingredient_name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{row.category_name || "—"}</TableCell>
                  <TableCell className="text-xs font-mono">{row.opening_stock || "—"}</TableCell>
                  <TableCell className="text-xs font-mono font-semibold">{row.total_consumed || "—"}</TableCell>
                  <TableCell className="text-xs font-mono">
                    <span className="flex items-center gap-1">
                      {row.closing_stock || "—"}
                      {closingNeg && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                    </span>
                  </TableCell>
                  {isMultiStore && (
                    <TableCell className="text-xs text-muted-foreground">
                      {row.restaurant_id ? resolveStoreName(row.restaurant_id, scope) : "—"}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={isMultiStore ? 6 : 5} className="text-center text-xs text-muted-foreground py-6">
                  No ingredients match "{search}"
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ── Consumption Details Table ─────────────────────────────────── */

function ConsumptionDetailsTable({ details, scope, isMultiStore, drillIngredient }) {
  const [open, setOpen] = useState(!!drillIngredient);

  const filtered = useMemo(() => {
    let rows = details;
    if (drillIngredient) {
      rows = rows.filter(
        (d) =>
          d.ingredient_id === drillIngredient.ingredient_id &&
          (!drillIngredient.restaurant_id || d.restaurant_id === drillIngredient.restaurant_id)
      );
    }
    return [...rows].sort((a, b) => {
      const da = a.consumption_date || "";
      const db = b.consumption_date || "";
      if (da !== db) return db.localeCompare(da);
      return (b.order_id || 0) - (a.order_id || 0);
    });
  }, [details, drillIngredient]);

  if (details.length === 0 && !drillIngredient) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen} data-testid="consumption-details-section">
      <Card className="shadow-none border">
        <CollapsibleTrigger asChild>
          <CardHeader className="py-3 px-4 cursor-pointer hover:bg-accent/30 transition-colors">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <FileText className="h-4 w-4" />
              Consumption Details ({filtered.length})
              {drillIngredient && (
                <Badge variant="secondary" className="ml-2 text-[10px]">
                  Filtered: {drillIngredient.ingredient_name}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Order</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Food Item</TableHead>
                  <TableHead className="text-xs">Ingredient</TableHead>
                  <TableHead className="text-xs">Qty Deducted</TableHead>
                  {isMultiStore && <TableHead className="text-xs">Store</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row, i) => (
                  <TableRow key={`${row.order_id}-${row.ingredient_id}-${i}`} data-testid={`detail-row-${i}`}>
                    <TableCell className="text-xs">
                      {row.consumption_date
                        ? format(new Date(row.consumption_date + "T00:00:00"), "d MMM")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs font-mono">#{row.order_id}</TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {row.order_type || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{row.food_item || "—"}</TableCell>
                    <TableCell className="text-xs font-medium">{row.ingredient_name || "—"}</TableCell>
                    <TableCell className="text-xs font-mono font-semibold">{row.quantity_deducted || "—"}</TableCell>
                    {isMultiStore && (
                      <TableCell className="text-xs text-muted-foreground">
                        {row.restaurant_id ? resolveStoreName(row.restaurant_id, scope) : "—"}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isMultiStore ? 7 : 6} className="text-center text-xs text-muted-foreground py-6">
                      {drillIngredient
                        ? `No detail records for ${drillIngredient.ingredient_name}`
                        : "No consumption details in this period"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

/* ── By Store Rollup ──────────────────────────────────────────── */

function ByStoreRollup({ byRestaurant, appliedIds, scope }) {
  const [showEmpty, setShowEmpty] = useState(false);

  if (byRestaurant.length === 0) return null;

  const storesWithData = byRestaurant.filter((r) => r.ingredient_rows > 0);
  const storeIdsWithData = new Set(storesWithData.map((r) => r.restaurant_id));
  const emptyStoreCount = appliedIds.filter((id) => !storeIdsWithData.has(id)).length;

  return (
    <Card className="shadow-none border" data-testid="by-store-rollup">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Store className="h-4 w-4" />
          Consumption by Store
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        {storesWithData.map((r) => {
          const name = resolveStoreName(r.restaurant_id, scope);
          const scopeItem = scope.find((s) => s.id === r.restaurant_id);
          const typeLabel = scopeItem ? mapRestaurantTypeShort(scopeItem.restaurant_type_flag) : "";
          return (
            <div
              key={r.restaurant_id}
              data-testid={`store-rollup-${r.restaurant_id}`}
              className="flex items-center justify-between p-3 border rounded-md bg-accent/20"
            >
              <div>
                <p className="text-sm font-medium">{name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {typeLabel && <span className="mr-2">{typeLabel}</span>}
                  {r.ingredient_rows} ingredient{r.ingredient_rows !== 1 ? "s" : ""} consumed
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold font-mono">{r.total_consumed_raw?.toLocaleString() ?? "—"}</p>
                <p className="text-[10px] text-muted-foreground">raw units total</p>
              </div>
            </div>
          );
        })}
        {emptyStoreCount > 0 && (
          <Collapsible open={showEmpty} onOpenChange={setShowEmpty}>
            <CollapsibleTrigger asChild>
              <button
                data-testid="empty-stores-toggle"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 pt-1"
              >
                {showEmpty ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                {emptyStoreCount} store{emptyStoreCount !== 1 ? "s" : ""} with no consumption
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-1 space-y-1">
              {appliedIds
                .filter((id) => !storeIdsWithData.has(id))
                .map((id) => (
                  <div key={id} className="text-xs text-muted-foreground pl-4">
                    {resolveStoreName(id, scope)} — no consumption
                  </div>
                ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Store Multi-Selector ─────────────────────────────────────── */

function StoreMultiSelector({ scope, selected, onChange }) {
  const [open, setOpen] = useState(false);

  const toggle = (id) => {
    if (selected.includes(id)) onChange(selected.filter((s) => s !== id));
    else onChange([...selected, id]);
  };

  const clearAll = () => onChange([]);

  return (
    <div className="relative" data-testid="store-multi-selector">
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs gap-1.5 font-normal"
        onClick={() => setOpen(!open)}
        data-testid="store-selector-trigger"
      >
        <Store className="h-3.5 w-3.5" />
        {selected.length === 0
          ? "All Stores"
          : `${selected.length} store${selected.length > 1 ? "s" : ""}`}
        <ChevronDown className="h-3 w-3" />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 z-50 bg-popover border rounded-md shadow-md p-2 min-w-[200px] max-h-60 overflow-y-auto">
            {selected.length > 0 && (
              <button
                onClick={clearAll}
                className="text-[10px] text-muted-foreground hover:text-foreground mb-1 px-1"
                data-testid="store-selector-clear"
              >
                Clear selection (all stores)
              </button>
            )}
            {scope.map((s) => (
              <label
                key={s.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-xs"
                data-testid={`store-option-${s.id}`}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(s.id)}
                  onChange={() => toggle(s.id)}
                  className="rounded border-border"
                />
                <span className="flex-1">{s.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {mapRestaurantTypeShort(s.restaurant_type_flag)}
                </span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────────── */

export default function DailyConsumptionReport() {
  const { restaurantType, isTopLevel, isMiddleLevel } = useLoginContext();
  const canMultiStore = isTopLevel || isMiddleLevel;

  const {
    summary,
    details,
    byRestaurant,
    scope,
    appliedIds,
    dateRange,
    loading,
    error,
    fetchReport,
  } = useConsumptionReport();

  // Filter state
  const [dateRangeFilter, setDateRangeFilter] = useState({
    from: startOfMonth(new Date()),
    to: endOfDay(new Date()),
  });
  const [selectedStores, setSelectedStores] = useState([]);
  const [includeHierarchy, setIncludeHierarchy] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  // Drill-down state
  const [drillIngredient, setDrillIngredient] = useState(null);

  const handleGenerate = () => {
    setDrillIngredient(null);
    setHasFetched(true);
    fetchReport({
      fromDate: dateRangeFilter?.from,
      toDate: dateRangeFilter?.to,
      restaurantIds: selectedStores,
      includeHierarchy: canMultiStore ? includeHierarchy : undefined,
    });
  };

  const handleDrillDown = (row) => {
    if (drillIngredient?.ingredient_id === row.ingredient_id && drillIngredient?.restaurant_id === row.restaurant_id) {
      setDrillIngredient(null);
    } else {
      setDrillIngredient(row);
    }
  };

  const isMultiStore = appliedIds.length > 1;

  return (
    <div data-testid="daily-consumption-report" className="space-y-4 p-4 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-foreground" />
        <h1 className="text-lg font-bold">Daily Consumption Report</h1>
      </div>

      {/* Filters */}
      <Card className="shadow-none border" data-testid="consumption-filters">
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            <DateRangePicker
              dateRange={dateRangeFilter}
              onDateRangeChange={(range) => setDateRangeFilter(range)}
            />

            {canMultiStore && scope.length > 0 && (
              <StoreMultiSelector
                scope={scope}
                selected={selectedStores}
                onChange={setSelectedStores}
              />
            )}

            {canMultiStore && (
              <div className="flex items-center gap-2" data-testid="hierarchy-toggle">
                <Switch
                  id="include-hierarchy"
                  checked={includeHierarchy}
                  onCheckedChange={setIncludeHierarchy}
                  data-testid="hierarchy-switch"
                />
                <Label htmlFor="include-hierarchy" className="text-xs cursor-pointer">
                  Include all stores
                </Label>
              </div>
            )}

            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={handleGenerate}
              disabled={loading}
              data-testid="generate-report-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  Loading...
                </>
              ) : (
                "Generate Report"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && <ErrorState message={error} onRetry={handleGenerate} />}

      {/* Loading */}
      {loading && <LoadingState lines={4} />}

      {/* Results */}
      {!loading && !error && hasFetched && (
        <>
          {summary.length === 0 && details.length === 0 ? (
            <EmptyState
              title="No consumption recorded"
              description="No consumption data found for the selected period and stores."
              icon={BarChart3}
            />
          ) : (
            <div className="space-y-4">
              <KPICards
                summary={summary}
                byRestaurant={byRestaurant}
                appliedIds={appliedIds}
                dateRange={dateRange}
                scope={scope}
              />

              <IngredientSummaryTable
                summary={summary}
                scope={scope}
                isMultiStore={isMultiStore}
                onDrillDown={handleDrillDown}
              />

              {drillIngredient && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    Drill-down: {drillIngredient.ingredient_name}
                    {drillIngredient.restaurant_id && ` (${resolveStoreName(drillIngredient.restaurant_id, scope)})`}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setDrillIngredient(null)}
                    data-testid="clear-drilldown"
                  >
                    <X className="h-3 w-3 mr-1" /> Clear
                  </Button>
                </div>
              )}

              <ConsumptionDetailsTable
                details={details}
                scope={scope}
                isMultiStore={isMultiStore}
                drillIngredient={drillIngredient}
              />

              {isMultiStore && (
                <ByStoreRollup
                  byRestaurant={byRestaurant}
                  appliedIds={appliedIds}
                  scope={scope}
                />
              )}
            </div>
          )}
        </>
      )}

      {/* Initial state */}
      {!loading && !error && !hasFetched && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Select a date range and click Generate Report</p>
        </div>
      )}
    </div>
  );
}
