# CR-050 — Gate 3: Implementation Plan

> **ID:** CR-050
> **Artifact:** 3 — Implementation Plan
> **Role:** PLANNING
> **Date:** 2026-10-19
> **Feeds:** CR-050_ARTIFACT_4_CODE_GATE.md (Gate 4)
> **Files WILL change:** `DirectDispatchForm.jsx`, `SourceSelector.jsx`, `RequestStockForm.jsx`
> **Files will NOT touch:** `api.js`, `server.py`, `terminology.js` (FROZEN), `screenVisibility.js` (FROZEN)

---

## Scope Lock

**3 files, 12 edits total.**

| Edit | File | Nature | Risk |
|------|------|--------|------|
| E1 | `DirectDispatchForm.jsx` line 85 | 1-word change: add `{ includeSegments: true }` | LOW |
| E2 | `DirectDispatchForm.jsx` lines 162 + 170 | 2-line ceiling fix | LOW |
| E3 | `DirectDispatchForm.jsx` line 204 | Default `included: false` | LOW |
| E4 | `DirectDispatchForm.jsx` `dispatchNeeds` useMemo | Add `segments_preview` + FEFO + un-batched to each item | MEDIUM |
| E5 | `DirectDispatchForm.jsx` state + helpers block | 4 new state vars + `fefoAutoSelect` + `isUnbatchedOnly` | MEDIUM |
| E6 | `DirectDispatchForm.jsx` `updateDispatchRow` | Re-run FEFO on qty change | LOW |
| E7 | `DirectDispatchForm.jsx` `healthStats` useMemo | Replace 4-KPI-tile `stats` computation | LOW |
| E8 | `DirectDispatchForm.jsx` JSX — KPI tiles block | Replace 4 `<Card>` grid with inline `HealthStrip` | MEDIUM |
| E9 | `DirectDispatchForm.jsx` JSX — dispatch table | Replace flat table with category-grouped table + filters | HIGH |
| E10 | `DirectDispatchForm.jsx` — sub-components | Append `CategoryCombobox` + `DispatchCategorySection` + `DispatchRow` | MEDIUM |
| E11 | `SourceSelector.jsx` | Add `preloadedSegments` opt-in prop | HIGH |
| E12 | `RequestStockForm.jsx` lines 176 + 189 | 2-line ceiling fix | LOW |

---

## Pre-Code Verification

Before writing a single line, IMPLEMENTATION agent must confirm these lines still match:

```javascript
// DirectDispatchForm.jsx line 85 currently reads:
api.getStockInventory(),

// DirectDispatchForm.jsx line 162 currently reads:
qtyToSend = Math.max(0, Math.ceil((projectedNeed - destQty) * 100) / 100);

// DirectDispatchForm.jsx line 204 currently reads:
included: true,

// RequestStockForm.jsx line 176 currently reads:
orderQty = Math.max(0, Math.ceil((projectedNeed - currentStock) * 100) / 100);

// RequestStockForm.jsx line 189 currently reads:
orderQty = Math.ceil((minQty - currentStock) * 100) / 100;

// SourceSelector.jsx line 25 currently reads:
export default function SourceSelector({ fromRestaurantId, inventoryMasterId, value, onChange, disabled }) {
```

If any differ → STOP. Return to PLANNING.

---

## E1 — DirectDispatchForm.jsx line 85: Add includeSegments

**Purpose:** Fetch `segments_preview` for every item in a single call — eliminates 257× `getSourceOptions` burst.

**Current (line 82–86):**
```javascript
Promise.allSettled([
  api.getHierarchyDetail({ storeRestaurantId: Number(selectedDest) }),
  api.getStockInventory(),
  api.getDailyConsumptionReport({ ... }),
```

**New:**
```javascript
Promise.allSettled([
  api.getHierarchyDetail({ storeRestaurantId: Number(selectedDest) }),
  api.getStockInventory({ includeSegments: true }), // CR-050 — burst fix: segments_preview in one call
  api.getDailyConsumptionReport({ ... }),
```

**Code marker:** `// CR-050 — burst fix: segments_preview in one call`

**Verify:** Network tab on page load → 0 calls to `/source-options`

---

## E2 — DirectDispatchForm.jsx lines 162 + 170: Integer ceiling

**Purpose:** Qty suggestions show integers (27 kg not 26.7 kg).

