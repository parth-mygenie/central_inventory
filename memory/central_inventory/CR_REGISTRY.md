# Central Inventory — CR Registry

> **Last Updated:** 28 May 2026
> **Purpose:** Single source of truth for all CRs, slices, phases, and their lifecycle status.
> **Rule:** Every implementation MUST have a row here before it can be frozen.

---

## Status Legend

| Code | Meaning |
|------|---------|
| `PLANNING` | Planned, not yet implemented |
| `IMPLEMENTED` | Code complete, not yet QA'd |
| `QA_PASSED` | Independent QA validation complete |
| `SMOKE_PASSED` | Owner smoke test passed |
| `ACCEPTED` | Owner acceptance recorded |
| `FROZEN` | Baseline frozen — no changes without CR |
| `SUPERSEDED` | Replaced by newer work |
| `DEFERRED` | Explicitly deferred to future |
| `BLOCKED` | Cannot proceed — dependency missing |

---

## Master Registry

### Foundation (Jan–May 2026)

| ID | CR / Phase | Description | Status | Impl Date | QA Date | Freeze Date | Controlling Doc | Notes |
|----|-----------|-------------|--------|-----------|---------|-------------|----------------|-------|
| CR-001 | CR Requirement Planning | 104 owner questions, hierarchy mapping, API collection | `FROZEN` | Jan 2026 | N/A | Jan 2026 | `CR_REQUIREMENT_PLANNING.md` | Foundation doc |
| CR-002 | Business Rule & UX Field Freeze | 96 decisions reconciled, terminology confirmed | `FROZEN` | Jan 2026 | N/A | Jan 2026 | `BUSINESS_RULE_AND_UX_FIELD_FREEZE.md` | |
| CR-003 | Owner Answers Complete | 104 decisions across all categories | `FROZEN` | Jan 2026 | N/A | Jan 2026 | `OWNER_ANSWERS_COMPLETE.md` | Primary authority |

### Slice 1–4: Core Implementation (May 2026)

| ID | CR / Phase | Description | Status | Impl Date | QA Date | Freeze Date | Controlling Doc | Notes |
|----|-----------|-------------|--------|-----------|---------|-------------|----------------|-------|
| S1 | Slice 1: Read-only Foundation | 12 features — 6 screens, role context, terminology, seed data | `FROZEN` | May 2026 | May 2026 | 23 May | `SLICE_1_TO_4_FINAL_ACCEPTANCE_AND_CLOSURE_REPORT.md` | |
| S2 | Slice 2: UX Polish + Enterprise | 12 items — timeline, actions, date picker, visibility | `FROZEN` | May 2026 | May 2026 | 23 May | Same as S1 | |
| S3 | Slice 3: History & Ledger | 15 items — /history route, 7 filters, search | `FROZEN` | May 2026 | May 2026 | 23 May | Same as S1 | |
| S4 | Slice 4: Transfer Write Flows | 12 MH + 3 SH — approve, reject, dispatch, receive, cancel, forms | `FROZEN` | May 2026 | May 2026 | 23 May | Same as S1 | Owner smoke pending at time of report |

### Slice 5: Stock Adjustment & Wastage (24 May 2026)

| ID | CR / Phase | Description | Status | Impl Date | QA Date | Freeze Date | Controlling Doc | Notes |
|----|-----------|-------------|--------|-----------|---------|-------------|----------------|-------|
| S5-P0 | Phase 0: Baseline Lock | Scope approval, baseline lock | `FROZEN` | 24 May | N/A | 24 May | `SLICE_5_PHASE_0_APPROVAL_AND_BASELINE_LOCK.md` | |
| S5-P1 | Phase 1: API + Reason Categories | api.js methods, reasonCategories.js | `QA_PASSED` | 24 May | 24 May | — | `SLICE_5_PHASE_1_IMPLEMENTATION_REPORT.md` | |
| S5-P2 | Phase 2: Stock Adjustment Form | StockAdjustmentForm.jsx, Central-only | `QA_PASSED` | 24 May | 24 May | — | `SLICE_5_PHASE_2_IMPLEMENTATION_REPORT.md` | |
| S5-P3 | Phase 3: Wastage Entry Form | WastageEntryForm.jsx, all roles | `QA_PASSED` | 24 May | 24 May | — | `SLICE_5_PHASE_3_IMPLEMENTATION_REPORT.md` | |
| S5-P4 | Phase 4: Wastage Report | WastageReport.jsx, role-scoped | `QA_PASSED` | 24 May | 24 May | — | `SLICE_5_PHASE_4_IMPLEMENTATION_REPORT.md` | |
| S5-P5 | Phase 5: Ledger Integration | HistoryLedger 3 new movement types | `QA_PASSED` | 24 May | 24 May | — | `SLICE_5_PHASE_5_IMPLEMENTATION_REPORT.md` | |
| S5-P6 | Phase 6: Hardcoded UI Cleanup | Remove read-only banners, stale text | `QA_PASSED` | 24 May | 24 May | — | `SLICE_5_PHASE_6_IMPLEMENTATION_REPORT.md` | |
| S5-P7 | Phase 7: Final QA + Smoke | 55/57 QA pass, 44/44 smoke pass | `SMOKE_PASSED` | 24 May | 24 May | — | `SLICE_5_FINAL_QA_VALIDATION_REPORT.md` | Owner acceptance NOT recorded |
| S5 | Slice 5 Overall | Stock Adj + Wastage + Cleanup | `SMOKE_PASSED` | 24 May | 24 May | — | `SLICE_5_FINAL_ACCEPTANCE_RECOMMENDATION.md` | **NEEDS: owner acceptance to freeze** |

