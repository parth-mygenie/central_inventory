# Agent Handover — Central Inventory (Session Close 2026-06-14)

> **From:** Implementation Agent
> **To:** Next Agent
> **Date:** 2026-06-14
> **Branch:** `14-june-1`
> **Priority:** Pick items from lists below, get owner approval, implement one-by-one

---

## READ THESE FILES FIRST

| # | File | What You Learn | Time |
|---|------|----------------|:----:|
| 1 | **This file** | What's done, what's next | 5 min |
| 2 | `control/AGENT_PROMPT.md` | Project rules, terminology inversion, frozen files | 5 min |
| 3 | `memory/test_credentials.md` | Login credentials | 1 min |

---

## WHAT WAS DONE THIS SESSION

| Item | Type | Status | What |
|------|:----:|:------:|------|
| BUG-017 | BUG | **CLOSED** | Duplicate ingredient filter in Recipe/Sub-Recipe BOM |
| CR-035 | CR | **CLOSED** | 2-step store creation wizard + outlet visibility from Central |
| BUG-023 | BUG | **QA_PASS** | $ → ₹ icon across 4 files |
| BUG-021 | BUG | **QA_PASS** | Removed Adjust Stock quick action |
| BUG-020 | BUG | **QA_PASS** | "Unknown: —" → real store names via useRestaurantMap |
| BUG-022 | BUG | **QA_PASS** | Gate page auto-redirect to Purchase Orders |
| BUG-025 | BUG | **QA_PASS** | Food edit Dialog → Side Sheet with Quick Info |
| BUG-019 | BUG | **QA_PASS** | Stock Inventory split FG (Outward) / RM (Inward) via nav |
| BUG-024 | BUG | **QA_PASS** | Production Run → master-detail layout rewrite |
| BUG-018 | BUG | **QA_PASS** | Push status reads `push_summary` (accurate counts) |
| BUG-014 | BUG | **RESOLVED** | Test entities 787/788/789 no longer in API |
| G-023 | GAP | **CLOSED** | Backend added `push_summary` + missing `child_existing` keys |

**8 bugs QA_PASS — awaiting owner signoff to close.**

---

## ITEMS READY FOR IMPLEMENTATION (Owner picks)

### Priority 1: CR-018 — Wastage Report Enhancements (PLANNED, ~45 min)

**What:** Add 3 intelligence features to `WastageReport.jsx`:
- Top Wasted Items aggregation (useMemo)
- Reason Breakdown chart
- Period Comparison (trend vs previous period)

**Planning:** All 5 artifacts done (Session-Start, Intake, Impact, Plan, Code-Gate, Mock Freeze)
**Plan:** `control/sessions/CR018_ARTIFACT_3_IMPLEMENTATION_PLAN.md`
**Mock:** `/__dev/previews/CR018_wastage_report_intelligence.html`
**File:** `WastageReport.jsx` only. Single delivery.
**Status:** Planning complete, **zero code changes made yet**.

---

### Priority 2: 9 CRs in QA status (code exists, need owner review + signoff)

These were all implemented in previous sessions. Code is live. They need owner QA walkthrough and signoff.

| CR | Title | Notes |
|---|---|---|
| **CR-016** | Stock Inventory Hierarchy Toggle | Needs re-QA after repo sync fix |
| **CR-026** | Production Unit Module | Run form + history + audit detail |
| **CR-027** | Navigation Restructure | Grouped sidebar |
| **CR-029** | Stock Inventory Split FG/RM | Tabs: FG vs RM (BUG-019 added nav links on top) |
| **CR-030** | Inward Screens Audit | Vendor + Raw Material + PO Module (9 screens) |
| **CR-031** | Production Screens Audit | SubRecipe + ProductionRun + History |
| **CR-032** | Outward Screens Audit | StoreManagement + ProductCatalog + StockInventory + Queues + Ledger |
| **CR-033** | Action Screens Audit | Dispatch + Request + Adjustment + Wastage + Transfer Detail |
| **CR-034** | Recipe/Sub-Recipe API Fix | 15 field-name mismatches fixed |

---

### Priority 3: PROPOSED CRs (not started, need scoping)

| CR | Title | Effort | Notes |
|---|---|:---:|---|
| **CR-017** | Smart Dispatch / Request Assistance | ~10-15h | AI-powered suggestions beyond CR-025 coverage intelligence |
| **CR-020** | Daily Intelligence Digest | TBD | SMS/WhatsApp/Email daily summary. Owner said "next phase" |
| **CR-028** | Product Catalog Bulk Editor | TBD | Excel-like spreadsheet UI, import/export, inline editing |

