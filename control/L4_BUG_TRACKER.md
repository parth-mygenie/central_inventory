# L4 — Bug Tracker (Process & Schema)

> **Source of truth:** `control/registry.json` (items where `type: "BUG"`)
> **Live view:** `/__dev/` → Bug Tracker tab

---

## Bug Lifecycle

```
OPEN → IN_PROGRESS → RESOLVED → CLOSED
         ↓
      ACCEPTED (won't fix now — tracked)
         ↓
      DEFERRED (needs backend/future work)
```

| Status | Meaning |
|--------|---------|
| `OPEN` | Bug identified. Needs triage. |
| `ACCEPTED` | Known issue. Not fixing now. Tracked for awareness. |
| `DEFERRED` | Requires external dependency (backend API, data fix). |
| `IN_PROGRESS` | Fix being implemented. |
| `RESOLVED` | Fix applied. QA pending or complete. |
| `CLOSED` | Verified fixed. In baseline. |

## Severity Definitions

| Severity | Meaning | SLA |
|----------|---------|-----|
| `CRITICAL` | System unusable. Data loss risk. | Fix immediately. |
| `HIGH` | Major feature broken. Workaround exists but painful. | Fix this sprint. |
| `MEDIUM` | Feature degraded. Acceptable workaround exists. | Fix within 2 sprints. |
| `LOW` | Cosmetic or minor UX issue. | Backlog. |
| `INFO` | Informational. No user impact. | Track only. |

## How to Log a New Bug

1. Add a row to `control/registry.json` under `items[]`:
   ```json
   {
     "type": "BUG",
     "id": "BUG-NNN",
     "title": "Short description",
     "status": "OPEN",
     "severity": "MEDIUM",
     "sprint_key": null,
     "phase": "Where found",
     "files": ["affected_file.jsx"],
     "notes": "Reproduction steps / context",
     "artifact_refs": [
       { "artifact": 0, "label": "Session-Start", "status": "WAIVED", "path": null },
       { "artifact": 1, "label": "Intake", "status": "DONE", "path": "path/to/report.md" },
       { "artifact": 2, "label": "Impact-Analysis", "status": "WAIVED", "path": null },
       { "artifact": 3, "label": "Impl-Plan", "status": "WAIVED", "path": null },
       { "artifact": 4, "label": "Code-Gate", "status": "WAIVED", "path": null },
       { "artifact": 5, "label": "QA-Report", "status": "MISSING", "path": null },
       { "artifact": 6, "label": "Owner-Signoff", "status": "WAIVED", "path": null }
     ]
   }
   ```
2. Run `node control/gen_dashboard_data.js`.

---

## BUG-054 — Dispatch Screen: Keyboard Navigation Gaps (B1/B2/B3/B4)

| Field | Value |
|-------|-------|
| **ID** | BUG-054 |
| **Severity** | P1 — HIGH |
| **Status** | OPEN |
| **File** | `frontend/src/components/central-inventory/DirectDispatchForm.jsx` |
| **Related** | CR-050 (post-implementation gap) |
| **Registered** | 2026-10-19 |
| **Found By** | OWNER-REPORTED (B1/B2/B3) + OWNER-ADDED (B4) |

**B1** Search `<input>` (line 457) has no `onKeyDown` — Enter does nothing. Fix: +8 lines.
**B2** Qty `<Input>` (line 741) has no `onKeyDown` — Enter does nothing. Fix: +6 lines.
**B3** `included:false` default (line 253) + `disabled={!row.included}` (line 747) + INPUT guard in row click (line 700) — qty still disabled even after B1 focuses it. Fix: B1 handler must also call `included:true`.
**B4** Qty `onChange` (line 746) does not auto-set `included:true`. Storekeeper must click checkbox before typing qty. Fix: remove `disabled`, auto-toggle `included` in `onChange`.

Investigation: `control/sessions/INVESTIGATION_20261019_DISPATCH_KEYBOARD.md`
Intake: `control/sessions/BUG-054_ARTIFACT_1_INTAKE.md`

---

## BUG-049 — PO Create: Suggestion Fallback Returns "10" Instead of min_qty_alert Gap

| Field | Value |
|-------|-------|
| **ID** | BUG-049 |
| **Severity** | MEDIUM (P2) |
| **Status** | OPEN |
| **Files** | `frontend/src/components/central-inventory/PurchaseOrderCreate.jsx` |
| **Root Cause** | Lines 227 + 285: `suggestedQty || "10"` — arbitrary fallback ignoring `min_qty_alert`. Correct logic: `min_qty_alert - currentStock` (gap to threshold) |
| **Related** | CR-048 (same file — fix will be merged inline) |
| **Registered** | 2026-10-16 |
| **Found By** | INVESTIGATION role (agent-discovered during coverage days probe) |

---

## BUG-047 — Addon Recipe CRUD Broken (Create/Save/Delete All Fail)

| Field | Value |
|-------|-------|
| **ID** | BUG-047 |
| **Severity** | HIGH (P1 — core CRUD feature 100% non-functional) |
| **Status** | RESOLVED |
| **Files** | `AddonRecipeCatalogue.jsx`, `api.js` |
| **Root Causes** | (1) Name auto-fill missing on addon select, (2) Payload missing `preparation_time`/`serves_people`, (3) Ingredient keys wrong (`ingredient_id` → should be `id`), (4) Delete missing `reason` body |
| **Related** | BUG-046 (same pattern for regular recipes, already fixed) |
| **Registered** | 2026-07-24 |
| **Found By** | INVESTIGATION role (owner-reported) |

---

## BUG-046 — Recipe Create: Linked Food Dropdown Missing in Add Mode

| Field | Value |
|-------|-------|
| **ID** | BUG-046 |
| **Severity** | HIGH (P1 — core feature broken) |
| **Status** | RESOLVED |
| **File** | `frontend/src/components/central-inventory/RecipeCatalogue.jsx` |
| **Root Cause** | "Linked Food" field was a static `<p>` tag in all modes. In add mode, `foodId` and `name` stayed empty with no UI to set them. |
| **Fix** | Added conditional `<Select>` dropdown when `isAddMode=true`, populated from `foods` prop. Sets both `foodId` and `name` on selection. |
| **Registered** | 2026-07-16 |
| **Found By** | INVESTIGATION role (owner-reported) |


---

## BUG-048 — Receive Transfer Fails: INVALID_STOCK_DATA

| Field | Value |
|-------|-------|
| **ID** | BUG-048 |
| **Severity** | HIGH (P1 — transfers stuck, stock in limbo) |
| **Status** | RESOLVED (backend fix deployed + verified) |
| **Files** | None — POS backend issue |
| **Root Cause** | `destination_inventory_master_id` is NULL on transfer lines. `franchise/list` returns 0 children for RID 813. Catalog push linkage missing between 813↔815. |
| **Registered** | 2026-07-24 |
| **Found By** | INVESTIGATION role (owner-reported, confirmed via full e2e dispatch+receive curl test) |