**Current line 162:**
```javascript
qtyToSend = Math.max(0, Math.ceil((projectedNeed - destQty) * 100) / 100);
```
**New line 162:**
```javascript
qtyToSend = Math.max(0, Math.ceil(projectedNeed - destQty)); // CR-050 — integer ceiling
```

**Current line 170:**
```javascript
qtyToSend = Math.ceil((minQty - destQty) * 100) / 100;
```
**New line 170:**
```javascript
qtyToSend = Math.ceil(minQty - destQty); // CR-050 — integer ceiling
```

**Verify:** Tomato (avgDaily=5, destQty=2, coverage=3d): `Math.ceil(15-2) = 13` displayed, not `12.99`.

---

## E3 — DirectDispatchForm.jsx line 204: Default unchecked

**Purpose:** All rows start unchecked — storekeeper selects what to dispatch.

**Current line 204:**
```javascript
included: true,
```
**New line 204:**
```javascript
included: false, // CR-050 — default unchecked; storekeeper opts in
```

**Verify:** Page load → all checkboxes unchecked; Dispatch button shows "Dispatch (0 items)" and is disabled.

---

## E4 — DirectDispatchForm.jsx dispatchNeeds: Add segments + FEFO + un-batched

**Purpose:** Attach `segments_preview` from `ownStock` to each row so FEFO can run without per-item API calls.

**Current return block (lines 183–208), add these fields:**
```javascript
// Existing fields kept as-is. Add after existing fields:
const ownSegments = ownItem?.segments_preview || []; // CR-050 — from includeSegments:true
const isUnbatched = ownSegments.length > 0 && ownSegments.every(s => s.segment_id === null);
const { allocations: fefoAllocs, short: fefoShort } = fefoAutoSelect(ownSegments, cappedQty);
// Pre-wire sourceSelector to first FEFO allocation when available
const autoSource = fefoAllocs.length === 1
  ? { mode: "segment_id", segment_id: fefoAllocs[0].segment_id }
  : null; // multi-batch: storekeeper reviews allocations; single-seg auto-wires

return {
  // ... all existing fields unchanged ...
  included: false,                    // E3
  segments_preview: ownSegments,      // E4
  isUnbatched,                        // E4
  fefoAllocs,                         // E4
  fefoShort,                          // E4
  sourceSelector: autoSource,         // E4 — auto-wired when single segment
};
```

**Note on `fefoAutoSelect`:** Defined in E5. Call it here. `ownItem.segments_preview` comes from `ownStock` which is now fetched with `includeSegments: true` (E1).

**Verify:** In React DevTools → `dispatchRows[0].fefoAllocs` shows segment data for items with stock.

---

## E5 — DirectDispatchForm.jsx: New state + helper functions

**Location:** Insert after line 53 (existing state block), before the existing `useEffect` at line 56.

**Add 4 new state variables:**
```javascript
// CR-050 — category grouping + filter state
const [collapsedCats, setCollapsedCats] = useState({});
const [filterStatus, setFilterStatus]   = useState("all");   // "all" | "out" | "low"
const [filterCat, setFilterCat]         = useState("all");   // category name or "all"
const [searchText, setSearchText]       = useState("");
```

**Add helper functions (insert before `useEffect` at line 77):**
```javascript
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
                    batch: seg.batch, expiry: seg.expiry_date, available: Number(seg.display_qty) });
      remaining -= take;
    }
  }
  return { allocations: allocs, short: remaining > 0 };
}

// CR-050 — filtered + grouped rows for rendering
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
```

---

## E6 — DirectDispatchForm.jsx updateDispatchRow: Re-run FEFO on qty change

**Purpose:** When storekeeper changes qty, source selector auto-updates to FEFO allocation.

**Current `updateDispatchRow` (lines 231–247), inside the `if (field === "qty")` block:**
```javascript
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
}
```

**Add `sourceManuallySet` flag update in the `else` branch:**
```javascript
} else {
  row[field] = value;
  if (field === "sourceSelector") row.sourceManuallySet = true; // CR-050 — storekeeper override
}
```

---

## E7 — DirectDispatchForm.jsx healthStats: Replace 4-KPI useMemo

**Purpose:** Compact health strip: `6 OUT · 7 LOW · 58 OK` replaces the 4-card KPI grid.

