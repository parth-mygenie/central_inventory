# BUG-053 — Gate 2: Impact Analysis

> **ID:** BUG-053
> **Artifact:** 2 — Impact Analysis
> **Role:** PLANNING
> **Date:** 2026-10-19
> **Source:** INVESTIGATION role output (2026-10-19) — reformatted, no new probes needed
> **Gate 3:** WAIVED per CODE_GATE_POLICY.md (P1 BUG, Gate 3 waivable)
> **Gate 4:** WAIVED per CODE_GATE_POLICY.md (P1 BUG, Gate 4 waivable)
> **Feeds:** BUG FIX agent directly

---

## Conflict Pre-Check

### L7 File Ownership

| File | Last Modifier | Last Item | Risk |
|------|--------------|-----------|------|
| `DirectDispatchForm.jsx` | CR-050 (2026-10-19) | CR-050 Gate 4 implementation | ✅ CR-050 is IMPLEMENTED — no open item on this file |

**Conflict:** NONE. CR-050 Gate 4 is complete (status: IMPLEMENTED). BUG-053 is the only active item on this file. Safe to fix.

---

## Root Cause Confirmation (from INVESTIGATION)

All three gaps confirmed in code. No new probes required.

---

## Gap A — `dispatchNeeds` iterates `destStock` + filters out zero-need items

### Location
`DirectDispatchForm.jsx` line 183–217

### Current code
```javascript
// line 183 — iterates DESTINATION stock, not own stock
const dispatchNeeds = useMemo(() => {
  if (!destStock.length || !ownStock.length) return [];
  return destStock.map(item => {               // ← PROBLEM: destStock has destination items only
    ...
    if (qtyToSend <= 0) return null;           // ← PROBLEM: removes items with enough dest stock
    const cappedQty = Math.min(qtyToSend, ownQty);
    // NOTE: no filter on cappedQty=0 — items with ownQty=0 survive with qty="0"
    ...
  }).filter(Boolean)
    ...
}, [destStock, ownStock, destConsumptionMap, coverageDays]);
```

### Why it shows only 1 item on RID 828

On `owner@mygenietest002.com` (RID 828):
- `destStock` = outlet's stock summary (items the outlet has)
- 74 of 75 own items have `ownQty = 0` (no purchases except makkhan)
- Line 217 removes any item where `qtyToSend = 0` (outlet has enough)
- Result: only `makkhan` (`minQty=100, destQty=0, ownQty=2`) passes all filters → `1 OUT`

### Design intent
Show **all items from own stock** (`ownStock.map`), look up destination quantity for each, mark OUT/LOW/OK. If dest qty not found → destQty = 0. Never filter by `qtyToSend` — storekeeper decides what to send.

### Fix
```javascript
// CHANGE: iterate ownStock (not destStock)
return ownStock.map(ownItem => {
  const name = (ownItem.stock_title || "").toLowerCase();
  const destItem = destStock.find(d => (d.stock_title || "").toLowerCase() === name);
  const destQty = parseFloat(destItem?.display_quantity) || 0;
  const minQty  = parseFloat(destItem?.min_qty_alert || ownItem.min_qty_alert) || 0;
  ...
  // REMOVE: if (qtyToSend <= 0) return null;
  // KEEP all items; suggested qty may be 0 for OK items
  const cappedQty = Math.min(Math.max(qtyToSend, 0), Number(ownItem.display_qty) || 0);
  ...
  isOut: destQty === 0 && (avgDaily > 0 || minQty > 0),
  isLow: !isOut && qtyToSend > 0 && daysOfCover !== null && daysOfCover < coverageDays,
  // OK: everything else
});
// REMOVE .filter(Boolean) for the null-return guard (keep dedup + sort)
```

**Risk:** LOW — data shape of `ownItem` vs `destItem` is well-understood. `ownItem` has `display_qty` (string → `Number()` wrap, CI-R3); `destItem` has `display_quantity`. No new API calls.

---

## Gap B — Two large cards instead of compact inline header

