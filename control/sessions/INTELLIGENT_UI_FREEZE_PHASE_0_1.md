# Intelligent UI Freeze — Phase 0 + Phase 1
# Current State Audit & Screen Inventory

> **Agent:** Central Inventory End-to-End Intelligent UI Freeze Agent
> **Date:** 2026-05-31
> **Status:** Phase 0+1 Complete. Awaiting owner review before Phase 2.
> **Scope:** All Central Inventory UI screens (Slice 1-5, P17-P23)
> **Constraint:** Planning only. Zero code changes. Zero DB mutations.

---

## PHASE 0 — CURRENT STATE AUDIT

### Architecture Summary

| Layer | Reality |
|-------|---------|
| **Backend** | Proxy-only (177 lines). Forwards to `preprod.mygenie.online`. Zero local business logic. |
| **Frontend** | React 19 + Tailwind + Radix UI. 34 JSX components, 8 hooks, 6 lib modules, 86 API methods. |
| **Auth** | POS vendor employee login. Token-bound to 1 restaurant. 3 roles: Central (`master`), Master (`central`), Outlet (`franchise`). |
| **Terminology** | INVERTED. Backend `master` = Business Central. Mapping adapter is frozen. |
| **Data** | All from live POS API. No local seed data. No local business data in MongoDB. |

### Codebase Dimensions

| Category | Count | Total Lines |
|----------|:-----:|:-----------:|
| Screen components (`.jsx`) | 34 | 9,816 |
| Hooks | 8 | 637 |
| Lib modules | 6 | 578 |
| API service layer | 1 | 880 (86 methods) |
| Routes in App.js | 22 | — |
| **Total frontend** | — | **~11,900** |

### Role-Permission Matrix (Current Code — `screenVisibility.js` + `transferActions.js`)

| Capability | Central (master) | Master (central) | Outlet (franchise) |
|-----------|:----------------:|:-----------------:|:------------------:|
| View all stores | YES | Own + siblings + children | Self only |
| Dispatch stock | YES | YES (to own children) | NO |
| Approve transfers | YES | YES (child requests) | NO |
| Request stock | NO (top level) | YES (from Central) | YES (from parent) |
| Receive stock | YES | YES | YES |
| Cancel transfer | YES (own dispatches) | YES (own dispatches) | NO |
| Report issue (post-dispatch) | YES | YES | YES |
| Adjust stock | YES (Central only) | NO | NO |
| Record wastage | YES | YES | YES |
| Manage vendors | YES | YES | NO |
| Procurement/add stock | YES | YES | NO |
| Catalogue CRUD | YES (Central only) | NO | NO |
| Operational settings | YES (Central only) | NO | NO |
| Hierarchy management | YES | YES | NO |

### API Capabilities (86 Methods — Verified from `api.js`)

| Category | Methods | Write? | Notes |
|----------|:-------:|:------:|-------|
| Auth | 1 | YES | login via POS proxy |
| Hierarchy/Reporting | 2 | NO | summary + detail |
| Pending Queues | 1 | NO | 3 queue types |
| Transfer CRUD | 4 | NO | details, history, source-options, inventory-master |
| Transfer Writes | 11 | YES | initiate, request (3-step), approve (full+partial), cancel-remainder, amend, withdraw, modification, reject, dispatch, receive, cancel |
| Dispute Resolution | 1 | YES | resolve-dispute |
| Stock Adjustment | 2 | YES | increase + decrease |
| Wastage | 3 | YES + NO | record, reasons, report |
| Stock Inventory | 2 | NO | summary + detail (P24) |
| Settings | 2 | YES | get + update |
| Vendors | 4 | YES | CRUD |
| Procurement | 1 | YES | add-stock-purchase |
| Catalogue (Ingredients) | 5 | YES | categories CRUD + add/update items |
| Catalogue (Products) | 9 | YES | foods, categories, addons — full CRUD |
| Catalogue (Recipes) | 5 | YES | recipes + sub-recipes |
| Catalogue (Addon-recipes) | 6 | YES | full CRUD |
| Consumption Report | 1 | NO | daily report |
| Hierarchy Management | 6 | YES | list, create, push-form, push, history, create-metadata |

### Known Backend Gaps (from L9 — Cannot Fix in Frontend)

