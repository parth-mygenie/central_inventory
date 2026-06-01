import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLoginContext } from "@/hooks/useLoginContext";
import { useRestaurantMap } from "@/hooks/useRestaurantMap";
import api from "@/services/api";
import { mapRestaurantType, STATUS_CONFIG, getStatusConfig, TYPE_LABELS } from "@/lib/terminology";
import { formatTimestamp, formatItemsCount, formatPO } from "@/lib/formatters";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/StateDisplays";
import { StatusBadge, StoreTypeBadge } from "@/components/common/Badges";
import DateRangePicker from "@/components/common/DateRangePicker";
import {
  ScrollText, History, ArrowDownLeft, ArrowUpRight, Minus,
  Search, X, Filter, Eye, ArrowRightLeft, RefreshCw, Download
} from "lucide-react";

const MOVEMENT_TYPES = {
  transfer_out: { label: "Transfer Out", color: "bg-red-100 text-red-700", icon: ArrowUpRight },
  transfer_in: { label: "Transfer In", color: "bg-emerald-100 text-emerald-700", icon: ArrowDownLeft },
  partial_receive: { label: "Partial Receive", color: "bg-teal-100 text-teal-700", icon: ArrowDownLeft },
  reversal: { label: "Reversal (Restored)", color: "bg-amber-100 text-amber-700", icon: ArrowRightLeft },
  adjustment_increase: { label: "Adjustment (Increase)", color: "bg-blue-100 text-blue-700", icon: ArrowDownLeft },
  adjustment_decrease: { label: "Adjustment (Decrease)", color: "bg-orange-100 text-orange-700", icon: ArrowUpRight },
  wastage: { label: "Wastage", color: "bg-rose-100 text-rose-700", icon: ArrowUpRight },
};

const ALL_STATUSES = Object.keys(STATUS_CONFIG);

/**
 * Derive stock ledger entries from full transfer objects.
 * Each dispatched/received/partial/cancelled transfer produces 1-2 entries per line.
 *
 * P16 fix: Use actual dispatched/received quantities from meta_json and resolution_meta,
 * not the requested qty. Merge restaurant names from historyNameMap.
 */
