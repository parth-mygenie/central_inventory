import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useStockDetail } from "@/hooks/useStockDetail";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  ArrowLeft,
  Package,
  AlertTriangle,
  CheckCircle2,
  Layers,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Clock,
  ShieldAlert,
  RefreshCw,
} from "lucide-react";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/StateDisplays";

// ── Helpers ─────────────────────────────────────────────────────

function daysUntilExpiry(expiryDateStr) {
  if (!expiryDateStr) return null;
  const expiry = new Date(expiryDateStr + "T23:59:59");
  const now = new Date();
  return Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
}

function ExpiryBadge({ expiryDate }) {
  if (!expiryDate) {
    return (
      <span
        data-testid="expiry-badge-none"
        className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
      >
        No expiry
      </span>
    );
  }
  const days = daysUntilExpiry(expiryDate);
  if (days < 0) {
    return (
      <span
        data-testid="expiry-badge-expired"
        className="text-[10px] font-bold text-white bg-red-600 px-1.5 py-0.5 rounded"
      >
        EXPIRED
      </span>
    );
  }
  if (days <= 7) {
    return (
      <span
        data-testid="expiry-badge-critical"
        className="text-[10px] font-semibold text-red-700 bg-red-100 px-1.5 py-0.5 rounded"
      >
        {days}d left!
      </span>
    );
  }
  if (days <= 30) {
    return (
      <span
        data-testid="expiry-badge-warning"
        className="text-[10px] font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded"
      >
        {days}d left
      </span>
    );
  }
  return (
    <span
      data-testid="expiry-badge-healthy"
      className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded"
    >
      {days}d left
    </span>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateShort(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function getDefaultDates() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 7);
  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
}

// ── Section A: Item Summary ─────────────────────────────────────

function ItemSummarySection({ summary }) {
  if (!summary) return null;
  return (
    <Card data-testid="stock-detail-summary">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="h-4 w-4 text-slate-500" />
          Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ingredient</p>
            <p className="text-sm font-semibold" data-testid="detail-stock-title">{summary.stock_title}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Current Stock</p>
            <p className="text-sm font-semibold tabular-nums" data-testid="detail-display-qty">
              {summary.display_qty} {summary.display_unit}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Unit</p>
            <p className="text-sm" data-testid="detail-unit">{summary.unit || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Category</p>
            <p className="text-sm" data-testid="detail-category">{summary.category_name || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Min Alert</p>
            <p className="text-sm tabular-nums">{summary.min_qty_alert} {summary.min_unit_alert}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</p>
            {summary.is_low_stock ? (
              <Badge
                data-testid="detail-low-stock-badge"
                variant="destructive"
                className="text-[10px] px-1.5 py-0"
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                Low Stock
              </Badge>
            ) : (
              <Badge
                data-testid="detail-ok-stock-badge"
                variant="outline"
                className="text-[10px] px-1.5 py-0 text-emerald-700 border-emerald-200 bg-emerald-50"
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                In Stock
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Section B: Batch Inventory (FEFO Segments) ──────────────────

function BatchInventorySection({ segments, displayUnit }) {
  return (
    <Card data-testid="stock-detail-batches">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Layers className="h-4 w-4 text-slate-500" />
          Batch Inventory
          {segments.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground">({segments.length})</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {segments.length === 0 ? (
          <EmptyState
            title="No batches"
            description="No FEFO batch segments exist for this item."
            icon={Layers}
          />
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Batch</TableHead>
                  <TableHead className="text-xs text-right">Available Qty</TableHead>
                  <TableHead className="text-xs text-right">Display Qty</TableHead>
                  <TableHead className="text-xs">Expiry Date</TableHead>
                  <TableHead className="text-xs">Source Store</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {segments.map((seg, i) => {
                  const days = daysUntilExpiry(seg.expiry_date);
                  const isExpired = days !== null && days < 0;
                  const isExpiring = days !== null && days >= 0 && days <= 7;
                  let rowClass = "";
                  if (isExpired) rowClass = "bg-red-50/60";
                  else if (isExpiring) rowClass = "bg-amber-50/40";

                  return (
                    <TableRow
                      key={seg.segment_id || i}
                      data-testid={`batch-row-${seg.segment_id || i}`}
                      className={rowClass}
                    >
                      <TableCell className="py-2.5">
                        <span className="text-sm font-medium" data-testid={`batch-name-${seg.segment_id || i}`}>
                          {seg.batch || (
                            <span className="text-muted-foreground italic">Legacy (untracked)</span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5 text-right">
                        <span className="text-sm tabular-nums" data-testid={`batch-cal-qty-${seg.segment_id || i}`}>
                          {Number(seg.cal_quantity).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5 text-right">
                        <span className="text-sm tabular-nums" data-testid={`batch-display-qty-${seg.segment_id || i}`}>
                          {Number(seg.display_qty)} {displayUnit}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs">{formatDate(seg.expiry_date)}</span>
                          <ExpiryBadge expiryDate={seg.expiry_date} />
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5">
                        {seg.source_restaurant_id ? (
                          <span
                            className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded"
                            data-testid={`batch-source-${seg.segment_id || i}`}
                          >
                            Store #{seg.source_restaurant_id}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Section C: Reconciliation ───────────────────────────────────

function ReconciliationSection({ reconciliation }) {
  if (!reconciliation) return null;

  const agg = reconciliation.aggregate_cal_quantity ?? 0;
  const segTotal = reconciliation.segment_total_cal_quantity ?? 0;
  const unseg = reconciliation.unsegmented_remainder_cal ?? 0;
  const diff = agg - segTotal;
  const hasMismatch = Math.abs(diff) > 0.01;

  return (
    <Card data-testid="stock-detail-reconciliation">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-slate-500" />
          Reconciliation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Aggregate Quantity</p>
            <p className="text-lg font-bold tabular-nums" data-testid="recon-aggregate">{Number(agg).toLocaleString()}</p>
          </div>
          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Segment Total</p>
            <p className="text-lg font-bold tabular-nums" data-testid="recon-segment-total">{Number(segTotal).toLocaleString()}</p>
          </div>
          <div className={`text-center p-3 rounded-lg ${hasMismatch ? "bg-red-50 border border-red-200" : "bg-emerald-50"}`}>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Difference</p>
            <p
              className={`text-lg font-bold tabular-nums ${hasMismatch ? "text-red-700" : "text-emerald-700"}`}
              data-testid="recon-difference"
            >
              {hasMismatch ? Number(diff).toLocaleString() : "0"}
            </p>
          </div>
        </div>

        {hasMismatch && (
          <div
            data-testid="recon-mismatch-warning"
            className="mt-3 flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              Quantity mismatch detected: aggregate ({Number(agg).toLocaleString()}) differs from segment total ({Number(segTotal).toLocaleString()}) by {Number(Math.abs(diff)).toLocaleString()}.
              {unseg > 0 && ` Unsegmented remainder: ${Number(unseg).toLocaleString()}.`}
            </span>
          </div>
        )}

        {!hasMismatch && (
          <div
            data-testid="recon-balanced"
            className="mt-3 flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Balanced — aggregate and segment totals match.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Section D: Consumption History ──────────────────────────────

function ConsumptionLineRow({ line, displayUnit }) {
  const [open, setOpen] = useState(false);
  const allocations = line.segment_allocations || [];
  const hasAllocations = allocations.length > 0;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <TableRow data-testid={`consumption-row-${line.order_id}`}>
        <TableCell className="py-2.5">
          <span className="text-xs">{formatDateShort(line.consumption_date)}</span>
        </TableCell>
        <TableCell className="py-2.5">
          <span className="text-sm">{line.food_item || "—"}</span>
          {line.addon_id && (
            <span className="ml-1 text-[10px] text-muted-foreground">(addon)</span>
          )}
        </TableCell>
        <TableCell className="py-2.5 text-right">
          <span className="text-sm tabular-nums">
            {Number(line.quantity_deducted_cal).toLocaleString()}
          </span>
        </TableCell>
        <TableCell className="py-2.5">
          {hasAllocations ? (
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px]"
                data-testid={`expand-alloc-${line.order_id}`}
              >
                {open ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
                {allocations.length} batch{allocations.length > 1 ? "es" : ""}
              </Button>
            </CollapsibleTrigger>
          ) : (
            <span className="text-[10px] text-muted-foreground italic">— (legacy)</span>
          )}
        </TableCell>
      </TableRow>
      {hasAllocations && (
        <CollapsibleContent asChild>
          <TableRow className="bg-slate-50/60" data-testid={`alloc-detail-${line.order_id}`}>
            <TableCell colSpan={4} className="py-2 px-4">
              <div className="space-y-1.5">
                {allocations.map((a, ai) => (
                  <div
                    key={ai}
                    className="flex items-center gap-4 text-[11px] text-muted-foreground"
                    data-testid={`alloc-item-${line.order_id}-${ai}`}
                  >
                    <span className="font-medium text-foreground">{a.batch || "untracked"}</span>
                    <span>Seg #{a.segment_id}</span>
                    <span className="tabular-nums">{Number(a.qty_cal).toLocaleString()} deducted</span>
                    {a.expiry_date && <span className="text-muted-foreground">(exp {formatDate(a.expiry_date)})</span>}
                  </div>
                ))}
              </div>
            </TableCell>
          </TableRow>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

function ConsumptionSection({ consumptionSummary, consumptionLines, displayUnit, onRefetch }) {
  const [dateFrom, setDateFrom] = useState(() => getDefaultDates().from);
  const [dateTo, setDateTo] = useState(() => getDefaultDates().to);

  const handleDateChange = () => {
    onRefetch({ consumptionFrom: dateFrom, consumptionTo: dateTo });
  };

  return (
    <Card data-testid="stock-detail-consumption">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-slate-500" />
            Consumption History
          </CardTitle>
          {consumptionSummary && (
            <span className="text-xs text-muted-foreground" data-testid="consumption-total">
              Total consumed: {Number(consumptionSummary.total_consumed_cal || 0).toLocaleString()}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Date filter */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] text-muted-foreground">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="text-xs border rounded px-2 py-1 bg-background"
              data-testid="consumption-date-from"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] text-muted-foreground">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="text-xs border rounded px-2 py-1 bg-background"
              data-testid="consumption-date-to"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={handleDateChange}
            data-testid="consumption-filter-btn"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Apply
          </Button>
        </div>

        {consumptionSummary && (
          <p className="text-[10px] text-muted-foreground mb-3" data-testid="consumption-date-range">
            Period: {formatDate(consumptionSummary.from_date)} — {formatDate(consumptionSummary.to_date)}
          </p>
        )}

        {consumptionLines.length === 0 ? (
          <EmptyState
            title="No consumption"
            description="No consumption events found in the selected period."
            icon={BarChart3}
          />
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Food Item</TableHead>
                  <TableHead className="text-xs text-right">Qty Consumed</TableHead>
                  <TableHead className="text-xs">Allocation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consumptionLines.map((line, i) => (
                  <ConsumptionLineRow
                    key={`${line.order_id}-${i}`}
                    line={line}
                    displayUnit={displayUnit}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {consumptionLines.length >= 50 && (
          <p className="text-[10px] text-amber-600 mt-2">
            Showing up to 50 consumption lines. Narrow your date range for more specific results.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Component ──────────────────────────────────────────────

export default function StockDetailPanel() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    summary,
    segments,
    reconciliation,
    consumptionSummary,
    consumptionLines,
    loading,
    error,
    fetch,
  } = useStockDetail(id);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const handleRefetch = (dateParams) => {
    fetch(dateParams);
  };

  const displayUnit = summary?.display_unit || "";

  return (
    <div data-testid="stock-detail-page">
      {/* Back button */}
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/inventory")}
          data-testid="back-to-inventory"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Inventory
        </Button>
      </div>

      {/* Page title */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold" data-testid="stock-detail-title">
            {summary?.stock_title || "Stock Detail"}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">FEFO Batch Detail</span>
            <span className="text-[10px] text-muted-foreground">ID: {id}</span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetch()}
          disabled={loading}
          data-testid="refresh-detail-btn"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Loading */}
      {loading && !summary && <LoadingState lines={6} />}

      {/* Error */}
      {error && !summary && <ErrorState message={error} onRetry={() => fetch()} />}

      {/* Content sections */}
      {summary && (
        <div className="space-y-4">
          <ItemSummarySection summary={summary} />
          <BatchInventorySection segments={segments} displayUnit={displayUnit} />
          <ReconciliationSection reconciliation={reconciliation} />
          <ConsumptionSection
            consumptionSummary={consumptionSummary}
            consumptionLines={consumptionLines}
            displayUnit={displayUnit}
            onRefetch={handleRefetch}
          />
        </div>
      )}

      {/* Read-only notice */}
      <div className="mt-6 flex items-center gap-2 text-[10px] text-muted-foreground" data-testid="read-only-notice">
        <Clock className="h-3 w-3" />
        Read-only view — operational visibility only. No stock mutations.
      </div>
    </div>
  );
}
