# Central Inventory — CR Registry

> **Last Updated:** 28 May 2026
> **Purpose:** Single source of truth for every work item and its lifecycle status.
> **Naming Convention:** `CI-XXX` (Central Inventory sequential ID)
> **Rule:** Every implementation MUST have a row here before it can be frozen.

---

## Naming Convention

All items use a single prefix: **CI-XXX** (sequential).

| Range | Category | Description |
|-------|----------|-------------|
| CI-001 to CI-003 | **PLANNING** | Requirements, business rules, owner decisions — documents, not code |
| CI-010 to CI-014 | **CORE BUILD** | Slices 1–5 — the main product, built in order |
| CI-020 to CI-021 | **INFRASTRUCTURE** | Backend plumbing — login context, seed removal |
| CI-030 to CI-036 | **EXTENSIONS** | Features beyond core — line-level actions, settings, vendors, procurement, inventory |
| CI-040+ | **BACKLOG** | Deferred / future / blocked items |

Old IDs (CR-001, S1, INF-01, P15, OI-001 etc.) are listed as aliases for traceability.

---

## Status Legend

| Status | Meaning | Who Advances |
|--------|---------|-------------|
| `PLANNING` | Planned, not yet implemented | — |
| `IMPLEMENTED` | Code complete, not yet QA'd | Implementation Agent |
| `QA_PASSED` | Independent QA validation complete | QA Agent |
| `SMOKE_PASSED` | Owner smoke test passed | Owner / Smoke Agent |
| `ACCEPTED` | Owner explicit approval recorded (UI + business logic) | Owner (human only) |
| `FROZEN` | Baseline locked — changes require new CI-XXX | Freeze Agent |
| `DEFERRED` | Explicitly deferred to future | Owner decision |
| `BLOCKED` | Cannot proceed — dependency missing | — |

---

## Full Registry

### PLANNING — Requirements & Decisions (no code)

| ID | Old ID | Name | What It Contains | Status | Date |
|----|--------|------|-----------------|--------|------|
| **CI-001** | CR-001 | Requirements & API Collection | 2282-line requirements doc: hierarchy mapping (Central→Master→Outlet), 22 workflows, 26 screen specs, 34 API endpoints, terminology discovery | `FROZEN` | Jan 2026 |
| **CI-002** | CR-002 | Business Rules & UX Freeze | 96 owner decisions reconciled: transfer rules, permission matrix, terminology confirmed (backend `master` = UI "Central Store"), screen visibility for 23 screens × 4 roles | `FROZEN` | Jan 2026 |
| **CI-003** | CR-003 | Owner Decisions (104 answers) | Every question answered: hierarchy rules, approval logic, stock enforcement, wastage rules, role permissions, report scope, notification strategy. Primary authority when rules conflict. | `FROZEN` | Jan 2026 |

> These are documents, not code. No smoke test applicable. Frozen = content locked.

---

### CORE BUILD — Main Product (Slices 1–5)

| ID | Old ID | Name | What Was Built | Features | Status | Impl Date | QA Evidence | Owner Smoke | Owner Approval |
|----|--------|------|---------------|----------|--------|-----------|-------------|-------------|----------------|
| **CI-010** | S1 | Read-Only Foundation | Login, Operations Hub, Hierarchy Summary, Store Detail, Pending Queues, Transfer Detail, terminology adapter (`terminology.js`), role system (`useLoginContext.js`), screen visibility (`screenVisibility.js`), API service layer (`api.js`) | 12 | `QA_PASSED` | May 2026 | S1 QA report + iteration_7 (10/10) | **NOT DONE** | **NOT DONE** |
| **CI-011** | S2 | UX Polish & Enterprise Visibility | Status timeline on transfers, date range picker with presets, contextual action buttons per role/status, "Ready to Dispatch" tab, items count column, downward-only hierarchy, context selector in-place updates | 12 | `QA_PASSED` | May 2026 | Implementation report 12/12 | **NOT DONE** | **NOT DONE** |
| **CI-012** | S3 | History & Audit Trail | `/history` route, Transfer History tab (10 columns), Stock Ledger tab (12 columns), 7 status filters, movement type filter, direction filter, search, transfer detail linkage, role-scoped visibility | 15 | `QA_PASSED` | May 2026 | iteration_5 (15/15) | **NOT DONE** | **NOT DONE** |
| **CI-013** | S4 | Transfer Write Actions | Approve, Reject (with reason), Dispatch, Receive (full), Partial Receive (line-level), Cancel, "Report Issue", Direct Dispatch form (`/dispatch/new`), Request Stock form (`/request/new`), Source Selector (segment + bucket modes), confirmation dialogs, duplicate prevention (`useWriteAction`) | 15 | `QA_PASSED` | May 2026 | iteration_8 (34/34) + API E2E 52/52 | **NOT DONE** | **NOT DONE** |
| **CI-014** | S5 | Stock Adjustment, Wastage & Cleanup | Stock Adjustment form (`/adjustment/new`, Central-only, increase/decrease), Wastage Entry form (`/wastage/new`, all roles), Wastage Report (`/wastage/report`), predefined reason categories (5 adj + 6 wastage), History/Ledger 3 new movement types, removed all stale "Read-only Mode" banners, GET proxy bugfix | 9 | `SMOKE_PASSED` | 24 May | S5 Final QA (55/57) | Done (44/44) | **NOT DONE** (smoke done, approval never recorded) |

