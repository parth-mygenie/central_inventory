# BUG-053 — Gate 3: Implementation Plan

> **ID:** BUG-053
> **Artifact:** 3 — Implementation Plan
> **Role:** PLANNING
> **Date:** 2026-10-19
> **File:** `frontend/src/components/central-inventory/DirectDispatchForm.jsx` — ONLY file
> **Gate 4 (Owner GO):** WAIVED per policy
> **Feeds:** BUG FIX agent

---

## Pre-Code Verification (MANDATORY — check before writing a single line)

BUG FIX agent MUST confirm these exact strings still exist before starting. If any differ → STOP, report to owner.

```
Check 1 — line 53 contains:
  const [manualRows, setManualRows] = useState([]);

Check 2 — line 184 starts with:
  return destStock.map(item => {

Check 3 — line 217 contains:
  if (qtyToSend <= 0) return null;

Check 4 — line 392 contains:
  <Card className="mb-4" data-testid="coverage-selector-card">

Check 5 — line 565 contains:
  <Button variant="ghost" size="sm" className="text-xs" onClick={addManualRow}>
```

---

## Execution Sequence

Execute in this exact order. Do NOT skip, reorder, or combine.

```
E1 → E2 → E3 → E4 → E5 → E6 → E7 → E8 → E9
     (compile check after E5)
```

---

## E1 — Fix dispatchNeeds: iterate ownStock, show ALL items

**Purpose:** Change the row source from `destStock` (destination items) to `ownStock` (all 75 items the storekeeper owns). Remove the `qtyToSend <= 0` filter so ALL items appear.

**Old block (lines 182–264):**
```javascript
  // Compute intelligent dispatch items
  const dispatchNeeds = useMemo(() => {
    if (!destStock.length || !ownStock.length) return [];
    return destStock.map(item => {
      const name = (item.stock_title || "").toLowerCase();
      const destQty = parseFloat(item.display_quantity) || 0;
      const minQty = parseFloat(item.min_qty_alert) || 0;
      // BUG-036: Normalize consumption to item's display unit before calculation
      const cEntry = destConsumptionMap[name];
      const avgDaily = cEntry ? normalizeToDisplayUnit(cEntry.dailyQty, cEntry.unit, item.unit || ownItem?.display_unit || "") : 0;
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
        qtyToSend = Math.max(0, Math.ceil(projectedNeed - destQty)); // CR-050 — integer ceiling
        if (qtyToSend > 0) {
          suggestion = daysOfCover < 1
            ? `< 1 day cover at dest, sending for ${coverageDays}d`
            : `~${Math.round(daysOfCover)}d cover, sending for ${coverageDays}d`;
          urgency = daysOfCover < 1 ? 100 : 50 + (coverageDays - daysOfCover);
        }
      } else if (minQty > 0 && destQty < minQty) {
        qtyToSend = Math.ceil(minQty - destQty); // CR-050 — integer ceiling
        suggestion = `Gap to min: ${qtyToSend} ${item.unit || ""}`;
        urgency = destQty === 0 ? 80 : 40;
      }

      if (qtyToSend <= 0) return null;

      // Cap at own stock
      const cappedQty = Math.min(qtyToSend, ownQty);
      const exceedsOwn = qtyToSend > ownQty;
      const afterDispatch = Math.round((ownQty - cappedQty) * 100) / 100;
      const retainPct = ownQty > 0 ? Math.round((afterDispatch / ownQty) * 100) : 0;

      // CR-050 — segments from includeSegments:true + FEFO auto-select
      const ownSegments = ownItem?.segments_preview || [];
      const isUnbatched = ownSegments.length > 0 && ownSegments.every(s => s.segment_id === null);
      const { allocations: fefoAllocs, short: fefoShort } = fefoAutoSelect(ownSegments, cappedQty);
      const autoSource = fefoAllocs.length === 1
        ? { mode: "segment_id", segment_id: fefoAllocs[0].segment_id }
        : null;

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
        sourceSelector: autoSource,
        included: false,          // CR-050 — default unchecked; storekeeper opts in
        segments_preview: ownSegments, // CR-050
        isUnbatched,              // CR-050
        fefoAllocs,               // CR-050
        fefoShort,                // CR-050
        sourceManuallySet: false, // CR-050
      };
    }).filter(Boolean)
      .filter((item, idx, arr) => arr.findIndex(x => x.invMasterId === item.invMasterId) === idx)
      .sort((a, b) => b.urgency - a.urgency);
  }, [destStock, ownStock, destConsumptionMap, coverageDays]);
```

