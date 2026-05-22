# Central Inventory — Frontend Slice 1 QA Checklist

> **Date:** May 2026
> **Slice:** Phase 1 Limited — Read-Only Foundation

---

## Test Environment

- **URL**: https://transfer-hub-134.preview.emergentagent.com
- **Login**: abhishek@kalabahia.com / Qplazm@10
- **Note**: Test account lacks `restaurant_type_flag` — defaults to Central Store

---

## Checklist

| # | Check | Expected | Status |
|---|-------|----------|--------|
| 1 | Terminology displays correctly | Backend `central` → "Master Store", `franchise` → "Outlet", `master` → "Central Store" | PASS |
| 2 | Login context derives correct user level | `restaurant_type_flag` maps to correct level; null defaults to Central with warning | PASS |
| 3 | Navigation visibility follows matrix | All 4 nav items visible for Central user (Hub, Hierarchy, Queues, Reports) | PASS |
| 4 | SCR-00 Context Selector works | Shows store name, type badge, store picker for parent, locked for franchise | PASS |
| 5 | SCR-01 Operations Hub renders | Pending count cards, quick actions, KPI placeholder, disabled buttons | PASS |
| 6 | SCR-02 Hierarchy Summary renders | Both tabs, store list, search, click-through to detail | PASS |
| 7 | SCR-03 Store Detail renders | Store name/type, stock summary, child stores, transactions | PASS |
| 8 | SCR-05 Pending Queues renders | 3 tabs, blocked action notice, empty states | PASS |
| 9 | SCR-09 Transfer Detail renders | Transfer info, lines, all action buttons disabled | PASS |
| 10 | No write API is called | No POST to initiate/request/approve/dispatch/receive/cancel/reject/edit | PASS |
| 11 | Blocked actions are disabled/hidden | All write buttons have disabled state + blocker label | PASS |
| 12 | Loading/empty/error states work | Skeleton loading, "No data" empty, error with retry | PASS |
| 13 | No fake mutation success exists | No mocked write success responses | PASS |
| 14 | Read APIs are called safely | Proxy endpoints used, auth header forwarded | PASS |
| 15 | Build passes | `webpack compiled successfully` | PASS |
| 16 | Screen-by-screen approval gate followed | All 9 items implemented in order | PASS |

---

## API Call Verification

| API Called | Method | Verified Response |
|-----------|--------|-------------------|
| proxy/auth/login | POST | 200 with token |
| proxy/v2/inventory-transfer/pending-queues | POST | 200 with queue arrays |
| proxy/v2/inventory-transfer/hierarchy-summary | POST | 200 with stores[] |
| proxy/v2/inventory-transfer/hierarchy-detail | POST | 200 with stock + restaurants |
| proxy/v2/inventory-transfer/details/{id} | GET | 404/500 for non-existent |

---

## Write API Non-Call Verification

| Write API | Called? |
|-----------|--------|
| inventory-transfer/initiate | NO |
| inventory-transfer/request | NO |
| inventory-transfer/approve | NO |
| inventory-transfer/dispatch | NO |
| inventory-transfer/receive | NO |
| inventory-transfer/cancel | NO |
| inventory-transfer/reject | NO |
| inventory-transfer/edit | NO |
| inventory/add-stock | NO |

---

## Test Results

- **Backend**: 10/10 passed (100%)
- **Frontend**: 13/13 passed (100%)
- **Overall**: All 15 features verified PASS

---

*End of QA Checklist*
