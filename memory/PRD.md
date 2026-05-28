# Central Inventory — PRD

> **Last Updated:** 28 May 2026
> **Purpose:** Handover document for the next agent. Start here.
> **Branch:** `28_5_26_ux`

---

## For The Next Agent — Read This First

### What is this project?
Central Inventory manages stock movement across a 3-level hierarchy for MyGenie POS:
- **Central Store** (top — main warehouse)
- **Master Store** (middle — regional store)
- **Outlet** (bottom — restaurant)

### What's the tech?
React 19 frontend + FastAPI backend that **proxies** all data to MyGenie's real POS API. No local inventory data. MongoDB only stores login token sessions.

### What's the current state?
All features are **built and running**. Nothing is frozen. The next step is **CI-060: UI Consolidation** — review every screen across 3 roles, validate UI + business logic, get owner approval, then freeze.

### Where to start?
1. Read this PRD (you're here)
2. Read `CR_REGISTRY.md` for full item tracker
3. Read `GATE_CONTROL_FRAMEWORK.md` for rules
4. Start executing **CI-060** (see below)

### Key files to know

| File | What It Is |
|------|-----------|
| `/app/README.md` | Project overview, architecture, test accounts, baseline status |
| `/app/memory/central_inventory/CR_REGISTRY.md` | Master tracker — every work item with status |
| `/app/memory/central_inventory/GATE_CONTROL_FRAMEWORK.md` | Gate rules + RULE 1 + RULE 2 |
| `/app/memory/test_credentials.md` | Login credentials for all 3 roles |
| `/app/memory/central_inventory/DOCUMENT_INDEX.md` | Navigate all 90+ project docs |

### Test accounts

| Email | Password | Role |
|-------|----------|------|
| `killua@zoldyck.com` | `Qplazm@10` | Central Store |
| `owner@democentral1.com` | `Qplazm@10` | Master Store |
| `owner@demofranchise1.com` | `Qplazm@10` | Outlet |

### Critical terminology rule
Backend uses **inverted** names. UI must NEVER show backend terms:
- Backend `master` = UI **"Central Store"** (top)
- Backend `central` = UI **"Master Store"** (middle)
- Backend `franchise` = UI **"Outlet"** (bottom)

---

## Architecture

```
Browser → React SPA (port 3000)
            ↓
     FastAPI Proxy (port 8001)
       ├── POST /api/proxy/auth/login → POS V1 login + profile enrichment
       └── ANY  /api/proxy/v2/{path}  → POS V2 pass-through
            ↓
     preprod.mygenie.online (real POS API)
```

- **Backend:** `/app/backend/server.py` (177 lines — pure proxy, no business logic)
- **Frontend:** `/app/frontend/src/` (26 components, 5 hooks, 6 lib modules, 1 API service)
- **No seed data.** No fake data. No local inventory storage. Everything from real POS API.

---

## What's Been Built (CI-010 to CI-036)

### Core Build

| CI | Name | Route | What It Does | Built By |
|----|------|-------|-------------|----------|
| CI-010 | Read-Only Foundation | `/`, `/hierarchy`, `/store/:id`, `/queues`, `/transfer/:id` | Login, Operations Hub, Hierarchy Summary, Store Detail, Pending Queues, Transfer Detail, terminology adapter, role system, screen visibility | Slice 1 |
| CI-011 | UX Polish | Same routes enhanced | Status timeline, date range picker, contextual action buttons, Ready to Dispatch tab, items count, downward-only hierarchy | Slice 2 |
| CI-012 | History & Audit | `/history` | Transfer History tab, Stock Ledger tab, 7 filters, search, transfer linkage | Slice 3 |
| CI-013 | Transfer Write Actions | `/dispatch/new`, `/request/new`, `/transfer/:id` actions | Approve, Reject, Dispatch, Receive (full+partial), Cancel, Report Issue, Direct Dispatch form, Request Stock form, Source Selector | Slice 4 |
| CI-014 | Stock Adj / Wastage | `/adjustment/new`, `/wastage/new`, `/wastage/report` | Stock Adjustment (Central only), Wastage Entry (all roles), Wastage Report, reason categories, stale banner cleanup | Slice 5 |

### Infrastructure

| CI | Name | What It Changed |
|----|------|----------------|
| CI-020 | POS Login Context | Login gets user context from real POS profile API instead of hardcoded map |
| CI-021 | Seed Data Removal | Deleted all fake data (seed_data.py), all endpoints use real POS API |

### Extensions

| CI | Name | Route | What It Does | Built By |
|----|------|-------|-------------|----------|
| CI-030 | Line-Level Approval | `/transfer/:id` (dialog) | Approve/reject individual lines within a transfer | P15 |
| CI-031 | Dispute Resolution | `/transfer/:id` (dialogs) | Handle disputes on received items, edit line items | P16 |
| CI-032 | Amend/Withdraw/Modify | `/transfer/:id` (actions) | Requester can amend, withdraw, or request modification | P17 |
| CI-033 | Operational Settings | `/settings` | Configure inventory policies per store | P17 |
| CI-034 | Vendor Management | `/vendors` | Vendor CRUD, policy-gated | P18 |
| CI-035 | Add Stock from Vendor | `/procurement/new` | Procurement form — stock from vendor | P19 |
| CI-036 | Stock Inventory Summary | `/inventory` | Stock dashboard with hierarchy rollup | P20 |

---

## Current Status — Every CI

| CI | Status | QA | Smoke | Owner Approval |
|----|--------|----|-------|----------------|
| CI-010 | `QA_PASSED` | Done | **NO** | **NO** |
| CI-011 | `QA_PASSED` | Done | **NO** | **NO** |
| CI-012 | `QA_PASSED` | Done | **NO** | **NO** |
| CI-013 | `QA_PASSED` | Done | **NO** | **NO** |
| CI-014 | `SMOKE_PASSED` | Done | Done | **NO** |
| CI-020 | `QA_PASSED` | Done | **NO** | **NO** |
| CI-021 | `QA_PASSED` | Done | **NO** | **NO** |
| CI-030 | `IMPLEMENTED` | Informal only | **NO** | **NO** |
| CI-031 | `IMPLEMENTED` | Informal only | **NO** | **NO** |
| CI-032 | `IMPLEMENTED` | Informal only | **NO** | **NO** |
| CI-033 | `IMPLEMENTED` | Informal only | **NO** | **NO** |
| CI-034 | `IMPLEMENTED` | Informal only | **NO** | **NO** |
| CI-035 | `IMPLEMENTED` | Informal only | **NO** | **NO** |
| CI-036 | `IMPLEMENTED` | Informal only | **NO** | **NO** |

**Zero implementation baselines are frozen. 14 need owner action.**

---

## NEXT: CI-060 — UI Consolidation (Freeze Gate CR)

### Purpose
Single CR to review **every screen** across all 3 roles, validate UI correctness + business logic correctness, and get **one owner approval** that covers CI-010 through CI-036. This is the vehicle to freeze all baselines together.

### Why this approach?
- 14 individual smoke tests is impractical
- Owner needs to see the full product, not fragments
- UI + business logic approval should be holistic, not per-slice
- One consolidated approval satisfies RULE 1 for all 14 items

### Scope: All 16 routes × 3 roles

| # | Route | Screen | Component | What To Validate | Touches CIs |
|---|-------|--------|-----------|-----------------|-------------|
| 1 | `/login` | Login | `LoginPage` | Auth flow, correct redirect, no backend terms | CI-010, CI-020 |
| 2 | `/` | Operations Hub | `OperationsHub` | Pending counts, action buttons per role, stock KPI cards, procurement shortcuts | CI-010, CI-011, CI-014, CI-036 |
| 3 | `/inventory` | Stock Inventory | `StockInventorySummary` | Stock items, low-stock alerts, hierarchy rollup for parent roles | CI-036 |
| 4 | `/hierarchy` | Hierarchy Summary | `HierarchySummary` | Store list, tabs (Master Stores / Outlets), date filter, store drill-down | CI-010, CI-011 |
| 5 | `/store/:id` | Store Detail | `StoreDetail` | Stock summary, batch drilldown, transactions, low-stock highlight | CI-010 |
| 6 | `/queues` | Pending Queues | `PendingQueues` | 4 tabs (Approvals, Receives, Ready to Dispatch, My Requests), role-gated | CI-010, CI-011, CI-013 |
| 7 | `/transfer/:id` | Transfer Detail | `TransferDetail` | From/to info, status badge, timeline, line items, action buttons per role+status, line-level actions, amend/withdraw/modify | CI-010, CI-011, CI-013, CI-030, CI-031, CI-032 |
| 8 | `/dispatch/new` | Direct Dispatch | `DirectDispatchForm` | Destination picker, item selection, source selector, submit | CI-013 |
| 9 | `/request/new` | Request Stock | `RequestStockForm` | Parent store display, item selection, source selector, submit | CI-013 |
| 10 | `/adjustment/new` | Stock Adjustment | `StockAdjustmentForm` | Central-only access, increase/decrease toggle, item picker, reason dropdown, confirmation | CI-014 |
| 11 | `/wastage/new` | Wastage Entry | `WastageEntryForm` | All roles, item picker, reason dropdown (6 categories), confirmation | CI-014 |
| 12 | `/wastage/report` | Wastage Report | `WastageReport` | Role-scoped, date filter, wastage data | CI-014 |
| 13 | `/history` | History & Ledger | `HistoryLedger` | Transfer History tab, Stock Ledger tab, 7 movement type filters, search, transfer linkage | CI-012, CI-014 |
| 14 | `/settings` | Operational Settings | `OperationalSettings` | Policy keys, inherited values, permission-gated (franchise cannot update) | CI-033 |
| 15 | `/vendors` | Vendor Management | `VendorManagement` | Vendor list, add/edit/delete, policy-gated | CI-034 |
| 16 | `/procurement/new` | Add Stock (Vendor) | `AddStockPurchaseForm` | Item selection, quantity, vendor, batch/expiry | CI-035 |

### Shared UI elements to validate across ALL screens

| Element | Component | What To Check |
|---------|-----------|---------------|
| Sidebar navigation | `Sidebar` | Correct items per role, active state, "(soon)" on Reports |
| Header | `AppHeader` | Store name, role badge (Central Store / Master Store / Outlet), no stale banners |
| Context selector | `ContextSelector` | Store picker for parent roles, locked for Outlet |
| Confirmation dialogs | `ConfirmActionDialog` | Shows before all destructive actions |
| Reason dialogs | `ReasonDialog` | Shows for reject/cancel with reason categories |
| Source selector | `SourceSelector` | Segment + bucket modes, fallback for unauthorized |
| Terminology | `terminology.js` | Zero backend terms (`master`/`central`/`franchise`) visible in UI |

### Role matrix for CI-060

| Screen | Central Store | Master Store | Outlet |
|--------|--------------|-------------|--------|
| Operations Hub | Full: dispatch, adjust, wastage, procurement | Full: dispatch, request, wastage, procurement | Limited: request, wastage only |
| Hierarchy Summary | Both tabs | Both tabs | Limited |
| Store Detail | Any store | Own + children | Own only |
| Pending Queues | 3-4 tabs | 3-4 tabs | No approval tab |
| Transfer Detail | All actions | All actions | Receive + limited |
| Dispatch form | Yes | Yes | Hidden |
| Request form | Hidden | Yes | Yes |
| Adjustment form | Yes | Permission denied | Permission denied |
| Wastage form | Yes | Yes | Yes |
| Settings | Full edit | Read (or limited edit) | Hidden or read-only |
| Vendors | Yes | Yes | Hidden or policy-gated |
| Procurement | Yes | Yes | Policy-gated |

### CI-060 execution steps

```
Step 1: Agent logs in as each role, screenshots every screen
Step 2: Validate UI correctness (layout, badges, terminology, no stale text)
Step 3: Validate business logic (correct buttons per role, correct data scoping, permission enforcement)
Step 4: Validate shared elements (sidebar, header, dialogs, source selector)
Step 5: Document all findings in CI-060 report
Step 6: Fix any issues found
Step 7: Re-validate fixes
Step 8: Present to owner for smoke + approval (UI + business logic)
Step 9: Owner records explicit approval
Step 10: Freeze all baselines CI-010 through CI-036
```

### CI-060 output documents
- `CI_060_UI_CONSOLIDATION_REPORT.md` — screen-by-screen findings
- `CI_060_OWNER_SMOKE_CHECKLIST.md` — what owner must verify
- `CI_060_OWNER_APPROVAL.md` — owner records: "UI approved. Business logic approved."
- `BASELINE_FREEZE_DECLARATION.md` — all CI-010 to CI-036 frozen

### After CI-060 completes
- All 14 baselines move to `FROZEN`
- RULE 1 satisfied for all items (QA + smoke + owner approval via CI-060)
- RULE 2 gate opens (new work can begin)
- Owner gives Slice 6 go-ahead (or not)

---

## Owner-Mandated Rules

**RULE 1 — Baseline Freeze:** No freeze without (a) QA passed, (b) Owner smoke test passed, (c) Owner explicit approval for UI + business logic. No implicit. No assumed.

**RULE 2 — New Work Entry:** No work on CI-040+ until ALL CI-010 through CI-036 are FROZEN + owner gives explicit go-ahead.

---

## Backlog (After Freeze)

| Priority | CI | Name | Notes |
|----------|----|------|-------|
| P1 | CI-040 | Smart Dispatch Assistance | Planning doc exists |
| P1 | CI-041 | Edit Transfer | API contract unknown |
| P1 | CI-043 | Stock Return Flow | API unclear |
| P1 | CI-044 | Reports Screen | Sidebar shows "(soon)" |
| P2 | CI-042 | WebSocket Notifications | Phase 2 per owner |
| P2 | CI-045 | CSV/PDF Export | |
| P2 | CI-047 | Cost/Value Reporting | |
| P2 | CI-049 | Batch/Expiry Management | |
| BLOCKED | CI-046 | KPI Dashboard | Owner hasn't specified KPIs |

---

## Governance Docs

| Document | Path | Purpose |
|----------|------|---------|
| **This PRD** | `/app/memory/PRD.md` | Handover + next steps |
| **CR Registry** | `/app/memory/central_inventory/CR_REGISTRY.md` | Every CI with status, old ID cross-ref |
| **Gate Control** | `/app/memory/central_inventory/GATE_CONTROL_FRAMEWORK.md` | Stage gates + RULE 1 + RULE 2 |
| **Document Index** | `/app/memory/central_inventory/DOCUMENT_INDEX.md` | Navigate 90+ docs |
| **README** | `/app/README.md` | Architecture, setup, test accounts |
| **Test Credentials** | `/app/memory/test_credentials.md` | All login credentials |
