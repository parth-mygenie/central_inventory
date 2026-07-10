# Intelligent UI Freeze — Phase 7: Final Freeze Document
# Implementation-Ready Specification

> **Date:** 2026-05-31
> **Status:** FROZEN — Owner approved all 24 screens through Phase 4 + Phase 6 QA
> **Version:** 1.0
> **Rule:** This document is the implementation contract. Changes require owner re-approval.

---

## 1. SCOPE

Convert 24 existing Central Inventory screens from crude functional UI into intelligent operational interfaces. All intelligence is frontend-side. Backend is proxy-only (unchanged). 5 backend gaps registered for parallel backend work.

**Screens:** 24 (+ 6 modals)
**Previews:** 9 HTML files at `/__dev/previews/`
**New hooks needed:** 1 (`useStockIntelligence`)
**New components needed:** ~5 shared intelligence components
**Existing components modified:** 24
**Backend changes:** None (proxy layer unchanged). 5 gaps for POS backend team.

---

## 2. DESIGN SYSTEM LOCKED

| Decision | Value |
|----------|-------|
| **Color palette** | Red (problem) + Amber (caution) + Neutral gray (everything else). 3 colors max. |
| **Font** | System font stack (existing). Monospace for quantities. |
| **Layout** | Web-first. Sidebar + content. Mobile-compatible with limited features. |
| **PO number** | `PO-XXXX` placeholder until G-013 resolved. Internal DB IDs hidden from UI. |
| **Terminology** | Always business terms via `terminology.js`. Never raw API terms. |

---

## 3. IMPLEMENTATION PLAN — BY SPRINT

### Sprint A: Foundation Intelligence (Read-Only Screens)
**Goal:** Establish the intelligence layer users see first. No write changes.
**Estimated effort:** 3-4 days

| # | Screen | File | Intelligence Added | APIs Used | New? |
|---|--------|------|--------------------|-----------|:----:|
| A-1 | Operations Hub | `OperationsHub.jsx` | Next Best Actions, Priority KPIs with context, Store Health Grid, Your Stock Health (5 metrics), Today's Activity feed, "Your Latest Request" card (non-Central), Cross-item Expiry Scan | `getPendingQueues`, `getStockInventory`, `getTransferHistory`, `getHierarchyDetail` (per child) | Modified |
| A-2 | Stock Inventory Summary | `StockInventorySummary.jsx` | Expiry Risk column, Pending In/Out column, Days of Cover column, "Expiring Soon" stat card, "Pending Incoming" stat card, Export CSV | `getStockInventory` (existing), `getPendingQueues` (for pending), `getStockDetail` (for expiry per item) | Modified |
| A-3 | Stock Detail Panel | `StockDetailPanel.jsx` | "Dispatch first" FEFO badge, expired batch "Record Wastage" action, % of Total per batch, consumption context (avg daily, 7d, days of cover), reorder suggestion | `getStockDetail` (existing), `getDailyConsumptionReport` | Modified |
| A-4 | History & Ledger | `HistoryLedger.jsx` | Movement type badges (Transfer In/Out, Adjustment, Wastage), PO reference column, signed qty (+/-), From/To with store type, reason column, Export CSV | `getTransferHistory` (existing) | Modified |
| A-5 | Status Timeline | `StatusTimeline.jsx` | Relative timestamps per step, duration between steps, total lifecycle, stale detection | Existing transfer data | Modified |

**New shared component needed:**
- `StockIntelligenceBar.jsx` — reusable stock health strip (total, low, expiring, expired, pending)

**New hook needed:**
- `useStockIntelligence.js` — computes: low stock items, days-of-cover per item, expiring batches, pending in/out from queue data. Shared across A1, D1, B1, B5.

---

### Sprint B: Transfer Flow Intelligence (Write Screens)
**Goal:** Intelligence on all transfer lifecycle screens.
**Estimated effort:** 5-6 days

