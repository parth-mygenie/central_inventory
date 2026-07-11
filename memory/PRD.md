# Central Inventory - PRD

## Overview
Central Inventory management system by MyGenie — multi-store hierarchy stock management module.
Branch: `bug_fix_plan_11_07`

## Tech Stack
- **Backend**: Python FastAPI proxy to preprod.mygenie.online
- **Frontend**: React 19 + Craco + Tailwind CSS + Radix UI (shadcn)

## What's Been Implemented (Jul 11, 2026)

### Session 1: BUG-038→045 — ALL 8/8 QA PASS
PO Items column removed, merged vendor dropdown, indirect outlet labels, restaurantMap parent resolution, per-restaurant closing_stock, min=0 qty inputs, payment/total hidden pre-receive, Dispatched tab in Pending Queues.

### Session 2: Indirect Outlets API Wiring + Push Always Visible
- **Wired 4 new API fields** from `franchise/list`: `isDirectChild`, `hierarchyLink`, `managingParentRestaurantId`, `managingParentName`
- **Removed ~75 lines** of workaround code (shell merge, secondary fetch, allStores state)
- **Push button always visible** on all stores (table row + expanded detail) — not just stale
- **Email now shows** for indirect outlets (was "—", now `hkoutletnorth@test.com`)
- **Single-call health** via `store_stock_health` replaces N parallel API calls
- **managingParentName** used directly in expanded detail ("managed by HK Alpha Central")

### Files Modified This Session
| File | Changes |
|------|---------|
| `api.js` | `normalizeHierarchyChild` +4 fields, `_getHierarchyDetail` +includeStockHealthSummary param |
| `StoreManagement.jsx` | Removed allStores/displayChildren/secondary fetch, isDirectChild replace, push always visible, single health call |

## Next Tasks
- Owner smoke testing
- Consider registering indirect outlets work as formal CR item
