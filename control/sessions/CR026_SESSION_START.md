# CR-026 Session Start — P28 Production Unit Module

> **CR ID:** CR-026
> **Title:** P28 — Production Unit Module (Production Run UI + History)
> **Status:** PROPOSED
> **Date:** 2026-06-13
> **Author:** E1 agent
> **Requested by:** Owner (Parth)

---

## Context

The Central Inventory system manages a central kitchen / production unit workflow:

1. **Procure** raw ingredients from vendors (BUILT — AddStockPurchaseForm, CR-009)
2. **Define** recipes and sub-recipes with ingredient BOMs (BUILT — RecipeCatalogue, CR-011)
3. **Produce** finished goods by running a recipe — consuming ingredients, creating FG inventory (BACKEND API EXISTS — no frontend UI)
4. **Distribute** finished goods to stores via transfers (BUILT — DirectDispatchForm/RequestStockForm, CR-004/CR-025)

Step 3 is the gap. The backend `POST /inventory/production-run/complete` API is fully validated (43/43 tests pass in P28 smoke report), including:
- FEFO segment consumption during production
- Blended cost across multi-vendor segments (verified to ₹0.00 difference)
- FG segment creation with batch/expiry
- Production audit trail with per-ingredient consumed_allocations

## Owner's Description

> "In the central entry, the user will purchase ingredients from a vendor. Once the ingredients are purchased, the user will use those ingredients to create a recipe or sub-recipe. For example, if I have flour and sugar, I may want to make cookies. The cookie is the end product, or it can be treated as a sub-recipe. This product or sub-recipe will then be sent to the master store or outlets."

## Scope

Build the frontend Production Run UI that connects the existing recipe/sub-recipe definitions to the backend production-run API, allowing users to:
- Select a sub-recipe and run production (specify batch quantity, batch label, expiry)
- See the resulting FG, unit cost, and total cost
- View production history and audit trails

## Pre-existing Artifacts

| Document | Path | Relevance |
|----------|------|-----------|
| P28 Smoke Validation Report | `AI/Plans/api_implementation_status_p28_smoke_validation.md` | Full API validation (43 tests) |
| P30 Blended Cost Validation | `AI/Plans/P30_M0_PRODUCTION_VALIDATION_REPORT.md` | Blended segment cost proof |
| Recipe Catalogue (CR-011) | `frontend/src/components/central-inventory/RecipeCatalogue.jsx` | Existing recipe/sub-recipe CRUD |
| IngredientComposer | `frontend/src/components/central-inventory/IngredientComposer.jsx` | Shared BOM editor |
| Sub-recipe BOM data | Backend: `GET /recipe/sub-recipes` | Returns sub_recipe_id, inventory_id (FG), ingredients[] |

## Dependencies

- CR-011 (P21 Catalogue CRUD) — CLOSED
- CR-009 (P19 Add Stock / Procurement) — CLOSED
- CR-010 (P20 Stock Inventory Summary) — CLOSED
- CR-015 (P24 FEFO Batch Stock Detail) — PLANNED (nice-to-have for post-production segment inspection)

## Governance

This CR follows the full governance gate process (Artifacts 0-6).
