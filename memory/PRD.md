# PRD — Central Inventory (Project Analysis & Summary)

## Original Problem Statement
Pull code from https://github.com/parth-mygenie/central_inventory.git (branch: main), go through all documentation, summarize the project and next steps.

## Project Summary
Central Inventory module for MyGenie POS platform — a multi-level inventory management system for F&B businesses with a 3-tier hierarchy: Central Store (top) > Master Store (middle) > Outlet (bottom).

## What's Been Completed
- [Jan 2026] CR Requirement Planning Document — 2,282 lines, 28 sections, 26 modules, 22 workflows, 23 screens planned
- [Jan 2026] 96 owner decisions collected and persisted across 2 rounds of requirement review
- [Jan 2026] Enterprise Requirement Review Round 2 — 43 gap questions identified, all answered
- [Jan 2026] 3 conflict resolutions (direct dispatch vs approval, return flow, adjustment/wastage boundary)
- [Jan 2026] Internal API Verification Tool built at `/verify` route (React + FastAPI)
- [Jan 2026] Terminology adapter module built (`terminology.js`) for backend-to-business term mapping
- [Jan 2026] API Catalog with 20+ APIs pre-configured in backend
- [Jan 2026] 22 read APIs verified working against preprod.mygenie.online
- [Jan 2026] Full E2E transfer lifecycle tested: 18/19 passed (8 test scenarios)
- [Jan 2026] Test hierarchy seeded: 2 centrals + 4 franchises under master

## Architecture
- **Frontend:** React 19, Tailwind CSS, Radix UI, Phosphor Icons
- **Backend:** FastAPI (Python), Motor (async MongoDB driver), HTTPX (API proxy)
- **Database:** MongoDB (for verification records, status checks)
- **External API:** preprod.mygenie.online (Laravel/PHP backend for MyGenie POS)
- **Design:** Dark brutalist/Swiss high-contrast theme (IBM Plex Sans + JetBrains Mono)

## Key Documentation Files
| Document | Path | Status |
|---|---|---|
| CR Requirement Planning (v1) | `memory/central_inventory/CENTRAL_INVENTORY_CR_REQUIREMENT_PLANNING.md` | Complete |
| Enterprise Review Round 2 | `memory/central_inventory/CENTRAL_INVENTORY_ENTERPRISE_REQUIREMENT_REVIEW_ROUND_2.md` | Complete |
| Requirement Review Status | `memory/central_inventory/CENTRAL_INVENTORY_REQUIREMENT_REVIEW_STATUS.md` | Current |
| Owner Answers (96 decisions) | `memory/central_inventory/OWNER_ANSWERS_COMPLETE.md` | Complete |
| API Verification Report | `memory/central_inventory/api_evidence/API_VERIFICATION_REPORT.md` | Complete |
| API Verification Update 2 | `memory/central_inventory/api_evidence/API_VERIFICATION_UPDATE_2.md` | Complete |

## Critical Terminology Mapping (CONFIRMED)
| Business Term (UI) | Backend API Term | Level |
|---|---|---|
| Central Store | `master` | TOP |
| Master Store | `central` | MIDDLE |
| Outlet | `franchise` | BOTTOM |

## Remaining Blockers
1. **UNIT_CONVERSION_NOT_DEFINED** — All transfer write APIs blocked; `unit` table lacks `conversion_factor` and `base_unit` columns
2. **11 items need backend work** — partial dispatch, soft reservation, over-receive, lateral transfers, return flow, reconciliation, adjustment API, wastage API, stocktake, cost models, pack conversion
3. **Operations Hub KPIs** — Owner to specify later

## Next Tasks (Prioritized)
### P0 — Immediate
1. Owner/backend team: Fix `unit` table conversion data (unblocks all transfer writes)
2. Owner/backend team: Provide test credentials for Central/Master/Outlet roles
3. Begin Central Inventory UI implementation (23 screens planned)
4. Build terminology adapter module for frontend (partially done — `terminology.js` exists)

### P1 — Phase 1 Must-Have
5. Implement role-based UI visibility
6. Build core screens: Operations Hub, Hierarchy Summary, Store Detail, Transfer workflows
7. Dispatch Wizard with mandatory segment/batch selection
8. Pending Queues (approval/receive/request inbox)
9. Stock Ledger / Movement History
10. Reports Dashboard
11. Stock Adjustment + Wastage modules (Must Have per owner)

### P2 — Phase 2 / Future
12. WebSocket real-time notifications (currently polling)
13. External notification channels (email/WhatsApp/SMS)
14. Configurable role permissions
15. Physical stocktake with reconciliation
16. Theoretical vs actual consumption variance report
17. AI-powered wastage camera integration (owner mentioned)

## Backlog
- PDF/Excel report export
- Multi-tab conflict handling
- Offline/poor network behavior
- Data retention/archival policy
- Stock freeze during audit
