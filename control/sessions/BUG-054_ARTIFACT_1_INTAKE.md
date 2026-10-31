# BUG-054 — Intake Artifact (Gate 1)

> **ID:** BUG-054
> **Type:** BUG
> **Registered:** 2026-10-19
> **Agent Role:** INVESTIGATION → INTAKE
> **Severity:** P1 — HIGH (core storekeeper dispatch keyboard flow blocked)
> **Related to:** CR-050 (DirectDispatchForm — this is a post-implementation gap)
> **Sprint:** S5
> **Investigation report:** `control/sessions/INVESTIGATION_20261019_DISPATCH_KEYBOARD.md`

---

## Problem Statement

The Direct Dispatch form (`/dispatch/new`) has 4 keyboard interaction gaps that
together force the storekeeper to use the mouse between every action. The form
was designed for rapid keyboard-driven dispatch but Enter/Tab navigation is
completely missing. Owner reported B1/B2/B3 and added B4 during the 2026-10-19
session.

---

## Four Bugs (B1–B4)

### B1 — Search Enter → row focus

**What happens:** Storekeeper types "amer" to narrow to American Corn. Presses
Enter. Nothing happens. Must take hands off keyboard to click the row.

**Root cause:** Search `<input>` at line 457 has `onChange` only. No `onKeyDown`.
Enter key event is unhandled.

**Fix location:** `DirectDispatchForm.jsx` line 477 (after `data-testid` line)
**Fix size:** +8 lines

```javascript
// Current (line 457-478) — no onKeyDown:
<input placeholder="Search item…" value={searchText} onChange={...}
       data-testid="dispatch-search-input" />
```

---

### B2 — Qty Enter → next row

**What happens:** Storekeeper types qty for row 1. Presses Enter. Nothing happens.
Must mouse-click onto row 2's qty field.

**Root cause:** Qty `<Input>` at line 741 has `onChange` + `disabled` only.
No `onKeyDown`.

**Fix location:** `DirectDispatchForm.jsx` line 741 (after `onChange` on line 746)
**Fix size:** +6 lines

```javascript
// Current (line 741-748) — no onKeyDown:
<Input type="number" value={row.qty} onChange={e => onUpdate("qty", e.target.value)}
       disabled={!row.included || submitting}
       data-testid={`dispatch-qty-${row.invMasterId}`} />
```

---

### B3 — Default unchecked → qty disabled (compounds B1)

**What happens:** Even when B1 Enter handler focuses the first row's qty, the
input is still `disabled` because `included: false` is the default. Focus lands
on a disabled input → keystrokes swallowed → storekeeper still blocked.

**Root cause (1):** Line 253: `included: false` — all rows default unchecked.
**Root cause (2):** Line 747: `disabled={!row.included || submitting}`
**Root cause (3):** Line 700: `if (INPUT → return)` — clicking on the qty `<input>`
skips the row-click toggle. So clicking qty directly doesn't auto-check the row.

**Fix:** B1's Enter handler must also call `included: true` before focusing.

---

### B4 — Auto-select row when qty is entered (owner-added)

**What happens:** The storekeeper cannot type a qty without first clicking the
checkbox, because the qty input is disabled until the row is checked. Desired
UX: typing a quantity should implicitly select the row.

**Root cause:** qty `onChange` (line 746) does not auto-set `included: true`.
`disabled={!row.included}` (line 747) prevents any interaction without pre-click.

**Desired behavior:**
- Typing qty > 0 → row auto-checks (`included: true`)
- Clearing qty (empty / "0") → row auto-unchecks (`included: false`)

**Fix:** Remove `disabled` from qty Input; modify qty `onChange` to auto-toggle
`included` based on value.

---

## Interaction Map

```
CURRENT (broken):
  Type search + Enter → nothing          ← B1
  Click checkbox → type qty + Enter → nothing  ← B2
  Click qty directly → row stays unchecked → blocked  ← B3+B4

DESIRED (after fix):
  Type search + Enter → first row auto-checked + qty focused  ← B1+B3
  Type qty → row auto-checks  ← B4
  Press Enter in qty → next row auto-checked + qty focused  ← B2+B3
```

---

## Code Reality Check

**NONE** — No keyboard handlers exist for these interactions. All 4 gaps are
absent from the current implementation.

---

## Duplicate Check

| Check | Result |
|-------|--------|
| SESSION_HANDOVER_20261019_001.md Priority 3 | B1+B2 anticipated as BUG-054 — **MATCHES** |
| BUG-053 | Different scope (layout/items) — DISTINCT |
| Prior keyboard nav bugs | None in registry — DISTINCT |

**Duplicate check: DISTINCT. B3+B4 are additive to the handover's B1+B2 scope.**

---

## Blast Radius

| Metric | Value |
|--------|-------|
| Files affected | 1 — `DirectDispatchForm.jsx` |
| Hotspot files | NO |
| Other screens | NONE |
| Scope | SMALL — ~14 lines added, 1 line modified |

```bash
grep -n "onKeyDown" frontend/src/components/central-inventory/DirectDispatchForm.jsx
# → 0 results in dispatch row or search toolbar (confirms both missing)
```

---

## Evidence

| Type | Detail |
|------|--------|
| Screenshot | Owner-provided (2026-10-19): `/dispatch/new` — American Corn row visible, qty field, checkbox unchecked |
| Code trace | B1 line 457-478; B2 line 741-748; B3 line 253+747+700; B4 line 746+747 |
| Confidence | CONFIRMED — all 4 root causes verified in code |
| Source | OWNER-REPORTED (B1/B2/B3) + OWNER-ADDED (B4) |

---

## Severity Classification

**P1 — HIGH**

Keyboard navigation is the primary workflow for this form. Without it,
storekeepers must mouse-click between every row, dramatically slowing down
high-volume dispatch operations (e.g. 75 items across 20 categories). No
workaround exists other than Select All + manual cleanup.

---

## Open Questions

None. All root causes confirmed. No business rule decisions needed.
B4 implementation approach: Option A (remove disabled, auto-check on qty entry)
is confirmed as owner intent from the description "should get selected".

---

## Next Step

→ **BUG FIX agent** directly (no Gate 3 plan needed — SMALL scope, 1 file,
all root causes confirmed). Implement all 4 fixes in sequence:
1. B3/B4 root: remove `disabled` from qty, auto-toggle `included` in onChange
2. B1: add `onKeyDown` to search input (+8 lines)
3. B2: add `onKeyDown` to qty Input (+6 lines)
