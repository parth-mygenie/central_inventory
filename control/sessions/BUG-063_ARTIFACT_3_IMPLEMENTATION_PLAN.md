# BUG-063 — ARTIFACT 3: IMPLEMENTATION PLAN
> **ID:** BUG-063
> **Artifact:** 3 — Implementation Plan (Gate 3)
> **Date:** 2026-10-20
> **Role:** PLANNING
> **Gate 4 GO:** "go for it" (owner, 2026-10-20)

---

## Scope Lock
- Files **WILL** change: `frontend/src/components/central-inventory/DirectDispatchForm.jsx`
- Files **will NOT** touch: `SourceSelector.jsx`, `api.js`, `select.jsx`, any other file

---

## Step 0 — Entry Verification (MANDATORY)

```bash
grep -n "return (" frontend/src/components/central-inventory/DirectDispatchForm.jsx \
  | grep -A5 "810\|811\|812"
```
Confirm lines ~810–832 contain the native `<select>` block (the `return (` branch of the multi-segment path). If lines have shifted from BUG-062 landing → **adjust line numbers accordingly before editing.**

---

## Edit 1 — Replace native `<select>` with Shadcn `<Select>` (only edit)

**File:** `frontend/src/components/central-inventory/DirectDispatchForm.jsx`
**Location:** Inside the IIFE return for `batchedSegs.length >= 2` (multi-segment path)

### Verify starting state (exact text to find)

```jsx
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
```

### New code

```jsx
          return (
            <div className="space-y-0.5">
              {/* BUG-063 — Shadcn Select: full-width button trigger, entirely clickable; disabled only on submit */}
              <Select
                value={selectedId ? String(selectedId) : ""}
                onValueChange={v => onUpdate("sourceSelector", { mode: "segment_id", segment_id: Number(v) })}
                disabled={submitting}
              >
                <SelectTrigger
                  className="h-7 text-[10px] border-green-300 bg-green-50 text-green-800 px-1.5"
                  data-testid={`dispatch-source-${row.invMasterId}`}
                >
                  <SelectValue placeholder="Select batch" />
                </SelectTrigger>
                <SelectContent>
                  {batchedSegs.map(seg => {
                    const expired = seg.expiry_date && new Date(seg.expiry_date + "T23:59:59") <= new Date();
                    return (
                      <SelectItem key={seg.segment_id} value={String(seg.segment_id)} disabled={expired}>
                        {seg.batch || `Seg #${seg.segment_id}`} ({Number(seg.display_qty)} {row.unit}){seg.segment_id === fefoRecId ? " ★ FEFO" : ""}{expired ? " [EXPIRED]" : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {overBatch && (
                <div className="text-[9px] text-amber-700">⚠ only {Number(selectedSeg.display_qty)} {row.unit} in this batch</div>
              )}
            </div>
          );
```

### Key API differences — native vs Shadcn

| Native `<select>` | Shadcn `<Select>` |
|---|---|
| `value` on `<select>` | `value` on `<Select>` root |
| `onChange={e => ...(e.target.value)}` | `onValueChange={v => ...(v)}` |
| `disabled` on `<select>` | `disabled` on `<Select>` root |
| `data-testid` on `<select>` | `data-testid` on `<SelectTrigger>` |
| `<option disabled>` | `<SelectItem disabled>` |

---

## Verification Matrix

| # | Check | How |
|---|-------|-----|
| V1 | Clicking text area of dropdown opens option list | Click text, not arrow — list opens |
| V2 | Dropdown opens on unchecked rows | Unchecked row → click source → list opens |
| V3 | Source pre-selection on unchecked row retained when row checked | Pick batch → check row → submit → correct segment_id in payload |
| V4 | `★ FEFO` still in option text | Open dropdown → FEFO option shows `★ FEFO` |
| V5 | Over-qty warning still shown | send qty > batch qty → `⚠ only X kg` |
| V6 | Row-click toggle still works | Click item-name cell → row checks/unchecks |
| V7 | Row-click does NOT fire when clicking source trigger | Click trigger → list opens, row state unchanged |
| V8 | Single-segment badge path unchanged | 1-seg item → badge not dropdown |
| V9 | Compile: 0 new warnings | `tail -5 /var/log/supervisor/frontend.out.log` |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-063 → IMPLEMENTED; Gates 3+4 DONE
- [ ] L4_BUG_TRACKER.md: BUG-063 row updated
- [ ] L7_FILE_OWNERSHIP.md: DirectDispatchForm.jsx entry updated (BUG-063 added)
- [ ] Code marker: // BUG-063 in changed block (in JSX comment)
- [ ] Dashboard: node control/gen_dashboard_data.js --check → PASS
- [ ] Compile: tail -5 frontend.out.log → "Compiled" 0 new warnings
```
