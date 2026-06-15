# L1 — Control Dashboard (Project Status)

> **Updated:** 2026-06-15 (CR-018 QA_PASS — wastage report enhancements implemented)

---

## Current State

| Field | Value |
|-------|-------|
| **Branch** | `14-june-1` |
| **Deploy URL** | `https://02fce931-39c9-4311-aebe-ea25b8965e82.preview.emergentagent.com` |
| **Active Sprint** | **S3 — API Reality Check + Intelligent PO + Screen Audit** |
| **UI Freeze Status** | PHASE 7 FROZEN — CR-030/031/032/033 IMPLEMENTED |
| **Implementation Status** | 24/24 screens + 3 PO screens + CR-034 recipe fix |
| **Data** | Restaurant 806 (legacy) + **Restaurant 813 (chai) — full seed: 14 stores, 42 items, 19 recipes, 6 POs, 22 production runs, 10 transfers** |
| **Dev Dashboard** | `/__dev/index.html` |
| **Math QA** | 172 tests, 155 PASS, 0 FAIL — full reconciliation verified |

## Sprint S3 — Closed Items

### CR-023: API Reality Check — **CLOSED**
### CR-024: API Response Cache — **CLOSED**
### CR-025: Coverage-Based Intelligent PO — **CLOSED**
### CR-015, CR-016: FEFO Detail + Hierarchy Toggle — **CLOSED**

## Sprint S3 — Completed This Session

### CR-034: Recipe & Sub-Recipe API Contract Fix — **QA** (Pending Owner Signoff)
- Fixed 15 POS API field-name mismatches + 6 frontend bugs
- Sub-recipe: `sub_recipe_name`, `subunit`, `ingredient` (singular for create)
- Recipe: `name` = food_id (integer), `preparation_time`, `serves_people`
- 8/8 QA PASS (iteration_46), 21/21 full verification PASS (iteration_48)
- Recipe data corrected: each recipe now has 1 sub-recipe reference (not raw ingredients)
- Linked Food dropdown replaced with plain text, Delete button hidden

### Chai 813 Seed — **COMPLETE** (Phases 1-10)
- 14 stores, 3 vendors, 42 raw materials, 19 sub-recipes, 19 recipes
- 6 POs (₹51,380), 22 production runs, 10 transfers (Central→Masters→Outlets)
- Intelligence verified at all 3 hierarchy levels

### Math Discovery QA — **COMPLETE**
- 17 calculation areas discovered, 172 test cases, 155 PASS, 0 FAIL
- Report: `memory/central_inventory/CENTRAL_INVENTORY_MATH_DISCOVERY_AND_RECONCILIATION_QA_REPORT.md`

## Sprint S3 — Planned (Ready for Implementation)

*None — all planned items implemented this session.*

## Registry: 35 CRs, 17 BUGs, 3 Sprints (S0-S2 closed, S3 active)

## QA Completed — Pending Owner Signoff

| CR | Title | QA Status | Report |
|----|-------|:---------:|--------|
| CR-034 | Recipe & Sub-Recipe API Contract Fix | ✅ PASS | `test_reports/iteration_46.json`, `iteration_48.json` |
| CR-035 | Store Creation 2-Step + Outlet Visibility | ✅ CLOSED | `test_reports/iteration_50.json` |
| BUG-017 | Duplicate Ingredient Filter | ✅ CLOSED | `test_reports/iteration_49.json` |

## Next Work — Bug Batch (BUG-018→025) — Execution Priority

| Order | Item | Title | Severity | Est. | Status |
|:-----:|------|-------|:--------:|:----:|--------|
| 1 | BUG-023 | $ → ₹ icon swap (4 files) | MEDIUM | 5 min | PLANNED |
| 2 | BUG-021 | Remove Adjust Stock quick action | LOW | 5 min | PLANNED |
| 3 | BUG-020 | "Unknown: —" in Store Detail transactions | **HIGH** | 15 min | PLANNED |
| 4 | BUG-022 | Gate page auto-redirect to PO | LOW | 10 min | PLANNED |
| 5 | BUG-025 | Food edit popup → Side Sheet | LOW | 30 min | PLANNED |
| 6 | BUG-019 | Stock Inventory split FG/RM | MEDIUM | 20 min | PLANNED |
| 7 | BUG-024 | Production Run → Master-Detail rewrite | MEDIUM | 90 min | PLANNED |
| — | BUG-018 | Push status misleading | MEDIUM | — | DEFERRED (G-023) |

## Next Work — CR Backlog

| Priority | Item | Title | Status |
|----------|------|-------|--------|
| P1 | CR-031 | Production Screens Audit | PLANNED |
| P1 | CR-032 | Outward Screens Audit | PLANNED |
| P2 | CR-033 | Action Screens Audit | QA |

## Quick Links

| Layer | Path |
|-------|------|
| L0 Baseline | `control/L0_BASELINE_INDEX.md` |
| L6 Sprint | `control/L6_SPRINT_STATUS.md` |
| L7 Files | `control/L7_FILE_OWNERSHIP.md` |
| L8 Credentials | `control/L8_ACCESS_REGISTRY.md` |
| L9 Gaps | `control/L9_OPEN_GAPS_REGISTER.md` |
| Registry | `control/registry.json` |
| Math QA | `memory/central_inventory/CENTRAL_INVENTORY_MATH_DISCOVERY_AND_RECONCILIATION_QA_REPORT.md` |
ISCOVERY_AND_RECONCILIATION_QA_REPORT.md` |
