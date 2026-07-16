# Central Inventory - PRD

## Original Problem Statement
1. Pull https://github.com/parth-mygenie/central_inventory.git (branch 16-7-26) and run
2. QA role: test reverse pull, PO by vendor/item, direct dispatch, request stock, quantity tracking
3. Investigation: why raw materials not showing after pull from 541 to palm collection
4. Investigation: recipe creation form missing food dropdown

## Architecture
- **Frontend**: React 19 + Craco + Tailwind CSS + Radix UI + Recharts + React Router v7
- **Backend**: FastAPI proxy → preprod.mygenie.online (zero business logic)
- **Database**: MongoDB (local, for session tokens only)
- **Auth**: Proxied to MyGenie POS V1 API

## What's Been Implemented
- [2026-07-16] Cloned repo, installed deps, deployed to preview environment
- [2026-07-16] QA Testing — 8/8 test cases PASS (test malai / Kunafa Mahal hierarchy)
- [2026-07-16] Investigation #1 — palm collection raw materials: incomplete reverse pull (RESOLVED by re-pull)
- [2026-07-16] Investigation #2 — recipe food dropdown missing: frontend bug in RecipeCatalogue.jsx

## Investigation #2 Summary (Recipe Food Dropdown)
- **Issue:** "Linked Food" field in recipe creation form is a read-only `<p>` tag, not a `<Select>` dropdown
- **Root Cause:** Frontend bug — `RecipeCatalogue.jsx` line 326-327 renders static text instead of dropdown in add mode
- **Impact:** P1 — cannot create recipes via UI at all
- **Fix Location:** `frontend/src/components/central-inventory/RecipeCatalogue.jsx` lines 326-328
- **Workaround:** Direct API call to `POST /recipe/store-recipe`

## Accounts Used
- manager@testmalai.com (master, RID 811) / manager@kunafamahal.com (franchise, RID 689)
- captain@palmcollection.com (master, RID 812) / owner@palmhouse.com (franchise, RID 541)

## Next Action Items
- P1 FIX: Add food selection dropdown to RecipeCatalogue.jsx RecipeDetail in add mode
- POS API concern: reverse-push-form incorrectly reports 0 for stock_items/categories
