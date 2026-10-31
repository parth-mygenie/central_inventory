# Central Inventory — Consolidated Project Ledger & Handoff Document

> **Generated:** 29 May 2026
> **Purpose:** Append-only project ledger for agent continuity. Consolidates all planning, validation, implementation, and deferred work across all phases.
> **Rule:** Future agents MUST NOT rewrite historical sections. Append updates only.

---

## 1. Project Overview

**Application:** Central Inventory — multi-store hierarchy stock management for MyGenie POS
**Architecture:** React 19 frontend → FastAPI proxy → preprod.mygenie.online POS API
**Repository:** parth-mygenie/central_inventory, branch 29_5_26_1
**Auth:** Real POS API login (no local auth layer)

### Hierarchy Model (TERMINOLOGY IS INVERTED)

| Business Label | API `restaurant_type_flag` | Hierarchy Level |
|----------------|---------------------------|:---------------:|
| Central Store (TOP) | `master` | 0 |
| Master Store (MIDDLE) | `central` | 1 |
| Outlet (BOTTOM) | `franchise` | 2 |

**CRITICAL:** Frontend MUST use terminology mapping layer (`lib/terminology.js`). Never display raw API terms.

### Test Accounts

| Email | Password | API Type | RID | Business Label |
|-------|----------|----------|-----|----------------|
| abhishek@kalabahia.com | Qplazm@10 | master | 1 | Central Store |
| killua@zoldyck.com | Qplazm@10 | master | 1 | Central Store |
| owner@democentral1.com | Qplazm@10 | central | 781 | Master Store |
| owner@democentral2.com | Qplazm@10 | central | 782 | Master Store |
| owner@demofranchise1.com | Qplazm@10 | franchise | 783 | Outlet |
| owner@demofranchise2.com | Qplazm@10 | franchise | 784 | Outlet |
| owner@demofranchise3.com | Qplazm@10 | franchise | 785 | Outlet |
| owner@demofranchise4.com | Qplazm@10 | franchise | 786 | Outlet |

---

## 2. Implementation Timeline & Phase Status

### Era 1: Foundation (Slices 1-4) — CLOSED 23 May 2026

| Slice | Scope | Status | QA |
|-------|-------|--------|:--:|
| Slice 1 | Read-only screens: Operations Hub, Hierarchy Summary, Store Detail | **CLOSED** | Passed |
| Slice 2 | Pending Queues, Transfer Detail, Status Timeline | **CLOSED** | Passed |
| Slice 3 | History & Ledger, date filters, status filters | **CLOSED** | Passed |
| Slice 4 | Write flows: Dispatch, Request, Approve, Reject, Receive, Cancel | **CLOSED** | Passed |

**Closure doc:** `memory/central_inventory/CENTRAL_INVENTORY_SLICE_1_TO_4_FINAL_ACCEPTANCE_AND_CLOSURE_REPORT.md`

### Era 2: Slice 5 (Phases 0-7) — CLOSED 24 May 2026

| Phase | Scope | Status |
|-------|-------|--------|
| Phase 0 | Scope planning + baseline lock | **CLOSED** |
| Phase 1 | Source selector + segment-aware dispatch | **CLOSED** |
| Phase 2 | Receive dialog + partial receive + dispute | **CLOSED** |
| Phase 3 | Stock adjustment (increase/decrease) | **CLOSED** |
| Phase 4 | Wastage entry + wastage report | **CLOSED** |
| Phase 5 | Request stock 3-step flow (sources → catalog → request) | **CLOSED** |
| Phase 6 | Seed data shutdown + POS API context migration | **CLOSED** |
| Phase 7 | Final QA | **CLOSED** (55/57 checks pass) |

**Closure doc:** `memory/central_inventory/CENTRAL_INVENTORY_SLICE_5_FINAL_ACCEPTANCE_RECOMMENDATION.md`

### Era 3: Phase 2 Features (P15-P20) — MIXED STATUS

