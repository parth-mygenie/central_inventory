# BUG-062 — ARTIFACT 3: IMPLEMENTATION PLAN
> **ID:** BUG-062
> **Artifact:** 3 — Implementation Plan (Gate 3)
> **Date:** 2026-10-20
> **Role:** PLANNING
> **Depends on:** Impact Analysis `control/sessions/BUG-062_ARTIFACT_2_IMPACT_ANALYSIS.md`
> **Gate 4 GO required before coding.**

---

## Summary

Replace the broken `fefoAllocs.map(<1-option select>)` source selector in `DirectDispatchForm.jsx`
with a real `segments_preview`-backed dropdown that shows ALL available batches.
FEFO batch is pre-selected and marked `★ FEFO`. Single-segment items render a static badge.
Over-qty per-batch warning added.

**Scope lock:**
- Files **WILL** change: `frontend/src/components/central-inventory/DirectDispatchForm.jsx`
- Files **will NOT** touch: `SourceSelector.jsx`, `api.js`, `useWriteAction.js`, `App.js`, any other file

**Code Reality:** NONE (confirmed in Impact Analysis).
**Conflicts:** NONE (confirmed in Impact Analysis).

---

## Step 0 — Entry Verification (MANDATORY before coding)

Before making any edit, verify the starting state in the file:

```bash
# Confirm region still matches plan
grep -n "fefoAllocs.*map\|fefoAllocs || \[\]" \
  frontend/src/components/central-inventory/DirectDispatchForm.jsx
```

Expected: lines ~780–782 contain `fefoAllocs || []).length > 0` and `fefoAllocs || []).map`.
If the file has diverged → **STOP. Return to PLANNING.**

---

## Edit 1 — Replace Source Selector Cell (only edit)

**File:** `frontend/src/components/central-inventory/DirectDispatchForm.jsx`
**Location:** inside `DispatchRow` function (starts line 709), the `<td>` for "Source (FEFO)" column.
**Current lines:** 774–813 (entire `<td className="px-2">` block for source selector)

### Verify starting state

View lines 774–813. Confirm they read exactly:

```jsx
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
```

### New code (replace entirely)

```jsx
      <td className="px-2">
        {/* BUG-062 — real segment picker: all batches from segments_preview, FEFO pre-selected */}
        {(() => {
          const batchedSegs = (row.segments_preview || []).filter(s => s.segment_id !== null);
          const fefoRecId = (row.fefoAllocs || [])[0]?.segment_id;
          const selectedId = row.sourceSelector?.segment_id ?? fefoRecId;
          const selectedSeg = batchedSegs.find(s => s.segment_id === selectedId);
          const overBatch = selectedSeg && Number(selectedSeg.display_qty) < Number(row.qty);

          if (row.isUnbatched) return (
            <div className="text-[9.5px] text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 leading-tight">
              No batch tracking — bucket dispatch.{" "}
              <a href="/purchase" className="text-primary underline text-[9px]" tabIndex={-1}>Add purchase</a>
            </div>
          );

          if (batchedSegs.length === 0) return (
            <div className="text-[10px] text-muted-foreground">—</div>
          );

          if (batchedSegs.length === 1) return (
            <div className="space-y-0.5">
              <div className="flex items-center gap-1">
                <span className="text-[10px] bg-green-50 border border-green-200 text-green-800 rounded px-1.5 py-0.5 whitespace-nowrap">
                  {batchedSegs[0].batch || `Seg #${batchedSegs[0].segment_id}`} ({Number(batchedSegs[0].display_qty)} {row.unit})
                </span>
                {fefoRecId === batchedSegs[0].segment_id && (
                  <span className="text-[8.5px] font-bold bg-green-100 text-green-700 rounded px-1 whitespace-nowrap">FEFO</span>
                )}
              </div>
              {overBatch && (
                <div className="text-[9px] text-amber-700">⚠ only {Number(selectedSeg.display_qty)} {row.unit} in this batch</div>
              )}
            </div>
          );

          return (
            <div className="space-y-0.5">
              <select
                className="h-6 text-[10px] border border-green-300 bg-green-50 text-green-800 rounded px-1 w-full min-w-0"
                value={selectedId ? String(selectedId) : ""}
                onChange={e => onUpdate("sourceSelector", { mode: "segment_id", segment_id: Number(e.target.value) })}
                disabled={!row.included || submitting}
                data-testid={`dispatch-source-${row.invMasterId}`}
              >
                {batchedSegs.map(seg => {
                  const expired = seg.expiry_date && new Date(seg.expiry_date + "T23:59:59") <= new Date();
                  return (
                    <option key={seg.segment_id} value={String(seg.segment_id)} disabled={expired}>
                      {seg.batch || `Seg #${seg.segment_id}`} ({Number(seg.display_qty)} {row.unit}){seg.segment_id === fefoRecId ? " ★ FEFO" : ""}{expired ? " [EXPIRED]" : ""}
                    </option>
                  );
                })}
              </select>
              {overBatch && (
                <div className="text-[9px] text-amber-700">⚠ only {Number(selectedSeg.display_qty)} {row.unit} in this batch</div>
              )}
            </div>
          );
        })()}
      </td>
