# CR-025 — Wire `reference_code` as PO Number: Code-Gate (Artifact #4)

> **Date:** 2026-06-13
> **CR:** CR-025 (sub-task)
> **Author:** E1
> **Status:** APPROVED (self-review — low-risk display-layer change)

---

## Pre-Implementation Checklist

- [x] Artifact 0 (Session-Start) — DONE
- [x] Artifact 1 (Intake) — DONE
- [x] Artifact 2 (Impact Analysis) — DONE
- [x] Artifact 3 (Implementation Plan) — DONE
- [x] API verified: `reference_code` confirmed in all 3 endpoints (curl evidence in Artifact 1)
- [x] No frozen files in change set (checked L7)
- [x] `server.py` NOT touched
- [x] `terminology.js` NOT touched
- [x] `screenVisibility.js` NOT touched
- [x] `api.js` cache layer NOT touched
- [x] Backwards compatible — `formatPO(id)` with 1 arg unchanged

## Change Summary

| Metric | Value |
|--------|-------|
| Files changed | 9 |
| Edit points | 17 |
| New files | 0 |
| New API calls | 0 |
| Cache changes | 0 |
| Risk level | LOW |

## Gate Decision

**APPROVED** — proceed to implementation. Rationale:
- Pure display-layer data threading
- Backwards-compatible function signature
- No new dependencies, no new API calls
- Fallback for legacy transfers (null reference_code) preserved
- Rollback is a single-line revert in `formatters.js`

---

*Proceed to implementation.*
