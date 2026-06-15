# Central Inventory - PRD

## Original Problem Statement
Clone central_inventory repo (branch: 15-6-implementation-v1), run it, execute QA, investigate, register & plan consumption display bug fix.

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

### Session 4 — INTAKE (Gate 1) + IMPACT ANALYSIS (Gate 2)
- BUG-036 registered P0 CRITICAL in registry.json
- Artifacts: BUG036_ARTIFACT_1_INTAKE.md, BUG036_ARTIFACT_2_IMPACT_ANALYSIS.md

### Session 5 — PLANNING (Gate 3)
- Complete implementation plan with exact code diffs for all 8 files
- Artifact: BUG036_ARTIFACT_3_IMPLEMENTATION_PLAN.md
- 8 edits, verification matrix (9 test cases), risk register, post-code checklist
- Dashboard data regenerated and verified

## Current Pipeline State

| Gate | Status |
|------|--------|
| Gate 1 (Intake) | ✅ DONE |
| Gate 2 (Impact Analysis) | ✅ DONE |
| Gate 3 (Implementation Plan) | ✅ DONE |
| Gate 4 (Owner GO) | ⏳ AWAITING |
| Gate 5 (Code) | — |
| Gate 6 (QA) | — |
| Gate 7 (Smoke) | — |

## Next Tasks
- Gate 4: Owner GO to proceed with implementation
- Gate 5: Code 8 files per implementation plan
- Gate 6: QA — 9 verification tests
