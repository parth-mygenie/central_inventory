# Central Inventory - PRD

## Original Problem Statement
User requested to wipe /app and pull the repo `https://github.com/parth-mygenie/central_inventory.git` (branch `25_5_26_AJ`) as-is, without any modifications or tests. Just pull and run.

Subsequently requested FULL UI/API integration diagnosis across ALL Central Inventory screens after seed shutdown.

## Architecture & Tech Stack
- **Frontend**: React 19 with CRACO, Tailwind CSS, Radix UI components, Recharts
- **Backend**: FastAPI (Python) with Motor (async MongoDB driver) — acts as proxy to POS API
- **Database**: MongoDB (token sessions only — no seed data)
- **External API**: Proxies to `preprod.mygenie.online` V1 (auth) and V2 (all inventory ops)

## What Was Done
- **Date**: May 25, 2026
- Wiped existing /app, cloned repo from branch `25_5_26_AJ`
- Set up environment (.env files, dependencies, services)
- Conducted FULL UI/API integration diagnosis — NO code changes made

## Diagnosis Summary (25 May 2026)
- **14 distinct integration failures** identified across 11 screens
- **5 CRITICAL**: Direct Dispatch, Request Stock, Stock Adjustment, Wastage Entry, Transfer Detail
- **5 HIGH**: Source options field mapping, stock quantity fields, resolution_meta JSON string
- **3 MEDIUM**: Missing restaurant names in history, store name gaps
- **1 LOW**: Missing unit_id field
- Full diagnosis report: `/app/memory/central_inventory/CENTRAL_INVENTORY_FULL_UI_API_INTEGRATION_DIAGNOSIS.md`

## Prioritized Backlog

### P0 — Critical (5 screens broken)
1. Fix `hierarchy-summary` mandatory `store_type` parameter
2. Fix Transfer Detail response shape unwrapping (`data.transfer` + `data.lines`)
3. Fix `source-options` field name mapping (`inventory_master_id` → `source_inventory_master_id`)
4. Discover real POS endpoints for `add-stock` and `record-wastage` (current routes 404)
5. Fix `decrease-adjustment` missing `restaurant_id` in payload

### P1 — High (data gaps)
6. Fix transfer line field mapping (`source_stock_title`, `requested_qty`)
7. JSON.parse `resolution_meta` before accessing properties
8. Fix Wastage Report response unwrapping (`data.wastage_records`)
9. Fix hierarchy-detail stock quantity field mapping

### P2 — Medium (display gaps)
10. Resolve restaurant names for transfer history
11. Handle missing `unit_id` from inventory master
