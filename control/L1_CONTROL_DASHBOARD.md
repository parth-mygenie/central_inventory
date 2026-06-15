# L1 — Control Dashboard (Project Status)

> **Updated:** 2026-06-15 (Session close — BUG-026/027/028 QA_PASS, BUG-029→035 registered)

---

## Current State

| Field | Value |
|-------|-------|
| **Branch** | `15-june` |
| **Deploy URL** | `https://8adbeef8-4332-4bcd-9cd5-d4b532cbf051.preview.emergentagent.com` |
| **Active Sprint** | **S3 — API Reality Check + Intelligent PO + Screen Audit** |
| **UI Freeze Status** | PHASE 7 FROZEN — CR-030/031/032/033 IMPLEMENTED |
| **Implementation Status** | 24/24 screens + 3 PO screens + CR-034 recipe fix |
| **Dev Dashboard** | `/__dev/index.html` |

## Sprint S3 — Closed Items

### CR-023: API Reality Check — **CLOSED**
### CR-024: API Response Cache — **CLOSED**
### CR-025: Coverage-Based Intelligent PO — **CLOSED**
### CR-015, CR-016: FEFO Detail + Hierarchy Toggle — **CLOSED**
### CR-035: Store Creation 2-Step — **CLOSED**
### BUG-017: Duplicate Ingredient Filter — **CLOSED**

## Sprint S3 — Completed This Session (2026-06-15)

### BUG-026: Raw Material Master Sub-Recipe Contamination — **QA_PASS**
- Filtered sub-recipe items from ingredients list, category dropdowns, filter, categories tab
- Replaced delete icons with active/inactive toggle (API pending)
- "Recipes" → "Used In" column counting recipe + sub-recipe usage

### BUG-027: Consumption & Days of Stock Calculation — **QA_PASS**
- Switched to `daily-consumption-report` API for real consumption data
- Unit normalization (gm→kg, ml→ltr), uses `display_qty`

### BUG-028: Purchase Order Create — **QA_PASS**
- Sub-recipe filter both modes, search field, Expected Rate read-only, vendor picker, column renames, tooltip

## QA Completed — Pending Owner Signoff

| Item | Title | QA Status | Report |
|------|-------|:---------:|--------|
| BUG-026 | Raw Material sub-recipe contamination | QA_PASS | iteration_55.json |
| BUG-027 | Consumption/DoS calculation | QA_PASS | iteration_55.json |
| BUG-028 | PO Create sub-recipe + UX | QA_PASS | iteration_55.json |
| CR-034 | Recipe & Sub-Recipe API Contract Fix | QA_PASS | iteration_46, iteration_48 |

## Next Work — Bug Batch (BUG-029→035) — Registered, Awaiting Implementation

| Order | Item | Title | Severity | Est. | Status |
|:-----:|------|-------|:--------:|:----:|--------|
| 1 | BUG-029 | Consumption 0.0 — ingredient_id join mismatch | **HIGH** | 30 min | PLANNED |
| 2 | BUG-030 | PO Create residual — rate=0 API, display_qty, DoC | **HIGH** | 45 min | PLANNED |
| 3 | BUG-032 | Stock Inventory — expiry inline, Adjust Stock, FEFO | **HIGH** | 45 min | PLANNED |
| 4 | BUG-031 | RM Stock — remove All/FG tabs, Sub Recipe filter | MEDIUM | 20 min | PLANNED |
| 5 | BUG-033 | Quick Actions — ingredient pre-selection | MEDIUM | 30 min | PLANNED |
| 6 | BUG-034 | Sub-Recipe Master — Delete → toggle | MEDIUM | 15 min | PLANNED |
| 7 | BUG-035 | Production History — ingredient qty total | MEDIUM | 30 min | PLANNED |

## Older Bug Batch (BUG-018→025) — All QA_PASS, Awaiting Owner Signoff

| Item | Title | Status |
|------|-------|--------|
| BUG-018 | Push status misleading | QA_PASS |
| BUG-019 | Stock Inventory split FG/RM | QA_PASS |
| BUG-020 | "Unknown: —" Store Detail | QA_PASS |
| BUG-021 | Remove Adjust Stock card | QA_PASS |
| BUG-022 | Gate page auto-redirect | QA_PASS |
| BUG-023 | $ → ₹ icon swap | QA_PASS |
| BUG-024 | Production Run master-detail | QA_PASS |
| BUG-025 | Food edit → Side Sheet | QA_PASS |

## Registry: 35 CRs, 35 BUGs, 3 Sprints (S0-S2 closed, S3 active)

## Quick Links

| Layer | Path |
|-------|------|
| L0 Baseline | `control/L0_BASELINE_INDEX.md` |
| L6 Sprint | `control/L6_SPRINT_STATUS.md` |
| L7 Files | `control/L7_FILE_OWNERSHIP.md` |
| L8 Credentials | `control/L8_ACCESS_REGISTRY.md` |
| L9 Gaps | `control/L9_OPEN_GAPS_REGISTER.md` |
| Registry | `control/registry.json` |
| Handover | `control/sessions/SESSION_CLOSE_20260615_HANDOVER.md` |
