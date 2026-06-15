# Central Inventory - PRD

## Original Problem Statement
Wipe current /app, pull https://github.com/parth-mygenie/central_inventory.git (branch: 15-6-implementation-v1), and get it running. Then execute QA Gate 6 testing on Sprint S3 implementation batch.

## Architecture
- **Backend**: FastAPI (Python) proxy-only layer forwarding to preprod.mygenie.online POS API
- **Frontend**: React 19 + CRACO + Tailwind CSS + Radix UI + React Router v7 + Recharts
- **Database**: MongoDB (local, for session/token storage only)
- **Pattern**: Zero business logic in backend — all data from POS API

## What's Been Implemented
### Session 1 (June 15, 2026) — Deployment
- Cloned repo from `15-6-implementation-v1` branch
- Preserved `.git` and `.emergent` folders
- Installed all dependencies, services running

### Session 2 (June 15, 2026) — QA Gate 6
- Executed full QA test suite: 50 test cases
- **7 BUG fixes (BUG-029→035)**: All PASS
- **9 CRs re-verified**: All PASS  
- **5 regression checks**: All PASS
- QA Report: `control/sessions/QA_SPRINT_S3_ARTIFACT_5_QA_REPORT.md`

## Prioritized Backlog
- P0: None
- P1: CR-034 write API full integration testing (deferred to smoke)
- P2: BUG-034 backend API for active/inactive toggle (pending backend team)

## Next Tasks
- SMOKE FACILITATOR role for owner verification of all Sprint S3 items