| # | Screen | File | Intelligence Added | APIs Needed (extra) |
|---|--------|------|--------------------|---------------------|
| B-1 | Request Stock | `RequestStockForm.jsx` | Intelligent PO (default tab): auto-detect low-stock items, pre-populate, gap-to-min + consumption suggestion, category grouping. Manual tab retained. Own stock visibility, source availability, duplicate request warning, qty validation summary | `getStockInventory` (own stock), `getDailyConsumptionReport` (consumption) — both on mount |
| B-2 | Pending Queues | `PendingQueues.jsx` | Card-based approval inbox (replace table), item-level per card, requester stock in brackets, fulfillment verdict, store health strip, age badges, quick-action buttons, sort by age | `getTransferDetails` (batch per approval), `getHierarchyDetail` (per requester), `getStockInventory` (own stock) |
| B-3 | Transfer Detail | `TransferDetail.jsx` | Requester Store Snapshot (full inventory health table), approval impact summary card, dual stock context (your + requester's), post-action projection, action explanations, disabled action explanation, timeline enhancement | `getHierarchyDetail` (requester store), `getSourceOptions` (per line for impact) |
| B-4 | Direct Dispatch | `DirectDispatchForm.jsx` | Destination needs auto-detect (default), destination health strip, FEFO segment badges, source post-dispatch projection, duplicate dispatch warning, PO auto-gen note | `getHierarchyDetail` (destination), `getTransferHistory` (for duplicate check) |
| B-5 | Source Selector | `SourceSelector.jsx` | FEFO priority badge, near-expiry warning, expired block (greyed out), remaining after selection | Existing `getSourceOptions` data — frontend enhancement only |
| B-6 | Receive Dialog | `ReceiveDialog.jsx` | Time-since-dispatch, request-vs-dispatch badge, dispatched vs expected comparison, discrepancy highlight, post-receive projection, resolution explanation, partial receive summary | Existing transfer data + `getStockInventory` (for projection) |
| B-7 | Approve Dialog | `ApproveWaveDialog.jsx` | FEFO expiry badge, auto-select FEFO, over-approve warning, approve-all shortcut, segment exhaustion alert, hold policy explanation | Existing `getSourceOptions` data |
| B-8 | Dispute Resolution | `DisputeResolutionDialog.jsx` | Issue summary display, Accept vs Reject impact cards, note guidance | Existing transfer data |
| B-9 | Post-Submit Confirmation | NEW component | Success card: "PO-XXXX submitted — 3 items" with "View Transfer" link | API response data |

**New shared component:**
- `PostSubmitConfirmation.jsx` — reusable success card for all write actions
- `StoreHealthStrip.jsx` — compact store health display (X out, Y low, Z adequate)
- `FulfillmentVerdict.jsx` — "Can fulfill" / "Partial" / "Can't fulfill" badge

---

### Sprint C: Operations + Configuration Intelligence
**Goal:** Intelligence on stock operations and config screens.
**Estimated effort:** 4-5 days

| # | Screen | File | Intelligence Added |
|---|--------|------|--------------------|
| C-1 | Stock Adjustment | `StockAdjustmentForm.jsx` | Current stock context, after-adjustment projection, FEFO segment pre-selected, impact preview, undo guidance |
| C-2 | Wastage Entry | `WastageEntryForm.jsx` | Wastage-this-month context, anomaly detection, after-wastage projection, undo guidance |
| C-3 | Procurement | `AddStockPurchaseForm.jsx` | 3-mode: Upload Invoice tab (AI/OCR — G-014), Manual Entry with Excel upload (G-015), row-by-row. Item matching, price comparison, review-approve flow, download template, post-submit confirmation |
| C-4 | Wastage Report | `WastageReport.jsx` | Top wasted items ranking, trend vs average, reason breakdown, drill-down to records, Export CSV |
| C-5 | Operational Settings | `OperationalSettings.jsx` | Impact badges per setting, "Affects all stores" warning |
| C-6 | Vendor Management | `VendorManagement.jsx` | Last purchase date, inactive vendor detection, avg order value |
| C-7 | Ingredient Catalogue | `IngredientCatalogue.jsx` | "Used in X recipes" cross-ref, "Pushed to X stores" status, unmapped item highlight |
| C-8 | Product Catalogue | `ProductCatalogue.jsx` | Same pattern as C-7 |
| C-9 | Recipe Catalogue | `RecipeCatalogue.jsx` | Same pattern |
| C-10 | Addon Recipe Catalogue | `AddonRecipeCatalogue.jsx` | Same pattern |
| C-11 | Consumption Report | `DailyConsumptionReport.jsx` | Consumption vs current stock, days-of-cover, trend vs average |
| C-12 | Hierarchy Management | `HierarchyManagement.jsx` | Last push date, push status (synced/stale), items-behind count |

---

## 4. NEW FILES TO CREATE

| File | Type | Purpose |
|------|------|---------|
| `hooks/useStockIntelligence.js` | Hook | Shared intelligence computations: low stock, days-of-cover, expiry scan, pending in/out |
| `components/common/PostSubmitConfirmation.jsx` | Component | Reusable success card for all write actions |
| `components/common/StoreHealthStrip.jsx` | Component | Compact "X out · Y low · Z adequate" display |
| `components/common/FulfillmentVerdict.jsx` | Component | "Can fulfill" / "Partial" / "Can't fulfill" badge |
| `components/common/ExpiryBadge.jsx` | Component | Extract from StockDetailPanel, reuse across screens |
| `components/common/AgeBadge.jsx` | Component | "2h ago" / "3 days ago" with color escalation |

---

## 5. EXISTING FILES MODIFIED

| File | Lines Now | Estimated After | Change Type |
|------|:---------:|:---------------:|-------------|
| `OperationsHub.jsx` | 331 | ~550 | Major rewrite — add all intelligence sections |
| `PendingQueues.jsx` | 269 | ~500 | Major rewrite — table → card-based inbox |
| `TransferDetail.jsx` | 658 | ~850 | Add store snapshot, impact summary, projections |
| `RequestStockForm.jsx` | 387 | ~550 | Add Intelligent PO tab, own stock, suggestions |
| `DirectDispatchForm.jsx` | 197 | ~400 | Add destination needs, health strip, projections |
| `StockInventorySummary.jsx` | 374 | ~500 | Add expiry, pending, days-of-cover columns |
| `StockDetailPanel.jsx` | 608 | ~700 | Add FEFO badges, consumption context |
| `HistoryLedger.jsx` | 774 | ~850 | Add movement badges, PO ref, export |
| `SourceSelector.jsx` | 193 | ~250 | Add FEFO badge, expiry warning, expired block |
| `ReceiveDialog.jsx` | 197 | ~300 | Add dispatch time, request badge, projections |
| `AddStockPurchaseForm.jsx` | 346 | ~650 | Add Upload Invoice tab, Excel upload, review flow |
| `StockAdjustmentForm.jsx` | 260 | ~320 | Add stock context, projection, undo guidance |
| `WastageEntryForm.jsx` | 220 | ~280 | Add anomaly detection, undo guidance |
| `WastageReport.jsx` | 412 | ~500 | Add top items, trend, drill-down, export |
| `StatusTimeline.jsx` | 268 | ~320 | Add relative times, durations, stale detection |
| `ApproveWaveDialog.jsx` | 247 | ~320 | Add FEFO badges, approve-all shortcut |
| `DisputeResolutionDialog.jsx` | 128 | ~180 | Add impact cards, summary display |
| `OperationalSettings.jsx` | 218 | ~260 | Add impact badges |
| `VendorManagement.jsx` | 197 | ~250 | Add last purchase, inactive detection |
| `IngredientCatalogue.jsx` | 280 | ~330 | Add usage cross-ref, push status |
| `ProductCatalogue.jsx` | 346 | ~390 | Same pattern |
| `RecipeCatalogue.jsx` | 286 | ~330 | Same pattern |
| `DailyConsumptionReport.jsx` | 642 | ~700 | Add stock comparison, days-of-cover |
| `HierarchyManagement.jsx` | 680 | ~740 | Add push status, stale detection |

**Total: ~9,800 lines now → ~12,500 estimated after (~28% growth)**

---

## 6. API CALLS PER SCREEN (Implementation Reference)

| Screen | APIs Called | Extra Calls (new for intelligence) |
|--------|-----------|-----------------------------------|
| **A1 Hub** | getPendingQueues, getStockInventory, getTransferHistory | + getHierarchyDetail per child store (batch) |
| **B1 Request** | requestSources, requestCatalog | + getStockInventory (own stock, on mount) |
| **B2 Queues** | getPendingQueues, getTransferHistory | + getTransferDetails per approval (batch), + getHierarchyDetail per requester (batch) |
| **B3 Detail** | getTransferDetails, getTransferHistory | + getHierarchyDetail (requester store) |
| **B5 Dispatch** | getHierarchySummary, getInventoryMaster | + getHierarchyDetail (destination), + getTransferHistory (duplicate check) |
| **D1 Inventory** | getStockInventory | + getPendingQueues (pending in/out) |
| **D2 Detail** | getStockDetail | + getDailyConsumptionReport (consumption context) |
| **C3 Procurement** | getInventoryMaster, getVendors | + (G-014: invoice upload endpoint — future) |
| All others | Existing calls only | Frontend-only intelligence additions |

---

## 7. BACKEND GAPS (Parallel Track for POS Backend Team)

| Gap | Priority | Blocks | Workaround |
|-----|:--------:|--------|------------|
| **G-013** PO number | **P0** | User-facing transfer identifiers on ALL screens | PO-XXXX placeholder. Internal IDs hidden. |
| **G-012** Catalog category | P1 | B1 manual request mode category grouping | Workaround: use own stock inventory category data |
| **G-014** Invoice OCR endpoint | P1 | C3 Upload Invoice tab | Tab disabled until endpoint ready |
| **G-015** Excel parsing | P2 | C3 Excel upload | Can use frontend-only SheetJS library |
| **G-016** Invoice storage | P2 | C3 duplicate invoice detection | Skip duplicate check until endpoint ready |

---

## 8. ACCEPTANCE CRITERIA

Each screen is "done" when:
1. All intelligence elements from the approved preview are implemented
2. 3-color palette enforced (no new colors)
3. PO-XXXX placeholder renders correctly
4. Role-gating works (Central/Master/Outlet see correct content)
5. Loading/error/empty states have contextual intelligence
6. Post-action confirmation shows for all write operations
7. No raw backend terminology displayed
8. Mobile-responsive (limited features OK, no broken layout)

---

## 9. PREVIEW INDEX (Source of Truth for Implementation)

| Preview | Screens | URL |
|---------|---------|-----|
| `A1_operations_hub.html` | A1 Hub + Post-submit confirmation + Latest Request + Expiry Scan | `/__dev/previews/A1_operations_hub.html` |
| `B1_request_stock.html` | B1 Intelligent PO | `/__dev/previews/B1_request_stock.html` |
| `B2_pending_queues.html` | B2 Intelligent Approval Inbox | `/__dev/previews/B2_pending_queues.html` |
| `B3_transfer_detail.html` | B3 Store Snapshot + Impact | `/__dev/previews/B3_transfer_detail.html` |
| `B5_direct_dispatch.html` | B5 Destination Needs | `/__dev/previews/B5_direct_dispatch.html` |
| `B6_B7_B8_modals.html` | B6 Source + B7 Receive + B8 Dispute | `/__dev/previews/B6_B7_B8_modals.html` |
| `C_stock_operations.html` | C1 Adj + C2 Waste + C3 Procurement + C4 Report | `/__dev/previews/C_stock_operations.html` |
| `D_stock_visibility.html` | D1 Inventory + D2 Detail + D3 History + D4 Timeline | `/__dev/previews/D_stock_visibility.html` |
| `E_configuration.html` | E1-E8 all config screens | `/__dev/previews/E_configuration.html` |

---

## 10. OWNER APPROVAL RECORD

| Date | Item | Decision | By |
|------|------|----------|:--:|
| 2026-05-31 | Flow B — 7 screens (B1-B8) | APPROVED (screen-by-screen) | Owner |
| 2026-05-31 | Flow C — 4 screens (C1-C4) | APPROVED | Owner |
| 2026-05-31 | Flow D — 4 screens (D1-D4) | APPROVED | Owner |
| 2026-05-31 | Flow E — 8 screens (E1-E8) | APPROVED | Owner |
| 2026-05-31 | Flow A — 1 screen (A1) | APPROVED | Owner |
| 2026-05-31 | Phase 6 QA — 8 gaps fixed | APPROVED | Owner |
| 2026-05-31 | CR-020 Daily Digest (SMS/WhatsApp/Email) | PROPOSED for future phase | Owner |

**Total: 24/24 screens approved. 0 rejected. 0 deferred.**

---

## 11. FUTURE (NOT IN THIS FREEZE)

| Item | CR | Status |
|------|:--:|--------|
| Daily Intelligence Digest (SMS/WhatsApp/Email) | CR-020 | PROPOSED — next phase |
| Multi-store comparison view | CR-016 | PLANNED |
| Smart Dispatch suggestions | CR-017 | PROPOSED |
| FEFO Batch Stock Detail panel | CR-015 | PLANNED |
| Keyboard shortcuts | — | Defer |
| Print-friendly views | — | Defer |
| Transfer SLA tracking | — | Defer |

---

*This document is FROZEN. Implementation proceeds against this spec. Any changes require owner re-approval and a new version of this document.*