| Phase | Scope | Planning | API Validated | Implemented | Test Status |
|-------|-------|:--------:|:------------:|:-----------:|:-----------:|
| P15 | Transfer lifecycle (base) | N/A | N/A | **YES** (in Slice 4) | Passed |
| P16 | Partial approve + line lifecycle | N/A | N/A | **YES** (in Slice 5) | Passed |
| P17 | Amend / Withdraw / Modification | **YES** | **YES** (27 May) | **YES** | Passed |
| P17-Settings | Operational Settings CRUD | **YES** | **YES** (27 May) | **YES** | Passed |
| P18 | Vendor Management CRUD | **YES** | **YES** (27 May) | **YES** | Passed |
| P19 | Add Stock (Procurement) | **YES** | **YES** (27 May) | **YES** | Passed |
| P20 | Stock Inventory Summary | **YES** | **YES** (27 May) | **YES** (self-store) | 14/14 FE + 11/11 BE |

**NOT implemented from P20:** Hierarchy toggle, cross-store comparison, transfer source behavior.

### Era 4: Phase 3 Features (P21-P24) — MIXED STATUS

| Phase | Scope | Planning | API Validated | Implemented | Test Status |
|-------|-------|:--------:|:------------:|:-----------:|:-----------:|
| P21-Catalogue | Ingredient/Product/Recipe/Addon-Recipe CRUD | **YES** | **YES** (27-28 May) | **YES** | 17/17 FE + 19/19 BE |
| P21-Gaps | Food Category CRUD + Addon CRUD + Ingredient Rename | **YES** | **YES** (28 May) | **YES** | 17/17 FE + 30/30 BE |
| P21-Smart | Smart Dispatch/Request Assistance | **YES** (brainstorm) | Partial (uses existing) | **NO** | N/A |
| P22 | Daily Consumption Report | **YES** | **YES** (28 May, 9 probes) | **YES** | 12/12 FE |
| P23 | Hierarchy Create/View/Bundle Push | **YES** | **YES** (29 May, 24 probes) | **YES** | 12/12 FE |
| P24 | FEFO Batch Stock Detail | **YES** | **YES** (29 May, 19 probes) | **NO** | N/A |

---

## 3. Documentation Index

### AI/Plans/ — Addendum Files (API Investigation + Implementation Status)

| File | Phase | Date | Probes | Status |
|------|-------|------|:------:|--------|
| `api_implementation_status_p17_addendum.md` | P17 Amend/Withdraw/Modify | 27 May | ~10 | Validated + Implemented |
| `api_implementation_status_p17p18p19_addendum.md` | P17-Settings/P18-Vendors/P19-Procurement | 27 May | ~15 | Validated + Implemented |
| `api_implementation_status_p20_addendum.md` | P20 Stock Inventory | 27 May | 6 | Validated |
| `api_implementation_status_p20_implementation_addendum.md` | P20 Implementation Report | 27 May | — | Implemented (self-store only) |
| `api_implementation_status_p21_addendum.md` | P21 Smart Dispatch (planning summary) | 27 May | — | Planning only |
| `api_implementation_status_p21_catalogue_addendum.md` | P21 Catalogue APIs | 27 May | 30 | Validated |
| `api_implementation_status_p21_catalogue_gaps_addendum.md` | P21 Catalogue Gaps (Category/Addon/Rename) | 28 May | 20+ | Validated + Implemented |
| `api_implementation_status_p21_catalogue_implementation_addendum.md` | P21 Catalogue Implementation Report | 28 May | — | Implemented |
| `api_implementation_status_p21_gaps_implementation_addendum.md` | P21 Gaps Implementation Report | 28 May | — | Implemented |
| `api_implementation_status_p22_addendum.md` | P22 Consumption Report | 28-29 May | 9 | Validated + Implemented |
| `api_implementation_status_p23_addendum.md` | P23 Hierarchy Management | 29 May | 24 | Validated + Implemented |
| `api_implementation_status_p24_addendum.md` | P24 FEFO Batch Stock | 29 May | 19 | Validated (planning only) |

### AI/Plans/phase2/ — Phase 2 Planning Docs

| File | Phase | Status |
|------|-------|--------|
| `P17_amend_withdraw_modification_plan.md` | P17 | Implemented |
| `P17P18P19_settings_vendors_procurement_plan.md` | P17-19 | Implemented |
| `P20_stock_inventory_summary_plan.md` | P20 | Implemented (partial — no hierarchy) |

### AI/Plans/phase3/ — Phase 3 Planning Docs

