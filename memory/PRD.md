# Central Inventory - PRD

## Overview
Central Inventory is a multi-store inventory management system built for MyGenie's POS ecosystem. It serves as a proxy/UI layer on top of the preprod.mygenie.online POS API.

## Architecture
- **Backend**: FastAPI (Python) — acts as API proxy to POS API (preprod.mygenie.online)
- **Frontend**: React 19 + CRACO + Tailwind CSS + Radix UI/shadcn components
- **Database**: MongoDB (local, used for token sessions and status checks)
- **External API**: POS API v1/v2 at preprod.mygenie.online

## Source
- **Repo**: https://github.com/parth-mygenie/central_inventory.git
- **Branch**: 18-6-26

## What's Been Implemented (from repo)
- Login via POS API proxy with restaurant context resolution
- Full inventory transfer lifecycle (request, approve, dispatch, receive, cancel)
- Stock inventory summary (P20), stock detail with FEFO batches (P24)
- Vendor management (P18), procurement/add-stock (P19)
- Catalogue management: ingredients, products, recipes, sub-recipes, addon-recipes (P21)
- Hierarchy management (P23), store management
- Daily consumption report (P22), wastage report (P25)
- Production run & history (P28)
- Purchase order module (CR-030)
- Operational settings (P17)
- Response caching layer with TTL and in-flight dedup

## Work Done This Session (2026-07-02)
1. Pulled repo from GitHub (branch 18-6-26), set up .env files, installed deps, got running
2. **Gap Validation**: Tested all 22 gaps + 4 bug items via API curls
   - 5 P1/P2 blocking gaps confirmed open (G-006, G-014, G-015, G-016, G-020)
   - 5 low-priority gaps confirmed open (G-001, G-002, G-003, G-005, G-011)
   - 1 gap flagged for re-evaluation (G-004 — types now present)
   - 10 closed gaps verified
   - Report at `/app/AI/openGaps/gap_validation.md`

## Prioritized Backlog
- P0: None (all P0s resolved)
- P1: G-006 (return flow), G-014 (invoice OCR), G-020 (unit conversion) — POS backend
- P2: G-015, G-016, G-001, G-002, G-005, G-011 — POS backend
- P3: G-003, G-004 (re-evaluate) — POS backend
