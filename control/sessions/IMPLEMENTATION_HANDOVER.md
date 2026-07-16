# Implementation Handover — CR-030 / CR-031 / CR-032

> **Date:** 2026-06-14
> **From:** Planning Agent (session 2)
> **To:** Implementation Agent (session 3)
> **Status:** ALL PLANS FROZEN — Ready for implementation
> **Priority:** CR-030 → CR-031 → CR-032 (sequential)

---

## STEP 0: READ BEFORE ANYTHING ELSE

**Read these files IN ORDER. Do not write code until you have completed this reading.**

| # | File | Why | Time |
|---|------|-----|:----:|
| 1 | `control/AGENT_PROMPT.md` | Your operating manual — rules, terminology, governance | 3 min |
| 2 | This file (you're reading it) | What to build, in what order | 10 min |
| 3 | `control/L0_BASELINE_INDEX.md` | 6 frozen docs + 6 architecture contracts you CANNOT break | 2 min |
| 4 | `control/L7_FILE_OWNERSHIP.md` | Frozen files — check before touching anything | 2 min |
| 5 | `control/L8_ACCESS_REGISTRY.md` | Test accounts for validation | 1 min |
| 6 | `memory/test_credentials.md` | Quick-reference credentials | 1 min |

---

## PROJECT CONTEXT (60-second version)

**Central Inventory** = multi-store stock management for MyGenie POS.

- **Backend:** FastAPI proxy on port 8001. **DO NOT MODIFY** `server.py`. It just forwards calls to `preprod.mygenie.online`. Zero business logic.
- **Frontend:** React 19 + CRACO + Tailwind + Radix UI (shadcn). Port 3000. All intelligence is frontend-side.
- **Database:** MongoDB (local, for token sessions only — not for business data)
- **POS API:** All real data comes from `preprod.mygenie.online/api/v2/vendoremployee` via proxy

### The One Rule You Cannot Break

**Backend terminology is INVERTED from business terminology.**

| UI Label | API Value | Level |
|----------|-----------|:-----:|
| Central Store | `master` | TOP |
| Master Store | `central` | MIDDLE |
| Outlet | `franchise` | BOTTOM |

Use `frontend/src/lib/terminology.js` for ALL display. **Never show raw API terms.**

### Test Accounts (Primary — Restaurant 806)

| Role | Email | Password | RID |
|------|-------|----------|:---:|
| Central Store (TOP) | `manager@germanfluid.com` | `Qplazm@10` | 806 |
| Master Store (MID) | `manager@centralkitchenalpha.com` | `Qplazm@10` | 807 |
| Outlet (BOTTOM) | `manager@outletdirectone.com` | `Qplazm@10` | 809 |

### Environment

```bash
# Backend .env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
CORS_ORIGINS="*"

# Frontend .env
REACT_APP_BACKEND_URL=https://inventory-hub-1832.preview.emergentagent.com

# Test API calls
API_URL=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d '=' -f2)
TOKEN=$(curl -s -X POST "$API_URL/api/proxy/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"manager@germanfluid.com","password":"Qplazm@10","fcm_token":"test"}' \
  | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('token') or d.get('data',{}).get('token',''))")
```

---

## WHAT HAS BEEN DONE (Planning Session)

1. ✅ Repo cloned from `13-june-2` branch, dependencies installed, services running
2. ✅ All 10 onboarding docs read
3. ✅ All existing screens audited (38 components, 13,472 lines)
4. ✅ All UX freeze mocks created and owner-approved
5. ✅ All APIs probed and validated
6. ✅ Implementation plans written for all 3 CRs
7. ✅ G-021 (PO Module) CLOSED — all 10 PO APIs validated (32/32 checks)
8. ✅ G-017 (Vendor History) CLOSED — `vendor-item-list` API confirmed
9. ✅ G-022 (Aggregated Stock) NOT NEEDED — API supports `include_segments` + `include_consumption` params
10. ✅ Registry + dashboard updated, zero drift

**NO CODE HAS BEEN WRITTEN. You start from zero implementation.**

---

## WHAT YOU NEED TO BUILD

### CR-030: Inward Screens (~28h) — DO THIS FIRST

**Read these files before implementing CR-030:**

| File | What |
|------|------|
| `control/sessions/CR030_ARTIFACT_2_3_UNIFIED_IMPLEMENTATION_PLAN.md` | Full implementation plan with phases, code snippets, test checkpoints |
| `control/sessions/CR030_VENDOR_MANAGEMENT_UX_FREEZE.md` | Vendor Management master-detail spec |
| `control/sessions/CR030_RAW_MATERIAL_MASTER_UX_FREEZE.md` | Raw Material expandable rows spec |
| `control/sessions/CR030_PURCHASE_ORDER_UX_FREEZE.md` | Purchase Order module — 9 screens spec (BIGGEST piece) |
| `AI/Plans/phase3/P35_purchase_order_api_contract.md` | PO API contract with all endpoints, payloads, error codes |

**Implementation order (strict sequence):**

#### Phase 0: API Layer (~1h)
| Task | File | What |
|------|------|------|
| 0.1 | `services/api.js` | Add `getVendorItemList(rid, { fromDate, toDate })` with cache (TTL.LONG) |
| 0.2 | `services/api.js` | Update `_getStockInventory()` to accept `{ includeSegments, segmentLimit, includeConsumption }` params |
| 0.3 | `services/api.js` | Add 10 PO methods: `createPO`, `listPOs`, `getPODetail`, `updatePO`, `deletePO`, `approvePO`, `sendPO`, `receivePO`, `cancelPO`, `closePO` |

**Validation:** `curl` each new endpoint through the proxy to confirm it works.

#### Phase 1: Vendor Management (~6h)
| Task | File | What |
|------|------|------|
| 1.1 | `VendorManagement.jsx` | **FULL REWRITE** — master-detail layout (35% list / 65% detail) |
| 1.2 | `VendorFormDialog.jsx` | **DELETE** — inline form replaces popup |

**Current:** 212 lines, simple table + popup dialogs
**Target:** ~450 lines, master-detail with inline form + purchase intelligence (KPIs + bar chart + recent purchases)

**Key data sources:**
- `api.getVendors()` → vendor list
- `api.getVendorItemList(restaurantId, { fromDate: 1yr ago })` → purchase intelligence (cached)
- Active/Inactive computed from `Purchase_Date` (not `created_at`)

**Read the freeze carefully for:** 3 states (empty, edit, add), intelligence section (3 KPIs + monthly bar chart + recent purchases table), behavior rules

#### Phase 2: Raw Material Master (~8h)
| Task | File | What |
|------|------|------|
| 2.1 | `IngredientCatalogue.jsx` | **FULL REWRITE** — expandable rows with inline edit + intelligence |

**Current:** 326 lines, table + popup edit/add
**Target:** ~550 lines, expandable rows with inline edit form + KPIs (avg rate, consumption, days-of-stock) + vendor price comparison bars + "Pushed to X stores"

**Key data sources:**
- `api.getStockInventory({ includeSegments: true, includeConsumption: true })` → items with segments + consumption
- `api.getVendorItemList(...)` → purchase rates per ingredient per vendor
- `api.getStockItemCategories()` → category filter
- `api.getRecipeList()` → recipe cross-ref
- `api.getHierarchyList()` → "Pushed to X stores" (only if `isTopLevel`)

**Key changes from current:**
- Popup dialogs → expandable row inline edit
- Add inline form at top of table (not popup)
- Status badge: add "Empty" (gray) when `cal_quantity == 0`
- Category + Status dropdown filters
- Error handling on add: toast (not silent catch)

#### Phase 3: Purchase Order Module (~14h) — LARGEST PIECE
| Task | File | What |
|------|------|------|
| 3.1 | `PurchaseOrderList.jsx` | **NEW** — PO list with status tabs, KPIs, vendor/date filters (~300 lines) |
| 3.2 | `PurchaseOrderCreate.jsx` | **NEW** — By Vendor + By Item Need + Multi-PO Review (~600 lines) |
| 3.3 | `PurchaseOrderDetail.jsx` | **NEW** — Detail + Receive with invoice matching + GRN History (~500 lines) |
| 3.4 | `AddStockPurchaseForm.jsx` | EDIT — add PO gate redirect for `DIRECT_PURCHASE_REQUIRES_PO` |
| 3.5 | `App.js` | EDIT — add routes: `/purchase/orders`, `/purchase/orders/new`, `/purchase/orders/:id` |

**This is a brand new module.** Read `CR030_PURCHASE_ORDER_UX_FREEZE.md` thoroughly — it has:
- 9 screen specifications with exact layouts
- Per-field data sources
- Intelligence panel specs (variance, rate history, stock impact)
- Error handling for all 7 PO error codes
- Status lifecycle + contextual actions per status
- Multi-PO creation logic (By Item Need auto-groups by vendor)

**PO API endpoints (all through proxy):**

| Method | Route (via proxy) | Action |
|--------|-------------------|--------|
| POST | `/api/proxy/v2/inventory/purchase-order/create` | Create draft PO |
| GET | `/api/proxy/v2/inventory/purchase-order/list?status=&vendor_id=&from_date=&to_date=` | List POs |
| GET | `/api/proxy/v2/inventory/purchase-order/{id}` | Detail with lines + receipts |
| PUT | `/api/proxy/v2/inventory/purchase-order/{id}/update` | Edit draft only |
| DELETE | `/api/proxy/v2/inventory/purchase-order/{id}` | Delete draft only |
| POST | `/api/proxy/v2/inventory/purchase-order/{id}/approve` | Draft → approved |
| POST | `/api/proxy/v2/inventory/purchase-order/{id}/send` | → sent |
| POST | `/api/proxy/v2/inventory/purchase-order/{id}/receive` | Record GRN |
| POST | `/api/proxy/v2/inventory/purchase-order/{id}/cancel` | Cancel with reason |
| POST | `/api/proxy/v2/inventory/purchase-order/{id}/close` | Close received PO |

**Settings (from `getOperationalSettings`):**
- `require_po_for_purchase: true` — gates direct add-stock
- `require_po_approval: false` — PO can skip approval
- `po_auto_close_on_full_receive: true` — auto-close on full receive
- `po_variance_alert_pct: 10` — threshold for flagging rate variance

---

### CR-031: Production Screens (~17.5h) — DO SECOND

**Read these files before implementing CR-031:**

| File | What |
|------|------|
| `control/sessions/CR031_ARTIFACT_2_3_UNIFIED_IMPLEMENTATION_PLAN.md` | Full plan |
| `control/sessions/CR031_SUB_RECIPE_MASTER_UX_FREEZE.md` | Master-detail + BOM editor spec |
| `control/sessions/CR031_RUN_PRODUCTION_UX_FREEZE.md` | Confirmation step spec |
| `control/sessions/CR031_PRODUCTION_HISTORY_UX_FREEZE.md` | Expandable rows + date filter spec |

**Implementation order:**

| Phase | Task | File | What |
|:-----:|------|------|------|
| 0 | Probe + add `deleteSubRecipe()` | `api.js` | `DELETE /recipe/delete-sub-recipe/{recipe_id}`. Probe first — if 404, disable delete button. Note: sub-recipes use `recipe_id` not `id`. |
| 1 | Sub-Recipe Master rewrite | `SubRecipeMaster.jsx` | **FULL REWRITE** → master-detail (35/65), BOM editor, delete, intelligence KPIs (cost/batch, last produced, FG stock). Currently 213 lines → ~500. |
| 2 | Production confirmation | `ProductionRunForm.jsx` | EDIT — add confirmation card section at bottom (always visible when form filled). Currently 607 lines → ~680. |
| 3 | Production History rewrite | `ProductionHistory.jsx` | **MAJOR REWRITE** — add date range filter, search, expandable audit detail inline (currently navigates to `/production/:id`). 446 → ~550 lines. |

**Key data for CR-031:**
- Sub-recipes use `recipe_id` (NOT `id`) — verified from API
- `ingredients[]` in sub-recipe response already has `ingredient_name` — but may be null, so fallback chain needed: `ingredient_name` → `stockMap[id]?.stock_title` → "Unknown (ID: X)"
- `getProductionRunHistory()` already supports `from_date`/`to_date` params

---

### CR-032: Outward Screens (~24h) — DO THIRD

**Read these files before implementing CR-032:**

| File | What |
|------|------|
| `control/sessions/CR032_ARTIFACT_2_3_UNIFIED_IMPLEMENTATION_PLAN.md` | Full plan |
| `control/sessions/CR032_STORE_MANAGEMENT_UX_FREEZE.md` | Single unified view (Summary tab KILLED) |
| `control/sessions/CR032_PRODUCT_CATALOG_UX_FREEZE.md` | 5 tabs + Recipe BOM editor |
| `control/sessions/CR032_STOCK_INVENTORY_UX_FREEZE.md` | Expandable rows with FEFO segments |
| `control/sessions/CR032_PENDING_QUEUES_UX_FREEZE.md` | Bug fixes only (requester name + items count) |
| `control/sessions/CR032_HISTORY_LEDGER_UX_FREEZE.md` | Bug fix only (items count) |

**Implementation order:**

| Phase | Task | Files | What |
|:-----:|------|-------|------|
| 0 | Bug fixes first | `PendingQueues.jsx`, `HistoryLedger.jsx`, `StockInventorySummary.jsx` | O-13 requester name swap, O-14/O-15 "0 items" count fix, O-9 "-0d" fix, O-10 remove back button, O-11 store name |
| 1 | Store Management rewrite | `StoreManagement.jsx` | **FULL REWRITE** — absorb HierarchyManagement into single view with expandable rows, kill Summary tab. 32 lines → ~600. `HierarchySummary.jsx` becomes orphaned. |
| 2 | Product Catalog + Recipes | `ProductCatalogue.jsx`, `RecipeCatalogue.jsx`, `AddonRecipeCatalogue.jsx` | Add Recipes + Addon Recipes tabs. Both need **FULL REWRITE** to master-detail BOM editor pattern (purple sub-recipes + green ingredients + cost breakdown). |
| 3 | Stock Inventory expandable | `StockInventorySummary.jsx` | **MAJOR REWRITE** — click row → expand inline (FEFO segments + consumption + quick actions) instead of navigating to detail page. Use `getStockInventory({ includeSegments: true, includeConsumption: true })`. |

**Critical bug fix details (Phase 0):**

**O-13 (Requester name swap):** For request-type transfers, `from_restaurant` = fulfiller (you), `to_restaurant` = requester (outlet). Current code shows `from → to` which reads wrong. Fix:
```javascript
const isRequest = item.type === "request" || item.type === "modification_request";
if (isRequest) {
  headerTitle = `${toName} → ${fromName}`;
  subtitle = `${toName} requesting from you`;
} else {
  headerTitle = `${fromName} → ${toName}`;
  subtitle = `Dispatching to ${toName}`;
}
```
**MUST test from Central (806) AND Outlet (809) perspectives.**

**O-14/O-15 (0 items):** Investigate what `formatItemsCount()` receives. History API may not return `items_count` or `lines[]`. Fix: `transfer.items_count || transfer.lines?.length || transfer.line_count || 0`

---

## ARCHITECTURE RULES (DO NOT BREAK)

1. **`server.py` is proxy-only** — DO NOT add business logic. DO NOT modify.
2. **`terminology.js` is FROZEN** — never show raw API terms (`master`/`central`/`franchise`) in UI
3. **`screenVisibility.js` is FROZEN** — role-based access gates. Check before adding nav items.
4. **`api.js` cache layer** — all write endpoints MUST invalidate related caches. Follow existing `_invalidateCache()` pattern.
5. **`display_qty` is STRING from POS API** — always `Number()` wrap before arithmetic
6. **All new interactive elements MUST have `data-testid`** — kebab-case, describing function
7. **Use existing UI components** from `components/ui/` (shadcn) — Button, Card, Table, Dialog, Badge, Input, Select, Tabs, etc.
8. **Use existing patterns** — look at how `RequestStockForm.jsx` (762 lines) or `TransferDetail.jsx` (856 lines) are structured for reference on complex screens

## KEY EXISTING COMPONENTS TO REUSE

| Component | Location | Use For |
|-----------|----------|---------|
| `LoadingState`, `ErrorState`, `EmptyState` | `components/common/StateDisplays` | All loading/error/empty states |
| `ConfirmActionDialog` | `central-inventory/ConfirmActionDialog.jsx` | Delete confirmations |
| `PostSubmitConfirmation` | `components/common/` | Success cards after write actions |
| `SourceSelector` | `central-inventory/SourceSelector.jsx` | FEFO segment picker |
| `StockIntelligenceBar` | `components/common/` | Stock health strip |
| `useLoginContext` | `hooks/useLoginContext.js` | Auth context, restaurantType, restaurantId, isTopLevel |
| `useRestaurantMap` | `hooks/useRestaurantMap.js` | Restaurant ID → name resolution |
| recharts | Already in `package.json` | Bar charts for vendor intelligence |

## EXISTING HOOKS PATTERN

Look at existing hooks for the pattern to follow:
- `useStockInventory.js` — data loading + state management
- `useProductionRun.js` — multi-source data aggregation
- `useCatalogueCrud.js` — CRUD operations pattern

---

## GOVERNANCE: AFTER EACH CR COMPLETION

After completing implementation for each CR:

```bash
# 1. Update registry.json — change CR status to QA
# 2. Update artifact refs to point to QA report
# 3. Regenerate dashboard
node control/gen_dashboard_data.js
node control/gen_dashboard_data.js --check  # must pass

# 4. Update control files
# - L1_CONTROL_DASHBOARD.md (sprint state)
# - L6_SPRINT_STATUS.md (item moved)
# - L7_FILE_OWNERSHIP.md (new/modified files)
```

---

## QA HANDOFF REQUIREMENTS

For the QA agent to take over, each CR must have:

1. **All code implemented** per the frozen UX specs
2. **Artifact 5 (QA Report)** written with:
   - Test cases covering each screen/flow
   - Curl evidence for API integration
   - Screenshots of implemented screens
   - Regression verification (existing screens not broken)
3. **`data-testid`** on every interactive element
4. **No lint errors** — run linter before handoff
5. **Services running** — `sudo supervisorctl status` shows backend + frontend RUNNING

### Suggested Test Cases Per CR

**CR-030 tests:**
- Vendor Management: master-detail layout, select vendor, intelligence KPIs, create/edit/delete vendor, search
- Raw Material Master: expandable rows, inline edit, intelligence panel, vendor price comparison, category/status filters, add ingredient
- PO List: status tabs, vendor filter, date filter, KPIs
- PO Create By Vendor: vendor cards, history table, check items, suggested qty, review
- PO Create By Item Need: urgency sort, vendor picker per item, multi-PO auto-group, review 2 POs
- PO Detail: status timeline, contextual actions per status
- PO Receive: invoice matching, variance calculation, rate history, stock impact, skip lines, partial receive
- PO GRN History: multiple events, cost analysis
- Add-Stock Gate: redirect when `DIRECT_PURCHASE_REQUIRES_PO`
- Login as Outlet (809): verify `VENDOR_PURCHASE_NOT_ALLOWED` blocked state

**CR-031 tests:**
- Sub-Recipe Master: master-detail, BOM editor, delete, intelligence, ingredient name resolution
- Run Production: confirmation card, can't submit without confirmation, post-production result
- Production History: date filter, search, KPI recalculation, expandable audit detail

**CR-032 tests:**
- Store Management: single view (no tabs), expandable rows, stock health per store, create store inline, push
- Product Catalog: 5 tabs, Recipe BOM editor with sub-recipe expansion, cost breakdown, CRUD
- Stock Inventory: expandable rows with segments + consumption + quick actions, no back button, store name
- Pending Queues: requester name correct for request-type AND dispatch-type (test from 806 AND 809)
- History: items count non-zero

---

## FILE INDEX (Quick Reference)

### Planning Artifacts
```
control/sessions/CR030_ARTIFACT_2_3_UNIFIED_IMPLEMENTATION_PLAN.md    ← CR-030 full plan
control/sessions/CR031_ARTIFACT_2_3_UNIFIED_IMPLEMENTATION_PLAN.md    ← CR-031 full plan
control/sessions/CR032_ARTIFACT_2_3_UNIFIED_IMPLEMENTATION_PLAN.md    ← CR-032 full plan
```

### UX Freezes (11 total)
```
control/sessions/CR030_VENDOR_MANAGEMENT_UX_FREEZE.md
control/sessions/CR030_RAW_MATERIAL_MASTER_UX_FREEZE.md
control/sessions/CR030_PURCHASE_ORDER_UX_FREEZE.md                    ← 9 screens, LARGEST
control/sessions/CR031_SUB_RECIPE_MASTER_UX_FREEZE.md
control/sessions/CR031_RUN_PRODUCTION_UX_FREEZE.md
control/sessions/CR031_PRODUCTION_HISTORY_UX_FREEZE.md
control/sessions/CR032_STORE_MANAGEMENT_UX_FREEZE.md
control/sessions/CR032_PRODUCT_CATALOG_UX_FREEZE.md
control/sessions/CR032_STOCK_INVENTORY_UX_FREEZE.md
control/sessions/CR032_PENDING_QUEUES_UX_FREEZE.md
control/sessions/CR032_HISTORY_LEDGER_UX_FREEZE.md
```

### API Contract
```
AI/Plans/phase3/P35_purchase_order_api_contract.md                    ← PO API contract (10 endpoints)
```

### Mock Previews (live at /__dev/previews/)
```
frontend/public/__dev/previews/P35_purchase_order_FINAL_FREEZE.html   ← 9 PO screens (FINAL)
frontend/public/__dev/previews/P35_purchase_order_mock_v2.html        ← Create flow intelligence
frontend/public/__dev/previews/P35_receive_flow_mock.html             ← Receive flow intelligence
```

### Key Source Files (to modify)
```
frontend/src/services/api.js                                          ← Add APIs here (currently 1035 lines)
frontend/src/components/central-inventory/VendorManagement.jsx        ← REWRITE (212 lines)
frontend/src/components/central-inventory/VendorFormDialog.jsx        ← DELETE
frontend/src/components/central-inventory/IngredientCatalogue.jsx     ← REWRITE (326 lines)
frontend/src/components/central-inventory/AddStockPurchaseForm.jsx    ← EDIT (gate redirect)
frontend/src/components/central-inventory/SubRecipeMaster.jsx         ← REWRITE (213 lines)
frontend/src/components/central-inventory/ProductionRunForm.jsx       ← EDIT (607 lines)
frontend/src/components/central-inventory/ProductionHistory.jsx       ← REWRITE (446 lines)
frontend/src/components/central-inventory/StoreManagement.jsx         ← REWRITE (32 lines)
frontend/src/components/central-inventory/ProductCatalogue.jsx        ← REWRITE (355 lines)
frontend/src/components/central-inventory/RecipeCatalogue.jsx         ← REWRITE (296 lines)
frontend/src/components/central-inventory/AddonRecipeCatalogue.jsx    ← REWRITE (180 lines)
frontend/src/components/central-inventory/StockInventorySummary.jsx   ← REWRITE (574 lines)
frontend/src/components/central-inventory/PendingQueues.jsx           ← EDIT (473 lines)
frontend/src/components/central-inventory/HistoryLedger.jsx           ← EDIT (807 lines)
frontend/src/App.js                                                   ← EDIT (add routes)
```

### New Files to Create
```
frontend/src/components/central-inventory/PurchaseOrderList.jsx       ← NEW (~300 lines)
frontend/src/components/central-inventory/PurchaseOrderCreate.jsx     ← NEW (~600 lines)
frontend/src/components/central-inventory/PurchaseOrderDetail.jsx     ← NEW (~500 lines)
```

---

## FINAL CHECKLIST BEFORE STARTING

- [ ] Read `control/AGENT_PROMPT.md`
- [ ] Read this handover document completely
- [ ] Read `control/L0_BASELINE_INDEX.md` (frozen contracts)
- [ ] Read `control/L7_FILE_OWNERSHIP.md` (frozen files)
- [ ] Verify services running: `sudo supervisorctl status`
- [ ] Verify API works: `curl -s $API_URL/api/ | python3 -c "import sys,json;print(json.load(sys.stdin))"`
- [ ] Verify login works: test curl with 806 credentials
- [ ] Start with CR-030 Phase 0 (api.js changes)

**GO BUILD.**

---

*This document is the complete handover. The implementation agent should not need to ask the planning agent any questions — everything is in the frozen specs and this document.*
