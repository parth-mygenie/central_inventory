# INVESTIGATION — Dispatch Source Selector: Manual Segment Selection
> **Date:** 2026-10-20
> **Role:** INVESTIGATION
> **Triggered by:** Owner screenshot — "before dispatch multi segment we should be able
>   to select the segment — it's coming pre-selected only"
> **File:** `frontend/src/components/central-inventory/DirectDispatchForm.jsx`
> **API probed:** inventory-transfer/initiate (live, RID 828 → 827)
> **Related:** BUG-060 (multi-alloc wiring) — this is a distinct, simpler issue

---

## Step 1 — What the Owner Sees

Screenshot shows American Corn SOURCE (FEFO) column:

```
┌─────────────────────────────────┐
│ AME-19OCT26-1148 (10 kg)    ▾  │  ← dropdown, FEFO badge, ✓ Exact
└─────────────────────────────────┘
```

The dropdown LOOKS like a selector but behaves like a label — there is only ONE option inside it.
The user cannot choose a different batch.

---

## Step 2 — Data Flow Trace

### What the API gives us

```
segments_preview for American Corn (id=20807):
  seg_id=243  batch=AME-19OCT26-1148  qty=10  expiry=2026-11-20   ← FEFO picks this (earlier expiry)
  seg_id=253  batch=AME-20OCT26-1332  qty=10  expiry=None
```

Two segments exist. The storekeeper should be able to pick either one.

### What the frontend does (lines 55–73, 219–222)

```javascript
// 1. FEFO runs on all available segments, greedy fill
fefoAutoSelect(ownSegments, sendQty)
  → eligible = segments with segment_id != null + not expired
  → sorted by expiry ASC
  → greedy: take from seg_243 first (expiry Nov 2026)
  → allocations = [{ segment_id: 243, qty: 10 }]  ← single alloc

// 2. autoSource set ONLY when exactly 1 alloc
autoSource = fefoAllocs.length === 1
  ? { mode: "segment_id", segment_id: 243 }   ← locked in
  : null

// 3. Row initialised with autoSource as sourceSelector
sourceSelector: autoSource   ← { mode: "segment_id", segment_id: 243 }
```

### What the dropdown renders (lines 782–799)

```jsx
{fefoAllocs.map((alloc, i) => (
  <select value={String(alloc.segment_id)} ...>
    <option value={String(alloc.segment_id)}>        ← ONE option only
      {alloc.batch} ({alloc.qty} {row.unit})
    </option>
  </select>
))}
```

**Root cause:** The `<select>` is built from `fefoAllocs[]` — only the FEFO-chosen segments.
Each alloc gets exactly ONE `<option>` with itself. There are no other options to pick from.

`segments_preview` (which has ALL batches) is stored on the row but never used to populate
the dropdown options. The dropdown is visually a select control but functionally a read-only label.

---

## Step 3 — API Probe: Can we choose a non-FEFO segment?

```bash
# Probe A: single item, segment_id 246 (Apple, seg APP-19OCT26-1528)
POST inventory-transfer/initiate
{ from:828, to:827, items:[{ source_inventory_master_id:20808, qty:3, source_selector:{mode:"segment_id",segment_id:246} }] }
→ status: false, error_code: "LEGACY_SELECTOR_REQUIRED"

# Probe B: same master_id twice, different segment_ids
POST inventory-transfer/initiate
{ from:828, to:827, items:[{...seg:246, qty:3}, {...seg:251, qty:3}] }
→ status: false, error_code: "LEGACY_SELECTOR_REQUIRED"
```

**LEGACY_SELECTOR_REQUIRED** means the stock in this test account (828) was added before the
new batch/segment tracking system (pre-CR-047 purchases). The API's segment table has entries
but marks them as "legacy" — it only accepts `filter_bucket` mode for this stock.

**This is a test-data quality issue, NOT a contract issue.** Stock added via the new
`add-purchase` endpoint (CR-047) creates properly-tracked segments that accept `segment_id` mode.
Production accounts with new-style purchases can use `segment_id` dispatch.

