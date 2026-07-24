# Central Inventory PRD

## Problem Statement
Central Inventory — multi-store hierarchy stock management module for MyGenie POS.

## Tech Stack
- **Frontend**: React 19, Tailwind CSS 3, Radix UI (shadcn), Recharts, React Router DOM, CRACO, Lucide React
- **Backend**: FastAPI (Python) — proxy-only to preprod.mygenie.online, Motor (async MongoDB driver), Uvicorn
- **Database**: MongoDB (local)
- **Auth**: MyGenie vendor account (external POS auth)

## What's Been Implemented (July 24, 2026)
- Cloned repo from branch `18-7-26`
- **BUG-047 RESOLVED**: Addon Recipe CRUD fixed — 4 sub-issues:
  1. Recipe Name auto-fills when selecting Linked Addon
  2. Payload includes preparation_time/serves_people/serve_time
  3. Ingredient keys corrected ({id, qty, unit} format)
  4. deleteAddonRecipe sends reason body
- All changes tested by testing agent: 9/9 PASS

## Architecture
- Backend on port 8001 (supervisor-managed, proxy-only)
- Frontend on port 3000 (supervisor-managed, CRACO)
- MongoDB on default port 27017
- All API routes proxied via `/api/proxy/v2/*` to preprod.mygenie.online

## Backlog
- CR-037→044: Gap Adoption Pipeline (awaiting Gate 4 GO)
- BUG-029→035: Implementation batch (awaiting QA)

## Status: ✅ Running, BUG-047 RESOLVED