**New block:**
```javascript
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
        // Sort: OUT first, then LOW, then OK; within each group by urgency desc
        if (a.isOut && !b.isOut) return -1;
        if (!a.isOut && b.isOut) return 1;
        if (a.isLow && !b.isLow) return -1;
        if (!a.isLow && b.isLow) return 1;
        return b.urgency - a.urgency;
      });
  }, [destStock, ownStock, destConsumptionMap, coverageDays]);
```

**Code marker:** `// BUG-053: iterate ownStock (all items), show ALL regardless of need`

**Verify:** Select dest → health strip shows `N OUT · N LOW · N OK` where sum = `ownStock.length` (75 on RID 828)

---

## E2 — Remove BUG-033 pre-select wire (no longer needed)

**Purpose:** BUG-033 wired a URL `?item=` param to add an item as a manual row. Since all items are now visible in the dispatch list, this is redundant. Safe to remove.

**Old block (lines 272–280):**
```javascript
  // BUG-033: Pre-select item from URL param — add as manual row if not in dispatch needs
  useEffect(() => {
    if (preselectedItemId && allItems.length > 0 && dispatchRows.length === 0 && manualRows.length === 0) {
      const match = allItems.find(i => String(i.id) === preselectedItemId);
      if (match && !dispatchNeeds.find(d => String(d.invMasterId) === preselectedItemId)) {
        setManualRows([{ itemId: String(match.id), qty: "", source: "segment" }]);
      }
    }
  }, [preselectedItemId, allItems, dispatchRows.length, manualRows.length, dispatchNeeds]);
```

**New:** Delete the entire block (replace with single comment)
```javascript
  // BUG-053: BUG-033 pre-select wire removed — all items now visible in dispatch list
```

---

## E3 — Remove unused CR-046 select/unselect handlers

**Purpose:** CR-050's E9 inlined these directly. The named functions are now dead code.

**Old block (lines 282–284):**
```javascript
  // CR-046 — Select All / Unselect All for dispatch items
  const selectAllDispatchRows = () => setDispatchRows(p => p.map(r => ({ ...r, included: true })));
  const unselectAllDispatchRows = () => setDispatchRows(p => p.map(r => ({ ...r, included: false })));
```

**New:** Delete entire block (no replacement needed — inline buttons in E9 JSX handle this)

---

## E4 — Remove manual row handlers

**Purpose:** Manual rows are being removed. All 3 handlers become dead code.

**Old block (lines 312–326):**
```javascript
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
```

**New:** Delete entire block (no replacement)

---

## E5 — Remove manualRows state + simplify allIncluded + clean handleSubmit

**Purpose:** Remove `manualRows` state, `validManualRows`, update `allIncluded`, clean submit payload.

### E5a — Remove manualRows state (line 52–53)
**Old:**
```javascript
  // Manual add rows (extra items beyond suggestions)
  const [manualRows, setManualRows] = useState([]);
```
**New:** Delete both lines

### E5b — Simplify allIncluded (lines 339–341)
**Old:**
```javascript
  const includedRows = dispatchRows.filter(r => r.included && Number(r.qty) > 0 && r.sourceSelector);
  const validManualRows = manualRows.filter(r => r.itemId && Number(r.quantity) > 0 && r.sourceSelector);
  const allIncluded = [...includedRows, ...validManualRows];
```
**New:**
```javascript
  const includedRows = dispatchRows.filter(r => r.included && Number(r.qty) > 0 && r.sourceSelector);
  const allIncluded = includedRows; // BUG-053: manual rows removed
```