### Infrastructure: Seed Shutdown + POS Migration (24–25 May 2026)

| ID | CR / Phase | Description | Status | Impl Date | QA Date | Freeze Date | Controlling Doc | Notes |
|----|-----------|-------------|--------|-----------|---------|-------------|----------------|-------|
| INF-01 | POS API Context Migration P1 | Login context from POS profile, MongoDB sessions | `FROZEN` | 24 May | 28 May | 28 May | `POS_MIGRATION_P1_QA_REPORT.md` | 17/17 QA pass |
| INF-02 | Seed Shutdown | Remove all seed deps, delete seed_data.py | `FROZEN` | 25 May | 28 May | 28 May | `SEED_SHUTDOWN_QA_REPORT.md` | 20/20 QA pass, file deleted |

### P15–P20: Extended Features (25–27 May 2026)

| ID | CR / Phase | Description | Status | Impl Date | QA Date | Freeze Date | Controlling Doc | Notes |
|----|-----------|-------------|--------|-----------|---------|-------------|----------------|-------|
| P15 | Request-Line Lifecycle (part 1) | ApproveWaveDialog, line-level actions | `IMPLEMENTED` | 25 May | — | — | `AI/Plans/` + `iteration_15.json` | **NEEDS: closure doc + formal QA** |
| P16 | Request-Line Lifecycle (part 2) | DisputeResolutionDialog, ItemEditorDialog, StatusTimeline | `IMPLEMENTED` | 26 May | — | — | `AI/Plans/` + `iteration_16.json` | **NEEDS: closure doc + formal QA** |
| P17-LC | Amend/Withdraw/Modification | Transfer lifecycle extensions | `IMPLEMENTED` | 27 May | — | — | `AI/Plans/P17_amend_withdraw_modification_plan.md` + `iteration_17.json` | **NEEDS: closure doc + formal QA** |
| P17-SET | Operational Settings | OperationalSettings.jsx, settings CRUD | `IMPLEMENTED` | 27 May | — | — | `AI/Plans/P17P18P19_settings_vendors_procurement_plan.md` + `iteration_18.json` | **NEEDS: closure doc + formal QA** |
| P18 | Vendor Management | VendorManagement.jsx, VendorFormDialog.jsx | `IMPLEMENTED` | 27 May | — | — | Same as P17-SET + `iteration_18.json` | **NEEDS: closure doc + formal QA** |
| P19 | Add Stock / Procurement | AddStockPurchaseForm.jsx | `IMPLEMENTED` | 27 May | — | — | Same as P17-SET + `iteration_18.json` | **NEEDS: closure doc + formal QA** |
| P20 | Stock Inventory Summary | StockInventorySummary.jsx, useStockInventory.js | `IMPLEMENTED` | 27 May | — | — | `AI/Plans/P20_stock_inventory_summary_plan.md` + `iteration_19.json` | **NEEDS: closure doc + formal QA** |

### P21+: Future / Deferred

| ID | CR / Phase | Description | Status | Notes |
|----|-----------|-------------|--------|-------|
| P21 | Smart Dispatch/Request Assistance | AI-powered dispatch suggestions | `PLANNING` | Planning doc exists, no code |
| OI-001 | Edit Transfer | Edit pre-dispatch transfer | `DEFERRED` | API contract unknown |
| OI-002 | WebSocket Notifications | Real-time push | `DEFERRED` | Phase 2 per owner |
| OI-005 | Stock Return Flow | Child→parent returns | `DEFERRED` | API unclear |
| OI-006 | Reports Screen | Full reporting | `DEFERRED` | Sidebar shows "(soon)" |
| OI-007 | CSV/PDF Export | Export history/ledger | `DEFERRED` | |
| OI-008 | KPI Dashboard | Operations Hub KPIs | `BLOCKED` | Owner has not specified KPIs (RPT-003: D) |
| OI-009 | Cost/Value Reporting | Stock valuation | `DEFERRED` | |
| OI-012 | Audit Log Admin View | Immutable ledger admin | `DEFERRED` | Backend before/after fields needed |
| OI-013 | Batch/Expiry Management | FIFO/FEFO screen | `DEFERRED` | |
| OI-014 | Low-Stock Reorder Management | Reorder point management | `DEFERRED` | |
| OI-015 | Advanced Permissions | Configurable roles | `DEFERRED` | Phase 2 |
| OI-016 | Lateral Master-to-Master | Lateral transfers with Central approval | `DEFERRED` | P17 settings partially enables |