---

## OPEN / ACCEPTED BUGS — Backend Blocked

### Will NOT be fixed until backend provides missing APIs

| Bug | Sev | Title | Blocked By |
|---|:---:|---|---|
| **BUG-003** | MEDIUM | Stock Ledger N+1 API calls | G-005: Needs dedicated ledger API |
| **BUG-012** | LOW | Parent store heuristic | `hierarchy-summary`/`hierarchy-detail` missing `parent_restaurant_id` |
| **BUG-004** | MEDIUM | Before/After qty shows dash | G-002: API doesn't return before/after quantities |
| **BUG-007** | MEDIUM | No adjustment history | G-001: No adjustment history API |
| **BUG-005** | LOW | Actor names as IDs | G-003: No user name resolution API |
| **BUG-002** | LOW | History lacks type badges | G-004: API missing `restaurant_type` |

### Accepted — Not bugs / data issues / edge cases

| Bug | Sev | Title | Why Accepted |
|---|:---:|---|---|
| BUG-001 | LOW | Read-only banner on Stock Detail | Intentional design — FEFO panel is view-only |
| BUG-006 | LOW | Source selector batched stock | Edge case, segment mode is default |
| BUG-008 | LOW | Wastage ledger empty | No wastage data in preprod — code ready |
| BUG-009 | LOW | Wastage Report Outlet error | Preprod API scope restriction |
| BUG-010 | MEDIUM | add-stock payload estimated | Decrease verified, increase may need tuning |
| BUG-013 | LOW | Date filter client-side | Was seed-data issue (removed). Real API filters correctly |
| BUG-015 | INFO | Negative stock legacy data | Historical, doesn't affect new transactions |

---

## OPEN BACKEND GAPS (L9)

| Gap | What's Missing | Priority |
|-----|---------------|:--------:|
| G-001 | Stock adjustment history API | P2 |
| G-002 | Before/after qty in transfer API | P2 |
| G-003 | User name resolution API | P3 |
| G-004 | History API missing restaurant_type | P3 |
| G-005 | Dedicated stock ledger API | P2 |
| G-006 | Stock return flow API | P1 |
| G-011 | WebSocket infrastructure | P2 |
| G-014 | Invoice OCR/AI extraction | P1 |
| G-015 | Excel/CSV parsing service | P2 |
| G-016 | Invoice number storage | P2 |
| G-020 | Custom unit conversion | P1 |

**3 P1 gaps:** G-006 (return flow), G-014 (OCR), G-020 (unit conversion)

---

## REGISTRY COUNTS

| Type | CLOSED | QA_PASS | QA | PLANNED | PROPOSED | IN_PROGRESS | Other |
|------|:------:|:-------:|:--:|:-------:|:--------:|:-----------:|:-----:|
| CRs (35) | 22 | — | 9 | 1 | 3 | 0 | — |
| BUGs (25) | 1 | 8 | — | 1 | — | — | 11 ACCEPTED, 2 DEFERRED, 2 RESOLVED |

---

## KEY GOTCHAS

| # | Gotcha |
|---|--------|
| 1 | **Terminology inversion**: API `master`=Central, `central`=Master, `franchise`=Outlet. Use `terminology.js`. |
| 2 | **`screenVisibility.js` was unfrozen** for BUG-019 (owner approved). Now has RM Stock under Inward, FG Stock under Outward. |
| 3 | **`push_summary`** is now the source of truth for push status (BUG-018). Fallback to old manual computation if field absent. |
| 4 | **`display_qty` is a STRING** from POS API — always `Number()` wrap before arithmetic. |
| 5 | **Recipe `name` = food_id integer** (CR-034 fix). Sub-recipe uses `ingredient` singular for create, `ingredients` plural for update. |
| 6 | **CR-018** is PLANNED not IN_PROGRESS — planning done, zero code changes. |

---

## ENVIRONMENT

| Item | Value |
|------|-------|
| Branch | `14-june-1` |
| App URL | `https://5e9eb16d-7af1-4e3e-927b-db471f4bfe7d.preview.emergentagent.com` |
| Backend | FastAPI proxy on port 8001 (supervisor) — DO NOT MODIFY |
| Frontend | React 19 + Craco on port 3000 (supervisor) |
| POS API | `https://preprod.mygenie.online/api/v2/vendoremployee` |
| Test Login | `manager@germanfluid.com` / `Qplazm@10` (Central Store, RID 806) |

---

*End of Handover — Session 2026-06-14*
