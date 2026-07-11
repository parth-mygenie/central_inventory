# Central Inventory - PRD

## Overview
Central Inventory management system by MyGenie. Multi-store hierarchy stock management module for the MyGenie POS platform.

**Repo:** `https://github.com/parth-mygenie/central_inventory.git` | **Branch:** `11-07-26`

## Architecture
- **Backend**: FastAPI (Python) — proxy-only layer forwarding to `preprod.mygenie.online/api/v2/vendoremployee`
- **Frontend**: React 19 + Craco + Tailwind CSS + Radix UI / shadcn components
- **Database**: MongoDB (local via Motor async driver — session tokens only)
- **Auth**: Proxied to MyGenie preprod vendor employee login

## What's Been Implemented

### Session: 2026-07-11 — Repo Clone + Gap Adoption Implementation + QA

**CR-037→044 Gap Adoption Batch: ALL 8 CRs → QA_PASS**

| CR | Title | QA Result |
|----|-------|-----------|
| CR-037 | Unified Stock Ledger (G-005) | PASS — 10 rows, 4 source types, pagination, before/after |
| CR-038 | Stock Return + Wastage CRUD (G-006) | PASS — Return dialog wired, add-reason inline works. BUG FIXED: API path corrected |
| CR-039 | Excel/CSV Import (G-015) | PASS — Template download + parse-import + server.py routes |
| CR-040 | Invoice Duplicate Check (G-016) | PASS — check-invoice-number returns available/duplicate |
| CR-041 | Segment unit_cost (G-019) | PASS (data-dependent — no cost data on test hierarchy) |
| CR-042 | Unit Conversion (G-020) | PASS — 5 items show conversion badges |
| CR-043 | Pushed Lock + Policy (G-028/029) | PASS — Policy card with 6 toggles visible on child stores |
| CR-044 | Manufactured Recipe (G-030) | PASS — Toggle visible, disabled on existing recipes (v1) |

### Bug Fixed During QA
- CR-038 wastage reasons API paths corrected: `/wastage-reasons/add` and `/wastage-reasons/list` (was using wrong `/inventory/` prefix)

## Prioritized Backlog

### P0 — Next
- SMOKE FACILITATOR for CR-037→044 (owner manual verification)
- Closure for BUG-038→045 (already QA_PASS)

### P1 — Pending
- QA for BUG-029→036 (IMPLEMENTED, awaiting QA)
- Test pushed-lock behavior from child store login
- Test manufactured recipe creation e2e

### P2 — Later
- G-014 Invoice OCR/AI extraction (backend still OPEN)
- App-wide consumption unit re-unit-ing (v2 follow-up from CR-042)
- WebSocket infrastructure (G-011 still OPEN)