| Gap | Impact on Intelligence | Workaround Possible? |
|-----|----------------------|:--------------------:|
| G-001: No adjustment history API | Cannot show adjustment trail | NO — backend needed |
| G-002: No before/after qty in transfer API | Ledger shows "—" for balance changes | NO |
| G-003: No user name resolution | Actors shown as numeric IDs | NO |
| G-004: History API missing restaurant_type | No store type badges in history | NO |
| G-005: No dedicated ledger API | N+1 calls for stock movements | NO |
| G-006: No stock return flow API | Cannot implement return workflow | NO |
| G-009: No partial dispatch | Cannot dispatch subset of approved lines | NO |
| G-010: No soft stock reservation | Approved qty not protected from concurrent dispatch | NO |

### Known Bugs Affecting UI Intelligence

| Bug | Severity | UI Impact |
|-----|:--------:|-----------|
| BUG-001 | LOW | Stale "read-only" banner still visible |
| BUG-003 | MEDIUM | Ledger loads slowly (N+1 API calls) |
| BUG-004 | MEDIUM | Before/after quantities always "—" |
| BUG-005 | LOW | Actor names are numeric IDs |
| BUG-007 | MEDIUM | Stock adjustments not traceable in history |
| BUG-010 | MEDIUM | add-stock increase payload may need runtime tweaking |

### Current Intelligence Level: **ZERO**

The existing UI is functional but provides **no operational intelligence**:
- No smart badges or priority indicators
- No stock risk warnings (low stock, overstock, expiry)
- No in-transit or reserved quantity visibility
- No approval impact summaries
- No duplicate/stale request detection
- No recommended quantities
- No validation guidance before submit
- No disabled-state explanations
- No contextual empty states (generic "no data")
- No role-based next-best-action suggestions
- No exception/anomaly highlighting

---

## PHASE 1 — SCREEN INVENTORY

### Master Screen List (22 screens, grouped by business flow)

---

#### FLOW A: OPERATIONS & NAVIGATION (Entry Points)

| # | Screen | Route | Component | Lines | Slice | Roles |
|---|--------|-------|-----------|:-----:|:-----:|-------|
| A1 | Operations Hub | `/` | `OperationsHub.jsx` | 331 | S1+S2 | All (varies) |
| A2 | Hierarchy Summary | `/hierarchy` | `HierarchySummary.jsx` | 187 | S1 | Central, Master |
| A3 | Store Detail | `/store/:id` | `StoreDetail.jsx` | 293 | S1 | All (scoped) |

**A1 — Operations Hub**
- **Current:** Shows pending queue counts (approval, receive, my requests, ready-to-dispatch), low-stock count, total items count. Quick action buttons for dispatch, request, adjustment, wastage, procurement.
- **Business stage:** Dashboard / entry point
- **User decision:** "What needs my attention right now?"
- **Current gaps:** No urgency indicators. No aging/stale request warnings. No stock risk summary. No exception count. Generic numbers with no context. No "next best action" guidance.

**A2 — Hierarchy Summary**
- **Current:** Lists stores by type (Master/Outlet tabs) with sent/received/transaction counts per date range.
- **Business stage:** Hierarchy overview
- **User decision:** "Which store needs attention? Where should I navigate?"
- **Current gaps:** No stock health indicators per store. No pending action badges per store. No low-stock stores highlight. No overdue receive warnings. Plain list with no intelligence.

**A3 — Store Detail**
- **Current:** Single-store view with stock summary, batch drilldown, and transaction timeline.
- **Business stage:** Store-level stock inspection
- **User decision:** "What's the stock situation at this store?"
- **Current gaps:** No low-stock alerts inline. No expiry warnings. No in-transit quantity. No pending incoming/outgoing. No comparison to other stores. No reorder suggestions.

---

#### FLOW B: TRANSFER LIFECYCLE (Request → Approve → Dispatch → Receive)