**Key finding on multi-source (BUG-060 pre-planning question):**
The duplicate-master-id probe (Probe B) was blocked by LEGACY_SELECTOR_REQUIRED before the API
could even validate the duplicate-id question. Cannot confirm or deny multi-source support from
this test data. Needs fresh stock added via CR-047 purchase to test properly.

---

## Step 4 — Root Cause Classification

| Issue | Category | Fix |
|-------|----------|-----|
| Dropdown shows only FEFO batch, no alternatives | **Frontend bug** — `<select>` options built from `fefoAllocs[]` not `segments_preview[]` | PLANNING → BUG FIX |
| Multi-batch split dispatch (BUG-060) | **Frontend incomplete + API unknown** | API probe needed on new-style stock |
| LEGACY_SELECTOR_REQUIRED on test stock | **Test data quality** (pre-CR-047 stock) | Not a code bug |

---

## Step 5 — Proposed Design: Real Segment Selector

### Single unified `<select>` — all batches as options

Replace the current `fefoAllocs.map(<select with 1 option>)` with a SINGLE dropdown
that lists every batch from `segments_preview`. FEFO recommendation is highlighted.

**Visual:**

```
SOURCE (FEFO) column:
┌──────────────────────────────────────────┐
│ AME-19OCT26-1148  10 kg  expiry Nov-26 ▾ │  ← FEFO-recommended, pre-selected
├──────────────────────────────────────────┤
│ AME-19OCT26-1148  10 kg  ★ FEFO          │  ← FEFO badge as option label
│ AME-20OCT26-1332  10 kg  no expiry       │  ← alternative, user can pick
└──────────────────────────────────────────┘
```

**Behaviour:**
- Dropdown opens with ALL batches from `segments_preview`
- FEFO-recommended segment is pre-selected by default (same as today)
- User can switch to any other batch
- `onChange` sets `sourceSelector = { mode: "segment_id", segment_id: selected }`
- `sourceManuallySet = true` on override — FEFO re-run on qty change won't clobber it

**Single-segment item (no choice):** If only 1 segment exists → show as non-interactive badge
(no dropdown needed — nothing to choose). This avoids a pointless 1-option dropdown.

**No-segment item (unbatched):** Current `bucket dispatch` message unchanged.

### Qty / availability note

When user selects a segment, show inline:
- If `selectedSeg.display_qty >= row.qty`: `✓ enough stock`
- If `selectedSeg.display_qty < row.qty`: `⚠ only {x} kg in this batch`

This guides the storekeeper without blocking them (they may know more than the system).

### Multi-batch split (BUG-060 — separate)

When `row.qty > selectedSeg.display_qty`, a future enhancement could offer:
"Use multiple batches?" toggle to enter per-batch quantities. This is BUG-060 scope —
not part of this fix. This fix only addresses single-batch selection.

---

## Step 6 — Scope

| Change | File | Lines | Risk |
|--------|------|-------|------|
| Replace `fefoAllocs.map(<1-option select>)` with `segments_preview`-backed real selector | `DirectDispatchForm.jsx` | ~20 lines replace | LOW |
| Add `selectedSeg.display_qty` availability note | `DirectDispatchForm.jsx` | ~5 lines add | LOW |
| When only 1 segment: show static badge, no dropdown | `DirectDispatchForm.jsx` | ~3 lines | LOW |

**1 file. SMALL scope. No API changes.**

---

## Open Questions for Owner

1. When user manually picks a different batch (overriding FEFO), should the FEFO badge disappear or stay with a note like "FEFO override"?
   **Recommendation:** Show `FEFO` badge on the recommended option text; no badge when user picks another.

2. If selected batch has less stock than `Send Qty`, should the row be blocked from dispatch, or show a warning but allow it?
   **Recommendation:** Show `⚠ only X kg in this batch` warning — don't block (storekeeper knows their stock).

---

## Relation to BUG-060

| Item | Scope |
|------|-------|
| **This investigation** | Single-batch free selection — storekeeper picks WHICH batch to send all qty from |
| **BUG-060** | Multi-batch split — storekeeper splits qty across 2+ batches (e.g. 5kg from batch A + 5kg from batch B) |

These are sequential: fix single-batch selection first, then build multi-batch on top of it.
