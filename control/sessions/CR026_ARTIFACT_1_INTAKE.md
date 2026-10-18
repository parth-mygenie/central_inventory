# CR-026 Artifact 1 — Intake Document

> **CR ID:** CR-026
> **Title:** P28 — Production Unit Module (Production Run UI + History)
> **Artifact:** 1 (Intake)
> **Date:** 2026-06-13
> **Author:** E1 agent

---

## 1. Business Requirement

### 1.1 Problem Statement

The Central Inventory system has a complete backend for production runs (recipe execution that consumes raw ingredients and produces finished goods), but **no frontend UI** to operate it. Users must currently rely on direct API calls or external tools to run production. This blocks the central kitchen / production unit workflow from being operationally self-service.

### 1.2 User Story

> As a **Central Kitchen operator** (master or central store),
> I want to **select a recipe, specify a batch size, and run production**
> so that **raw ingredients are consumed via FEFO and finished goods appear in my inventory ready for dispatch to outlets.**

### 1.3 Business Value

- Completes the end-to-end inventory lifecycle: Procure → Produce → Distribute
- Enables cost tracking per production batch (blended segment costs)
- Provides audit trail for production runs (traceability for food safety)
- Eliminates dependency on direct API calls for daily kitchen operations

---

## 2. Scope Definition

### 2.1 In Scope

| # | Feature | Description |
|---|---------|-------------|
| F1 | **Production Run Form** | Select sub-recipe, enter quantity (multiplier or absolute), batch label, expiry date → execute production |
| F2 | **Pre-Production Preview** | Show which ingredients will be consumed, current stock levels, and whether sufficient stock exists |
| F3 | **Post-Production Confirmation** | Display production run result: run ID, reference code, unit cost, total cost, FG segment created |
| F4 | **Production History** | List of past production runs with date, recipe, quantity, cost, status |
| F5 | **Production Run Detail / Audit** | Drill-down into a production run showing per-ingredient consumed allocations (segments, batches, costs) |
| F6 | **Route & Navigation** | New route `/production/new` for run form, `/production/history` for history |

### 2.2 Out of Scope (Deferred)

| # | Feature | Reason |
|---|---------|--------|
| D1 | Production scheduling / calendar | Future CR — requires backend support |
| D2 | Auto-production triggers (low stock → produce) | Future CR — requires intelligence layer |
| D3 | Recipe costing preview (without running) | Nice-to-have, can be added later |
| D4 | Multi-step production (recipe chains) | Backend handles via sub-recipe nesting, no special UI needed now |
| D5 | Production cancellation / reversal | Backend may not support; needs API discovery |

---

## 3. Confirmed Backend APIs

### 3.1 Production Run — Execute

```
POST /inventory/production-run/complete
{
  "sub_recipe_id": 187,
  "quantity": 930,
  "unit": "piece",
  "batch": "ELACHI-3VENDOR-001",
  "expiry_date": "2026-10-20"
}
```

**Response:**
```json
{
  "production_run_id": 10,
  "reference_code": "PRD-2026-0010",
  "quantity_added": 930,
  "unit_cost": 2.8041,
  "total_cost": 2607.85,
  "output_segment_id": 364
}
```

**Validated:** 10 production runs in P28 smoke (PRD-2026-0001 through PRD-2026-0010). All passed.

### 3.2 Production Run — Audit Detail

```
GET /inventory/production-run/{id}
```

**Response includes:**
- `production_run_id`, `reference_code`, `sub_recipe_id`, `quantity`, `unit_cost`, `total_cost`
- `consumed_allocations[]` — per-ingredient breakdown:
  - `ingredient_id`, `ingredient_name`, `quantity_consumed`, `unit`
  - `segment_allocations[]` — per-segment: `segment_id`, `batch`, `expiry_date`, `qty_cal`, `unit_cost`, `alloc_cost`
  - `line_cost` — sum of alloc_costs (blended)

**Validated:** Full audit trail verified for 10 runs including cross-segment blended cost (₹0.00 diff).

### 3.3 Sub-Recipe List (for recipe selector)

```
GET /recipe/sub-recipes
```

**Response:** Array of sub-recipes with `recipe_id`, `name`, `inventory_id` (FG item), `qty`, `unit`, `ingredients[]`.