---

### INFRASTRUCTURE — Backend Plumbing

| ID | Old ID | Name | What Was Changed | Why | Status | Impl Date | QA Evidence | Owner Smoke | Owner Approval |
|----|--------|------|-----------------|-----|--------|-----------|-------------|-------------|----------------|
| **CI-020** | INF-01 | POS API Login Context | Login now calls real POS profile API (`GET /vendoremployee/profile`) to get `restaurant_type_flag`, `restaurant_id`, `parent_restaurant_id`. Replaced hardcoded email→store map. Token sessions stored in MongoDB. | Stop using fake user→store mapping | `QA_PASSED` | 24 May | QA report 17/17 (28 May) | **NOT DONE** | **NOT DONE** |
| **CI-021** | INF-02 | Seed Data Removal | Deleted `seed_data.py` (491 lines). Removed all 5 dedicated seed-backed endpoint handlers. Removed `SEED_FALLBACK_ENABLED`. Removed frontend hardcoded store IDs. All endpoints now use generic V2 proxy → real POS API. | Stop using fake stores/items/transfers | `QA_PASSED` | 25 May | QA report 20/20 (28 May) | **NOT DONE** | **NOT DONE** |

---

### EXTENSIONS — Features Beyond Core

| ID | Old ID | Name | What Was Built | Key Files | Status | Impl Date | QA Evidence | Owner Smoke | Owner Approval |
|----|--------|------|---------------|-----------|--------|-----------|-------------|-------------|----------------|
| **CI-030** | P15 | Line-Level Approval | Approve or reject individual lines within a transfer (not just whole transfer). Wave approval dialog. | `ApproveWaveDialog.jsx` (247 lines) | `IMPLEMENTED` | 25 May | iteration_15 (pass) — informal only | **NOT DONE** | **NOT DONE** |
| **CI-031** | P16 | Dispute Resolution & Item Editing | Handle disputes on received items. Edit line items within a transfer. Enhanced status timeline. | `DisputeResolutionDialog.jsx` (128 lines), `ItemEditorDialog.jsx` (211 lines), `StatusTimeline.jsx` enhanced | `IMPLEMENTED` | 26 May | iteration_16 (pass) — informal only | **NOT DONE** | **NOT DONE** |
| **CI-032** | P17-LC | Amend / Withdraw / Modification | Requester can: amend a pending request, withdraw it entirely, or request a modification after approval. Three new transfer lifecycle actions. | `TransferDetail.jsx` enhanced | `IMPLEMENTED` | 27 May | iteration_17 (16/16) — informal only | **NOT DONE** | **NOT DONE** |
| **CI-033** | P17-SET | Operational Settings | Settings screen to configure inventory policies per store (e.g., allow vendor purchases, transfer thresholds). Inherited settings chain (root→leaf). Permission-gated (franchise cannot update). | `OperationalSettings.jsx` (218 lines), route `/settings` | `IMPLEMENTED` | 27 May | iteration_18 (pass) — informal only | **NOT DONE** | **NOT DONE** |
| **CI-034** | P18 | Vendor Management | Full vendor CRUD — add, edit, delete vendors. Policy-gated: Central must enable `allow_vendor_purchase` for stores. | `VendorManagement.jsx` (197 lines), `VendorFormDialog.jsx` (128 lines), route `/vendors` | `IMPLEMENTED` | 27 May | iteration_18 (pass) — informal only | **NOT DONE** | **NOT DONE** |
| **CI-035** | P19 | Add Stock from Vendor | Procurement form — add stock purchased from a vendor (different from inter-store transfer). Item selection, quantity, vendor, batch/expiry. | `AddStockPurchaseForm.jsx` (346 lines), route `/procurement/new` | `IMPLEMENTED` | 27 May | iteration_18 (pass) — informal only | **NOT DONE** | **NOT DONE** |
| **CI-036** | P20 | Stock Inventory Summary | Dashboard showing all stock items with quantities, low-stock alerts, hierarchy rollup for parent roles. Uses `stock-inventory` API with optional `include_hierarchy=true`. | `StockInventorySummary.jsx` (368 lines), `useStockInventory.js` hook, route `/inventory` | `IMPLEMENTED` | 27 May | iteration_19 (14/14) — informal only | **NOT DONE** | **NOT DONE** |

