# Central Inventory - PRD

## Problem Statement
Central Inventory module for MyGenie POS — multi-level stock management system across 3-tier hierarchy (Central Store → Master Store → Outlet).

## Architecture
- **Backend**: FastAPI (Python) — acts as API proxy to MyGenie POS preprod APIs
- **Frontend**: React 19 + Craco + Tailwind CSS + Radix UI
- **Database**: MongoDB (via Motor async driver) — token sessions, status checks
- **Auth**: Proxied through MyGenie vendor employee login (POS V1 API)
- **Data**: All inventory/catalogue data sourced from POS V2 API (preprod.mygenie.online)

## What's Been Implemented

### Phase 1 (Slices 1-5): Core Inventory System
- Full transfer lifecycle, hierarchy, pending queues, history
- P16-P19: Partial approve, amend/withdraw, vendors, procurement

### P20 Stock Inventory Summary — IMPLEMENTED (27 May 2026)
- Self-store inventory visibility, KPI cards, inventory table
- Testing: 14/14 PASS

### P21 Catalogue Phase — IMPLEMENTED (28 May 2026)
- **Inventory Catalogue** (`/catalogue/ingredients`): Ingredients table + Categories CRUD + Add/Edit ingredient
- **Product Catalogue** (`/catalogue/products`): Foods CRUD + Food categories (read) + Addons (read)
- **Recipe Management** (`/catalogue/recipes`): Recipe CRUD with IngredientComposer + Sub-recipes with frontend validation
- **Addon-recipe Management** (`/catalogue/addon-recipes`): Addon-recipe CRUD + orphan addon detection
- **Shared**: IngredientComposer (reusable), useCatalogueCrud hook, 27 new API methods with normalization
- **Role visibility**: Catalogue nav visible for master only (frontend-gated)
- **Testing: 17/17 frontend PASS, 19/19 backend PASS**

## Prioritized Backlog
- **P1:** P21 Smart Dispatch Phase 1+2 — Low-stock suggestions + qty recommendations (~8h)
- **P1:** P20 Phase 3 — Hierarchy stock overview toggle (~1.5h)
- **P2:** Advanced food fields (variations, addons linkage, allergens, images)
- **P2:** Reports screen implementation

## Test Credentials
- Master: `abhishek@kalabahia.com` / `Qplazm@10` → rid=1, type=master
- Central: `owner@democentral2.com` / `Qplazm@10` → rid=782, type=central
- Franchise: `owner@demofranchise4.com` / `Qplazm@10` → rid=786, type=franchise