| File | Phase | Status |
|------|-------|--------|
| `P21_catalogue_planning.md` | P21 Catalogue | Implemented |
| `P21_smart_dispatch_request_assistance.md` | P21 Smart Dispatch | **PLANNING ONLY — NOT IMPLEMENTED** |
| `P22_daily_consumption_report_planning.md` | P22 | Implemented |
| `P23_hierarchy_management_planning.md` | P23 | Implemented |
| `P24_fefo_batch_stock_planning.md` | P24 | **PLANNING ONLY — NOT IMPLEMENTED** |

### AI/curls/ — API Validation Curl Collections

| File | Phase | Probes |
|------|-------|:------:|
| `p17_amend_withdraw_modification_curls.sh` | P17 | ~10 |
| `p20_stock_inventory_curls.sh` | P20 | 6 |
| `p21_catalogue_curls.sh` | P21 | 30+ |
| `p22_daily_consumption_curls.sh` | P22 | 9 |
| `p23_hierarchy_management_curls.sh` | P23 | 24 |
| `p24_fefo_stock_detail_curls.sh` | P24 | 19 |

### memory/central_inventory/ — Historical Archive (62 files)

**Key documents for future agents:**

| Document | Purpose |
|----------|---------|
| `SYSTEM_HANDOVER_DOCUMENT.md` | Master reference: hierarchy model, lifecycle, stock architecture (912 lines) |
| `CENTRAL_INVENTORY_LOGIN_CONTEXT_AND_SCREEN_VISIBILITY_MATRIX.md` | Role→screen access matrix |
| `CENTRAL_INVENTORY_CR_REQUIREMENT_PLANNING.md` | Original CR requirements (2281 lines, largest doc) |
| `CENTRAL_INVENTORY_BUSINESS_RULE_AND_UX_FIELD_FREEZE.md` | Frozen business rules + field definitions |
| `CENTRAL_INVENTORY_SLICE_1_TO_4_FINAL_ACCEPTANCE_AND_CLOSURE_REPORT.md` | Slices 1-4 closure |
| `CENTRAL_INVENTORY_SLICE_5_FINAL_ACCEPTANCE_RECOMMENDATION.md` | Slice 5 closure |
| `CENTRAL_INVENTORY_POST_SLICE_4_OPEN_ITEMS_REGISTER.md` | Deferred items register |
| `PRD_UPDATE_AFTER_SLICE_1_TO_4_CLOSURE.md` | PRD update changelog |
| `api_evidence/API_VERIFICATION_COMPREHENSIVE_FINAL.md` | API verification evidence |
| `bugFixes/BF_001_GET_PROXY_500_JSON_KWARG.md` | Bug fix: httpx GET with json=None |

---

## 4. Current Frontend Inventory (29 May 2026)

### Components (32 files)

| Component | Route | Phase |
|-----------|-------|-------|
| OperationsHub | `/` | Slice 1 |
| StockInventorySummary | `/inventory` | P20 |
| HierarchySummary | `/hierarchy` | Slice 1 |
| HierarchyManagement | `/hierarchy/manage` | P23 |
| StoreDetail | `/store/:id` | Slice 1 |
| PendingQueues | `/queues` | Slice 2 |
| TransferDetail | `/transfer/:id` | Slice 2 |
| HistoryLedger | `/history` | Slice 3 |
| DirectDispatchForm | `/dispatch/new` | Slice 4 |
| RequestStockForm | `/request/new` | Slice 5 Phase 5 |
| StockAdjustmentForm | `/adjustment/new` | Slice 5 Phase 3 |
| WastageEntryForm | `/wastage/new` | Slice 5 Phase 4 |
| WastageReport | `/wastage/report` | Slice 5 Phase 4 |
| OperationalSettings | `/settings` | P17 |
| VendorManagement | `/vendors` | P18 |
| AddStockPurchaseForm | `/procurement/new` | P19 |
| IngredientCatalogue | `/catalogue/ingredients` | P21 |
| ProductCatalogue | `/catalogue/products` | P21 |
| RecipeCatalogue | `/catalogue/recipes` | P21 |
| AddonRecipeCatalogue | `/catalogue/addon-recipes` | P21 |
| DailyConsumptionReport | `/reports/consumption` | P22 |
| LoginPage | `/login` | Slice 1 |

### Hooks (8 files)