function deriveLedgerEntries(transfers, actorRestaurantId, historyNameMap) {
  const entries = [];
  let entryId = 1;
  const nameMap = historyNameMap || {};

  for (const t of transfers) {
    const lines = t.lines || t.data?.lines || [];
    // P16: merge restaurant names from history list (details API lacks them)
    const fromName = t.from_restaurant?.restaurant_name || t.from_restaurant_name || nameMap[t.from_restaurant_id]?.name || (t.from_restaurant_type ? mapRestaurantType(t.from_restaurant_type) : `Store #${t.from_restaurant_id || "?"}`);
    const toName = t.to_restaurant?.restaurant_name || t.to_restaurant_name || nameMap[t.to_restaurant_id]?.name || (t.to_restaurant_type ? mapRestaurantType(t.to_restaurant_type) : `Store #${t.to_restaurant_id || "?"}`);
    const fromType = t.from_restaurant?.restaurant_type || t.from_restaurant_type || nameMap[t.from_restaurant_id]?.type || null;
    const toType = t.to_restaurant?.restaurant_type || t.to_restaurant_type || nameMap[t.to_restaurant_id]?.type || null;

    // P16: get header-level receive totals for partial receive qty
    const receiveTotals = t.resolution_meta?.receive_totals;

    for (const line of lines) {
      // P16: Use dispatched qty from meta_json, not requested qty
      const dispatchedQty = line.dispatchedDisplayTotal ?? line.quantity;
      // Skip lines that were never dispatched (on_hold / cancelled_remainder)
      const lineWasDispatched = line.dispatchedDisplayTotal != null ? line.dispatchedDisplayTotal > 0 : true;

      // Dispatched → source gets "Transfer Out"
      if (["dispatched", "received", "partially_received", "cancelled"].includes(t.status) && lineWasDispatched) {
        entries.push({
          id: `L-${entryId++}`,
          date: t.dispatched_at || t.created_at,
          store_id: t.from_restaurant_id,
          store_name: fromName,
          store_type: fromType,
          item: line.stock_title,
          movement_type: "transfer_out",
          direction: "out",
          quantity: dispatchedQty,
          unit: line.unit,
          before_qty: null,
          after_qty: null,
          reference_type: "Transfer",
          reference_id: t.id,
          counterparty_name: toName,
          counterparty_type: toType,
          reason: t.resolution_meta?.reason || null,
          actor_id: t.dispatched_by || t.requested_by || null,
          transfer_status: t.status,
        });
      }

      // Received → destination gets "Transfer In" (use actual received qty, not dispatched)
      if (t.status === "received" && lineWasDispatched) {
        // P16 fix: Use accepted_qty from line if available (actual received), else dispatched total
        const receivedQty = line.accepted_qty ?? receiveTotals?.accepted_qty ?? dispatchedQty;
        entries.push({
          id: `L-${entryId++}`,
          date: t.received_at || t.updated_at,
          store_id: t.to_restaurant_id,
          store_name: toName,
          store_type: toType,
          item: line.stock_title,
          movement_type: "transfer_in",
          direction: "in",
          quantity: receivedQty,
          unit: line.unit,
          before_qty: null,
          after_qty: null,
          reference_type: "Transfer",
          reference_id: t.id,
          counterparty_name: fromName,
          counterparty_type: fromType,
          reason: null,
          actor_id: t.received_by || null,
          transfer_status: t.status,
        });
      }

      // Partially received → destination gets partial entry
      // P16: use accepted qty from resolution_meta.receive_totals (header-level)
      if (t.status === "partially_received" && lineWasDispatched) {
        const acceptedQty = line.accepted_qty ?? receiveTotals?.accepted_qty ?? dispatchedQty;
        entries.push({
          id: `L-${entryId++}`,
          date: t.received_at || t.updated_at,
          store_id: t.to_restaurant_id,
          store_name: toName,
          store_type: toType,
          item: line.stock_title,
          movement_type: "partial_receive",
          direction: "in",
          quantity: acceptedQty,
          unit: line.unit,
          before_qty: null,
          after_qty: null,
          reference_type: "Transfer",
          reference_id: t.id,
          counterparty_name: fromName,
          counterparty_type: fromType,
          reason: line.resolution_type || t.resolution_meta?.reason || null,
          actor_id: t.received_by || null,
          transfer_status: t.status,
        });
      }

      // Cancelled post-dispatch → source gets reversal (stock restored)
      if (t.status === "cancelled" && t.dispatched_at && lineWasDispatched) {
        entries.push({
          id: `L-${entryId++}`,
          date: t.cancelled_at || t.updated_at,
          store_id: t.from_restaurant_id,
          store_name: fromName,
          store_type: fromType,
          item: line.stock_title,
          movement_type: "reversal",
          direction: "in",
          quantity: dispatchedQty,
          unit: line.unit,
          before_qty: null,
          after_qty: null,
          reference_type: "Transfer",
          reference_id: t.id,
          counterparty_name: toName,
          counterparty_type: toType,
          reason: t.resolution_meta?.reason || t.resolution_type || "Cancelled",
          actor_id: t.cancelled_by || null,
          transfer_status: t.status,
        });
      }
    }
  }

  // Sort by date descending
  entries.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return entries;
}

/**
 * Convert wastage report API entries into ledger-compatible rows.
 * Each wastage entry produces one "Out" movement.
 */
function deriveWastageEntries(wastageData) {
  return wastageData.map((w, idx) => ({
    id: `W-${idx + 1}`,
    date: w.waste_date || w.created_at || w.date || w.timestamp,
    store_id: w.restaurant_id || w.store_id || null,
    store_name: w.restaurant_name || w.store_name || "—",
    store_type: w.restaurant_type || w.store_type || null,
    item: w.stock_title || w.item_name || w.item || "—",
    movement_type: "wastage",
    direction: "out",
    quantity: w.wastage_quantity ?? w.quantity ?? w.cal_quantity ?? "—",
    unit: w.unit || "—",
    before_qty: null,
    after_qty: null,
    reference_type: "Wastage",
    reference_id: w.wastage_id || w.id || null,
    counterparty_name: null,
    counterparty_type: null,
    reason: w.waste_reason || w.reason || w.wastage_reason || null,
    actor_id: w.recorded_by || w.user_id || null,
    transfer_status: null,
  }));
}

