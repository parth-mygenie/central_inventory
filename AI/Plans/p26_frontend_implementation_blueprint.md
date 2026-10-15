# P26 Frontend Deep-Dive — Implementation Blueprint

> **Date:** 10 June 2026
> **Scope:** Analysis only — no code modifications
> **Input:** Backend contract spec + smoke validation results + full codebase scan
> **Output:** Screen impact matrix, component checklist, risk register, rollout plan

---

## 1. SCREEN IMPACT MATRIX

### 1.1 Transfer Workflow Screens

| Screen | Route | Component | P26 Impact | Priority |
|--------|-------|-----------|:----------:|:--------:|
| **History & Ledger** | `/history` | `HistoryLedger.jsx` | 🔴 HIGH — `t.id` resolution, `formatPO→reference_code`, `items_count`, ledger fetch, search, CSV | P0 |
| **Operations Hub** | `/` | `OperationsHub.jsx` | 🔴 HIGH — todayActivity `t.id`, `formatPO→reference_code`, latestRequest navigation | P0 |
| **Pending Queues** | `/queues` | `PendingQueues.jsx` | 🟡 LOW — already has `id‖transfer_id` fallback; needs `items_count‖line_count` | P1 |
| **Transfer Detail** | `/transfer/:id` | `TransferDetail.jsx` | 🟢 UX ENHANCE — show `reference_code` + `line_reference`; `data.id` works; action toast text | P1 |
| **Request Stock** | `/request/new` | `RequestStockForm.jsx` | 🟡 MEDIUM — G-012 category grouping opportunity; `reference_code` on success nav | P1 |
| **Direct Dispatch** | `/dispatch/new` | `DirectDispatchForm.jsx` | 🟢 LOW — success nav already handles `transfer_id‖id`; show `reference_code` post-submit | P2 |
| **Store Detail** | `/store/:id` | `StoreDetail.jsx` | 🟢 LOW — transactions use `txn.transfer_id` (correct); can add `reference_code` display | P2 |

### 1.2 Dialog/Modal Screens

| Dialog | Component | P26 Impact | Priority |
|--------|-----------|:----------:|:--------:|
| **Receive Dialog** | `ReceiveDialog.jsx` | 🟢 UX — title uses `formatPO(transfer?.id)`; could show `reference_code` | P2 |
| **Approve Wave Dialog** | `ApproveWaveDialog.jsx` | 🟢 UX — title uses `formatPO(transfer?.id)` | P2 |
| **Dispute Resolution** | `DisputeResolutionDialog.jsx` | 🟢 UX — title uses `formatPO(transfer?.id)` | P2 |
| **Confirm Action Dialog** | `ConfirmActionDialog.jsx` | 🟢 NONE — generic; receives title from caller | — |
| **Reason Dialog** | `ReasonDialog.jsx` | 🟢 NONE — generic | — |
| **Post-Submit Confirmation** | `PostSubmitConfirmation.jsx` | 🟡 UX — uses `formatPO(transferId)`; should show `reference_code` | P1 |

### 1.3 Non-Transfer Screens (No P26 Impact)

| Screen | Route | Component | Impact |
|--------|-------|-----------|:------:|
| Stock Inventory Summary | `/inventory` | `StockInventorySummary.jsx` | ⚪ None (uses `formatPO` for unrelated purpose — stock item IDs, not transfers) |
| Stock Detail Panel | `/inventory/:id` | `StockDetailPanel.jsx` | ⚪ None |
| Hierarchy Summary | `/hierarchy` | `HierarchySummary.jsx` | ⚪ None |
| Hierarchy Management | `/hierarchy/manage` | `HierarchyManagement.jsx` | ⚪ None |
| Stock Adjustment | `/adjustment/new` | `StockAdjustmentForm.jsx` | ⚪ None |
| Wastage Entry | `/wastage/new` | `WastageEntryForm.jsx` | ⚪ None |
| Wastage Report | `/wastage/report` | `WastageReport.jsx` | ⚪ None |
| Ingredient Catalogue | `/catalogue/ingredients` | `IngredientCatalogue.jsx` | ⚪ None (uses `category_id` but for stock categories, not transfer categories) |
| Product Catalogue | `/catalogue/products` | `ProductCatalogue.jsx` | ⚪ None |
| Recipe Catalogue | `/catalogue/recipes` | `RecipeCatalogue.jsx` | ⚪ None |
| Addon Recipe Catalogue | `/catalogue/addon-recipes` | `AddonRecipeCatalogue.jsx` | ⚪ None |
| Consumption Report | `/reports/consumption` | `DailyConsumptionReport.jsx` | ⚪ None |
| Vendor Management | `/vendors` | `VendorManagement.jsx` | ⚪ None |
| Add Stock Purchase | `/procurement/new` | `AddStockPurchaseForm.jsx` | ⚪ None |
| Operational Settings | `/settings` | `OperationalSettings.jsx` | ⚪ None |
| Login | `/login` | `LoginPage.jsx` | ⚪ None |

