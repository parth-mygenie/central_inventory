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
