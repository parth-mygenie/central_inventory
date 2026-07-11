# Central Inventory - PRD

## Overview
Central Inventory management system by MyGenie. Cloned from `https://github.com/parth-mygenie/central_inventory.git`, branch `bug_fix_plan_11_07`.

## Tech Stack
- **Backend**: Python FastAPI (server.py) with MongoDB (motor async driver)
- **Frontend**: React 19 + Tailwind CSS + Radix UI + shadcn/ui components, using craco/CRA
- **Database**: MongoDB (local)
- **Other**: recharts, react-router-dom, axios, zod, react-hook-form

## What's Been Implemented (Jul 11, 2026)
- Repo cloned and deployed successfully
- Backend running on port 8001 (FastAPI proxy to MyGenie preprod APIs)
- Frontend running on port 3000 (React CRA with craco)
- .env files restored for platform compatibility
- All dependencies installed and services running

## Architecture
- Backend acts as API proxy to preprod.mygenie.online APIs
- Frontend is a full inventory management UI with:
  - Login/Auth (MyGenie vendor accounts)
  - Hierarchy management, stock inventory, product/recipe catalogues
  - Purchase orders, production runs, wastage reports
  - Transfer/dispatch workflows, pending queues
  - Daily consumption reports, stock detail panels

## Next Action Items
- User to provide any specific bug fixes or features to work on from the `bug_fix_plan_11_07` branch
