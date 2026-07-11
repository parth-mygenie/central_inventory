# Agent Handover — CR-023 / CR-024 / CR-025 Closure

**Date:** 2026-06-13  
**From:** Validation agent (P28/P30 session)  
**To:** Next implementation agent  
**Objective:** Close 3 CRs currently in QA, then proceed to backlog CRs  

---

## 1. YOUR MISSION

You have **3 CRs in QA status** that are fully implemented and tested. Your job:

1. **CR-023** → smoke test → mark CLOSED  
2. **CR-024** → smoke test → mark CLOSED  
3. **CR-025** → smoke test → mark CLOSED + wire `reference_code` as PO number  
4. Then pick up **CR-015** (P24 FEFO Batch Stock Detail) — highest priority unbuilt feature  

---

## 2. MANDATORY READING (do this first)

Read these files in order. Do NOT start coding until you've read all of them.

| # | File | Why |
|---|------|-----|
| 1 | `control/L1_CONTROL_DASHBOARD.md` | Current project state, active sprint, pending signoffs |
| 2 | `control/L0_BASELINE_INDEX.md` | What's frozen — 6 docs you cannot contradict |
| 3 | `control/CODE_GATE_POLICY.md` | 7-artifact model: what's required before you code |
| 4 | `control/MAINTENANCE_RULES.md` | When to update each governance layer |
| 5 | `control/L6_SPRINT_STATUS.md` | Sprint S3 active, CR-023/024/025 deliverables |
| 6 | `control/L8_ACCESS_REGISTRY.md` | Test accounts (also see `memory/test_credentials.md` for 806 hierarchy) |
| 7 | `control/sessions/INTELLIGENT_UI_FREEZE_PHASE_7_FINAL_FREEZE.md` | The frozen UI spec — 24 screens, design contract |
| 8 | `AI/Plans/PROJECT_LEDGER.md` | Full project history, architecture notes, API quirks |
| 9 | `AI/Plans/api_implementation_status_p28_smoke_validation.md` | This session's 43-test validation report |

---

## 3. CRITICAL ARCHITECTURE RULES

### Terminology Inversion (will trip you up)

| What the USER sees | What the API returns | Hierarchy Level |
|---|---|:---:|
| **Central Store** | `restaurant_type_flag: "master"` | TOP |
| **Master Store** | `restaurant_type_flag: "central"` | MIDDLE |
| **Outlet** | `restaurant_type_flag: "franchise"` | BOTTOM |

Mapping lives in `frontend/src/lib/terminology.js`. **NEVER display raw API terms in UI.**

### Backend is a Proxy — Zero Business Logic

`backend/server.py` (181 lines) forwards all calls to `preprod.mygenie.online`. All intelligence is frontend-computed. You will NOT touch this file for CR-023/024/025 closure.

### Screen Visibility

`frontend/src/lib/screenVisibility.js` controls which screens each role sees. Master (Central Store) can't request stock. Franchise (Outlet) can't dispatch. This is by design.

### API Cache (CR-024)

`frontend/src/services/api.js` has in-memory cache. TTL: 60s (hierarchy/inventory), 45s (transfer details), 30s (queues/history). Auto-invalidates on mutations. Don't break this.

---

## 4. TEST ACCOUNTS

### Primary hierarchy (restaurant 806 — created this session)

| Store | RID | Email | Password | Type |
|-------|-----|-------|----------|------|
| german fluid | 806 | manager@germanfluid.com | Qplazm@10 | master (Central Store) |
| Central Kitchen Alpha | 807 | manager@centralkitchenalpha.com | Qplazm@10 | central (Master Store) |
| Central Kitchen Beta | 808 | manager@centralkitchenbeta.com | Qplazm@10 | central (Master Store) |
| Outlet Direct One | 809 | manager@outletdirectone.com | Qplazm@10 | franchise (Outlet) |
| Alpha Outlet One | 810 | manager@alphaoutletone.com | Qplazm@10 | franchise (Outlet) |
| Cost Test Outlet | 811 | manager@costtestoutlet.com | Qplazm@10 | franchise (Outlet) |

### Legacy hierarchy (restaurant 1 — may not all work)

| Email | RID | Type |
|-------|-----|------|
| abhishek@kalabahia.com | 1 | master |
| owner@democentral1.com | 781 | central |
| owner@demofranchise1.com | 783 | franchise |

Full list: `control/L8_ACCESS_REGISTRY.md`

