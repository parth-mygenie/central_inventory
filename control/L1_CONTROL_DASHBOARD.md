# L1 — Control Dashboard (Project Status)

> **Updated:** 2026-06-01 (CR-023 Code Gate passed — Batch 1 implementation next)

---

## Current State

| Field | Value |
|-------|-------|
| **Branch** | `01-june` (deployed from GitHub) |
| **Deploy URL** | `https://api-sync-staging.preview.emergentagent.com` |
| **Active Sprint** | **S3 — CR-023: API Reality Check & Intelligence Gap Fix** |
| **UI Freeze Status** | PHASE 7 FROZEN — Implementation **PARTIAL** (see audit below) |
| **Implementation Status** | 13/24 screens fully done, 7 partial, 4 not done — 18 bugs found |
| **Data** | ChocolateHut — 158 inventory items seeded via API |
| **Dev Dashboard** | `/__dev/index.html` |
| **UI Previews** | `/__dev/previews/*.html` (9 files) |
| **UI Review** | `control/sessions/ui_review/` (7 review documents) |

## CR-021 Audit Finding (June 1, 2026)

Previous agent claimed "ALL 22+ screens upgraded — 55/55 tests PASS". Audit revealed:
- **55/55 tests only covered the implemented subset**, not the frozen spec
- **18 API-mismatch bugs** found: wrong field names, missing API fields, intelligence code never written
- **Control gate was bypassed** — CR-021 registered retroactively, Artifacts 0-4 skipped
- See: `control/sessions/CR023_ARTIFACT_1_INTAKE.md` for full bug registry

## Active Work: CR-023

| Artifact | Status | Path |
|----------|:------:|------|
| 0 Session-Start | DONE | `control/sessions/CR023_SESSION_START.md` |
| 1 Intake (18 bugs) | DONE | `control/sessions/CR023_ARTIFACT_1_INTAKE.md` |
| 2 Impact Analysis | DONE | `control/sessions/CR023_ARTIFACT_2_IMPACT_ANALYSIS.md` |
| 3 Implementation Plan | DONE | `control/sessions/CR023_ARTIFACT_3_IMPLEMENTATION_PLAN.md` |
| 4 Code Gate | DONE | `control/sessions/CR023_ARTIFACT_4_CODE_GATE.md` |
| 5 QA Report | PENDING | — |
| 6 Owner Signoff | PENDING | — |

### Batch Execution Tracker

| Batch | Scope | Bugs | Owner Smoke Test | Status |
|:-----:|-------|------|:----------------:|:------:|
| 1 | useRestaurantMap + OperationsHub Store Health | A1, B1 | PENDING | **NEXT** |
| 2 | Restaurant names: Queues, TransferDetail, History | B2, B3, B4 | PENDING | BLOCKED |
| 3 | TransferDetail Store Snapshot + Impact Summary | C1 | PENDING | BLOCKED |
| 4 | Consumption intelligence + DirectDispatch auto-detect | B9, C2 | PENDING | BLOCKED |
| 5 | ReceiveDialog + ApproveWaveDialog FEFO + HierarchySummary | C3, C4, B5 | PENDING | BLOCKED |
| 6 | Catalogues + HierarchyMgmt + Dialog polish | B6-B8, B11, C5, C6 | PENDING | BLOCKED |

## Previous Implementation (S2 — CR-021, now audited)

| Sprint | Scope | Tests | Actual Status |
|--------|-------|:-----:|:------:|
| Sprint A | Hub, Inventory, Detail, History, Timeline | 21/21 | PARTIAL — Hub store health broken |
| Sprint B | Queues, PO format, Modals, SourceSelector | 18/18 | PARTIAL — names missing, snapshots missing |
| Sprint C | Adjustment, Wastage, Settings, Vendors | 11/11 | PARTIAL — vendor intelligence missing |
| Polish | Catalogues, Consumption, Hierarchy, Request, Dispatch | 5/5 | PARTIAL — cross-ref/consumption missing |

## Backend Gaps

| ID | Gap | Priority | Status |
|----|-----|:--------:|--------|
| G-013 | PO number generation | P0 | Frontend workaround (formatPO) |
| G-014 | Invoice OCR endpoint | P1 | Upload tab "Coming Soon" |
| G-015 | Excel parsing endpoint | P2 | Excel zone pending |
| G-012 | Catalog category fields | P1 | Open |
| G-016 | Invoice storage | P2 | Open |
| **G-017** | **Vendor purchase history API** | **P2** | **NEW — registered in CR-023** |

## Registry: 23 CRs, 16 BUGs, 3 Sprints (S0-S2 closed, S3 active)

## Quick Links

| Layer | Path |
|-------|------|
| L0 Baseline | `control/L0_BASELINE_INDEX.md` |
| L2 Handover | `control/L2_HANDOVER_PROTOCOL.md` |
| L6 Sprint | `control/L6_SPRINT_STATUS.md` |
| L8 Credentials | `control/L8_ACCESS_REGISTRY.md` |
| L9 Gaps | `control/L9_OPEN_GAPS_REGISTER.md` |
| Registry | `control/registry.json` |
| CR-023 Intake | `control/sessions/CR023_ARTIFACT_1_INTAKE.md` |
| CR-023 Impact | `control/sessions/CR023_ARTIFACT_2_IMPACT_ANALYSIS.md` |
| CR-023 Impl Plan | `control/sessions/CR023_ARTIFACT_3_IMPLEMENTATION_PLAN.md` |
| CR-023 Code Gate | `control/sessions/CR023_ARTIFACT_4_CODE_GATE.md` |
| Phase 7 Freeze | `control/sessions/INTELLIGENT_UI_FREEZE_PHASE_7_FINAL_FREEZE.md` |
