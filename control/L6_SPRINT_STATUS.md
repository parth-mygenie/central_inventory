# L6 — Sprint Status

> **Updated:** 2026-06-15 (BUG-026/027/028 QA_PASS, BUG-029→035 registered)
> **Source of truth for items:** `control/registry.json`

---

## Active Sprint: S3 — API Reality Check + Intelligent PO + Screen Audit

- **Period:** 2026-06-01 → ongoing
- **Branch:** `15-june`

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

### S3 — QA_PASS (Pending Owner Signoff)

| Item | Title | Status | QA Report |
|------|-------|:------:|:---------:|
| BUG-026 | Raw Material sub-recipe contamination (5 fixes) | **QA_PASS** | iteration_55 |
| BUG-027 | Consumption/DoS calculation (API switch) | **QA_PASS** | iteration_55 |
| BUG-028 | PO Create sub-recipe + UX (9 fixes) | **QA_PASS** | iteration_55 |
| CR-034 | Recipe & Sub-Recipe API Contract Fix | QA_PASS | iteration_46/48 |
| CR-030 | Inward Screens Audit | QA | CR030 artifacts |
| CR-031 | Production Screens Audit | QA | CR031 artifacts |
| CR-032 | Outward Screens Audit | QA | CR032 artifacts |
| CR-033 | Action Screens Audit | QA | CR033 artifacts |
| CR-018 | Wastage Report Enhancements | QA_PASS | CR018 artifacts |

### S3 — New Bug Batch (BUG-029→035) — Registered, Awaiting Implementation

| Order | Item | Title | Severity | Est. | Status |
|:-----:|------|-------|:--------:|:----:|--------|
| 1 | BUG-029 | Consumption 0.0 — ingredient_id join mismatch | **HIGH** | 30 min | PLANNED |
| 2 | BUG-030 | PO Create residual — rate=0, display_qty, DoC, search | **HIGH** | 45 min | PLANNED |
| 3 | BUG-032 | Stock Inventory — expiry, Adjust Stock, FEFO segments | **HIGH** | 45 min | PLANNED |
| 4 | BUG-031 | RM Stock — RM-only tabs, Sub Recipe filter | MEDIUM | 20 min | PLANNED |
| 5 | BUG-033 | Quick Actions — ingredient pre-select | MEDIUM | 30 min | PLANNED |
| 6 | BUG-034 | Sub-Recipe Master — Delete → toggle | MEDIUM | 15 min | PLANNED |
| 7 | BUG-035 | Production History — ingredient qty total | MEDIUM | 30 min | PLANNED |

### S3 — Older Bug Batch (BUG-018→025) — All QA_PASS

| Item | Title | Status |
|------|-------|:------:|
| BUG-018→025 | 8 bugs (push status, FG/RM split, Unknown, adjust stock, gate redirect, ₹ icon, production layout, food edit sheet) | All QA_PASS |

## Closed Sprints

### S2 — Intelligent UI Implementation (CLOSED)
### S1 — Governance Setup (CLOSED)
### S0 — Pre-Governance (CLOSED)