```

### What changed and why

| Old behaviour | New behaviour |
|---|---|
| `fefoAllocs.map(...)` — one `<select>` per FEFO alloc, each with only itself as `<option>` | Single `<select>` listing ALL `segments_preview[]` entries |
| FEFO static badge beside dropdown | `★ FEFO` suffix in the option text of the FEFO-recommended batch |
| `✓ Exact` / `⚠ Short X kg` (FEFO total vs send qty) | `⚠ only X kg in this batch` (selected batch capacity vs send qty) |
| `data-testid="dispatch-source-{id}-{i}"` (index-suffixed) | `data-testid="dispatch-source-{id}"` (single dropdown, no index) |
| Single-segment → still a 1-option dropdown | Single-segment → static badge, no dropdown |
| Multi-alloc (fefoAllocs.length > 1) → 2 selects, sourceSelector=null | Multi-alloc → 1 select with all batches, user picks from all |

### What is NOT changed

- `fefoAutoSelect()` — still runs on load + qty change; still populates `fefoAllocs`
- `autoSource` initialisation (line 220) — still pre-sets `row.sourceSelector` to FEFO segment
- `updateDispatchRow` (line 279) — unchanged; `sourceManuallySet = true` fires on `field === "sourceSelector"` (line 298)
- FEFO re-run guard on qty change (line 293): `allocations.length === 1 && !row.sourceManuallySet` — still correct
- `includedRows` filter (line 316): `r.sourceSelector` — still truthy after fix; works for all 3 states (0-seg excluded automatically since no selection possible, 1-seg pre-set by autoSource, 2+-seg set by user pick)
- Payload builder (line 329): `source_selector: r.sourceSelector` — unchanged
- `SourceSelector.jsx` — not touched

---

## Verification Matrix (seeds Gate 6 QA)

| # | Check | How to Verify |
|---|-------|---------------|
| V1 | American Corn (2 segs): dropdown shows **both** AME-19OCT26-1148 and AME-20OCT26-1332 | Open /dispatch/new → select dest → inspect `<select>` options for American Corn |
| V2 | FEFO batch option text contains `★ FEFO` | Inspect option text for AME-19OCT26-1148 |
| V3 | FEFO batch is pre-selected by default on page load | `select.value` === segment_id of AME-19OCT26-1148 on load |
| V4 | User can switch to AME-20OCT26-1332 | Pick it from dropdown → row.sourceSelector.segment_id changes to 253 |
| V5 | Over-qty warning fires: send 15 kg, batch has 10 kg | `⚠ only 10 kg in this batch` appears below select |
| V6 | No warning when qty ≤ batch qty | Send 5 kg from 10 kg batch → no amber note |
| V7 | Single-batch item: static badge, no `<select>` dropdown | Item with 1 segment shows `<span>` badge, no `<select>` |
| V8 | FEFO override not clobbered on qty change | Pick alt batch → change qty → still alt batch selected |
| V9 | Unbatched item unchanged | Item with all-null segment_ids shows amber bucket dispatch message |
| V10 | Compile: 0 new webpack warnings | `tail -5 /var/log/supervisor/frontend.out.log` → "Compiled" |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|:---:|:---:|---|
| `segments_preview` not populated (API didn't return it) | LOW | LOW | `|| []` guard + `batchedSegs.length === 0` → "—" safe fallback |
| FEFO default not pre-selected | NONE | — | `autoSource` (line 220) still sets `row.sourceSelector` on init; `selectedId = row.sourceSelector?.segment_id ?? fefoRecId` provides double fallback |
| `sourceManuallySet` not set → FEFO re-run clobbers user pick | NONE | — | `updateDispatchRow` line 298 already sets `sourceManuallySet = true` on any `sourceSelector` update; guard at line 293 is unchanged |
| Multi-alloc items (fefoAllocs.length > 1) were sourceSelector=null, excluded from dispatch | HANDLED | — | New dropdown lets user pick 1 batch; `sourceSelector` becomes truthy; row now dispatchable |
| Expired-segment `disabled` on native `<option>` | LOW | LOW | Native HTML `<option disabled>` works cross-browser; expired segs show `[EXPIRED]` label |
| `data-testid` rename breaks existing QA scripts | LOW | LOW | Only BUG-062 tests reference this testid; BUG-054 keyboard nav tests use `dispatch-qty-*` and `dispatch-check-*` — unaffected |

---

## Execution Sequence

1. View `DirectDispatchForm.jsx` lines 774–813 to confirm starting state matches this plan.
2. Apply the single `search_replace` (old block → new block).
3. Verify compile: `tail -5 /var/log/supervisor/frontend.out.log` → "Compiled".
4. Screenshot: `/dispatch/new` → select a destination → confirm source column shows dropdown (not 1-option).
5. Execute EXIT GATE (5 checks).
6. Write QA handover.

---

## Post-Code Registry Checklist (IMPLEMENTATION agent executes after coding)

```
- [ ] registry.json: BUG-062 → status: "IMPLEMENTED", artifact_refs[3] (Impl-Plan) status "DONE"
- [ ] registry.json: artifact_refs[3].path set to "control/sessions/BUG-062_ARTIFACT_3_IMPLEMENTATION_PLAN.md"
- [ ] L4_BUG_TRACKER.md: BUG-062 row updated to IMPLEMENTED
- [ ] L7_FILE_OWNERSHIP.md: DirectDispatchForm.jsx entry updated (BUG-062 added)
- [ ] Code marker: // BUG-062 in changed block (already in new code as JSX comment)
- [ ] Dashboard drift: node control/gen_dashboard_data.js --check → PASS
- [ ] Compile check: tail -5 /var/log/supervisor/frontend.out.log → "Compiled" with 0 new warnings
```

---

## Handover → Gate 4 (Owner GO)

```
Gate 3 complete for BUG-062.
Artifact: control/sessions/BUG-062_ARTIFACT_3_IMPLEMENTATION_PLAN.md

1 file. 1 region (lines 774–813). No new state. No new props. No other files touched.
Code Reality: NONE. No conflicts.
Owner decisions: ★ FEFO label + warn-only. Both confirmed in Impact Analysis.

Scope lock:
  WILL change: frontend/src/components/central-inventory/DirectDispatchForm.jsx
  will NOT touch: SourceSelector.jsx, api.js, or any other file

Verification matrix: 10 checks (all manual browser/compile).

Awaiting Gate 4 GO to proceed to IMPLEMENTATION.
```