---

## 2. COMPONENT / FILE CHECKLIST

### 2.1 API Layer (`services/api.js`)

| Location | Current Code | Change Type | Detail |
|----------|-------------|:-----------:|--------|
| **`_getTransferHistory` (L352-366)** | Returns raw response | **ADD** normalizer | Map `transfer_id→id`, `line_count→items_count` on every history row. Single fix point for all consumers. |
| **`normalizeTransfer` (L150-158)** | Checks `!raw.id` for shape detection | **REVIEW** | With history now having both `id` and `transfer_id`, condition `!raw.id` is no longer true for history rows — OK since history rows go through `_getTransferHistory`, not `normalizeTransfer`. No change needed. |
| **`_getPendingQueues` (not shown)** | Returns raw response | **ADD** normalizer | Map `line_count→items_count` alias if `items_count` is missing (defensive). |
| **No new API methods needed** | — | — | `reference_code` and `line_reference` arrive passively on existing responses. |

### 2.2 Utility Layer (`lib/`)

| File | Location | Change Type | Detail |
|------|----------|:-----------:|--------|
| **`formatters.js`** L68-73 | `formatPO(transferId)` | **ADD** new function | Add `formatRef(row)` that returns `row.reference_code ?? formatPO(row.id ?? row.transfer_id)`. Keep `formatPO` unchanged for backward compat. |
| **`formatters.js`** | — | **ADD** | `resolveTransferId(row)` = `row.id ?? row.transfer_id ?? null` — centralized ID resolver. |
| **`transferActions.js`** | — | ⚪ None | Action IDs don't change. |
| **`terminology.js`** | — | ⚪ None | No new terms. |
| **`screenVisibility.js`** | — | ⚪ None | No new screens. |
| **`reasonCategories.js`** | — | ⚪ None | |

### 2.3 Hooks

| Hook | File | Change Type | Detail |
|------|------|:-----------:|--------|
| **`useStockIntelligence`** | `useStockIntelligence.js` L78 | **IMPLICIT FIX** | `todayActivity` filter uses `t.dispatched_at‖t.received_at‖t.created_at`. After history regression fix, `dispatched_at` / `received_at` are restored — works without code change. However, if API normalizer maps `transfer_id→id`, this hook's consumers (OperationsHub) will also be fixed. |
| **`useWriteAction`** | `useWriteAction.js` | ⚪ None | Generic executor; doesn't touch transfer shape. |
| **`useStockInventory`** | `useStockInventory.js` | ⚪ None | Stock items, not transfers. |
| **`useStockDetail`** | `useStockDetail.js` | ⚪ None | |
| **`useRestaurantMap`** | `useRestaurantMap.js` | ⚪ None | |
| **`useLoginContext`** | `useLoginContext.js` | ⚪ None | |
| **`useCatalogueCrud`** | `useCatalogueCrud.js` | ⚪ None | |
| **`useConsumptionReport`** | `useConsumptionReport.js` | ⚪ None | |
| **`useHierarchyManagement`** | `useHierarchyManagement.js` | ⚪ None | |
| **`useWastageReasons`** | `useWastageReasons.js` | ⚪ None | |

### 2.4 Components — Detailed Change Map

#### TIER 0 — Must-fix (broken behavior)

