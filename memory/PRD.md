# Central Inventory - PRD

> **Last Updated:** 23 May 2026
> **Closure Status:** Slices 1-4 implementation complete, owner smoke pending

## Problem Statement

Central Inventory module for MyGenie POS — multi-level inventory management across Central Store to Master Store to Outlet hierarchy with transfer workflows, stock tracking, and reporting.

## Architecture

- **Backend**: FastAPI (Python) — proxy server forwarding to `preprod.mygenie.online` APIs with seed data enrichment
- **Frontend**: React (CRA + CRACO) with Tailwind CSS, Radix UI, shadcn/ui components
- **Database**: MongoDB (status checks); main data proxied/seeded from Laravel backend
- **Auth**: Proxied to MyGenie preprod auth API
- **Source**: GitHub `parth-mygenie/central_inventory`, branch `23_5_26`

## Seed Data Accounts

- `abhishek@kalabahia.com` / `Qplazm@10` — Central Store (ID=1)
- `owner@democentral1.com` / `Qplazm@10` — Master Store (ID=781)
- `owner@demofranchise1.com` / `Qplazm@10` — Outlet (ID=783)

---

# Central Inventory Current Product Status — Through Slice 4

## 1. Current Closure Status

| Slice | Status | QA | Owner Smoke |
|-------|--------|-----|-------------|
| Slice 1 | Complete | `qa_passed_with_minor_notes` | Accepted (implicit via Slice 2 work) |
| Slice 2 | Complete | 12/12 PASS | Accepted (implicit via Slice 3 work) |
| Slice 3 | Complete | 15/15 PASS | Accepted (implicit via Slice 4 work) |
| Slice 4 | Complete | 20/20 frontend + 14/14 backend PASS | **PENDING** |
| Final acceptance docs | Complete | — | — |
| Owner Slice 4 manual smoke/sign-off | — | — | **PENDING** |

**Closure verdict:** `accepted_with_owner_smoke_pending`

---

## 2. Slice-by-Slice Completed Scope

### Slice 1 — Read-Only Foundation (CLOSED)

- Context Selector (level badge, store picker, locked for Outlet)
- Operations Hub (pending counts, quick actions)
- Hierarchy Summary (Master Stores / Outlets tabs, search, click-through)
- Store Detail (stock summary, batch drilldown, low-stock highlight, transactions)
- Pending Queues (Approvals, Receives, My Requests tabs, role-gated)
- Transfer Detail foundation (from/to info, status badge, line items)
- Role-based Central/Master/Outlet UX via terminology adapter
- Seed data (7 restaurants, 16 inventory items, 12 transfers covering all statuses)
- Backend API proxy (auth + V2 generic proxy + seed enrichment)

### Slice 2 — UX Polish + Enterprise Transfer Visibility (CLOSED, 12/12 QA PASS)

- Ready to Dispatch tab in Pending Queues
- Transfer Detail status timeline (Requested to Approved to Dispatched to Received)
- Line-level accept/reject display (conditional columns)
- Timestamp formatting via date-fns (`formatTimestamp()`)
- Resolution reason display card (type, reason, receive totals)
- Date range picker with presets (Today, Yesterday, This Week, etc.)
- Contextual action buttons by role + status (`transferActions.js` matrix)
- Items count column in Pending Queues
- Store name fix (validated across 3 roles)
- Downward-only hierarchy visibility (Master sees Outlets only)
- Context selector in-place hub updates ("Viewing as" + Reset)
- KPI placeholder removed

### Slice 3 — Read-Only History & Ledger Traceability (CLOSED, 15/15 QA PASS)

