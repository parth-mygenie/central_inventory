import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLoginContext } from "@/hooks/useLoginContext";
import api from "@/services/api";
import { formatTimestamp } from "@/lib/formatters";
import DateRangePicker from "@/components/common/DateRangePicker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { LoadingState, EmptyState, ErrorState } from "@/components/common/StateDisplays";
import {
  ArrowLeft,
  FileText,
  TrendingDown,
  Layers,
  FlaskConical,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  RefreshCw,
  ClipboardList,
} from "lucide-react";
import { format } from "date-fns";

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function SourceTypeBadge({ sourceType }) {
  if (!sourceType) return <span className="text-muted-foreground text-[10px] italic">legacy</span>;
  const map = {
    hierarchy_wastage: { label: "Hierarchy", cls: "bg-blue-50 text-blue-700 border-blue-200" },
    physical_count: { label: "Physical Count", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    sub_recipe_count: { label: "Sub-Recipe", cls: "bg-violet-50 text-violet-700 border-violet-200" },
  };
  const cfg = map[sourceType] || { label: sourceType, cls: "bg-muted text-muted-foreground border-border" };
  return (
    <span
      data-testid={`source-type-badge-${sourceType}`}
      className={`inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded border ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
}

function WasteTypeBadge({ wasteType }) {
  if (wasteType === "Loss") {
    return (
      <Badge
        data-testid="waste-type-loss"
        variant="destructive"
        className="text-[10px] px-1.5 py-0"
      >
        Loss
      </Badge>
    );
  }
  if (wasteType === "Gain") {
    return (
      <Badge
        data-testid="waste-type-gain"
        variant="outline"
        className="text-[10px] px-1.5 py-0 text-emerald-700 border-emerald-200 bg-emerald-50"
      >
        Gain
      </Badge>
    );
  }
  return <span className="text-[10px] text-muted-foreground">{wasteType || "—"}</span>;
}

function AllocationRow({ entry }) {
  const [open, setOpen] = useState(false);
  const allocations = entry.segment_allocations || [];
  const hasAlloc = allocations.length > 0;

  if (!hasAlloc) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 px-1.5 text-[10px] gap-1"
          data-testid={`expand-alloc-${entry.wastage_id}`}
        >
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {allocations.length} alloc
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 space-y-1">
          {allocations.map((a, i) => (
            <div
              key={i}
              className="text-[10px] text-muted-foreground flex items-center gap-3 pl-1"
              data-testid={`alloc-detail-${entry.wastage_id}-${i}`}
            >
              <span className="font-medium text-foreground">{a.batch || "untracked"}</span>
              <span>Seg #{a.segment_id}</span>
              <span className="tabular-nums">{Number(a.qty_cal).toLocaleString()} cal</span>
              {a.expiry_date && <span>(exp {formatDate(a.expiry_date)})</span>}
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function WastageReport() {
  const navigate = useNavigate();
  const { restaurantId, isTopLevel, isMiddleLevel } = useLoginContext();

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [wasteTypeFilter, setWasteTypeFilter] = useState("all");
  const [hasBatchOnly, setHasBatchOnly] = useState(false);

  const getRestaurantIds = useCallback(() => {
    return [restaurantId];
  }, [restaurantId]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        restaurantIds: getRestaurantIds(),
      };
      if (dateRange?.from) params.fromDate = format(dateRange.from, "yyyy-MM-dd");
      if (dateRange?.to) params.toDate = format(dateRange.to, "yyyy-MM-dd");
      if (wasteTypeFilter !== "all") params.wasteType = wasteTypeFilter;
      if (hasBatchOnly) params.hasBatch = true;

      const resp = await api.getWastageReport(params);
      setReportData(resp.data);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load wastage report");
    } finally {
      setLoading(false);
    }
  }, [getRestaurantIds, dateRange, wasteTypeFilter, hasBatchOnly]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const entries = useMemo(() => reportData?.wastage_records || [], [reportData]);
  const summary = reportData?.summary || {};

  const batchAuditedCount = useMemo(
    () => entries.filter((e) => e.segment_allocations && e.segment_allocations.length > 0).length,
    [entries]
  );
  const physicalCountCount = useMemo(
    () => entries.filter((e) => e.source_type === "physical_count").length,
    [entries]
  );

  return (
    <div data-testid="wastage-report">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors"
        data-testid="wastage-report-back-button"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold" data-testid="wastage-report-title">Wastage Report</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchReport}
            disabled={loading}
            className="h-8 text-xs"
            data-testid="refresh-report-btn"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
        </div>
      </div>

      {/* KPI Cards */}
      {reportData && !loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5" data-testid="wastage-kpi-section">
          <Card data-testid="kpi-total-records">
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <ClipboardList className="h-4 w-4 text-slate-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold tabular-nums">{summary.total_records || 0}</p>
                <p className="text-[10px] text-muted-foreground">Total Records</p>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="kpi-total-wastage" className={summary.net_wastage > 0 ? "border-red-200 bg-red-50/30" : ""}>
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${summary.net_wastage > 0 ? "bg-red-100" : "bg-emerald-50"}`}>
                <TrendingDown className={`h-4 w-4 ${summary.net_wastage > 0 ? "text-red-600" : "text-emerald-600"}`} />
              </div>
              <div className="min-w-0">
                <p className={`text-xl font-bold tabular-nums ${summary.net_wastage > 0 ? "text-red-700" : ""}`}>
                  {Number(summary.net_wastage || 0).toFixed(2)}
                </p>
                <p className="text-[10px] text-muted-foreground">Net Wastage</p>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="kpi-batch-audited">
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <Layers className="h-4 w-4 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold tabular-nums">{batchAuditedCount}</p>
                <p className="text-[10px] text-muted-foreground">Batch Audited</p>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="kpi-physical-count">
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                <FlaskConical className="h-4 w-4 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold tabular-nums">{physicalCountCount}</p>
                <p className="text-[10px] text-muted-foreground">Physical Count</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters row */}
      <div className="flex items-center gap-3 mb-4 flex-wrap" data-testid="wastage-filters">
        <Select value={wasteTypeFilter} onValueChange={setWasteTypeFilter}>
          <SelectTrigger data-testid="waste-type-filter" className="w-36 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Loss">Loss</SelectItem>
            <SelectItem value="Gain">Gain</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Switch
            id="batch-toggle"
            checked={hasBatchOnly}
            onCheckedChange={setHasBatchOnly}
            data-testid="has-batch-toggle"
          />
          <Label htmlFor="batch-toggle" className="text-xs cursor-pointer">
            Batch audited only
          </Label>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingState lines={5} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchReport} />
      ) : entries.length === 0 ? (
        <EmptyState
          title={hasBatchOnly ? "No batch-audited wastage" : "No wastage entries found"}
          description={
            hasBatchOnly
              ? "No wastage records with FEFO batch audit exist for this range."
              : dateRange?.from
                ? "Try adjusting the date range or filters."
                : "No wastage has been recorded yet."
          }
          icon={FileText}
        />
      ) : (
        <Card>
          <CardHeader className="py-2.5 px-4">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
              {entries.length} {entries.length === 1 ? "entry" : "entries"}
              {hasBatchOnly && " (batch audited)"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px]">Date</TableHead>
                    <TableHead className="text-[10px]">Item</TableHead>
                    <TableHead className="text-[10px]">Type</TableHead>
                    <TableHead className="text-[10px] text-right">Quantity</TableHead>
                    <TableHead className="text-[10px]">Unit</TableHead>
                    <TableHead className="text-[10px]">Reason</TableHead>
                    <TableHead className="text-[10px]">Batch</TableHead>
                    <TableHead className="text-[10px]">Expiry</TableHead>
                    <TableHead className="text-[10px]">Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry, idx) => {
                    const hasAlloc = entry.segment_allocations && entry.segment_allocations.length > 0;
                    return (
                      <TableRow
                        key={entry.wastage_id || idx}
                        data-testid={`wastage-report-row-${idx}`}
                        className={hasAlloc ? "bg-blue-50/30" : ""}
                      >
                        <TableCell className="text-xs whitespace-nowrap py-2.5">
                          {formatTimestamp(entry.waste_date || entry.created_at)}
                        </TableCell>
                        <TableCell className="text-xs font-medium py-2.5">
                          {entry.item_name || "—"}
                          {entry.item_type && (
                            <span className="ml-1 text-[10px] text-muted-foreground">({entry.item_type})</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2.5">
                          <WasteTypeBadge wasteType={entry.waste_type} />
                        </TableCell>
                        <TableCell className="text-xs text-right tabular-nums py-2.5" data-testid={`wastage-qty-${idx}`}>
                          {entry.wastage_quantity ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs py-2.5">
                          {entry.unit || "—"}
                        </TableCell>
                        <TableCell className="text-xs py-2.5" data-testid={`wastage-reason-${idx}`}>
                          {entry.waste_reason || "—"}
                        </TableCell>
                        <TableCell className="py-2.5">
                          {entry.batch ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-medium" data-testid={`wastage-batch-${idx}`}>
                                {entry.batch}
                              </span>
                              <AllocationRow entry={entry} />
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs py-2.5">
                          {entry.expiry_date ? formatDate(entry.expiry_date) : "—"}
                        </TableCell>
                        <TableCell className="py-2.5">
                          <SourceTypeBadge sourceType={entry.source_type} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary footer */}
      {reportData && !loading && entries.length > 0 && (
        <div className="mt-3 flex items-center gap-4 text-[10px] text-muted-foreground" data-testid="wastage-report-footer">
          <span>Loss: {Number(summary.total_loss || 0).toFixed(2)}</span>
          <span>Gain: {Number(summary.total_gain || 0).toFixed(2)}</span>
          {summary.applied_restaurant_ids?.length > 0 && (
            <span>Stores: {summary.applied_restaurant_ids.length}</span>
          )}
        </div>
      )}
    </div>
  );
}
