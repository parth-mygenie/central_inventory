import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLoginContext } from "@/hooks/useLoginContext";
import { useWriteAction } from "@/hooks/useWriteAction";
import api from "@/services/api";
import { mapRestaurantType } from "@/lib/terminology";
import { validateQuantityForUnit } from "@/lib/formatters";
import SourceSelector from "./SourceSelector";
import StoreHealthStrip from "@/components/common/StoreHealthStrip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LoadingState, PermissionDenied } from "@/components/common/StateDisplays";
import { ArrowLeft, Plus, Trash2, Loader2, Truck, AlertTriangle, Package, Calendar, Zap } from "lucide-react";

const COVERAGE_OPTIONS = [
  { value: 3, label: "3 days" },
  { value: 7, label: "7 days" },
  { value: 10, label: "10 days" },
  { value: 30, label: "30 days" },
];

export default function DirectDispatchForm() {
  const navigate = useNavigate();
  const { restaurantId, restaurantType, canDo } = useLoginContext();
  const { submitting, execute } = useWriteAction();

  const [destinations, setDestinations] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [selectedDest, setSelectedDest] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [coverageDays, setCoverageDays] = useState(7);

  // Destination + own stock
  const [destStock, setDestStock] = useState([]);
  const [ownStock, setOwnStock] = useState([]);
  const [destLoading, setDestLoading] = useState(false);

  // Destination consumption
  const [destConsumption, setDestConsumption] = useState([]);
  const [destConsumptionDays, setDestConsumptionDays] = useState(0);

  // Duplicate dispatch
  const [todayDispatchWarning, setTodayDispatchWarning] = useState("");

  // Manual add rows (extra items beyond suggestions)
  const [manualRows, setManualRows] = useState([]);

  // Load destinations + inventory master
  useEffect(() => {
    let cancelled = false;
    setLoadingData(true);
    Promise.all([
      api.getHierarchySummary({ storeType: "central" }),
      api.getHierarchySummary({ storeType: "franchise" }),
      api.getInventoryMaster(),
    ]).then(([centralResp, franchiseResp, invResp]) => {
      if (cancelled) return;
      setDestinations([
        ...(centralResp.data?.data?.stores || []),
        ...(franchiseResp.data?.data?.stores || []),
      ]);
      const inv = invResp.data?.data || invResp.data || [];
      setAllItems(Array.isArray(inv) ? inv : []);
    }).catch(() => {})
      .finally(() => { if (!cancelled) setLoadingData(false); });
    return () => { cancelled = true; };
  }, []);

  // Fetch dest stock + own stock + dest consumption when dest changes
  useEffect(() => {
    if (!selectedDest) { setDestStock([]); setDestConsumption([]); return; }
    let cancelled = false;
    setDestLoading(true);
    const thirtyAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
    const today = new Date().toISOString().split("T")[0];
    Promise.allSettled([
      api.getHierarchyDetail({ storeRestaurantId: Number(selectedDest) }),
      api.getStockInventory(),
      api.getDailyConsumptionReport({ fromDate: thirtyAgo, toDate: today, restaurantIds: [Number(selectedDest)] }),
    ]).then(([detailResp, stockResp, consResp]) => {
      if (cancelled) return;
      if (detailResp.status === "fulfilled") {
        setDestStock((detailResp.value?.data?.data || detailResp.value?.data)?.child_stock_summary || []);
      }
      if (stockResp.status === "fulfilled") {
        setOwnStock(stockResp.value?.data?.current_stocks || []);
      }
      if (consResp.status === "fulfilled") {
        const d = consResp.value.data;
        setDestConsumption(d?.stock_summary || []);
        const dr = d?.date_range || [];
        if (dr.length === 2) {
          setDestConsumptionDays(Math.max(1, Math.ceil((new Date(dr[1]) - new Date(dr[0])) / 86400000)));
        }
      }
    }).finally(() => { if (!cancelled) setDestLoading(false); });
    return () => { cancelled = true; };
  }, [selectedDest]);

  // Duplicate dispatch check
  useEffect(() => {
    if (!selectedDest) { setTodayDispatchWarning(""); return; }
    api.getTransferHistory().then(resp => {
      const hist = resp.data?.data || resp.data || [];
      const todayStr = new Date().toISOString().split("T")[0];
      const dupes = (Array.isArray(hist) ? hist : []).filter(t =>
        String(t.to_restaurant_id) === String(selectedDest) &&
        t.status === "dispatched" &&
        (t.dispatched_at || t.created_at || "").startsWith(todayStr)
      );
      setTodayDispatchWarning(dupes.length > 0
        ? `You already dispatched to this store today (${dupes.length} transfer${dupes.length > 1 ? "s" : ""})`
        : "");
    }).catch(() => {});
  }, [selectedDest]);

  // Consumption lookup for destination
  const destConsumptionMap = useMemo(() => {
    if (!destConsumption.length || destConsumptionDays <= 0) return {};
    const map = {};
    destConsumption.forEach(item => {
      const name = (item.ingredient_name || "").toLowerCase();
      const consumed = parseFloat(item.total_consumed) || 0;
      if (name && consumed > 0) map[name] = consumed / destConsumptionDays;
    });
    return map;
  }, [destConsumption, destConsumptionDays]);

  const hasConsumptionData = Object.keys(destConsumptionMap).length > 0;

  // Compute intelligent dispatch items
  const dispatchNeeds = useMemo(() => {
    if (!destStock.length || !ownStock.length) return [];
    return destStock.map(item => {
      const name = (item.stock_title || "").toLowerCase();
      const destQty = parseFloat(item.display_quantity) || 0;
      const minQty = parseFloat(item.min_qty_alert) || 0;
      const avgDaily = destConsumptionMap[name] || 0;
      const ownItem = ownStock.find(s => (s.stock_title || "").toLowerCase() === name);
      if (!ownItem) return null;
      const ownQty = ownItem.display_qty ?? 0;
      const invMasterId = ownItem.id;

      let qtyToSend = 0;
      let daysOfCover = null;
      let suggestion = "";
      let urgency = 0;

      if (avgDaily > 0) {
        daysOfCover = destQty / avgDaily;
        const projectedNeed = avgDaily * coverageDays;
        qtyToSend = Math.max(0, Math.ceil((projectedNeed - destQty) * 100) / 100);
        if (qtyToSend > 0) {
          suggestion = daysOfCover < 1
            ? `< 1 day cover at dest, sending for ${coverageDays}d`
            : `~${Math.round(daysOfCover)}d cover, sending for ${coverageDays}d`;
          urgency = daysOfCover < 1 ? 100 : 50 + (coverageDays - daysOfCover);
        }
      } else if (minQty > 0 && destQty < minQty) {
        qtyToSend = Math.ceil((minQty - destQty) * 100) / 100;
        suggestion = `Gap to min: ${qtyToSend} ${item.unit || ""}`;
        urgency = destQty === 0 ? 80 : 40;
      }

      if (qtyToSend <= 0) return null;

      // Cap at own stock
      const cappedQty = Math.min(qtyToSend, ownQty);
      const exceedsOwn = qtyToSend > ownQty;
      const afterDispatch = Math.round((ownQty - cappedQty) * 100) / 100;
      const retainPct = ownQty > 0 ? Math.round((afterDispatch / ownQty) * 100) : 0;

      return {
        invMasterId,
        stockTitle: item.stock_title,
        unit: ownItem.display_unit || item.unit || "",
        category: item.category_name || ownItem.category_name || "",
        destQty,
        minQty,
        avgDaily,
        daysOfCover,
        ownQty,
        qtyToSend: cappedQty,
        idealQty: qtyToSend,
        exceedsOwn,
        afterDispatch,
        retainPct,
        suggestion,
        urgency,
        isOut: destQty === 0,
        isLow: (item.is_low_stock || destQty < minQty) && destQty > 0,
        qty: String(exceedsOwn ? cappedQty : qtyToSend),
        sourceSelector: null,
        included: true,
      };
    }).filter(Boolean)
      .filter((item, idx, arr) => arr.findIndex(x => x.invMasterId === item.invMasterId) === idx)
      .sort((a, b) => b.urgency - a.urgency);
  }, [destStock, ownStock, destConsumptionMap, coverageDays]);

  // Editable state
  const [dispatchRows, setDispatchRows] = useState([]);
  useEffect(() => {
    setDispatchRows(dispatchNeeds.map(item => ({ ...item })));
  }, [dispatchNeeds]);

  const updateDispatchRow = (idx, field, value) => {
    setDispatchRows(prev => {
      const next = [...prev];
      const row = { ...next[idx] };
      if (field === "qty") {
        row.qty = value;
        const q = Number(value) || 0;
        row.afterDispatch = Math.round((row.ownQty - q) * 100) / 100;
        row.retainPct = row.ownQty > 0 ? Math.round((row.afterDispatch / row.ownQty) * 100) : 0;
        row.exceedsOwn = q > row.ownQty;
      } else {
        row[field] = value;
      }
      next[idx] = row;
      return next;
    });
  };

  // Manual row handlers
  const addManualRow = () => setManualRows(r => [...r, { itemId: "", quantity: "", unit: "", sourceSelector: null }]);
  const removeManualRow = (idx) => setManualRows(r => r.filter((_, i) => i !== idx));
  const updateManualRow = (idx, field, value) => {
    setManualRows(r => {
      const next = [...r];
      next[idx] = { ...next[idx], [field]: value };
      if (field === "itemId") {
        const item = allItems.find(i => String(i.id) === String(value));
        next[idx].unit = item?.unit || "";
        next[idx].sourceSelector = null;
      }
      return next;
    });
  };

  // Stat cards
  const stats = useMemo(() => {
    let needDispatching = 0, partial = 0, covered = 0;
    destStock.forEach(item => {
      const name = (item.stock_title || "").toLowerCase();
      const qty = parseFloat(item.display_quantity) || 0;
      const minQty = parseFloat(item.min_qty_alert) || 0;
      const avgDaily = destConsumptionMap[name] || 0;
      if (avgDaily > 0) {
        const doc = qty / avgDaily;
        if (doc < 1) needDispatching++;
        else if (doc < coverageDays) partial++;
        else covered++;
      } else if (minQty > 0) {
        if (qty === 0) needDispatching++;
        else if (qty < minQty) partial++;
        else covered++;
      } else {
        if (qty === 0) needDispatching++;
        else covered++;
      }
    });
    return { needDispatching, partial, covered, total: destStock.length };
  }, [destStock, destConsumptionMap, coverageDays]);

  const includedRows = dispatchRows.filter(r => r.included && Number(r.qty) > 0 && r.sourceSelector);
  const validManualRows = manualRows.filter(r => r.itemId && Number(r.quantity) > 0 && r.sourceSelector);
  const allIncluded = [...includedRows, ...validManualRows];
  const reviewWarnings = dispatchRows.filter(r => r.included && r.exceedsOwn && Number(r.qty) > 0);

  if (!canDo("dispatch")) return <PermissionDenied />;
  if (loadingData) return <LoadingState lines={4} />;

  const handleSubmit = () => {
    if (!selectedDest || allIncluded.length === 0) return;
    const payloadItems = [
      ...includedRows.map(r => ({
        source_inventory_master_id: Number(r.invMasterId),
        quantity: Number(r.qty),
        unit: r.unit,
        source_selector: r.sourceSelector,
      })),
      ...validManualRows.map(r => {
        const item = allItems.find(i => String(i.id) === String(r.itemId));
        return {
          source_inventory_master_id: Number(r.itemId),
          quantity: Number(r.quantity),
          unit: item?.unit || r.unit,
          source_selector: r.sourceSelector,
        };
      }),
    ];
    execute(
      () => api.initiateTransfer({ fromRestaurantId: restaurantId, toRestaurantId: Number(selectedDest), items: payloadItems }),
      {
        successMsg: "Dispatch created",
        onSuccess: (resp) => {
          const newId = resp?.data?.data?.transfer_id || resp?.data?.data?.id || resp?.data?.transfer_id;
          navigate(newId ? `/transfer/${newId}` : "/queues");
        },
      }
    );
  };

  const destName = destinations.find(d => String(d.restaurant_id) === selectedDest)?.restaurant_name || "";

  return (
    <div data-testid="direct-dispatch-form">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>
      <div className="flex items-center gap-2 mb-1">
        <Truck className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-bold">Direct Dispatch</h1>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Send stock to a store in your hierarchy</p>

      {/* Coverage selector */}
      <Card className="mb-4" data-testid="coverage-selector-card">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">Dispatch for:</span>
            </div>
            <div className="flex gap-1.5" data-testid="coverage-period-selector">
              {COVERAGE_OPTIONS.map(opt => (
                <Button key={opt.value} variant={coverageDays === opt.value ? "default" : "outline"} size="sm" className="h-7 text-xs px-3" onClick={() => setCoverageDays(opt.value)} data-testid={`coverage-${opt.value}d`}>
                  {opt.label}
                </Button>
              ))}
            </div>
            {selectedDest && !hasConsumptionData && !destLoading && (
              <span className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded">No consumption data — using thresholds</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Destination picker */}
      <Card className="mb-4">
        <CardContent className="py-3 px-4 space-y-3">
          <div>
            <Label className="text-xs">Destination Store *</Label>
            <Select value={selectedDest} onValueChange={setSelectedDest} disabled={submitting}>
              <SelectTrigger data-testid="dispatch-dest-select"><SelectValue placeholder="Select destination" /></SelectTrigger>
              <SelectContent>
                {destinations.map(d => (
                  <SelectItem key={d.restaurant_id} value={String(d.restaurant_id)}>
                    {d.restaurant_name} ({mapRestaurantType(d.restaurant_type)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedDest && (() => {
            const dest = destinations.find(d => String(d.restaurant_id) === selectedDest);
            return dest ? <StoreHealthStrip storeName={dest.restaurant_name} outCount={dest.out_of_stock_count || 0} lowCount={dest.low_stock_count || 0} adequateCount={dest.adequate_count || 0} totalItems={dest.total_items || 0} urgent={(dest.out_of_stock_count || 0) >= 2} className="rounded-lg border border-border/50 mt-2" /> : null;
          })()}
          {todayDispatchWarning && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md text-xs mt-2" data-testid="duplicate-dispatch-warning">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span className="text-amber-700 font-medium">{todayDispatchWarning}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stat cards (after dest selected) */}
      {selectedDest && !destLoading && destStock.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mb-4" data-testid="dispatch-stats">
          <Card className={stats.needDispatching > 0 ? "border-l-[3px] border-l-red-500" : ""}>
            <CardContent className="py-2.5 px-3 text-center">
              <p className={`text-xl font-bold tabular-nums ${stats.needDispatching > 0 ? "text-red-600" : ""}`}>{stats.needDispatching}</p>
              <p className="text-[9px] text-muted-foreground uppercase">Need Dispatching</p>
            </CardContent>
          </Card>
          <Card className={stats.partial > 0 ? "border-l-[3px] border-l-amber-500" : ""}>
            <CardContent className="py-2.5 px-3 text-center">
              <p className={`text-xl font-bold tabular-nums ${stats.partial > 0 ? "text-amber-600" : ""}`}>{stats.partial}</p>
              <p className="text-[9px] text-muted-foreground uppercase">Partially Covered</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-2.5 px-3 text-center">
              <p className="text-xl font-bold tabular-nums">{stats.covered}</p>
              <p className="text-[9px] text-muted-foreground uppercase">Fully Covered</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-2.5 px-3 text-center">
              <p className="text-xl font-bold tabular-nums">{dispatchRows.filter(r => r.included).length}</p>
              <p className="text-[9px] text-muted-foreground uppercase">In This Dispatch</p>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedDest && destLoading && (
        <Card className="mb-4"><CardContent className="py-4 text-center">
          <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Analyzing destination stock...</p>
        </CardContent></Card>
      )}

      {/* Integrated dispatch table */}
      {selectedDest && !destLoading && dispatchRows.length > 0 && (
        <Card className="mb-4 border-l-[3px] border-l-amber-500" data-testid="dispatch-needs-table">
          <CardHeader className="py-2.5 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 text-amber-700">
                <Zap className="h-3.5 w-3.5" />
                {hasConsumptionData
                  ? `Dispatch for ${coverageDays}-Day Coverage (${dispatchRows.length} items)`
                  : `Items Below Threshold (${dispatchRows.length})`}
              </CardTitle>
              <span className="text-[10px] text-muted-foreground">
                {hasConsumptionData ? "Based on destination consumption" : "Based on min stock thresholds"}
              </span>
            </div>
          </CardHeader>
          <CardContent className="py-0 px-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px] w-8"></TableHead>
                    <TableHead className="text-[10px]">Item</TableHead>
                    <TableHead className="text-[10px] text-right">Their Stock</TableHead>
                    <TableHead className="text-[10px] text-right">Gap</TableHead>
                    <TableHead className="text-[10px] text-right w-24">Qty to Send</TableHead>
                    <TableHead className="text-[10px]">Source Segment</TableHead>
                    <TableHead className="text-[10px] text-right">Your Stock After</TableHead>
                    <TableHead className="text-[10px]">Suggestion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dispatchRows.map((item, idx) => (
                    <TableRow key={`d-${idx}`} data-testid={`dispatch-row-${idx}`} className={item.isOut ? "bg-red-50/20" : item.isLow ? "bg-amber-50/20" : ""}>
                      <TableCell className="text-center">
                        <input type="checkbox" checked={item.included} onChange={() => updateDispatchRow(idx, "included", !item.included)} className="rounded" data-testid={`dispatch-check-${idx}`} />
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="font-medium">{item.stockTitle}</span>
                        <span className="text-muted-foreground ml-1">{item.unit}</span>
                        {item.isOut && <Badge variant="destructive" className="ml-1 text-[8px] px-1 py-0">OUT</Badge>}
                        {item.isLow && !item.isOut && <Badge className="ml-1 text-[8px] px-1 py-0 bg-amber-100 text-amber-700 border-amber-200">LOW</Badge>}
                      </TableCell>
                      <TableCell className={`text-xs text-right tabular-nums ${item.isOut ? "text-red-600 font-semibold" : item.isLow ? "text-amber-600" : "text-muted-foreground"}`}>
                        {item.destQty} {item.unit}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums font-semibold text-amber-700">
                        {item.idealQty > 0 ? item.idealQty : "—"} {item.idealQty > 0 ? item.unit : ""}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input type="number" min="0" step="any" value={item.qty} onChange={(e) => updateDispatchRow(idx, "qty", e.target.value)} className={`h-7 text-xs w-20 text-right inline-block ${item.exceedsOwn ? "border-red-400" : ""}`} disabled={!item.included || submitting} data-testid={`dispatch-qty-${idx}`} />
                        <span className="text-[10px] text-muted-foreground ml-1">{item.unit}</span>
                        {item.exceedsOwn && (
                          <p className="text-[10px] text-red-600 font-medium mt-0.5" data-testid={`own-stock-warn-${idx}`}>
                            You only have {item.ownQty} {item.unit}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="min-w-[180px]">
                        {item.included && (
                          <SourceSelector
                            fromRestaurantId={restaurantId}
                            inventoryMasterId={Number(item.invMasterId)}
                            value={item.sourceSelector}
                            onChange={(v) => updateDispatchRow(idx, "sourceSelector", v)}
                            disabled={submitting}
                          />
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        <span className={`tabular-nums font-mono ${item.afterDispatch < 0 ? "text-red-600 font-semibold" : "text-muted-foreground"}`}>
                          {item.afterDispatch} {item.unit}
                        </span>
                        {item.afterDispatch >= 0 && item.ownQty > 0 && (
                          <p className="text-[10px] text-muted-foreground">You'll retain {item.retainPct}%</p>
                        )}
                        {item.afterDispatch < 0 && (
                          <p className="text-[10px] text-red-600">Insufficient</p>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[150px]">{item.suggestion}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="px-4 py-2 border-t border-border/50">
              <Button variant="ghost" size="sm" className="text-xs" onClick={addManualRow}>
                <Plus className="h-3 w-3 mr-1" /> Add item manually
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedDest && !destLoading && dispatchRows.length === 0 && destStock.length > 0 && (
        <Card className="mb-4"><CardContent className="py-6 text-center text-muted-foreground text-sm">
          {hasConsumptionData
            ? `All items have sufficient stock for ${coverageDays}-day coverage at this destination.`
            : "No items below threshold at this destination."}
          <br /><Button variant="ghost" size="sm" className="text-xs mt-2" onClick={addManualRow}><Plus className="h-3 w-3 mr-1" /> Add item manually</Button>
        </CardContent></Card>
      )}

      {/* Manual add rows */}
      {manualRows.length > 0 && (
        <Card className="mb-4">
          <CardHeader className="py-2.5 px-4"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Additional Items</CardTitle></CardHeader>
          <CardContent className="py-0 px-4 space-y-3 pb-4">
            {manualRows.map((row, idx) => {
              const selectedItem = allItems.find(i => String(i.id) === String(row.itemId));
              const qtyErr = row.quantity && validateQuantityForUnit(row.quantity, row.unit);
              return (
                <div key={`m-${idx}`} className="border rounded-md p-3 space-y-2" data-testid={`manual-dispatch-row-${idx}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground">Manual Item {idx + 1}</span>
                    <button type="button" onClick={() => removeManualRow(idx)} className="text-destructive hover:text-destructive/80" disabled={submitting}><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                  <Select value={row.itemId ? String(row.itemId) : ""} onValueChange={(v) => updateManualRow(idx, "itemId", v)} disabled={submitting}>
                    <SelectTrigger className="text-xs"><SelectValue placeholder="Select item" /></SelectTrigger>
                    <SelectContent>
                      {allItems.map(item => (
                        <SelectItem key={item.id} value={String(item.id)}>{item.stock_title} ({item.unit})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px]">Quantity *</Label>
                      <Input type="number" min="0" step="any" value={row.quantity} onChange={(e) => updateManualRow(idx, "quantity", e.target.value)} className="h-7 text-xs" disabled={submitting} />
                      {qtyErr && <p className="text-[10px] text-destructive mt-0.5">{qtyErr}</p>}
                    </div>
                    <div>
                      <Label className="text-[10px]">Unit</Label>
                      <Input value={row.unit || "—"} className="h-7 text-xs bg-muted" readOnly />
                    </div>
                  </div>
                  {row.itemId && (
                    <div>
                      <Label className="text-[10px]">Source *</Label>
                      <SourceSelector fromRestaurantId={restaurantId} inventoryMasterId={Number(row.itemId)} value={row.sourceSelector} onChange={(v) => updateManualRow(idx, "sourceSelector", v)} disabled={submitting} />
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Review warnings */}
      {reviewWarnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4" data-testid="review-warnings">
          <p className="text-xs font-semibold text-amber-800 mb-1">Review:</p>
          {reviewWarnings.map((r, i) => (
            <p key={i} className="text-[11px] text-amber-700">
              {r.stockTitle}: qty ({r.qty} {r.unit}) exceeds your stock ({r.ownQty} {r.unit}) — reduce to max {r.ownQty}
            </p>
          ))}
        </div>
      )}

      {/* Order summary */}
      {allIncluded.length > 0 && (
        <Card className="mb-4" data-testid="dispatch-order-summary">
          <CardContent className="py-3 px-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Order Summary</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
              {includedRows.map(r => (
                <span key={r.invMasterId} className="text-xs tabular-nums"><span className="font-medium">{r.stockTitle}</span> <span className="text-muted-foreground">{r.qty} {r.unit}</span></span>
              ))}
              {validManualRows.map((r, i) => {
                const item = allItems.find(it => String(it.id) === String(r.itemId));
                return <span key={`m-${i}`} className="text-xs tabular-nums"><span className="font-medium">{item?.stock_title || "Item"}</span> <span className="text-muted-foreground">{r.quantity} {r.unit}</span></span>;
              })}
            </div>
            <p className="text-[10px] text-muted-foreground">{allIncluded.length} item{allIncluded.length !== 1 ? "s" : ""} to {destName}</p>
          </CardContent>
        </Card>
      )}

      <Button data-testid="dispatch-submit" onClick={handleSubmit} disabled={allIncluded.length === 0 || submitting} className="w-full">
        {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Create Dispatch{allIncluded.length > 0 ? ` (${allIncluded.length} items)` : ""}
      </Button>
      <p className="text-[10px] text-muted-foreground text-center mt-2" data-testid="po-auto-note">A PO will be auto-generated for {destName || "the destination"} on dispatch creation</p>
    </div>
  );
}