| # | Screen | Route | Component | Lines | Slice | Roles |
|---|--------|-------|-----------|:-----:|:-----:|-------|
| B1 | Request Stock | `/request/new` | `RequestStockForm.jsx` | 387 | S4+S5 | Master, Outlet |
| B2 | Pending Queues | `/queues` | `PendingQueues.jsx` | 269 | S2 | All |
| B3 | Transfer Detail | `/transfer/:id` | `TransferDetail.jsx` | 658 | S2+S4 | All |
| B4 | Approve Dialog | (modal) | `ApproveWaveDialog.jsx` | 247 | S4 | Central, Master |
| B5 | Direct Dispatch | `/dispatch/new` | `DirectDispatchForm.jsx` | 197 | S4 | Central, Master |
| B6 | Source Selector | (modal) | `SourceSelector.jsx` | 193 | S5 | Central, Master |
| B7 | Receive Dialog | (modal) | `ReceiveDialog.jsx` | 197 | S4 | All |
| B8 | Dispute Resolution | (modal) | `DisputeResolutionDialog.jsx` | 128 | S4 | Source side |
| B9 | Reason Dialog | (modal) | `ReasonDialog.jsx` | — | S4 | All |
| B10 | Confirm Action | (modal) | `ConfirmActionDialog.jsx` | — | S4 | All |

**B1 — Request Stock Form**
- **Current:** 3-step flow: select source → browse catalog → add items with quantities. Submit creates transfer with `requested` status.
- **Business stage:** Request initiation
- **User decision:** "What do I need, how much, from which source?"
- **Current gaps:** No current stock visibility while requesting. No "you already have X in stock" warning. No pending incoming visibility. No duplicate request detection. No suggested quantities based on consumption. No last-purchase-price visibility. No source stock availability check before submit. No mandatory field validation guidance.

**B2 — Pending Queues**
- **Current:** 4 tabs — Approval Pending, Receive Pending, My Requests, Ready to Dispatch. Table rows with status badge, timestamp, item count.
- **Business stage:** Operational inbox
- **User decision:** "What's urgent? What should I action first?"
- **Current gaps:** No age/stale indicators (request sitting for 3 days). No priority sorting. No urgency badges. No source-stock-risk warnings on approval items. No "destination critically low" signals. No fast-action buttons (must navigate to detail first). All items look equal — no exception highlighting.

**B3 — Transfer Detail**
- **Current:** Full transfer view with header (from/to, status, type), line items with quantities, status timeline, and contextual action buttons (approve/reject/dispatch/receive/cancel/amend/withdraw/modify).
- **Business stage:** Central action screen for all transfer lifecycle stages
- **User decision:** Depends on status — approve? dispatch? receive? reject?
- **Current gaps:** No approval impact summary ("source will drop to X after dispatch"). No destination need context ("destination has 0 of this item"). No line-level risk badges. No source stock availability inline. No before/after projection. No recommended action. No stale-transfer warning. No audit trail summary.

**B5 — Direct Dispatch Form**
- **Current:** Select destination, pick items, enter quantities, select source segments, submit.
- **Business stage:** Dispatch initiation
- **User decision:** "How much to send, from which batch/segment?"
- **Current gaps:** No destination stock visibility (how much they already have). No "destination requested X" context. No FEFO suggestion (which batch to pick first). No source post-dispatch projection. No quantity validation against available stock before submit. No duplicate dispatch detection.

**B6 — Source Selector**
- **Current:** Shows available segments with batch, expiry, quantity, source origin. User picks which segment to dispatch from.
- **Business stage:** Segment selection during dispatch
- **User decision:** "Which batch should I dispatch from?"
- **Current gaps:** No FEFO highlighting (soonest expiry not visually prioritized). No near-expiry warning badge. No "recommended" badge on optimal segment. No quantity remaining after selection preview.

**B7 — Receive Dialog**
- **Current:** Full receive or per-line partial receive with accepted/rejected qty. Resolution type for rejected items.
- **Business stage:** Stock receipt
- **User decision:** "Accept all? Partial? What resolution for rejected items?"
- **Current gaps:** No dispatched-vs-expected comparison. No damage guidance. No photo attachment. No partial receive validation ("accepted + rejected must equal dispatched"). No resolution type explanation. No impact preview ("accepting X will bring your stock to Y").

---

#### FLOW C: STOCK OPERATIONS (Adjustment, Wastage, Procurement)

| # | Screen | Route | Component | Lines | Slice | Roles |
|---|--------|-------|-----------|:-----:|:-----:|-------|
| C1 | Stock Adjustment | `/adjustment/new` | `StockAdjustmentForm.jsx` | 260 | S5 | Central only |
| C2 | Wastage Entry | `/wastage/new` | `WastageEntryForm.jsx` | 220 | S5 | All |
| C3 | Add Stock/Procurement | `/procurement/new` | `AddStockPurchaseForm.jsx` | 346 | P19 | Central, Master |
| C4 | Wastage Report | `/wastage/report` | `WastageReport.jsx` | 412 | S5 | All |