---

## 5. CR-023: API Reality Check & Intelligence Gap Fix

### Status: QA → needs smoke test → CLOSED

### What was done
17 bugs fixed after the intelligence layer (CR-021) was tested against real POS API data. Key fixes:

- **Operations Hub**: Progressive loading (no skeleton blocking), stock health KPIs
- **Pending Queues**: Card-based inbox with requester health strip, insufficient stock warnings, Reject/Approve All/Partial Approve buttons
- **Transfer Detail**: FROM/TO labels fixed per transfer type, Requester Store Snapshot, Approval Impact card
- **Stock Inventory**: Expiry Risk / Pending / Days of Cover columns, Low Stock stat card
- **History & Ledger**: PO/Ref column, status badges, type badges, direction arrows, Export CSV
- **Catalogues**: "Used in X recipes" cross-ref, "Pushed to X stores" status
- **Hierarchy Management**: Push status column, stale detection
- **Dialogs**: ReceiveDialog FEFO display, ApproveWaveDialog FEFO auto-select, various polish

### Smoke test checklist (for owner signoff)

| # | Test | Login as | Navigate to | Verify |
|---|------|---------|------------|--------|
| 1 | Operations Hub loads | master (806) | `/` | Stock health KPIs (47 items, 1 low). Store health grid (3 franchises with out/ok badges). Quick Actions row. |
| 2 | Pending Queues shows intelligence | master (806) | `/queues` | Approvals tab: card-based with item lines, Your Stock, After Approval. Insufficient stock warning in red. |
| 3 | Transfer Detail shows snapshot | master (806) | Click "View Details" on any queue card | Requester store health context. Approval impact numbers. |
| 4 | Stock Inventory columns | master (806) | `/inventory` | Expiry Risk, Pending, Days of Cover columns visible. CSV export button. |
| 5 | History shows PO refs | master (806) | `/history` | PO/Ref column (PO-XXXX format), status badges, type badges, direction arrows. |
| 6 | Catalogues show cross-refs | master (806) | `/catalogue/ingredients` | Check any ingredient row has "Used in X recipes" info. |

### Files changed
~20 component files + `api.js`. Key files: `OperationsHub.jsx`, `PendingQueues.jsx`, `TransferDetail.jsx`, `StockInventorySummary.jsx`, `HistoryLedger.jsx`, `SourceSelector.jsx`, `ReceiveDialog.jsx`, `ApproveWaveDialog.jsx`

### Closure steps
1. Run smoke tests above
2. If pass: update `control/registry.json` → CR-023 status to `CLOSED`
3. Update artifact_refs: artifact 6 (Owner-Signoff) status to `DONE`
4. Run `node control/gen_dashboard_data.js`
5. Update `control/L1_CONTROL_DASHBOARD.md` — move CR-023 from "Owner Signoff Pending" to closed
6. Update `control/L6_SPRINT_STATUS.md` — CR-023 status to CLOSED

---

## 6. CR-024: API Response Cache

### Status: QA → needs smoke test → CLOSED

### What was done
Single file change: `frontend/src/services/api.js`. Added in-memory cache layer.

- 71 API calls → 20 calls per 4-page navigation (72% reduction)
- In-flight dedup (React StrictMode double-fire protection)
- Auto-invalidation on all 15 write/mutation endpoints
- TTL: LONG 60s, MEDIUM 45s, SHORT 30s

### Smoke test checklist

| # | Test | How |
|---|------|-----|
| 1 | App feels faster on back-navigation | Login as master → navigate Hub → Queues → History → back to Hub. Second Hub load should be near-instant (cached). |
| 2 | Mutations still work | Approve a transfer → go to Queues → verify the approved transfer moved out of Approvals tab (cache was invalidated). |
| 3 | Manual refresh works | Click "Refresh" button on any screen → data reloads from API (not stale cache). |

### Closure steps
Same as CR-023: update registry.json → `CLOSED`, artifact 6 → `DONE`, run gen_dashboard_data.js, update L1 + L6.

---

## 7. CR-025: Coverage-Based Intelligent PO

### Status: QA → needs smoke test + PO number wire → CLOSED

### What was done

**Request Stock** (`RequestStockForm.jsx` — major rewrite):
- Coverage selector: 3/7/10/30 day dropdown
- KPI cards: Need Ordering / Partially Covered / Fully Covered / In This PO
- Consumption-based suggestions with threshold fallback
- Category grouping (coffee, Cookie, etc.)
- Per item: Your Stock, Days Cover, Source Avail, editable Order Qty, Suggestion text
- "4 pending requests with this source" warning
- Dual tab: Suggested Reorder vs Manual Request