| Hook | Purpose | Phase |
|------|---------|-------|
| useLoginContext | Auth + role context | Slice 1 |
| useStockInventory | Stock inventory fetching | P20 |
| useConsumptionReport | Consumption report state | P22 |
| useHierarchyManagement | Hierarchy CRUD + push | P23 |
| useCatalogueCrud | Generic CRUD pattern | P21 |
| useWriteAction | Transfer write operations | Slice 4 |
| useCentralInventoryRealtime | Realtime updates | Slice 2 |
| use-toast | Toast notifications | Shared |

### API Methods (86 functions in api.js)

Grouped by feature area — all proxy through FastAPI → POS API.

### Lib Modules (6 files)

| Module | Purpose |
|--------|---------|
| terminology.js | Backend↔Business term mapping (CRITICAL) |
| screenVisibility.js | Role→screen access + nav items (22 screens, 13 nav items) |
| transferActions.js | Transfer action permission matrix |
| formatters.js | Date/number formatting helpers |
| reasonCategories.js | Wastage/adjustment reason categories |
| utils.js | cn() classname utility |

---

## 5. Open Investigations & Unresolved Items

### Active (ready for implementation)

| ID | Item | Status | Effort | Docs |
|----|------|--------|--------|------|
| P24 | FEFO batch stock detail panel | **PLANNED, API VALIDATED** | ~10-13h (3 phases) | `P24_fefo_batch_stock_planning.md` + addendum |
| P21-Smart | Smart dispatch/request assistance | **PLANNED** (brainstorm level) | ~10-15h (5 phases) | `P21_smart_dispatch_request_assistance.md` |
| P20-Hierarchy | Stock inventory hierarchy toggle | **PLANNED, API VALIDATED** | ~3-4h | `P20_stock_inventory_summary_plan.md` (Phase 2 section) |

### Deferred (from Post-Slice-4 Open Items Register)

| Item | Category | Notes |
|------|----------|-------|
| Transfer edit by source/parent | Feature gap | `POST /edit/{id}` exists but no frontend |
| Hierarchy-wide stock comparison | UX | Needs hierarchy toggle in P20 |
| Notification system | Feature | No POS API support discovered |
| Forecasting/reporting | Feature | Beyond current scope |
| PDF/CSV export for reports | Feature | P22 + future reports |
| Child deletion/deactivation | Feature | No API found in P23 investigation |
| Multi-outlet batch push | UX | Loop per-target from UI |
| Employee/role push modules | Feature | push_food_bundle only pushes food entities |

### Known Reconciliation Issues (from P24)

**Updated 29 May 2026 (evening):** After FEFO consumption activated, F3 red meat and patri reconciliation gaps have self-healed.

| Store | Item | Aggregate | Segment Total | Gap | Status |
|-------|------|:---------:|:-------------:|:---:|--------|
| F3 (785) | red meat | 3250 | 3250 | 0 | **BALANCED** (was 3750 gap — healed by FEFO consumption) |
| F3 (785) | patri | 3950 | 3950 | 0 | **BALANCED** (was 50 gap — healed) |
| F3 (785) | maida | 2000 | 2000 | 0 | Balanced (unchanged) |
| Master (1) | maida | 118150 | 108150 | 10000 | Unsegmented legacy remainder (needs backfill) |
| F2 (784) | Cooking Oil | -500 | 0 | -500 | Negative stock, no segments (pre-FEFO-deployment consumption) |
| F2 (784) | maida | -1000 | 0 | -1000 | Negative stock, no segments (pre-FEFO-deployment consumption) |

### FEFO Flag Status

