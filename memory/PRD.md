# Central Inventory - PRD

## Problem Statement
Multi-store hierarchy stock management module for MyGenie POS platform. Backend is proxy-only FastAPI (~180 lines) forwarding to preprod.mygenie.online. Frontend is React 19 + Craco + Tailwind + Radix UI (shadcn).

## Architecture
- **Backend**: FastAPI proxy on port 8001 (supervisor-managed) — zero business logic
- **Frontend**: React 19 + craco on port 3000 (supervisor-managed)
- **POS API**: preprod.mygenie.online/api/v2/vendoremployee
- **Database**: MongoDB (local, session storage only)
- **Hierarchy**: Central Store (TOP, API=master) → Master Store (MID, API=central) → Outlet (BOTTOM, API=franchise)

## What's Been Implemented

### 2026-06-15 — Repo Clone + BUG-026/027/028 Fix
- Cloned from `15-june` branch, set up environment
- **BUG-026** (HIGH, QA_PASS): Raw Material Master sub-recipe contamination — 5 fixes
  - Filtered sub-recipe items from ingredients list (`isSubRecipeItem` helper)
  - Hidden "Sub Recipe" from all category dropdowns (`filterRawCategories` helper)
  - Hidden from Categories tab, replaced delete icons with active/inactive toggle (API pending)
  - "Recipes" column → "Used In" with tooltip, counts recipe + sub-recipe usage
- **BUG-027** (HIGH, QA_PASS): Consumption/Days of Stock calculation
  - Switched from purchase-history-based to `daily-consumption-report` API (real production data)
  - Fixed unit normalization (gm→kg, ml→ltr)
  - Uses `display_qty` instead of `cal_quantity` for stock comparison
- **BUG-028** (HIGH, QA_PASS): Purchase Order Create — 9 fixes
  - Filtered sub-recipes from By Vendor + By Item Need lists
  - Added search field in By Vendor items table
  - Fixed Cheapest column unicode rendering
  - Expected Rate column: read-only, shows ₹0 for no-history items
  - "No history" → vendor picker dropdown with all registered vendors
  - Column renames: Daily → Daily Consumption, Days → Days Will Last
  - Added tooltip explaining projection calculation

### Files Modified
| File | Bugs | Changes |
|------|------|---------|
| `IngredientCatalogue.jsx` | BUG-026, BUG-027 | +isSubRecipeItem, +filterRawCategories, +parseQtyString, +normalizeToDisplayUnit, +consumptionMap from API, +usageMap, CategoriesTab toggle, "Used In" column |
| `PurchaseOrderCreate.jsx` | BUG-028 | +rawMaterialItems filter, +vendorSearch, column renames, vendor picker, read-only rate |

## Governance
- **Registry**: 35 CRs, 28 BUGs (registry.json)
- **Sprint**: S3 active
- **Code Gate**: 7-artifact model followed (Session-Start, Intake, Impact Analysis, Impl Plan, QA Report)
- **Artifacts**: `control/sessions/BUG026_027_028_*.md`

## Prioritized Backlog (P0/P1/P2)

### P0 — Owner Signoff Pending
- BUG-026, BUG-027, BUG-028 (QA_PASS, awaiting owner review)

### P1 — Planned Bug Batch (BUG-018→025, all QA_PASS)
- BUG-018: Push status misleading
- BUG-019: Stock Inventory split FG/RM
- BUG-020: "Unknown: —" in Store Detail
- BUG-021: Remove Adjust Stock card
- BUG-022: Gate page auto-redirect
- BUG-023: $ → ₹ icon swap
- BUG-024: Production Run master-detail rewrite
- BUG-025: Food edit → Side Sheet

### P1 — CR Backlog
- CR-031: Production Screens Audit (QA)
- CR-032: Outward Screens Audit (QA)
- CR-033: Action Screens Audit (QA)

### P2 — Future
- CR-028: Product Catalog Overhaul (PROPOSED)
- CR-020: Daily Intelligence Digest (PROPOSED)
- Category active/inactive toggle backend API (stub ready)

## Next Tasks
- Owner review of BUG-026/027/028
- Continue with any new bugs/CRs from owner