---

## Summary Counts

| Status | Count |
|--------|-------|
| `FROZEN` | 9 (CR-001, CR-002, CR-003, S1, S2, S3, S4, INF-01, INF-02) |
| `SMOKE_PASSED` | 1 (S5 — needs owner acceptance) |
| `QA_PASSED` | 7 (S5 sub-phases — rolled into S5 overall) |
| `IMPLEMENTED` | 7 (P15, P16, P17-LC, P17-SET, P18, P19, P20) |
| `PLANNING` | 1 (P21) |
| `DEFERRED` | 11 (OI-001 through OI-016) |
| `BLOCKED` | 1 (OI-008 — owner input needed) |

---

## Baseline Freeze Summary

> Quick-reference. Full matrix in `CENTRAL_INVENTORY_CONSOLIDATED_STATUS_AND_BASELINE_FREEZE_REPORT.md`

### FROZEN (6 baselines — code locked, changes require new CR)

| ID | Baseline | Frozen Date | QA Evidence |
|----|----------|-------------|-------------|
| S1 | Slice 1: Read-only Foundation (12 features) | 23 May 2026 | S1 QA report + iteration_7 |
| S2 | Slice 2: UX Polish + Enterprise (12 items) | 23 May 2026 | Implementation report 12/12 |
| S3 | Slice 3: History & Ledger (15 items) | 23 May 2026 | iteration_5 — 15/15 |
| S4 | Slice 4: Transfer Write Flows (15 items) | 23 May 2026 | iteration_8 — 34/34 |
| INF-01 | POS API Context Migration P1 | 28 May 2026 | POS_MIGRATION_P1_QA_REPORT — 17/17 |
| INF-02 | Seed Shutdown | 28 May 2026 | SEED_SHUTDOWN_QA_REPORT — 20/20 |

### NOT YET FROZEN (8 baselines — need to advance through gates)

| ID | Baseline | Current Gate | Blocking Item |
|----|----------|-------------|---------------|
| S5 | Slice 5: Stock Adj/Wastage/Cleanup | `SMOKE_PASSED` | Owner acceptance not recorded |
| P15 | Request-Line Lifecycle (part 1) | `IMPLEMENTED` | Closure doc + formal QA needed |
| P16 | Request-Line Lifecycle (part 2) | `IMPLEMENTED` | Closure doc + formal QA needed |
| P17-LC | Amend/Withdraw/Modification | `IMPLEMENTED` | Closure doc + formal QA needed |
| P17-SET | Operational Settings | `IMPLEMENTED` | Closure doc + formal QA needed |
| P18 | Vendor Management | `IMPLEMENTED` | Closure doc + formal QA needed |
| P19 | Add Stock / Procurement | `IMPLEMENTED` | Closure doc + formal QA needed |
| P20 | Stock Inventory Summary | `IMPLEMENTED` | Closure doc + formal QA needed |

### Freeze Gate Statement

> "Freeze can be declared only after P15-P20 closure docs + QA are complete and combined owner acceptance (S5 + P15-P20) is recorded. Until then, 8 baselines remain unfrozen."

### Owner-Mandated Rules (from GATE_CONTROL_FRAMEWORK.md)

**RULE 1 — Baseline Freeze:** No freeze without QA + Owner Smoke + Owner Explicit Approval (UI + business logic). All three mandatory. No exceptions.

**RULE 2 — Slice 6 Entry:** No Slice 6 work until ALL current baselines are `FROZEN` and owner records explicit Slice 6 go-ahead. Agent must refuse if any baseline is still `IMPLEMENTED`/`QA_PASSED`/`SMOKE_PASSED`.

---

## Next Actions (Priority Order)

1. **P15–P20 Closure Documentation** → moves 7 items from `IMPLEMENTED` to `QA_PASSED`
2. **P15–P20 Formal QA** → validates all 7 items
3. **S5 + P15–P20 Owner Acceptance** → moves from `SMOKE_PASSED`/`QA_PASSED` to `ACCEPTED`
4. **Baseline Freeze Declaration** → moves all `ACCEPTED` to `FROZEN`

---

*End of CR Registry*
