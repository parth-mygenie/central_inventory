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
- **BUG-047 RESOLVED**: Addon Recipe CRUD fixed (4 sub-issues, 9/9 tests pass)
- **BUG-048 RESOLVED**: Receive Transfer INVALID_STOCK_DATA — backend fix verified
- **CR-046 IMPLEMENTED**: Settings UI Completion — 13→26 settings (7 groups: Hierarchy Policy, Transfer Behavior, Alerts, Transfer Pricing, Production, Purchase Orders, System)

## Backlog
- CR-037→044: Gap Adoption Pipeline (awaiting Gate 4 GO)

## Status: ✅ Running