**Validated:** 4 sub-recipes confirmed (IDs 187, 191, 192, 193).

### 3.4 APIs Requiring Discovery

| API | Expected Endpoint | Status | Priority |
|-----|------------------|:------:|:--------:|
| **Production run list/history** | `GET /inventory/production-run` or `POST /inventory/production-run/history` | ⚠️ UNPROBED | P0 — needed for F4 |
| **Production run delete/cancel** | `DELETE /inventory/production-run/{id}` | ⚠️ UNPROBED | P2 — may not exist |
| **Ingredient availability check** | Derived from `GET /inventory/stock-inventory` | ✅ EXISTS | P1 — for F2 preview |

---

## 4. Data Model

### 4.1 Sub-Recipe (BOM Definition)

```
SubRecipe {
  recipe_id: number        // Sub-recipe ID
  name: string             // "Whole wheat Elachi Cookies"
  inventory_id: number     // FG inventory_master_id (the output item)
  qty: number              // Output quantity per run (e.g., 31 pieces)
  unit: string             // "piece"
  ingredients: [           // Bill of Materials
    {
      ingredient_id: number    // inventory_master_id of raw material
      ingredient_name: string
      ingredient_qty: number   // quantity consumed per run
      ingredient_unit: string  // "gm", "ml", etc.
    }
  ]
}
```

### 4.2 Production Run (Execution Result)

```
ProductionRun {
  production_run_id: number
  reference_code: string       // "PRD-2026-0010"
  sub_recipe_id: number
  quantity: number             // FG quantity produced
  unit: string
  batch: string               // Batch label
  expiry_date: string          // "YYYY-MM-DD"
  unit_cost: number            // ₹ per unit (blended)
  total_cost: number           // unit_cost × quantity
  output_segment_id: number    // Created FG segment
  consumed_allocations: [      // Per-ingredient audit
    {
      ingredient_id: number
      ingredient_name: string
      quantity_consumed: number
      unit: string
      line_cost: number        // SUM(alloc_costs)
      segment_allocations: [
        {
          segment_id: number
          batch: string
          expiry_date: string
          qty_cal: number
          unit_cost: number
          alloc_cost: number
        }
      ]
    }
  ]
}
```

---

## 5. User Roles & Visibility

| Role | Can Run Production? | Can View History? | Notes |
|------|:-------------------:|:-----------------:|-------|
| **Master** | ✅ Yes | ✅ Yes | Full access — primary production operator |
| **Central** | ✅ Yes | ✅ Yes | Central kitchens are production facilities |
| **Franchise** | ❌ No | ❌ No | Franchises receive FG via transfers, they don't produce |

**Gating:** `operational_settings.production_enabled` must be `true` (confirmed true in P28 smoke). Role gate via `isTopLevel || isMiddleLevel` from `useLoginContext`.

---

## 6. UI/UX Requirements (High-Level)

### 6.1 Production Run Form (`/production/new`)

1. **Sub-recipe selector** — dropdown of available sub-recipes (from `GET /recipe/sub-recipes`)
   - Show: name, output qty per batch, unit, ingredient count
2. **Batch multiplier** — "How many batches?" (e.g., 30) or absolute quantity (e.g., 930 pieces)
   - Auto-calculate: total output = base_qty × multiplier
3. **Batch label** — text input (e.g., "ELACHI-3VENDOR-001")
   - Auto-suggest: `{RECIPE_SHORT}-{DATE}-{SEQ}`
4. **Expiry date** — date picker (must be future)
5. **Pre-production preview** (F2):
   - Table: ingredient name, required qty, current stock, sufficient (✅/❌)
   - Warning banner if any ingredient is insufficient
   - Total estimated cost (if cost data available)
6. **Execute button** → calls `POST /production-run/complete`
7. **Post-production confirmation** (F3):
   - Run ID, reference code, FG created, unit cost, total cost
   - "View in Stock" link → `/inventory/{fg_id}`
   - "Run Another" button

### 6.2 Production History (`/production/history`)

1. **Table** of past production runs:
   - Date, reference code, recipe name, quantity, unit cost, total cost
   - Click → drill-down to detail
