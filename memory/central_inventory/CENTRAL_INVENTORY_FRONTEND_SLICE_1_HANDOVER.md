# Central Inventory — Frontend Slice 1 Handover

> **Date:** May 2026
> **Author:** Frontend Implementation Agent
> **Slice:** Phase 1 Limited — Read-Only Foundation

---

## 1. What Was Implemented

### Foundational Infrastructure
1. **Terminology Adapter** (`/app/frontend/src/lib/terminology.js`)
   - Central mapping: `TERM_MAP`, `mapRestaurantType()`, `mapStoreTypeFilter()`
   - Status/badge color configurations
   - `scanForTerminology()` dev utility
   - API filter inversion mapping (UI "Master Stores" → backend `"central"`)

2. **Login Context Hook** (`/app/frontend/src/hooks/useLoginContext.js`)
   - Derives user level from `restaurant_type_flag`
   - Token management (localStorage persistence)
   - Screen/action permission helpers bound to user type
   - Graceful fallback when `restaurant_type_flag` is null (defaults to `master`/Central)

3. **Screen Visibility Matrix** (`/app/frontend/src/lib/screenVisibility.js`)
   - Full visibility matrix for all 23 screens
   - Action permission matrix for 10+ actions
   - Navigation item filtering per user type
   - Utility functions: `canAccessScreen()`, `canPerformAction()`, `getVisibleNavItems()`

4. **API Service Layer** (`/app/frontend/src/services/api.js`)
   - Centralized Axios client with token management
   - All verified read API methods
   - No write API methods (intentionally omitted)

5. **Real-time Placeholder** (`/app/frontend/src/hooks/useCentralInventoryRealtime.js`)
   - No-op hook prepared for future WebSocket/polling
   - Documents required socket event names

### Backend
6. **API Proxy** (`/app/backend/server.py`)
   - Auth proxy: `POST /api/proxy/auth/login` → preprod V1 login
   - V2 proxy: `/api/proxy/v2/{path}` → preprod V2 vendoremployee APIs
   - Supports GET/POST/PUT/DELETE with auth header forwarding

### Screens Implemented
7. **SCR-00 Context Selector** (`ContextSelector.jsx`)
   - Shows user level badge (Central Store / Master Store / Outlet)
   - Store picker for parent roles (fetches from hierarchy-detail)
   - Locked indicator for Outlet users
   - Read-only mode notice

8. **SCR-01 Operations Hub** (`OperationsHub.jsx`)
   - Pending counts: Approvals, Receives, My Requests
   - Quick action cards: View Hierarchy, Pending Queues
   - KPI placeholder (RPT-003: D pending owner spec)
   - Disabled write action buttons with blocker labels

9. **SCR-02 Hierarchy Summary** (`HierarchySummary.jsx`)
   - Tab filter: "Master Stores" / "Outlets" (inverted API mapping)
   - Store list with sent/received/transaction counts
   - Search filter
   - Click-through to Store Detail with navigation state

10. **SCR-03 Store Detail** (`StoreDetail.jsx`)
    - Store header with name + type badge
    - Child stores navigation (with correct terminology badges)
    - Stock summary table with low-stock highlighting
    - Batch drilldown (click stock item to load batches)
    - Recent transactions table
    - Disabled Dispatch/Request buttons

11. **SCR-05 Pending Queues** (`PendingQueues.jsx`)
    - 3 tabs: Approvals, Receives, My Requests
    - Approval tab hidden for Outlet users
    - All action buttons disabled with blocked labels
    - Blocked action banner

12. **SCR-09 Transfer Detail** (`TransferDetail.jsx`)
    - From/To store info with mapped badges
    - Status badge, metadata, timestamps
    - Line items table
    - All action buttons disabled (Approve, Dispatch, Receive, Cancel, Reject, Edit)

### Layout
13. **App Layout** — Sidebar + Header + Content area
14. **Login Page** — Minimal login form (not redesigned)
15. **Common Components** — StateDisplays (Loading, Empty, Error, PermissionDenied, BlockedAction), Badges (StoreTypeBadge, StatusBadge)

---

## 2. Files Changed

| File | Action | Purpose |
|------|--------|---------|
| `/app/backend/.env` | Created | Environment variables for API proxy |
| `/app/backend/server.py` | Modified | Added API proxy endpoints |
| `/app/frontend/.env` | Created | REACT_APP_BACKEND_URL |
| `/app/frontend/src/App.js` | Rewritten | Route structure, LoginContextProvider |
| `/app/frontend/src/App.css` | Rewritten | Minimal styles |
| `/app/frontend/src/lib/terminology.js` | Created | Terminology adapter |
| `/app/frontend/src/lib/screenVisibility.js` | Created | Screen visibility matrix |
| `/app/frontend/src/services/api.js` | Created | API service layer |
| `/app/frontend/src/hooks/useLoginContext.js` | Created | Login context provider |
| `/app/frontend/src/hooks/useCentralInventoryRealtime.js` | Created | Real-time placeholder |
| `/app/frontend/src/components/layout/AppHeader.jsx` | Created | Header with badges |
| `/app/frontend/src/components/layout/Sidebar.jsx` | Created | Navigation sidebar |
| `/app/frontend/src/components/layout/AppLayout.jsx` | Created | Layout shell |
| `/app/frontend/src/components/layout/LoginPage.jsx` | Created | Login page |
| `/app/frontend/src/components/common/StateDisplays.jsx` | Created | Loading/Empty/Error states |
| `/app/frontend/src/components/common/Badges.jsx` | Created | Store type & status badges |
| `/app/frontend/src/components/central-inventory/ContextSelector.jsx` | Created | SCR-00 |
| `/app/frontend/src/components/central-inventory/OperationsHub.jsx` | Created | SCR-01 |
| `/app/frontend/src/components/central-inventory/HierarchySummary.jsx` | Created | SCR-02 |
| `/app/frontend/src/components/central-inventory/StoreDetail.jsx` | Created | SCR-03 |
| `/app/frontend/src/components/central-inventory/PendingQueues.jsx` | Created | SCR-05 |
| `/app/frontend/src/components/central-inventory/TransferDetail.jsx` | Created | SCR-09 |