---

### BACKLOG — Deferred / Future / Blocked

| ID | Old ID | Name | What It Would Do | Status | Blocker |
|----|--------|------|-----------------|--------|---------|
| **CI-040** | P21 | Smart Dispatch Assistance | AI-powered: when operator picks a destination, show what that store needs, suggest items and quantities | `PLANNING` | Planning doc only, no code |
| **CI-041** | OI-001 | Edit Transfer | Edit a pre-dispatch transfer (resets to "requested", forces re-approval) | `DEFERRED` | API contract unknown — button exists but is noop |
| **CI-042** | OI-002 | WebSocket Notifications | Real-time push notifications for transfer status changes | `DEFERRED` | Phase 2 per owner decision |
| **CI-043** | OI-005 | Stock Return Flow | Child returns stock to parent (original sender only, sender must accept) | `DEFERRED` | API endpoint unclear |
| **CI-044** | OI-006 | Reports Screen | Full reporting with date ranges, hierarchy rollup | `DEFERRED` | Sidebar shows "(soon)" — needs owner specification |
| **CI-045** | OI-007 | CSV/PDF Export | Export Transfer History and Stock Ledger | `DEFERRED` | Frontend-only feature, not prioritized |
| **CI-046** | OI-008 | KPI Dashboard | Operations Hub KPI widgets | `BLOCKED` | Owner has not specified which KPIs (RPT-003: D) |
| **CI-047** | OI-009 | Cost/Value Reporting | Show purchase price, total value, cost models | `DEFERRED` | Needs cost model UI design |
| **CI-048** | OI-012 | Audit Log Admin View | Admin view of immutable ledger with before/after quantities | `DEFERRED` | Backend `before_qty`/`after_qty` fields needed |
| **CI-049** | OI-013 | Batch/Expiry Management | FIFO/FEFO management screen, near-expiry alerts | `DEFERRED` | Screen design needed |
| **CI-050** | OI-014 | Low-Stock Reorder Management | Reorder point management, automated threshold alerts | `DEFERRED` | Backend consumption data needed |
| **CI-051** | OI-015 | Advanced Permissions | Configurable roles (Phase 1 = hardcoded, Phase 2 = configurable) | `DEFERRED` | Phase 2 per owner decision |
| **CI-052** | OI-016 | Lateral Master-to-Master Transfers | Master stores transfer to each other with Central approval | `DEFERRED` | CI-033 (settings) partially enables; full UI not built |

---

## Summary

| Status | Count | Items |
|--------|-------|-------|
| `FROZEN` | 3 | CI-001, CI-002, CI-003 (planning docs — no code) |
| `SMOKE_PASSED` | 1 | CI-014 (smoke done, owner approval not recorded) |
| `QA_PASSED` | 6 | CI-010, CI-011, CI-012, CI-013, CI-020, CI-021 |
| `IMPLEMENTED` | 7 | CI-030, CI-031, CI-032, CI-033, CI-034, CI-035, CI-036 |
| `PLANNING` | 1 | CI-040 |
| `DEFERRED` | 11 | CI-041 through CI-052 (excluding CI-046) |
| `BLOCKED` | 1 | CI-046 |