2. **Filters:** date range, recipe name search
3. **Summary KPIs:** total runs, total FG produced, total cost

### 6.3 Production Run Detail

1. **Summary card:** Run ID, reference, date, recipe, quantity, unit cost, total cost
2. **Consumed allocations table:** per-ingredient rows with expandable segment allocations
   - Ingredient name, total consumed, total cost
   - Expand → segment: batch, expiry, qty, unit cost, alloc cost
3. **Output section:** FG item name, segment ID, batch, expiry, quantity created

---

## 7. Estimated Effort

| Phase | Scope | Est. |
|-------|-------|:----:|
| API Discovery | Probe production-run list/history endpoint | ~30 min |
| Impact Analysis (Artifact 2) | File impact, integration points, risk | ~1h |
| Implementation Plan (Artifact 3) | Detailed component plan, phased delivery | ~1h |
| Phase 1: Production Run Form | F1 + F2 + F3 | ~4-5h |
| Phase 2: Production History + Detail | F4 + F5 + F6 | ~3-4h |
| QA & Testing | End-to-end with test accounts | ~1-2h |
| **Total** | | **~10-14h** |

---

## 8. Test Accounts (from P28 Smoke)

| Store | RID | Email | Password | Type |
|-------|-----|-------|----------|------|
| german fluid (Master) | 806 | manager@germanfluid.com | Qplazm@10 | master |
| Central Kitchen Alpha | 807 | manager@centralkitchenalpha.com | Qplazm@10 | central |
| Central Kitchen Beta | 808 | manager@centralkitchenbeta.com | Qplazm@10 | central |
| Outlet Direct One | 809 | manager@outletdirectone.com | Qplazm@10 | franchise |

---

## 9. Open Questions — RESOLVED (Owner Answers, 13 Jun 2026)

| # | Question | Owner Answer | Impact |
|---|----------|-------------|--------|
| Q1 | Does production-run list/history API exist? | **Discover gaps during Impact Analysis — owner will pass to backend team** | Probe API; document gaps as backend requirements |
| Q2 | Recipe vs Sub-recipe production? | **Sub-recipe only** — sub-recipes are the final product (FG) that goes to master/outlets | Scope reduced: only `sub_recipe_id` in production form, no recipe-level production |
| Q3 | Insufficient stock handling? | **Configuration-driven** — depends on `allow_negative_stock` in operational settings | Read setting at runtime; hard-block when false, warn-but-allow when true |
| Q4 | Cost visibility? | **Both pre-run estimate + post-run actual** — final authoritative cost is post-production | Pre-run: estimate from segment costs (needs API discovery). Post-run: from production-run response |
| Q5 | Additional features? | **Follow Intelligence UI methodology** (CR-019/CR-021 Phase 7 pattern) | Add: production suggestions based on outlet stock, ingredient health, staleness indicators, coverage-based suggestions, post-production next-best-actions |

### Intelligence UI Elements for Production (from Q5)

Per the Phase 7 frozen spec pattern (CR-019/CR-021), the Production UI will include:
- **"You should produce X"** suggestions based on low FG stock at outlets or pending requests
- **Ingredient health strip** — which ingredients are running low or expiring soon
- **"Last produced X days ago"** staleness indicator per sub-recipe
- **Coverage-based suggestion** — "At current consumption rate, 930 cookies covers N days across M outlets"
- **Post-production next-best-action** — "Dispatch to Outlet Direct One (0 stock, 3 pending requests)"

---

## 10. Acceptance Criteria

| # | Criteria | Verification |
|---|---------|-------------|
| AC-1 | User can select a sub-recipe and run production with batch label + expiry | Manual test |
| AC-2 | Ingredients are consumed via FEFO (verify via stock-inventory detail post-run) | API check |
| AC-3 | FG appears in stock inventory with correct batch/expiry/quantity | API check |
| AC-4 | Post-production shows unit cost and total cost (blended) | UI verification |
| AC-5 | Production history lists past runs | UI verification |
| AC-6 | Production audit shows per-ingredient segment allocations | UI verification |
| AC-7 | Franchise users cannot access production screens | Role gate test |
| AC-8 | Form warns when ingredient stock is insufficient | UI test |
