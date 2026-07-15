# L1 — Control Dashboard (Project Status)

> **Updated:** 2026-02-15 (INTAKE — CR-045 Reverse Push Frontend Adoption registered; live backend verified)

---

## Current State

| Field | Value |
|-------|-------|
| **Branch** | `bug_fixes_before_gaps_filled` |
| **Deploy URL** | `https://b4dccd0c-d7be-46c0-b773-5ad8389f24bf.preview.emergentagent.com` |
| **Active Sprint** | **S3 — API Reality Check + Intelligent PO + Screen Audit** |
| **UI Freeze Status** | PHASE 7 FROZEN — All screen audits IMPLEMENTED |
| **Implementation Status** | 24/24 screens + 3 PO screens + CR-034 + BUG-029→045 |
| **Dev Dashboard** | `/__dev/index.html` |

## Gap Adoption Pipeline — PLANNED 2026-07-11 (Awaiting Gate 4 GO)

Backend resolved 22 gaps (verified `AI/openGaps/gap_validation.md`, 2026-07-07). Frontend adoption registered:

| Item | Title | Gaps | Severity | Status |
|------|-------|------|:--------:|:------:|
| CR-037 | Unified Stock Ledger Adoption | G-005, G-002/003/004 | P1 | PLANNED |
| CR-038 | Stock Return Flow + Wastage Reasons CRUD | G-006 | P1 | PLANNED |
| CR-039 | Procurement Excel/CSV Import (**needs server.py waiver**) | G-015 | P2 | PLANNED |
| CR-040 | Invoice Duplicate Pre-Check | G-016 | P2 | PLANNED |
| CR-041 | Segment unit_cost on Stock Detail | G-019 | P2 | PLANNED |
| CR-042 | Custom Unit Conversion Adoption | G-020 | P1 | PLANNED |
| CR-043 | Pushed Catalog Lock + Child Edit Policy | G-028/029 | P1 | PLANNED |
| CR-044 | Manufactured Recipe Auto Sub-Recipe | G-030 | P2 | PLANNED |
| **CR-045** | **Reverse Push Frontend Adoption (Master-Initiated, Feature-Flagged)** | — (backend live 2026-02-15) | **P2** | **PROPOSED — needs PLANNING** |

Recommended execution order: CR-037 → CR-040 → CR-041 → CR-042 → CR-043 → CR-044 → CR-038 → CR-039.
Plans: `control/sessions/CR0XX_ARTIFACT_2_3_IMPACT_AND_PLAN.md`

## Sprint S3 — Closed Items

### CR-023: API Reality Check — **CLOSED**
### CR-024: API Response Cache — **CLOSED**
### CR-025: Coverage-Based Intelligent PO — **CLOSED**
### CR-015, CR-016: FEFO Detail + Hierarchy Toggle — **CLOSED**
### CR-035: Store Creation 2-Step — **CLOSED**
### BUG-017: Duplicate Ingredient Filter — **CLOSED**

## Sprint S3 — Implemented This Session (2026-06-15)

### BUG-029: Consumption Join Fix — **IMPLEMENTED**
- Name-based fallback join in consumptionMap (ingredient_id ↔ stock_title)
- Fixes 0.0 kg/day for Whole Wheat Flour etc.

### BUG-030: PO Create Residual Fixes — **IMPLEMENTED**
- display_qty (not cal_quantity), daily-consumption-report API, rate=0 to API
- Search bar added to By Item Need mode, KPIs type-aware

### BUG-031: RM Stock Tab Cleanup — **IMPLEMENTED**
- Conditional tabs (?type=raw → only RM tab), "Sub Recipe" filtered from category
- KPIs reflect filtered stock type

### BUG-032: Stock Inventory Expanded Row — **IMPLEMENTED**
- Option C hybrid segment loading (background, ~6s), expiry risk inline dates
- Adjust Stock button removed. Root cause: include_consumption caused 30s timeout.

### BUG-033: Quick Action Pre-Selection — **IMPLEMENTED**
- DirectDispatchForm + WastageEntryForm read ?item= URL param

### BUG-034: Sub-Recipe Toggle — **IMPLEMENTED**
- Delete button → Active/Inactive toggle (backend API pending, toast stub)

### BUG-035: Production History Qty — **IMPLEMENTED**
- computeAllocQty sums batch segments with gm↔kg/ml↔ltr normalization

## QA Pipeline — Awaiting QA or Owner Signoff

### Needs QA (just implemented):
| Item | Title | Status |
|------|-------|:------:|
| BUG-029 | Consumption join fix | IMPLEMENTED |
| BUG-030 | PO Create residual | IMPLEMENTED |
| BUG-031 | RM Stock tab cleanup | IMPLEMENTED |
| BUG-032 | Stock Inv expanded row | IMPLEMENTED |
| BUG-033 | Quick action pre-select | IMPLEMENTED |
| BUG-034 | Sub-Recipe toggle | IMPLEMENTED |
| BUG-035 | Production History qty | IMPLEMENTED |

### QA Done — Awaiting Owner Signoff:
| Item | Title | Status |
|------|-------|:------:|
| CR-018 | Wastage Report Enhancements | QA_PASS |
| CR-026 | Production Unit Module | QA |
| CR-027 | Navigation Restructure | QA |
| CR-029 | Stock Inventory Split | QA |
| CR-030 | Inward Screens Audit | QA |
| CR-031 | Production Screens Audit | QA |
| CR-032 | Outward Screens Audit | QA |
| CR-033 | Action Screens Audit | QA |
| CR-034 | Recipe API Contract Fix | QA |
| BUG-018→028 | 11 bugs | QA_PASS |

## Newly Registered — Needs Planning/Implementation

| Item | Title | Status | Severity |
|------|-------|:------:|:--------:|
| **BUG-036** | App-Wide Consumption Unit Mismatch (gm→kg) | **IMPLEMENTED** | **P0 CRITICAL** |

**BUG-036 summary:** 8 files fixed. Consumption now normalized from API base unit (gm) to display unit (kg) via shared `normalizeToDisplayUnit()`. PO Create Whole Wheat Flour: 9.584 gm/d, 3116d, qty=0 (was: 9.6 kg/d, 3d, qty=258). All 7 tests PASS.

## Registry: 35 CRs, 36 BUGs, 4 Sprints (S0-S2 closed, S3 active)

## Quick Links

| Layer | Path |
|-------|------|
| L0 Baseline | `control/L0_BASELINE_INDEX.md` |
| L6 Sprint | `control/L6_SPRINT_STATUS.md` |
| L7 Files | `control/L7_FILE_OWNERSHIP.md` |
| L8 Credentials | `control/L8_ACCESS_REGISTRY.md` |
| L9 Gaps | `control/L9_OPEN_GAPS_REGISTER.md` |
| Registry | `control/registry.json` |
| QA Handover | `control/sessions/QA_HANDOVER_20260615.md` |
| Session Handover | `control/sessions/SESSION_HANDOVER_20260615_IMPL.md` |
