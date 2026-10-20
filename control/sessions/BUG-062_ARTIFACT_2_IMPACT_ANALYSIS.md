# BUG-062 — ARTIFACT 2: IMPACT ANALYSIS
> **ID:** BUG-062
> **Artifact:** 2 — Impact Analysis (Gate 2)
> **Date:** 2026-10-20
> **Role:** PLANNING
> **Stage dispatch:** Impact Analysis only — STOP at Gate 2
> **Investigation:** `control/sessions/INVESTIGATION_20261020_DISPATCH_SEGMENT_SELECTOR.md`

## Owner decisions confirmed
1. FEFO option marked with `★ FEFO` in option text
2. Over-qty: warn only (`⚠ only X kg in this batch`) — do not block dispatch

---

## Step 0 — Code Reality Check

```bash
grep -n "segments_preview.*option\|★\|display_qty.*batch" \
  frontend/src/components/central-inventory/DirectDispatchForm.jsx
```
→ **0 matches.** Fix does not exist. Code Reality: **NONE**.

---

## Step 1 — Conflict Pre-Check

**L7 last modifier of `DirectDispatchForm.jsx`:** BUG-054 (2026-10-19) — IMPLEMENTED.

**Open items on same file:**

| Item | Status | Overlaps? |
|------|:------:|-----------|
| CR-033 | QA | Touches dispatch screen but is pre-CR-050 audit — no active code in flight. No overlap. |
| BUG-060 | REGISTERED | Multi-batch split — no plan/code yet. BUG-062 is a prerequisite for BUG-060. No conflict. |
| BUG-062 | This item | — |

**Verdict: NO CONFLICTS.**

---

## Step 2 — Data Flow Trace

### Available data on each `row` in `DispatchRow`

```
row.segments_preview[]  — ALL batches loaded from ownItem.segments_preview (API)
  [{ segment_id: 243, batch: "AME-19OCT26-1148", display_qty: 10, expiry_date: "2026-11-20" },
   { segment_id: 253, batch: "AME-20OCT26-1332", display_qty: 10, expiry_date: null }]

row.fefoAllocs[]        — FEFO-selected allocations (subset of segments_preview)
  [{ segment_id: 243, qty: 10, batch: "AME-19OCT26-1148", ... }]
  (Only 1 entry for qty ≤ first segment's capacity. 2 entries if qty spans two segments.)

row.sourceSelector      — what gets sent in payload
  { mode: "segment_id", segment_id: 243 }   ← set by autoSource when fefoAllocs.length === 1
  null                                        ← when fefoAllocs.length > 1

row.sourceManuallySet   — true after storekeeper overrides; prevents FEFO re-run from clobbering
```

### Current render path (lines 774–813)

```
if isUnbatched → amber "No batch tracking — bucket dispatch"
else if fefoAllocs.length > 0
  → fefoAllocs.map((alloc, i) => <select value={alloc.segment_id}>
       <option value={alloc.segment_id}>{alloc.batch} ({alloc.qty})</option>   ← ONE option only
     </select>  +  FEFO badge)
  → ✓ Exact / ⚠ Short note
else → "—"
```

**Problem:** `<select>` is built from `fefoAllocs[]` — only FEFO-chosen segments.
ONE `<option>` per alloc. No other choices visible. `segments_preview[]` (all batches) is
unused for option population.

### Proposed render path

```
if isUnbatched → unchanged: amber "No batch tracking — bucket dispatch"

else if segments_preview.length === 0 → "—"  (no eligible segments)

else if segments_preview.length === 1
  → static green badge: "{batch} ({display_qty} {unit})"  ← nothing to choose, no dropdown
  → FEFO badge if it matches fefoAllocs[0]
  → sourceSelector already set to this one segment

else (segments_preview.length ≥ 2)
  → SINGLE <select> with ALL segments_preview entries as <option>
    - value = row.sourceSelector?.segment_id  OR  fefoAllocs[0]?.segment_id  (FEFO default)
    - option text: "{batch} ({display_qty} {unit}){isFefoRec ? ' ★ FEFO' : ''}"
    - onChange → onUpdate("sourceSelector", { mode:"segment_id", segment_id: Number(v) })
    - disabled={!row.included || submitting}
  → availability note (below select):
    selectedSeg.display_qty >= row.qty → nothing shown
    selectedSeg.display_qty <  row.qty → "⚠ only {selectedSeg.display_qty} {unit} in this batch"
```

### Value derivation for the new `<select>`