**C1 — Stock Adjustment Form**
- **Current:** Select item, choose increase/decrease, enter quantity, select segment (for decrease), enter reason, submit.
- **Business stage:** Manual stock correction (Central only)
- **User decision:** "What to correct, by how much, why?"
- **Current gaps:** No current stock display before adjusting. No adjustment history (BUG-007). No "this will make stock negative" warning. No reason category guidance. No confirmation with impact preview. No audit trail link.

**C2 — Wastage Entry Form**
- **Current:** Select item, enter quantity, select segment, choose reason (from predefined categories), submit.
- **Business stage:** Spoilage/damage recording
- **User decision:** "What was wasted, how much, why?"
- **Current gaps:** No current stock display. No historical wastage context ("you've wasted X of this item this month"). No segment expiry context. No post-wastage stock projection. No photo/evidence attachment.

**C3 — Add Stock / Procurement**
- **Current:** Select item, enter quantity, unit, batch (optional), expiry (optional), vendor, price. Submit adds stock.
- **Business stage:** Stock replenishment
- **User decision:** "What to add, from which vendor, at what price?"
- **Current gaps:** No last purchase price display. No vendor price comparison. No low-stock context ("you're adding this because stock is at X"). No duplicate batch warning. No expiry validation guidance. No quantity suggestion based on consumption rate.

**C4 — Wastage Report**
- **Current:** Date range filter, wastage records table with item, quantity, reason, timestamp. Summary totals.
- **Business stage:** Wastage analysis
- **User decision:** "Where is wastage happening? What patterns?"
- **Current gaps:** No trend visualization. No anomaly detection ("wastage of X is 300% above normal"). No comparison across stores. No top-wasted-items ranking. No cost impact display.

---

#### FLOW D: STOCK VISIBILITY (Inventory, Detail, Ledger)

| # | Screen | Route | Component | Lines | Slice | Roles |
|---|--------|-------|-----------|:-----:|:-----:|-------|
| D1 | Stock Inventory | `/inventory` | `StockInventorySummary.jsx` | 374 | P20 | All |
| D2 | Stock Detail | `/inventory/:id` | `StockDetailPanel.jsx` | 608 | P24 | All |
| D3 | History & Ledger | `/history` | `HistoryLedger.jsx` | 774 | S3 | All |
| D4 | Status Timeline | (embedded) | `StatusTimeline.jsx` | 268 | S2 | — |

**D1 — Stock Inventory Summary**
- **Current:** List of all items for current store with quantity, unit, low-stock flag. Search/filter.
- **Business stage:** Stock overview
- **User decision:** "What's my stock level? What's low?"
- **Current gaps:** No overstock detection. No in-transit quantity column. No pending incoming/outgoing. No days-of-stock calculation. No reorder point indicator. No expiry risk column. No cross-store comparison (deferred — CR-016).

**D2 — Stock Detail Panel**
- **Current:** FEFO segment view for single item. Shows summary, segments (batch, expiry, quantity), consumption lines.
- **Business stage:** Item-level deep dive
- **User decision:** "What batches do I have? What's expiring?"
- **Current gaps:** No near-expiry highlighting. No expired segment badge. No segment utilization (% consumed). No movement history for this item. No quick-action (dispatch/adjust/waste from this view).

**D3 — History & Ledger**
- **Current:** Transfer history with date/status filters. Stock movements timeline. Lazy-loads detail per row.
- **Business stage:** Audit/operational review
- **User decision:** "What happened? Who did what?"
- **Current gaps:** No before/after quantities (BUG-004). No actor names (BUG-005). No store type badges (BUG-002). Slow loading (BUG-003). No exception filter ("show only anomalies"). No search by item. No export.

---

#### FLOW E: CONFIGURATION & CATALOGUE

