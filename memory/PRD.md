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

## NEXT: CI-060 — UI Consolidation (Deep Phase CR)

### Purpose
Owner-driven review of **every screen** across all 3 roles. Owner identifies what's missing in UI and business logic. Those findings are then planned, implemented, QA'd — screen by screen. This is the path to baseline freeze.

### Why this approach?
- Owner is the authority on what the UI should look like and how business logic should behave
- Agent cannot decide if business logic is correct — only owner can
- Feedback must be captured formally before any fixes
- Each fix goes through the full gate: plan → implement → QA
- Freeze happens only after owner approves the final state

### How CI-060 works (6 phases)

```
PHASE 1: DISCOVERY        — Owner reviews every screen, gives feedback
PHASE 2: ANALYSIS         — Agent documents findings, categorizes, prioritizes
PHASE 3: PLANNING         — Agent creates implementation plan per finding
PHASE 4: IMPLEMENTATION   — Agent fixes/builds, screen by screen
PHASE 5: QA               — Independent QA validates each screen after fixes
PHASE 6: OWNER APPROVAL   — Owner re-reviews, approves UI + business logic → FREEZE
```

---

### Phase 1: DISCOVERY (Owner-driven)

**Who:** Owner reviews the live app
**What:** Owner goes through each screen as each role and tells us:
- "This screen is missing X"
- "This business logic is wrong — it should do Y"
- "This UI element should look like Z"
- "This button shouldn't be here"
- "I need a field for W"

**Screen-by-screen review scope:**

| # | Route | Screen | Component | Owner Reviews For | Touches CIs |
|---|-------|--------|-----------|------------------|-------------|
| 1 | `/login` | Login | `LoginPage` | Auth flow, branding, redirect behavior | CI-010, CI-020 |
| 2 | `/` | Operations Hub | `OperationsHub` | Pending counts, action buttons per role, KPI cards, procurement shortcuts, layout | CI-010, CI-011, CI-014, CI-036 |
| 3 | `/inventory` | Stock Inventory | `StockInventorySummary` | Stock items, low-stock display, hierarchy rollup, missing columns/data | CI-036 |
| 4 | `/hierarchy` | Hierarchy Summary | `HierarchySummary` | Store list, tabs, filters, drill-down, missing metrics | CI-010, CI-011 |
| 5 | `/store/:id` | Store Detail | `StoreDetail` | Stock summary, batch drilldown, transactions, low-stock highlight | CI-010 |
| 6 | `/queues` | Pending Queues | `PendingQueues` | Tab structure, queue items, role gating, missing info | CI-010, CI-011, CI-013 |
| 7 | `/transfer/:id` | Transfer Detail | `TransferDetail` | Status, timeline, line items, action buttons, line-level actions, amend/withdraw | CI-010, CI-011, CI-013, CI-030, CI-031, CI-032 |
| 8 | `/dispatch/new` | Direct Dispatch | `DirectDispatchForm` | Destination picker, item selection, source selector, validation, flow | CI-013 |
| 9 | `/request/new` | Request Stock | `RequestStockForm` | Parent display, item selection, source selector, validation, flow | CI-013 |
| 10 | `/adjustment/new` | Stock Adjustment | `StockAdjustmentForm` | Access control, increase/decrease, item picker, reason categories | CI-014 |
| 11 | `/wastage/new` | Wastage Entry | `WastageEntryForm` | Access per role, item picker, reason categories, confirmation | CI-014 |
| 12 | `/wastage/report` | Wastage Report | `WastageReport` | Role scoping, date filter, data display, missing columns | CI-014 |
| 13 | `/history` | History & Ledger | `HistoryLedger` | Both tabs, filters, search, movement types, data accuracy | CI-012, CI-014 |
| 14 | `/settings` | Operational Settings | `OperationalSettings` | Policy keys, inheritance, permission gating | CI-033 |
| 15 | `/vendors` | Vendor Management | `VendorManagement` | CRUD flow, policy gating, missing fields | CI-034 |
| 16 | `/procurement/new` | Add Stock (Vendor) | `AddStockPurchaseForm` | Form fields, vendor selection, validation | CI-035 |

**Also review across ALL screens:**
- Sidebar navigation (correct items per role?)
- Header (store name, role badge, no stale text?)
- Context selector (store picker works? locked for Outlet?)
- Terminology (zero backend terms visible?)
- Confirmation dialogs (show before destructive actions?)
- Error states (what happens when API fails?)

**Owner reviews as 3 roles:**

