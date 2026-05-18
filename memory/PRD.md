# PRD — Central Inventory (Updated after Business Rule & UX Field Freeze)

## Original Problem Statement
CR Requirement Planning + API Verification + Full E2E Transfer Testing + Business Rule & UX Field Freeze for MyGenie POS Central Inventory Module.

## What's Been Completed
- [Jan 2026] CR Requirement Planning Document (28 sections, 50+ owner questions)
- [Jan 2026] Internal API Verification Tool built at `/verify`
- [Jan 2026] Test hierarchy seeded: 2 centrals + 4 franchises under master
- [Jan 2026] 22+ read APIs verified working
- [Jan 2026] Full E2E transfer lifecycle: 18/19 passed
- [Jan 2026] Enterprise Requirement Review Round 2 — 43 gap questions answered
- [Jan 2026] 96 owner decisions recorded and reconciled
- [Jan 2026] **Business Rule & UX Field Freeze** — Terminology mapping, login context, screen visibility matrix, transfer lifecycle, API-to-UI field mapping all frozen

## Key Freeze Documents
| Document | Path |
|---|---|
| Business Rule & UX Field Freeze | `/app/memory/central_inventory/CENTRAL_INVENTORY_BUSINESS_RULE_AND_UX_FIELD_FREEZE.md` |
| Login Context & Screen Visibility Matrix | `/app/memory/central_inventory/CENTRAL_INVENTORY_LOGIN_CONTEXT_AND_SCREEN_VISIBILITY_MATRIX.md` |
| Owner Answers Complete | `/app/memory/central_inventory/OWNER_ANSWERS_COMPLETE.md` |
| API Verification Report | `/app/memory/central_inventory/api_evidence/API_VERIFICATION_REPORT.md` |

## Confirmed Terminology Mapping
| Business Term (UI) | Backend API Term | Level |
|---|---|---|
| Central Store | `master` | TOP |
| Master Store | `central` | MIDDLE |
| Outlet | `franchise` | BOTTOM |

## Phase 1 Readiness: `limited_frontend_ui_ready`
- 9 screens approved for full Phase 1 UX
- 9 screens approved for limited Phase 1 UX (write actions blocked)
- 5 features blocked (missing APIs)
- 1 screen Phase 2

## Remaining Blockers
1. UNIT_CONVERSION_NOT_DEFINED — all transfer write APIs blocked
2. 11 backend capabilities need new work
3. Stock Adjustment, Wastage, Return, Recipe APIs missing
4. Operations Hub KPIs not specified (RPT-003)

## Next Tasks (Prioritized)
### P0 — Immediate
1. Backend: Fix unit conversion data → unblocks all write operations
2. Frontend: Implement first UX slice (terminology adapter, login context, navigation, read-only screens)
3. Backend: Provide adjustment/wastage/return API endpoints

### P1 — Phase 1
4. Build all 18 approved/limited Phase 1 screens
5. Implement role-based screen visibility
6. Token masking in API verification tool (SEC-001)

### P2 — Phase 2
7. WebSocket notifications
8. External channels (email/WhatsApp/SMS)
9. Configurable RBAC
10. Physical stocktake
11. User Permission View (SCR-22)
