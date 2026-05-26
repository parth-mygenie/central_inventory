# Central Inventory — PRD

## Original Problem Statement
Wipe current /app, pull https://github.com/parth-mygenie/central_inventory.git branch 26_5_26, and run as-is.

## Architecture
- **Backend**: FastAPI (Python) — proxy to MyGenie POS API (preprod.mygenie.online)
- **Frontend**: React 19 (CRA + craco) + Tailwind CSS + shadcn/ui (Radix primitives)
- **Database**: MongoDB (motor async driver) — token sessions + status checks
- **Auth**: Proxied through MyGenie POS API

## What's Been Implemented

### 26 May 2026 — Initial Deploy
- Cloned repo from branch `26_5_26`, both services running

### 26 May 2026 — Transfer 82 Dispatch Diagnosis
- Root cause: legacy selector mismatch. Fix: edit → re-approve → dispatch

### 26 May 2026 — P12/P14 Canonical Request Stock Migration
- Removed SourceSelector from RequestStockForm (requester doesn't own allocation)
- source_selector omitted on request; sender auto-FEFO at dispatch
- Verified e2e: Transfer #89 (curl) + #96 (UI test)
- 10/10 backend + 13/13 frontend PASS

### 26 May 2026 — P16 Frontend Planning & Risk Assessment
- Deep architecture analysis for refined request-line lifecycle (P16)
- Identified 12 critical assumption violations, 5 CRITICAL risks, 8 HIGH risks
- Proposed 4-phase incremental migration (foundation → line rendering → partial approve → franchise lifecycle)
- Document: `AI/Plans/phase2/P16_frontend_planning_risk_assessment.md`
- No code changes — planning document only

## Tested Credentials
| Email | Password | rid | type |
|-------|----------|-----|------|
| abhishek@kalabahia.com | Qplazm@10 | 1 | master |
| owner@democentral1.com | Qplazm@10 | 781 | central |
| owner@democentral2.com | Qplazm@10 | 782 | central |
| owner@demofranchise1.com | Qplazm@10 | 783 | franchise |
| owner@demofranchise4.com | Qplazm@10 | 786 | franchise |

## Backlog / Next Tasks
- P0 (P16 Phase 0): Add status config, API methods, line normalization (non-breaking foundation)
- P0 (P16 Phase 1): TransferDetail line-level rendering with meta_json.approval
- P1 (P16 Phase 2): ApproveWaveDialog for central partial approve
- P2 (P16 Phase 3): Cancel-remainder + second wave + franchise lifecycle actions
- P2: Central dispatch UI with source-options → edit → dispatch
- P3: reserve_on_approve=true testing
