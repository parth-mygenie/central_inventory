# Central Inventory - PRD

## Overview
Central Inventory management system by MyGenie — multi-store hierarchy stock management module.
Branch: `bug_fix_plan_11_07`

## Tech Stack
- **Backend**: Python FastAPI proxy to preprod.mygenie.online
- **Frontend**: React 19 + Craco + Tailwind CSS + Radix UI (shadcn)

## What's Been Implemented (Jul 11, 2026)

### Session 1: BUG-038→045 — ALL 8/8 QA PASS
| Bug | Title | Status |
|-----|-------|:------:|
| BUG-038 | PO List Items Column Removed | QA_PASS |
| BUG-039 | Merged vendor dropdown | QA_PASS |
| BUG-040 | Indirect outlet label | QA_PASS |
| BUG-041 | useRestaurantMap parent resolution | QA_PASS |
| BUG-042 | Per-restaurant closing_stock | QA_PASS |
| BUG-043 | min=0 on PO qty inputs | QA_PASS |
| BUG-044 | Payment/Total hidden pre-receive | QA_PASS |
| BUG-045 | Dispatched tab in Pending Queues | QA_PASS |

### Session 2: INVESTIGATION + FIX — Indirect Outlets Data
- **Issue**: Central Store (master) saw "—" for Push Status and Stock Health on indirect outlets (grandchildren)
- **Root cause**: Push status + health data only fetched for direct children; indirect outlets added as shell objects without data
- **Fix**: Added secondary fetch for indirect outlets' push status + health once discovered via hierarchy-detail. Fixed race condition (state merger pattern).
- **Result**: Indirect outlets now show push status (e.g., "19 items not pushed" + Push button) and OOS/Low/OK counts. Email still "—" (API gap).

## Known API Gaps
- Email for indirect outlets: `franchise/list` only returns direct children. No API provides email for indirect outlets.
- BUG-041: `from_restaurant_name` not in transfer detail API for outlets.

## Next Tasks
- Owner smoke testing
- Register indirect outlets fix as formal BUG item if desired
