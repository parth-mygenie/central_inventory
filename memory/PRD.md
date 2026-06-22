# Central Inventory - PRD

## Original Problem Statement
1. Wipe current /app, pull -> https://github.com/parth-mygenie/central_inventory.git, branch -> 18-6-26
2. Validate all open backend gaps from the project documentation via API testing, document results in `/app/AI/openGaps/gap_validation.md`

## Architecture & Tech Stack
- **Backend**: FastAPI (Python) proxy → POS preprod API (`preprod.mygenie.online`)
- **Frontend**: React 19 + Tailwind CSS + CRACO + Radix UI + React Router v7 + Recharts
- **Database**: MongoDB (local, used for token sessions and status checks)
- **External APIs**: MyGenie POS preprod APIs (v1 auth, v2 business logic)

## What's Been Implemented
- **2026-06-18**: Pulled repo from GitHub (branch `18-6-26`), created .env files, installed dependencies, started services
- **2026-06-18**: Comprehensive gap validation — 22 gaps + bugs tested via API, results documented in `/app/AI/openGaps/gap_validation.md`

## Gap Validation Summary (2026-06-18)
- **P1 Open**: G-006 (return flow), G-014 (OCR), G-020 (unit conversion) — 3 gaps
- **P2 Open**: G-001, G-002, G-005, G-011, G-015, G-016 — 6 gaps
- **P3 Open**: G-003 — 1 gap
- **Possibly Resolved**: G-004 (restaurant_type now in history) — needs owner confirmation
- **Verified Closed**: G-009, G-010, G-013, G-017, G-018, G-019, G-021, G-022, G-023 — 9 gaps verified
- **Cannot Verify**: G-012 (needs franchise login)

## Backlog
- Resolve P1 gaps when POS backend delivers
- Close G-004 after owner review
- Verify G-012 with franchise account
