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
- Purchase order module - create, list, detail, approve, send, receive, cancel, close (CR-030)
- Operational settings (P17)
- Response caching layer with TTL and in-flight dedup

## Deployment (2026-07-02)
- Pulled from GitHub, .env files created, dependencies installed
- Backend running on port 8001, frontend on port 3000
- Both services healthy and accessible

## Next Action Items
- User to provide test credentials to verify login flow
- Any feature additions or bug fixes as requested
