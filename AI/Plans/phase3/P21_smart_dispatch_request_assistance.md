# P21 — Smart Dispatch & Request Assistance Layer

> **Status:** PLANNING + BRAINSTORMING — no code changes
> **Author:** E1 agent, 27 May 2026
> **Depends on:** P15/P16/P17 lifecycle, P20 stock-inventory, request-catalog, operational-settings
> **Concept preview:** See `smart_dispatch_concept.png`

---

## 0. Problem Statement

### What operators do today

A Central Store manager dispatching stock to DemoFranchise4:

1. Opens Direct Dispatch form
2. Selects destination store from dropdown
3. **Has no idea what Franchise4 actually needs**
4. Opens hierarchy detail in another tab to check Franchise4's stock
5. Mentally cross-references low-stock items
6. Manually picks items and guesses quantities
7. Selects source segments
8. Submits

A franchise outlet manager requesting stock:

1. Opens Request Stock form
2. Picks source store (usually direct parent)
3. Browses source catalog (sees source's items, not own gaps)
4. **Has no view of what they're low on while browsing source catalog**
5. Manually types quantities from memory
6. Submits

### What's broken

- **Destination blindness:** Dispatch form has zero destination stock context. The operator has the truck keys but can't see what the warehouse needs.
- **Request memory tax:** Outlet manager must memorize their own low-stock items before navigating to request form. There's no bridge between "I'm low on maida" → "Request 2kg maida from parent."
- **Quantity guessing:** No suggested quantities. Operators either over-send (waste, expiry risk) or under-send (stockout continues).
- **No urgency signal:** All items look the same in a dropdown. maida at 0kg and Cooking Oil at 24.82 ltr get equal visual weight.

### What we want

When an operator selects a destination store, the system should **surface that store's stock health** and **suggest what to send and how much** — all driven by deterministic rules the operator can understand and override.

---

## 1. Data Sources Inventory

### Currently Available (frontend already has access)

| Source | Endpoint | Data | Reliability |
|--------|----------|------|-------------|
| **Destination stock** | `GET /inventory/stock-inventory` | `current_stocks[]` with `is_low_stock`, `display_qty`, `min_qty_alert` | HIGH — P20 validated, self-store only |
| **Source inventory** | `GET /inventory/get-inventory-master` | Own store's items with quantities | HIGH — existing |
| **Source segments** | `POST /source-options` | Batch/segment breakdown of own stock | HIGH — existing |
| **Transfer history** | `POST /history` | Past transfers with dates, quantities, statuses | HIGH — existing |
| **Pending queues** | `POST /pending-queues` | Open requests/approvals for the store | HIGH — existing |
| **Request catalog** | `POST /request-catalog` | Source store's available items | HIGH — existing |
| **Hierarchy summary** | `POST /hierarchy-summary` | Store list with store types | HIGH — existing |

### POS Endpoints — REGISTERED but UNVALIDATED

| Source | Endpoint | Potential Data | Status |
|--------|----------|---------------|--------|
| **Ops dashboard** | `POST /ops-dashboard` | Aggregated operational metrics | UNVALIDATED |
| **Near-expiry alerts** | `POST /near-expiry-alerts` | Segments expiring within N days | UNVALIDATED |
| **Stale transfers** | `POST /stale-transfers` | Transfers older than N hours | UNVALIDATED |
| **Cost valuation** | `POST /cost-valuation` | FIFO cost valuation | UNVALIDATED |

### NOT Available (would require new backend work)

| Source | What We'd Need | Complexity |
|--------|---------------|------------|
| **Consumption velocity** | Sales data + recipe deduction rates per item per store | HIGH — POS order/recipe system |
| **Demand forecasting** | Historical consumption time series | VERY HIGH — ML pipeline |
| **Seasonal patterns** | Multi-month consumption history | HIGH — data warehouse |
| **Wastage correlation** | Link wastage records to over-dispatch events | MEDIUM — data join |

---

## 2. Recommendation Logic — Rule-Driven, Not ML

### Core Principle: Deterministic + Explainable

Every suggestion must have a one-sentence explanation the operator can read and agree or disagree with. No black boxes. No "AI recommends." Every number is traceable to a formula.

### Recommendation Tier System

#### Tier 1: CRITICAL (red) — Deterministic, zero-ambiguity

**Rule:** Destination item has `is_low_stock === true` AND `display_qty === 0`

**Logic:**
```
IF destination.item.display_qty == 0 AND destination.item.is_low_stock == true
THEN criticality = "CRITICAL"
     label = "Out of stock"
     suggested_qty = destination.item.min_qty_alert (converted to display unit)
     explanation = "DemoFranchise4 has 0 kg maida. Min threshold is 500 gm."
```

**Source:** P20 `stock-inventory` for destination, `min_qty_alert` for threshold.

#### Tier 2: LOW (amber) — Deterministic, threshold-based

**Rule:** Destination item has `is_low_stock === true` AND `display_qty > 0`

**Logic:**
```
IF destination.item.is_low_stock == true AND destination.item.display_qty > 0
THEN criticality = "LOW"
     label = "Below threshold"
     deficit = destination.item.min_qty_alert - destination.item.cal_quantity
     suggested_qty = ceil(deficit / unit_factor)
     explanation = "DemoFranchise4 has 0.2 ltr Cooking Oil. Threshold is 200 ml."
```

**Source:** Same P20 data. `suggested_qty` = threshold minus current, clamped to min 1 unit.

#### Tier 3: PENDING REQUEST (blue) — Context-aware

**Rule:** Destination has an open request (`my_requests` with status `requested`) that hasn't been dispatched yet.

**Logic:**
```
IF pending_queues.approval_pending contains transfer WHERE
     to_restaurant_id == destination_id AND status == "requested"
THEN for each line in that transfer:
     criticality = "PENDING_REQUEST"
     label = "Open request waiting"
     suggested_qty = line.requested_qty
     explanation = "DemoFranchise4 requested 1 kg patri (Transfer #120, 2 days ago)"
```

**Source:** `pending-queues` (already loaded in OperationsHub). Cross-reference with transfer details.

#### Tier 4: RECENTLY DISPATCHED (gray, informational) — History-aware

**Rule:** An item was dispatched to this destination in the last 7 days.

**Logic:**
```
IF transfer_history contains transfer WHERE
     to_restaurant_id == destination_id AND status == "dispatched" OR "received"
     AND created_at > (now - 7 days)
THEN for each line in that transfer:
     criticality = "RECENTLY_SENT"
     label = "Sent 3 days ago"
     suggested_qty = null (informational only)
     explanation = "Last sent 2 kg maida on 24 May (Transfer #115, received)"
```

**Source:** `transfer-history` with date range filter. Prevents double-dispatch to same store for same item.

### Recommendation Priority (display order)

```
1. CRITICAL (out of stock)        → red    → auto-added to cart
2. LOW (below threshold)          → amber  → suggested, not auto-added
3. PENDING_REQUEST (open request)  → blue   → show as context, not suggestion
4. RECENTLY_SENT (dispatched)      → gray   → informational warning
5. OK (above threshold)            → hidden → not shown in suggestions
```

### What We Deliberately Do NOT Do

| Decision | Reason |
|----------|--------|
| No ML-based quantity prediction | Not enough data; explainability is more valuable than precision |
| No consumption velocity in Phase 1 | Requires POS order/recipe data we don't have yet |
| No auto-dispatch | Operator must always confirm; we suggest, never execute |
| No cross-store optimization | "Optimal network-wide rebalancing" is analytics scope creep |
| No "days until stockout" in Phase 1 | Requires consumption velocity data |

---

## 3. Smart Dispatch UX — Detailed Design

### 3.1 The Destination Intelligence Pattern

**Trigger:** Operator selects a destination store in the dispatch form.

**System reaction:**
1. Fetch destination's `stock-inventory` via P20 endpoint
2. Cross-reference with source's own inventory (already loaded)
3. Cross-reference with pending queues (approval_pending for that destination)
4. Cross-reference with recent transfer history (last 7 days to that destination)
5. Compute recommendations using Tier 1-4 logic
6. Surface in a **Suggestions Sidebar** adjacent to the item form

### 3.2 Dispatch Form Layout — Two-Panel

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← Back    Direct Dispatch                                              │
├──────────────────────────────┬──────────────────────────────────────────┤
│                              │                                          │
│  DISPATCH FORM (left 60%)    │  DESTINATION INTEL (right 40%)           │
│                              │                                          │
│  ┌── Destination Store ────┐ │  ┌── DemoFranchise4 Stock Health ─────┐ │
│  │ [DemoFranchise4 ▾]      │ │  │                                     │ │
│  └─────────────────────────┘ │  │  4 items · 2 critical · 0 pending  │ │
│                              │  │                                     │ │
│  ┌── Items ────────────────┐ │  │  ● maida         CRITICAL           │ │
│  │  Item 1: maida          │ │  │    0 kg (min 500 gm)                │ │
│  │  Qty: 2 kg              │ │  │    Suggested: 2 kg                  │ │
│  │  Source: seg #23         │ │  │    [+ Add to dispatch]              │ │
│  │                          │ │  │                                     │ │
│  │  Item 2: patri          │ │  │  ● patri         CRITICAL           │ │
│  │  Qty: 1 kg              │ │  │    0 kg (min 100 gm)                │ │
│  │  Source: seg #45         │ │  │    Suggested: 1 kg                  │ │
│  │                          │ │  │    [+ Add to dispatch]              │ │
│  │  [+ Add Item]           │ │  │                                     │ │
│  └─────────────────────────┘ │  │  ● Cooking Oil    OK                 │ │
│                              │  │    0.5 ltr (min 200 ml)              │ │
│  [Create Dispatch]           │  │    ✓ Above threshold                 │ │
│                              │  │                                     │ │
│                              │  │  ● red meat       OK                 │ │
│                              │  │    2.1 kg (min 500 gm)              │ │
│                              │  │    ✓ Above threshold                 │ │
│                              │  │                                     │ │
│                              │  │  ─── Recently Sent ────────────     │ │
│                              │  │  maida 1kg — 25 May (T#115)         │ │
│                              │  │                                     │ │
│                              │  │  [Add All Critical (2)]             │ │
│                              │  └─────────────────────────────────────┘ │
│                              │                                          │
└──────────────────────────────┴──────────────────────────────────────────┘
```

### 3.3 Suggestions Sidebar Anatomy

**Header section:**
```
┌─────────────────────────────────────┐
│ DemoFranchise4 — Stock Health       │
│ Outlet · Store #786                 │
│ 4 items · 2 critical · 0 pending   │
│                                     │
│ ██████████░░░░ 50% stocked          │
│ (2 of 4 above threshold)           │
└─────────────────────────────────────┘
```

**Item cards (CRITICAL/LOW only — OK items collapsed by default):**
```
┌─────────────────────────────────────┐
│ ● maida                   CRITICAL  │
│   Current: 0 kg                     │
│   Threshold: 500 gm                 │
│   Suggested: 2 kg                   │
│   Your stock: 108.15 kg ✓          │
│                                     │
│   [+ Add to dispatch]               │
└─────────────────────────────────────┘
```

Key design decisions:
- **"Your stock" line:** Shows whether the source store actually HAS this item to dispatch. Prevents suggesting items the source doesn't have.
- **Suggested qty:** `max(threshold - current, min_sensible_unit)`. For maida (threshold 500gm, current 0): suggest 2kg (round up from 0.5kg threshold to practical dispatch unit).
- **"+ Add to dispatch" button:** Adds an item row to the left-side form pre-filled with: itemId, suggested quantity, unit. Source selector still requires manual selection (operator owns segment choice).

**Bulk action:**
```
[Add All Critical Items (2)]
```
Adds all Tier 1 (CRITICAL) items to the dispatch form at once with suggested quantities. Source selector still needs manual selection per item.

**Collapsed OK section:**
```
┌─────────────────────────────────────┐
│ ▶ 2 items above threshold           │
│   Cooking Oil 0.5 ltr, red meat ... │
└─────────────────────────────────────┘
```

### 3.4 Source Stock Confidence

For each suggested item, show source availability:

| Source has stock | Display | Action |
|-----------------|---------|--------|
| Source qty > suggested qty | "Your stock: 108.15 kg ✓" (green) | Normal add |
| Source qty > 0 but < suggested qty | "Your stock: 0.3 kg ⚠" (amber) | Add with capped suggestion |
| Source qty = 0 | "You have 0 kg — cannot dispatch" (red) | Disable add button |

This prevents the operator from adding an item they can't actually send.

### 3.5 Recently Sent Context

Below the item cards, a collapsed section:

```
─── Recently Sent to DemoFranchise4 ──────────
  maida 1kg — 25 May (Transfer #115, received)
  Cooking Oil 0.5 ltr — 23 May (Transfer #112, received)
```

Purpose: **Prevents accidental double-dispatch.** If the operator sees "I sent 1kg maida 2 days ago and it's still at 0kg," that's a signal of consumption velocity (inference, not calculation).

### 3.6 Pending Request Context

If destination has open requests waiting for approval:

```
─── Open Requests from DemoFranchise4 ────────
  ⏳ Request #120: 1 kg patri (requested 2 days ago)
     [Approve & Dispatch Instead →]
```

The "Approve & Dispatch Instead" link navigates to the transfer detail page where the operator can approve the existing request instead of creating a duplicate dispatch.

---

## 4. Smart Request UX — Detailed Design

### 4.1 The Self-Awareness Pattern

**Trigger:** Franchise manager opens Request Stock form.

**System reaction:**
1. Fetch own store's `stock-inventory` (P20 — already available via useStockInventory hook)
2. After source is selected: fetch `request-catalog` from source
3. **Bridge the gap:** Show own low-stock items alongside source catalog

### 4.2 Request Form Enhancement — Stock Health Banner

Before the item rows section, add an awareness banner:

```
┌─────────────────────────────────────────────────┐
│  📊 Your Stock Health                            │
│  2 items below threshold                         │
│                                                  │
│  ● maida     0 kg  (threshold 500 gm)  [+ Add] │
│  ● patri     0 kg  (threshold 100 gm)  [+ Add] │
│                                                  │
│  [Add All Low-Stock Items]                       │
└─────────────────────────────────────────────────┘
```

"[+ Add]" matches the low-stock item to the source catalog by `stock_title` and auto-fills the item row with:
- `source_inventory_master_id` from the catalog match
- `quantity` = suggested replenishment qty
- `unit` from catalog

### 4.3 Matching Algorithm (stock-inventory ↔ request-catalog)

```
For each own_item WHERE is_low_stock === true:
  Find catalog_item WHERE catalog_item.stock_title === own_item.stock_title
  IF match found:
    suggestion = {
      own_item: own_item,
      catalog_item: catalog_item,
      suggested_qty: computeReplenishQty(own_item),
      source_available: catalog_item.available_display_qty,
      matchConfidence: "exact_title"
    }
  ELSE:
    suggestion = {
      own_item: own_item,
      catalog_item: null,
      unavailable: true,
      label: "Not available at source"
    }
```

**Matching by `stock_title`** is the only safe approach. Inventory master IDs differ per store. Stock titles are human-curated and shared across the franchise push system.

### 4.4 Suggested Replenishment Quantity

```
function computeReplenishQty(item):
  threshold_display = item.min_qty_alert / unit_factor(item.min_unit_alert, item.display_unit)
  current = item.display_qty
  deficit = threshold_display - current

  IF deficit <= 0:
    return threshold_display  // At least one threshold unit
  ELSE:
    // Round up to practical dispatch unit
    return ceil(deficit * 2) / 2  // Round to nearest 0.5
```

**Why 2x deficit?** If the threshold is 0.5kg and current is 0kg, sending exactly 0.5kg puts them right at the alert line. Sending 1kg gives breathing room. The operator can always adjust.

---

## 5. Architecture — Hook + Service Layer

### 5.1 New Hook: `useDestinationIntel`

```
function useDestinationIntel(destinationRestaurantId):
  // Inputs: destination store ID (from dispatch form selection)
  // Outputs: { destStock, suggestions, recentTransfers, pendingRequests, loading, error }

  // 1. Fetch destination's stock-inventory
  //    PROBLEM: stock-inventory is self-store only (auth-scoped)
  //    SOLUTION: See Section 5.3

  // 2. Cross-reference with source inventory (already in component)
  // 3. Fetch transfer history filtered to destination (last 7 days)
  // 4. Fetch pending queues and filter for destination
  // 5. Compute Tier 1-4 recommendations
```

### 5.2 THE CRITICAL PROBLEM: Cross-Store Stock Visibility

**`GET /inventory/stock-inventory` is auth-scoped.** It returns the logged-in store's inventory only. A Central (C782) operator **cannot** fetch Franchise4's stock via this endpoint.

**Solutions evaluated:**

| Approach | Feasibility | Tradeoffs |
|----------|------------|-----------|
| A. Use `hierarchy-detail` for destination stock | **VIABLE** — already works. `hierarchy-detail` with `store_restaurant_id=786` returns Franchise4's `child_stock_summary[]` | Different field names (`total_quantity` vs `cal_quantity`). No `is_low_stock` boolean. Must compute low-stock manually using `min_qty_alert` logic. |
| B. New backend endpoint (destination stock proxy) | Clean but requires backend work | Out of scope for frontend-only changes |
| C. Use `stock-inventory?include_hierarchy=true` + `by_store[]` | Gives per-store aggregate only (stock_rows, low_stock_rows, total_qty) — **no per-item breakdown** | Not granular enough for item-level suggestions |
| D. Backend impersonation endpoint | Security concern | Not recommended |

**Recommended: Approach A — Use `hierarchy-detail`**

`hierarchy-detail` with `store_restaurant_id={dest_id}` returns:
```json
{
  "child_stock_summary": [
    { "stock_title": "maida", "total_quantity": 0, "unit": "kg", "display_quantity": 0, ... }
  ]
}
```

This gives us per-item stock for any destination store in scope. We must:
1. Normalize field names (`total_quantity` → `cal_quantity`, `display_quantity` → `display_qty`)
2. Compute `is_low_stock` manually (compare `total_quantity` with low-stock threshold)

**The existing `normalizeStockSummaryItem()` in api.js already handles this normalization.** Existing infrastructure is sufficient.

**Limitation:** `hierarchy-detail` does NOT return `min_qty_alert` or `min_unit_alert`. These thresholds are only in `stock-inventory`.

**Workaround:** Use `stock-inventory?include_hierarchy=true` to get `hierarchy_summary.by_store[dest_id].low_stock_rows` as a coarse signal, AND `hierarchy-detail` for per-item quantities. For precise thresholds, we would need a new backend field in `hierarchy-detail` or a separate endpoint.

**Practical Phase 1 approach:** Use `hierarchy-detail` for per-item `display_quantity`. Flag items where `display_quantity === 0` as CRITICAL and items where `display_quantity` is "very low" (< 10% of source's qty for the same item) as LOW. Not perfect, but operationally useful without new backend work.

### 5.3 New Hook: `useOwnLowStock`

For the request form enhancement:

```
function useOwnLowStock():
  // Uses existing useStockInventory() hook
  // Returns: { lowStockItems, matchToSourceCatalog(catalog) }
```

This is trivial — the hook already exists from P20. We just need a catalog-matching utility.

### 5.4 API Layer Additions

```js
// No new endpoints needed for Phase 1.
// Uses existing:
//   - getStockInventory()           → own store P20
//   - getHierarchyDetail()          → destination store stock
//   - getTransferHistory()          → recent dispatches
//   - getPendingQueues()            → open requests
//   - getInventoryMaster()          → source items (already in dispatch form)
```

---

## 6. Component Map

### Dispatch Intelligence Components

```
DirectDispatchForm.jsx (MODIFIED — add sidebar)
  ├── [existing] Destination picker, Item rows, Source selector
  └── [NEW] DestinationIntelPanel.jsx
        ├── DestStockHealthHeader      — "4 items · 2 critical"
        ├── SuggestionCardList          — Tier 1-4 item cards
        │     └── SuggestionCard        — per-item: qty, status, "Add to dispatch"
        ├── RecentTransfersCollapsible  — "Recently Sent" section
        ├── PendingRequestsCollapsible  — "Open Requests" section
        └── BulkAddButton              — "Add All Critical Items"
```

### Request Intelligence Components

```
RequestStockForm.jsx (MODIFIED — add banner)
  ├── [existing] Source picker, Catalog, Item rows
  └── [NEW] OwnStockHealthBanner.jsx
        ├── LowStockSuggestionRow       — per low-stock item with "+ Add"
        └── BulkAddLowStockButton       — "Add All Low-Stock Items"
```

### Shared

```
hooks/useDestinationIntel.js    — destination stock + recommendations (dispatch)
hooks/useOwnLowStock.js         — own low-stock matching (request) [thin wrapper around useStockInventory]
lib/recommendationEngine.js     — Tier 1-4 logic, qty computation, matching
```

---

## 7. Phased Roadmap

### Phase 1: Low-Stock Suggestions (HIGHEST ROI, LOWEST RISK)

**Scope:**
- Request form: Own stock health banner with low-stock items + "Add" buttons
- Dispatch form: Destination stock panel showing items with `display_quantity === 0` flagged

**Data sources:** P20 stock-inventory (own store), hierarchy-detail (destination store)
**New components:** `OwnStockHealthBanner.jsx`, `DestinationIntelPanel.jsx` (basic)
**Backend changes:** None
**Effort:** ~4-5 hours
**Risk:** ZERO — additive UI only, no lifecycle mutations

**Why this first:** It solves the #1 pain point (destination blindness) with data we already have. No new endpoints. No quantity guesswork in Phase 1 — just show what's at zero and let the operator decide.

### Phase 2: Recommended Quantities + Source Confidence

**Scope:**
- Suggested replenishment quantities using threshold-deficit formula
- Source stock confidence indicators ("You have 108 kg ✓" / "You have 0.3 kg ⚠")
- "Add to dispatch" with pre-filled quantity
- "Add All Critical" bulk action

**Data sources:** Phase 1 + source inventory + min-threshold heuristic
**New components:** Enhanced `SuggestionCard` with qty + source check
**Backend changes:** None (but would benefit from `min_qty_alert` in hierarchy-detail response)
**Effort:** ~3-4 hours
**Risk:** LOW — still additive, no mutations. Risk is bad qty suggestions — mitigated by operator override.

### Phase 3: Transfer History Context + Pending Request Awareness

**Scope:**
- "Recently Sent" section in dispatch intel panel
- "Open Requests" section with "Approve & Dispatch Instead" shortcut
- Duplicate dispatch warning ("You sent 1kg maida 2 days ago")
- Request form: "This item has a pending request" note

**Data sources:** Phase 2 + transfer-history + pending-queues
**New components:** `RecentTransfersCollapsible`, `PendingRequestsCollapsible`
**Backend changes:** None
**Effort:** ~3-4 hours
**Risk:** LOW — read-only context, no mutations. Transfer history may be large — needs pagination/date capping.

### Phase 4: Consumption-Aware Intelligence (FUTURE)

**Scope:**
- "Days until stockout" estimate based on transfer frequency
- "Consumption rate" derived from stock delta over time
- Predictive urgency scoring
- "Smart dispatch bundles" (pre-built multi-item dispatch templates)

**Data sources:** Transfer history trend analysis, stock snapshot comparisons
**Backend changes:** Likely needed — consumption/recipe data endpoint
**Effort:** ~8-12 hours
**Risk:** MEDIUM — requires data that may not exist yet. Accuracy of "days until stockout" depends on consumption patterns we can't observe directly.

### Phase 5: Network-Level Optimization (LONG-TERM)

**Scope:**
- Cross-store stock rebalancing suggestions
- "Store X has excess, Store Y is empty — transfer recommended"
- Hierarchy-wide stock distribution heatmap with dispatch recommendations

**Data sources:** Full hierarchy stock-inventory + transfer patterns
**Backend changes:** Likely a dedicated analytics endpoint
**Effort:** ~15-20 hours
**Risk:** HIGH — complex optimization, needs careful UX to avoid information overload

### ROI Analysis

| Phase | Effort | Operational Value | Risk | Break-Even |
|-------|--------|------------------|------|------------|
| Phase 1 | 4-5h | HIGH — eliminates destination blindness | ZERO | Immediate |
| Phase 2 | 3-4h | HIGH — eliminates quantity guessing | LOW | Within days |
| Phase 3 | 3-4h | MEDIUM — prevents duplicate dispatches | LOW | Within weeks |
| Phase 4 | 8-12h | MEDIUM — predictive value uncertain | MEDIUM | Months |
| Phase 5 | 15-20h | LOW initially — needs scale | HIGH | Requires many stores |

**Recommendation:** Implement Phase 1 + Phase 2 together (~8h). This covers 80% of the operational pain with near-zero risk.

---

## 8. Quantity Suggestion Heuristics

### The "How Much Should I Send?" Problem

This is the hardest UX question. We have three approaches, ranked by reliability:

#### Approach A: Threshold-Deficit (Phase 2)

```
suggested_qty = max(
  threshold_in_display_unit - current_display_qty,
  min_practical_unit
)
```

Where `min_practical_unit` = 0.5 for kg/ltr, 1 for pcs.

**Pros:** Simple, deterministic, explainable.
**Cons:** Threshold may not reflect actual consumption. Sending exactly to threshold means they'll be low again tomorrow.

#### Approach B: Threshold × 2 Buffer (Phase 2, variant)

```
suggested_qty = max(
  (threshold_in_display_unit - current_display_qty) * 2,
  threshold_in_display_unit
)
```

Doubles the deficit to provide buffer. Caps at threshold if deficit is tiny.

**Pros:** Gives breathing room. Practical for restaurant ops where daily dispatch isn't feasible.
**Cons:** May over-send for slow-moving items.

#### Approach C: Historical Average (Phase 4)

```
avg_dispatch_qty = average(
  transfers to this store for this item in last 30 days
).quantity

suggested_qty = avg_dispatch_qty
explanation = "Based on average of 3 dispatches (2kg, 1.5kg, 2.5kg) in last 30 days"
```

**Pros:** Data-driven, reflects actual operational patterns.
**Cons:** Requires transfer history parsing. Cold-start problem for new items/stores.

**Recommendation:** Start with Approach B (threshold × 2 buffer) in Phase 2. Add Approach C as an enhancement in Phase 4 if history data is rich enough. Always show the computation to the operator.

---

## 9. UX Design Principles

### Operational Realism Checklist

| Principle | Application |
|-----------|------------|
| **Operator is always in control** | Suggestions are chips, not commands. Every "Add" button is manual. |
| **No auto-dispatch** | System never creates transfers without explicit operator submit. |
| **Explainability over accuracy** | "Suggested 2kg because threshold is 0.5kg and current is 0kg" beats "AI recommends 2kg." |
| **Speed over completeness** | Show CRITICAL items first. Don't make operator scroll past 20 OK items to find the 2 urgent ones. |
| **Mobile-friendly** | Intel panel collapses to bottom sheet on small screens. Dispatch form stays primary. |
| **Fail gracefully** | If destination stock fetch fails, dispatch form works exactly as before. Intel panel shows "Unable to load store data — retry." |
| **No jargon** | "Out of stock" not "critical deficit." "Below threshold" not "sub-minimum alert level." |
| **Color means something** | Red = act now. Amber = review. Green = fine. Gray = info only. No decorative colors. |
| **Respect muscle memory** | The dispatch form stays left, items stay the same shape, submit stays the same button. Intelligence is additive context, not a redesigned workflow. |

### Urgency Color System

```
CRITICAL  →  bg-red-50     border-red-200    text-red-800     dot: bg-red-500
LOW       →  bg-amber-50   border-amber-200  text-amber-800   dot: bg-amber-500
PENDING   →  bg-blue-50    border-blue-200   text-blue-800    dot: bg-blue-500
RECENT    →  bg-slate-50   border-slate-200  text-slate-600   dot: bg-slate-400
OK        →  bg-emerald-50 border-emerald-200 text-emerald-700 (collapsed)
```

### Anti-Patterns to Avoid

| Anti-Pattern | Why Bad | What We Do Instead |
|-------------|---------|-------------------|
| "AI-powered recommendations" banner | Operators don't trust black boxes | "Based on store stock levels" — attributable |
| Animated suggestion cards | Distracting in operational context | Static cards, no motion |
| Percentage bars for everything | Meaningless without context | Concrete numbers: "0 kg" not "0%" |
| Score/rating for items | What does "4.2 urgency score" mean to a warehouse worker? | Binary: "out of stock" / "below threshold" / "OK" |
| Full-screen intelligence overlay | Blocks the dispatch form | Side panel that doesn't obstruct the form |
| Auto-refreshing suggestions | Data churn is confusing | Fetch once on destination change; manual refresh |

---

## 10. Risk Analysis

| Risk | Severity | Mitigation |
|------|----------|------------|
| `hierarchy-detail` doesn't return min_qty_alert for destination | MEDIUM | Phase 1: use `display_quantity === 0` as critical. Phase 2: lobby for backend field addition. |
| Stock title mismatch between stores | LOW | Franchise push system ensures title consistency. Edge case: manual item creation at franchise with different name. Mismatch = no suggestion (fail safe). |
| Operator over-relies on suggestions | LOW | Always show "Suggested" label, not "Required." Operator can change qty freely. |
| Large catalogs slow down intel panel | LOW | Cap suggestions at top 10 CRITICAL + LOW items. OK items collapsed. |
| Transfer history for destination is expensive | LOW | Limit to last 7 days, cap at 20 transfers. Fetch only when panel is shown. |
| Stale destination stock data | MEDIUM | Show "Destination stock as of X min ago" timestamp. Refresh button. |
| Regression in dispatch form UX | LOW | Intel panel is additive; dispatch form left-side remains unchanged. If intel fetch fails, form works exactly as before. |

---

## 11. Backend/API Implications

### Phase 1-3: No Backend Changes Needed

All data sources are available through existing endpoints:
- `GET /inventory/stock-inventory` (own store — P20)
- `POST /hierarchy-detail` (destination store stock)
- `POST /history` (recent transfers)
- `POST /pending-queues` (open requests)
- `GET /inventory/get-inventory-master` (source items)

### Ideal Backend Enhancements (Not Required, But Valuable)

| Enhancement | Value | Effort |
|-------------|-------|--------|
| Add `min_qty_alert` + `min_unit_alert` to `hierarchy-detail` response | Precise low-stock threshold for destination items | LOW (backend field addition) |
| Add `destination_stock_summary` field to `pending-queues` response | Avoid separate hierarchy-detail call | MEDIUM |
| New endpoint: `POST /stock-health-summary` (multi-store) | Single call for all suggestions data | MEDIUM |
| New endpoint: `POST /transfer-frequency` (item × store × period) | Consumption velocity approximation | HIGH |

---

## 12. Open Questions

1. **Quantity suggestion formula:** Threshold × 2 buffer vs exact deficit? (Recommendation: × 2 for restaurant ops where daily dispatch isn't feasible.)

2. **Category prioritization:** Should "non veg" items rank higher than "veggies" in suggestions? (Recommendation: No category priority in Phase 1. All CRITICAL items equal.)

3. **Source selector pre-fill:** Should "Add to dispatch" also pre-select the source segment? (Recommendation: No — segment selection requires operator judgment on batch/expiry. Auto-FEFO for requests is fine, but dispatch needs explicit source selection.)

4. **Sidebar vs bottom panel:** On mobile/small screens, should intel be a collapsible bottom panel or a separate tab? (Recommendation: Bottom sheet on mobile, side panel on desktop.)

5. **Refresh strategy:** When should destination stock refresh? (Recommendation: On destination change + manual refresh. No polling.)

---

## 13. Concept Preview

![Smart Dispatch Concept](https://static.prod-images.emergentagent.com/jobs/89847188-c8d4-4d05-9704-d29129fc5fd7/images/3f287c3bd5fe0aa2b2043d9b41e0be610de82ba6259ded4e9f6bf355e5b2af93.png)

The concept shows:
- **Left panel:** Traditional dispatch form (destination selector, item rows)
- **Right panel:** Destination intelligence sidebar with suggested items ranked by urgency
- **Item cards:** CRITICAL (red), LOW (amber), OK (green) with suggested quantities
- **Bulk action:** "Add All Critical" button for fast multi-item dispatch

---

## 14. Implementation File Map (Preview)

### New Files (Phase 1-2)
- `frontend/src/hooks/useDestinationIntel.js` — destination stock + recommendations
- `frontend/src/lib/recommendationEngine.js` — Tier logic, qty computation
- `frontend/src/components/central-inventory/DestinationIntelPanel.jsx` — sidebar
- `frontend/src/components/central-inventory/SuggestionCard.jsx` — per-item suggestion
- `frontend/src/components/central-inventory/OwnStockHealthBanner.jsx` — request form banner

### Modified Files (Phase 1-2)
- `frontend/src/components/central-inventory/DirectDispatchForm.jsx` — add sidebar panel
- `frontend/src/components/central-inventory/RequestStockForm.jsx` — add own-stock banner

### NOT Modified
- `backend/server.py` — no backend changes
- `frontend/src/services/api.js` — no new endpoints (uses existing)
- Transfer lifecycle components — no changes
- P20 StockInventorySummary — no changes
