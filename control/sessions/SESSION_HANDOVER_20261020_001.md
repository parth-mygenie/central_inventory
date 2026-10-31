# SESSION HANDOVER — 2026-10-20

> **Agent Role:** INVESTIGATION
> **Items Worked:** BUG-058, BUG-059, BUG-060, BUG-061 (new registrations)
> **Registry Synced:** YES — `gen_dashboard_data.js --check` PASS (52 CRs, 61 BUGs)
> **Scope Drift:** NONE
> **Branch:** main (Abhi-mygenie/central-iventory)

---

## What Was Done

Four owner-reported issues investigated. Root causes confirmed. BUG-058→061 registered.
API probed live for Issue 4.

---

## State of Each Item

| ID | Gate Before | Gate After | Notes |
|----|-------------|------------|-------|
| BUG-058 | — | Gate 1 (Intake) | Review screen: fare + invoice # missing. SMALL, frontend-only. Ready for PLANNING. |
| BUG-059 | — | Gate 1 (Intake) | BATCH Enter skips date. Chromium keyup-transfer confirmed. SMALL, frontend-only. Ready for PLANNING. |
| BUG-060 | — | Gate 1 (Intake) | Dispatch multi-batch: frontend wiring incomplete + API contract unknown. MEDIUM. Needs API probe before PLANNING. |
| BUG-061 | — | Gate 1 (Intake) | Purchase Report fare column. API probe DONE (tot_fair confirmed). NO-CODE per owner — Gate 1 only until GO. |

---

## Next Agent Should

### Priority 1 — BUG-058 + BUG-059 (same file, same session — batch them)
**PLANNING role** → generate Impact Analysis + Implementation Plan for BUG-058 and BUG-059 together.
Both are in `AddStockPurchaseForm.jsx`, both SMALL, no shared conflict.

Fix hints (for PLANNING):

**BUG-058** — Review screen missing fare + invoice #:
- `AddStockPurchaseForm.jsx` lines 302–321: expand header grid from 3→5 cols — add Fare, Invoice #
  ```jsx
  // Add after Payment div:
  {Number(fare) > 0 && (
    <div><p className="...">Fare</p><p className="font-medium">₹{Number(fare).toFixed(2)}</p></div>
  )}
  {invoiceNumber && (
    <div><p className="...">Invoice #</p><p className="font-medium font-mono text-xs">{invoiceNumber}</p></div>
  )}
  ```
- Lines 346–350: add items subtotal + fare breakdown row before Grand Total
  ```jsx
  {Number(fare) > 0 && (
    <>
      <div className="px-4 py-1 border-t flex justify-between text-xs text-muted-foreground">
        <span>Items subtotal</span>
        <span>₹ {grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
      </div>
      <div className="px-4 py-1 flex justify-between text-xs text-muted-foreground">
        <span>Fare</span>
        <span>₹ {Number(fare).toFixed(2)}</span>
      </div>
    </>
  )}
  ```

**BUG-059** — BATCH Enter skips date (inside `SpreadsheetRow` component, ~line 654):
```jsx
const justFocused = useRef(false);
// expiry Input:
onFocus={() => { justFocused.current = true; }}
onKeyUp={e => {
  if (justFocused.current) { justFocused.current = false; return; }
  handleKeyDown("expiry", e);
}}
```

### Priority 2 — BUG-060 API Probe
Before PLANNING for BUG-060: test dispatch API with duplicate source_inventory_master_id in items[].
Use `owner@mygenietest002.com / Qplazm@10` in dev env. Send:
```json
items: [
  {"source_inventory_master_id": X, "quantity": 5, "unit": "kg", "source_selector": {"mode":"segment_id","segment_id": A}},
  {"source_inventory_master_id": X, "quantity": 5, "unit": "kg", "source_selector": {"mode":"segment_id","segment_id": B}}
]
```
If API accepts → PLANNING can proceed with Option B (split items per alloc).
If API rejects → file G-040 in L9 (backend gap for array source_selector).

### Priority 3 — BUG-061 (waiting for owner GO)
No action until owner lifts NO-CODE instruction.

### Priority 4 — CR-051 Gate 6 QA (still pending from previous session)
QA role → CR-051. Account: `owner@mygenietest002.com / Qplazm@10` (RID 828).
Note: BUG-061 fare fix (if approved) should be done BEFORE CR-051 QA closes, so the QA
can also verify the fare column.

---

## Files Created/Modified This Session

| File | Change |
|------|--------|
| `control/sessions/INVESTIGATION_20261020_FOUR_ISSUES.md` | Full investigation report (4 issues) |
| `control/sessions/BUG-058_ARTIFACT_1_INTAKE.md` | Gate 1 |
| `control/sessions/BUG-059_ARTIFACT_1_INTAKE.md` | Gate 1 |
| `control/sessions/BUG-060_ARTIFACT_1_INTAKE.md` | Gate 1 |
| `control/sessions/BUG-061_ARTIFACT_1_INTAKE.md` | Gate 1 |
| `control/registry.json` | BUG-058→061 registered |
| `memory/PRD.md` | (to be updated by finish tool) |

---

## Key Credentials

| Account | Email | Password | RID | Type |
|---------|-------|----------|-----|------|
| Primary test | owner@mygenietest002.com | Qplazm@10 | 828 | master (Central Store) |
| Central Store | manager@germanfluid.com | Qplazm@10 | 806 | master |
| Master Store | manager@centralkitchenalpha.com | Qplazm@10 | 807 | central |
| Outlet | manager@outletdirectone.com | Qplazm@10 | 809 | franchise |
