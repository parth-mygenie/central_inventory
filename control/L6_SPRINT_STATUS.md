# L6 — Sprint Status

> **Updated:** 2026-06-02 (CR-024 + CR-025 in QA)
> **Source of truth for items:** `control/registry.json`

---

## Active Sprint: S3 — API Reality Check + Intelligent PO

- **Period:** 2026-06-01 → ongoing
- **CRs:** CR-023 (QA), CR-024 (QA), CR-025 (QA)
- **Branch:** `02-june`

### S3 Deliverables

| CR | Title | Status | QA Report | Owner Signoff |
|----|-------|:------:|:---------:|:-------------:|
| CR-023 | API Reality Check — 17 bug fixes | QA | iteration_34 | PENDING |
| CR-024 | API Response Cache (71→20 calls, 72%) | QA | iteration_36 | PENDING |
| CR-025 | Intelligent PO (Request Stock + Direct Dispatch) | QA | iteration_39 | PENDING |

### CR-023 Detail — 17 Bugs Fixed
- Batch 1: OperationsHub field fix + store health grid
- Batch 2: Restaurant names on Queues, TransferDetail, History
- Batch 3: TransferDetail Requester Snapshot + Approval Impact
- Batch 4: Consumption intelligence + Dispatch auto-detect
- Batch 5: ReceiveDialog + ApproveWaveDialog FEFO + HierarchySummary health
- Batch 6: Catalogues + HierarchyMgmt + Dialog polish
- **DEFERRED:** B10 (Vendor purchase history — G-017)

### CR-024 Detail — Performance
- Single-file change: `frontend/src/services/api.js`
- In-memory cache: LONG 60s / MEDIUM 45s / SHORT 30s TTL
- In-flight dedup eliminates React StrictMode double-fires
- Auto-invalidation on all 15 write/mutation endpoints

### CR-025 Detail — Intelligent PO
- **Request Stock:** Coverage selector (3/7/10/30d), consumption-based + threshold fallback, category grouping, source cross-validation, pending request count, order summary
- **Direct Dispatch:** Integrated table (Qty to Send + Source Segment inline), "You'll retain X%", "You only have X" warnings, review section, PO auto-gen note

## Closed Sprints

### S2 — Intelligent UI Implementation
- **CRs:** CR-021 (CLOSED), CR-022 (CLOSED)
- **Audit:** 55/55 tests covered implemented subset only; 18 bugs found → CR-023

### S1 — Governance Setup
- **CRs:** CR-019 (UI Freeze, CLOSED — 7/7 artifacts)

### S0 — Pre-Governance (Retroactive)
- **CRs:** CR-001 to CR-014 (all CLOSED)
- **BUGs:** BUG-001 to BUG-015 (mixed status)

## Backlog (Blocked on Backend)

| ID | Title | Blocker | Priority |
|----|-------|---------|----------|
| — | Wire Invoice AI extraction | G-014 | P1 |
| — | Wire Excel import parsing | G-015 | P2 |
| — | Replace formatPO with real PO numbers | G-013 | P0 |
| CR-015 | P24 — FEFO Batch Stock Detail | — | P0 |
| CR-016 | P20-Phase2 — Hierarchy Toggle | — | P1 |
| CR-017 | P21-Smart — Smart Dispatch Assistance | — | P1 |
| CR-018 | P25 — Wastage Report Enhancements | — | P2 |
| CR-020 | Daily Intelligence Digest | — | Future |
