# L6 — Sprint Status

> **Updated:** 2026-06-01 (CR-023 Code Gate passed)
> **Source of truth for items:** `control/registry.json`

---

## Active Sprint: S3 — API Reality Check & Intelligence Gap Fix

- **Period:** 2026-06-01 → ongoing
- **CRs:** CR-023 (IN_PROGRESS — Code Gate passed, Batch 1 next)
- **Scope:** Fix 18 API-mismatch bugs found in CR-021 audit
- **Data:** ChocolateHut 158 items seeded, stock + transfers + wastage
- **Execution:** 6 batches, owner smoke test mandatory after each
- **Artifacts:** 0-4 DONE, 5 (QA) PENDING, 6 (Owner Signoff) PENDING
- **New gap registered:** G-017 (Vendor purchase history — backend blocked)

### S3 Batch Tracker

| Batch | Bugs | Status |
|:-----:|------|:------:|
| 1 | A1, B1 (Hub store health) | NEXT |
| 2 | B2, B3, B4 (restaurant names) | BLOCKED |
| 3 | C1 (TransferDetail snapshot) | BLOCKED |
| 4 | B9, C2 (consumption + dispatch) | BLOCKED |
| 5 | C3, C4, B5 (dialogs + hierarchy) | BLOCKED |
| 6 | B6-B8, B11, C5, C6 (catalogues + polish) | BLOCKED |

## Closed Sprints

### S2 — Intelligent UI Implementation (AUDIT NOTE)
- **Audit finding:** 55/55 tests only covered implemented subset. 18 bugs missed.
- **Actual status:** 13 screens fully done, 7 partial, 4 not done
- **Control gate bypassed:** CR-021 registered retroactively, Artifacts 0-4 skipped

### S2 — Intelligent UI Implementation
- **Period:** 2026-06-01
- **CRs:** CR-021 (Implementation, CLOSED), CR-022 (Code Review Fixes, CLOSED)
- **BUGs:** BUG-016 (display_qty TypeError, RESOLVED)
- **Tests:** 55/55 PASS across 4 iterations (27-30)
- **Screens upgraded:** 22+ (all screens in the application)
- **Files created:** 6 new, **Files modified:** 26 existing
- **Additional work:** Procurement 3-mode UI, Product/Recipe/Addon-Recipe cross-ref columns, Hierarchy Summary health column, Store Detail health strip
- **Governance Note:** CR-021/CR-022 registered retroactively — gap documented

### S1 — Governance Setup + Intelligent UI Freeze
- **Period:** 2026-05-31
- **CRs:** CR-019 (UI Freeze, CLOSED — 7/7 artifacts)
- **Deliverables:** 10-layer control, registry.json, dev dashboard, 7-phase UI freeze, 9 HTML previews, 24/24 screens approved

### S0 — Pre-Governance (Retroactive)
- **Period:** 2026-01-01 → 2026-05-29
- **CRs:** CR-001 to CR-014 (14 CRs, all CLOSED)
- **BUGs:** BUG-001 to BUG-015 (15 BUGs, mixed status)

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

## Owner Signoff Pending

- **CR-021** — Sprint A+B+C Intelligence Implementation
- **CR-022** — Code Quality Review Fixes
