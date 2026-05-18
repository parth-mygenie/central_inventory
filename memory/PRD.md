# PRD — Central Inventory (Updated after E2E verification)

## Original Problem Statement
CR Requirement Planning + API Verification Tool + Full E2E Transfer Testing for MyGenie POS Central Inventory Module.

## What's Been Completed
- [Jan 2026] CR Requirement Planning Document (28 sections, 50+ owner questions)
- [Jan 2026] Internal API Verification Tool built at `/verify`
- [Jan 2026] Test hierarchy seeded: 2 centrals + 4 franchises under master
- [Jan 2026] 22+ read APIs verified working
- [Jan 2026] **Full E2E transfer lifecycle: 18/19 passed**

## E2E Test Results Summary
| Test | Flow | Result |
|---|---|---|
| T1 | Master→Central direct dispatch + receive | PASS |
| T2 | Master→Franchise direct (skip middle) + receive | PASS |
| T3 | Central→Franchise dispatch + receive | PASS |
| T4 | Franchise→Central request→approve→dispatch→receive | 3/4 (dispatch had no stock left) |
| T5 | Central→Master request→approve→dispatch→receive | PASS |
| T6 | Pre-dispatch reject | PASS |
| T7 | Post-dispatch cancel (stock restored) | PASS |
| T8 | Partial receive with damaged resolution | PASS |

## Stock Verified at All Levels
| Store | Sea Shore Stock |
|---|---|
| Master (id=1) | 20 ltr |
| DemoCentral1 (id=781) | 0.7 ltr |
| DemoCentral2 (id=782) | 1.2 ltr |
| DemoFranchise1 (id=783) | 0.3 ltr |
| DemoFranchise3 (id=785) | 0.5 ltr |

## Confirmed Terminology Mapping
| Business (UI) | Backend API | Level |
|---|---|---|
| Central / Center | master | TOP |
| Master Store | central | MIDDLE |
| Outlet / Unit | franchise | BOTTOM |

## Next Tasks
1. Begin Central Inventory UI implementation (23 screens planned)
2. Build terminology adapter module for frontend
3. Implement role-based UI visibility
