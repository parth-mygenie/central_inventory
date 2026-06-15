# Central Inventory PRD

## Problem Statement
Central Inventory — multi-store hierarchy stock management module for MyGenie POS. React 19 + Craco + Tailwind + Radix UI frontend, proxy-only FastAPI backend → preprod.mygenie.online.

## Architecture
- **Backend**: FastAPI proxy to MyGenie POS API (preprod.mygenie.online). Zero business logic.
- **Frontend**: React 19 + CRACO + Tailwind CSS + Radix UI (shadcn) + Recharts
- **Database**: MongoDB (local, for session/token caching only)

## What's Been Implemented (2026-06-15)

### This Session — IMPLEMENTATION Role
- **BUG-029**: Fixed consumption 0.0 — added name-based fallback join in consumptionMap (ingredient_id ≠ inventory_master_id)
- **BUG-030**: Fixed PO Create — display_qty, daily-consumption-report API, rate=0 to API, search in By Item Need, KPIs
- **BUG-031**: Fixed RM Stock page — conditional tabs (?type=raw shows only RM), "Sub Recipe" filtered from category, KPIs type-aware
- **BUG-032**: Implemented Option C hybrid segment loading, expiry risk inline dates, removed Adjust Stock button
- **BUG-033**: Added ingredient pre-selection from URL param in DirectDispatch + WastageEntry forms
- **BUG-034**: Replaced Sub-Recipe Delete with Active/Inactive toggle (backend API pending)
- **BUG-035**: Fixed Production History ingredient qty — sum from batch segments with unit normalization

### Previous Sessions (from repo)
- S0: Slices 1-5 (all core screens), P17-P23 (amend, settings, vendors, procurement, stock, catalogue, consumption, hierarchy)
- S1: Governance setup, registries, dev dashboard
- S2: Intelligent UI across 24 screens, code quality review
- S3: API reality check, cache (72% reduction), intelligent PO, FEFO detail, production module, navigation restructure, screen audits, PO module, recipe API fix, store creation, bug batches

## Sprint S3 Status
- 5 CRs CLOSED, 9 CRs QA, 1 CR QA_PASS
- 1 BUG CLOSED, 11 BUGs QA_PASS, 7 BUGs IMPLEMENTED (this session)

## Next Tasks (P0)
1. QA for BUG-029→035 (7 items just implemented)
2. Owner smoke testing for 12 QA_PASS items
3. Owner signoff on 9 QA CRs

## Backlog
- CR-017: Smart Dispatch / Request Assistance (PROPOSED)
- CR-020: Daily Intelligence Digest (PROPOSED)
- CR-028: Product Catalog Overhaul — Excel-like Bulk Editor (PROPOSED, plan exists)