**Zero implementation baselines are FROZEN.**

---

## What's Missing Per Item (RULE 1 Checklist)

| ID | Name | QA | Smoke | Owner Approval | Path to Freeze |
|----|------|----|-------|----------------|----------------|
| CI-010 | Read-Only Foundation | Done | **MISSING** | **MISSING** | Smoke → Approval → Freeze |
| CI-011 | UX Polish | Done | **MISSING** | **MISSING** | Smoke → Approval → Freeze |
| CI-012 | History & Audit | Done | **MISSING** | **MISSING** | Smoke → Approval → Freeze |
| CI-013 | Transfer Write Actions | Done | **MISSING** | **MISSING** | Smoke → Approval → Freeze |
| CI-014 | Stock Adj/Wastage/Cleanup | Done | Done | **MISSING** | Approval → Freeze |
| CI-020 | POS Login Context | Done | **MISSING** | **MISSING** | Smoke → Approval → Freeze |
| CI-021 | Seed Data Removal | Done | **MISSING** | **MISSING** | Smoke → Approval → Freeze |
| CI-030 | Line-Level Approval | **MISSING** (informal only) | **MISSING** | **MISSING** | Closure doc → Formal QA → Smoke → Approval → Freeze |
| CI-031 | Dispute Resolution | **MISSING** (informal only) | **MISSING** | **MISSING** | Same |
| CI-032 | Amend/Withdraw/Modify | **MISSING** (informal only) | **MISSING** | **MISSING** | Same |
| CI-033 | Operational Settings | **MISSING** (informal only) | **MISSING** | **MISSING** | Same |
| CI-034 | Vendor Management | **MISSING** (informal only) | **MISSING** | **MISSING** | Same |
| CI-035 | Add Stock from Vendor | **MISSING** (informal only) | **MISSING** | **MISSING** | Same |
| CI-036 | Stock Inventory Summary | **MISSING** (informal only) | **MISSING** | **MISSING** | Same |

---

## Owner-Mandated Rules

**RULE 1 — Baseline Freeze:** No freeze without (a) QA passed, (b) Owner smoke test passed, (c) Owner explicit approval covering UI correctness AND business logic correctness. All three mandatory. No implicit. No assumed. No exceptions.

**RULE 2 — Slice 6 / New Work Entry:** No new scope work (CI-040+) until ALL items CI-010 through CI-036 are `FROZEN` and owner records explicit go-ahead. Agent must refuse if any item is still `IMPLEMENTED`/`QA_PASSED`/`SMOKE_PASSED`.

---

## Next Actions (Priority Order)

1. **CI-030 to CI-036 Closure Docs + Formal QA** → moves 7 items from `IMPLEMENTED` to `QA_PASSED`
2. **Combined Owner Smoke Test** (CI-010 through CI-036) → moves all to `SMOKE_PASSED`
3. **Owner Explicit Approval** (UI + business logic) → moves all to `ACCEPTED`
4. **Baseline Freeze Declaration** → moves all `ACCEPTED` to `FROZEN`
5. Only then: CI-040+ work can begin

---

## Cross-Reference: Old ID → New ID

| Old ID | New ID | Old ID | New ID | Old ID | New ID |
|--------|--------|--------|--------|--------|--------|
| CR-001 | CI-001 | S4 | CI-013 | P17-SET | CI-033 |
| CR-002 | CI-002 | S5 | CI-014 | P18 | CI-034 |
| CR-003 | CI-003 | INF-01 | CI-020 | P19 | CI-035 |
| S1 | CI-010 | INF-02 | CI-021 | P20 | CI-036 |
| S2 | CI-011 | P15 | CI-030 | P21 | CI-040 |
| S3 | CI-012 | P16 | CI-031 | OI-001 | CI-041 |
| S4 | CI-013 | P17-LC | CI-032 | OI-002 to OI-016 | CI-042 to CI-052 |

---

*End of CR Registry*