### E5c — Clean handleSubmit payload (lines 349–365)
**Old:**
```javascript
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
```
**New:**
```javascript
    const payloadItems = includedRows.map(r => ({ // BUG-053: manual rows removed
      source_inventory_master_id: Number(r.invMasterId),
      quantity: Number(r.qty),
      unit: r.unit,
      source_selector: r.sourceSelector,
    }));
```

---

## E6 — Compact header: replace 3 elements + 2 cards with one inline strip

**Purpose:** Replace Back button + title + description + Coverage Card + Destination Card (lines 382–440) with a single compact flex row. All existing data-testids preserved.

**Old block (lines 382–440):**
```jsx
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
```

**New block (BUG-053 compact header):**
```jsx
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

      {/* Dest health + duplicate warning — below header strip, not in a card */}
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
```

**Compile check HERE** — after E6, verify webpack compiles before proceeding.

---

## E7 — Remove "Add item manually" button from table card footer

**Purpose:** The `+ Add item manually` button inside the dispatch table footer must be removed.

**Old block (lines 564–568):**
```jsx
            <div className="px-4 py-2 border-t border-border/50">
              <Button variant="ghost" size="sm" className="text-xs" onClick={addManualRow}>
                <Plus className="h-3 w-3 mr-1" /> Add item manually
              </Button>
            </div>
```

**New:** Delete the entire div — no replacement. The `border-t` separator goes too.

---

## E8 — Replace empty-state card (remove manual add button from it)

**Purpose:** When all items show, the `dispatchRows.length === 0` state means no own stock at all — not "all items sufficient". Change message and remove manual add button.

**Old block (lines 573–580):**
```jsx
      {selectedDest && !destLoading && dispatchRows.length === 0 && destStock.length > 0 && (
        <Card className="mb-4"><CardContent className="py-6 text-center text-muted-foreground text-sm">
          {hasConsumptionData
            ? `All items have sufficient stock for ${coverageDays}-day coverage at this destination.`
            : "No items below threshold at this destination."}
          <br /><Button variant="ghost" size="sm" className="text-xs mt-2" onClick={addManualRow}><Plus className="h-3 w-3 mr-1" /> Add item manually</Button>
        </CardContent></Card>
      )}
```

**New:**
```jsx
      {/* BUG-053: shows only when ownStock is empty (no inventory loaded yet) */}
      {selectedDest && !destLoading && dispatchRows.length === 0 && ownStock.length > 0 && (
        <Card className="mb-4"><CardContent className="py-6 text-center text-muted-foreground text-sm">
          No inventory items found. Add stock via the Purchase screen first.
        </CardContent></Card>
      )}
```

---

## E9 — Delete ADDITIONAL ITEMS card (manual rows JSX)

**Purpose:** Remove the entire `{manualRows.length > 0 && ...}` block.

**Old block (lines 582–626):**
```jsx
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
```

**New:** Delete entire block — no replacement.

---

## Cleanup — imports and unused items

After E1–E9 compile cleanly, do these final removals:

### C1 — Remove `Trash2` from imports (only used in manual rows)
**Old:** `import { ArrowLeft, Plus, Trash2, Loader2, Truck, AlertTriangle, Package, Calendar, Zap } from "lucide-react";`
**New:** `import { ArrowLeft, Plus, Loader2, Truck, AlertTriangle, Calendar } from "lucide-react";`