export default function HistoryLedger() {
  const navigate = useNavigate();
  const { restaurantId, restaurantType, isTopLevel, isMiddleLevel, isBottomLevel } = useLoginContext();
  const { restaurantMap } = useRestaurantMap();

  const [activeTab, setActiveTab] = useState("history");

  // Transfer History state
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(null);

  // Stock Ledger state
  const [fullTransfers, setFullTransfers] = useState([]);
  const [wastageEntries, setWastageEntries] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerLoaded, setLedgerLoaded] = useState(false);
  const [ledgerError, setLedgerError] = useState(null);

  // Filters — shared
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [searchQuery, setSearchQuery] = useState("");

  // Transfer History filters
  const [statusFilter, setStatusFilter] = useState([]);
  const [directionFilter, setDirectionFilter] = useState("all");

  // Stock Ledger filters
  const [movementTypeFilter, setMovementTypeFilter] = useState([]);
  const [ledgerDirectionFilter, setLedgerDirectionFilter] = useState("all");
  const [ledgerSearch, setLedgerSearch] = useState("");

  // Fetch transfer history
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const resp = await api.getTransferHistory();
      const data = resp.data?.data || resp.data || [];
      setHistoryData(Array.isArray(data) ? data : []);
    } catch (err) {
      setHistoryError(err?.response?.data?.message || "Failed to load transfer history");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Fetch full transfer details + wastage data for ledger derivation (lazy)
  const fetchLedgerData = useCallback(async () => {
    if (ledgerLoaded || ledgerLoading) return;
    setLedgerLoading(true);
    setLedgerError(null);
    try {
      // Fetch transfer details
      const ids = historyData.map((t) => t.id).filter(Boolean);
      const results = await Promise.allSettled(
        ids.map((id) => api.getTransferDetails(id))
      );
      const transfers = results
        .filter((r) => r.status === "fulfilled")
        .map((r) => r.value?.data?.data || r.value?.data || {})
        .filter((t) => t.id || t.lines);
      setFullTransfers(transfers);

      // Fetch wastage data (best-effort — API may fail for non-Central roles)
      try {
        const wastageResp = await api.getWastageReport({ restaurantIds: [restaurantId] });
        const wData = wastageResp.data?.data || wastageResp.data || [];
        setWastageEntries(Array.isArray(wData) ? wData : []);
      } catch {
        // Wastage API may fail for some roles — not a blocking error
        setWastageEntries([]);
      }

      setLedgerLoaded(true);
    } catch (err) {
      setLedgerError("Failed to load stock ledger data");
    } finally {
      setLedgerLoading(false);
    }
  }, [historyData, ledgerLoaded, ledgerLoading, restaurantId]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // When user switches to ledger tab, lazy-load details
  useEffect(() => {
    if (activeTab === "ledger" && historyData.length > 0 && !ledgerLoaded) {
      fetchLedgerData();
    }
  }, [activeTab, historyData, ledgerLoaded, fetchLedgerData]);

  // Build restaurant name map from history data + restaurantMap hook
  const historyNameMap = useMemo(() => {
    const map = {};
    // Merge restaurantMap first (from hierarchy-summary)
    if (restaurantMap) {
      Object.entries(restaurantMap).forEach(([rid, info]) => {
        map[rid] = { name: info.name, type: info.type || null };
      });
    }
    // Overlay from history data (has names from transfer records)
    for (const t of historyData) {
      if (t.from_restaurant_id && t.from_restaurant_name) {
        map[t.from_restaurant_id] = { name: t.from_restaurant_name, type: t.from_restaurant_type || null };
      }
      if (t.to_restaurant_id && t.to_restaurant_name) {
        map[t.to_restaurant_id] = { name: t.to_restaurant_name, type: t.to_restaurant_type || null };
      }
    }
    return map;
  }, [historyData, restaurantMap]);

  // Derive ledger entries (transfers + wastage merged)
  const ledgerEntries = useMemo(() => {
    if (!ledgerLoaded) return [];
    const transferEntries = fullTransfers.length > 0 ? deriveLedgerEntries(fullTransfers, restaurantId, historyNameMap) : [];
    const wastageRows = wastageEntries.length > 0 ? deriveWastageEntries(wastageEntries) : [];
    const merged = [...transferEntries, ...wastageRows];
    merged.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return merged;
  }, [fullTransfers, wastageEntries, ledgerLoaded, restaurantId, historyNameMap]);

  // ── Filtered Transfer History ─────────────────────────
  const filteredHistory = useMemo(() => {
    let items = [...historyData];

    // Date range
    if (dateRange.from) {
      const from = new Date(dateRange.from).getTime();
      items = items.filter((t) => new Date(t.created_at).getTime() >= from);
    }
    if (dateRange.to) {
      const to = new Date(dateRange.to).setHours(23, 59, 59, 999);
      items = items.filter((t) => new Date(t.created_at).getTime() <= to);
    }

    // Status filter
    if (statusFilter.length > 0) {
      items = items.filter((t) => statusFilter.includes(t.status));
    }

    // Direction
    if (directionFilter === "incoming") {
      items = items.filter((t) => String(t.to_restaurant_id) === String(restaurantId));
    } else if (directionFilter === "outgoing") {
      items = items.filter((t) => String(t.from_restaurant_id) === String(restaurantId));
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter((t) =>
        String(t.id).includes(q) ||
        (t.from_restaurant_name || "").toLowerCase().includes(q) ||
        (t.to_restaurant_name || "").toLowerCase().includes(q)
      );
    }

    return items;
  }, [historyData, dateRange, statusFilter, directionFilter, searchQuery, restaurantId]);

  // ── Filtered Ledger ─────────────────────────
  const filteredLedger = useMemo(() => {
    let items = [...ledgerEntries];

    // Date range
    if (dateRange.from) {
      const from = new Date(dateRange.from).getTime();
      items = items.filter((e) => new Date(e.date).getTime() >= from);
    }
    if (dateRange.to) {
      const to = new Date(dateRange.to).setHours(23, 59, 59, 999);
      items = items.filter((e) => new Date(e.date).getTime() <= to);
    }

    // Movement type
    if (movementTypeFilter.length > 0) {
      items = items.filter((e) => movementTypeFilter.includes(e.movement_type));
    }

    // Direction
    if (ledgerDirectionFilter === "in") {
      items = items.filter((e) => e.direction === "in");
    } else if (ledgerDirectionFilter === "out") {
      items = items.filter((e) => e.direction === "out");
    }

    // Search
    if (ledgerSearch.trim()) {
      const q = ledgerSearch.toLowerCase().trim();
      items = items.filter((e) =>
        (e.item || "").toLowerCase().includes(q) ||
        String(e.reference_id).includes(q) ||
        (e.store_name || "").toLowerCase().includes(q)
      );
    }

    return items;
  }, [ledgerEntries, dateRange, movementTypeFilter, ledgerDirectionFilter, ledgerSearch]);

  const clearHistoryFilters = () => {
    setDateRange({ from: null, to: null });
    setStatusFilter([]);
    setDirectionFilter("all");
    setSearchQuery("");
  };

  const clearLedgerFilters = () => {
    setDateRange({ from: null, to: null });
    setMovementTypeFilter([]);
    setLedgerDirectionFilter("all");
    setLedgerSearch("");
  };

  const hasHistoryFilters = statusFilter.length > 0 || directionFilter !== "all" || searchQuery || dateRange.from;
  const hasLedgerFilters = movementTypeFilter.length > 0 || ledgerDirectionFilter !== "all" || ledgerSearch || dateRange.from;

  const getDirection = (t) => {
    if (String(t.to_restaurant_id) === String(restaurantId)) return "incoming";
    if (String(t.from_restaurant_id) === String(restaurantId)) return "outgoing";
    return "related";
  };

  const toggleStatus = (s) => {
    setStatusFilter((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  const toggleMovementType = (m) => {
    setMovementTypeFilter((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);
  };

  return (
    <div data-testid="history-ledger">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold">History & Ledger</h1>
        <div className="flex items-center gap-2">
          <button
            data-testid="export-csv-btn"
            onClick={() => {
              const rows = [["PO","Date","Source","Destination","Status","Type","Items","Direction"]];
              filteredHistory.forEach(t => {
                const dir = String(t.to_restaurant_id) === String(restaurantId) ? "In" : "Out";
                rows.push([formatPO(t.id), t.created_at, t.from_restaurant_name||"", t.to_restaurant_name||"", t.status, t.type, t.items_count||"", dir]);
              });
              const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url; a.download = "transfer_history.csv"; a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Download className="h-3 w-3" /> Export CSV
          </button>
          <button
            data-testid="refresh-history-btn"
            onClick={() => { fetchHistory(); setLedgerLoaded(false); }}
            disabled={historyLoading}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${historyLoading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="history-ledger-tabs" className="mb-4">
          <TabsTrigger data-testid="tab-transfer-history" value="history" className="gap-1.5">
            <History className="h-3.5 w-3.5" />
            Transfer History
            {historyData.length > 0 && (
              <span className="ml-1 bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded-full">
                {historyData.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger data-testid="tab-stock-ledger" value="ledger" className="gap-1.5">
            <ScrollText className="h-3.5 w-3.5" />
            Stock Ledger
            {ledgerEntries.length > 0 && (
              <span className="ml-1 bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded-full">
                {ledgerEntries.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ═══ TRANSFER HISTORY TAB ═══ */}
        <TabsContent value="history">
          {historyLoading ? (
            <LoadingState lines={6} />
          ) : historyError ? (
            <ErrorState message={historyError} onRetry={fetchHistory} />
          ) : (
            <>
              {/* Filters */}
              <div data-testid="history-filters" className="space-y-3 mb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <DateRangePicker value={dateRange} onChange={setDateRange} />
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      data-testid="history-search"
                      placeholder="Search ID or store..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-9 w-52 text-xs"
                    />
                  </div>
                  {/* Direction toggle */}
                  <div className="flex rounded-md border border-border overflow-hidden">
                    {[
                      { val: "all", label: "All" },
                      { val: "incoming", label: "Incoming" },
                      { val: "outgoing", label: "Outgoing" },
                    ].map((d) => (
                      <button
                        key={d.val}
                        data-testid={`direction-${d.val}`}
                        onClick={() => setDirectionFilter(d.val)}
                        className={`px-2.5 py-1.5 text-[10px] font-medium transition-colors ${
                          directionFilter === d.val
                            ? "bg-primary text-primary-foreground"
                            : "bg-background text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                  {hasHistoryFilters && (
                    <Button data-testid="clear-history-filters" variant="ghost" size="sm" onClick={clearHistoryFilters} className="h-8 text-xs gap-1">
                      <X className="h-3 w-3" /> Clear
                    </Button>
                  )}
                </div>
                {/* Status pills */}
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] text-muted-foreground mr-1 self-center"><Filter className="h-3 w-3 inline mr-0.5" />Status:</span>
                  {ALL_STATUSES.map((s) => {
                    const cfg = getStatusConfig(s);
                    const active = statusFilter.includes(s);
                    return (
                      <button
                        key={s}
                        data-testid={`status-filter-${s}`}
                        onClick={() => toggleStatus(s)}
                        className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                          active ? cfg.color + " border-current font-semibold" : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted"
                        }`}
                      >
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* History Table */}
              {filteredHistory.length === 0 ? (
                <EmptyState
                  title={hasHistoryFilters ? "No transfers match your filters" : "No transfer history"}
                  description={hasHistoryFilters ? "Try adjusting your date range or status filter." : "Transfer history will appear here once transfers are created."}
                />
              ) : (
                <Card>
                  <CardContent className="py-0 px-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-[10px]">PO / Ref</TableHead>
                            <TableHead className="text-[10px]">Date</TableHead>
                            <TableHead className="text-[10px]">Source</TableHead>
                            <TableHead className="text-[10px]">Destination</TableHead>
                            <TableHead className="text-[10px]">Status</TableHead>
                            <TableHead className="text-[10px]">Type</TableHead>
                            <TableHead className="text-[10px]">Items</TableHead>
                            <TableHead className="text-[10px]">Direction</TableHead>
                            <TableHead className="text-[10px]">Updated</TableHead>
                            <TableHead className="text-[10px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredHistory.map((t) => {
                            const dir = getDirection(t);
                            return (
                              <TableRow
                                key={t.id}
                                data-testid={`history-row-${t.id}`}
                                className="cursor-pointer hover:bg-accent/50"
                                onClick={() => navigate(`/transfer/${t.id}`)}
                              >
                                <TableCell className="text-xs font-mono font-medium">{formatPO(t.id)}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{formatTimestamp(t.created_at)}</TableCell>
                                <TableCell className="text-xs">{restaurantMap[String(t.from_restaurant_id)]?.name || t.from_restaurant_name || "—"}</TableCell>
                                <TableCell className="text-xs">{restaurantMap[String(t.to_restaurant_id)]?.name || t.to_restaurant_name || "—"}</TableCell>
                                <TableCell><StatusBadge status={t.status} /></TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={`text-[9px] font-normal ${t.type === "modification_request" ? "bg-amber-50 text-amber-700 border-amber-200" : ""}`}>
                                    {TYPE_LABELS[t.type] || t.type}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs tabular-nums">{formatItemsCount(t.items_count)}</TableCell>
                                <TableCell>
                                  {dir === "incoming" ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600"><ArrowDownLeft className="h-3 w-3" />In</span>
                                  ) : dir === "outgoing" ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-red-500"><ArrowUpRight className="h-3 w-3" />Out</span>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground">Related</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">{formatTimestamp(t.updated_at)}</TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" data-testid={`view-detail-${t.id}`}>
                                    <Eye className="h-3 w-3" /> View
                                  </Button>
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
              <p className="text-[10px] text-muted-foreground mt-2">
                Showing {filteredHistory.length} of {historyData.length} transfers
              </p>
            </>
          )}
        </TabsContent>

        {/* ═══ STOCK LEDGER TAB ═══ */}
        <TabsContent value="ledger">
          {ledgerLoading ? (
            <LoadingState lines={6} />
          ) : ledgerError ? (
            <ErrorState message={ledgerError} onRetry={() => { setLedgerLoaded(false); fetchLedgerData(); }} />
          ) : !ledgerLoaded ? (
            <LoadingState lines={4} />
          ) : (
            <>
              {/* Ledger Filters */}
              <div data-testid="ledger-filters" className="space-y-3 mb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <DateRangePicker value={dateRange} onChange={setDateRange} />
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      data-testid="ledger-search"
                      placeholder="Search item or store..."
                      value={ledgerSearch}
                      onChange={(e) => setLedgerSearch(e.target.value)}
                      className="pl-8 h-9 w-52 text-xs"
                    />
                  </div>
                  {/* Direction toggle */}
                  <div className="flex rounded-md border border-border overflow-hidden">
                    {[
                      { val: "all", label: "All" },
                      { val: "in", label: "In" },
                      { val: "out", label: "Out" },
                    ].map((d) => (
                      <button
                        key={d.val}
                        data-testid={`ledger-direction-${d.val}`}
                        onClick={() => setLedgerDirectionFilter(d.val)}
                        className={`px-2.5 py-1.5 text-[10px] font-medium transition-colors ${
                          ledgerDirectionFilter === d.val
                            ? "bg-primary text-primary-foreground"
                            : "bg-background text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                  {hasLedgerFilters && (
                    <Button data-testid="clear-ledger-filters" variant="ghost" size="sm" onClick={clearLedgerFilters} className="h-8 text-xs gap-1">
                      <X className="h-3 w-3" /> Clear
                    </Button>
                  )}
                </div>
                {/* Movement type pills */}
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] text-muted-foreground mr-1 self-center"><Filter className="h-3 w-3 inline mr-0.5" />Type:</span>
                  {Object.entries(MOVEMENT_TYPES).map(([key, cfg]) => {
                    const active = movementTypeFilter.includes(key);
                    return (
                      <button
                        key={key}
                        data-testid={`movement-filter-${key}`}
                        onClick={() => toggleMovementType(key)}
                        className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                          active ? cfg.color + " border-current font-semibold" : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted"
                        }`}
                      >
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ledger Table */}
              {filteredLedger.length === 0 ? (
                <EmptyState
                  title={hasLedgerFilters ? "No movements match your filters" : "No stock movements found"}
                  description={hasLedgerFilters ? "Try adjusting your filters." : "Stock movements will appear here as transfers are processed."}
                />
              ) : (
                <Card>
                  <CardContent className="py-0 px-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-[10px]">Date</TableHead>
                            <TableHead className="text-[10px]">Store</TableHead>
                            <TableHead className="text-[10px]">Item</TableHead>
                            <TableHead className="text-[10px]">Movement</TableHead>
                            <TableHead className="text-[10px]">Dir.</TableHead>
                            <TableHead className="text-[10px]">Qty</TableHead>
                            <TableHead className="text-[10px]">Unit</TableHead>
                            <TableHead className="text-[10px]">Before</TableHead>
                            <TableHead className="text-[10px]">After</TableHead>
                            <TableHead className="text-[10px]">Reference</TableHead>
                            <TableHead className="text-[10px]">Counterparty</TableHead>
                            <TableHead className="text-[10px]">Reason</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredLedger.map((e) => {
                            const mt = MOVEMENT_TYPES[e.movement_type] || { label: e.movement_type, color: "bg-gray-100 text-gray-600" };
                            const DirIcon = e.direction === "in" ? ArrowDownLeft : e.direction === "out" ? ArrowUpRight : Minus;
                            const dirColor = e.direction === "in" ? "text-emerald-600" : e.direction === "out" ? "text-red-500" : "text-muted-foreground";
                            return (
                              <TableRow key={e.id} data-testid={`ledger-row-${e.id}`}>
                                <TableCell className="text-xs text-muted-foreground">{formatTimestamp(e.date)}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs">{e.store_name || "—"}</span>
                                    {e.store_type && <StoreTypeBadge backendType={e.store_type} />}
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs font-medium">{e.item || "—"}</TableCell>
                                <TableCell>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${mt.color}`}>{mt.label}</span>
                                </TableCell>
                                <TableCell>
                                  <DirIcon className={`h-3.5 w-3.5 ${dirColor}`} />
                                </TableCell>
                                <TableCell className="text-xs tabular-nums font-medium">{e.quantity ?? "—"}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{e.unit || "—"}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{e.before_qty ?? "—"}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{e.after_qty ?? "—"}</TableCell>
                                <TableCell>
                                  {e.reference_id ? (
                                    <Button
                                      variant="link"
                                      size="sm"
                                      className="h-auto p-0 text-[10px] font-mono"
                                      data-testid={`ledger-ref-${e.reference_id}`}
                                      onClick={() => navigate(`/transfer/${e.reference_id}`)}
                                    >
                                      {formatPO(e.reference_id)}
                                    </Button>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs">{e.counterparty_name || "—"}</span>
                                    {e.counterparty_type && <StoreTypeBadge backendType={e.counterparty_type} />}
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate" title={e.reason || ""}>
                                  {e.reason || "—"}
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
              <p className="text-[10px] text-muted-foreground mt-2">
                Showing {filteredLedger.length} of {ledgerEntries.length} movements
              </p>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