| File | Lines | Current | Change | Risk |
|------|:-----:|---------|--------|:----:|
| **HistoryLedger.jsx** | 79,106,133,158 | `reference_id: t.id` | `reference_id: t.id ?? t.transfer_id` (or rely on normalizer) | LOW |
| **HistoryLedger.jsx** | 256 | `historyData.map(t => t.id).filter(Boolean)` | `.map(t => t.id ?? t.transfer_id).filter(Boolean)` (or rely on normalizer) | LOW |
| **HistoryLedger.jsx** | 263 | `.filter(t => t.id ‖ t.lines)` | `.filter(t => (t.id ?? t.transfer_id) ‖ t.lines)` | LOW |
| **HistoryLedger.jsx** | 354 | `String(t.id).includes(q)` | `String(t.id ?? t.transfer_id).includes(q) ‖ (t.reference_code‖"").toLowerCase().includes(q)` | LOW |
| **HistoryLedger.jsx** | 590,591,593,595,617 | `key={t.id}`, `navigate(…t.id)`, `formatPO(t.id)` | Use `resolveTransferId(t)` + `formatRef(t)` | LOW |
| **HistoryLedger.jsx** | 605 | `formatItemsCount(t.items_count)` | `formatItemsCount(t.items_count ?? t.line_count)` | LOW |
| **HistoryLedger.jsx** | 444 | CSV export: `formatPO(t.id), …, t.items_count` | Use `formatRef(t)`, `t.items_count ?? t.line_count` | LOW |
| **OperationsHub.jsx** | 456,459,478 | `key/navigate/formatPO` using `t.id` | Use `resolveTransferId(t)` + `formatRef(t)` | LOW |
| **OperationsHub.jsx** | 493,499 | `latestRequest.id` | `resolveTransferId(latestRequest)` + `formatRef(latestRequest)` | LOW |

#### TIER 1 — UX enhancement (display `reference_code`)

| File | Lines | Current | Change | Risk |
|------|:-----:|---------|--------|:----:|
| **TransferDetail.jsx** | 353 | `formatPO(data.id ‖ id)` as page title | Show `data.reference_code ‖ formatPO(data.id ‖ id)` | LOW |
| **TransferDetail.jsx** | 577 | Shows "Transfer ID" with `data.id` | Add row showing `reference_code` as "Reference" | LOW |
| **TransferDetail.jsx** | 661+ | Line table | Add `line_reference` column | LOW |
| **TransferDetail.jsx** | 151-287 | All confirm/toast texts: `Transfer #${data.id ‖ id}` | Could use `reference_code` but `#id` is fine for internal ops | SKIP |
| **PendingQueues.jsx** | 191,325 | `formatPO(id)` | `formatRef(item)` — show `reference_code` | LOW |
| **PendingQueues.jsx** | 331 | `formatItemsCount(item.items_count)` | `formatItemsCount(item.items_count ?? item.line_count)` | LOW |
| **PostSubmitConfirmation.jsx** | 30 | `formatPO(transferId)` | Accept `referenceCode` prop, show if available | LOW |
| **RequestStockForm.jsx** | 349-350 | `d?.transfer_id ‖ d?.id` for navigation | Also capture `d?.reference_code` for PostSubmitConfirmation | LOW |
| **DirectDispatchForm.jsx** | 303 | `resp.data.data.transfer_id ‖ .id ‖ resp.data.transfer_id` | Also capture `reference_code` for PostSubmitConfirmation | LOW |

#### TIER 2 — G-012 category grouping

| File | Lines | Current | Change | Risk |
|------|:-----:|---------|--------|:----:|
| **RequestStockForm.jsx** | 162 | `catalogItem.category_name ‖ item.category_name ‖ "Uncategorized"` | Already reads `category_name`! Category grouping in manual mode step 2 | MED |
| **RequestStockForm.jsx** | manual mode UI | Flat item list | Group items by `category_name` with accordion/section headers | MED |

#### TIER 3 — Nice-to-have enhancements

| File | Current | Enhancement | Risk |
|------|---------|-------------|:----:|
| **StoreDetail.jsx** L301 | Shows raw `txn.transfer_id` | Show `txn.reference_code ‖ formatPO(txn.transfer_id)` | LOW |
| **ReceiveDialog.jsx** L85 | `formatPO(transfer?.id)` in title | `transfer?.reference_code ‖ formatPO(transfer?.id)` | LOW |
| **ApproveWaveDialog.jsx** L129 | `formatPO(transfer?.id)` in title | Same pattern | LOW |
| **DisputeResolutionDialog.jsx** L40 | `formatPO(transfer?.id)` in title | Same pattern | LOW |
| **HistoryLedger.jsx** L770 | Ledger `formatPO(e.reference_id)` | `e.reference_code ‖ formatPO(e.reference_id)` | LOW |
| **HistoryLedger.jsx** | Search filter | Add search by `reference_code` | LOW |
| **HistoryLedger.jsx** | CSV columns | Add `reference_code` column | LOW |

