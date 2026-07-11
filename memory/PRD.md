# Central Inventory - PRD

## Overview
Central Inventory management system by MyGenie — multi-store hierarchy stock management module for the MyGenie POS platform.
Cloned from `https://github.com/parth-mygenie/central_inventory.git`, branch `bug_fix_plan_11_07`.

## Tech Stack
- **Backend**: Python FastAPI proxy to preprod.mygenie.online (zero business logic)
- **Frontend**: React 19 + Craco + Tailwind CSS + Radix UI (shadcn)
- **Database**: MongoDB (local, minimal usage — backend is proxy)

## Architecture
- Backend acts as API proxy to preprod.mygenie.online APIs
- Frontend is a full inventory management UI with hierarchy, stock, catalogues, POs, production, wastage, transfers

## What's Been Implemented (Jul 11, 2026)

### Session 1: BUG-038→045 IMPLEMENTATION + QA — ALL 8/8 PASS
| Bug | Title | Status |
|-----|-------|:------:|
| BUG-038 | PO List Items Column Removed | QA_PASS |
| BUG-039 | Merged vendor dropdown (history + non-history) | QA_PASS |
| BUG-040 | Indirect outlet label with parent name | QA_PASS |
| BUG-041 | useRestaurantMap parent resolution fallback | QA_PASS |
| BUG-042 | Per-restaurant closing_stock in consumption report | QA_PASS |
| BUG-043 | min=0 on PO qty inputs | QA_PASS |
| BUG-044 | Payment/Total hidden before Receive Goods | QA_PASS |
| BUG-045 | Dispatched tab in Pending Queues | QA_PASS |

## Known API Gaps
- BUG-041: POS API doesn't return `parent_restaurant_name` in login or `from_restaurant_name` in transfer detail for outlets. Workaround: show "Parent Store" with type badge.

## Next Tasks
1. Owner smoke testing for BUG-038→045
2. Consider backend enhancement request for parent name resolution
