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