### Location
`DirectDispatchForm.jsx` lines 382–440

### Current code
```jsx
// lines 382–389 — Back button + title + description (3 separate elements)
<button>← Back</button>
<div><Truck/><h1>Direct Dispatch</h1></div>
<p>Send stock to a store in your hierarchy</p>

// lines 391–411 — Card 1: Coverage selector
<Card data-testid="coverage-selector-card">
  <CardContent>
    <Calendar/> "Dispatch for:" [3 days][7 days][10 days][30 days]
    {no consumption data note}
  </CardContent>
</Card>

// lines 413–440 — Card 2: Destination picker
<Card>
  <CardContent>
    <Label>Destination Store *</Label>
    <Select/>
    <StoreHealthStrip/>
    {todayDispatchWarning}
  </CardContent>
</Card>
```

### Design intent (locked mock)
One compact inline strip — all on a single row:
```
[← Back] [Dispatch Stock icon+title] | [Outlet Direct One ▾] | Dispatch for: [3d][7d][10d][30d]
         ↑ same line as title          ↑ dest selector          ↑ coverage pills
```
Below that: duplicate dispatch warning inline (not in a card), health strip.

### Fix
Replace lines 382–440 with a single `<div>` flex row:
```jsx
// Row 1: Back + title + dest selector + coverage pills
<div className="flex items-center gap-3 mb-3 flex-wrap border border-border rounded-lg px-3 py-2 bg-background">
  <button onClick={() => navigate(-1)}>← Back</button>
  <div className="w-px h-5 bg-border" />
  <Truck/> <span className="font-bold text-sm">Direct Dispatch</span>
  <div className="w-px h-5 bg-border" />
  <Select> {/* destination selector — compact, no Label/card wrapper */} </Select>
  <div className="w-px h-5 bg-border" />
  <span className="text-xs text-muted-foreground">Dispatch for:</span>
  <div className="flex gap-1">
    {COVERAGE_OPTIONS.map(opt => <Button pill ... />)}
  </div>
  {!hasConsumptionData && selectedDest && (
    <span className="text-[10px] text-muted-foreground ml-auto">No consumption data — using thresholds</span>
  )}
</div>

// Row 2 (conditional): StoreHealthStrip + todayDispatchWarning inline — NOT in a card
{selectedDest && <StoreHealthStrip ... />}
{todayDispatchWarning && <inline amber warning div>}
```

**Risk:** LOW — purely cosmetic restructure. No state changes. `StoreHealthStrip` component usage unchanged; just moved out of card wrapper. `Select` component receives same `value`/`onValueChange` props.

**Preserve:** `data-testid="dispatch-dest-select"` on the Select trigger; `data-testid="coverage-{n}d"` on pills; `data-testid="duplicate-dispatch-warning"` on the amber div.

---

## Gap C — "Add item manually" section still present

### Location
Multiple locations in `DirectDispatchForm.jsx`

| Location | Line | What |
|----------|------|------|
| State | 53 | `const [manualRows, setManualRows] = useState([])` |
| Handler | 313 | `const addManualRow = ...` |
| Handler | 314–318 | `const removeManualRow = ...` |
| Handler | 319–330 | `const updateManualRow = ...` |
| Derived | 340 | `const validManualRows = manualRows.filter(...)` |
| Derived | 341 | `const allIncluded = [...includedRows, ...validManualRows]` |
| JSX | 565–566 | `+ Add item manually` button (inside table card footer) |
| JSX | 577–579 | `+ Add item manually` button (inside empty-state card) |
| JSX | 583–626 | `{manualRows.length > 0 && <Card>ADDITIONAL ITEMS...</Card>}` |
| Submit | 356–365 | `...validManualRows.map(r => {...})` in `payloadItems` |

### Fix
- **Delete** all 9 locations above
- **Simplify** `allIncluded`:
  ```javascript
  // BEFORE:
  const allIncluded = [...includedRows, ...validManualRows];
  // AFTER:
  const allIncluded = includedRows;
  ```