**Current `stats` useMemo (lines 266–290) — DELETE this entire block and replace with:**
```javascript
// CR-050 — compact health strip stats (replaces 4 KPI tile cards)
const healthStats = useMemo(() => {
  let outCount = 0, lowCount = 0, okCount = 0;
  dispatchRows.forEach(r => {
    if (r.isOut) outCount++;
    else if (r.isLow) lowCount++;
    else okCount++;
  });
  return { outCount, lowCount, okCount, total: dispatchRows.length };
}, [dispatchRows]);
```

---

## E8 — DirectDispatchForm.jsx JSX: Replace 4 KPI tile grid

**Purpose:** Remove the 4 `<Card>` stat grid (lines 395–423). Replace with inline compact strip.

**Delete** the entire `{selectedDest && !destLoading && destStock.length > 0 && (<div className="grid grid-cols-4 ...>...</div>)}` block at lines 395–422.

**Replace with:**
```jsx
{/* CR-050 — compact health strip replaces 4 KPI tiles */}
{selectedDest && !destLoading && dispatchRows.length > 0 && (
  <div className="flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-lg mb-3 text-xs flex-wrap">
    <span className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
      <span className="font-bold text-red-600">{healthStats.outCount}</span>
      <span className="text-muted-foreground">OUT</span>
    </span>
    <span className="text-border">·</span>
    <span className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
      <span className="font-bold text-amber-600">{healthStats.lowCount}</span>
      <span className="text-muted-foreground">LOW</span>
    </span>
    <span className="text-border">·</span>
    <span className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
      <span className="font-bold text-green-600">{healthStats.okCount}</span>
      <span className="text-muted-foreground">OK</span>
    </span>
    <span className="text-border ml-2">·</span>
    <span className="text-[10px] text-muted-foreground ml-1" data-testid="burst-note">
      Segments pre-loaded · 0 source-options API calls
    </span>
  </div>
)}
```

**Verify:** 4-card grid gone; compact strip with OUT/LOW/OK counts visible.

---

## E9 — DirectDispatchForm.jsx JSX: Category-grouped dispatch table

**Purpose:** Replace flat `dispatchRows.map(...)` table (lines 432–531) with category-grouped layout + filter toolbar.

**Delete** the entire `{selectedDest && !destLoading && dispatchRows.length > 0 && (<Card ...>...</Card>)}` block at lines 433–531.

**Replace with:**
```jsx
{/* CR-050 — category-grouped dispatch table */}
{selectedDest && !destLoading && dispatchRows.length > 0 && (
  <Card className="mb-4" data-testid="dispatch-needs-table">
    {/* Toolbar */}
    <div className="px-4 pt-3 pb-2 flex items-center gap-2 flex-wrap border-b border-border/50">
      {/* Status filter pills */}
      {["all","out","low"].map(f => (
        <button key={f}
          className={`h-6 px-3 rounded-full text-[10px] border transition-colors font-medium
            ${filterStatus === f
              ? f==="out" ? "bg-red-500 text-white border-red-500"
              : f==="low" ? "bg-amber-400 text-white border-amber-400"
              : "bg-foreground text-background border-foreground"
              : "bg-background text-muted-foreground border-border hover:bg-muted"}`}
          tabIndex={-1}
          onClick={() => setFilterStatus(f)}
          data-testid={`filter-pill-${f}`}
        >
          {f.toUpperCase()}
        </button>
      ))}
      <span className="text-border text-xs">|</span>
      {/* Category combobox */}
      <CategoryCombobox
        categories={[...new Set(dispatchRows.map(r => r.category).filter(Boolean))]}
        value={filterCat}
        onChange={setFilterCat}
      />
      {/* Item text search */}
      <input
        className="h-7 border border-input rounded-md px-2 text-xs bg-background min-w-[130px]
                   focus:outline-none focus:border-primary"
        placeholder="Search item…"
        value={searchText}
        onChange={e => {
          setSearchText(e.target.value);
          if (e.target.value) {
            // Auto-expand collapsed cats that have matches
            const q = e.target.value.toLowerCase();
            const matchingCats = new Set(
              dispatchRows
                .filter(r => (r.stockTitle||"").toLowerCase().includes(q))
                .map(r => r.category)
            );
            setCollapsedCats(prev => {
              const next = { ...prev };
              matchingCats.forEach(c => delete next[c]);
              return next;
            });
          }
        }}
        data-testid="dispatch-search-input"
      />
      {/* Master select buttons */}
      <button tabIndex={-1} className="h-6 px-2 text-[10px] border border-border rounded bg-background text-muted-foreground hover:bg-muted"
        onClick={() => setDispatchRows(p => p.map(r => ({ ...r, included: true })))}
        data-testid="dispatch-select-all">Select All</button>
      <button tabIndex={-1} className="h-6 px-2 text-[10px] border border-border rounded bg-background text-muted-foreground hover:bg-muted"
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
            prev[cat] ? (({ [cat]: _, ...rest }) => rest)(prev) : { ...prev, [cat]: true }
          )}
          onCatSelect={(select) => {
            setDispatchRows(p => p.map(r => r.category === cat ? { ...r, included: select } : r));
            if (!select) setCollapsedCats(prev => ({ ...prev, [cat]: true }));
          }}
          onRowUpdate={(idx, field, value) => {
            const globalIdx = dispatchRows.findIndex(r => r === catRows[idx]);
            if (globalIdx >= 0) updateDispatchRow(globalIdx, field, value);
          }}
          submitting={submitting}
        />
      ))}
      {/* Manual add button */}
      <div className="px-4 py-2 border-t border-border/50">
        <Button variant="ghost" size="sm" className="text-xs" onClick={addManualRow}>
          <Plus className="h-3 w-3 mr-1" /> Add item manually
        </Button>
      </div>
    </CardContent>
  </Card>
)}
```