Note: `Package`, `Zap`, `Badge`, `Table`/`TableBody`/etc, `CardHeader`/`CardTitle` — check if still used after cleanup. Remove only confirmed-unused imports. If uncertain, leave them (dead imports don't break anything).

### C2 — Remove `allItems` state + `api.getInventoryMaster()` call
`allItems` is only used in: manual rows (removed), BUG-033 wire (removed), order summary `validManualRows` (removed).

**Old (in initial useEffect Promise.all):**
```javascript
    Promise.all([
      api.getHierarchySummary({ storeType: "central" }),
      api.getHierarchySummary({ storeType: "franchise" }),
      api.getInventoryMaster(),
    ]).then(([centralResp, franchiseResp, invResp]) => {
      ...
      setDestinations([...]);
      const inv = invResp.data?.data || invResp.data || [];
      setAllItems(Array.isArray(inv) ? inv : []);
    })
```
**New:**
```javascript
    Promise.all([
      api.getHierarchySummary({ storeType: "central" }),
      api.getHierarchySummary({ storeType: "franchise" }),
    ]).then(([centralResp, franchiseResp]) => {
      ...
      setDestinations([...]);
      // BUG-053: getInventoryMaster removed — allItems no longer needed
    })
```
Also remove `const [allItems, setAllItems] = useState([]);` at line 35.

### C3 — Remove `useSearchParams` + `preselectedItemId`
**Old (lines 29–30):**
```javascript
  const [searchParams] = useSearchParams(); // BUG-033
  const preselectedItemId = searchParams.get("item"); // BUG-033
```
**New:** Delete both lines. Also remove `useSearchParams` from the react-router-dom import if it's the only usage.

---

## Verification Matrix

Execute after all edits + compile passes.

| # | Check | Pass Condition |
|---|-------|----------------|
| V1 | Page loads at `/dispatch/new` | No console errors; loading state shows |
| V2 | All items visible after dest selected | Row count = ownStock.length (75 on RID 828) |
| V3 | Health strip counts sum correctly | `outCount + lowCount + okCount = dispatchRows.length` |
| V4 | Filter pill ALL = all items | Row count unchanged |
| V5 | Filter pill OUT = only out items | Row count = `outCount` |
| V6 | Filter pill LOW = only low items | Row count = `lowCount` |
| V7 | Header is one compact strip | No `coverage-selector-card` testid in DOM |
| V8 | Dest selector is inside header | `dispatch-dest-select` inside header strip |
| V9 | Coverage pills in header | `coverage-3d` inside header strip |
| V10 | No "Add item manually" anywhere | No `addManualRow` reference in rendered DOM |
| V11 | No "ADDITIONAL ITEMS" card | No `manual-dispatch-row-0` testid |
| V12 | Duplicate dispatch warning still shows | Select dest with prior dispatch → amber strip below header |
| V13 | Submit payload intact | Network: POST `/initiate` with same flat `items[]` shape |

---

## Post-Code Registry Checklist (for BUG FIX agent)

```
- [ ] registry.json: BUG-053 → status: IMPLEMENTED, Gate 5 still MISSING
- [ ] L4_BUG_TRACKER.md: BUG-053 row updated
- [ ] L7_FILE_OWNERSHIP.md: DirectDispatchForm.jsx entry updated (BUG-053)
- [ ] Code markers: grep -rn "// BUG-053" frontend/src/ → at least 3 hits
- [ ] Dashboard drift: node control/gen_dashboard_data.js --check → PASS
- [ ] Compile: tail -5 /var/log/supervisor/frontend.out.log → "Compiled" 0 new errors
```

---

## Scope Lock

**WILL change:** `DirectDispatchForm.jsx` — 1 file only

**Will NOT touch:**
- `SourceSelector.jsx`
- `api.js`
- `RequestStockForm.jsx`
- Any frozen file
- Any other component

---

## Risks

| # | Risk | Level | Mitigation |
|---|------|:-----:|-----------|
| R1 | `ownStock` items have `display_qty` as string (CI-R3) | LOW | `Number(ownItem.display_qty) \|\| 0` wraps it |
| R2 | Items in `ownStock` but NOT in `destStock` → `destQty = 0` → shows as `isOut` incorrectly | LOW | `isOut` check: `destQty === 0 && (avgDaily > 0 \|\| minQty > 0)` — items with no threshold/avgDaily don't get marked OUT |
| R3 | `allItems` removal breaks something unexpected | LOW | Grep all usages before removing: confirm 0 hits after manual row removal |
| R4 | `useSearchParams` removal breaks another feature | LOW | Grep for `searchParams` usage — only BUG-033 wire used it |
