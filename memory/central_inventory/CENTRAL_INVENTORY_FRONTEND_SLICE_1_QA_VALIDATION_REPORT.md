# Central Inventory — Frontend Slice 1 QA Validation Report

> **Date:** 19 May 2026
> **Agent:** Independent QA Validation Agent
> **Scope:** Phase 1 Limited Slice — Read-Only Foundation

---

## 1. Final QA Status

### **`qa_passed_with_minor_notes`**

Core read-only scope is correct. Locked terminology mapping is implemented correctly across all 10 areas. No write APIs are called. All blocked actions are disabled. Build and lint pass. Only minor environment-specific notes remain (test credentials lack `restaurant_type_flag`; backend proxy supports PUT/DELETE methods that are unused but not called by frontend).

---

## 2. Executive Summary

Slice 1 delivers a clean, read-only Central Inventory frontend foundation. The implementation correctly separates read APIs from write APIs, implements the locked terminology mapping through a centralized adapter, derives login context from `restaurant_type_flag`, and renders all 6 approved screens with proper loading/empty/error/blocked states. No business rules were changed. The login screen was not redesigned. All action buttons for write flows are disabled with clear blocker copy.

---

## 3. Documents Reviewed

| # | Document | Reviewed |
|---|----------|----------|
| 1 | CENTRAL_INVENTORY_BUSINESS_RULE_AND_UX_FIELD_FREEZE.md | YES |
| 2 | CENTRAL_INVENTORY_LOGIN_CONTEXT_AND_SCREEN_VISIBILITY_MATRIX.md | YES |
| 3 | CENTRAL_INVENTORY_FRONTEND_SLICE_1_HANDOVER.md | YES |
| 4 | CENTRAL_INVENTORY_FRONTEND_SLICE_1_QA_CHECKLIST.md | YES |
| 5 | CENTRAL_INVENTORY_ENTERPRISE_REQUIREMENT_REVIEW_ROUND_2.md | YES |
| 6 | CENTRAL_INVENTORY_REQUIREMENT_REVIEW_STATUS.md | YES |
| 7 | OWNER_ANSWERS_COMPLETE.md | YES |

---

## 4. Files Inspected

| File | Lines | Inspected |
|------|-------|-----------|
| `/app/frontend/src/lib/terminology.js` | 135 | FULL |
| `/app/frontend/src/lib/screenVisibility.js` | 115 | FULL |
| `/app/frontend/src/hooks/useLoginContext.js` | 190 | FULL |
| `/app/frontend/src/hooks/useCentralInventoryRealtime.js` | 49 | FULL |
| `/app/frontend/src/services/api.js` | 132 | FULL |
| `/app/frontend/src/App.js` | 83 | FULL |
| `/app/frontend/src/components/central-inventory/ContextSelector.jsx` | ~120 | FULL |
| `/app/frontend/src/components/central-inventory/OperationsHub.jsx` | ~190 | FULL |
| `/app/frontend/src/components/central-inventory/HierarchySummary.jsx` | ~130 | FULL |
| `/app/frontend/src/components/central-inventory/StoreDetail.jsx` | ~220 | FULL |
| `/app/frontend/src/components/central-inventory/PendingQueues.jsx` | ~200 | FULL |
| `/app/frontend/src/components/central-inventory/TransferDetail.jsx` | ~220 | FULL |
| `/app/frontend/src/components/layout/AppHeader.jsx` | ~50 | FULL |
| `/app/frontend/src/components/layout/Sidebar.jsx` | ~80 | FULL |
| `/app/frontend/src/components/layout/AppLayout.jsx` | ~15 | FULL |
| `/app/frontend/src/components/layout/LoginPage.jsx` | ~80 | FULL |
| `/app/frontend/src/components/common/StateDisplays.jsx` | ~70 | FULL |
| `/app/frontend/src/components/common/Badges.jsx` | ~30 | FULL |
| `/app/backend/server.py` | 127 | FULL |

---

## 5. Locked Terminology Mapping Validation

### Locked rule: `master → Central Store`, `central → Master Store`, `franchise → Outlet`