**Import change at top of file:** Add `useCallback` to React import.

---

## E10 — DirectDispatchForm.jsx: Append sub-components

**Append after the closing `}` of `DirectDispatchForm` (after line 626), before end of file.**

### 10a — CategoryCombobox
```jsx
// CR-050 — searchable category combobox (position:fixed avoids overflow clipping)
function CategoryCombobox({ categories, value, onChange }) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const btnRef = React.useRef(null);
  const [pos, setPos] = React.useState({ top: 0, left: 0 });

  const options = [{ v: "all", l: "All Categories" }, ...categories.map(c => ({ v: c, l: c }))];
  const filtered = options.filter(o => !search || o.l.toLowerCase().includes(search.toLowerCase()));
  const label = value === "all" ? "All Categories" : value;

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
    if (e.key === "Enter") { filtered[0] && onChange(filtered[0].v); setOpen(false); }
    else if (e.key === "ArrowDown") { e.preventDefault(); document.querySelector(".cat-combo-list-item")?.focus(); }
    else if (e.key === "Escape") setOpen(false);
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button ref={btnRef} tabIndex={-1}
        onClick={openDropdown}
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
            <input autoFocus className="w-full h-6 text-xs border border-input rounded px-2
                                       focus:outline-none focus:border-primary"
              placeholder="Search category…" value={search}
              onChange={e => setSearch(e.target.value)} onKeyDown={onSearchKey}
              data-testid="cat-combo-search" />
          </div>
          <div className="max-h-40 overflow-y-auto py-1">
            {filtered.map(o => (
              <div key={o.v} tabIndex={0}
                className={`cat-combo-list-item px-3 py-1.5 text-xs cursor-pointer hover:bg-muted/70
                            focus:bg-muted/70 focus:outline-none
                            ${value === o.v ? "bg-primary/10 text-primary font-medium" : ""}`}
                onClick={() => { onChange(o.v); setOpen(false); }}
                onKeyDown={e => {
                  if (e.key === "Enter") { onChange(o.v); setOpen(false); }
                  else if (e.key === "ArrowDown") { e.preventDefault(); (e.target.nextElementSibling)?.focus(); }
                  else if (e.key === "ArrowUp") { e.preventDefault(); e.target.previousElementSibling?.focus() || document.querySelector("[data-testid=cat-combo-search]")?.focus(); }
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
```

