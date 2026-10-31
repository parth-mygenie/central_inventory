# BUG-053 — Intake Artifact (Gate 1)

> **ID:** BUG-053
> **Type:** BUG
> **Registered:** 2026-10-19
> **Agent Role:** INTAKE
> **Severity:** P1 — HIGH (owner-confirmed; blocks CR-050 from proceeding to QA)
> **Related to:** CR-050 (Direct Dispatch — Spreadsheet UX + FEFO + Burst Fix)
> **Sprint:** S5 (same as CR-050)

---

## Problem Statement

CR-050 was IMPLEMENTED (Gate 4 DONE) but 3 design gaps exist between the locked mock design (`CR-050_MOCK_DESIGN_REAL_DATA.html`) and the live implementation at `/dispatch/new`. These were identified via owner screenshot comparison (2026-10-19) and confirmed by INVESTIGATION role code trace.

---

## Three Gaps

### G1 — Header: Two large cards instead of one compact inline strip

**What owner sees:** `[Back]` button → large "Dispatch for:" card (Calendar icon + 4 day buttons) → separate "Destination Store *" card (full-width dropdown + StoreHealthStrip + amber warning)

**What locked mock shows:** A single slim strip: `[Direct Dispatch icon+title] | [Outlet Direct One ▾] | Dispatch for: [3d][7d][10d][30d]` — all inline, no cards

**Root cause:** Gate 3 plan edits E1–E12 replaced KPI tiles and dispatch table but NO edit was defined for the Coverage selector card (lines 391–411) or the Destination picker card (lines 413–440). IMPLEMENTATION agent correctly followed the plan; the plan was incomplete on this section.

**Evidence (code):**
```javascript
// DirectDispatchForm.jsx line 391–411 — UNCHANGED from original
<Card className="mb-4" data-testid="coverage-selector-card">
  <CardContent ...>
    <Calendar icon /> "Dispatch for:" [3 days][7 days][10 days][30 days]
  </CardContent>
</Card>

// DirectDispatchForm.jsx line 413–440 — UNCHANGED from original
<Card className="mb-4">
  <CardContent ...>
    <Label>Destination Store *</Label>
    <Select .../>
    <StoreHealthStrip .../>
    {todayDispatchWarning && <amber warning div>}
  </CardContent>
</Card>
```

---

### G2 — Only 1 item showing instead of all items

**What owner sees:** Health strip `1 OUT · 0 LOW · 0 OK` — only `makkhan` visible. ALL/OUT/LOW filter pills are present but meaningless with 1 item.

**What locked mock shows:** All 20 items across 2 categories, sorted OUT→LOW→OK. Filter pills narrow the view.

**Root cause:** Two compounding issues:

**Issue A — `if (qtyToSend <= 0) return null` at line 217:**
```javascript
if (qtyToSend <= 0) return null;  // line 217 — excludes ALL items with sufficient dest stock
```
Items where destination already has enough stock (`qtyToSend = 0`) are silently removed. Design intent: ALL items always appear; filter pills let storekeeper drill down.

**Issue B — `destStock.map()` iterates destination items, not own stock:**
```javascript
// line 184 — iterates destStock (destination's items only)
return destStock.map(item => {
  const ownItem = ownStock.find(s => (s.stock_title||"").toLowerCase() === name);
  if (!ownItem) return null;  // items in own stock but not at destination are excluded
```
On RID 828 test account, `destStock` contains items from the outlet; `ownStock` has 75 items. After join + `qtyToSend <= 0` filter, only `makkhan` (the only item with `minQty > destQty AND ownQty > 0`) survives.

**Combined effect on RID 828:**
- 74 items have `ownQty = 0` → `cappedQty = 0` → even if `qtyToSend > 0`, renders as empty
- Line 217 removes items where `qtyToSend = 0` (sufficient dest stock)
- Result: only `makkhan` shows

**Design fix required:**
1. Remove `if (qtyToSend <= 0) return null` — keep all items, mark status appropriately
2. Change iteration source from `destStock.map()` to `ownStock.map()` — show all items storekeeper owns, look up dest qty for each (default 0 if item not at destination). This matches mock intent: storekeeper sees their full inventory and selects what to send.