**CORRECTED (29 May 2026 evening):** `fefo_consumption_enabled` is **TRUE for all stores** (resolved from Master settings, inherited by all children). Earlier finding that "appears OFF for F2" was incorrect — F2 consumption (orders #869307, #869321) predated the FEFO code deployment. Order #869395 at F3 confirms FEFO is fully operational with segment_allocations populated.

---

## 6. Documentation Consistency Report

### Issues Found

| ID | Type | Location | Issue | Severity |
|----|------|----------|-------|----------|
| DC-1 | Stale status | P23 planning doc header | Says "no code changes" but implementation is complete | LOW — addendum has correct status |
| DC-2 | Stale status | P22 planning doc header | Says "no code changes" but implementation is complete | LOW — addendum has correct status |
| DC-3 | Stale status | All phase2/ plan doc headers | Say "PLANNING ONLY" but all are implemented | LOW — addendums track correct status |
| DC-4 | Stale status | P21 catalogue plan header | Says "PLANNING + API VALIDATION" but implemented | LOW |
| DC-5 | Incomplete | P23 addendum line 27-28 | Push permission says "direct children" but user corrected: master can push to nested franchises too | MEDIUM — planning doc has updated info, addendum row outdated |
| DC-6 | Missing | test_credentials.md | Only has master account; missing central/franchise test accounts | MEDIUM |
| DC-7 | Stale | `scr-20-reports` screen visibility | Still defined but no nav item points to it (replaced by scr-consumption-report) | LOW — unused, no impact |
| DC-8 | Reference gap | P21 smart dispatch mentions `smart_dispatch_concept.png` | File not found in repo | LOW — brainstorm doc |
| DC-9 | Legacy archive | `memory/central_inventory/raw_reference/AI/Plans/api_implementation_status.md` | Superseded by per-phase addendums but still referenced as "working memory" | LOW — archived |
| DC-10 | Test entities | P23 addendum test entities (787, 788, 789) | Created in live POS during probing; still exist | INFO — noted for cleanup |

### No Issues Found

- All curl files have matching addendums
- All planning docs have matching addendums (except P21-Smart which uses P21 addendum)
- No broken file references in active docs
- Backend server.py and frontend api.js are consistent
- Route registrations match component existence
- Screen visibility keys match nav items

---

## 7. Test Evidence Registry

| Iteration | Date | Phase | Type | Result | Key Findings |
|-----------|------|-------|------|:------:|--------------|
| 1-21 | Pre-29 May | Slices 1-5 + P17-P21 | Mixed | Archived | In repo from original branch |
| 22 | 29 May | P22 Consumption Report | FE only | **12/12 PASS** | All features verified |
| 23 | 29 May | P23 Hierarchy Management | FE only | **12/12 PASS** | All features verified |
| (pending) | — | P24 FEFO Detail | — | Not tested | Awaiting implementation |

### Backend Test Files (12 pytest suites in `/backend/tests/`)

All from pre-29 May branch. Cover: API contracts, lifecycle flows, write APIs, stock inventory, catalogue, request flow, source selector.

---

## 8. Architecture Notes for Future Agents

### Backend
- **server.py is a PROXY only** (177 lines). No business logic. All V2 calls pass through to `preprod.mygenie.online`.
- Generic catch-all: `@api_router.api_route("/proxy/v2/{path:path}")` handles GET/POST/PUT/DELETE.
- Auth enrichment on login: fetches POS profile to get `restaurant_type_flag` + `restaurant_id`.
- Bug fix BF-001: GET requests must not pass `json=` kwarg to httpx.

### Frontend
- **86 API methods** in single `api.js` — each handles normalization at the response layer.
- **Terminology inversion** handled via `lib/terminology.js` — NEVER use raw backend type strings in UI.
- **Screen visibility** controlled by `lib/screenVisibility.js` — role-based nav + access gates.
- **No local state persistence** beyond localStorage token + user object.
- **No seed data** — all data comes from live POS API.

### Key API Quirks (documented in addendums)
- Food category update uses **POST** not PUT (`/product/update-categories/{id}`)
- Addon update route is noun-verb: `/product/addon-update/{id}` (not `/product/update-addon/{id}`)
- Recipe routes use `/recipe/` prefix, not `/product/`
- Push requires `push_food_bundle: true` or gets 422 BUNDLE_ONLY_PUSH
- `franchise/list` child objects have ~150 fields — normalize aggressively
- All stock quantities are **strings** — parse to float
- `by_restaurant` on consumption report is conditionally absent (not empty array)

---

## 9. Next Priority Actions

### P0 — Immediate

1. **P24 Implementation** — FEFO batch stock detail panel (planned, validated, ~10-13h)

### P1 — High Value

2. **P20 Phase 2** — Stock inventory hierarchy toggle (~3-4h, API validated)
3. **P21 Smart Dispatch Phase 1** — Low-stock suggestions on dispatch form (~4-5h)

### P2 — Medium

4. PDF/CSV export for consumption + wastage reports
5. Multi-outlet batch push UI for P23
6. Chart visualizations for consumption trends

### P3 — Backlog

7. Transfer edit by source/parent frontend
8. Notification system (no API support yet)
9. Forecasting/analytics

---

*This document is append-only. Future agents should add dated sections below this line.*