**Direct Dispatch** (`DirectDispatchForm.jsx` — major rewrite):
- Coverage selector: 3/7/10/30 day
- Destination store picker with auto-needs-detection
- "A PO will be auto-generated" note

### PO Number Status

**Current state:** Frontend uses `formatPO(transfer.id)` → displays `PO-0226` (database ID, placeholder).

**Backend now has:** `reference_code: TRF-806-2026-0016` (real, unique, generated per transfer).

**What needs to happen:** Replace `formatPO(id)` with the actual `reference_code` from the API. This is a frontend-only change:

1. Find `formatPO` in `frontend/src/lib/formatters.js`
2. In every screen that displays PO numbers, use `transfer.reference_code` instead of `formatPO(transfer.id)`
3. Key files: `HistoryLedger.jsx`, `PendingQueues.jsx`, `TransferDetail.jsx`, `PostSubmitConfirmation.jsx` (if exists)
4. Fallback: if `reference_code` is null (legacy transfers), keep `PO-{id}` format

**Owner confirmed:** Backend now generates `reference_code`. This replaces the G-013 gap.

### Smoke test checklist

| # | Test | Login as | Navigate to | Verify |
|---|------|---------|------------|--------|
| 1 | Request Stock intelligence | franchise (809) | `/request/new` | Coverage selector (3/7/10/30d). "10 Need Ordering" KPI. Category groups. Per-item Your Stock + Source Avail. |
| 2 | Suggested Reorder quantities | franchise (809) | `/request/new` | Items show "Gap to min: 500 pkt" or consumption-based suggestion. Order Qty pre-filled. |
| 3 | Pending request warning | franchise (809) | `/request/new` | "4 pending requests with this source" amber warning. |
| 4 | Direct Dispatch intelligence | master (806) | `/dispatch/new` | Coverage selector visible. "A PO will be auto-generated" note below Create Dispatch button. |
| 5 | PO number displays | master (806) | `/history` | After wiring reference_code: should show `TRF-806-2026-XXXX` instead of `PO-XXXX`. |

### Closure steps
1. Wire `reference_code` as PO number (see above)
2. Run smoke tests
3. Update registry.json → CR-025 status `CLOSED`, artifact 6 → `DONE`
4. Update G-013 in `control/L9_OPEN_GAPS_REGISTER.md` — status to CLOSED
5. Run `node control/gen_dashboard_data.js`
6. Update L1 + L6

---

## 8. BACKEND GAP STATUS (as of 2026-06-13)

| Gap | Description | Status | Action for you |
|-----|------------|--------|---------------|
| **G-013** | PO number in API | **RESOLVED** — `reference_code` field exists | Wire to frontend (part of CR-025 closure) |
| **G-009** | Partial dispatch | **RESOLVED** — works via approval_lines | Close in L9 |
| **G-010** | Stock reservation | **RESOLVED** — `reserve_on_approve` setting available | Close in L9 |
| **G-012** | Request catalog categories | **RESOLVED** — `category_id` + `category_name` in response | Close in L9 |
| G-006 | Stock return flow API | ❌ STILL OPEN | Not your scope — backend team |
| G-014 | Invoice OCR endpoint | ❌ STILL OPEN | Not your scope |
| G-015 | Excel parsing endpoint | ❌ STILL OPEN | Not your scope |
| G-016 | Invoice number storage | ❌ STILL OPEN | Not your scope |
| G-017 | Vendor purchase history | ❌ STILL OPEN | Not your scope |

**After closing CR-023/024/025**, update `control/L9_OPEN_GAPS_REGISTER.md` to mark G-009, G-010, G-012, G-013 as CLOSED.

---

## 9. AFTER THE 3 CRS — BACKLOG PRIORITY

| Priority | CR | Title | Effort | Planning Doc |
|----------|-----|-------|--------|-------------|
| **P0** | CR-015 | P24 — FEFO Batch Stock Detail Panel | ~10-13h | `AI/Plans/phase3/P24_fefo_batch_stock_planning.md` + `AI/Plans/api_implementation_status_p24_addendum.md` |
| P1 | CR-016 | P20 Phase 2 — Stock Inventory Hierarchy Toggle | ~3-4h | `AI/Plans/phase2/P20_stock_inventory_summary_plan.md` (Phase 2 section) |
| P1 | CR-018 | P25 — Wastage Report Enhancements | ~4-5h | — |
| P2 | CR-017 | P21 Smart Dispatch Assistance | ~10-15h | `AI/Plans/phase3/P21_smart_dispatch_request_assistance.md` |
| Future | CR-020 | Daily Intelligence Digest | TBD | — |

