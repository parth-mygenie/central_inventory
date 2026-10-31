# BUG-063 — ARTIFACT 2: IMPACT ANALYSIS
> **ID:** BUG-063
> **Artifact:** 2 — Impact Analysis (Gate 2)
> **Date:** 2026-10-20
> **Role:** PLANNING
> **Intake:** `control/sessions/BUG-063_ARTIFACT_1_INTAKE.md`

---

## Step 0 — Code Reality Check

```bash
grep -n "h-6\|<select\|disabled.*included\|batchedSegs\|fefoRecId" \
  frontend/src/components/central-inventory/DirectDispatchForm.jsx
```

Confirmed present (lines 812–816). **Code Reality: NONE for fix (fix not yet applied).**

---

## Step 1 — Conflict Pre-Check

**L7 last modifier of `DirectDispatchForm.jsx`:** BUG-062 (2026-10-20) — IMPLEMENTED.

| Item | Status | Overlaps? |
|------|:------:|-----------|
| BUG-062 | IMPLEMENTED | Modified same region (774–834). Fix is sequential — BUG-063 edits the same block BUG-062 just landed. No conflict, but **must re-verify line numbers before coding.** |
| BUG-060 | REGISTERED | Multi-batch split — no plan/code yet. No overlap. |

**Verdict: NO CONFLICTS. Line-number verify mandatory (Step 0 in impl plan).**

---

## Step 2 — Root Cause Data Flow Trace

### Three compounding causes

**Cause A — `h-6` (24px) height too short**

```
Line 813: className="h-6 text-[10px] border ... w-full min-w-0"
```

`h-6` = 24px. A native OS `<select>` at 24px tall leaves minimal padding. The browser-rendered
arrow occupies ~16px of the right side. The visible text area is effectively a 24px × ~190px
strip. On dense displays or small rows the element feels like a thin line.

**Cause B — Native `<select>` click model**

A native HTML `<select>` is rendered by the OS as a widget. Its interaction model:
- **Windows Chrome/Edge:** full element click opens dropdown ✅
- **macOS Chrome:** text portion unreliable — arrow click is the reliable trigger
- **macOS Safari:** same unreliable behaviour; select may render as a button with pill shape
- **Mobile:** renders as system picker — entirely different interaction

The user said "click the dropdown text → doesn't open." This is the macOS/Chrome or Safari
native select behaviour: the text area is visual only; the dropdown arrow is the actual trigger.
This is browser/OS behaviour, not something CSS can fix on a native `<select>`.

**Cause C — `disabled={!row.included}` silent dead zone**

```
Line 816: disabled={!row.included || submitting}
```

When a row is unchecked (`row.included = false`), the select is disabled:
- The `handleRowClick` guard (line 711) catches tagName `"SELECT"` → row does NOT toggle ✅
- But the select is also disabled → dropdown does NOT open ✗
- **Result:** click on unchecked row's source selector does absolutely nothing — the most
  frustrating interaction: the user sees a dropdown, clicks it, zero response.

Compare with **qty Input** (line 752): `disabled={submitting}` only — user CAN type qty
before checking a row. The select should be consistent.

---

## Step 3 — Fix: Replace native `<select>` with Shadcn `<Select>`

### What already exists

```javascript
// Line 14 — already imported:
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
```

Shadcn `<Select>` renders a **`<button>` trigger** (full-width, entirely clickable surface —
no "text zone vs arrow zone"). It opens a Radix UI portal-based `<SelectContent>` that floats
above everything — unconstrained by the 210px column width.

The `<SelectTrigger>` base class (from `select.jsx` line 17):
```
"flex h-9 w-full items-center justify-between ... disabled:cursor-not-allowed disabled:opacity-50"
```
Default height is `h-9` (36px). We override to `h-7` (28px) to keep the row compact while
still being comfortably clickable.

The `handleRowClick` guard at line 711:
```javascript
if (["INPUT", "SELECT", "BUTTON", "A", "OPTION"].includes(e.target.tagName)) return;
```
Shadcn Select trigger renders as a `<button>` — `"BUTTON"` is already in the guard list ✅.
Row-click toggle will NOT fire when clicking the trigger. Works correctly without any guard change.

### `disabled` change

| Field | Old | New | Reason |
|-------|-----|-----|--------|
| `disabled` | `!row.included \|\| submitting` | `submitting` only | Consistent with qty Input; allows pre-selection; row only dispatches when `r.included` is true (line 316 unchanged) |

