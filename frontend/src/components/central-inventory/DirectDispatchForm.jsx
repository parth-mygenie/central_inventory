import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom"; // BUG-053: useSearchParams removed (BUG-033 wire removed)
import { useLoginContext } from "@/hooks/useLoginContext";
import { useWriteAction } from "@/hooks/useWriteAction";
import api from "@/services/api";
import { mapRestaurantType } from "@/lib/terminology";
import { validateQuantityForUnit, parseConsumedQty, normalizeToDisplayUnit } from "@/lib/formatters"; // BUG-036
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
import { ArrowLeft, Plus, Loader2, Truck, AlertTriangle, Calendar } from "lucide-react"; // BUG-053: removed Trash2, Package, Zap (unused after manual rows removed)

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

  // CR-050 — category grouping + filter state
  const [collapsedCats, setCollapsedCats] = useState({});
  const [filterStatus, setFilterStatus]   = useState("all"); // "all" | "out" | "low"
  const [filterCat, setFilterCat]         = useState("all"); // category name or "all"
  const [searchText, setSearchText]       = useState("");

  // CR-050 — FEFO auto-select: sort by expiry ASC, greedy allocate, skip expired + un-batched
  function fefoAutoSelect(segments, sendQty) {
    const eligible = (segments || [])
      .filter(s => s.segment_id !== null)
      .filter(s => !s.expiry_date || new Date(s.expiry_date + "T23:59:59") > new Date())
      .sort((a, b) => new Date(a.expiry_date || "9999") - new Date(b.expiry_date || "9999"));
    let remaining = Number(sendQty) || 0;
    const allocs = [];
    for (const seg of eligible) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, Number(seg.display_qty) || 0);
      if (take > 0) {
        allocs.push({ segment_id: seg.segment_id, qty: take,
                      batch: seg.batch, expiry: seg.expiry_date,
                      available: Number(seg.display_qty) });
        remaining -= take;
      }
    }
    return { allocations: allocs, short: remaining > 0 };
  }

  // CR-050 — filter + group rows for category-grouped rendering
  function getFilteredGrouped(rows) {
    const q = searchText.toLowerCase();
    const filtered = rows.filter(r => {
      if (filterStatus === "out" && !r.isOut) return false;
      if (filterStatus === "low" && !r.isLow) return false;
      if (filterCat !== "all" && r.category !== filterCat) return false;
      if (q && !(r.stockTitle || "").toLowerCase().includes(q)) return false;
      return true;
    });
    const groups = {};
    filtered.forEach(r => { const c = r.category || "Other"; (groups[c] = groups[c] || []).push(r); });
    return groups;
  }

  // Load destinations + inventory master
  useEffect(() => {
    let cancelled = false;
    setLoadingData(true);
    Promise.all([
      api.getHierarchySummary({ storeType: "central" }),
      api.getHierarchySummary({ storeType: "franchise" }),
    ]).then(([centralResp, franchiseResp]) => { // BUG-053: getInventoryMaster removed — allItems no longer needed
      if (cancelled) return;
      setDestinations([
        ...(centralResp.data?.data?.stores || []),
        ...(franchiseResp.data?.data?.stores || []),
      ]);
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
      api.getStockInventory({ includeSegments: true }), // CR-050 — burst fix: segments_preview in one call
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
    // BUG-036: Parse unit from total_consumed string, store { dailyQty, unit }
    destConsumption.forEach(item => {
      const name = (item.ingredient_name || "").toLowerCase();
      const parsed = parseConsumedQty(item.total_consumed);
      if (name && parsed.value > 0) map[name] = { dailyQty: parsed.value / destConsumptionDays, unit: parsed.unit };
    });
    return map;
  }, [destConsumption, destConsumptionDays]);

  const hasConsumptionData = Object.keys(destConsumptionMap).length > 0;

  // Compute dispatch items — BUG-053: iterate ownStock (all items), show ALL regardless of need
  const dispatchNeeds = useMemo(() => {
    if (!ownStock.length) return [];
    return ownStock.map(ownItem => {
      const name = (ownItem.stock_title || "").toLowerCase();
      // Look up destination qty for this item (0 if item not at destination)
      const destItem = destStock.find(d => (d.stock_title || "").toLowerCase() === name);
      const destQty = parseFloat(destItem?.display_quantity) || 0;
      const minQty  = parseFloat(destItem?.min_qty_alert || ownItem.min_qty_alert) || 0;
      // CI-R3: display_qty is a string — always Number() wrap
      const ownQty = Number(ownItem.display_qty) || 0;
      const invMasterId = ownItem.id;

      // BUG-036: Normalize consumption to item's display unit before calculation
      const cEntry = destConsumptionMap[name];
      const avgDaily = cEntry ? normalizeToDisplayUnit(cEntry.dailyQty, cEntry.unit, ownItem.display_unit || ownItem.unit || "") : 0;

      let qtyToSend = 0;
      let daysOfCover = null;
      let suggestion = "";
      let urgency = 0;

      if (avgDaily > 0) {
        daysOfCover = destQty / avgDaily;
        const projectedNeed = avgDaily * coverageDays;
        qtyToSend = Math.max(0, Math.ceil(projectedNeed - destQty)); // CR-050 — integer ceiling
        if (qtyToSend > 0) {
          suggestion = daysOfCover < 1
            ? `< 1 day cover at dest, sending for ${coverageDays}d`
            : `~${Math.round(daysOfCover)}d cover, sending for ${coverageDays}d`;
          urgency = daysOfCover < 1 ? 100 : 50 + (coverageDays - daysOfCover);
        }
      } else if (minQty > 0 && destQty < minQty) {
        qtyToSend = Math.ceil(minQty - destQty); // CR-050 — integer ceiling
        suggestion = `Gap to min: ${qtyToSend} ${ownItem.unit || ""}`;
        urgency = destQty === 0 ? 80 : 40;
      }
      // BUG-053: NO early return for qtyToSend=0 — all items stay visible (OK items)

      const cappedQty = Math.min(Math.max(qtyToSend, 0), ownQty);
      const exceedsOwn = qtyToSend > 0 && qtyToSend > ownQty;
      const afterDispatch = Math.round((ownQty - cappedQty) * 100) / 100;
      const retainPct = ownQty > 0 ? Math.round((afterDispatch / ownQty) * 100) : 0;

      // CR-050 — segments from includeSegments:true + FEFO auto-select
      const ownSegments = ownItem?.segments_preview || [];
      const isUnbatched = ownSegments.length > 0 && ownSegments.every(s => s.segment_id === null);
      const { allocations: fefoAllocs, short: fefoShort } = fefoAutoSelect(ownSegments, cappedQty);
      const autoSource = fefoAllocs.length === 1
        ? { mode: "segment_id", segment_id: fefoAllocs[0].segment_id }
        : null;

      const isOut = destQty === 0 && (avgDaily > 0 || minQty > 0);
      const isLow = !isOut && qtyToSend > 0 && (
        (ownItem.is_low_stock) ||
        (destItem?.is_low_stock) ||
        (daysOfCover !== null && daysOfCover < coverageDays) ||
        (minQty > 0 && destQty < minQty && destQty > 0)
      );

      return {
        invMasterId,
        stockTitle: ownItem.stock_title,
        unit: ownItem.display_unit || ownItem.unit || "",
        category: ownItem.category_name || destItem?.category_name || "",
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
        isOut,
        isLow,
        qty: cappedQty > 0 ? String(cappedQty) : "",
        sourceSelector: autoSource,
        included: false,           // CR-050 — default unchecked; storekeeper opts in
        segments_preview: ownSegments, // CR-050
        isUnbatched,               // CR-050
        fefoAllocs,                // CR-050
        fefoShort,                 // CR-050
        sourceManuallySet: false,  // CR-050
      };
    })
      .filter((item, idx, arr) => arr.findIndex(x => x.invMasterId === item.invMasterId) === idx)
      .sort((a, b) => {
        if (a.isOut && !b.isOut) return -1;
        if (!a.isOut && b.isOut) return 1;
        if (a.isLow && !b.isLow) return -1;
        if (!a.isLow && b.isLow) return 1;
        return b.urgency - a.urgency;
      });
  }, [destStock, ownStock, destConsumptionMap, coverageDays]);

  // Editable state
  const [dispatchRows, setDispatchRows] = useState([]);
  useEffect(() => {
    setDispatchRows(dispatchNeeds.map(item => ({ ...item })));
  }, [dispatchNeeds]);

  // BUG-053: BUG-033 pre-select wire removed — all items now visible in dispatch list

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
        // CR-050 — re-run FEFO on qty change
        const { allocations, short } = fefoAutoSelect(row.segments_preview || [], q);
        row.fefoAllocs = allocations;
        row.fefoShort  = short;
        if (allocations.length === 1 && !row.sourceManuallySet) {
          row.sourceSelector = { mode: "segment_id", segment_id: allocations[0].segment_id };
        }
      } else {
        row[field] = value;
        if (field === "sourceSelector") row.sourceManuallySet = true; // CR-050 — storekeeper override
      }
      next[idx] = row;
      return next;
    });
  };

  // CR-050 — compact health strip stats (replaces 4 KPI tile cards)
  const healthStats = useMemo(() => {
    let outCount = 0, lowCount = 0, okCount = 0;
    dispatchRows.forEach(r => {
      if (r.isOut) outCount++;
      else if (r.isLow) lowCount++;
      else okCount++;
    });
    return { outCount, lowCount, okCount };
  }, [dispatchRows]);

  const includedRows = dispatchRows.filter(r => r.included && Number(r.qty) > 0 && r.sourceSelector);
  const allIncluded = includedRows; // BUG-053: manual rows removed
  const reviewWarnings = dispatchRows.filter(r => r.included && r.exceedsOwn && Number(r.qty) > 0);

  if (!canDo("dispatch")) return <PermissionDenied />;
  if (loadingData) return <LoadingState lines={4} />;

  const handleSubmit = () => {
    if (!selectedDest || allIncluded.length === 0) return;
    const payloadItems = includedRows.map(r => ({ // BUG-053: manual rows removed
      source_inventory_master_id: Number(r.invMasterId),
      quantity: Number(r.qty),
      unit: r.unit,
      source_selector: r.sourceSelector,
    }));
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
      {/* BUG-053 — compact inline header: Back + title + dest selector + coverage pills */}
      <div className="flex items-center gap-2 mb-3 border border-border rounded-lg px-3 py-2 bg-background flex-wrap">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
        <div className="w-px h-4 bg-border shrink-0" />
        <div className="flex items-center gap-1.5 shrink-0">
          <Truck className="h-4 w-4 text-primary" />
          <span className="font-bold text-sm">Direct Dispatch</span>
        </div>
        <div className="w-px h-4 bg-border shrink-0" />
        <Select value={selectedDest} onValueChange={setSelectedDest} disabled={submitting}>
          <SelectTrigger className="h-7 text-xs w-auto min-w-[180px] max-w-[240px]" data-testid="dispatch-dest-select">
            <SelectValue placeholder="Select destination store…" />
          </SelectTrigger>
          <SelectContent>
            {destinations.map(d => (
              <SelectItem key={d.restaurant_id} value={String(d.restaurant_id)}>
                {d.restaurant_name} ({mapRestaurantType(d.restaurant_type)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="w-px h-4 bg-border shrink-0" />
        <span className="text-xs text-muted-foreground shrink-0">Dispatch for:</span>
        <div className="flex gap-1" data-testid="coverage-period-selector">
          {COVERAGE_OPTIONS.map(opt => (
            <Button key={opt.value} variant={coverageDays === opt.value ? "default" : "outline"} size="sm"
              className="h-7 text-xs px-2.5" onClick={() => setCoverageDays(opt.value)}
              data-testid={`coverage-${opt.value}d`}>
              {opt.value}d
            </Button>
          ))}
        </div>
        {selectedDest && !hasConsumptionData && !destLoading && (
          <span className="text-[10px] text-muted-foreground ml-auto">No consumption data — using thresholds</span>
        )}
      </div>

      {/* Dest health + duplicate warning — inline, no card wrapper */}
      {selectedDest && (() => {
        const dest = destinations.find(d => String(d.restaurant_id) === selectedDest);
        return dest ? <StoreHealthStrip storeName={dest.restaurant_name} outCount={dest.out_of_stock_count || 0} lowCount={dest.low_stock_count || 0} adequateCount={dest.adequate_count || 0} totalItems={dest.total_items || 0} urgent={(dest.out_of_stock_count || 0) >= 2} className="rounded-lg border border-border/50 mb-2" /> : null;
      })()}
      {todayDispatchWarning && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md text-xs mb-3" data-testid="duplicate-dispatch-warning">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          <span className="text-amber-700 font-medium">{todayDispatchWarning}</span>
        </div>
      )}

      {/* CR-050 — compact health strip replaces 4 KPI tile cards */}
      {selectedDest && !destLoading && dispatchRows.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-lg mb-3 text-xs flex-wrap"
          data-testid="dispatch-health-strip">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            <span className="font-bold text-red-600" data-testid="health-out">{healthStats.outCount}</span>
            <span className="text-muted-foreground">OUT</span>
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            <span className="font-bold text-amber-600" data-testid="health-low">{healthStats.lowCount}</span>
            <span className="text-muted-foreground">LOW</span>
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            <span className="font-bold text-green-600" data-testid="health-ok">{healthStats.okCount}</span>
            <span className="text-muted-foreground">OK</span>
          </span>
          <span className="text-muted-foreground ml-2">·</span>
          <span className="text-[10px] text-muted-foreground ml-1" data-testid="burst-note">
            Segments pre-loaded · 0 source-options API calls
          </span>
        </div>
      )}

      {selectedDest && destLoading && (
        <Card className="mb-4"><CardContent className="py-4 text-center">
          <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Analyzing destination stock...</p>
        </CardContent></Card>
      )}

      {/* CR-050 — category-grouped dispatch table */}
      {selectedDest && !destLoading && dispatchRows.length > 0 && (
        <Card className="mb-4" data-testid="dispatch-needs-table">
          {/* Toolbar: filter pills + category combobox + search + master select */}
          <div className="px-4 pt-3 pb-2 flex items-center gap-2 flex-wrap border-b border-border/50">
            {["all", "out", "low"].map(f => (
              <button key={f} tabIndex={-1}
                className={`h-6 px-3 rounded-full text-[10px] border transition-colors font-medium
                  ${filterStatus === f
                    ? f === "out" ? "bg-red-500 text-white border-red-500"
                    : f === "low" ? "bg-amber-400 text-white border-amber-400"
                    : "bg-foreground text-background border-foreground"
                    : "bg-background text-muted-foreground border-border hover:bg-muted"}`}
                onClick={() => setFilterStatus(f)}
                data-testid={`filter-pill-${f}`}>
                {f.toUpperCase()}
              </button>
            ))}
            <span className="text-muted-foreground text-xs">|</span>
            <CategoryCombobox
              categories={[...new Set(dispatchRows.map(r => r.category).filter(Boolean))]}
              value={filterCat}
              onChange={setFilterCat}
            />
            <input
              className="h-7 border border-input rounded-md px-2 text-xs bg-background min-w-[130px]
                         focus:outline-none focus:border-primary"
              placeholder="Search item…"
              value={searchText}
              onChange={e => {
                const v = e.target.value;
                setSearchText(v);
                if (v) {
                  const q = v.toLowerCase();
                  const matchCats = new Set(
                    dispatchRows.filter(r => (r.stockTitle || "").toLowerCase().includes(q)).map(r => r.category)
                  );
                  setCollapsedCats(prev => {
                    const next = { ...prev };
                    matchCats.forEach(c => delete next[c]);
                    return next;
                  });
                }
              }}
              onKeyDown={e => {
                // BUG-054 B1+B3: Enter → first visible row auto-checked + qty focused
                if (e.key !== "Enter") return;
                e.preventDefault();
                const groups = getFilteredGrouped(dispatchRows);
                const firstRow = Object.values(groups)[0]?.[0];
                if (!firstRow) return;
                const idx = dispatchRows.findIndex(r => r.invMasterId === firstRow.invMasterId);
                if (idx >= 0) updateDispatchRow(idx, "included", true);
                document.querySelector(`[data-testid="dispatch-qty-${firstRow.invMasterId}"]`)?.focus();
              }}
              data-testid="dispatch-search-input"
            />
            <button tabIndex={-1}
              className="h-6 px-2 text-[10px] border border-border rounded bg-background text-muted-foreground hover:bg-muted"
              onClick={() => setDispatchRows(p => p.map(r => ({ ...r, included: true })))}
              data-testid="dispatch-select-all">Select All</button>
            <button tabIndex={-1}
              className="h-6 px-2 text-[10px] border border-border rounded bg-background text-muted-foreground hover:bg-muted"
              onClick={() => setDispatchRows(p => p.map(r => ({ ...r, included: false })))}
              data-testid="dispatch-unselect-all">Unselect All</button>
            <span className="ml-auto text-[10px] text-muted-foreground">
              {dispatchRows.filter(r => r.included).length}/{dispatchRows.length} selected
            </span>
          </div>

          {/* Category sections */}
          <CardContent className="py-0 px-0">
            {Object.entries(getFilteredGrouped(dispatchRows)).map(([cat, catRows]) => (
              <DispatchCategorySection
                key={cat}
                cat={cat}
                rows={catRows}
                collapsed={collapsedCats[cat] === true}
                onToggle={() => setCollapsedCats(prev =>
                  prev[cat] ? (({ [cat]: _x, ...rest }) => rest)(prev) : { ...prev, [cat]: true }
                )}
                onCatSelect={(select) => {
                  setDispatchRows(p => p.map(r => r.category === cat ? { ...r, included: select } : r));
                  if (!select) setCollapsedCats(prev => ({ ...prev, [cat]: true }));
                  else setCollapsedCats(prev => (({ [cat]: _x, ...rest }) => rest)(prev));
                }}
                onRowUpdate={(idx, field, value) => {
                  const globalIdx = dispatchRows.findIndex(r => r === catRows[idx]);
                  if (globalIdx >= 0) updateDispatchRow(globalIdx, field, value);
                }}
                submitting={submitting}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* BUG-053: shows only when ownStock has items but dispatchRows is empty */}
      {selectedDest && !destLoading && dispatchRows.length === 0 && ownStock.length > 0 && (
        <Card className="mb-4"><CardContent className="py-6 text-center text-muted-foreground text-sm">
          No inventory items found. Add stock via the Purchase screen first.
        </CardContent></Card>
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
            </div>
            <p className="text-[10px] text-muted-foreground">{allIncluded.length} item{allIncluded.length !== 1 ? "s" : ""} to {destName}</p>
          </CardContent>
        </Card>
      )}

      <Button data-testid="dispatch-submit" onClick={handleSubmit} disabled={allIncluded.length === 0 || submitting} className="w-full">
        {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Dispatch Stock{allIncluded.length > 0 ? ` (${allIncluded.length} items)` : ""}
      </Button>
      <p className="text-[10px] text-muted-foreground text-center mt-2" data-testid="po-auto-note">A PO will be auto-generated for {destName || "the destination"} on dispatch creation</p>
    </div>
  );
}


// CR-050 — CategoryCombobox: searchable category picker (position:fixed avoids overflow clipping)
function CategoryCombobox({ categories, value, onChange }) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const btnRef = React.useRef(null);
  const [pos, setPos] = React.useState({ top: 0, left: 0 });

  const options = [{ v: "all", l: "All Categories" }, ...(categories || []).map(c => ({ v: c, l: c }))];
  const filtered = options.filter(o => !search || o.l.toLowerCase().includes(search.toLowerCase()));
  const label = value === "all" ? "All Categories" : (value || "All Categories");

  const openDropdown = (e) => {
    e.stopPropagation();
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 3, left: r.left });
    setOpen(o => !o);
    setSearch("");
  };

  React.useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  const onSearchKey = (e) => {
    if (e.key === "Enter") { if (filtered[0]) { onChange(filtered[0].v); setOpen(false); } }
    else if (e.key === "ArrowDown") { e.preventDefault(); document.querySelector(".cr050-cat-item")?.focus(); }
    else if (e.key === "Escape") setOpen(false);
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button ref={btnRef} tabIndex={-1} onClick={openDropdown}
        className="h-7 min-w-[130px] border border-input rounded-md px-2 pr-6 text-xs bg-background
                   text-left relative hover:bg-muted/50 truncate"
        data-testid="cat-combo-btn">
        {label}
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]">▾</span>
      </button>
      {open && (
        <div style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
          className="bg-background border border-border rounded-lg shadow-lg w-48"
          onClick={e => e.stopPropagation()}>
          <div className="p-1.5 border-b border-border/50">
            <input autoFocus
              className="w-full h-6 text-xs border border-input rounded px-2 focus:outline-none focus:border-primary"
              placeholder="Search category…" value={search}
              onChange={e => setSearch(e.target.value)} onKeyDown={onSearchKey}
              data-testid="cat-combo-search" />
          </div>
          <div className="max-h-40 overflow-y-auto py-1">
            {filtered.map(o => (
              <div key={o.v} tabIndex={0}
                className={`cr050-cat-item px-3 py-1.5 text-xs cursor-pointer hover:bg-muted/70
                            focus:bg-muted/70 focus:outline-none
                            ${value === o.v ? "bg-primary/10 text-primary font-medium" : ""}`}
                onClick={() => { onChange(o.v); setOpen(false); }}
                onKeyDown={e => {
                  if (e.key === "Enter") { onChange(o.v); setOpen(false); }
                  else if (e.key === "ArrowDown") { e.preventDefault(); e.target.nextElementSibling?.focus(); }
                  else if (e.key === "ArrowUp") { e.preventDefault(); e.target.previousElementSibling ? e.target.previousElementSibling.focus() : document.querySelector("[data-testid=cat-combo-search]")?.focus(); }
                  else if (e.key === "Escape") setOpen(false);
                }}>
                {o.l}
              </div>
            ))}
            {filtered.length === 0 && <div className="px-3 py-2 text-xs text-muted-foreground">No match</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// CR-050 — DispatchCategorySection: category header + collapsible rows
function DispatchCategorySection({ cat, rows, collapsed, onToggle, onCatSelect, onRowUpdate, submitting }) {
  const outN = rows.filter(r => r.isOut).length;
  const lowN = rows.filter(r => r.isLow && !r.isOut).length;
  return (
    <div>
      <div tabIndex={-1} onClick={onToggle}
        className="flex items-center gap-2 px-4 py-1.5 bg-muted/30 border-b border-border/50
                   cursor-pointer hover:bg-muted/50 select-none"
        data-testid={`cat-header-${cat}`}>
        <span className={`text-[10px] text-muted-foreground transition-transform inline-block
                          ${collapsed ? "" : "rotate-90"}`}>▶</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/80">{cat}</span>
        <span className="text-[10px] text-muted-foreground">{rows.length} items</span>
        {outN > 0 && <span className="px-1.5 rounded text-[9px] font-bold bg-red-100 text-red-700">{outN} OUT</span>}
        {lowN > 0 && <span className="px-1.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700">{lowN} LOW</span>}
        <div className="ml-auto flex gap-1.5" onClick={e => e.stopPropagation()}>
          <button tabIndex={-1} onClick={() => onCatSelect(true)}
            className="h-5 px-2 text-[9px] border border-border rounded bg-background hover:bg-muted text-muted-foreground">
            Select All
          </button>
          <button tabIndex={-1} onClick={() => onCatSelect(false)}
            className="h-5 px-2 text-[9px] border border-border rounded bg-background hover:bg-muted text-muted-foreground">
            Unselect All
          </button>
        </div>
      </div>
      {!collapsed && (
        <div className="overflow-x-auto">
          <table className="w-full" style={{ tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "30px" }} /><col style={{ width: "20%" }} />
              <col style={{ width: "70px" }} /><col style={{ width: "65px" }} />
              <col style={{ width: "90px" }} /><col style={{ width: "210px" }} />
              <col style={{ width: "95px" }} /><col />
            </colgroup>
            <thead>
              <tr className="border-b border-border/30">
                {["", "Item", "At Dest", "Cover", "Send Qty", "Source (FEFO)", "After Dispatch", "Note"].map((h, i) => (
                  <th key={i} className="text-[9.5px] font-semibold text-muted-foreground uppercase
                                         tracking-wider px-2 py-1.5 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <DispatchRow key={row.invMasterId} row={row}
                  onUpdate={(field, val) => onRowUpdate(idx, field, val)}
                  submitting={submitting} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// CR-050 — DispatchRow: single table row with row-click toggle + FEFO source display
function DispatchRow({ row, onUpdate, submitting }) {
  const handleRowClick = (e) => {
    if (["INPUT", "SELECT", "BUTTON", "A", "OPTION"].includes(e.target.tagName)) return;
    onUpdate("included", !row.included);
  };
  const coverText = row.daysOfCover !== null
    ? (row.daysOfCover < 1 ? "<1d" : `~${Math.round(row.daysOfCover)}d`)
    : "—";
  const rowCls = [
    row.isOut ? "bg-red-50/40" : row.isLow ? "bg-amber-50/30" : "",
    // BUG-053 Option C: no whole-row opacity — item name dimmed per-cell; checkbox is the selected indicator
  ].filter(Boolean).join(" ");

  return (
    <tr className={`border-b border-border/20 cursor-pointer hover:bg-muted/20 ${rowCls}`}
      onClick={handleRowClick} data-testid={`dispatch-row-${row.invMasterId}`}>

      <td className="px-2 text-center">
        <input type="checkbox" checked={row.included}
          onChange={e => { e.stopPropagation(); onUpdate("included", e.target.checked); }}
          className="rounded accent-primary" tabIndex={0}
          data-testid={`dispatch-check-${row.invMasterId}`} />
      </td>

      <td className="px-2 py-1.5">
        <div className={`text-xs font-medium truncate ${!row.included ? "text-muted-foreground" : ""}`}>
          {row.stockTitle}
        </div>
        <div className="text-[10px] text-muted-foreground">{row.ownQty} {row.unit} avail</div>
      </td>

      <td className={`px-2 text-xs text-right tabular-nums
        ${row.isOut ? "text-red-600 font-semibold" : row.isLow ? "text-amber-600 font-medium" : "text-muted-foreground"}`}>
        {row.destQty} {row.unit}
      </td>

      <td className={`px-2 text-xs text-right
        ${row.isOut ? "text-red-600 font-semibold" : row.isLow ? "text-amber-600" : "text-muted-foreground"}`}>
        {coverText}
      </td>

      <td className="px-2">
        <div className="flex items-center gap-1">
          <Input type="number" min="0" step="1"
            className={`h-6 w-16 text-xs text-right tabular-nums
              [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none
              ${row.exceedsOwn ? "border-red-400 bg-red-50" : ""}`}
            value={row.qty}
            onChange={e => onUpdate("qty", e.target.value)}
            onKeyDown={e => {
              // BUG-054 B2+B4: Enter → auto-checks row if qty>0, jumps to next row
              if (e.key !== "Enter") return;
              e.preventDefault();
              if (Number(row.qty) > 0 && !row.included) onUpdate("included", true);
              const all = Array.from(document.querySelectorAll('[data-testid^="dispatch-qty-"]'));
              const cur = all.indexOf(e.target);
              if (cur >= 0 && cur + 1 < all.length) { all[cur + 1].focus(); all[cur + 1].select(); }
            }}
            disabled={submitting}
            data-testid={`dispatch-qty-${row.invMasterId}`} />
          <span className="text-[9.5px] text-muted-foreground">{row.unit}</span>
        </div>
        {row.exceedsOwn && <div className="text-[9px] text-red-600 mt-0.5">max {row.ownQty}</div>}
      </td>

      <td className="px-2">
        {row.isUnbatched ? (
          <div className="text-[9.5px] text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 leading-tight">
            No batch tracking — bucket dispatch.{" "}
            <a href="/purchase" className="text-primary underline text-[9px]" tabIndex={-1}>Add purchase</a>
          </div>
        ) : (row.fefoAllocs || []).length > 0 ? (
          <div className="space-y-0.5">
            {(row.fefoAllocs || []).map((alloc, i) => (
              <div key={i} className="flex items-center gap-1">
                <select
                  className="h-6 text-[10px] border border-green-300 bg-green-50 text-green-800
                             rounded px-1 flex-1 min-w-0"
                  value={String(alloc.segment_id)}
                  onChange={e => onUpdate("sourceSelector",
                    { mode: "segment_id", segment_id: Number(e.target.value) })}
                  disabled={!row.included || submitting}
                  data-testid={`dispatch-source-${row.invMasterId}-${i}`}>
                  <option value={String(alloc.segment_id)}>
                    {alloc.batch || `Seg #${alloc.segment_id}`} ({alloc.qty} {row.unit})
                  </option>
                </select>
                <span className="text-[8.5px] font-bold bg-green-100 text-green-700 rounded px-1 whitespace-nowrap">
                  FEFO
                </span>
              </div>
            ))}
            {(() => {
              const total = (row.fefoAllocs || []).reduce((s, a) => s + a.qty, 0);
              const need = Number(row.qty) || 0;
              return Math.abs(total - need) < 0.01
                ? <div className="text-[9px] text-green-700">✓ Exact</div>
                : total < need
                  ? <div className="text-[9px] text-amber-700">⚠ Short {(need - total).toFixed(1)} {row.unit}</div>
                  : null;
            })()}
          </div>
        ) : (
          <div className="text-[10px] text-muted-foreground">—</div>
        )}
      </td>

      <td className="px-2 text-right">
        <div className={`text-xs tabular-nums font-mono
          ${row.afterDispatch < 0 ? "text-red-600 font-semibold" : "text-muted-foreground"}`}>
          {row.afterDispatch} {row.unit}
        </div>
        {row.retainPct > 0 && (
          <div className="text-[9.5px] text-muted-foreground">{row.retainPct}% retained</div>
        )}
      </td>

      <td className="px-2 text-[10px] text-muted-foreground">
        {row.fefoShort ? "⚠ Short on stock" : (row.suggestion || "")}
      </td>
    </tr>
  );
}
