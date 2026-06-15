# Central Inventory PRD

## Problem Statement
Central Inventory — multi-store hierarchy stock management module for MyGenie POS. React 19 + Craco + Tailwind + Radix UI frontend, proxy-only FastAPI backend → preprod.mygenie.online.

## Architecture
- **Backend**: FastAPI proxy to MyGenie POS API (preprod.mygenie.online). Zero business logic in server.py.
- **Frontend**: React 19 + CRACO + Tailwind CSS + Radix UI (shadcn) + Recharts
- **Database**: MongoDB (local, for session/token caching only)
- **Terminology**: API `master` = Central (TOP), `central` = Master (MID), `franchise` = Outlet (BOTTOM)

## What's Been Implemented

### Session 2026-06-15 — PLANNING + IMPLEMENTATION + INVESTIGATION
**7 bugs implemented across 8 files:**
- **BUG-029** (HIGH): Consumption join fix — name-based fallback in consumptionMap
- **BUG-030** (HIGH): PO Create — display_qty, daily-consumption API, rate=0, search in By Item Need
- **BUG-031** (MEDIUM): RM Stock — conditional tabs, Sub Recipe filter, type-aware KPIs
- **BUG-032** (HIGH): Stock Inv — Option C hybrid segment loading (~6s), expiry inline, Adjust Stock removed
- **BUG-033** (MEDIUM): Quick Actions — ingredient pre-selection via ?item= URL param
- **BUG-034** (MEDIUM): Sub-Recipe — Delete → Active/Inactive toggle (backend API pending)
- **BUG-035** (MEDIUM): Production History — batch qty summing with unit normalization

**Investigation finding:** `include_consumption=true` param causes POS API to exceed 30s proxy timeout. Removed from background segment load.

### Prior Sessions (from repo)
- S0: Slices 1-5 (core screens), P17-P23 (amend, settings, vendors, procurement, stock, catalogue, consumption, hierarchy)
- S1: Governance setup, registries, dev dashboard
- S2: Intelligent UI across 24 screens, code quality review
- S3: API reality check, cache (72% reduction), intelligent PO, FEFO detail, production module, navigation restructure, screen audits, PO module, recipe API fix, store creation, bug batches (018-028, 029-035)

## Sprint S3 Status
- **CLOSED**: 5 CRs + 1 BUG
- **IMPLEMENTED** (awaiting QA): 7 BUGs (029-035)
- **QA/QA_PASS** (awaiting owner signoff): 9 CRs + 11 BUGs
- **PROPOSED** (backlog): 3 CRs

## Prioritized Backlog (P0/P1/P2)

### P0 — Immediate
1. QA for BUG-029→035 (QA handover ready: 47 test cases)
2. Owner smoke testing for 12 QA_PASS items

### P1 — This Sprint
3. Owner signoff on 9 QA CRs
4. Sprint S3 closure

### P2 — Next Sprint
5. CR-028: Product Catalog Excel-like Bulk Editor (plan exists)
6. CR-017: Smart Dispatch / Request Assistance
7. CR-020: Daily Intelligence Digest (SMS/WhatsApp/Email)

## Governance
- **Registry**: `control/registry.json` — 35 CRs, 35 BUGs
- **Dashboard**: `/__dev/index.html` — auto-generated from registry
- **Gate System**: 7-gate pipeline (Intake → Impact → Plan → GO → Code → QA → Smoke)
- **QA Handover**: `control/sessions/QA_HANDOVER_20260615.md`
