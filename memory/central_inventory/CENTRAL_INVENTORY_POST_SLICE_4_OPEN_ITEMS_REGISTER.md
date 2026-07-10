# Central Inventory Post-Slice 4 Open Items Register

> **Date:** 23 May 2026
> **Source:** Final Acceptance and Closure Report
> **Purpose:** Track all deferred, open, and future items after Slice 4 closure

---

## OI-001: Edit Transfer API Discovery

| Field | Value |
|-------|-------|
| **Category** | `api_discovery_needed` |
| **Description** | Edit Transfer (SH-13) was planned as should-have in Slice 4. The Edit button renders in TransferDetail but the click handler is a noop because the edit/update API endpoint was not tested in the 52/52 E2E report. The API contract (endpoint, payload, behavior) is unknown. Per Q-XFER-003, editing resets status to "requested" and forces re-approval. |
| **Why not in Slice 4** | API contract not verified. Risk too high without evidence. |
| **Suggested slice** | 5 |
| **Priority** | P1 |
| **Dependency** | API endpoint discovery via generic proxy testing |
| **Recommended action** | Test edit/update endpoint through the generic proxy. If it works, implement the form (can reuse RequestStockForm pattern with pre-populated data). |

---

## OI-002: Real-Time WebSocket Notifications

| Field | Value |
|-------|-------|
| **Category** | `future_enhancement` |
| **Description** | In-app polling only for Phase 1 (Q-NOTIF-002: D). Real-time WebSocket notifications deferred. A placeholder hook (`useCentralInventoryRealtime.js`) was created in Slice 1 with documented event names. |
| **Why not in Slice 4** | Explicitly Phase 2 per owner decision. Not in Slice 4 scope. |
| **Suggested slice** | 6+ |
| **Priority** | P2 |
| **Dependency** | Backend WebSocket infrastructure |
| **Recommended action** | Evaluate backend readiness. Implement socket-based updates for transfer status changes. |

---

## OI-003: Stock Adjustment Write Flow

| Field | Value |
|-------|-------|
| **Category** | `deferred_scope` |
| **Description** | Stock Adjustment (increase and decrease) for Central Store manager only (Q-ADJ-002: A). Decrease API verified in E2E Section E. No approval needed, immediate with audit trail (SKIP-004: B). |
| **Why not in Slice 4** | Owner decided Slice 4 = transfer writes only (Q-S4-008: A). |
| **Suggested slice** | 5 |
| **Priority** | P1 |
| **Dependency** | API verified_ready (Section E PASS) |
| **Recommended action** | Create Stock Adjustment form with Central-only access. Use segment_id selector. |

---

## OI-004: Wastage Write Flow

| Field | Value |
|-------|-------|
| **Category** | `deferred_scope` |
| **Description** | Wastage entry at store level (any store manager). No approval, immediate with audit trail (SKIP-005: B). API verified in E2E Section E. |
| **Why not in Slice 4** | Not in Slice 4 scope per owner decision. |
| **Suggested slice** | 5 |
| **Priority** | P1 |
| **Dependency** | API verified_ready (Section E PASS) |
| **Recommended action** | Create Wastage Entry form accessible by all roles. Use segment_id selector. |

---

## OI-005: Stock Return Flow

| Field | Value |
|-------|-------|
| **Category** | `deferred_scope` |
| **Description** | Transfer return to original sender only (Conflict-002 resolution). Return Initiate API verified in E2E Section E. Uses `lines` field (not `return_lines`). Sender must accept. |
| **Why not in Slice 4** | Complex flow requiring new UI design. Not in Slice 4 scope. |
| **Suggested slice** | 5 |
| **Priority** | P1 |
| **Dependency** | API verified_ready. UI design needed. |
| **Recommended action** | Design return flow UI. Implement using initiate-style form with "return to original sender" constraint. |

---

## OI-006: Reports Screen

| Field | Value |
|-------|-------|
| **Category** | `deferred_scope` |
| **Description** | Reports screen with date ranges (Q-REPORT-001: A). Currently shows "Reports (soon)" in sidebar. Export to PDF/Excel planned (Q-REPORT-002: A). |
| **Why not in Slice 4** | Not in Slice 4 scope. |
| **Suggested slice** | 5+ |
| **Priority** | P2 |
| **Dependency** | Owner specification of report types and KPIs |
| **Recommended action** | Gather owner requirements for specific report types. Build report generation UI. |

---

## OI-007: CSV/PDF Export

| Field | Value |
|-------|-------|
| **Category** | `deferred_scope` |
| **Description** | Export Transfer History and Stock Ledger to CSV/PDF (Q-REPORT-002: A). Deferred per owner (Q-S3-006). |
| **Why not in Slice 4** | Owner deferred. |
| **Suggested slice** | 5+ |
| **Priority** | P2 |
| **Dependency** | None — frontend-only feature |
| **Recommended action** | Add export buttons to History & Ledger screen. Client-side CSV generation. PDF via library. |

---

## OI-008: KPI Dashboard

| Field | Value |
|-------|-------|
| **Category** | `owner_decision_needed` |
| **Description** | Operations Hub KPIs. API verified (Section E PASS). KPI placeholder was removed in Slice 2. Owner must specify exact KPIs to display (RPT-003: D — owner decides later). |
| **Why not in Slice 4** | Owner has not specified which KPIs. |
| **Suggested slice** | 5+ |
| **Priority** | P2 |
| **Dependency** | Owner KPI specification |
| **Recommended action** | Ask owner for exact KPI list. API is ready. |

