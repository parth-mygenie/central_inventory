# BUG-018 — Code-Gate (Artifact #4)

> **Date:** 2026-06-14
> **Status:** APPROVED

---

## Pre-Implementation Checklist

| # | Check | Result |
|---|-------|--------|
| 1 | Frozen files? | NO — `StoreManagement.jsx` only |
| 2 | API changes? | NO — backend already deployed `push_summary` (G-023 CLOSED) |
| 3 | Backend verified? | YES — API call confirmed `push_summary.total_behind=42`, `status="partial"` for store 807 |
| 4 | Regression risk? | LOW — fallback to old manual computation if `push_summary` absent |

## Changes

| File | Location | Change |
|------|----------|--------|
| `StoreManagement.jsx` | Lines 63-73 (push status useEffect) | Read `push_summary` from API, fallback to manual |
| `StoreManagement.jsx` | Lines 190-197 (handlePush refresh) | Same pattern |
| `StoreManagement.jsx` | Line 412 | Label: "Stale — N behind" → "N items not pushed" |
| `StoreManagement.jsx` | Line 488 | Label: "Push Now — N items behind" → "Push Now — N items to push" |

---

*Approved to proceed.*