---

## 3. WORKFLOW ANALYSIS

### 3.1 Request Flow (Franchise → Master)

```
[RequestStockForm]
  Step 1: requestSources() → select source
  Step 2: requestCatalog(sourceId) → items now have category_id + category_name  ← G-012
  Step 3: requestStock({items, fromRestaurantId}) → returns {transfer_id, reference_code}  ← G-013
  Navigate: /transfer/{transfer_id}
  
[PendingQueues] ← requester sees in my_requests with reference_code
[PendingQueues] ← approver sees in approval_pending with reference_code

[TransferDetail] ← transfer.reference_code + lines[].line_reference visible
  → Approve → {transfer_id, reference_code}
  → Dispatch → {transfer_id, reference_code}
  
[PendingQueues] ← receiver sees in receive_pending with reference_code

[TransferDetail]
  → Receive → {transfer_id, reference_code}
  
[HistoryLedger] ← history row has id + transfer_id + reference_code + all workflow keys
```

**Impact points:** 5 (catalog, create nav, queues display, detail display, history display)

### 3.2 Direct Dispatch Flow (Master → Franchise)

```
[DirectDispatchForm]
  Select destination → load own stock + source options
  Submit: initiateTransfer({from, to, items with source_selector})
    → returns {transfer_id, reference_code}  ← G-013
  Navigate: /transfer/{transfer_id}
  
[PendingQueues] ← receiver sees in receive_pending with reference_code

[TransferDetail]
  → Receive → {transfer_id, reference_code}
  
[HistoryLedger] ← full row
```

**Impact points:** 3 (create nav, queues, history)

### 3.3 Approve/Reject/Cancel/Withdraw/Amend/Modification

All action responses now include `reference_code` in `data`. Currently:
- Toast messages use `Transfer #${data.id ‖ id}` — numeric ID is fine for ops
- Could enhance to show `reference_code` but not critical

**Impact: minimal** — action handlers in `TransferDetail.jsx` use `data.id ‖ id` from URL params + details response (which has `transfer.id`). No breakage.

### 3.4 Hierarchy / Store Detail

`StoreDetail.jsx` transactions table uses `txn.transfer_id` (from hierarchy-detail endpoint). Now also has `txn.reference_code`. Can enhance display but no breakage.

---

## 4. RISK REGISTER

| ID | Risk | Severity | Likelihood | Mitigation |
|----|------|:--------:|:----------:|------------|
| R1 | **API normalizer breaks `normalizeTransfer` shape detection** — `normalizeTransfer` checks `!raw.id` to detect POS shape. If history normalizer adds `id`, detail responses that already have `id` won't be affected. History items never go through `normalizeTransfer` (separate `_getTransferHistory` path). | LOW | LOW | No overlap — separate code paths. Verify with test. |
| R2 | **`formatRef()` shows `TRF-legacy-{id}` for old transfers** — backend generates this for null DB `reference_code`. UX decision: show it or fall back to `PO-XXXX`. | LOW | CERTAIN | Accept `TRF-legacy-{id}` as valid display for old transfers. Users won't see these often. |
| R3 | **History `items_count` is 0, not actual count** — `mapTransferHistoryRow()` returns 0 for `items_count`. `formatItemsCount(0)` returns "0 items" not "—". | LOW | CERTAIN | Frontend should treat 0 as "unknown" for history: `t.items_count ‖ null` or only show if > 0. |
| R4 | **History `from_restaurant_name` / `to_restaurant_name` are null** — By design. Frontend already falls back to `restaurantMap`. | NONE | CERTAIN | Already handled. No change. |
| R5 | **Concurrent deploy window** — If frontend ships before backend deploys the history fix, `t.id` will still be undefined. | MED | LOW | Defensive pattern `t.id ?? t.transfer_id` survives both states. |
| R6 | **Search by reference_code doesn't match numeric PO** — If user searches "PO-0179" after we show "TRF-2026-0006", results won't match. | LOW | MED | Add `reference_code` to search terms alongside `t.id`. |
| R7 | **CSV export format change** — Switching PO column to `reference_code` changes export schema. Downstream consumers (if any) might break. | LOW | LOW | Add `reference_code` as NEW column, keep `PO/Ref` column too. |
| R8 | **G-012 category grouping complexity** — RequestStockForm already reads `category_name` but manual mode is a flat table. Grouped UI is a layout change. | MED | — | Separate phase. Accordion/collapsible groups by category. |