- `/history` route with History & Ledger screen
- Transfer History tab (10 columns, 7 status badges, clickable rows)
- Stock Ledger tab (12 columns, derived from transfer data)
- Date range filter (shared between tabs)
- Transfer status filter (7 clickable pills)
- Ledger movement type filter (4 pills: Transfer Out/In, Partial Receive, Reversal)
- Direction filter (All / Incoming / Outgoing)
- Search by Transfer ID / item name
- Role-based visibility enforcement (server-side filtering)
- Transfer Detail linkage (clickable rows + reference links)
- Store/context filter via direction toggle
- Reason/note display in Stock Ledger
- Actor/user display with numeric ID fallback
- Empty/loading/error states with safe fallbacks

### Slice 4 — Transfer Write Flows (COMPLETE, 20/20 + 14/14 QA PASS, Owner Smoke PENDING)

**Must-have (12/12 DONE):**
- Approve transfer — ConfirmActionDialog + `api.approveTransfer()`
- Reject transfer with reason — ReasonDialog + `api.rejectTransfer()`
- Dispatch approved transfer — ConfirmActionDialog + `api.dispatchTransfer()`
- Receive transfer (full) — ReceiveDialog "Receive All"
- Partial receive with line-level resolution — ReceiveDialog + `received_lines[]` payload
- Cancel transfer with reason — ReasonDialog + `api.cancelTransfer()`
- "Report Issue" post-dispatch (Q-XFER-006 override) — labeled "Report Issue" not "Reject"
- Direct Dispatch form at `/dispatch/new` (Central/Master to child, including Central direct to Outlet)
- Request Stock form at `/request/new` (child to parent)
- Source selector configurable (segment_id default + filter_bucket with warning)
- Confirmation dialogs for all destructive actions (SEC-002: A)
- Duplicate submission prevention + post-action data refresh (`useWriteAction` hook)

**Should-have (3/4 DONE):**
- Success/error toast notifications (Toaster mounted in AppLayout)
- Quantity validation with UOM awareness (pcs=whole, kg/ltr=2 decimals)
- API error message terminology mapping (`mapApiErrorMessage()`)
- Edit Transfer: **DEFERRED** (API contract unknown)

**API integration:** 7 write methods + 3 pre-existing read methods = 10/10 verified via real preprod API proxy

---

## 3. Validation / QA Evidence Summary

| Slice | QA Type | Result | Evidence |
|-------|---------|--------|----------|
| 1 | Independent QA Agent review | `qa_passed_with_minor_notes` | `CENTRAL_INVENTORY_FRONTEND_SLICE_1_QA_VALIDATION_REPORT.md` |
| 2 | Implementation verification | 12/12 items DONE | `CENTRAL_INVENTORY_SLICE_2_IMPLEMENTATION_REPORT.md` |
| 3 | Automated testing agent | 15/15 PASS across 3 roles | `/app/test_reports/iteration_5.json` |
| 4 | Automated testing agent | 20/20 frontend + 14/14 backend PASS | `/app/test_reports/iteration_8.json` |
| API | E2E comprehensive test | 52/52 PASS (100%) | `api_evidence/API_VERIFICATION_COMPREHENSIVE_FINAL.md` |

**Role coverage:** All 3 roles (Central Store, Master Store, Outlet) tested in every slice.

**Note:** Owner manual smoke for Slice 4 is pending. Automated QA passed all checks.

---

## 4. Known Non-Blocking Issues

| # | Issue | Classification | Slice |
|---|-------|---------------|-------|
| 1 | "Phase 1 Limited Slice — Read-only mode" banner still shows | accepted_expected_behavior | 1 |
| 2 | Transfer History rows lack store type badges | backend_limitation | 3 |
| 3 | Stock Ledger uses N+1 API calls (lazy-loads details) | future_optimization | 3 |
| 4 | Before/After quantity always shows "—" | backend_limitation | 3 |
| 5 | Actor names show numeric IDs (no user name API) | backend_limitation | 3 |
| 6 | Date range filter is client-side only | accepted_expected_behavior | 3 |
| 7 | Edit Transfer button renders but is noop | deferred_scope | 4 |
| 8 | filter_bucket source selector may fail with batched stock | accepted_expected_behavior | 4 |
| 9 | Parent store resolution uses hierarchy heuristic | future_optimization | 4 |
| 10 | Slice 4 owner smoke testing pending | needs_owner_smoke | 4 |

