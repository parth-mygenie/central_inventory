# QA Session-Start — CR-027 / CR-029 / CR-026

> **Date:** 2026-06-13
> **Agent:** E1 agent
> **Sprint:** S3
> **Items:** CR-027 (Nav Restructure), CR-029 (Stock Inventory FG/Raw Split), CR-026 (Production Unit Module)
> **Branch:** 13-june-1

---

## What I'm Working On

QA smoke test of three implemented CRs. No code changes expected — testing only. Will produce Artifact 5 (QA Report) for each CR.

## QA Scope

### CR-027 — Navigation Restructure
- [ ] All 6 sidebar sections render (Dashboard, Inward, Production, Outward, Reports, Settings)
- [ ] Sections are collapsible with persist
- [ ] Active page auto-expands its section
- [ ] All nav items route correctly
- [ ] Old routes redirect (8 redirects per mock freeze)
- [ ] All 3 roles see correct nav items (master/central/franchise)
- [ ] SubRecipeMaster page loads at /sub-recipe-master
- [ ] StoreManagement shows tabs (Summary + Manage)
- [ ] OperationsHub quick actions use new paths

### CR-029 — Stock Inventory FG/Raw Split
- [ ] Stock Inventory shows 3 tabs (All / FG / Raw)
- [ ] FG tab filters to SubRecipe items only
- [ ] Raw tab filters to inventory items only
- [ ] KPIs update per tab
- [ ] Counts in tab labels are correct

### CR-026 — Production Unit Module
- [ ] Production Run Form loads at /production/new
- [ ] Sub-recipe selector shows available recipes
- [ ] Batch multiplier / quantity calculation works
- [ ] Pre-production preview shows ingredient requirements
- [ ] Production History loads at /production/history
- [ ] Past runs display with reference codes
- [ ] Run detail drill-down shows consumed allocations
- [ ] Franchise users cannot access production screens

## Pre-Conditions Verified

- [x] Read control/L2_HANDOVER_PROTOCOL.md
- [x] Read control/L6_SPRINT_STATUS.md
- [x] Checked control/registry.json — items exist
- [x] Checked control/L7_FILE_OWNERSHIP.md — no frozen files in plan (QA only)
- [x] Terminology mapping understood (backend master = business Central)

## Exit Criteria

- QA Report (Artifact 5) produced for each CR
- All blocking issues documented
- Non-blocking issues logged as BUGs in registry if needed
