import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLoginContext } from "@/hooks/useLoginContext";
import { useRestaurantMap } from "@/hooks/useRestaurantMap";
import api from "@/services/api";
import { STATUS_CONFIG, getStatusConfig, TYPE_LABELS } from "@/lib/terminology";
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
  Search, X, Filter, Eye, RefreshCw, Download, ChevronLeft, ChevronRight
} from "lucide-react";

// CR-037 — Server-side ledger source_type badges (G-005). Legacy client-derived
// movement_type keys (transfer_out/in, adjustment_*, reversal, partial_receive)
// removed with deriveLedgerEntries — server now returns 4 canonical source_types.
const SOURCE_TYPES = {
  transfer: { label: "Transfer", color: "bg-indigo-100 text-indigo-700" },
  grn: { label: "GRN / Purchase", color: "bg-blue-100 text-blue-700" },
  production: { label: "Production", color: "bg-emerald-100 text-emerald-700" },
  wastage: { label: "Wastage", color: "bg-rose-100 text-rose-700" },
};

const ALL_STATUSES = Object.keys(STATUS_CONFIG);

// CR-037 — deriveLedgerEntries / deriveWastageEntries removed; the server now
// returns unified ledger rows via /inventory-transfer/stock-ledger (G-005).

export default function HistoryLedger() {
  const navigate = useNavigate();
  const { restaurantId, restaurantType, isTopLevel, isMiddleLevel, isBottomLevel } = useLoginContext();
  const { restaurantMap } = useRestaurantMap();

  const [activeTab, setActiveTab] = useState("history");

  // Transfer History state
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(null);

  // Stock Ledger state — CR-037: server-driven via /stock-ledger (G-005)
  const [ledgerRows, setLedgerRows] = useState([]);
  const [ledgerMeta, setLedgerMeta] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 25, source_types: [] });
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerLoaded, setLedgerLoaded] = useState(false);
  const [ledgerError, setLedgerError] = useState(null);
  const [ledgerPage, setLedgerPage] = useState(1);
  const LEDGER_LIMIT = 25;

  // Filters — shared
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [searchQuery, setSearchQuery] = useState("");

  // Transfer History filters
  const [statusFilter, setStatusFilter] = useState([]);
  const [directionFilter, setDirectionFilter] = useState("all");

  // Stock Ledger filters — CR-037: source_type replaces client-derived movement_type
  const [sourceTypeFilter, setSourceTypeFilter] = useState([]);
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

  // CR-037 — Server-side ledger fetch (G-005). Single call replaces the previous
  // N+1 pattern (history-ids → getTransferDetails × N + getWastageReport).
  const fetchLedgerData = useCallback(async (page = 1) => {
    setLedgerLoading(true);
    setLedgerError(null);
    try {
      const payload = {
        restaurantId,
        page,
        limit: LEDGER_LIMIT,
      };
      if (sourceTypeFilter.length > 0) payload.sourceTypes = sourceTypeFilter;
      if (dateRange.from) payload.fromDate = new Date(dateRange.from).toISOString().slice(0, 10);
      if (dateRange.to) payload.toDate = new Date(dateRange.to).toISOString().slice(0, 10);
      const resp = await api.getStockLedger(payload);
      const body = resp.data || {};
      const rows = Array.isArray(body.data) ? body.data : [];
      const meta = body.meta || { current_page: page, last_page: 1, total: rows.length, per_page: LEDGER_LIMIT, source_types: [] };
      setLedgerRows(rows);
      setLedgerMeta(meta);
      setLedgerPage(meta.current_page || page);
      setLedgerLoaded(true);
    } catch (err) {
      setLedgerError(err?.response?.data?.message || "Failed to load stock ledger");
    } finally {
      setLedgerLoading(false);
    }
  }, [restaurantId, sourceTypeFilter, dateRange.from, dateRange.to]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // CR-037 — Lazy-load ledger on tab switch, and re-fetch on filter/date/page change.
  useEffect(() => {
    if (activeTab === "ledger") {
      fetchLedgerData(ledgerPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, sourceTypeFilter, dateRange.from, dateRange.to, ledgerPage]);

  // Build restaurant name map from history data + restaurantMap hook (used
  // by history tab labels).
  // eslint-disable-next-line no-unused-vars
  const historyNameMap = useMemo(() => ({ ...(restaurantMap || {}) }), [restaurantMap]);

  // CR-037 — Ledger rows come from server; only client-side apply is search
  // & direction filter (date+source_type are sent to API and refetch triggers).
  const filteredLedger = useMemo(() => {
    let items = ledgerRows;
    if (ledgerDirectionFilter === "in") items = items.filter((e) => e.movement === "in");
    else if (ledgerDirectionFilter === "out") items = items.filter((e) => e.movement === "out");
    if (ledgerSearch.trim()) {
      const q = ledgerSearch.toLowerCase().trim();
      items = items.filter((e) =>
        (e.stock_title || "").toLowerCase().includes(q) ||
        String(e.reference_code || e.reference_id || "").toLowerCase().includes(q)
      );
    }
    return items;
  }, [ledgerRows, ledgerDirectionFilter, ledgerSearch]);

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

  // ── Filtered Ledger removed (server-driven; see filteredLedger below) ──

  const clearHistoryFilters = () => {
    setDateRange({ from: null, to: null });
    setStatusFilter([]);
    setDirectionFilter("all");
    setSearchQuery("");
  };

  const clearLedgerFilters = () => {
    setDateRange({ from: null, to: null });
    setSourceTypeFilter([]);
    setLedgerDirectionFilter("all");
    setLedgerSearch("");
    setLedgerPage(1);
  };

  const hasHistoryFilters = statusFilter.length > 0 || directionFilter !== "all" || searchQuery || dateRange.from;
  const hasLedgerFilters = sourceTypeFilter.length > 0 || ledgerDirectionFilter !== "all" || ledgerSearch || dateRange.from;

  const getDirection = (t) => {
    if (String(t.to_restaurant_id) === String(restaurantId)) return "incoming";
    if (String(t.from_restaurant_id) === String(restaurantId)) return "outgoing";
    return "related";
  };

  const toggleStatus = (s) => {
    setStatusFilter((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  const toggleSourceType = (t) => {
    setSourceTypeFilter((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
    setLedgerPage(1);
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
                rows.push([formatPO(t.id, t.reference_code), t.created_at, t.from_restaurant_name||"", t.to_restaurant_name||"", t.status, t.type, t.items_count||"", dir]);
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
            onClick={() => { fetchHistory(); fetchLedgerData(ledgerPage); }}
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
            {ledgerMeta.total > 0 && (
              <span className="ml-1 bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded-full">
                {ledgerMeta.total}
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
                                <TableCell className="text-xs font-mono font-medium">{formatPO(t.id, t.reference_code)}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{formatTimestamp(t.created_at)}</TableCell>
                                <TableCell className="text-xs">{restaurantMap[String(t.from_restaurant_id)]?.name || t.from_restaurant_name || "—"}</TableCell>
                                <TableCell className="text-xs">{restaurantMap[String(t.to_restaurant_id)]?.name || t.to_restaurant_name || "—"}</TableCell>
                                <TableCell><StatusBadge status={t.status} /></TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={`text-[9px] font-normal ${t.type === "modification_request" ? "bg-amber-50 text-amber-700 border-amber-200" : ""}`}>
                                    {TYPE_LABELS[t.type] || t.type}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs tabular-nums">{t.items_count > 0 ? formatItemsCount(t.items_count) : t.line_count > 0 ? formatItemsCount(t.line_count) : "—"}</TableCell>
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
          {ledgerLoading && !ledgerLoaded ? (
            <LoadingState lines={6} />
          ) : ledgerError ? (
            <ErrorState message={ledgerError} onRetry={() => fetchLedgerData(ledgerPage)} />
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
                {/* Source type pills — CR-037: G-005 canonical types */}
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] text-muted-foreground mr-1 self-center"><Filter className="h-3 w-3 inline mr-0.5" />Type:</span>
                  {Object.entries(SOURCE_TYPES).map(([key, cfg]) => {
                    const available = !ledgerMeta.source_types || ledgerMeta.source_types.length === 0 || ledgerMeta.source_types.includes(key);
                    const active = sourceTypeFilter.includes(key);
                    return (
                      <button
                        key={key}
                        data-testid={`source-filter-${key}`}
                        onClick={() => toggleSourceType(key)}
                        disabled={!available && !active}
                        className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                          active ? cfg.color + " border-current font-semibold" : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted"
                        } ${!available && !active ? "opacity-40 cursor-not-allowed" : ""}`}
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
                            <TableHead className="text-[10px]">Source</TableHead>
                            <TableHead className="text-[10px]">Reference</TableHead>
                            <TableHead className="text-[10px]">Item</TableHead>
                            <TableHead className="text-[10px]">Dir.</TableHead>
                            <TableHead className="text-[10px]">Qty</TableHead>
                            <TableHead className="text-[10px]">Unit</TableHead>
                            <TableHead className="text-[10px]">Before</TableHead>
                            <TableHead className="text-[10px]">After</TableHead>
                            <TableHead className="text-[10px]">Counterparty</TableHead>
                            <TableHead className="text-[10px]">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredLedger.map((e) => {
                            const st = SOURCE_TYPES[e.source_type] || { label: e.source_type, color: "bg-gray-100 text-gray-600" };
                            const DirIcon = e.movement === "in" ? ArrowDownLeft : e.movement === "out" ? ArrowUpRight : Minus;
                            const dirColor = e.movement === "in" ? "text-emerald-600" : e.movement === "out" ? "text-red-500" : "text-muted-foreground";
                            const cpartyName = e.counterparty_restaurant_id ? (restaurantMap[String(e.counterparty_restaurant_id)]?.name || `Store #${e.counterparty_restaurant_id}`) : null;
                            const cpartyType = e.counterparty_restaurant_id ? restaurantMap[String(e.counterparty_restaurant_id)]?.type : null;
                            const isTransfer = e.source_type === "transfer";
                            return (
                              <TableRow key={e.ledger_id || `${e.source_type}-${e.reference_id}-${e.line_id || 0}`} data-testid={`ledger-row-${e.ledger_id || e.reference_id}`}>
                                <TableCell className="text-xs text-muted-foreground">{formatTimestamp(e.occurred_at)}</TableCell>
                                <TableCell>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                                </TableCell>
                                <TableCell>
                                  {e.reference_id && isTransfer ? (
                                    <Button
                                      variant="link"
                                      size="sm"
                                      className="h-auto p-0 text-[10px] font-mono"
                                      data-testid={`ledger-ref-${e.reference_id}`}
                                      onClick={() => navigate(`/transfer/${e.reference_id}`)}
                                    >
                                      {e.reference_code || formatPO(e.reference_id, null)}
                                    </Button>
                                  ) : (
                                    <span className="text-[10px] font-mono text-muted-foreground">{e.reference_code || "—"}</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs font-medium">{e.stock_title || "—"}</TableCell>
                                <TableCell>
                                  <DirIcon className={`h-3.5 w-3.5 ${dirColor}`} />
                                </TableCell>
                                <TableCell className="text-xs tabular-nums font-medium">{e.quantity ?? "—"}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{e.display_unit || "—"}</TableCell>
                                <TableCell className="text-xs text-muted-foreground tabular-nums">{e.qty_before == null ? "—" : e.qty_before}</TableCell>
                                <TableCell className="text-xs text-muted-foreground tabular-nums">{e.qty_after == null ? "—" : e.qty_after}</TableCell>
                                <TableCell>
                                  {cpartyName ? (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs">{cpartyName}</span>
                                      {cpartyType && <StoreTypeBadge backendType={cpartyType} />}
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-[10px] text-muted-foreground capitalize">{e.status || "—"}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
              {/* CR-037 — server-driven pagination */}
              <div className="flex items-center justify-between mt-3">
                <p className="text-[10px] text-muted-foreground">
                  Showing {filteredLedger.length} of {ledgerMeta.total || 0} rows (page {ledgerMeta.current_page || 1} of {ledgerMeta.last_page || 1})
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid="ledger-prev-page"
                    disabled={ledgerLoading || (ledgerMeta.current_page || 1) <= 1}
                    onClick={() => setLedgerPage((p) => Math.max(1, p - 1))}
                    className="h-7 px-2 text-[10px]"
                  >
                    <ChevronLeft className="h-3 w-3" /> Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid="ledger-next-page"
                    disabled={ledgerLoading || (ledgerMeta.current_page || 1) >= (ledgerMeta.last_page || 1)}
                    onClick={() => setLedgerPage((p) => p + 1)}
                    className="h-7 px-2 text-[10px]"
                  >
                    Next <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