```javascript
// Inside DispatchRow — derived from props (no new state needed)
const segments = row.segments_preview || [];
const fefoRecId = row.fefoAllocs?.[0]?.segment_id;              // FEFO recommendation
const selectedId = row.sourceSelector?.segment_id ?? fefoRecId; // current selection
const selectedSeg = segments.find(s => s.segment_id === selectedId);
const overBatch = selectedSeg && Number(selectedSeg.display_qty) < Number(row.qty);
```

**No new state introduced.** All derivation is from existing `row` props.

---

## Affected Files

| File | Lines | Change Type | Risk |
|------|-------|-------------|------|
| `DirectDispatchForm.jsx` | 780–810 | Replace ~30 lines with ~35 lines | LOW |

**Only one region in one file changes.** Everything outside lines 780–810 is untouched:
- `fefoAutoSelect()` — unchanged (still runs, still populates `fefoAllocs`, still used as default)
- `autoSource` initialisation — unchanged (still pre-selects FEFO batch on load)
- `updateDispatchRow()` — unchanged (sourceManuallySet already handled at line 298)
- Payload builder — unchanged (`source_selector: r.sourceSelector` still correct)
- `includedRows` filter — unchanged (`r.sourceSelector` still truthy after fix)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|:----------:|:------:|-----------|
| FEFO default not pre-selected on load | NONE | — | `autoSource` still sets `row.sourceSelector` = FEFO segment on initialisation. `selectedId = row.sourceSelector?.segment_id ?? fefoRecId` falls back to fefoRec if null. |
| Qty change re-runs FEFO and clobbers manual selection | NONE | — | Line 293: `if (allocations.length === 1 && !row.sourceManuallySet)` — guard already exists. Once user picks via dropdown, `sourceManuallySet = true` (line 298). FEFO re-run won't override. |
| Multi-alloc rows (fefoAllocs.length > 1) currently show 2 selects | HANDLED | — | Replaced by 1 select with all segments. sourceSelector was null for multi-alloc — now set by user pick. Row becomes dispatchable. |
| API LEGACY_SELECTOR_REQUIRED on test stock | TEST DATA | LOW | Only affects pre-CR-047 stock in test account. Production stock added via CR-047 uses proper segments. Not a code issue. |
| `segments_preview` empty when segments not loaded | LOW | LOW | `|| []` guard + `length === 0` case shows "—" safely. |

---

## Downstream Consumers

| Consumer | Change? |
|----------|---------|
| `includedRows` filter (line 316): `r.included && qty > 0 && r.sourceSelector` | **Better** — multi-alloc rows (previously sourceSelector=null, excluded) now get a selector set by user |
| Payload (line 329): `source_selector: r.sourceSelector` | Unchanged — still sends single segment_id |
| `updateDispatchRow` qty handler (lines 289–295) | Unchanged — FEFO re-run + sourceManuallySet guard already correct |
| BUG-054 keyboard nav (`dispatch-qty-*` testids) | Unchanged — different cell |

---

## Verification Matrix (seeds Gate 6 QA)

| # | Check | How |
|---|-------|-----|
| V1 | American Corn (2 batches): dropdown shows BOTH AME-19OCT26-1148 and AME-20OCT26-1332 | Open /dispatch/new, inspect select options |
| V2 | FEFO batch has `★ FEFO` in option text | AME-19OCT26-1148 option shows `★ FEFO` |
| V3 | FEFO batch is pre-selected by default | Select value = AME-19OCT26-1148 on load |
| V4 | User can switch to AME-20OCT26-1332 | Select it; dispatch includes that segment_id |
| V5 | Over-qty warning: send 15kg but batch has 10kg | `⚠ only 10 kg in this batch` shown |
| V6 | No warning when qty ≤ batch qty | Send 5kg from 10kg batch → no warning |
| V7 | Single-batch item: static badge, no dropdown | Item with 1 segment shows badge not select |
| V8 | FEFO override not clobbered on qty change | Pick alt batch → change qty → still alt batch |
| V9 | sourceManuallySet=true after override | Check: qty change after override keeps chosen batch |

---

## Open Questions

None. Owner decisions confirmed above. Code path is unambiguous.

---

## Handover → Gate 3

```
Gate 2 complete for BUG-062.
Artifact: control/sessions/BUG-062_ARTIFACT_2_IMPACT_ANALYSIS.md

1 file. 1 region (lines 780–810). No state changes, no new props.
Code Reality: NONE. No conflicts.
Owner decisions: ★ FEFO label + warn-only. Both confirmed.

Awaiting "gate 3" to proceed to Implementation Plan.
```
