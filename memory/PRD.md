# PRD — Central Inventory CR Requirement Planning

## Original Problem Statement
CR Requirement Planning for MyGenie POS Central Inventory Module — planning only, no implementation.

## Architecture & Tasks Done
- **Task:** CR Requirement Planning Document creation (PLANNING ONLY — no code, no implementation)
- **Output:** `/app/memory/central_inventory/CENTRAL_INVENTORY_CR_REQUIREMENT_PLANNING.md` (2281 lines, 28 sections)
- **Raw Reference Docs Saved:** 3 owner-provided documents at `/app/memory/central_inventory/raw_reference/`

## User Personas
1. Central Store Manager (top-level, manages all stock distribution)
2. Master Store Manager (mid-level, manages regional stock + outlets)
3. Outlet Manager (bottom-level, receives stock, manages consumption)
4. Kitchen Manager (outlet-level, consumption tracking)
5. Super Admin / Owner (full access)
6. Accountant / Auditor (read-only reports)

## Core Requirements (Static)
- Three-level inventory hierarchy: Central → Master → Outlet
- CRITICAL: Backend terminology is INVERTED (backend master = business Central, backend central = business Master, backend franchise = business Outlet)
- Stock transfer workflows: request, approve, dispatch, receive, partial receive, reject, cancel
- Batch/expiry-aware stock tracking with FEFO
- Internal API verification tool (Phase 1)
- Comprehensive Phase 1 (production-grade): includes recipes, wastage, alerts, reports

## What's Been Implemented
- [Jan 2026] CR Requirement Planning Document — all 16 stages completed
  - 26 functional modules identified
  - 22 core workflows documented
  - 23 frontend screens planned
  - 31+ APIs documented in collection matrix
  - 50+ owner questions prepared
  - 36 acceptance criteria drafted
  - Terminology mapping CONFIRMED and documented
  - MVP scope recommended (comprehensive)

## Prioritized Backlog
### P0 — Blocking
- Owner must answer 50+ questions (hierarchy, terminology, business rules)
- API verification tool needs to be built
- Missing APIs: stock adjustment, wastage, return, recipe, permissions

### P1 — High Priority
- API verification execution (after tool is built)
- Terminology mapping owner confirmation
- MVP scope approval
- Frontend analysis (after API verification)

### P2 — Medium Priority
- UI/UX detailed design
- Implementation planning
- QA planning

## Next Tasks
1. Send owner question packet for answers
2. Build internal API verification tool
3. Obtain test tokens and restaurant IDs
4. Execute API verification
5. Capture actual response evidence
6. Proceed to frontend analysis once verified
