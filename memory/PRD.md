# Central Inventory - PRD

## Original Problem Statement
Clone central_inventory repo (branch: 15-6-implementation-v1), run it, execute QA, investigate & register consumption display bug.

## Architecture
- **Backend**: FastAPI proxy-only layer → preprod.mygenie.online POS API
- **Frontend**: React 19 + CRACO + Tailwind CSS + Radix UI + React Router v7
- **Database**: MongoDB (local, token sessions only)

## What's Been Done

### Session 1 — Deployment
- Cloned repo, installed deps, services running

### Session 2 — QA Gate 6
- 50/50 tests passed for Sprint S3 batch

### Session 3 — INVESTIGATION
- Found 4 bug classes across 8 files, 6 screens
- Root cause: POS API returns consumption in gm, frontend uses kg without conversion

### Session 4 — INTAKE + IMPACT ANALYSIS (BUG-036)
- Registered BUG-036 (P0 CRITICAL) in registry.json
- Created Gate 1 (Intake): `control/sessions/BUG036_ARTIFACT_1_INTAKE.md`
- Created Gate 2 (Impact Analysis): `control/sessions/BUG036_ARTIFACT_2_IMPACT_ANALYSIS.md`
- Updated L1 Control Dashboard
- Dashboard data regenerated and verified

## Prioritized Backlog
- **P0**: BUG-036 — Gate 3 (Implementation Plan) + Gate 4 (Owner GO) + Gate 5 (Code)
- **P2**: BUG-034 backend API for active/inactive toggle (pending backend team)

## Next Tasks
- Gate 3: Implementation Plan for BUG-036 (8 files, ~20 line-level edits)
- Gate 4: Owner GO
- Gate 5: Implementation