### 10b — DispatchCategorySection
```jsx
// CR-050 — category group header + rows
function DispatchCategorySection({ cat, rows, collapsed, onToggle, onCatSelect, onRowUpdate, submitting }) {
  const outN = rows.filter(r => r.isOut).length;
  const lowN = rows.filter(r => r.isLow && !r.isOut).length;

  return (
    <div>
      {/* Category header */}
      <div
        tabIndex={-1}
        onClick={onToggle}
        className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-b border-border/50
                   cursor-pointer hover:bg-muted/50 select-none"
        data-testid={`cat-header-${cat}`}>
        <span className={`text-[10px] text-muted-foreground transition-transform ${collapsed ? "" : "rotate-90"}`}>▶</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/80">{cat}</span>
        <span className="text-[10px] text-muted-foreground">{rows.length} items</span>
        {outN > 0 && <span className="px-1.5 py-0 rounded text-[9px] font-bold bg-red-100 text-red-700">{outN} OUT</span>}
        {lowN > 0 && <span className="px-1.5 py-0 rounded text-[9px] font-bold bg-amber-100 text-amber-700">{lowN} LOW</span>}
        <div className="ml-auto flex gap-1.5" onClick={e => e.stopPropagation()}>
          <button tabIndex={-1} onClick={() => onCatSelect(true)}
            className="h-5 px-2 text-[9px] border border-border rounded bg-background
                       hover:bg-muted text-muted-foreground">Select All</button>
          <button tabIndex={-1} onClick={() => onCatSelect(false)}
            className="h-5 px-2 text-[9px] border border-border rounded bg-background
                       hover:bg-muted text-muted-foreground">Unselect All</button>
        </div>
      </div>

      {/* Rows */}
      {!collapsed && (
        <div className="overflow-x-auto">
          <table className="w-full" style={{ tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "30px" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "70px" }} />
              <col style={{ width: "65px" }} />
              <col style={{ width: "85px" }} />
              <col style={{ width: "210px" }} />
              <col style={{ width: "90px" }} />
              <col />
            </colgroup>
            <thead>
              <tr className="border-b border-border/30">
                {["","Item","At Dest","Cover","Send Qty","Source (FEFO)","After Dispatch","Note"]
                  .map((h, i) => (
                    <th key={i} className="text-[9.5px] font-semibold text-muted-foreground
                                           uppercase tracking-wider px-2 py-1.5 text-left">{h}</th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <DispatchRow
                  key={row.invMasterId}
                  row={row}
                  onUpdate={(field, val) => onRowUpdate(idx, field, val)}
                  submitting={submitting}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

### 10c — DispatchRow
```jsx
// CR-050 — single dispatch row: row-click toggle, FEFO source, inline allocation status
function DispatchRow({ row, onUpdate, submitting }) {
  const handleRowClick = (e) => {
    if (["INPUT","SELECT","BUTTON","A","OPTION"].includes(e.target.tagName)) return;
    onUpdate("included", !row.included);
  };

  const coverText = row.daysOfCover !== null
    ? (row.daysOfCover < 1 ? "<1d" : `~${Math.round(row.daysOfCover)}d`)
    : "—";

  const rowClass = [
    row.isOut ? "bg-red-50/40" : row.isLow ? "bg-amber-50/30" : "",
    !row.included ? "opacity-40" : "",
  ].filter(Boolean).join(" ");

  return (
    <tr className={`border-b border-border/20 cursor-pointer hover:bg-muted/20 ${rowClass}`}
      onClick={handleRowClick}
      data-testid={`dispatch-row-${row.invMasterId}`}>

      {/* Checkbox */}
      <td className="px-2 text-center">
        <input type="checkbox" checked={row.included}
          onChange={e => { e.stopPropagation(); onUpdate("included", e.target.checked); }}
          className="rounded accent-primary"
          tabIndex={0}
          data-testid={`dispatch-check-${row.invMasterId}`} />
      </td>

      {/* Item */}
      <td className="px-2 py-1.5">
        <div className="text-xs font-medium truncate">{row.stockTitle}</div>
        <div className="text-[10px] text-muted-foreground">{row.ownQty} {row.unit} avail</div>
      </td>

      {/* At Dest */}
      <td className={`px-2 text-xs text-right tabular-nums
        ${row.isOut ? "text-red-600 font-semibold" : row.isLow ? "text-amber-600 font-medium" : "text-muted-foreground"}`}>
        {row.destQty} {row.unit}
      </td>

      {/* Cover */}
      <td className={`px-2 text-xs text-right
        ${row.isOut ? "text-red-600 font-semibold" : row.isLow ? "text-amber-600" : "text-muted-foreground"}`}>
        {coverText}
      </td>

      {/* Send Qty */}
      <td className="px-2">
        <div className="flex items-center gap-1">
          <input type="number" min="0" step="1"
            className={`h-6 w-16 text-xs text-right border rounded px-1
              focus:outline-none focus:border-primary tabular-nums
              [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none
              ${row.exceedsOwn ? "border-red-400 bg-red-50" : "border-input"}`}
            value={row.qty}
            onChange={e => onUpdate("qty", e.target.value)}
            disabled={!row.included || submitting}
            data-testid={`dispatch-qty-${row.invMasterId}`}
          />
          <span className="text-[9.5px] text-muted-foreground">{row.unit}</span>
        </div>
        {row.exceedsOwn && (
          <div className="text-[9px] text-red-600 mt-0.5">max {row.ownQty}</div>
        )}
      </td>

      {/* Source (FEFO) */}
      <td className="px-2">
        {row.isUnbatched ? (
          <div className="text-[9.5px] text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 leading-tight">
            No batch tracking — bucket dispatch.{" "}
            <a href="/purchase" className="text-primary underline" tabIndex={-1}>Add purchase</a>
          </div>
        ) : row.fefoAllocs?.length > 0 ? (
          <div className="space-y-0.5">
            {row.fefoAllocs.map((alloc, i) => (
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
                    {alloc.batch} ({alloc.qty} {row.unit})
                  </option>
                </select>
                <span className="text-[8.5px] font-bold bg-green-100 text-green-700 rounded px-1 whitespace-nowrap">
                  FEFO
                </span>
              </div>
            ))}
            {(() => {
              const total = row.fefoAllocs.reduce((s, a) => s + a.qty, 0);
              const need  = Number(row.qty) || 0;
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

      {/* After Dispatch */}
      <td className="px-2 text-right">
        <div className={`text-xs tabular-nums font-mono
          ${row.afterDispatch < 0 ? "text-red-600 font-semibold" : "text-muted-foreground"}`}>
          {row.afterDispatch} {row.unit}
        </div>
        {row.retainPct > 0 && (
          <div className="text-[9.5px] text-muted-foreground">{row.retainPct}% retained</div>
        )}
      </td>

      {/* Note */}
      <td className="px-2 text-[10px] text-muted-foreground">
        {row.fefoShort ? "⚠ Short on stock" : row.suggestion}
      </td>
    </tr>
  );
}
```

---

## E11 — SourceSelector.jsx: Add preloadedSegments opt-in prop

**Purpose:** When `preloadedSegments` prop is provided, skip `getSourceOptions` API call entirely. Additive — all existing callers unaffected.

**Current signature (line 25):**
```javascript
export default function SourceSelector({ fromRestaurantId, inventoryMasterId, value, onChange, disabled }) {
```

**New signature:**
```javascript
// CR-050 — preloadedSegments: when provided, renders compact select directly (no API call)
// All callers that omit preloadedSegments take the existing path unchanged.
export default function SourceSelector({ fromRestaurantId, inventoryMasterId, value, onChange, disabled, preloadedSegments }) {
```

**Insert immediately after the new signature (before `const [mode, ...`):**
```javascript
// CR-050 — preloaded path: skip API call, render compact segment select
if (preloadedSegments !== undefined) {
  const segs = preloadedSegments.filter(s => s.segment_id !== null);
  if (segs.length === 0) {
    return <div className="text-[10px] text-muted-foreground">No segments</div>;
  }
  return (
    <Select
      value={value?.segment_id ? String(value.segment_id) : ""}
      onValueChange={(v) => onChange({ mode: "segment_id", segment_id: Number(v) })}
      disabled={disabled}
    >
      <SelectTrigger className="h-7 text-[10px]" data-testid="source-preloaded-select">
        <SelectValue placeholder="Select segment" />
      </SelectTrigger>
      <SelectContent>
        {segs.map(seg => {
          const daysLeft = seg.expiry_date
            ? Math.ceil((new Date(seg.expiry_date + "T23:59:59") - new Date()) / 86400000)
            : null;
          const expired = daysLeft !== null && daysLeft < 0;
          return (
            <SelectItem key={seg.segment_id} value={String(seg.segment_id)} disabled={expired}>
              {seg.batch || `Seg #${seg.segment_id}`} — {Number(seg.display_qty)} avail
              {seg.expiry_date ? ` (exp: ${seg.expiry_date})` : ""}
              {expired ? " [EXPIRED]" : daysLeft !== null && daysLeft <= 30 ? ` [${daysLeft}d left]` : ""}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
```

**Verify:** Open PendingQueues or TransferDetail → `SourceSelector` renders exactly as before (no regression). Open DirectDispatchForm → no `getSourceOptions` calls on mount.

---

## E12 — RequestStockForm.jsx lines 176 + 189: Integer ceiling

**Purpose:** Request Stock suggestions show integers, consistent with dispatch fix.

**Current line 176:**
```javascript
orderQty = Math.max(0, Math.ceil((projectedNeed - currentStock) * 100) / 100);
```
**New:**
```javascript
orderQty = Math.max(0, Math.ceil(projectedNeed - currentStock)); // CR-050 — integer ceiling
```

**Current line 189:**
```javascript
orderQty = Math.ceil((minQty - currentStock) * 100) / 100;
```
**New:**
```javascript
orderQty = Math.ceil(minQty - currentStock); // CR-050 — integer ceiling
```

**Verify:** Open Request Stock → suggestion quantities are whole numbers.

---

## Execution Sequence

Execute in this order (lowest risk first):

```
1. E12  RequestStockForm.jsx — isolated ceiling fix (2 lines, no deps)
2. E2   DirectDispatchForm.jsx — isolated ceiling fix (2 lines, no deps)
3. E1   DirectDispatchForm.jsx — add includeSegments to getStockInventory call (1 line)
4. E5   DirectDispatchForm.jsx — add state + fefoAutoSelect + getFilteredGrouped helpers
5. E3   DirectDispatchForm.jsx — default included: false
6. E4   DirectDispatchForm.jsx — add segments + FEFO fields to dispatchNeeds items
7. E6   DirectDispatchForm.jsx — re-run FEFO on qty change in updateDispatchRow
8. E7   DirectDispatchForm.jsx — replace stats useMemo with healthStats
9. E11  SourceSelector.jsx — add preloadedSegments prop (verify other screens first)
10. E10 DirectDispatchForm.jsx — append CategoryCombobox, DispatchCategorySection, DispatchRow
11. E8  DirectDispatchForm.jsx — replace 4 KPI tiles with health strip
12. E9  DirectDispatchForm.jsx — replace flat table with category-grouped JSX
```

**Checkpoint after step 9:** Compile must pass. Screenshot `/dispatch/new` to confirm page loads. Only then proceed to E10–E12.

---

## Verification Matrix

| Edit | How to Verify |
|------|--------------|
| E1 | DevTools Network: 0 `/source-options` calls on page mount after dest selected |
| E2 | Dispatch form: Tomato suggestion shows `13` not `12.99` |
| E3 | Page load: all checkboxes unchecked; Dispatch button disabled |
| E4 | DevTools React: `dispatchRows[0].fefoAllocs` populated for stocked items |
| E5 | No console errors; `filterStatus`/`filterCat`/`searchText` state visible |
| E6 | Change qty of stocked item → source select auto-updates to FEFO batch |
| E7 | `healthStats.outCount` + `lowCount` + `okCount` sums = `dispatchRows.length` |
| E8 | Health strip `6 OUT · 7 LOW · 0 OK` visible; 4-card grid gone |
| E9 | Items grouped by category; category headers collapse/expand; filter pills work |
| E10 | `CategoryCombobox` opens with search; `DispatchRow` row-click toggles checkbox |
| E11 | PendingQueues SourceSelector unchanged; DirectDispatch 0 `/source-options` calls |
| E12 | Request Stock: suggestion qty shows whole number |

---

## Post-Code Registry Checklist (for IMPLEMENTATION agent)

```
- [ ] registry.json: CR-050 → status: IMPLEMENTED, artifact_refs Gate 4 → DONE
- [ ] L3_CR_REGISTRY.md: CR-050 row updated
- [ ] L7_FILE_OWNERSHIP.md: DirectDispatchForm.jsx, SourceSelector.jsx, RequestStockForm.jsx entries updated
- [ ] Code markers: grep -rn "// CR-050" frontend/src/ → hits in all 3 files
- [ ] Dashboard drift: node control/gen_dashboard_data.js --check → PASS
- [ ] Compile: tail -5 /var/log/supervisor/frontend.out.log → "Compiled" 0 new warnings
```

---

## Scope Lock Declaration

**WILL change:**
1. `frontend/src/components/central-inventory/DirectDispatchForm.jsx`
2. `frontend/src/components/central-inventory/SourceSelector.jsx`
3. `frontend/src/components/central-inventory/RequestStockForm.jsx`

**Will NOT touch:**
- `frontend/src/services/api.js` — no new functions; call-site change in DirectDispatchForm
- `frontend/src/lib/terminology.js` — FROZEN
- `frontend/src/lib/screenVisibility.js` — FROZEN
- `backend/server.py` — proxy-only, no changes needed
- Any other existing file not listed above
