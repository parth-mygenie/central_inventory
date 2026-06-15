import React, { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useStockInventory } from "@/hooks/useStockInventory";
import { useLoginContext } from "@/hooks/useLoginContext";
import { mapRestaurantType } from "@/lib/terminology";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Package,
  AlertTriangle,
  Search,
  RefreshCw,
  ArrowUpDown,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ChevronRight, ChevronDown,
  Download,
  Timer,
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  Store,
} from "lucide-react";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/StateDisplays";

function formatTimeAgo(timestamp) {
  if (!timestamp) return "";
  const diffMs = Date.now() - timestamp;
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

/**
 * P20: Stock Inventory Summary — self-store only.
 * Full inventory table with search, sort, category filter, low-stock indicators.
 */
export default function StockInventorySummary() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultStockType = searchParams.get("type") || "all";
  const { userLevelLabel, restaurantId, user } = useLoginContext();
  const restaurantName = user?.restaurant_name || "";
  const {
    stocks,
    filteredStocks: typeFilteredStocks,
    loading,
    error,
    refresh,
    lastFetched,
    isStale,
    totalItems,
    lowStockCount,
    categoryCounts,
    canToggleHierarchy,
    showHierarchy,
    setShowHierarchy,
    hierarchySummary,
    hierarchyContext,
    stockType,
    setStockType,
    fgCount,
    rawCount,
  } = useStockInventory({ initialStockType: defaultStockType });

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortField, setSortField] = useState("low_stock_first");
  const [refreshing, setRefreshing] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState(null);

  // BUG-031: Filter out "Sub Recipe" from category filter
  const categories = useMemo(() => Object.keys(categoryCounts).filter((c) => c.toLowerCase() !== "sub recipe").sort(), [categoryCounts]);

  // BUG-031: Type-filtered low stock count for KPI accuracy
  const filteredLowStockCount = useMemo(() => typeFilteredStocks.filter(s => s.is_low_stock).length, [typeFilteredStocks]);

  const filtered = useMemo(() => {
    let items = [...typeFilteredStocks];

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      items = items.filter(
        (s) =>
          s.stock_title?.toLowerCase().includes(q) ||
          s.category_name?.toLowerCase().includes(q) ||
          s.vendor_name?.toLowerCase().includes(q)
      );
    }

    if (categoryFilter !== "all") {
      items = items.filter((s) => s.category_name === categoryFilter);
    }

    if (sortField === "low_stock_first") {
      items.sort((a, b) => {
        if (a.is_low_stock && !b.is_low_stock) return -1;
        if (!a.is_low_stock && b.is_low_stock) return 1;
        return (a.stock_title || "").localeCompare(b.stock_title || "");
      });
    } else if (sortField === "name_asc") {
      items.sort((a, b) => (a.stock_title || "").localeCompare(b.stock_title || ""));
    } else if (sortField === "name_desc") {
      items.sort((a, b) => (b.stock_title || "").localeCompare(a.stock_title || ""));
    } else if (sortField === "qty_asc") {
      items.sort((a, b) => a.display_qty - b.display_qty);
    } else if (sortField === "qty_desc") {
      items.sort((a, b) => b.display_qty - a.display_qty);
    }

    return items;
  }, [typeFilteredStocks, search, categoryFilter, sortField]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  if (loading && stocks.length === 0) {
    return (
      <div data-testid="stock-inventory-page">
        <h1 className="text-lg font-bold mb-4" data-testid="stock-inventory-title">Stock Inventory</h1>
        <LoadingState lines={5} />
      </div>
    );
  }

  if (error && stocks.length === 0) {
    return (
      <div data-testid="stock-inventory-page">
        <h1 className="text-lg font-bold mb-4" data-testid="stock-inventory-title">Stock Inventory</h1>
        <ErrorState message={error} onRetry={refresh} />
      </div>
    );
  }

  return (
    <div data-testid="stock-inventory-page">

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold" data-testid="stock-inventory-title">{defaultStockType === "raw" ? "Raw Material Stock" : defaultStockType === "fg" ? "Finished Goods Stock" : "Stock Inventory"}</h1>
          <p className="text-xs text-muted-foreground">
            {restaurantName || userLevelLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canToggleHierarchy && (
            <div className="flex items-center gap-2 mr-2" data-testid="hierarchy-toggle-container">
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
          {lastFetched && (
            <span
              data-testid="last-refreshed"
              className={`text-[10px] flex items-center gap-1 ${isStale ? "text-amber-600" : "text-muted-foreground"}`}
            >
              <Clock className="h-3 w-3" />
              {isStale ? "Stale — " : ""}
              {formatTimeAgo(lastFetched)}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            data-testid="refresh-inventory-btn"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="ghost"
            size="sm"
            data-testid="export-inventory-csv"
            onClick={() => {
              const rows = [["Item","Category","Quantity","Unit","Min Alert","Status","Vendor"]];
              filtered.forEach(s => {
                rows.push([s.stock_title, s.category_name||"", s.display_qty, s.display_unit, s.min_qty_alert, s.is_low_stock?"Low":"OK", s.vendor_name||""]);
              });
              const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href=url; a.download="stock_inventory.csv"; a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            CSV
          </Button>
        </div>
      </div>

      {/* CR-029: Stock type tabs — BUG-031: conditional based on URL type */}
      <div className="flex gap-1 mb-4" data-testid="stock-type-tabs">
        {[
          { value: "all", label: `All (${totalItems})` },
          { value: "fg", label: `Finished Goods (${fgCount})` },
          { value: "raw", label: `Raw Materials (${rawCount})` },
        ].filter((tab) => {
          if (defaultStockType === "raw") return tab.value === "raw";
          if (defaultStockType === "fg") return tab.value === "fg";
          return true;
        }).map((tab) => (
          <button
            key={tab.value}
            data-testid={`stock-type-tab-${tab.value}`}
            onClick={() => setStockType(tab.value)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              stockType === tab.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${showHierarchy && hierarchySummary ? "lg:grid-cols-4" : "lg:grid-cols-3"} gap-3 mb-6`}>
        <Card data-testid="kpi-total-items">
          <CardContent className="py-4 px-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              <Package className="h-5 w-5 text-slate-600" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold">{typeFilteredStocks.length}</p>
              <p className="text-xs text-muted-foreground">Total Items</p>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="kpi-low-stock" className={filteredLowStockCount > 0 ? "border-red-200 bg-red-50/30" : ""}>
          <CardContent className="py-4 px-4 flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${filteredLowStockCount > 0 ? "bg-red-100" : "bg-emerald-50"}`}>
              {filteredLowStockCount > 0 ? (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              )}
            </div>
            <div className="min-w-0">
              <p className={`text-2xl font-bold ${filteredLowStockCount > 0 ? "text-red-700" : ""}`}>
                {filteredLowStockCount}
              </p>
              <p className="text-xs text-muted-foreground">
                {filteredLowStockCount > 0 ? "Low Stock Items" : "All Stocked"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="kpi-categories">
          <CardContent className="py-4 px-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
              <ArrowUpDown className="h-5 w-5 text-violet-600" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold">{categories.length}</p>
              <p className="text-xs text-muted-foreground">Categories</p>
            </div>
          </CardContent>
        </Card>

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
      </div>

      {/* Hierarchy Low-Stock Alert Banner */}
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            data-testid="search-inventory"
            placeholder="Search ingredients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger data-testid="category-filter" className="w-full sm:w-44 h-9 text-sm">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c} ({categoryCounts[c]})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortField} onValueChange={setSortField}>
          <SelectTrigger data-testid="sort-selector" className="w-full sm:w-44 h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low_stock_first">Low Stock First</SelectItem>
            <SelectItem value="name_asc">Name A-Z</SelectItem>
            <SelectItem value="name_desc">Name Z-A</SelectItem>
            <SelectItem value="qty_asc">Qty Low-High</SelectItem>
            <SelectItem value="qty_desc">Qty High-Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Inventory Table */}
      {filtered.length === 0 && stocks.length === 0 ? (
        <EmptyState
          title="No inventory items"
          description="No inventory items configured for your store."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No matches"
          description="No items match your search or filter criteria."
          icon={Search}
        />
      ) : (
        <div className="border rounded-lg overflow-hidden" data-testid="inventory-table-container">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Ingredient</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs text-right">Quantity</TableHead>
                <TableHead className="text-xs text-right">Min Alert</TableHead>
                <TableHead className="text-xs text-center">Status</TableHead>
                <TableHead className="text-xs text-center">Expiry Risk</TableHead>
                <TableHead className="text-xs text-center">Pending</TableHead>
                <TableHead className="text-xs text-right">Days of Cover</TableHead>
                <TableHead className="text-xs w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => {
                // Estimate days of cover: simple heuristic based on qty vs min threshold
                const rawDoc = item.min_qty_alert > 0 && item.display_qty > 0
                  ? Math.round((item.display_qty / item.min_qty_alert) * 7)
                  : null;
                const daysOfCover = rawDoc !== null ? Math.max(0, rawDoc) : null;
                const isExpanded = expandedItemId === item.id;
                return (
                <React.Fragment key={item.id}>
                <TableRow
                  data-testid={`inventory-row-${item.id}`}
                  className={`cursor-pointer transition-colors hover:bg-accent/50 ${item.is_low_stock ? "bg-red-50/40" : ""} ${isExpanded ? "bg-accent/30" : ""}`}
                  onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                >
                  <TableCell className="py-2.5">
                    <span
                      className={`text-sm ${item.is_low_stock ? "font-semibold text-red-800" : "font-medium"}`}
                      data-testid={`stock-title-${item.id}`}
                    >
                      {item.stock_title}
                    </span>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <span className="text-xs text-muted-foreground">{item.category_name || "—"}</span>
                  </TableCell>
                  <TableCell className="py-2.5 text-right">
                    <span
                      className={`text-sm tabular-nums ${item.is_low_stock ? "text-red-700 font-semibold" : ""}`}
                      data-testid={`stock-qty-${item.id}`}
                    >
                      {item.display_qty} {item.display_unit}
                    </span>
                  </TableCell>
                  <TableCell className="py-2.5 text-right">
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {item.min_qty_alert} {item.min_unit_alert}
                    </span>
                  </TableCell>
                  <TableCell className="py-2.5 text-center">
                    {item.is_low_stock ? (
                      <Badge
                        data-testid={`low-stock-badge-${item.id}`}
                        variant="destructive"
                        className="text-[10px] px-1.5 py-0"
                      >
                        Low
                      </Badge>
                    ) : (
                      <Badge
                        data-testid={`ok-stock-badge-${item.id}`}
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 text-emerald-700 border-emerald-200 bg-emerald-50"
                      >
                        OK
                      </Badge>
                    )}
                  </TableCell>
                  {/* Expiry Risk — BUG-032: show nearest expiry date from segments */}
                  <TableCell className="py-2.5 text-center">
                    {(() => {
                      const segs = item.segments_preview || [];
                      const validDates = segs.map(s => s.expiry_date).filter(Boolean).sort();
                      const nearest = validDates[0];
                      if (!nearest) return <span className="text-[10px] text-muted-foreground" data-testid={`expiry-risk-${item.id}`}>—</span>;
                      const daysLeft = Math.ceil((new Date(nearest + "T23:59:59") - new Date()) / 86400000);
                      const isExpired = daysLeft < 0;
                      const isNear = daysLeft >= 0 && daysLeft < 14;
                      return (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${isExpired ? "bg-red-100 text-red-700" : isNear ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`} data-testid={`expiry-risk-${item.id}`}>
                          {isExpired ? `Expired` : `${daysLeft}d`}
                        </span>
                      );
                    })()}
                  </TableCell>
                  {/* Pending In/Out */}
                  <TableCell className="py-2.5 text-center">
                    <span className="text-[10px] text-muted-foreground" data-testid={`pending-${item.id}`}>—</span>
                  </TableCell>
                  {/* Days of Cover */}
                  <TableCell className="py-2.5 text-right">
                    {daysOfCover !== null && daysOfCover > 0 ? (
                      <span className={`text-xs tabular-nums ${daysOfCover < 3 ? "text-red-600 font-semibold" : daysOfCover < 7 ? "text-amber-600" : "text-muted-foreground"}`} data-testid={`days-cover-${item.id}`}>
                        ~{daysOfCover}d
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2.5">
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </TableCell>
                </TableRow>
                {isExpanded && (
                  <TableRow><TableCell colSpan={9} className="p-0">
                    <ExpandedStockDetail item={item} navigate={navigate} />
                  </TableCell></TableRow>
                )}
                </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Footer summary */}
      {filtered.length > 0 && (
        <p className="text-[10px] text-muted-foreground mt-2" data-testid="inventory-count-label">
          Showing {filtered.length} of {totalItems} items
          {lowStockCount > 0 && ` — ${lowStockCount} below threshold`}
        </p>
      )}

      {/* Hierarchy Store Heatmap */}
      {showHierarchy && hierarchySummary?.by_store && hierarchySummary.by_store.length > 0 && (
        <div data-testid="store-heatmap" className="mt-6">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Store className="h-4 w-4 text-slate-500" />
            Store Stock Health
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...hierarchySummary.by_store]
              .sort((a, b) => {
                const ratioA = a.stock_rows > 0 ? a.low_stock_rows / a.stock_rows : 0;
                const ratioB = b.stock_rows > 0 ? b.low_stock_rows / b.stock_rows : 0;
                return ratioB - ratioA;
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

      {/* Hierarchy loading skeleton */}
      {showHierarchy && loading && !hierarchySummary && (
        <div className="mt-6">
          <LoadingState lines={3} />
        </div>
      )}
    </div>
  );
}

function StoreHeatmapCard({ store, onClick }) {
  const ratio = store.stock_rows > 0
    ? Math.round((store.low_stock_rows / store.stock_rows) * 100)
    : 0;
  const isHealthy = ratio === 0;
  const isCritical = ratio > 50;

  return (
    <Card
      data-testid={`heatmap-card-${store.restaurant_id}`}
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between mb-2">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{store.name}</p>
            <p className="text-[10px] text-muted-foreground">
              {mapRestaurantType(store.restaurant_type_flag)}
            </p>
          </div>
          <Badge
            variant="outline"
            className={`text-[10px] shrink-0 ml-2 ${
              isHealthy
                ? "text-emerald-700 border-emerald-200 bg-emerald-50"
                : isCritical
                ? "text-red-700 border-red-200 bg-red-50"
                : "text-amber-700 border-amber-200 bg-amber-50"
            }`}
          >
            {store.low_stock_rows}/{store.stock_rows}
          </Badge>
        </div>
        <Progress value={ratio} className="h-1.5" />
        <p className={`text-[10px] mt-1 ${isCritical ? "text-red-700 font-semibold" : isHealthy ? "text-emerald-700" : "text-muted-foreground"}`}>
          {store.low_stock_rows > 0
            ? `${store.low_stock_rows} low stock`
            : "All stocked"}
        </p>
      </CardContent>
    </Card>
  );
}


function ExpandedStockDetail({ item, navigate }) {
  const segments = item.segments_preview || [];
  const consumption = item.consumption_summary || {};
  const dateRangeDays = consumption.from_date && consumption.to_date
    ? Math.max(1, Math.ceil((new Date(consumption.to_date) - new Date(consumption.from_date)) / 86400000))
    : 7;
  const dailyRate = consumption.total_consumed_cal > 0 ? consumption.total_consumed_cal / dateRangeDays : 0;
  const calQty = Number(item.cal_quantity || 0);
  const daysOfCover = dailyRate > 0 ? Math.round(calQty / dailyRate) : null;

  return (
    <div className="py-4 px-5 bg-muted/20 border-t border-border" data-testid={`stock-expanded-${item.id}`}>
      <div className="grid grid-cols-3 gap-5">
        {/* FEFO Segments */}
        <div>
          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">FEFO Segments</h4>
          {segments.length === 0 ? (
            <p className="text-xs text-muted-foreground">No segments</p>
          ) : (
            <div className="space-y-1.5">
              {segments.slice(0, 5).map((seg, idx) => {
                const daysLeft = seg.expiry_date ? Math.ceil((new Date(seg.expiry_date + "T23:59:59") - new Date()) / 86400000) : null;
                const isExpired = daysLeft !== null && daysLeft < 0;
                const isNearExpiry = daysLeft !== null && daysLeft >= 0 && daysLeft < 14;
                return (
                  <div key={seg.segment_id || idx} className={`flex items-center justify-between text-[10px] p-1.5 rounded ${isExpired ? "bg-red-50 line-through text-red-400" : isNearExpiry ? "bg-amber-50" : "bg-muted/30"}`}>
                    <span className="font-mono">{seg.batch || "—"}</span>
                    <span>{seg.expiry_date || "No exp"}{isNearExpiry && !isExpired ? ` (${daysLeft}d)` : ""}</span>
                    <span className="tabular-nums font-semibold">{Number(seg.display_qty || seg.cal_quantity || 0).toFixed(1)} {item.display_unit}</span>
                    {seg.unit_cost > 0 && <span className="text-muted-foreground">₹{Number(seg.unit_cost).toFixed(2)}</span>}
                  </div>
                );
              })}
              {segments.length > 5 && (
                <button className="text-[10px] text-primary underline" onClick={() => navigate(`/inventory/${item.id}`)}>+{segments.length - 5} more → Full Detail</button>
              )}
            </div>
          )}
        </div>

        {/* Consumption */}
        <div>
          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Consumption</h4>
          <div className="space-y-2 text-xs">
            <div><span className="text-[10px] text-muted-foreground block">Daily Rate</span><span className="font-semibold tabular-nums">{dailyRate > 0 ? `${dailyRate.toFixed(1)} ${item.display_unit}/day` : "—"}</span></div>
            <div><span className="text-[10px] text-muted-foreground block">7-Day Total</span><span className="font-semibold tabular-nums">{consumption.total_consumed_cal > 0 ? `${Number(consumption.total_consumed_cal).toFixed(1)} ${item.display_unit}` : "—"}</span></div>
            <div>
              <span className="text-[10px] text-muted-foreground block">Days of Cover</span>
              <span className={`font-semibold tabular-nums ${daysOfCover !== null ? (daysOfCover < 3 ? "text-red-600" : daysOfCover < 14 ? "text-amber-600" : "text-emerald-600") : ""}`}>
                {daysOfCover !== null ? `${daysOfCover} days` : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Quick Actions</h4>
          <div className="space-y-1.5">
            <Button variant="outline" size="sm" className="w-full h-7 text-xs justify-start gap-2" onClick={() => navigate(`/wastage/new?item=${item.id}`)} data-testid={`action-wastage-${item.id}`}>
              Record Wastage
            </Button>
            <Button variant="outline" size="sm" className="w-full h-7 text-xs justify-start gap-2" onClick={() => navigate(`/dispatch/new?item=${item.id}`)} data-testid={`action-dispatch-${item.id}`}>
              Dispatch
            </Button>
            <Button variant="outline" size="sm" className="w-full h-7 text-xs justify-start gap-2 text-primary" onClick={() => navigate(`/inventory/${item.id}`)} data-testid={`action-full-detail-${item.id}`}>
              View Full Detail →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