| # | Area | Method of Verification | Result |
|---|------|------------------------|--------|
| 1 | **Terminology adapter** (`terminology.js`) | Code inspection: lines 17-19 `TERM_MAP` | **PASS** — `{ master: "Central Store", central: "Master Store", franchise: "Outlet" }` |
| 2 | **Store type badges** (`Badges.jsx`) | Code: uses `mapRestaurantType(backendType)` from adapter | **PASS** — No hardcoded labels |
| 3 | **Filters** (`HierarchySummary.jsx`) | Code: uses `STORE_TYPE_FILTERS` → `masterStores: "central"`, `outlets: "franchise"` | **PASS** — Inverted correctly |
| 4 | **Navigation labels** (`screenVisibility.js`) | Code: NAV_ITEMS have labels like "Operations Hub", "Hierarchy Summary" | **PASS** — No raw terms |
| 5 | **Context selector** (`ContextSelector.jsx`) | Code: uses `<StoreTypeBadge backendType={...}>` which routes through adapter | **PASS** |
| 6 | **Hierarchy Summary** (`HierarchySummary.jsx`) | E2E: backend `central` stores show "Master Store" badge; backend `franchise` stores show "Outlet" badge | **PASS** — All 6 badges verified |
| 7 | **Store Detail** (`StoreDetail.jsx`) | E2E: child stores show correct mapped badges | **PASS** — All 7 child badges verified |
| 8 | **Pending Queues** (`PendingQueues.jsx`) | E2E scan of page body text | **PASS** — No raw terms |
| 9 | **Transfer Detail** (`TransferDetail.jsx`) | Code: `mapRestaurantType(fromType)` and `mapRestaurantType(toType)` | **PASS** |
| 10 | **Login context / screen visibility** | Code: `useLoginContext` uses `HIERARCHY_LEVEL` keyed by backend values; screen matrix uses backend keys as internal identifiers | **PASS** |

### Raw term leak scan
- **Method:** `grep -rn` across all `.jsx` components for hardcoded "master"/"central"/"franchise" as user-visible strings
- **Result:** **0 leaks found** — all backend terms are consumed as data keys, never rendered as UI labels

---

## 6. Login Context Validation

| Check | Result | Notes |
|-------|--------|-------|
| Uses `restaurant_type_flag` | **PASS** | Line 37-38 in `useLoginContext.js` |
| Derives user level | **PASS** | `HIERARCHY_LEVEL[restaurantType]` → 0/1/2 |
| Derives store scope | **PASS** | `restaurantId` from login response |
| Allowed screens | **PASS** | `canAccessScreen()` consults `SCREEN_VISIBILITY` matrix |
| Hidden screens | **PASS** | `getVisibleNavItems()` filters by type |
| Disabled/blocked actions | **PASS** | `canPerformAction()` consults `ACTION_PERMISSIONS` |
| Login screen NOT redesigned | **PASS** | `LoginPage.jsx` is a minimal form, not a redesign of any existing screen |
| Graceful null-type handling | **PASS** | Defaults to `master` with `restaurantTypeUnknown` flag and warning badge |

### Matrix cross-check vs freeze document

| Screen | Freeze: Central(master) | Code | Freeze: Master(central) | Code | Freeze: Outlet(franchise) | Code | Match |
|--------|------------------------|------|------------------------|------|--------------------------|------|-------|
| SCR-00 | FULL | FULL | FULL | FULL | READ | READ | YES |
| SCR-01 | FULL | FULL | FULL | FULL | LIMITED | LIMITED | YES |
| SCR-02 | FULL | FULL | FULL | FULL | LIMITED | LIMITED | YES |
| SCR-03 | FULL | FULL | FULL | FULL | READ | READ | YES |
| SCR-04 | HIDDEN | HIDDEN | FULL | FULL | FULL | FULL | YES |
| SCR-05 | FULL | FULL | FULL | FULL | LIMITED | LIMITED | YES |
| SCR-06 | FULL | FULL | FULL | FULL | HIDDEN | HIDDEN | YES |
| SCR-07 | FULL | FULL | FULL | FULL | HIDDEN | HIDDEN | YES |
| SCR-09 | FULL | FULL | FULL | FULL | READ | READ | YES |

### Action permission cross-check

| Action | Freeze: Central | Code | Freeze: Master | Code | Freeze: Outlet | Code | Match |
|--------|----------------|------|----------------|------|----------------|------|-------|
| dispatch | YES | true | YES | true | NO | false | YES |
| approve | YES | true | YES | true | NO | false | YES |
| reject | YES | true | YES | true | NO | false | YES |
| request-stock | NO | false | YES | true | YES | true | YES |
| receive | YES | true | YES | true | YES | true | YES |
| cancel | YES | true | YES | true | NO | false | YES |
| adjust-stock | YES | true | NO | false | NO | false | YES |

---

## 7. Screen-by-Screen Validation

### SCR-00 Context Selector
| Check | Result |
|-------|--------|
| Current context displays | PASS — store name + type badge shown |
| Locked terminology mapping | PASS — uses `<StoreTypeBadge>` → adapter |
| Store picker for parent roles | PASS — "Navigate to store" dropdown |
| Locked for franchise | PASS — code checks `isBottomLevel` → shows "Context locked" |
| Read-only notice | PASS — Phase 1 limited slice banner present |
| Invalid context switching blocked | PASS — picker only shows API-returned stores |

