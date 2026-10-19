# INVESTIGATION REPORT — BUG-057 Incomplete Fix: Popover not opened after button focus
> **Date:** 2026-10-19
> **Role:** INVESTIGATION
> **Screen:** `/purchase` — Add Stock form
> **Triggered by:** Owner screenshot (row 2 "Search item…" button highlighted but keyboard inactive)
> **Classification:** Secondary root cause within BUG-057 scope — incomplete fix

---

## Screenshot Evidence

From owner screenshot (2026-10-19):
- Row 1 complete: Beet Root | 10 | kg | 20 | 200.00 | BEE-19OCT26-1530
- Row 2: "Search item…" button is **visually highlighted** (focus ring present)
- **Keyboard input does nothing** — storekeeper cannot type to search

---

## Data Flow Trace

### What BUG-057 fix does (lines 694, 697)

```
expiry Enter fires → handleKeyDown("expiry", e)
  → BUG-057 fix:
    document.querySelector(`[data-testid="item-select-${idx + 1}"]`)?.focus()
                                                                             ↑
    This calls .focus() on the <button> (PopoverTrigger) at line 713.

RESULT: button receives browser focus → CSS :focus ring shows ✓
        Popover open state: UNCHANGED → still false (line 655)
```

### Why keyboard still doesn't work

```
SpreadsheetRow (row 2) state:
  const [open, setOpen] = useState(false);  ← line 655
                                 ↑ still false after .focus()

Popover structure (lines 711-748):
  <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <button data-testid="item-select-1">...</button>   ← focused ✓
    </PopoverTrigger>
    <PopoverContent>           ← NOT RENDERED (open=false)
      <Command>
        <CommandInput ... />   ← NOT IN DOM
      </Command>
    </PopoverContent>
  </Popover>

PopoverContent uses Radix Portal (line 13 of popover.jsx):
  <PopoverPrimitive.Portal>
  → content is lazy-mounted: only exists in DOM when open=true
  → when open=false: CommandInput does not exist anywhere in the DOM

Keyboard events go to the focused <button>:
  → <button> is not an input element
  → browser receives keystrokes → no text input handler → silently discarded
  → storekeeper sees the highlight but can type nothing
```

### What is missing from BUG-057 fix

```
CURRENT fix (incomplete):
  btn.focus()            → visual highlight ✓
                         → Popover stays closed ✗
                         → CommandInput not in DOM ✗

NEEDED fix (complete):
  btn.focus()            → visual highlight ✓
  btn.click()            → triggers onOpenChange(true) → setOpen(true)
                         → PopoverContent mounts in Portal
                         → cmdk CommandInput auto-focuses
                         → keyboard works ✓
```

`btn.click()` is safe because:
- `PopoverTrigger asChild` merges Radix's click handler with the `<button>`
- Programmatic `.click()` fires the same `onOpenChange` as a mouse click
- `open` was `false` → `.click()` sets it to `true` (toggle: false→true)
- cmdk `CommandInput` auto-focuses when mounted (confirmed: cmdk library behaviour)

---

## Exact Fix Locations (2 lines, same function)

Both are inside `handleKeyDown` in `SpreadsheetRow`, lines 694 and 697:

**Line 694 (addRow case):**
```javascript
// CURRENT (incomplete):
setTimeout(() => document.querySelector(`[data-testid="item-select-${idx + 1}"]`)?.focus(), 50);

// FIXED:
setTimeout(() => {
  const btn = document.querySelector(`[data-testid="item-select-${idx + 1}"]`);
  if (btn) { btn.focus(); btn.click(); }
}, 50);
```

**Line 697 (non-last case):**
```javascript
// CURRENT (incomplete):
document.querySelector(`[data-testid="item-select-${idx + 1}"]`)?.focus();

// FIXED:
const btn = document.querySelector(`[data-testid="item-select-${idx + 1}"]`);
if (btn) { btn.focus(); btn.click(); }
```

---

## Blast Radius

| Metric | Value |
|--------|-------|
| File | `AddStockPurchaseForm.jsx` — `handleKeyDown` only |
| Lines changed | ~6 (replacing 2 single-line calls with 2 two-line blocks) |
| Other files | NONE |
| New state | NONE |
| Risk | LOW — `.click()` is the same action as a mouse click on the trigger |

---

## Classification

**Secondary root cause of BUG-057** — not a new bug.

The original BUG-057 problem statement was: "Enter from expiry → next row Qty instead of Item search". The fix correctly redirected to the item-select button. But the full desired behaviour is "button opens AND keyboard works" — which requires both `.focus()` AND `.click()`.

**Recommended action:** Update BUG-057 notes + BUG FIX agent applies the 2-line addendum. No new ID needed.

---

## Evidence

| Type | Detail |
|------|--------|
| Screenshot | Owner-provided: row 2 button highlighted, keyboard inactive |
| Code trace | `open=false` at line 655 unchanged after `.focus()`; `CommandInput` not in DOM when Popover closed; `PopoverContent` uses Portal (lazy-mount) |
| Source | OWNER-REPORTED (secondary, 2026-10-19) |
| Confidence | CONFIRMED |