- **Simplify** `payloadItems` in `handleSubmit` — remove `validManualRows.map(...)` spread
- **Remove** unused imports after cleanup: `Trash2` (if only used in manual rows)
- **BUG-033 preserve:** `preselectedItemId` logic at lines 271–281 adds item as a **manual row** — this must be re-wired to add directly to `dispatchRows` instead, OR simply removed (BUG-033 pre-select is now redundant since all items are shown in the list)

**Risk:** LOW. State deletion is clean. The BUG-033 pre-select wire needs care — see note above.

---

## Downstream Impact

| Consumer | Impact |
|----------|--------|
| `handleSubmit` payload | `validManualRows` removed — payload is `includedRows` only; same API shape |
| BUG-033 pre-select (`?item=` URL param) | Pre-select via manual row no longer works; but since all items are now visible in the list, the storekeeper can find and check the item manually. Net UX impact: neutral. |
| `SourceSelector` | Unchanged — manual row `SourceSelector` removed, but `DispatchRow` still uses `SourceSelector` for suggested rows |
| `allItems` state | Used only by manual rows + BUG-033 wire — can be removed too OR kept (no harm, just unused) |

---

## Scope Lock

**File WILL change:** `DirectDispatchForm.jsx` — 1 file only

**Files will NOT touch:**
- `SourceSelector.jsx` — no changes
- `api.js` — no changes
- Any frozen file

---

## Verification Matrix (seeds Gate 5 QA)

| # | Check | How |
|---|-------|-----|
| V1 | All own-stock items visible (not just OUT) | Select dest → all items appear across categories |
| V2 | Health strip shows correct OUT/LOW/OK counts | `1 OUT · 0 LOW · 74 OK` on RID 828 (makkhan OUT, rest OK since ownQty=0 → can't dispatch) |
| V3 | Filter pill ALL shows all items | Count rows = `ownStock.length` |
| V4 | Filter pill OUT shows only out items | Count rows = OUT count from health strip |
| V5 | Filter pill LOW shows only low items | Count rows = LOW count |
| V6 | No "Add item manually" button anywhere | Inspect DOM: no `addManualRow` trigger |
| V7 | No "ADDITIONAL ITEMS" card | Inspect DOM: no `manual-dispatch-row-*` testid |
| V8 | Compact header: single strip not two cards | Inspect: no `coverage-selector-card` testid |
| V9 | Destination selector in header row | Inspect: `dispatch-dest-select` in header strip |
| V10 | Coverage pills in header row | Inspect: `coverage-3d` etc. in header strip |
| V11 | `todayDispatchWarning` still shows inline | Select dest with prior dispatch → amber warning visible below header |
| V12 | Submit payload unchanged (flat items[]) | Network tab: POST `/initiate` has same shape |
| V13 | BUG-033 `?item=` no longer crashes | Navigate to `/dispatch/new?item=20878` → page loads, no error |

---

## Post-Code Registry Checklist (for BUG FIX agent)

```
- [ ] registry.json: BUG-053 → status: IMPLEMENTED, artifact_refs Gate 4 (waived) done
- [ ] L4_BUG_TRACKER.md: BUG-053 row updated
- [ ] L7_FILE_OWNERSHIP.md: DirectDispatchForm.jsx entry updated (BUG-053)
- [ ] Code markers: grep -rn "// BUG-053" frontend/src/ → hits in DirectDispatchForm.jsx
- [ ] Dashboard drift: node control/gen_dashboard_data.js --check → PASS
- [ ] Compile: tail -5 /var/log/supervisor/frontend.out.log → 0 new errors
```

---

## Gate 2 Summary

| Field | Value |
|-------|-------|
| Files affected | 1 (`DirectDispatchForm.jsx`) |
| Conflict | NONE |
| Risk | LOW across all 3 gaps |
| Owner decisions | NONE |
| Gate 3 | WAIVED |
| Gate 4 | WAIVED |
| Verification checks | 13 |

**→ BUG FIX agent can proceed immediately.**