---

### G3 — "Add item manually" section still present

**What owner sees:** `+ Add item manually` link inside the table footer; when clicked → "ADDITIONAL ITEMS" card with Manual Item 1, `Select item` dropdown, `Quantity`, `Unit`, `Source` — full card shown

**What locked mock shows:** No manual add section. All items are in the list; there is no need to add items manually.

**Root cause:** E9 only replaced the dispatch needs table block. The manual rows section (lines 565, 578, 583–626) was explicitly preserved from the original implementation. No edit in the Gate 3 plan removed it.

**Code locations:**
```
line 565: <Button onClick={addManualRow}>+ Add item manually</Button>  (inside table footer)
line 578: <Button onClick={addManualRow}>+ Add item manually</Button>  (inside empty state)
lines 583–626: {manualRows.length > 0 && <Card>ADDITIONAL ITEMS...</Card>}
line 53:  const [manualRows, setManualRows] = useState([]);
line 313: const addManualRow = () => setManualRows(...)
line 340: const validManualRows = ...
line 341: const allIncluded = [...includedRows, ...validManualRows]
```

**Note on `allIncluded`:** Once manual rows are removed, `allIncluded` becomes `[...includedRows]` only. `handleSubmit` at line 348 uses `allIncluded` — must update to `const allIncluded = includedRows` after removing manual rows.

---

## Code Reality Check

**PARTIAL** — G1 and G3 are entirely absent from the implementation. G2 is a data filtering logic issue (2 lines) vs design intent (all items shown).

---

## Duplicate Check

| Item | Result |
|------|--------|
| CR-050 | **PARENT** — these are post-implementation rectification gaps of CR-050. BUG-053 is a rectification child, not a duplicate. |
| BUG-033 (quick actions pre-select) | DISTINCT — different feature, different file section |
| Any prior dispatch bug | DISTINCT — no prior bug covers header compaction or "show all items" |

**Duplicate check: DISTINCT. Related to CR-050 (parent).**

---

## Blast Radius

```bash
grep -n "manualRows\|Coverage selector\|qtyToSend <= 0\|destStock.map" frontend/src/ -r | wc -l
→ All hits in DirectDispatchForm.jsx only
```

- **Files affected:** `DirectDispatchForm.jsx` — 1 file only
- **Hotspot files:** NO (DirectDispatchForm.jsx is not on the HIGH-RISK list)
- **Estimated scope:** SMALL — 3 contained changes in one file
- **Other screens affected:** NONE — SourceSelector, api.js, RequestStockForm untouched

---

## Evidence

- **Screenshot:** Owner-provided (2026-10-19) showing `/dispatch/new` with 2 large cards, 1 item, manual add section
- **Code trace:** Lines 217, 184, 391–440, 565, 578, 583–626 confirmed by INVESTIGATION role
- **Source:** OWNER-REPORTED (screenshot) + AGENT-CONFIRMED (code trace)
- **Confidence:** CONFIRMED

---

## Open Questions

**None.** All three gaps are confirmed in code. Owner intent is clear from mock design. No business rule decisions needed.

| Decision | Status |
|----------|--------|
| Header layout: compact inline strip | Confirmed from locked mock |
| Show ALL own-stock items | Confirmed from locked mock + owner feedback |
| Remove manual add section | Confirmed: "we dont need it cause all the items will come on list" |

---

## Severity Classification

**P1 — HIGH**
- These 3 gaps together prevent CR-050 from proceeding to Gate 5 QA
- Core storekeeper workflow is broken: only 1 item shows instead of all inventory
- Header layout is significantly different from locked design — owner-rejected

Owner confirmed P1 (implicit: "mock is fine but implemented design is not matching").

---

## Next Step

→ **BUG FIX agent** for BUG-053. All 3 gaps are in `DirectDispatchForm.jsx` only. Fix sequence:

```
Fix A (G2): Change dispatchNeeds to iterate ownStock + remove qtyToSend filter
Fix B (G1): Replace Coverage card + Destination card with compact inline header strip  
Fix C (G3): Remove manual rows button, state, JSX; simplify allIncluded
```

No Gate 3 re-planning needed — all fixes are straightforward contained changes to one file.
