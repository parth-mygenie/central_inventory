import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLoginContext } from "@/hooks/useLoginContext";
import { useWriteAction } from "@/hooks/useWriteAction";
import api from "@/services/api";
import { mapRestaurantType } from "@/lib/terminology";
import { validateQuantityForUnit } from "@/lib/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingState, PermissionDenied } from "@/components/common/StateDisplays";
import { ArrowLeft, Plus, Trash2, Loader2, SendHorizonal, AlertCircle, Store, Info, AlertTriangle, Package, Zap } from "lucide-react";

const RELATION_LABELS = {
  direct_parent: "Direct Parent",
  upstream_master: "Upstream Central",
  sibling_central: "Sibling",
};

export default function RequestStockForm() {
  const navigate = useNavigate();
  const { canDo } = useLoginContext();
  const { submitting, execute } = useWriteAction();

  // G1: Mode toggle
  const [mode, setMode] = useState("suggested");

  // Step 1: Sources
  const [sources, setSources] = useState([]);
  const [selectedSourceId, setSelectedSourceId] = useState(null);
  const [loadingSources, setLoadingSources] = useState(true);
  const [sourcesError, setSourcesError] = useState(null);

  // Step 2: Catalog from selected source
  const [catalog, setCatalog] = useState([]);
  const [catalogSource, setCatalogSource] = useState(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalogError, setCatalogError] = useState(null);

  // Step 3: Manual mode item rows
  const [rows, setRows] = useState([emptyRow()]);

  // Own stock for intelligence
  const [ownStock, setOwnStock] = useState([]);
  useEffect(() => {
    api.getStockInventory()
      .then(r => setOwnStock(r.data?.current_stocks || []))
      .catch(() => {});
  }, []);

  // G6: Pending request count for selected source
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  useEffect(() => {
    if (!selectedSourceId) { setPendingRequestCount(0); return; }
    api.getTransferHistory().then(resp => {
      const hist = resp.data?.data || resp.data || [];
      const pending = (Array.isArray(hist) ? hist : []).filter(t =>
        String(t.from_restaurant_id) === String(selectedSourceId) &&
        ["requested", "approved"].includes(t.status) &&
        t.type === "request"
      );
      setPendingRequestCount(pending.length);
    }).catch(() => {});
  }, [selectedSourceId]);

  // Load request-sources on mount
  useEffect(() => {
    let cancelled = false;
    setLoadingSources(true);
    setSourcesError(null);
    api.requestSources()
      .then((resp) => {
        if (cancelled) return;
        const data = resp.data?.data || resp.data;
        const list = data?.sources || [];
        setSources(list);
        const def = list.find((s) => s.is_direct_parent) || list[0];
        if (def) setSelectedSourceId(def.restaurant_id);
      })
      .catch((err) => {
        if (cancelled) return;
        setSourcesError(err?.response?.data?.message || "Failed to load request sources");
      })
      .finally(() => { if (!cancelled) setLoadingSources(false); });
    return () => { cancelled = true; };
  }, []);

  // Load catalog when source changes
  useEffect(() => {
    if (!selectedSourceId) {
      setCatalog([]);
      setCatalogSource(null);
      return;
    }
    let cancelled = false;
    setLoadingCatalog(true);
    setCatalogError(null);
    setCatalog([]);
    setCatalogSource(null);
    setRows([emptyRow()]);

    api.requestCatalog(selectedSourceId)
      .then((resp) => {
        if (cancelled) return;
        const data = resp.data?.data || resp.data;
        setCatalog(data?.items || []);
        setCatalogSource(data?.source_restaurant || null);
      })
      .catch((err) => {
        if (cancelled) return;
        setCatalogError(err?.response?.data?.message || "Failed to load catalog");
      })
      .finally(() => { if (!cancelled) setLoadingCatalog(false); });
    return () => { cancelled = true; };
  }, [selectedSourceId]);

  // G2 + G3: Compute stock health stats + suggested items
  const stockHealth = useMemo(() => {
    if (!ownStock.length) return { outCount: 0, lowCount: 0, adequateCount: 0, total: 0 };
    let outCount = 0, lowCount = 0, adequateCount = 0;
    ownStock.forEach(item => {
      const qty = item.display_qty ?? item.cal_quantity ?? 0;
      if (qty === 0) outCount++;
      else if (item.is_low_stock) lowCount++;
      else adequateCount++;
    });
    return { outCount, lowCount, adequateCount, total: ownStock.length };
  }, [ownStock]);

  // G3: Suggested items — cross-ref ownStock (low/out) with catalog (source availability)
  const suggestedItems = useMemo(() => {
    if (!ownStock.length || !catalog.length) return [];
    const lowOrOut = ownStock.filter(s => s.is_low_stock || (s.display_qty ?? 0) === 0);
    return lowOrOut.map(item => {
      const catalogItem = catalog.find(c =>
        (c.stock_title || "").toLowerCase() === (item.stock_title || "").toLowerCase()
      );
      if (!catalogItem) return null;
      const yourQty = item.display_qty ?? 0;
      const minQty = item.min_qty_alert ?? 0;
      const gap = minQty > 0 ? Math.max(0, minQty - yourQty) : 0;
      const sourceAvail = catalogItem.available_display_qty ?? null;
      const isOut = yourQty === 0;
      const isLow = item.is_low_stock && yourQty > 0;
      const category = catalogItem.category_name || item.category_name || "Uncategorized";
      return {
        id: catalogItem.source_inventory_master_id,
        stockTitle: item.stock_title,
        unit: catalogItem.unit || catalogItem.display_unit || item.display_unit || "",
        unitId: catalogItem.unit_id || null,
        category,
        yourQty,
        minQty,
        gap,
        sourceAvail,
        isOut,
        isLow,
        suggestedQty: gap > 0 ? gap : (minQty > 0 ? minQty : 1),
        qty: gap > 0 ? String(gap) : (minQty > 0 ? String(minQty) : "1"),
        included: true,
      };
    }).filter(Boolean).sort((a, b) => {
      if (a.isOut && !b.isOut) return -1;
      if (!a.isOut && b.isOut) return 1;
      return b.gap - a.gap;
    });
  }, [ownStock, catalog]);

  // G3: State for editable suggested items
  const [suggestedRows, setSuggestedRows] = useState([]);
  useEffect(() => {
    setSuggestedRows(suggestedItems.map(item => ({ ...item })));
  }, [suggestedItems]);

  const updateSuggestedRow = (idx, field, value) => {
    setSuggestedRows(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  // G4: Group suggested items by category
  const groupedSuggested = useMemo(() => {
    const groups = {};
    suggestedRows.forEach((item, idx) => {
      const cat = item.category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push({ ...item, _idx: idx });
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [suggestedRows]);

  const includedSuggested = suggestedRows.filter(r => r.included && Number(r.qty) > 0);

  if (!canDo("request-stock")) return <PermissionDenied />;
  if (loadingSources) return <LoadingState lines={4} />;

  if (sourcesError) {
    return (
      <div data-testid="request-stock-form">
        <BackButton navigate={navigate} />
        <Card><CardContent className="py-6 text-center">
          <AlertCircle className="h-5 w-5 text-destructive mx-auto mb-2" />
          <p className="text-sm text-destructive" data-testid="sources-error">{sourcesError}</p>
        </CardContent></Card>
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <div data-testid="request-stock-form">
        <BackButton navigate={navigate} />
        <Card><CardContent className="py-6 text-center text-muted-foreground text-sm" data-testid="no-sources">
          No sources available for stock requests.
        </CardContent></Card>
      </div>
    );
  }

  const selectedSource = sources.find((s) => s.restaurant_id === selectedSourceId);
  const canSubmitToSelected = selectedSource?.can_submit_request !== false;
  const catalogCanSubmit = catalogSource?.can_submit_request !== false;
  const submitAllowed = canSubmitToSelected && catalogCanSubmit;

  const addRow = () => setRows((r) => [...r, emptyRow()]);
  const removeRow = (idx) => setRows((r) => r.filter((_, i) => i !== idx));
  const updateRow = (idx, field, value) => {
    setRows((r) => {
      const next = [...r];
      next[idx] = { ...next[idx], [field]: value };
      if (field === "itemId") {
        const item = catalog.find((i) => String(i.source_inventory_master_id) === String(value));
        next[idx].unit = item?.unit || item?.display_unit || "";
        next[idx].unitId = item?.unit_id || null;
      }
      return next;
    });
  };

  // Submit handler — works for both modes
  const handleSubmit = () => {
    const isDefaultParent = selectedSource?.is_direct_parent;
    let payloadItems;

    if (mode === "suggested") {
      payloadItems = includedSuggested.map(r => ({
        source_inventory_master_id: Number(r.id),
        stock_title: r.stockTitle,
        quantity: Number(r.qty),
        unit: r.unit,
      }));
    } else {
      payloadItems = rows.map((r) => {
        const item = catalog.find((i) => String(i.source_inventory_master_id) === String(r.itemId));
        return {
          source_inventory_master_id: Number(r.itemId),
          stock_title: item?.stock_title || "",
          quantity: Number(r.quantity),
          unit: item?.unit || r.unit,
        };
      });
    }

    if (payloadItems.length === 0) return;

    execute(
      () => api.requestStock({
        items: payloadItems,
        fromRestaurantId: isDefaultParent ? undefined : selectedSourceId,
      }),
      {
        successMsg: "Stock request submitted",
        onSuccess: (resp) => {
          const d = resp?.data?.data || resp?.data;
          const newId = d?.transfer_id || d?.id;
          navigate(newId ? `/transfer/${newId}` : "/queues");
        },
      }
    );
  };

  // Validation per mode
  const manualValid = rows.length > 0 && submitAllowed && rows.every(
    (r) => r.itemId && Number(r.quantity) > 0 && !validateQuantityForUnit(r.quantity, r.unit)
  );
  const suggestedValid = includedSuggested.length > 0 && submitAllowed;
  const allValid = mode === "suggested" ? suggestedValid : manualValid;

  return (
    <div data-testid="request-stock-form">
      <BackButton navigate={navigate} />
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <SendHorizonal className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold">Request Stock</h1>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        {mode === "suggested" ? "Items below minimum stock detected. Review and submit" : "Manually select items to request"}
      </p>

      {/* G2: Stock health stat cards */}
      {ownStock.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mb-4" data-testid="stock-health-stats">
          <Card className={stockHealth.outCount > 0 ? "border-l-[3px] border-l-red-500" : ""}>
            <CardContent className="py-2.5 px-3 text-center">
              <p className={`text-xl font-bold tabular-nums ${stockHealth.outCount > 0 ? "text-red-600" : ""}`}>{stockHealth.outCount}</p>
              <p className="text-[9px] text-muted-foreground uppercase">Out of Stock</p>
            </CardContent>
          </Card>
          <Card className={stockHealth.lowCount > 0 ? "border-l-[3px] border-l-amber-500" : ""}>
            <CardContent className="py-2.5 px-3 text-center">
              <p className={`text-xl font-bold tabular-nums ${stockHealth.lowCount > 0 ? "text-amber-600" : ""}`}>{stockHealth.lowCount}</p>
              <p className="text-[9px] text-muted-foreground uppercase">Low Stock</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-2.5 px-3 text-center">
              <p className="text-xl font-bold tabular-nums">{stockHealth.adequateCount}</p>
              <p className="text-[9px] text-muted-foreground uppercase">Adequate</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-2.5 px-3 text-center">
              <p className="text-xl font-bold tabular-nums">{suggestedRows.filter(r => r.included).length}</p>
              <p className="text-[9px] text-muted-foreground uppercase">Suggested</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 1: Source Picker */}
      <SourcePicker
        sources={sources}
        selectedSourceId={selectedSourceId}
        onSourceChange={setSelectedSourceId}
        canSubmitToSelected={canSubmitToSelected}
        pendingRequestCount={pendingRequestCount}
        disabled={submitting}
      />

      {/* G1: Mode toggle */}
      {catalog.length > 0 && (
        <div className="mb-4">
          <Tabs value={mode} onValueChange={setMode}>
            <TabsList data-testid="request-mode-tabs">
              <TabsTrigger value="suggested" className="gap-1.5 text-xs" data-testid="tab-suggested">
                <Zap className="h-3.5 w-3.5" /> Suggested Reorder
                {suggestedRows.length > 0 && (
                  <span className="ml-1 bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded-full">{suggestedRows.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="manual" className="gap-1.5 text-xs" data-testid="tab-manual">
                <Package className="h-3.5 w-3.5" /> Manual Request
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Step 2 + 3 */}
      {loadingCatalog ? (
        <LoadingState lines={3} />
      ) : catalogError ? (
        <Card className="mb-4"><CardContent className="py-4 text-center">
          <p className="text-sm text-destructive" data-testid="catalog-error">{catalogError}</p>
        </CardContent></Card>
      ) : catalog.length === 0 && selectedSourceId ? (
        <Card className="mb-4"><CardContent className="py-4 text-center text-muted-foreground text-sm" data-testid="no-catalog-items">
          No items available at the selected source store.
        </CardContent></Card>
      ) : catalog.length > 0 ? (
        <>
          {/* ═══ SUGGESTED REORDER MODE ═══ */}
          {mode === "suggested" && (
            <>
              {suggestedRows.length === 0 ? (
                <Card className="mb-4"><CardContent className="py-6 text-center text-muted-foreground text-sm">
                  All items are adequately stocked. Switch to Manual Request to order specific items.
                </CardContent></Card>
              ) : (
                <Card className="mb-4 border-l-[3px] border-l-amber-500" data-testid="suggested-items-table">
                  <CardHeader className="py-2.5 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 text-amber-700">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Suggested Items ({suggestedRows.length})
                      </CardTitle>
                      <span className="text-[10px] text-muted-foreground">Auto-detected from your stock levels</span>
                    </div>
                  </CardHeader>
                  <CardContent className="py-0 px-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-[10px] w-8"></TableHead>
                            <TableHead className="text-[10px]">Item</TableHead>
                            <TableHead className="text-[10px]">Category</TableHead>
                            <TableHead className="text-[10px] text-right">Your Stock</TableHead>
                            <TableHead className="text-[10px] text-right">Source Avail</TableHead>
                            <TableHead className="text-[10px] text-right w-24">Order Qty</TableHead>
                            <TableHead className="text-[10px]">Suggestion</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {groupedSuggested.map(([category, items]) => (
                            <React.Fragment key={`group-${category}`}>
                              {/* G4: Category group header */}
                              <TableRow className="bg-muted/40">
                                <TableCell colSpan={7} className="py-1.5 px-4">
                                  <span className="text-[11px] font-semibold">{category}</span>
                                  <span className="text-[10px] text-muted-foreground ml-2">{items.length} item{items.length !== 1 ? "s" : ""}</span>
                                </TableCell>
                              </TableRow>
                              {items.map((item) => {
                                const exceedsSource = item.sourceAvail != null && Number(item.qty) > item.sourceAvail;
                                return (
                                  <TableRow key={`item-${item._idx}`} data-testid={`suggested-row-${item._idx}`} className={item.isOut ? "bg-red-50/20" : item.isLow ? "bg-amber-50/20" : ""}>
                                    <TableCell className="text-center">
                                      <input
                                        type="checkbox"
                                        checked={item.included}
                                        onChange={() => updateSuggestedRow(item._idx, "included", !item.included)}
                                        className="rounded"
                                        data-testid={`suggested-check-${item._idx}`}
                                      />
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      <span className="font-medium">{item.stockTitle}</span>
                                      <span className="text-muted-foreground ml-1">{item.unit}</span>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{item.category}</TableCell>
                                    <TableCell className="text-xs text-right">
                                      <span className={`tabular-nums ${item.isOut ? "text-red-600 font-semibold" : item.isLow ? "text-amber-600 font-semibold" : ""}`}>
                                        {item.yourQty} {item.unit}
                                      </span>
                                      {item.isOut && (
                                        <Badge variant="destructive" className="ml-1 text-[8px] px-1 py-0">OUT</Badge>
                                      )}
                                      {item.isLow && !item.isOut && (
                                        <Badge className="ml-1 text-[8px] px-1 py-0 bg-amber-100 text-amber-700 border-amber-200">LOW</Badge>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-xs text-right">
                                      {item.sourceAvail != null ? (
                                        <span className={`tabular-nums ${item.sourceAvail === 0 ? "text-red-600" : ""}`}>
                                          {item.sourceAvail} {item.unit}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground">—</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Input
                                        type="number" min="0" step="any"
                                        value={item.qty}
                                        onChange={(e) => updateSuggestedRow(item._idx, "qty", e.target.value)}
                                        className={`h-7 text-xs w-20 text-right inline-block ${exceedsSource ? "border-amber-400" : ""}`}
                                        disabled={!item.included || submitting}
                                        data-testid={`suggested-qty-${item._idx}`}
                                      />
                                      <span className="text-[10px] text-muted-foreground ml-1">{item.unit}</span>
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      {item.gap > 0 && (
                                        <span className="text-muted-foreground">Gap to min: {item.gap}</span>
                                      )}
                                      {exceedsSource && (
                                        <p className="text-[10px] text-amber-600 font-medium mt-0.5" data-testid={`source-warn-${item._idx}`}>
                                          Source has only {item.sourceAvail}
                                        </p>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </React.Fragment>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {/* G8: Source stock cross-validation warnings */}
                    {suggestedRows.some(r => r.included && r.sourceAvail != null && Number(r.qty) > r.sourceAvail) && (
                      <div className="px-4 py-2 border-t border-border/50 bg-amber-50/50">
                        <p className="text-[10px] text-amber-700 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          {suggestedRows.filter(r => r.included && r.sourceAvail != null && Number(r.qty) > r.sourceAvail).map(r =>
                            `${r.stockTitle} qty (${r.qty} ${r.unit}) exceeds source availability (${r.sourceAvail} ${r.unit})`
                          ).join("; ")}
                        </p>
                      </div>
                    )}
                    <div className="px-4 py-2 border-t border-border/50">
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => setMode("manual")}>
                        <Plus className="h-3 w-3 mr-1" /> Add item manually
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* G7: Order summary */}
              {includedSuggested.length > 0 && (
                <Card className="mb-4" data-testid="order-summary">
                  <CardContent className="py-3 px-4">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
                      {includedSuggested.map(r => (
                        <span key={r.id} className="text-xs tabular-nums">
                          <span className="font-medium">{r.stockTitle}</span> <span className="text-muted-foreground">{r.qty} {r.unit}</span>
                        </span>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{includedSuggested.length} item{includedSuggested.length !== 1 ? "s" : ""}</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* ═══ MANUAL REQUEST MODE ═══ */}
          {mode === "manual" && (
            <ItemsCard
              rows={rows}
              catalog={catalog}
              addRow={addRow}
              removeRow={removeRow}
              updateRow={updateRow}
              submitting={submitting}
            />
          )}

          <Button data-testid="request-submit" onClick={handleSubmit} disabled={!allValid || submitting} className="w-full">
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Submit Request{mode === "suggested" && includedSuggested.length > 0 ? ` (${includedSuggested.length} items)` : ""}
          </Button>
        </>
      ) : null}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────

function emptyRow() {
  return { itemId: "", quantity: "", unit: "", unitId: null };
}

function BackButton({ navigate }) {
  return (
    <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors" data-testid="request-back-btn">
      <ArrowLeft className="h-3.5 w-3.5" /> Back
    </button>
  );
}

function SourcePicker({ sources, selectedSourceId, onSourceChange, canSubmitToSelected, pendingRequestCount, disabled }) {
  return (
    <Card className="mb-4">
      <CardHeader className="py-2.5 px-4">
        <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Request From</CardTitle>
      </CardHeader>
      <CardContent className="py-0 px-4 pb-3">
        <Select
          value={selectedSourceId ? String(selectedSourceId) : ""}
          onValueChange={(v) => onSourceChange(Number(v))}
          disabled={disabled}
        >
          <SelectTrigger data-testid="request-source-select" className="text-xs">
            <SelectValue placeholder="Select source store" />
          </SelectTrigger>
          <SelectContent>
            {sources.map((src) => (
              <SelectItem key={src.restaurant_id} value={String(src.restaurant_id)} data-testid={`source-option-${src.restaurant_id}`}>
                <span className="flex items-center gap-1.5">
                  <Store className="h-3 w-3 flex-shrink-0" />
                  {src.name} ({mapRestaurantType(src.restaurant_type)})
                  <span className="text-muted-foreground ml-1">
                    — {RELATION_LABELS[src.relation] || src.relation}
                  </span>
                  {!src.can_submit_request && (
                    <span className="text-destructive text-[10px] ml-1">(blocked)</span>
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* G6: Pending requests warning */}
        {pendingRequestCount > 0 && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 rounded p-2" data-testid="pending-requests-warning">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{pendingRequestCount} pending request{pendingRequestCount > 1 ? "s" : ""} with this source</span>
          </div>
        )}

        {!canSubmitToSelected && selectedSourceId && (
          <div className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-700 bg-amber-50 rounded p-2" data-testid="cross-branch-warning">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <span>
              Cross-branch requests to this store are currently disabled.
              Contact your Central Store administrator to enable cross-branch transfers.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ItemsCard({ rows, catalog, addRow, removeRow, updateRow, submitting }) {
  return (
    <Card className="mb-4">
      <CardHeader className="py-2.5 px-4">
        <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Items</CardTitle>
      </CardHeader>
      <CardContent className="py-0 px-4 space-y-3 pb-4">
        {rows.map((row, idx) => (
          <ItemRow
            key={`item-${idx}-${row.itemId || 'empty'}`}
            idx={idx}
            row={row}
            catalog={catalog}
            totalRows={rows.length}
            removeRow={removeRow}
            updateRow={updateRow}
            submitting={submitting}
          />
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={submitting} data-testid="request-add-item" className="text-xs">
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
        </Button>
      </CardContent>
    </Card>
  );
}

function ItemRow({ idx, row, catalog, totalRows, removeRow, updateRow, submitting }) {
  const qtyErr = row.quantity && validateQuantityForUnit(row.quantity, row.unit);
  const selectedItem = catalog.find((i) => String(i.source_inventory_master_id) === String(row.itemId));
  const exceedsSource = selectedItem?.available_display_qty != null && Number(row.quantity) > selectedItem.available_display_qty;

  return (
    <div className="border rounded-md p-3 space-y-2" data-testid={`request-item-row-${idx}`}>
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-muted-foreground">Item {idx + 1}</span>
        {totalRows > 1 && (
          <button type="button" onClick={() => removeRow(idx)} className="text-destructive hover:text-destructive/80" disabled={submitting} data-testid={`request-remove-item-${idx}`}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <Select
        value={row.itemId ? String(row.itemId) : ""}
        onValueChange={(v) => updateRow(idx, "itemId", v)}
        disabled={submitting}
      >
        <SelectTrigger data-testid={`request-item-select-${idx}`} className="text-xs">
          <SelectValue placeholder="Select item from source" />
        </SelectTrigger>
        <SelectContent>
          {catalog.map((item) => (
            <SelectItem key={item.source_inventory_master_id} value={String(item.source_inventory_master_id)}>
              {item.stock_title} ({item.unit || item.display_unit})
              {item.available_display_qty != null && (
                <span className="text-muted-foreground"> — {item.available_display_qty} avail</span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px]">Quantity *</Label>
          <Input
            data-testid={`request-qty-${idx}`}
            type="number" min="0" step="any"
            value={row.quantity}
            onChange={(e) => updateRow(idx, "quantity", e.target.value)}
            className={`h-7 text-xs ${exceedsSource ? "border-amber-400" : ""}`}
            disabled={submitting}
          />
          {qtyErr && <p className="text-[10px] text-destructive mt-0.5">{qtyErr}</p>}
          {selectedItem?.available_display_qty != null && (
            <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1" data-testid={`request-avail-hint-${idx}`}>
              <Info className="h-3 w-3" />
              Source has ~{selectedItem.available_display_qty} {selectedItem.unit || selectedItem.display_unit}
            </p>
          )}
          {exceedsSource && (
            <p className="text-[10px] text-amber-600 font-medium mt-0.5" data-testid={`request-exceeds-warn-${idx}`}>
              Qty exceeds source availability ({selectedItem.available_display_qty} {selectedItem.unit})
            </p>
          )}
        </div>
        <div>
          <Label className="text-[10px]">Unit</Label>
          <Input value={row.unit || "—"} className="h-7 text-xs bg-muted" readOnly data-testid={`request-unit-${idx}`} />
        </div>
      </div>
    </div>
  );
}