Removing `!row.included` from disabled has **no dispatch risk** — `includedRows` filter
at line 316 still gates on `r.included && r.qty > 0 && r.sourceSelector`. A pre-selected
source on an unchecked row simply has no effect until the row is checked.

---

## Affected Files

| File | Lines | Change Type | Risk |
|------|-------|-------------|------|
| `DirectDispatchForm.jsx` | 810–832 | Replace ~22 lines (native `<select>` → Shadcn `<Select>`) | LOW |

**Only one region in one file changes.**

Everything outside lines 810–832 is untouched:
- `fefoAutoSelect()` — unchanged
- `autoSource` initialisation — unchanged
- `updateDispatchRow()` — unchanged; `sourceManuallySet = true` still fires (line 298)
- `includedRows` filter (line 316) — unchanged; `r.sourceSelector` still the gate
- Payload builder (line 329) — unchanged
- `handleRowClick` guard (line 711) — unchanged; `"BUTTON"` already in list ✅
- Single-segment badge path (lines 794–808) — unchanged
- Unbatched path (lines 783–788) — unchanged

---

## Data Flow After Fix

```
segments_preview[]           fefoAllocs[0].segment_id
       ↓                              ↓
  batchedSegs[]               fefoRecId (recommendation)
       ↓                              ↓
  <SelectContent>          selectedId = sourceSelector?.segment_id ?? fefoRecId
    <SelectItem> × N        ↓
                         <SelectTrigger> — full-width button, h-7, always clickable
                         disabled={submitting} only
                              ↓
                    onValueChange → onUpdate("sourceSelector", {mode, segment_id})
                              ↓
                    updateDispatchRow → sourceManuallySet = true
                              ↓
                    includedRows filter at line 316 (unchanged)
                              ↓
                    payload: source_selector: r.sourceSelector
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|:---:|:---:|---|
| Row-click toggles accidentally when clicking Select trigger | NONE | — | Shadcn trigger is `<button>`; guard at line 711 includes `"BUTTON"` ✅ |
| Storekeeper pre-selects source on unchecked row → accidental dispatch | NONE | — | `includedRows` filter (line 316) requires `r.included` — unchecked rows never reach payload |
| Shadcn Select portal clips inside overflow-hidden table container | LOW | LOW | Radix portal appends to `<body>` — not clipped by table overflow ✅ |
| `data-testid` needs moving from `<select>` → `<SelectTrigger>` | NOTED | LOW | Same testid value, just moved to trigger element; BUG-054 testids unaffected |
| Height change from `h-6` to `h-7` shifts row height | LOW | LOW | Row height is driven by the tallest cell (item name + sub-line); `h-7` (28px) fits within existing row height |

---

## Open Questions for Owner

**None.** Owner requirement is clear: "make it user friendly" — larger, entirely clickable. Both decisions (Shadcn Select, disable-only-on-submit) are unambiguous improvements with no business-rule tradeoffs.

---

## Verification Matrix (seeds Gate 6 QA)

| # | Check | How |
|---|-------|-----|
| V1 | Clicking anywhere on source dropdown (text OR arrow) opens the option list | Click text area of dropdown — list appears |
| V2 | Dropdown opens on **unchecked** rows too | Row not checked → click source → list opens |
| V3 | Checking a row after pre-selecting source → source is retained | Pre-select batch, check row, submit → correct segment_id in payload |
| V4 | `★ FEFO` marking still visible in option list | Open dropdown → FEFO option shows `★ FEFO` suffix |
| V5 | Over-qty warning still works | Send qty > batch qty → `⚠ only X kg` still shown |
| V6 | Row-click toggle still works (clicking non-interactive area) | Click item-name cell → row checks/unchecks |
| V7 | Row-click does NOT toggle when clicking source trigger | Click source trigger → list opens, row does not toggle |
| V8 | Single-segment static badge path unchanged | Item with 1 segment → badge, no dropdown |
| V9 | Compile: 0 new warnings | `tail -5 /var/log/supervisor/frontend.out.log` → "Compiled" |

---

## Handover → Gate 3

```
Gate 2 complete for BUG-063.
Artifact: control/sessions/BUG-063_ARTIFACT_2_IMPACT_ANALYSIS.md

1 file. 1 region (lines 810–832). ~22 lines replace.
Code Reality: NONE. No conflicts (re-verify line numbers — BUG-062 just landed on same region).
No open questions. No new state, no new props, no API changes.

Fix: native <select>/<option> → Shadcn <Select>/<SelectTrigger>/<SelectContent>/<SelectItem>
     disabled: !row.included||submitting → submitting only
     height: h-6 → h-7

Awaiting Gate 3 (Implementation Plan).
```
