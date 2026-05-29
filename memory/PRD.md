# Central Inventory — PRD

## Problem Statement
Central Inventory management app for MyGenie POS — multi-store hierarchy (Master > Central > Franchise) with inventory transfers, stock management, catalogue, and reporting.

## Tech Stack
- **Frontend**: React 19, Tailwind CSS 3, Radix UI, Recharts, React Router v7, React Hook Form, Zod, craco, Lucide icons, Axios
- **Backend**: Python FastAPI, Motor (async MongoDB driver), httpx, Pydantic v2
- **Database**: MongoDB (local)
- **External**: Proxies to `preprod.mygenie.online` POS API

## What's Been Implemented

### P22 Daily Consumption Report (May 29, 2026)
- Full report page with date range filter, store multi-selector, hierarchy toggle
- KPI cards, ingredient summary table, consumption details (collapsible), by-store rollup
- Ingredient drill-down, loading/error/empty states
- **12/12 frontend tests passed**

### P23 Hierarchy Management (May 29, 2026)
- **Files:** HierarchyManagement.jsx, useHierarchyManagement.js, api.js additions, screenVisibility.js, Sidebar.jsx, App.js
- **Hierarchy List**: Tabbed view (All / Master Stores / Outlets) with type badges, pagination
- **Create Child**: Dialog with form validation, child_type selector (Master→central+franchise, Central→franchise only)
- **Bundle Push**: 3-step wizard (preview → confirm → results) with per-module breakdown + diagnostics
- **Master nested push**: Master can push to franchises under centrals (full tree discovery via hierarchy-summary)
- **Push History**: Collapsible section with paginated audit log
- **Visibility**: Hidden for franchise actors
- **12/12 frontend tests passed**

## Backlog

### P0 — None

### P1
- Child deletion/deactivation (no API found yet)
- Multi-outlet batch push (loop from UI)

### P2
- PDF/CSV export for consumption report
- Chart visualization for consumption trends
- Employee/role push modules
