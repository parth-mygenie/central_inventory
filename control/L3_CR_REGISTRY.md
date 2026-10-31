# L3 — CR Registry (Process & Schema)

> **Source of truth:** `control/registry.json` (items where `type: "CR"`)
> **Live view:** `/__dev/` → CR Registry tab

---

## CR Lifecycle

```
PROPOSED → PLANNED → IN_PROGRESS → QA → OWNER_REVIEW → CLOSED
```

| Status | Meaning |
|--------|---------|
| `PROPOSED` | Idea captured. Not yet scoped or planned. |
| `PLANNED` | Scoped, estimated, API validated. Ready for sprint assignment. |
| `IN_PROGRESS` | Assigned to a sprint. Implementation active. |
| `QA` | Implementation complete. Testing in progress. |
| `OWNER_REVIEW` | QA passed. Awaiting owner smoke test / sign-off. |
| `CLOSED` | Owner accepted. In baseline. |

## How to Register a New CR

1. Add a row to `control/registry.json` under `items[]`:
   ```json
   {
     "type": "CR",
     "id": "CR-NNN",
     "title": "Short description",
     "status": "PROPOSED",
     "severity": null,
     "sprint_key": null,
     "phase": "Phase label",
     "files": [],
     "notes": "Context",
     "artifact_refs": [
       { "artifact": 0, "label": "Session-Start", "status": "MISSING", "path": null },
       { "artifact": 1, "label": "Intake", "status": "MISSING", "path": null },
       { "artifact": 2, "label": "Impact-Analysis", "status": "MISSING", "path": null },
       { "artifact": 3, "label": "Impl-Plan", "status": "MISSING", "path": null },
       { "artifact": 4, "label": "Code-Gate", "status": "MISSING", "path": null },
       { "artifact": 5, "label": "QA-Report", "status": "MISSING", "path": null },
       { "artifact": 6, "label": "Owner-Signoff", "status": "MISSING", "path": null }
     ]
   }
   ```
2. Run `node control/gen_dashboard_data.js` to regenerate dashboard data.
3. Verify with `node control/gen_dashboard_data.js --check`.

## S5 — Dispatch UX Overhaul (Registered 2026-10-18)

| ID | Title | Status | Severity | Files |
|----|-------|:------:|:--------:|-------|
| **CR-050** | Direct Dispatch — Spreadsheet UX + Category Grouping + FEFO Auto-Select + Burst Fix | PROPOSED | P1 | `DirectDispatchForm.jsx`, `SourceSelector.jsx`, `api.js`, `RequestStockForm.jsx` |
| **CR-051** | Purchase Report Screen | **IN_PROGRESS — Gate 4 GO ✅ — ready for IMPLEMENTATION** | P2 | `PurchaseReport.jsx` (new), `api.js`, `screenVisibility.js` (owner approved), `App.js` |
| **CR-052** | Bulk Stock Import — Add Stock Screen (Excel Upload) | PROPOSED | P1 | `AddStockPurchaseForm.jsx`, `api.js` |
| **CR-053** | Raw Materials Bulk Import/Export — Ingredients Page | PROPOSED | P2 | `IngredientCatalogue.jsx`, `api.js` |

Gate 1 intake artifacts:
- `control/sessions/CR-050_ARTIFACT_1_INTAKE.md` (updated 2026-10-18 — OQ-1 answered, G-036 closed, Option B revised)
- `control/sessions/CR-051_ARTIFACT_1_INTAKE.md`
- `control/sessions/CR-052_ARTIFACT_1_INTAKE.md`
- `control/sessions/CR-053_ARTIFACT_1_INTAKE.md`

Mockups: `dispatch_v2_mockup.html` · `dispatch_fefo_mockup.html`
Investigation docs: `INVESTIGATION_20261018_REPRO_UPDATE.md` · `INVESTIGATION_20261018_CR053_IMPORT_FORMAT.md`
G-037 (un-batched segment batch API): OPEN — CR-050 Option B scoped to info badge only.
CR-051 blocker: `screenVisibility.js` FROZEN — owner must approve edit before PLANNING.

## S4 — Purchase UX Overhaul (Registered 2026-10-16)

| ID | Title | Status | Severity | Files |
|----|-------|:------:|:--------:|-------|
| **CR-047** | Add Stock — Storekeeper Spreadsheet UX + add-purchase API + Split Payment | PROPOSED | P1 | `AddStockPurchaseForm.jsx`, `api.js` |
| **CR-048** | PO Create — Storekeeper Spreadsheet UX + Coverage Days Selector | PROPOSED | P1 | `PurchaseOrderCreate.jsx`, `api.js` |
| **CR-049** | PO Receive Goods — Storekeeper Spreadsheet UX | PROPOSED | P1 | `PurchaseOrderDetail.jsx` |

Gate 1 intake artifacts: `control/sessions/CR-047_ARTIFACT_1_INTAKE.md` / `CR-048` / `CR-049`
Mockups: `purchase_form_mockup.html` + `po_flow_mockup.html` (interactive)
Master investigation: `INVESTIGATION_MASTER_PURCHASE_UX_OVERHAUL.md`

## Artifact Statuses

| Status | Meaning |
|--------|---------|
| `DONE` | Artifact exists. Path points to the document. |
| `PENDING` | Required but not yet completed. |
| `MISSING` | Required and not started. |
| `WAIVED` | Not required (pre-governance, policy waiver). Logged in waiver registry. |
