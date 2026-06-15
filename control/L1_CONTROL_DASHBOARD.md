# L1 — Control Dashboard (Project Status)

> **Updated:** 2026-06-15 (Session close — BUG-029→035 IMPLEMENTED, QA handover written)

---

## Current State

| Field | Value |
|-------|-------|
| **Branch** | `15-06-v2` |
| **Deploy URL** | `https://c461f1eb-85c7-4a22-9473-69a045470e4f.preview.emergentagent.com` |
| **Active Sprint** | **S3 — API Reality Check + Intelligent PO + Screen Audit** |
| **UI Freeze Status** | PHASE 7 FROZEN — All screen audits IMPLEMENTED |
| **Implementation Status** | 24/24 screens + 3 PO screens + CR-034 + BUG-029→035 |
| **Dev Dashboard** | `/__dev/index.html` |

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
| **BUG-036** | App-Wide Consumption Unit Mismatch (gm→kg) | **OPEN** | **P0 CRITICAL** |

**BUG-036 summary:** POS API returns consumption in base unit (gm), frontend uses display unit (kg) without conversion. PO Create suggests 258 kg instead of ~0 for Whole Wheat Flour. Affects 8 files, 6 screens. Intake + Impact Analysis complete. Awaiting Gate 3 (Impl Plan) + Gate 4 (Owner GO).

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