---

## 3. API Endpoints Used

| API | Method | Purpose | Status |
|-----|--------|---------|--------|
| `/api/v1/auth/vendoremployee/common-login` | POST | Login | Verified working |
| `/inventory-transfer/hierarchy-summary` | POST | Store list | Verified working |
| `/inventory-transfer/hierarchy-detail` | POST | Store detail + stock | Verified working |
| `/inventory-transfer/pending-queues` | POST | Pending queues | Verified working |
| `/inventory-transfer/details/{id}` | GET | Transfer detail | Verified (404 for non-existent) |
| `/inventory-transfer/history` | POST | Transfer history | Verified working |

**No write APIs are called.**

---

## 4. Blocked Write Actions

All of these are shown as disabled buttons with blocker labels:
1. Create stock transfer (UNIT_CONVERSION_NOT_DEFINED)
2. Dispatch stock transfer
3. Receive stock transfer
4. Approve stock request
5. Reject stock request
6. Cancel transfer
7. Edit transfer
8. Stock adjustment (API missing)
9. Wastage entry (API needs rework)
10. Return flow (API unclear)

---

## 5. Real-Time Readiness

- **Status**: Placeholder hook created (`useCentralInventoryRealtime`)
- **Implementation**: No-op — disabled until backend event contract confirmed
- **Required socket events** (not yet confirmed):
  - `inventory.transfer.status_changed`
  - `inventory.stock.low_alert`
  - `inventory.stock.updated`
  - `inventory.transfer.new_request`

---

## 6. Login Context Implementation

- **Source**: `restaurant_type_flag` from login response
- **Mapping**: `master` → Central (TOP), `central` → Master (MIDDLE), `franchise` → Outlet (BOTTOM)
- **Fallback**: When type flag is null, defaults to `master` with warning badge
- **Known Gap**: Test account `abhishek@kalabahia.com` does not return `restaurant_type_flag`
- **Blocker**: Need test credentials with proper `restaurant_type_flag` for full context derivation testing

---

## 7. Terminology Adapter Details

- **Location**: `/app/frontend/src/lib/terminology.js`
- **Core map**: `{ master: "Central Store", central: "Master Store", franchise: "Outlet" }`
- **Critical inversion**: UI "Master Stores" tab → API `store_type: "central"`
- **Used in**: All screens, badges, filter labels, navigation
- **No raw backend terms displayed anywhere in UI**

---

## 8. Known Gaps

1. **Test credentials**: Need accounts with `restaurant_type_flag` = `central` and `franchise` to test Master/Outlet login contexts
2. **Transfer Detail**: Backend returns 500 (not 404) for non-existent transfer IDs — handled as "Transfer not found" in frontend
3. **Hierarchy Detail**: Does not return `store_restaurant_name` or `restaurant_type` — using navigation state fallback
4. **Operations Hub KPIs**: Pending owner specification (RPT-003: D)
5. **Stock quantities**: Some items show no quantity (may need data seeding in preprod)
6. **Pending queues**: Empty in current test environment (no active transfers exist)

---

## 9. Next Recommended Slice

**Phase 1 Slice 2** should focus on:
1. Write-form UX shells (disabled submit, but complete form UI):
   - SCR-04 Request Stock form
   - SCR-07 Dispatch Wizard form
   - SCR-10 Receive Stock form
2. SCR-20 Reports Dashboard (read APIs available)
3. Token masking in API Verification Tool (SEC-001)
4. Date range filters on hierarchy summary and transactions

**Blocked until**:
- Backend fixes UNIT_CONVERSION_NOT_DEFINED
- Owner specifies Operations Hub KPIs

---

## 10. QA Checklist

See: `/app/memory/central_inventory/CENTRAL_INVENTORY_FRONTEND_SLICE_1_QA_CHECKLIST.md`

---

## 11. Assumptions

1. Login page NOT redesigned (as per scope)
2. When `restaurant_type_flag` is null, default to `master` (Central Store) for demo purposes
3. Transfer detail returns 500 for non-existent IDs (backend behavior) — treated same as 404
4. The existing login credential (`abhishek@kalabahia.com`) is a manager account that authenticates but lacks hierarchy type flag

---

## 12. Screen-by-Screen Approval Trail

| # | Module | Status | Notes |
|---|--------|--------|-------|
| 1 | Terminology Adapter | Implemented | TERM_MAP + all mapping functions |
| 2 | Login Context Hook | Implemented | With null-type fallback |
| 3 | Route Structure | Implemented | 5 routes + login + catch-all |
| 4 | SCR-00 Context Selector | Implemented | Embedded in Operations Hub |
| 5 | SCR-01 Operations Hub | Implemented | Pending counts + KPI placeholder |
| 6 | SCR-02 Hierarchy Summary | Implemented | Both tabs with inverted mapping |
| 7 | SCR-03 Store Detail | Implemented | Stock + batches + transactions |
| 8 | SCR-05 Pending Queues | Implemented | 3 tabs, all actions blocked |
| 9 | SCR-09 Transfer Detail | Implemented | Full detail view, all actions blocked |

---

*End of Frontend Slice 1 Handover*
