# Central Inventory - PRD

## Overview
Central Inventory management system by MyGenie — multi-store hierarchy stock management module for the MyGenie POS platform.
Cloned from `https://github.com/parth-mygenie/central_inventory.git`, branch `bug_fix_plan_11_07`.

## Tech Stack
- **Backend**: Python FastAPI proxy to preprod.mygenie.online (zero business logic)
- **Frontend**: React 19 + Craco + Tailwind CSS + Radix UI (shadcn)
- **Database**: MongoDB (local, minimal usage — backend is proxy)
- **Other**: recharts, react-router-dom, axios, zod, react-hook-form

## Architecture
- Backend acts as API proxy to preprod.mygenie.online APIs
- Frontend is a full inventory management UI with:
  - Login/Auth (MyGenie vendor accounts)
  - Hierarchy management, stock inventory, product/recipe catalogues
  - Purchase orders, production runs, wastage reports
  - Transfer/dispatch workflows, pending queues
  - Daily consumption reports, stock detail panels

## What's Been Implemented (Jul 11, 2026)
### Session: BUG-038→045 IMPLEMENTATION
- **BUG-038**: Removed empty "Items" column from PO List
- **BUG-039**: Merged vendor dropdown in PO Create (history + non-history)
- **BUG-040**: Indirect outlets show "Managed by {parent}" label
- **BUG-041**: useRestaurantMap enhanced with hierarchy-detail for parent resolution
- **BUG-042**: Consumption report uses per-restaurant closing_stock in multi-store
- **BUG-043**: min="0" on PO qty inputs
- **BUG-044**: Payment/Total hidden before Receive Goods stage
- **BUG-045**: Dispatched tab added to Pending Queues

## Prioritized Backlog
- P0: None
- P1: QA pass for BUG-038→045
- P2: POS preprod credential verification (returned "Invalid credentials")

## Next Tasks
1. QA role for BUG-038→045 (browser verification per Verification Matrix)
2. Owner smoke testing for verified items