---

## 5. UX RECOMMENDATIONS

### 5.1 `reference_code` as Primary Display Label

**Where to make it primary (user-facing):**

| Surface | Current | Recommended | Rationale |
|---------|---------|-------------|-----------|
| History table PO/Ref column | `PO-0179` | `TRF-2026-0006` | Real business reference; searchable; unique across systems |
| Pending Queues card header | `PO-0179` | `TRF-2026-0006` | Same — operators communicate via ref codes |
| Transfer Detail page title | `PO-0179` | `TRF-2026-0006` | Primary identifier on detail page |
| Post-submit confirmation | `PO-0179` | `TRF-2026-0006` | Operators note down ref code for tracking |
| Hub activity row | `PO-0179` | `TRF-2026-0006` | Consistent with other surfaces |

**Where `transfer_id` should remain internal:**

| Surface | Current | Keep | Rationale |
|---------|---------|------|-----------|
| Transfer Detail "Transfer ID" field | `179` | As secondary info row | Needed for API troubleshooting / URL params |
| Action confirmations (`#179`) | `Transfer #179` | Keep numeric | Internal ops; brief toast messages |
| URL path segments | `/transfer/179` | Keep numeric | API routes use `{id}` |
| Ledger reference_id | numeric | Keep | Internal ledger entry linking |

### 5.2 `line_reference` Display

| Surface | Current | Recommended |
|---------|---------|-------------|
| TransferDetail lines table | No ref column | Add `Ref` column showing `TRF-2026-0006-L01` |
| Receive Dialog lines | No ref | Add small ref badge per line |

### 5.3 G-012 Category Grouping

**Where categories add value:**

| Surface | Opportunity |
|---------|------------|
| **RequestStockForm** manual mode step 2 | Group catalog items by `category_name` with collapsible sections. "rice ball" section → rice, sea weed. "sushi" section → raw tuna. |
| **RequestStockForm** suggested mode | Already sorted by urgency. Could add category badge per item. |
| **DirectDispatchForm** item selector | Group inventory items by category in dropdown. Less impactful since items come from own stock, not catalog. |

### 5.4 Column Header Rename

| Surface | Current Header | Recommended |
|---------|---------------|-------------|
| History table | "PO / Ref" | "Reference" |
| Pending Queues | (inline PO badge) | Keep inline but show ref code |
| Store Detail transactions | "ID" | "Ref" |

---

## 6. ROLLOUT STRATEGY

### Phase 0: API Normalizer (1 change, 0 risk, fixes all breakage)

**Scope:** `services/api.js` — `_getTransferHistory` normalizer
**Changes:**
- After fetching history, map `transfer_id→id` and normalize `items_count`
- Also add defensive `line_count→items_count` mapping in `_getPendingQueues` if needed

**Validation:** 
- History tab navigation works (no more `/transfer/undefined`)
- PO column shows `PO-XXXX` format correctly (using `id`)
- Ledger tab loads (detail fetch IDs resolved)
- Search by ID works

**Risk:** ZERO — additive mapping, backward compatible

### Phase 1: `formatRef` + Display Upgrade (low risk, high UX value)

**Scope:** `lib/formatters.js` + 7 components
**Changes:**
1. Add `resolveTransferId(row)` and `formatRef(row)` to `formatters.js`
2. Replace `formatPO(t.id)` → `formatRef(t)` in:
   - `HistoryLedger.jsx` (PO column, CSV, ledger)
   - `OperationsHub.jsx` (activity, latestRequest)
   - `PendingQueues.jsx` (card header, compact row)
   - `PostSubmitConfirmation.jsx` (success card)
3. Update `HistoryLedger.jsx` search to include `reference_code`
4. Add `reference_code` column to CSV export

**Validation:**
- All screens show `TRF-2026-XXXX` for new transfers
- Legacy transfers show `TRF-legacy-XXX`
- Search by ref code works
- CSV export includes ref code

### Phase 2: TransferDetail Enhancement (low risk)

**Scope:** `TransferDetail.jsx` + dialogs
**Changes:**
1. Show `reference_code` as page title (with numeric ID as subtitle)
2. Add `reference_code` info row in detail section
3. Add `line_reference` column in lines table
4. Update dialog titles: `ReceiveDialog`, `ApproveWaveDialog`, `DisputeResolutionDialog`

