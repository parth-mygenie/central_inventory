# Central Inventory - PRD

## Problem Statement
Central Inventory module for MyGenie POS — multi-level stock management system across 3-tier hierarchy.

## Architecture
- **Backend**: FastAPI (Python) — API proxy to MyGenie POS preprod APIs
- **Frontend**: React 19 + Craco + Tailwind CSS + Radix UI
- **Database**: MongoDB (via Motor async driver)
- **Data**: All inventory/catalogue data from POS V2 API (preprod.mygenie.online)

## What's Been Implemented

### Core System (Slices 1-5, P16-P19)
- Full transfer lifecycle, hierarchy, queues, history, vendors, procurement, wastage

### P20 Stock Inventory — IMPLEMENTED
- Self-store inventory, KPI cards, table. 14/14 PASS

### P21 Catalogue — FULLY IMPLEMENTED (28 May 2026)
- **Inventory Catalogue**: Ingredients + Categories CRUD + ingredient rename with warning
- **Product Catalogue**: Foods CRUD + Food Categories CRUD + Addons CRUD
- **Recipe Management**: Recipe CRUD with IngredientComposer + Sub-recipes
- **Addon-recipe Management**: CRUD + orphan detection
- **Gap fixes**: Food category full CRUD (POST update quirk), Addon full CRUD (noun-verb route), Ingredient rename (stock_title)
- **Testing: 17/17 frontend PASS, 30/30 backend PASS**

## Prioritized Backlog
- **P1:** P21 Smart Dispatch — destination stock intelligence (~8h)
- **P1:** P20 Phase 3 — Hierarchy stock overview toggle (~1.5h)
- **P2:** Advanced food fields (variations, addons linkage, allergens)
- **P2:** Reports screen

## Test Credentials
- Master: `abhishek@kalabahia.com` / `Qplazm@10` → rid=1
- Central: `owner@democentral2.com` / `Qplazm@10` → rid=782
- Franchise: `owner@demofranchise4.com` / `Qplazm@10` → rid=786