| # | Screen | Route | Component | Lines | Slice | Roles |
|---|--------|-------|-----------|:-----:|:-----:|-------|
| E1 | Operational Settings | `/settings` | `OperationalSettings.jsx` | 218 | P17 | Central only |
| E2 | Vendor Management | `/vendors` | `VendorManagement.jsx` | 197 | P18 | Central, Master |
| E3 | Ingredient Catalogue | `/catalogue/ingredients` | `IngredientCatalogue.jsx` | 280 | P21 | Central only |
| E4 | Product Catalogue | `/catalogue/products` | `ProductCatalogue.jsx` | 346 | P21 | Central only |
| E5 | Recipe Catalogue | `/catalogue/recipes` | `RecipeCatalogue.jsx` | 286 | P21 | Central only |
| E6 | Addon Recipe Catalogue | `/catalogue/addon-recipes` | `AddonRecipeCatalogue.jsx` | 170 | P21 | Central only |
| E7 | Daily Consumption Report | `/reports/consumption` | `DailyConsumptionReport.jsx` | 642 | P22 | All |
| E8 | Hierarchy Management | `/hierarchy/manage` | `HierarchyManagement.jsx` | 680 | P23 | Central, Master |

**E1-E6 — Configuration screens** are admin/setup screens. Intelligence opportunities are lower-priority but include: duplicate item detection, unused ingredient flagging, recipe cost calculation, vendor performance indicators.

**E7 — Daily Consumption Report**
- **Current:** Date range consumption data with per-restaurant breakdown.
- **Business stage:** Consumption analysis
- **Current gaps:** No consumption vs. stock comparison. No forecast ("at this rate, stock runs out in X days"). No anomaly flagging.

**E8 — Hierarchy Management**
- **Current:** Create stores, view children, push bundles.
- **Business stage:** Store setup
- **Current gaps:** No push status tracking. No "last pushed" indicator per store. No sync status.

---

## SUMMARY STATISTICS

| Metric | Value |
|--------|:-----:|
| Total screens audited | 22 (+6 modals) |
| Screens with zero intelligence | **22/22** |
| Total intelligence gaps identified | **~120** |
| Gaps feasible with frontend-only changes | ~40% (estimated) |
| Gaps requiring existing API data | ~30% (estimated) |
| Gaps blocked by backend gaps (G-001 to G-011) | ~20% (estimated) |
| Gaps that should be deferred | ~10% (estimated) |

---

## PHASE 0+1 COMPLETE — OWNER DECISIONS NEEDED

### Before Phase 2 (Intelligence Brainstorming):

1. **Which flow to start with?** I recommend starting with **Flow B (Transfer Lifecycle)** since it's the core operational flow and has the most intelligence potential. Alternatives:
   - a) Flow B — Transfer Lifecycle (request → approve → dispatch → receive)
   - b) Flow A — Operations Hub (entry point, affects all roles)
   - c) Flow D — Stock Visibility (inventory, ledger, detail)
   - d) Your choice

2. **Intelligence depth?**
   - a) Full depth — brainstorm everything, then prioritize
   - b) Must-have only — focus on mistake prevention + speed improvement
   - c) Phased — must-haves first, nice-to-haves as separate pass

3. **Confirm hybrid grouping is OK?** Phase 2 will proceed screen-by-screen within each business flow, noting slice origin.

---

## FILES INSPECTED

| File | Purpose |
|------|---------|
| `control/registry.json` | 33 items (18 CR + 15 BUG) |
| `control/L0-L9` | All 10 governance layers |
| `control/AGENT_PROMPT.md`, `CODE_GATE_POLICY.md` | Process rules |
| `frontend/src/App.js` | 22 routes |
| `frontend/src/services/api.js` | 86 API methods (880 lines) |
| `frontend/src/lib/terminology.js` | Terminology adapter (170 lines) |
| `frontend/src/lib/screenVisibility.js` | Screen access matrix (188 lines) |
| `frontend/src/lib/transferActions.js` | Transfer action matrix (119 lines) |
| `frontend/src/lib/reasonCategories.js` | Adjustment + wastage reasons |
| `frontend/src/lib/formatters.js` | Date/number formatting |
| `frontend/src/hooks/useLoginContext.js` | Auth + role context (191 lines) |
| `frontend/src/hooks/*.js` | All 8 hooks |
| `frontend/src/components/central-inventory/*.jsx` | All 34 components (headers) |
| Key components read in full: OperationsHub, PendingQueues, TransferDetail, DirectDispatchForm, RequestStockForm, SourceSelector, ReceiveDialog |

---

*End of Phase 0 + Phase 1. Awaiting owner direction for Phase 2.*