**Validation:**
- Detail page shows ref code prominently
- Line table shows line references
- Dialog titles show ref code

### Phase 3: G-012 Category Grouping (medium risk, medium effort)

**Scope:** `RequestStockForm.jsx` — manual mode step 2
**Changes:**
1. Group catalog items by `category_name` (already read at L162)
2. Render grouped accordion/section layout instead of flat table
3. Handle "Uncategorized" group (category_id=null, category_name="")

**Validation:**
- Manual mode shows grouped items
- Uncategorized items appear in separate group
- Selection and quantity input still work per-item
- Submit payload unchanged (source_inventory_master_id based)

### Phase 4: Polish (nice-to-have)

**Scope:** `StoreDetail.jsx`, `DirectDispatchForm.jsx`, additional search enhancements
**Changes:**
1. StoreDetail transactions: show `reference_code` instead of raw `transfer_id`
2. DirectDispatchForm: pass `reference_code` to PostSubmitConfirmation
3. HistoryLedger: add reference_code filter dropdown (if needed)

---

## 7. IMPLEMENTATION BLUEPRINT SUMMARY

```
Phase 0 (P0) — 1 file, ~10 lines
  └─ api.js: _getTransferHistory normalizer
     → Fixes: navigation, PO display, ledger, search
     → Risk: ZERO

Phase 1 (P1) — 2 files new/edit + 5 component edits, ~40 lines
  ├─ formatters.js: resolveTransferId(), formatRef()
  ├─ HistoryLedger.jsx: formatRef, search, CSV
  ├─ OperationsHub.jsx: formatRef
  ├─ PendingQueues.jsx: formatRef, items_count fallback
  ├─ PostSubmitConfirmation.jsx: accept referenceCode prop
  └─ api.js: _getPendingQueues items_count defensive mapping
     → Delivers: reference_code visible across all list surfaces
     → Risk: LOW

Phase 2 (P2) — 4 component edits, ~30 lines
  ├─ TransferDetail.jsx: ref code display + line_reference column
  ├─ ReceiveDialog.jsx: title
  ├─ ApproveWaveDialog.jsx: title
  └─ DisputeResolutionDialog.jsx: title
     → Delivers: reference_code visible on detail + action dialogs
     → Risk: LOW

Phase 3 (P3) — 1 component, ~60 lines
  └─ RequestStockForm.jsx: category-grouped catalog UI
     → Delivers: G-012 category grouping
     → Risk: MEDIUM (layout change in form)

Phase 4 (P4) — 2 components, ~15 lines
  ├─ StoreDetail.jsx: reference_code in transactions
  └─ DirectDispatchForm.jsx: reference_code on success
     → Delivers: polish
     → Risk: LOW
```

**Total estimated changes:** ~155 lines across 11 files
**Zero new files, zero new routes, zero new API methods**

---

## 8. FILES NOT AFFECTED (confirmed safe)

All files in `components/central-inventory/` not listed above, plus:
- All `components/ui/*` (shadcn primitives)
- All `components/layout/*` (AppLayout, Sidebar, AppHeader, LoginPage)
- `components/common/Badges.jsx`, `DateRangePicker.jsx`, `FulfillmentVerdict.jsx`, `StockIntelligenceBar.jsx`, `StoreHealthStrip.jsx`, `StateDisplays.jsx`
- All catalogue components (Ingredient, Product, Recipe, AddonRecipe)
- `WastageEntryForm.jsx`, `WastageReport.jsx`, `StockAdjustmentForm.jsx`
- `AddStockPurchaseForm.jsx`, `VendorManagement.jsx`, `VendorFormDialog.jsx`
- `OperationalSettings.jsx`, `DailyConsumptionReport.jsx`
- `HierarchyManagement.jsx`, `HierarchySummary.jsx`
- `ContextSelector.jsx`, `SourceSelector.jsx`, `StatusTimeline.jsx`
- `IngredientComposer.jsx`, `ItemEditorDialog.jsx`
- All hooks except `useStockIntelligence` (which is implicitly fixed by the normalizer)
- `lib/terminology.js`, `lib/transferActions.js`, `lib/screenVisibility.js`, `lib/reasonCategories.js`, `lib/utils.js`
