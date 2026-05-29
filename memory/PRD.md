# Central Inventory - PRD

## Problem Statement
Central Inventory module for MyGenie POS — multi-level stock management system across 3-tier hierarchy.

## Architecture
- **Backend**: FastAPI (Python) — API proxy to MyGenie POS preprod APIs
- **Frontend**: React 19 + Craco + Tailwind CSS + Radix UI
- **Database**: MongoDB (via Motor async driver)
- **Data**: All inventory/catalogue/report data from POS V2 API (preprod.mygenie.online)

## What's Been Implemented

### Core System (Slices 1-5, P16-P19)
- Full transfer lifecycle, hierarchy, queues, history, vendors, procurement, wastage

### P20 Stock Inventory — IMPLEMENTED
- Self-store inventory, KPI cards, table. 14/14 PASS

### P21 Catalogue — FULLY IMPLEMENTED
- Inventory, Products, Recipes, Sub-recipes, Addon-recipes + gap fixes (food cat CRUD, addon CRUD, ingredient rename)

### P22 Daily Consumption Report — API VALIDATED + PLANNED (28 May 2026)
- `POST /report/daily-consumption-report` — 9 probes, all modes validated
- Legacy single-store, hierarchy multi-store, restaurant_ids filtering, scope enforcement
- Full planning: `AI/Plans/phase3/P22_daily_consumption_report_planning.md`

## Prioritized Backlog
- **P0:** P22 Implementation — Daily Consumption Report (~6-8h)
- **P1:** P21 Smart Dispatch — destination stock intelligence (~8h)
- **P1:** P20 Phase 3 — Hierarchy stock overview toggle (~1.5h)
- **P2:** Advanced food fields, PDF/CSV export, chart visualization

## Test Credentials
- Master: `abhishek@kalabahia.com` / `Qplazm@10` → rid=1
- Central: `owner@democentral2.com` / `Qplazm@10` → rid=782
- Franchise: `owner@demofranchise4.com` / `Qplazm@10` → rid=786