### SCR-01 Operations Hub
| Check | Result |
|-------|--------|
| Shell renders | PASS — verified via E2E |
| Pending counts from read API | PASS — uses `getPendingQueues()` only |
| KPI placeholder | PASS — shows "KPI pending backend/owner definition (RPT-003: D)" |
| No fake data | PASS — only counts from real API response |
| My Requests hidden for Central | PASS — `{!isTopLevel && (...)}` guard |
| Dispatch button disabled | PASS — `disabled className="opacity-50"` |
| Locked terminology | PASS |

### SCR-02 Hierarchy Summary
| Check | Result |
|-------|--------|
| Renders correctly | PASS |
| Tab "Master Stores" → API `store_type: "central"` | PASS — `STORE_TYPE_FILTERS.masterStores = "central"` |
| Tab "Outlets" → API `store_type: "franchise"` | PASS — `STORE_TYPE_FILTERS.outlets = "franchise"` |
| Store type badges correct | PASS — E2E verified: `central` → "Master Store", `franchise` → "Outlet" |
| Click-through to Store Detail | PASS — `navigate(\`/store/${id}\`, { state })` |
| Search filter | PASS — client-side filter on `restaurant_name` |

### SCR-03 Store Detail
| Check | Result |
|-------|--------|
| Store info renders | PASS — name from navState fallback + type badge |
| Stock summary table | PASS — renders `child_stock_summary[]` |
| Batch drilldown | PASS — click stock item → re-fetch with `selectedStockTitle` |
| Transactions | PASS — `data.transactions[]` rendered in table |
| Child stores with badges | PASS — E2E verified all badges mapped |
| Mutation actions disabled | PASS — Dispatch + Request buttons disabled with "(blocked)" |
| Loading/empty/error states | PASS — `<LoadingState>`, `<EmptyState>`, `<ErrorState>` used |

### SCR-05 Pending Queues
| Check | Result |
|-------|--------|
| 3 tabs render | PASS — Approvals, Receives, My Requests |
| Approval tab hidden for Outlet | PASS — `{canDo("approve") && (...)}` guard |
| Read-only | PASS — no API mutation calls |
| All action buttons disabled | PASS — `disabled` attribute + "Action blocked" copy |
| Blocked notice banner | PASS — `<BlockedAction>` with correct copy |

### SCR-09 Transfer Detail
| Check | Result |
|-------|--------|
| Transfer header renders | PASS — From/To stores with mapped badges |
| Items/status/timestamps | PASS — line items table, status badge, created_at/updated_at |
| All 6 action buttons disabled | PASS — Approve, Dispatch, Receive, Cancel, Reject, Edit all `disabled` |
| No mutation API call | PASS — only `getTransferDetails(id)` (GET) called |
| Error state for invalid ID | PASS — shows "Transfer not found" on 404/500 |
| Copy text | PASS — "Write API pending / blocked in Phase 1 limited slice" |

---

## 8. API Usage Validation

| # | API Endpoint | Method | Category | Called By | Verified |
|---|-------------|--------|----------|----------|----------|
| 1 | `/proxy/auth/login` | POST | Auth | `api.login()` | Verified read (auth) |
| 2 | `/proxy/v2/inventory-transfer/hierarchy-summary` | POST | Read | `api.getHierarchySummary()` | Verified read |
| 3 | `/proxy/v2/inventory-transfer/hierarchy-detail` | POST | Read | `api.getHierarchyDetail()` | Verified read |
| 4 | `/proxy/v2/inventory-transfer/pending-queues` | POST | Read | `api.getPendingQueues()` | Verified read |
| 5 | `/proxy/v2/inventory-transfer/details/{id}` | GET | Read | `api.getTransferDetails()` | Verified read |

**Not called but defined in api.js (available for future use):**
- `getTransferHistory()` — read, verified
- `getSourceOptions()` — read, verified
- `getInventoryMaster()` — read, verified
- `getFranchiseList()` — read, verified
- `getFranchiseHistory()` — read, verified

**Write APIs:** NONE defined in `api.js`. NONE called by any component. **PASS.**

**Mock/fake data:** NONE. All data comes from live API responses. **PASS.**

---

## 9. Write API Blocking Validation

| Write Operation | In api.js? | Called by component? | UI Button State |
|-----------------|-----------|---------------------|-----------------|
| Create stock transfer (initiate) | NO | NO | N/A |
| Dispatch stock transfer | NO | NO | Disabled with "(write API blocked)" |
| Receive stock transfer | NO | NO | Disabled with "(blocked)" |
| Approve stock request | NO | NO | Disabled with "Action blocked" |
| Reject stock request | NO | NO | Disabled with "Action blocked" |
| Partial approve | NO | NO | N/A |
| Stock adjustment | NO | NO | N/A (screen not in Slice 1) |
| Wastage | NO | NO | N/A (screen not in Slice 1) |
| Return | NO | NO | N/A |
| Inward stock write | NO | NO | N/A |
| Unit conversion mutation | NO | NO | N/A |