| Role | Login | What to focus on |
|------|-------|-----------------|
| Central Store | `killua@zoldyck.com` / `Qplazm@10` | Full access — dispatch, adjust, all stores visible, settings edit |
| Master Store | `owner@democentral1.com` / `Qplazm@10` | Mid-level — dispatch + request, own children, limited settings |
| Outlet | `owner@demofranchise1.com` / `Qplazm@10` | Bottom-level — request only, own store locked, no dispatch/adjust |

**Output:** Owner's raw feedback, screen by screen. Agent captures everything.

---

### Phase 2: ANALYSIS (Agent-driven)

**Who:** Agent
**What:** Take owner's feedback and produce a structured findings document:

| Per finding | What to capture |
|-------------|----------------|
| Screen | Which route / component |
| Type | `UI_GAP` / `BIZ_LOGIC_GAP` / `BUG` / `ENHANCEMENT` / `MISSING_SCREEN` |
| Severity | `CRITICAL` / `HIGH` / `MEDIUM` / `LOW` |
| Description | Exactly what owner said |
| Current behavior | What the screen does now |
| Expected behavior | What owner wants |
| Affected CIs | Which CI-XXX items this touches |

**Output:** `CI_060_DISCOVERY_FINDINGS.md` — all findings categorized, prioritized, ready for planning.

---

### Phase 3: PLANNING (Agent-driven, owner confirms)

**Who:** Agent creates plan, owner confirms scope
**What:** For each finding, create implementation plan:

| Per finding | Plan contains |
|-------------|---------------|
| Finding reference | Link to discovery finding |
| Files to change | Exact components/routes |
| Approach | How to fix/build |
| Effort estimate | Small / Medium / Large |
| Dependencies | Other findings that must go first |
| Risk | What could break |

Group findings by screen for efficient implementation.

**Output:** `CI_060_IMPLEMENTATION_PLAN.md` — screen-by-screen plan. Owner confirms before implementation starts.

---

### Phase 4: IMPLEMENTATION (Agent-driven, screen by screen)

**Who:** Agent
**What:** Implement fixes/changes per the approved plan, screen by screen.

**Rules:**
- One screen at a time
- Each screen change gets its own implementation note
- No scope creep — only implement what's in the plan
- If a fix touches shared components, document the blast radius

**Output:** `CI_060_IMPLEMENTATION_REPORT.md` — what was changed, per screen.

---

### Phase 5: QA (Screen by screen)

**Who:** QA Agent (independent)
**What:** After each screen is fixed, QA validates:

| Check | Description |
|-------|-------------|
| Finding resolved | The specific issue owner raised is fixed |
| No regression | Other screens still work |
| 3-role validation | Fix works for all applicable roles |
| Business logic correct | Behavior matches what owner described |
| UI correct | Visual matches what owner wanted |

**Output:** `CI_060_QA_REPORT.md` — screen-by-screen QA results.

---

### Phase 6: OWNER APPROVAL → FREEZE

**Who:** Owner
**What:** Owner re-reviews the fixed screens and records explicit approval:

> "I have reviewed all screens across all 3 roles.
> UI is approved.
> Business logic is approved.
> Proceed to baseline freeze."

**This single statement satisfies RULE 1 for all CI-010 through CI-036.**

**Output:**
- `CI_060_OWNER_APPROVAL.md` — owner's explicit statement
- `BASELINE_FREEZE_DECLARATION.md` — all CI-010 to CI-036 move to `FROZEN`
- CR Registry updated — all items `FROZEN` with freeze date

---

### CI-060 document chain

```
Phase 1 → CI_060_DISCOVERY_FINDINGS.md        (owner feedback captured)
Phase 2 → (included in discovery findings)
Phase 3 → CI_060_IMPLEMENTATION_PLAN.md        (owner confirms before work)
Phase 4 → CI_060_IMPLEMENTATION_REPORT.md      (what was changed)
Phase 5 → CI_060_QA_REPORT.md                  (independent validation)
Phase 6 → CI_060_OWNER_APPROVAL.md             (owner sign-off)
       → BASELINE_FREEZE_DECLARATION.md        (all frozen)
```

### What the next agent does FIRST

**Do NOT start fixing anything.** Phase 1 is DISCOVERY — owner-driven.

```
1. Read this PRD
2. Prepare the app for owner review (ensure it's running, all 3 roles accessible)
3. Present each screen to owner, role by role
4. Capture owner's feedback exactly as given
5. Only after ALL feedback is captured → move to Phase 2 (Analysis)
```

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
