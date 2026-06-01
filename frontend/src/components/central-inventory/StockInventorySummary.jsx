import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useStockInventory } from "@/hooks/useStockInventory";
import { useLoginContext } from "@/hooks/useLoginContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  ChevronRight,
  Download,
  Timer,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/StateDisplays";
import { formatPO } from "@/lib/formatters";

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
  const { userLevelLabel, restaurantId } = useLoginContext();
  const {
    stocks,
    loading,
    error,
    refresh,
    lastFetched,
    isStale,
    totalItems,
    lowStockCount,
    categoryCounts,
  } = useStockInventory();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortField, setSortField] = useState("low_stock_first");
  const [refreshing, setRefreshing] = useState(false);

  const categories = useMemo(() => Object.keys(categoryCounts).sort(), [categoryCounts]);

  const filtered = useMemo(() => {
    let items = [...stocks];

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
  }, [stocks, search, categoryFilter, sortField]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  if (loading && stocks.length === 0) {
    return (
      <div data-testid="stock-inventory-page">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} data-testid="back-to-hub">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </div>
        <h1 className="text-lg font-bold mb-4" data-testid="stock-inventory-title">Stock Inventory</h1>
        <LoadingState lines={5} />
      </div>
    );
  }

  if (error && stocks.length === 0) {
    return (
      <div data-testid="stock-inventory-page">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} data-testid="back-to-hub">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </div>
        <h1 className="text-lg font-bold mb-4" data-testid="stock-inventory-title">Stock Inventory</h1>
        <ErrorState message={error} onRetry={refresh} />
      </div>
    );
  }

  return (
    <div data-testid="stock-inventory-page">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} data-testid="back-to-hub">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold" data-testid="stock-inventory-title">Stock Inventory</h1>
          <p className="text-xs text-muted-foreground">
            {userLevelLabel} — Store #{restaurantId}
          </p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <Card data-testid="kpi-total-items">
          <CardContent className="py-4 px-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              <Package className="h-5 w-5 text-slate-600" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold">{totalItems}</p>
              <p className="text-xs text-muted-foreground">Total Items</p>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="kpi-low-stock" className={lowStockCount > 0 ? "border-red-200 bg-red-50/30" : ""}>
          <CardContent className="py-4 px-4 flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${lowStockCount > 0 ? "bg-red-100" : "bg-emerald-50"}`}>
              {lowStockCount > 0 ? (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              )}
            </div>
            <div className="min-w-0">
              <p className={`text-2xl font-bold ${lowStockCount > 0 ? "text-red-700" : ""}`}>
                {lowStockCount}
              </p>
              <p className="text-xs text-muted-foreground">
                {lowStockCount > 0 ? "Low Stock Items" : "All Stocked"}
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
      </div>

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
                const daysOfCover = item.min_qty_alert > 0 && item.display_qty > 0
                  ? Math.max(0, Math.round((item.display_qty / item.min_qty_alert) * 7))
                  : null;
                return (
                <TableRow
                  key={item.id}
                  data-testid={`inventory-row-${item.id}`}
                  className={`cursor-pointer transition-colors hover:bg-accent/50 ${item.is_low_stock ? "bg-red-50/40" : ""}`}
                  onClick={() => navigate(`/inventory/${item.id}`)}
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
                  {/* Expiry Risk */}
                  <TableCell className="py-2.5 text-center">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground" data-testid={`expiry-risk-${item.id}`}>
                      View detail
                    </span>
                  </TableCell>
                  {/* Pending In/Out */}
                  <TableCell className="py-2.5 text-center">
                    <span className="text-[10px] text-muted-foreground" data-testid={`pending-${item.id}`}>—</span>
                  </TableCell>
                  {/* Days of Cover */}
                  <TableCell className="py-2.5 text-right">
                    {daysOfCover !== null ? (
                      <span className={`text-xs tabular-nums ${daysOfCover < 3 ? "text-red-600 font-semibold" : daysOfCover < 7 ? "text-amber-600" : "text-muted-foreground"}`} data-testid={`days-cover-${item.id}`}>
                        ~{daysOfCover}d
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2.5">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
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
    </div>
  );
}