**Result: PASS** — No write operations exist in any form.

---

## 10. Real-Time Readiness Validation

| Check | Result |
|-------|--------|
| Hook exists | YES — `useCentralInventoryRealtime.js` |
| Is no-op/placeholder | YES — `enabled` defaults to `false`, body is no-op |
| Not falsely claimed complete | CORRECT — comments state "DO NOT enable until backend event contract is confirmed" |
| Not used by any component | CORRECT — no component imports this hook |
| Documents required events | YES — 4 event names listed as pending confirmation |

**Result: PASS**

---

## 11. Build/Test/Lint Result

| Check | Result |
|-------|--------|
| Webpack compilation | `Compiled successfully! webpack compiled successfully` |
| ESLint (frontend) | `✅ No issues found` |
| Ruff (backend) | `All checks passed!` |
| Supervisor: backend | RUNNING |
| Supervisor: frontend | RUNNING |
| Runtime errors | None (Watchpack ENOSPC warnings are non-fatal in container) |

**Result: PASS**

---

## 12. Documentation Validation

### Handover Document
**Path:** `/app/memory/central_inventory/CENTRAL_INVENTORY_FRONTEND_SLICE_1_HANDOVER.md`

| Required Section | Present | Accurate |
|-----------------|---------|----------|
| Files changed | YES | YES — 22 files listed |
| Screens added | YES | YES — 6 screens + layout + common |
| APIs used | YES | YES — 6 read APIs listed |
| Blocked write actions | YES | YES — 10 blocked actions listed |
| Real-time readiness status | YES | YES — placeholder, no-op |
| Login context details | YES | YES — documents type_flag fallback |
| Terminology adapter details | YES | YES — core map + inversion noted |
| Known gaps | YES | YES — 6 gaps documented |
| Next recommended slice | YES | YES — Slice 2 scope defined |
| QA checklist | YES | Points to separate document |

### QA Checklist Document
**Path:** `/app/memory/central_inventory/CENTRAL_INVENTORY_FRONTEND_SLICE_1_QA_CHECKLIST.md`

| Required Check | Present |
|----------------|---------|
| 16-item checklist | YES |
| API call verification table | YES |
| Write API non-call verification | YES |
| Test results summary | YES |

**Result: PASS**

---

## 13. Issues Found

### Minor Notes (non-blocking)

| # | Issue | Severity | Impact |
|---|-------|----------|--------|
| 1 | **Backend proxy supports PUT/DELETE methods** — `api_route` accepts all methods, though frontend never calls write methods through it. Not a vulnerability since backend is a pass-through proxy and the external API enforces auth. | LOW | None in Slice 1; consider restricting to GET/POST for defense-in-depth in future. |
| 2 | **Test account lacks `restaurant_type_flag`** — defaults to `master` (Central Store) with warning badge. Cannot validate Master Store or Outlet login contexts without proper test credentials. | MEDIUM | Cannot fully validate role-specific UI gating. Documented as known gap. |
| 3 | **hierarchy-detail API does not return store name/type** — frontend uses React Router navigation state as fallback. Direct URL access to `/store/:id` shows "Store #ID" instead of the actual name. | LOW | UX polish; data integrity unaffected. |

### Zero Issues Found For:
- Locked terminology mapping implementation
- Write API blocking
- Raw backend term leaks
- Fake data / mock mutations
- Login screen redesign
- Business rule changes
- Real-time false completion claims

---

## 14. Blockers Before Slice 2

| # | Blocker | Owner/Team | Impact |
|---|---------|------------|--------|
| 1 | **Test credentials with `restaurant_type_flag`** for `central` (Master) and `franchise` (Outlet) accounts | Owner / Backend team | Cannot validate role-specific screen visibility, Approval tab hiding, and My Requests hiding in live environment |
| 2 | **UNIT_CONVERSION_NOT_DEFINED** backend fix | Backend team | Blocks all write-form integration testing even for Slice 2 form shells |
| 3 | **Operations Hub KPIs** (RPT-003: D) | Owner | KPI cards remain placeholders until specified |

---

## 15. Recommended Next Action

1. **Accept Slice 1** — Implementation meets all pass criteria.
2. **Provide test credentials** with `restaurant_type_flag` values for all 3 levels — this is the single most impactful unblock for validating role-specific behavior.
3. **Slice 2 can start** for:
   - Write-form UI shells (disabled submit) for Request Stock, Dispatch Wizard, Receive Stock
   - Reports Dashboard (read APIs available)
   - Date range filters
4. **Do not start** write API integration until UNIT_CONVERSION_NOT_DEFINED is fixed.

---

*End of QA Validation Report*