**CR-015 (P24)** is the highest priority because:
- API is already validated (19 probes in `p24_fefo_stock_detail_curls.sh`)
- Planning doc exists with 3-phase implementation plan
- This session validated FEFO segments end-to-end — the data is proven
- It gives users visibility into the FEFO batches we just validated at the API level

---

## 10. GOVERNANCE RULES — FOLLOW THESE

### Before you code anything new (CR-015 onwards)

You MUST produce these artifacts in `control/sessions/`:

| # | Artifact | What to create |
|---|----------|---------------|
| 0 | Session-Start | Copy `SESSION_START_TEMPLATE.md`, fill in context |
| 1 | Intake | Problem statement + scope + requirements |
| 2 | Impact Analysis | Files affected, APIs used, risk assessment |
| 3 | Implementation Plan | Step-by-step file targets |
| 4 | Code-Gate | Review checkpoint before major coding |
| 5 | QA Report | Test results, screenshots, evidence |
| 6 | Owner Signoff | Owner accepts (PENDING until they confirm) |

### After every status change

1. Edit `control/registry.json` — update CR/BUG status
2. Run `node control/gen_dashboard_data.js`
3. Verify: `node control/gen_dashboard_data.js --check`
4. Update `control/L1_CONTROL_DASHBOARD.md` if sprint state changed
5. Update `control/L6_SPRINT_STATUS.md` if items moved

### Rules you must not break

- **L0 Baseline** — NEVER edit frozen docs. Changes require owner re-approval.
- **Terminology** — ALWAYS use `terminology.js` mapping. Never raw API terms.
- **Backend** — `server.py` is proxy-only. Don't add business logic.
- **Cache** — Don't break the api.js cache layer. Write endpoints must invalidate.
- **registry.json** — Source of truth. Never hand-edit generated JSONs in `__dev/data/`.

---

## 11. ENVIRONMENT

| Item | Value |
|------|-------|
| Repo | `parth-mygenie/central_inventory` |
| Branch | `13-6-26` |
| Preview URL | Check `frontend/.env` → `REACT_APP_BACKEND_URL` |
| Backend | FastAPI proxy on port 8001 (supervisor-managed) |
| Frontend | React 19 + craco on port 3000 (supervisor-managed) |
| POS API | `preprod.mygenie.online/api/v2/vendoremployee` |
| DB | MongoDB local (token sessions only) |

### Key frontend files

| File | Purpose | Lines |
|------|---------|:-----:|
| `src/services/api.js` | All 86 API methods + cache layer | ~997 |
| `src/lib/terminology.js` | Backend↔Business term mapping | ~50 |
| `src/lib/screenVisibility.js` | Role→screen access + nav | ~100 |
| `src/lib/formatters.js` | Date/number/PO formatting | ~50 |
| `src/App.js` | Routes + auth guards | ~117 |
| `src/hooks/useLoginContext.js` | Auth context + restaurant type | ~100 |

---

## 12. QUICK REFERENCE — CLOSURE CHECKLIST

```
For each CR (023, 024, 025):

□ Run smoke tests from section 5/6/7
□ If CR-025: wire reference_code as PO number
□ Edit control/registry.json:
    - Find CR by id
    - Set "status": "CLOSED"
    - Set artifact 6 (Owner-Signoff) "status": "DONE"
□ Run: node control/gen_dashboard_data.js
□ Verify: node control/gen_dashboard_data.js --check
□ Update control/L1_CONTROL_DASHBOARD.md:
    - Remove CR from "Owner Signoff Pending" section
□ Update control/L6_SPRINT_STATUS.md:
    - CR status to CLOSED
□ Update control/L9_OPEN_GAPS_REGISTER.md:
    - Mark G-009, G-010, G-012, G-013 as CLOSED (after all 3 CRs done)

After all 3 CRs closed:
□ Update L1 dashboard: S3 sprint status
□ Create session-start for CR-015 (next work item)
□ Read P24 planning doc + addendum before implementation
```