---

## OI-009: Cost/Value Reporting with Permissions

| Field | Value |
|-------|-------|
| **Category** | `deferred_scope` |
| **Description** | Show purchase price and total value (Q-REPORT-003: A). Cost Valuation API verified (Section E PASS). Outlet Manager cost visibility is configurable per deployment (SKIP-003: C). Track weighted average, FIFO, latest cost (ITM-003: C). |
| **Why not in Slice 4** | Not in scope. Requires cost model selection UI. |
| **Suggested slice** | 5+ |
| **Priority** | P2 |
| **Dependency** | API verified_ready. Needs cost model UI. |
| **Recommended action** | Design cost model view selector. Build into Store Detail or Reports. |

---

## OI-010: Recipe/Sales Consumption Integration

| Field | Value |
|-------|-------|
| **Category** | `future_enhancement` |
| **Description** | Existing system handles consumption (Q-RECIPE-001: D). Just display in inventory UI. Central controls recipes pushed down (Q-RECIPE-004: A). Predictive alerts based on consumption (Q-RECIPE-005: A). |
| **Why not in Slice 4** | Separate system integration. Not in any current slice. |
| **Suggested slice** | 6+ |
| **Priority** | P3 |
| **Dependency** | Backend recipe/consumption APIs |
| **Recommended action** | Evaluate consumption data APIs. Design display integration. |

---

## OI-011: Production-Scale Ledger/API Optimization

| Field | Value |
|-------|-------|
| **Category** | `future_optimization` |
| **Description** | Stock Ledger currently uses N+1 API calls (lazy-loads transfer details). Acceptable for current scale but needs optimization for production (BLK-R-001). |
| **Why not in Slice 4** | Optimization, not functional. |
| **Suggested slice** | 5+ |
| **Priority** | P2 |
| **Dependency** | Dedicated Stock Ledger API from backend (BLK-R-001) |
| **Recommended action** | Request dedicated ledger API endpoint from backend team. Refactor client to use single call. |

---

## OI-012: Audit Log / Immutable Ledger Admin View

| Field | Value |
|-------|-------|
| **Category** | `future_enhancement` |
| **Description** | Ledger is fully immutable — corrections through reversal entries only (LED-002: A). New reversal entry for cancellations (LED-003: A). Every movement records before/after qty (LED-001: A). Admin view not built. |
| **Why not in Slice 4** | Backend fields not available (BLK-R-002). |
| **Suggested slice** | 5+ |
| **Priority** | P2 |
| **Dependency** | Backend `before_qty`/`after_qty` fields |
| **Recommended action** | Backend adds before/after fields. Build admin audit view. |

---

## OI-013: Batch/Expiry/FIFO/FEFO Handling

| Field | Value |
|-------|-------|
| **Category** | `future_enhancement` |
| **Description** | FEFO batch deduction on orders (Q-RECIPE-002: A). Source selector already supports segment selection with batch/expiry info. Near-expiry Alerts API verified (Section E PASS). Configurable expiry threshold per store (Q-XFER-008: B). |
| **Why not in Slice 4** | Partial — source selector shows batch info. Full FIFO/FEFO management screen not built. |
| **Suggested slice** | 5+ |
| **Priority** | P2 |
| **Dependency** | Near-expiry Alerts API (verified_ready) |
| **Recommended action** | Build near-expiry alerts view. Add expiry threshold settings UI. |

---

## OI-014: Low-Stock/Reorder Management Screen

| Field | Value |
|-------|-------|
| **Category** | `future_enhancement` |
| **Description** | Predictive alerts based on avg daily consumption + threshold quantity (Q-RECIPE-005: A). Low-stock highlighting exists in Store Detail (Slice 1). Dedicated management screen not built. |
| **Why not in Slice 4** | Not in scope. |
| **Suggested slice** | 5+ |
| **Priority** | P2 |
| **Dependency** | Backend consumption data |
| **Recommended action** | Design reorder point management screen with automated threshold alerts. |

---

## OI-015: Advanced Permissions / Maker-Checker Approval

| Field | Value |
|-------|-------|
| **Category** | `future_enhancement` |
| **Description** | Hardcoded Phase 1, configurable Phase 2 (Q-ROLE-001: C). Multi-role not Phase 1 (Q-ROLE-004: D). Per-action activity log (Q-ROLE-005: A). Soft stock reservation on approval (STK-002: A — needs backend). |
| **Why not in Slice 4** | Phase 2 scope. Backend reservation mechanism needed. |
| **Suggested slice** | 6+ |
| **Priority** | P2 |
| **Dependency** | Backend role/permission API, stock reservation mechanism |
| **Recommended action** | Evaluate backend readiness for configurable roles. Design permission management UI. |

---

## OI-016: Lateral Master-to-Master Transfers

| Field | Value |
|-------|-------|
| **Category** | `deferred_scope` |
| **Description** | Lateral Master-to-Master transfers allowed with Central approval (Q-HIER-005: A). API verified (Section E PASS). Requires `allow_lateral_central_transfer` operational setting enabled. |
| **Why not in Slice 4** | Requires operational settings toggle + Central approval workflow. Not in scope. |
| **Suggested slice** | 5 |
| **Priority** | P1 |
| **Dependency** | Operational settings UI. API verified_ready. |
| **Recommended action** | Build operational settings management screen. Add lateral transfer support to Direct Dispatch form with Central approval gate. |

---

*End of Open Items Register*
