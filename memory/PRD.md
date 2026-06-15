# Central Inventory - PRD

## Problem Statement
Multi-store hierarchy stock management module for MyGenie POS platform. Backend is proxy-only FastAPI (~180 lines) forwarding to preprod.mygenie.online. Frontend is React 19 + Craco + Tailwind + Radix UI.

## Architecture
- **Backend**: FastAPI proxy on port 8001 — zero business logic
- **Frontend**: React 19 + craco on port 3000
- **POS API**: preprod.mygenie.online/api/v2/vendoremployee
- **Hierarchy**: Central Store (TOP, API=master) → Master Store (MID, API=central) → Outlet (BOTTOM, API=franchise)

## What's Been Implemented (2026-06-15)

### Repo Clone & Setup
- Cloned `15-june` branch, configured env, installed deps, both services running

### BUG-026 (QA_PASS) — Raw Material sub-recipe contamination
- Filtered sub-recipe items from ingredients list, category dropdowns, filter, categories tab
- Replaced delete with active/inactive toggle (API pending)
- "Recipes" → "Used In" column with recipe+sub-recipe count

### BUG-027 (QA_PASS) — Consumption/Days of Stock
- Switched to `daily-consumption-report` API, unit normalization, uses `display_qty`

### BUG-028 (QA_PASS) — PO Create sub-recipe + UX
- Sub-recipe filter, search, Expected Rate read-only, vendor picker, column renames, tooltip

## Registered Backlog (PLANNED, Not Implemented)

### P0 — High Severity
| Bug | Title | Files | Est. |
|-----|-------|-------|:----:|
| BUG-029 | Consumption 0.0 — ingredient_id join mismatch | IngredientCatalogue.jsx | 30m |
| BUG-030 | PO Create residual — rate=0 API, display_qty, DoC, search | PurchaseOrderCreate.jsx | 45m |
| BUG-032 | Stock Inventory — expiry inline, Adjust Stock, FEFO | StockInventorySummary.jsx | 45m |

### P1 — Medium Severity
| Bug | Title | Files | Est. |
|-----|-------|-------|:----:|
| BUG-031 | RM Stock — RM-only tabs, Sub Recipe filter | StockInventorySummary.jsx | 20m |
| BUG-033 | Quick Actions — ingredient pre-select | 3 files | 30m |
| BUG-034 | Sub-Recipe Master — Delete → toggle | SubRecipeMaster.jsx | 15m |
| BUG-035 | Production History — ingredient qty total | ProductionHistory.jsx | 30m |

## Governance
- **Registry**: 35 CRs, 35 BUGs
- **Sprint**: S3 active
- **Handover**: `control/sessions/SESSION_CLOSE_20260615_HANDOVER.md`
- **Dashboard**: `--check` passes
