# Central Inventory — PRD

## Original Problem Statement
Wipe current /app, pull https://github.com/parth-mygenie/central_inventory.git branch 26_5_26, and run as-is.

## Architecture
- **Backend**: FastAPI (Python) — acts as a proxy to MyGenie POS API (preprod.mygenie.online)
- **Frontend**: React 19 (CRA + craco) + Tailwind CSS + shadcn/ui (Radix primitives)
- **Database**: MongoDB (motor async driver) — stores token sessions and status checks
- **Auth**: Proxied through MyGenie POS API (`/api/v1/auth/vendoremployee/common-login`)

## What's Been Implemented

### 26 May 2026 — Initial Deploy
- Cloned repo from branch `26_5_26` into /app, both services running

### 26 May 2026 — Transfer 82 Dispatch Diagnosis
- Root cause: legacy `filter_bucket/without_batch_and_expiry` selector on request, stock in `with_batch_and_expiry` only
- Fix: edit → re-approve → dispatch

### 26 May 2026 — P12/P14 Canonical Request Stock Migration (CURRENT)
- **Removed SourceSelector from RequestStockForm** — requester no longer owns batch/segment/bucket selection
- **Omit `source_selector` from request payload** — sender allocates at dispatch via auto-FEFO
- **Availability informational only** — "Source has ~X (indicative)", does NOT block submit when 0
- **SourceSelector preserved in DirectDispatchForm** — dispatch still needs segment selection for own-store stock
- **Verified end-to-end:** Transfer #89 (curl) + #96 (UI test) — request without selector → approve → dispatch auto-FEFO → 200 OK
- **Testing:** 10/10 backend + 13/13 frontend PASS

### Selector Ownership (P14 Contract)
| Actor | Owns | API |
|-------|------|-----|
| Requester (franchise/central) | Source store, SKU, quantity | `POST /request` |
| Sender (central/parent) | Batch/segment/FEFO allocation | `POST /edit/{id}`, `POST /dispatch/{id}` |

## Tested Credentials
| Email | Password | rid | type |
|-------|----------|-----|------|
| abhishek@kalabahia.com | Qplazm@10 | 1 | master |
| owner@democentral1.com | Qplazm@10 | 781 | central |
| owner@democentral2.com | Qplazm@10 | 782 | central |
| owner@demofranchise1.com | Qplazm@10 | 783 | franchise |
| owner@demofranchise4.com | Qplazm@10 | 786 | franchise |

## Backlog / Next Tasks
- P1: Central dispatch UI — `source-options` → optional `edit` with `segment_id` → `dispatch` (sender-side selector UX)
- P2: `reserve_on_approve=true` testing — verify auto-FEFO reserve at approve time
- P2: Production deployment configuration
