# Central Inventory - PRD

## Overview
Central Inventory management system by MyGenie — multi-store hierarchy stock management module.
Branch: `bug_fixes_before_gaps_filled` (pulled fresh 2026-07-11, /app wiped and repo re-pulled; .env files recreated per control/L5_ENV_CONFIG_REGISTRY.md; backend+frontend running via supervisor)

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

## 2026-07-11 — PLANNING session (Gap Adoption)
- CR-037→044 registered (PLANNED) from AI/openGaps/gap_validation.md; combined Gate 2+3 artifacts in control/sessions/
- L9 gaps register synced; L1 dashboard updated; awaiting owner Gate 4 GO
