# Central Inventory — PRD

## Original Problem Statement
Wipe current /app, pull https://github.com/parth-mygenie/central_inventory.git branch 26_5_26, and run as-is.

## Architecture
- **Backend**: FastAPI (Python) — acts as a proxy to MyGenie POS API (preprod.mygenie.online)
- **Frontend**: React 19 (CRA + craco) + Tailwind CSS + shadcn/ui (Radix primitives)
- **Database**: MongoDB (motor async driver) — stores token sessions and status checks
- **Auth**: Proxied through MyGenie POS API (`/api/v1/auth/vendoremployee/common-login`)

## Core Features
- Login via MyGenie vendor credentials
- Inventory hierarchy summary & detail views
- Pending transfer queues
- Transfer management (initiate, approve, reject, dispatch, receive, cancel)
- Request Stock 3-step flow (sources → catalog → request)
- Stock adjustments (increase/decrease)
- Wastage recording & reporting
- Transfer history with date filtering

## What's Been Implemented

### 26 May 2026 — Initial Deploy
- Cloned repo from branch `26_5_26` into /app
- Backend + Frontend dependencies installed and running
- Both services verified operational

### 26 May 2026 — Transfer 82 Dispatch Diagnosis
- **Issue:** `POST /dispatch/82` returned `400 SELECTED_BUCKET_STOCK_NOT_FOUND`
- **Root cause:** Request saved with `filter_bucket/without_batch_and_expiry` but ALL stock at C782 for red meat exists only in `with_batch_and_expiry` segments
- **Fix applied operationally:** Edit (segment_id:23) → Re-approve → Dispatch → 200 OK
- **Docs updated:** `full_api_flow_curls.sh` + `api_implementation_status.md`

### 26 May 2026 — Request Stock Selector Fix (Frontend)
- **Problem:** `RequestStockForm.jsx` hardcoded `DEFAULT_SOURCE_SELECTOR` as `filter_bucket/without_batch_and_expiry` for ALL requests
- **Fix implemented:**
  - Removed `DEFAULT_SOURCE_SELECTOR` constant
  - Integrated `SourceSelector` per item row (same as `DirectDispatchForm`)
  - Per-row `sourceSelector` state — each item has own selector
  - Submit button disabled until all rows have selector selected
  - `SourceSelector` handles UNAUTHORIZED (403) by falling back to bucket picker with warning
  - Fixed bucket payload shape (`bucket` key instead of `filter_bucket`)
- **Testing:** 15/15 backend + 12/12 frontend tests PASS
- **Files changed:** `RequestStockForm.jsx`, `SourceSelector.jsx`
- **No backend changes** — preserved existing proxy/contracts

## Environment
- `MONGO_URL` = local MongoDB
- `DB_NAME` = test_database
- `REACT_APP_BACKEND_URL` = https://stock-central-28.preview.emergentagent.com
- Backend proxies to `PREPROD_API_BASE_V1` / `PREPROD_API_BASE_V2` (defaults to preprod.mygenie.online)

## Tested Credentials
| Email | Password | rid | type |
|-------|----------|-----|------|
| abhishek@kalabahia.com | Qplazm@10 | 1 | master |
| owner@democentral1.com | Qplazm@10 | 781 | central |
| owner@democentral2.com | Qplazm@10 | 782 | central |
| owner@demofranchise1.com | Qplazm@10 | 783 | franchise |
| owner@demofranchise4.com | Qplazm@10 | 786 | franchise |

## Backlog / Next Tasks
- P1: Retry UX when SELECTED_BUCKET_STOCK_NOT_FOUND at submit (currently shows generic toast — suggest trying different bucket)
- P1: End-to-end request→approve→dispatch test with new selector flow
- P2: Show filter counts in bucket picker when source-options data unavailable (requires backend proxy enhancement)
- P2: Production deployment configuration
