# L6 — Sprint Status

> **Updated:** 2026-06-15 (BUG-029→035 IMPLEMENTED, QA handover written)
> **Source of truth for items:** `control/registry.json`

---

## Active Sprint: S3 — API Reality Check + Intelligent PO + Screen Audit

- **Period:** 2026-06-01 → ongoing
- **Branch:** `15-06-v2`

### S3 — Closed

| CR | Title | Status | QA Report |
|----|-------|:------:|:---------:|
| CR-023 | API Reality Check — 17 bug fixes | **CLOSED** | iteration_34 |
| CR-024 | API Response Cache (71→20 calls) | **CLOSED** | iteration_36 |
| CR-025 | Intelligent PO (Request Stock + Dispatch) | **CLOSED** | iteration_39 |
| CR-015 | P24 — FEFO Batch Stock Detail | **CLOSED** | iteration_41 |
| CR-016 | P20-Phase2 — Hierarchy Toggle | **CLOSED** | iteration_44 |
| CR-035 | Store Creation 2-Step + Outlet Visibility | **CLOSED** | iteration_50 |
| BUG-017 | Duplicate Ingredient Filter | **CLOSED** | iteration_49 |

### S3 — Implemented (Awaiting QA) — This Session

| Item | Title | Severity | Status | Files Changed |
|------|-------|:--------:|:------:|:---:|
| BUG-029 | Consumption join mismatch fix | HIGH | **IMPLEMENTED** | 1 |
| BUG-030 | PO Create: display_qty, consumption, rate=0, search | HIGH | **IMPLEMENTED** | 1 |
| BUG-031 | RM Stock: conditional tabs, Sub Recipe filter | MEDIUM | **IMPLEMENTED** | 1 |
| BUG-032 | Stock Inv: expiry inline, FEFO segments, Adjust Stock | HIGH | **IMPLEMENTED** | 2 |
| BUG-033 | Quick Actions ingredient pre-select | MEDIUM | **IMPLEMENTED** | 2 |
| BUG-034 | Sub-Recipe: Delete → toggle | MEDIUM | **IMPLEMENTED** | 1 |
| BUG-035 | Production History: ingredient qty total | MEDIUM | **IMPLEMENTED** | 1 |

**QA Handover:** `control/sessions/QA_HANDOVER_20260615.md` (47 test cases)

### S3 — QA/QA_PASS (Pending Owner Signoff)

| Item | Title | Status |
|------|-------|:------:|
| CR-018 | Wastage Report Enhancements | QA_PASS |
| CR-026 | Production Unit Module | QA |
| CR-027 | Navigation Restructure | QA |
| CR-029 | Stock Inventory Split FG/RM | QA |
| CR-030 | Inward Screens Audit + PO Module | QA |
| CR-031 | Production Screens Audit | QA |
| CR-032 | Outward Screens Audit | QA |
| CR-033 | Action Screens Audit | QA |
| CR-034 | Recipe & Sub-Recipe API Contract Fix | QA |
| BUG-018→025 | 8 bugs (push, FG/RM, Unknown, adjust, redirect, ₹, layout, sheet) | QA_PASS |
| BUG-026→028 | 3 bugs (RM contamination, consumption calc, PO Create) | QA_PASS |

### S3 — Proposed (Backlog)

| Item | Title | Status |
|------|-------|:------:|
| CR-017 | Smart Dispatch / Request Assistance | PROPOSED |
| CR-020 | Daily Intelligence Digest | PROPOSED |
| CR-028 | Product Catalog Overhaul — Excel Bulk Editor | PROPOSED (plan exists) |

## Closed Sprints

### S2 — Intelligent UI Implementation (CLOSED)
### S1 — Governance Setup (CLOSED)
### S0 — Pre-Governance (CLOSED)