---

## 5. Deferred / Open Items (16 total)

Full details in: `CENTRAL_INVENTORY_POST_SLICE_4_OPEN_ITEMS_REGISTER.md`

| # | Item | Priority | Suggested Slice |
|---|------|----------|----------------|
| 1 | Edit Transfer API discovery | P1 | 5 |
| 2 | Real-time WebSocket notifications | P2 | 6+ |
| 3 | Stock Adjustment write screen | P1 | 5 |
| 4 | Wastage write screen | P1 | 5 |
| 5 | Stock Return flow | P1 | 5 |
| 6 | Reports screen | P2 | 5+ |
| 7 | CSV/PDF export | P2 | 5+ |
| 8 | KPI dashboard | P2 | 5+ |
| 9 | Cost/value reporting | P2 | 5+ |
| 10 | Recipe/sales consumption integration | P3 | 6+ |
| 11 | Production-scale ledger/API optimization | P2 | 5+ |
| 12 | Audit log / immutable ledger admin view | P2 | 5+ |
| 13 | Batch/expiry/FIFO/FEFO management | P2 | 5+ |
| 14 | Low-stock/reorder management | P2 | 5+ |
| 15 | Advanced permissions / maker-checker | P2 | 6+ |
| 16 | Lateral Master-to-Master transfers | P1 | 5 |

---

## 6. Recommended Slice 5 Candidates

**P1 candidates for Slice 5 (NOT YET APPROVED — candidates only):**

1. Edit Transfer (API discovery + implementation)
2. Stock Adjustment write flow (API verified_ready)
3. Wastage write flow (API verified_ready)
4. Stock Return flow (API verified_ready)
5. Lateral Master-to-Master transfers (API verified_ready, needs operational settings UI)

**Slice 5 is NOT started and NOT approved. These are candidates pending owner prioritization.**

---

## 7. Owner Sign-Off Status

| Gate | Status |
|------|--------|
| Owner manual Slice 4 smoke test | **PENDING** |
| Final Slice 1-4 closure sign-off | **PENDING** |

**Checklist for owner:** `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_1_TO_4_OWNER_SIGNOFF_CHECKLIST.md`

---

## 8. Source of Truth Links

| Document | Path |
|----------|------|
| Final Acceptance & Closure Report | `memory/central_inventory/CENTRAL_INVENTORY_SLICE_1_TO_4_FINAL_ACCEPTANCE_AND_CLOSURE_REPORT.md` |
| Open Items Register | `memory/central_inventory/CENTRAL_INVENTORY_POST_SLICE_4_OPEN_ITEMS_REGISTER.md` |
| Owner Sign-Off Checklist | `memory/central_inventory/CENTRAL_INVENTORY_SLICE_1_TO_4_OWNER_SIGNOFF_CHECKLIST.md` |
| Slice 4 Implementation Report | `memory/central_inventory/CENTRAL_INVENTORY_SLICE_4_IMPLEMENTATION_REPORT.md` |
| Slice 4 QA Handover | `memory/central_inventory/CENTRAL_INVENTORY_SLICE_4_QA_HANDOVER.md` |
| Owner Answers (104 decisions) | `memory/central_inventory/OWNER_ANSWERS_COMPLETE.md` |
| API Evidence (52/52 PASS) | `memory/central_inventory/api_evidence/API_VERIFICATION_COMPREHENSIVE_FINAL.md` |

---

## Setup

- Cloned from GitHub repo `parth-mygenie/central_inventory`, branch `23_5_26`
- Backend: FastAPI on port 8001 (supervisor-managed)
- Frontend: React/CRACO on port 3000 (supervisor-managed)
- Dependencies: `pip install -r requirements.txt`, `yarn install`
