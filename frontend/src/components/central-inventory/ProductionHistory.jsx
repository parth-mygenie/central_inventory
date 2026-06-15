import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLoginContext } from "@/hooks/useLoginContext";
import api from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Factory, ChevronDown, ChevronRight, Package,
  Calendar, Hash, IndianRupee, Layers, ShieldX, TrendingUp,
  Search, RefreshCw, Eye,
} from "lucide-react";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/StateDisplays";

export default function ProductionHistory() {
  const { id } = useParams();
  const { isTopLevel, isMiddleLevel } = useLoginContext();

  if (!isTopLevel && !isMiddleLevel) {
    return (
      <div data-testid="production-role-blocked" className="flex flex-col items-center justify-center py-16 text-center">
        <ShieldX className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">Production Not Available</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Production is only available for Central and Master stores.</p>
      </div>
    );
  }

  // Keep route-based audit detail for deep links
  if (id) return <ProductionAuditDetail runId={id} />;
  return <ProductionHistoryList />;
}

// ── Inline Audit Detail (for expandable rows) ─────────────────────

function InlineAuditDetail({ runId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedAlloc, setExpandedAlloc] = useState({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    api.getProductionRunDetail(runId).then(resp => {
      if (!cancelled) setData(resp.data?.data || resp.data);
    }).catch(e => {
      if (!cancelled) setError(e?.response?.data?.message || e.message || "Failed to load");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [runId]);

  if (loading) return <div className="py-3 px-4"><LoadingState lines={2} /></div>;
  if (error) return <div className="py-3 px-4 text-xs text-destructive">{error}</div>;
  if (!data) return null;

  const allocations = data.consumed_allocations || data.allocations || [];
  const output = data.output || {};

  return (
    <div className="py-3 px-4 bg-muted/20 border-t border-border" data-testid={`audit-inline-${runId}`}>
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 text-xs mb-3">
        <div className="grid grid-cols-2 gap-2">
          <div><span className="text-[10px] text-muted-foreground block">Reference</span><span className="font-mono font-semibold">{data.reference_code || `#${runId}`}</span></div>
          <div><span className="text-[10px] text-muted-foreground block">Status</span><span className="font-semibold capitalize">{data.status || "done"}</span></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><span className="text-[10px] text-muted-foreground block">Planned</span><span className="font-semibold tabular-nums">{data.planned_output_qty || "—"}</span></div>
          <div><span className="text-[10px] text-muted-foreground block">Actual</span><span className="font-semibold tabular-nums">{data.actual_output_qty || data.quantity_added || "—"}</span></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><span className="text-[10px] text-muted-foreground block">Batch</span><span className="font-mono text-[10px]">{data.batch || "—"}</span></div>
          <div><span className="text-[10px] text-muted-foreground block">Expiry</span><span>{data.output_expiry_date || data.expiry_date || "—"}</span></div>
        </div>
      </div>

      {/* Cost */}
      <div className="flex items-center gap-4 text-xs mb-3 p-2 rounded bg-muted/30">
        <span><span className="text-[10px] text-muted-foreground">Unit Cost:</span> <span className="font-bold tabular-nums">₹{fmt(data.unit_cost)}</span></span>
        <span><span className="text-[10px] text-muted-foreground">Total:</span> <span className="font-bold tabular-nums">₹{fmt(data.total_cost)}</span></span>
      </div>

      {/* Consumed Ingredients */}
      {allocations.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Consumed Ingredients</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b">
                <th className="w-6"></th>
                <th className="text-left py-1.5 px-2 font-medium">Ingredient</th>
                <th className="text-right py-1.5 px-2 font-medium">Qty</th>
                <th className="text-right py-1.5 px-2 font-medium">Unit</th>
                <th className="text-right py-1.5 px-2 font-medium">Cost</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map((alloc) => {
                const allocId = alloc.inventory_master_id || alloc.ingredient_id || alloc.id;
                const segments = alloc.segments || alloc.segment_allocations || [];
                const isOpen = expandedAlloc[allocId];
                return (
                  <AllocationRow
                    key={allocId}
                    alloc={alloc}
                    allocId={allocId}
                    segments={segments}
                    isOpen={isOpen}
                    onToggle={() => setExpandedAlloc(prev => ({ ...prev, [allocId]: !prev[allocId] }))}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Output */}
      {(output.stock_title || data.output_stock_title) && (
        <div className="flex items-center gap-2 text-xs p-2 rounded bg-emerald-50 border border-emerald-100">
          <Package className="h-3.5 w-3.5 text-emerald-600" />
          <span className="font-semibold text-emerald-700">Output: {output.stock_title || data.output_stock_title}</span>
          {(output.segment_id || data.output_segment_id) && (
            <a href={`/inventory/${output.inventory_master_id || data.output_inventory_master_id || ""}`} className="text-[10px] text-emerald-600 underline ml-auto">View in Stock →</a>
          )}
        </div>
      )}
    </div>
  );
}

function AllocationRow({ alloc, allocId, segments, isOpen, onToggle }) {
  return (
    <>
      <tr data-testid={`alloc-row-${allocId}`} className="border-b cursor-pointer hover:bg-accent/30" onClick={segments.length > 0 ? onToggle : undefined}>
        <td className="py-1.5 px-1">
          {segments.length > 0 && (isOpen ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />)}
        </td>
        <td className="py-1.5 px-2 font-medium">{alloc.ingredient_name || `Item #${allocId}`}</td>
        <td className="py-1.5 px-2 text-right tabular-nums">{fmt(alloc.quantity_consumed)}</td>
        <td className="py-1.5 px-2 text-right">{alloc.unit || ""}</td>
        <td className="py-1.5 px-2 text-right tabular-nums font-semibold">₹{fmt(alloc.line_cost)}</td>
      </tr>
      {isOpen && segments.map(seg => (
        <tr key={seg.segment_id} className="bg-muted/30 text-[10px]">
          <td></td>
          <td className="py-1 px-2 text-muted-foreground pl-6">Batch: {seg.batch || "—"} · Exp: {seg.expiry_date || "—"}</td>
          <td className="py-1 px-2 text-right tabular-nums">{fmt(seg.qty_cal)}</td>
          <td className="py-1 px-2 text-right">₹{fmt(seg.unit_cost)}/u</td>
          <td className="py-1 px-2 text-right tabular-nums">₹{fmt(seg.alloc_cost || seg.allocation_line_cost)}</td>
        </tr>
      ))}
    </>
  );
}

// ── Route-based Audit Detail (for /production/:id deep links) ─────

function ProductionAuditDetail({ runId }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});

  const fetchDetail = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const resp = await api.getProductionRunDetail(runId);
      setData(resp.data?.data || resp.data);
    } catch (e) { setError(e?.response?.data?.message || e.message || "Failed to load"); }
    finally { setLoading(false); }
  }, [runId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  if (loading) return <LoadingState lines={4} />;
  if (error) return <ErrorState message={error} onRetry={fetchDetail} />;
  if (!data) return <EmptyState title="Not found" />;

  const allocations = data.consumed_allocations || data.allocations || [];
  const output = data.output || {};

  return (
    <div data-testid="production-audit-detail" className="max-w-3xl mx-auto py-4 px-4 space-y-5">
      <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate("/production/history")}>
        <ArrowLeft className="h-3.5 w-3.5" /> Back to History
      </Button>

      <Card>
        <CardContent className="py-4 px-5">
          <h2 className="text-sm font-bold mb-3">{data.reference_code || `Run #${runId}`}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <InfoCell icon={Calendar} label="Date" value={data.created_at ? new Date(data.created_at).toLocaleDateString("en-IN") : "—"} />
            <InfoCell icon={Hash} label="Batch" value={data.batch || "—"} />
            <InfoCell icon={Calendar} label="Expiry" value={data.output_expiry_date || "—"} />
            <InfoCell icon={IndianRupee} label="Unit Cost" value={data.unit_cost != null ? `₹${fmt(data.unit_cost)}` : "—"} />
            <InfoCell icon={Package} label="Planned" value={`${data.planned_output_qty || "—"} ${data.output_unit || ""}`} />
            <InfoCell icon={Package} label="Actual" value={`${data.actual_output_qty || data.quantity_added || "—"} ${data.output_unit || ""}`} />
            <InfoCell icon={IndianRupee} label="Total Cost" value={data.total_cost != null ? `₹${fmt(data.total_cost)}` : "—"} />
            <InfoCell icon={Layers} label="Status" value={data.status || "done"} />
          </div>
        </CardContent>
      </Card>

      {allocations.length > 0 && (
        <Card>
          <CardContent className="py-0 px-0">
            <table className="w-full text-xs">
              <thead><tr className="border-b text-muted-foreground">
                <th className="w-8"></th><th className="text-left py-2 px-3 font-medium">Ingredient</th>
                <th className="text-right py-2 px-3 font-medium">Qty Consumed</th>
                <th className="text-right py-2 px-3 font-medium">Unit</th>
                <th className="text-right py-2 px-3 font-medium">Line Cost</th>
              </tr></thead>
              <tbody>
                {allocations.map(alloc => {
                  const allocId = alloc.inventory_master_id || alloc.ingredient_id || alloc.id;
                  const segments = alloc.segments || alloc.segment_allocations || [];
                  return (
                    <AllocationRow key={allocId} alloc={alloc} allocId={allocId} segments={segments}
                      isOpen={expanded[allocId]} onToggle={() => setExpanded(p => ({ ...p, [allocId]: !p[allocId] }))} />
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {(output.stock_title || data.output_stock_title) && (
        <Card className="border-l-[3px] border-l-emerald-500">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <Package className="h-4 w-4 text-emerald-600" />
            <div>
              <p className="text-xs font-semibold text-emerald-700">Output: {output.stock_title || data.output_stock_title}</p>
              <p className="text-[10px] text-muted-foreground">{data.actual_output_qty || data.quantity_added || "—"} {data.output_unit || ""}</p>
            </div>
            <Button variant="outline" size="sm" className="ml-auto text-xs" onClick={() => navigate("/inventory")}>View in Stock</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Production History List with Intelligence + Filters + Expandable ─

function ProductionHistoryList() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Expandable
  const [expandedRunId, setExpandedRunId] = useState(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = { limit: 100 };
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      const resp = await api.getProductionRunHistory(params);
      const d = resp.data?.data || resp.data;
      setRuns(Array.isArray(d) ? d : []);
    } catch (e) { setError(e?.response?.data?.message || e.message || "Failed to load"); }
    finally { setLoading(false); }
  }, [fromDate, toDate]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // Frontend search filter
  const filteredRuns = useMemo(() => {
    if (!searchTerm.trim()) return runs;
    const q = searchTerm.toLowerCase();
    return runs.filter(r =>
      (r.reference_code || "").toLowerCase().includes(q) ||
      (r.recipe_name || r.output_stock_title || "").toLowerCase().includes(q)
    );
  }, [runs, searchTerm]);

  // P3-7: Summary KPIs (recalculate on filtered data)
  const kpis = useMemo(() => {
    const totalRuns = filteredRuns.length;
    const totalFG = filteredRuns.reduce((sum, r) => sum + (Number(r.actual_output_qty || r.planned_output_qty || r.quantity_added || 0)), 0);
    const totalCost = filteredRuns.reduce((sum, r) => sum + (Number(r.total_cost || 0)), 0);
    const avgUnitCost = totalFG > 0 ? totalCost / totalFG : 0;
    return { totalRuns, totalFG, totalCost, avgUnitCost };
  }, [filteredRuns]);

  // P3-8: Staleness
  const staleness = useMemo(() => {
    const byRecipe = {};
    for (const run of filteredRuns) {
      const recipeId = run.bom_sub_recipe_id || run.sub_recipe_id;
      const name = run.recipe_name || run.output_stock_title || `Recipe #${recipeId}`;
      if (!byRecipe[recipeId]) byRecipe[recipeId] = { recipeId, name, runs: [], totalCost: 0, totalQty: 0 };
      byRecipe[recipeId].runs.push(run);
      byRecipe[recipeId].totalCost += Number(run.total_cost || 0);
      byRecipe[recipeId].totalQty += Number(run.actual_output_qty || run.planned_output_qty || 0);
    }
    return Object.values(byRecipe).map(group => {
      const sorted = [...group.runs].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      const lastRun = sorted[0];
      const lastDate = lastRun?.created_at ? new Date(lastRun.created_at) : null;
      const daysAgo = lastDate ? Math.floor((Date.now() - lastDate.getTime()) / 86400000) : null;
      const avgCost = group.totalQty > 0 ? group.totalCost / group.totalQty : 0;
      return { ...group, lastDate, daysAgo, avgCost };
    }).sort((a, b) => (b.daysAgo ?? 9999) - (a.daysAgo ?? 9999));
  }, [filteredRuns]);

  // P3-9: Cost trend
  const costTrend = useMemo(() => {
    if (filteredRuns.length < 2) return null;
    const sorted = [...filteredRuns].filter(r => Number(r.unit_cost) > 0)
      .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)).slice(-5);
    if (sorted.length < 2) return null;
    const costs = sorted.map(r => Number(r.unit_cost));
    const avg = costs.reduce((s, c) => s + c, 0) / costs.length;
    const prev = costs.slice(0, -1).reduce((s, c) => s + c, 0) / (costs.length - 1);
    const pctChange = prev > 0 ? ((avg - prev) / prev * 100).toFixed(1) : 0;
    return { costs, avg, pctChange, recipeName: sorted[sorted.length - 1]?.recipe_name || sorted[sorted.length - 1]?.output_stock_title || "Production" };
  }, [filteredRuns]);

  const toggleExpand = (runId) => {
    setExpandedRunId(prev => prev === runId ? null : runId);
  };

  return (
    <div data-testid="production-history-page" className="max-w-3xl mx-auto py-4 px-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Factory className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Production History</h1>
            <p className="text-xs text-muted-foreground">View past production runs and audit trails.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={fetchHistory} disabled={loading}>
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" className="h-8 text-xs gap-1" onClick={() => navigate("/production/new")} data-testid="new-run-btn">
            <Factory className="h-3.5 w-3.5" /> New Run
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div>
          <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="h-8 text-xs w-36" data-testid="filter-from-date" placeholder="From" />
        </div>
        <span className="text-xs text-muted-foreground">to</span>
        <div>
          <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="h-8 text-xs w-36" data-testid="filter-to-date" placeholder="To" />
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            data-testid="filter-search"
            placeholder="Search reference or recipe..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {loading && <LoadingState lines={3} />}
      {error && <ErrorState message={error} onRetry={fetchHistory} />}

      {!loading && !error && filteredRuns.length === 0 && (
        <Card><CardContent className="py-0 px-0">
          <EmptyState title="No production runs" description={searchTerm ? "No runs match your search." : "Run your first production to see history here."} icon={Factory} />
        </CardContent></Card>
      )}

      {!loading && filteredRuns.length > 0 && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3">
            <Card data-testid="kpi-total-runs"><CardContent className="py-3 px-4">
              <p className="text-2xl font-bold tabular-nums font-mono">{kpis.totalRuns}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Total Runs</p>
            </CardContent></Card>
            <Card data-testid="kpi-total-fg"><CardContent className="py-3 px-4">
              <p className="text-2xl font-bold tabular-nums font-mono">{kpis.totalFG.toLocaleString("en-IN")}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Total FG Produced</p>
            </CardContent></Card>
            <Card data-testid="kpi-total-cost"><CardContent className="py-3 px-4">
              <p className="text-2xl font-bold tabular-nums font-mono">₹{kpis.totalCost > 1000 ? `${(kpis.totalCost / 1000).toFixed(1)}K` : kpis.totalCost.toFixed(0)}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Total Material Cost</p>
              <p className="text-[10px] text-muted-foreground mt-1 pt-1 border-t border-border">Avg ₹{kpis.avgUnitCost.toFixed(2)}/unit</p>
            </CardContent></Card>
          </div>

          {/* Staleness */}
          {staleness.length > 0 && (
            <div>
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Sub-Recipe Staleness</h2>
              <Card><CardContent className="py-0 px-0 divide-y divide-border">
                {staleness.map(s => (
                  <div key={s.recipeId} data-testid={`staleness-${s.recipeId}`} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-sm font-semibold flex-1 truncate">{s.name}</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums font-mono shrink-0">Avg ₹{s.avgCost.toFixed(2)}/u</span>
                    {s.daysAgo === null ? (
                      <Badge variant="outline" className="text-[9px] px-2 py-0 bg-red-50 text-red-600 border-red-200 shrink-0">Never produced</Badge>
                    ) : s.daysAgo <= 5 ? (
                      <Badge variant="outline" className="text-[9px] px-2 py-0 bg-emerald-50 text-emerald-600 border-emerald-200 shrink-0">Produced {s.daysAgo}d ago</Badge>
                    ) : s.daysAgo <= 14 ? (
                      <Badge variant="outline" className="text-[9px] px-2 py-0 bg-amber-50 text-amber-600 border-amber-200 shrink-0">Produced {s.daysAgo}d ago</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] px-2 py-0 bg-red-50 text-red-600 border-red-200 shrink-0">Produced {s.daysAgo}d ago</Badge>
                    )}
                  </div>
                ))}
              </CardContent></Card>
            </div>
          )}

          {/* Cost Trend */}
          {costTrend && (
            <div>
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Cost Trend — {costTrend.recipeName}</h2>
              <Card><CardContent className="py-4 px-4">
                <div className="flex items-baseline gap-3 mb-3">
                  <span className="text-xl font-bold font-mono tabular-nums">₹{costTrend.avg.toFixed(2)}</span>
                  <span className="text-[10px] text-muted-foreground">avg unit cost (last {costTrend.costs.length} runs)</span>
                  {Number(costTrend.pctChange) > 0 ? (
                    <Badge variant="outline" className="text-[9px] px-2 py-0 bg-amber-50 text-amber-600 border-amber-200">
                      <TrendingUp className="h-2.5 w-2.5 mr-0.5 inline" /> {costTrend.pctChange}%
                    </Badge>
                  ) : Number(costTrend.pctChange) < 0 ? (
                    <Badge variant="outline" className="text-[9px] px-2 py-0 bg-emerald-50 text-emerald-600 border-emerald-200">{costTrend.pctChange}%</Badge>
                  ) : null}
                </div>
                <div className="flex items-end gap-1 h-12">
                  {costTrend.costs.map((cost, idx) => {
                    const max = Math.max(...costTrend.costs);
                    const min = Math.min(...costTrend.costs) * 0.8;
                    const pct = max > min ? ((cost - min) / (max - min)) * 100 : 50;
                    const isLast = idx === costTrend.costs.length - 1;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-0.5">
                        <div className={`w-full rounded-t ${isLast ? "bg-amber-200 border border-amber-300" : "bg-muted"}`} style={{ height: `${Math.max(20, pct)}%` }} />
                        <span className={`text-[9px] tabular-nums font-mono ${isLast ? "text-amber-600 font-semibold" : "text-muted-foreground"}`}>{cost.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent></Card>
            </div>
          )}

          {/* Runs Table — Expandable */}
          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">All Runs ({filteredRuns.length})</h2>
            <Card>
              <CardContent data-testid="production-history-table" className="py-0 px-0">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="w-6"></th>
                      <th className="text-left py-2 px-3 font-medium">Date</th>
                      <th className="text-left py-2 px-3 font-medium">Reference</th>
                      <th className="text-left py-2 px-3 font-medium">Recipe</th>
                      <th className="text-right py-2 px-3 font-medium">Qty</th>
                      <th className="text-right py-2 px-3 font-medium">Unit Cost</th>
                      <th className="text-right py-2 px-3 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRuns.map(run => {
                      const runId = run.id || run.production_run_id;
                      const isExpanded = expandedRunId === runId;
                      return (
                        <React.Fragment key={runId}>
                          <tr
                            data-testid={`run-row-${runId}`}
                            className={`border-b cursor-pointer hover:bg-accent/30 transition-colors ${isExpanded ? "bg-accent/20" : ""}`}
                            onClick={() => toggleExpand(runId)}
                          >
                            <td className="py-2 px-1.5">
                              {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                            </td>
                            <td className="py-2 px-3 tabular-nums text-muted-foreground">
                              {run.created_at ? new Date(run.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}
                            </td>
                            <td className="py-2 px-3 font-mono font-semibold">{run.reference_code || `#${runId}`}</td>
                            <td className="py-2 px-3 truncate max-w-[160px]">{run.recipe_name || run.output_stock_title || "—"}</td>
                            <td className="py-2 px-3 text-right tabular-nums">{run.actual_output_qty || run.planned_output_qty || "—"} {run.output_unit || ""}</td>
                            <td className="py-2 px-3 text-right tabular-nums font-mono">₹{fmt(run.unit_cost)}</td>
                            <td className="py-2 px-3 text-right tabular-nums font-mono font-semibold">₹{fmt(run.total_cost)}</td>
                          </tr>
                          {isExpanded && (
                            <tr><td colSpan="7" className="p-0">
                              <InlineAuditDetail runId={runId} />
                            </td></tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────

function InfoCell({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
        <p className="font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function fmt(v) {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (isNaN(n)) return String(v);
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
