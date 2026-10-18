# BUG-018 — QA Report (Artifact #5)

> **Date:** 2026-06-14
> **Status:** ALL PASS (4/4)

---

| # | Test | Result |
|---|------|:------:|
| A1 | Accurate push counts (42, not 125) | **PASS** |
| A2 | Synced → green "Synced" | **PASS** |
| A3 | Not pushed → amber "N items not pushed" | **PASS** |
| A5 | No "behind" text anywhere | **PASS** |

## Files Changed
- `StoreManagement.jsx`: reads `push_summary` from API, fallback to manual. Labels: amber "N items not pushed", "Push Now — N items to push".

## Owner Signoff: PENDING
