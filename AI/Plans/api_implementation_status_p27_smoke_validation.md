# P27 End-to-End Smoke Validation

> **Date:** 10 June 2026
> **Environment:** preprod via proxy (d3c32629.preview.emergentagent.com)
> **Migration applied:** ✅ Yes (`selling_unit_price`, `shipping_fee`, `selling_line_total`, `price_status`, `stock_source`, `estimated_unit_price` all present)
> **Tester:** Agent — fresh transactions only

---

## Executive Summary

| Area | Verdict | Notes |
|------|---------|-------|
| **A** Operational-settings (P29 keys) | ✅ PASS | All 7 P29 keys in `resolved_settings` |
| **B** GET vendor-item-list (buy hint + hierarchy) | ✅ PASS | `unit_price`, `hierarchy_context.enabled`, `hierarchy_summary` |
| **C** Request estimates (catalog + child details) | ✅ PASS | `pricing_context`, `estimated_unit_price`, `stock_source`, `price_status=estimated` |
| **D** Selling on approve/dispatch/initiate | ✅ PASS | Prices persisted, grand total = goods + shipping |
| **D-lateral** Lateral central→central | 🔴 BLOCKED | `pending_lateral_approval` not approachable via `approve/{id}` — `TRANSFER_NOT_HOLDABLE` |
| **E** Receive + inward-audit + cost-valuation | ✅ PASS | Selling totals correct; FIFO cost computed |
| **F** Regression (queues, history, reference_code) | ✅ PASS | 26/26 keys, `id===transfer_id`, `reference_code` on all |
| **G** Negative/policy | ✅ PASS (G3,G4,G5) ⚠️ G2 | G3 shipping blocked ✅; G4 franchise denied ✅; G5 buy hidden ✅; G2 price-required not enforced at dispatch |

**Recommendation:** 🟡 **CONDITIONAL READY** — Core request/dispatch/receive pricing chain works. Lateral approval path BLOCKED. `transfer_selling_price_required` not enforced.

---

## Hierarchy Created for Validation

| RID | Name | Type | Parent | Created |
|:---:|------|:----:|:------:|:-------:|
| 798 | Tokyo Garden | master | — | Pre-existing |
| 799 | Kyoto Garden | franchise | 798 | Pre-existing |
| 800 | Hokkaido Garden | franchise | 798 | Pre-existing |
| **804** | **Osaka Central** | **central** | **798** | **Fresh** |
| **805** | **Nagoya Central** | **central** | **798** | **Fresh** |

Credentials: all `Qplazm@10`
- 804: `owner@osakacentral.com`
- 805: `owner@nagoyacentral.com`

---

## Scenario B — Request Flow (799→798) — PRIMARY SMOKE

| Step | API | transfer_id | reference_code | selling_unit | shipping | Result |
|:----:|-----|:-----------:|:--------------:|:------------:|:--------:|:------:|
| S2 | request-catalog | — | — | est: 0.0002 | — | ✅ |
| S3 | request | 182 | TRF-2026-0009 | — | — | ✅ |
| S3b | details (child est) | 182 | TRF-2026-0009 | est: 0.0002 | 0 | ✅ |
| S3c | details (master) | 182 | TRF-2026-0009 | null (pre-approve) | 0 | ✅ |
| S4 | approve | 182 | TRF-2026-0009 | final: 500 | 150 | ✅ |
| S4b | details (child final) | 182 | TRF-2026-0009 | 500 | 150 | ✅ |
| S5a | dispatch | 182 | TRF-2026-0009 | — | — | ✅ |
| S5b | receive | 182 | TRF-2026-0009 | — | — | ✅ |
| S5c | inward-audit | 182 | — | goods:1000 ship:150 grand:1150 | — | ✅ |
| S6 | cost-valuation | — | — | unit_cost: 27.5 | — | ✅ |
| F1-2 | regression | — | — | — | — | ✅ |

### Scenario B — Pricing Lifecycle Detail

```
Catalog estimated_unit_price:  0.0002 (vendor buy hint)
Child details pre-approve:     price_status=estimated, selling_unit_price=null
Master approves:               selling_unit_price=500, shipping_fee=150
Child details post-approve:    price_status=final
  selling_unit_price:          500.00000000
  selling_line_total:          1000.00000000
  shipping_fee:                150.00000000
  selling_goods_total:         1000
  selling_grand_total:         1150  (= 1000 + 150) ✅
Inward audit:
  selling_goods_total:         1000
  shipping_fee:                150
  selling_grand_total:         1150  ✅
  items[0].line_total:         1000
Cost valuation (FIFO):
  unit_cost:                   27.5
  total_value:                 1017500
source_purchase_price hidden from franchise: ✅
```

---

## Scenario A — Direct Dispatch (798→800) with Selling Price

| Step | API | transfer_id | buy hint | sell unit | shipping | Result |
|:----:|-----|:-----------:|:--------:|:---------:|:--------:|:------:|
| S1 | vendor-item-list | — | 0.0002 | — | — | ✅ |
| SA | initiate | 184 | — | 600 | 200 | ✅ |
| SA-det | details (master) | 184 | src_purchase: 0.0002 | selling: 600 | 200 | ✅ |
| SA-rcv | receive | 184 | — | — | — | ✅ |
| SA-aud | inward-audit | 184 | — | goods:600 ship:200 grand:800 | — | ✅ |

### Direct Dispatch Pricing
```
Initiate with:       selling_unit_price=600, shipping_fee=200
Master details:      source_purchase_price=0.00020000, selling_unit_price=600
                     selling_grand_total=800 (=600+200) ✅
Inward audit:        goods=600, shipping=200, grand=800 ✅
```

---

## Scenario L — Lateral (Central A 804 → Central B 805)

### Setup
1. Created Central A (804) + Central B (805) under master 798
2. Pushed food bundles to both
3. Enabled `allow_lateral_central_transfer=true`
4. Dispatched 5kg raw tuna from master to Central A (tid=186, TRF-2026-0011)
5. Central A received stock

### Lateral Initiate
```
POST /lateral/initiate (as Central A)
  from=804, to=805, shipping=75, selling_unit_price=450
  → status=pending_lateral_approval, tid=187, ref=TRF-2026-0012 ✅

Transfer details show:
  shipping_fee=75, selling_goods_total=900, selling_grand_total=975
  line.selling_unit_price=450, line.stock_source=parent_transfer
```

### 🔴 BLOCKED — Lateral Approval

| Attempt | Endpoint | Result |
|---------|----------|--------|
| `POST /approve/187` (master token) | `TRANSFER_NOT_HOLDABLE` | ❌ |
| `POST /approve/187` (empty body, master) | `TRANSFER_NOT_HOLDABLE` | ❌ |
| `POST /lateral/approve/187` (master) | 404 Not Found | ❌ |
| `POST /dispatch/187` (skip approve) | "Transfer must be approved before dispatch" | ❌ |

**Pending-queues:** Transfer 187 does NOT appear in ANY queue (master, central A, central B).

**Root cause hypothesis:** The standard `approve/{id}` handler checks for `status=requested` but lateral uses `status=pending_lateral_approval`. The lateral approval state transition is either:
1. Not wired into the standard approve endpoint
2. Requires a different endpoint not documented
3. Missing implementation

**Impact:** Lateral transfers can be initiated and priced, but cannot progress beyond `pending_lateral_approval`.

---

## Central → Franchise Flow

Not separately tested (no franchise exists under Central A/B). Central-to-franchise would follow the same request→approve→dispatch→receive path as master-to-franchise. The pricing mechanism is confirmed working in Scenarios A and B.

---

## Cost Model Validation

| Field | Scenario B | Scenario A | Match |
|-------|:----------:|:----------:|:-----:|
| `estimated_unit_price` on catalog | 0.0002 | — | ✅ |
| `price_status=estimated` (pre-approve) | ✅ | — (direct dispatch) | ✅ |
| `price_status=final` (post-approve) | ✅ | N/A | ✅ |
| `selling_unit_price` (set by sender) | 500 | 600 | ✅ |
| `selling_line_total` | 1000 (500×2) | 600 (600×1) | ✅ |
| `shipping_fee` | 150 | 200 | ✅ |
| `selling_goods_total` | 1000 | 600 | ✅ |
| `selling_grand_total` | 1150 (1000+150) | 800 (600+200) | ✅ |
| `source_purchase_price` (master view) | null | 0.0002 | ✅ |
| `source_purchase_price` (franchise view) | hidden (null) | — | ✅ |
| Inward-audit totals | match ✅ | match ✅ | ✅ |
| FIFO cost valuation | unit_cost=27.5 | — | ✅ |

---

## Regression Validation

| ID | Check | Result |
|:--:|-------|:------:|
| F1 | pending-queues: `reference_code` present | ✅ |
| F1 | pending-queues: `items_count` alias present | ✅ |
| F2 | history: 26/26 keys on all rows | ✅ |
| F2 | history: `id === transfer_id` | ✅ |
| F2 | history: `reference_code` present | ✅ |
| F2 | history: workflow timestamps restored | ✅ |
| F3 | request-catalog: `category_id`, `category_name` | ✅ |
| F3 | request-catalog: `estimated_unit_price`, `stock_source` | ✅ |
| F3 | request-catalog: `pricing_context.excludes_shipping` | ✅ |
| F4 | details: `transfer.id` present | ✅ |
| F4 | details: `line_reference` present | ✅ |

---

## Negative / Policy Validation

| ID | Test | Expected | Actual | Result |
|:--:|------|----------|--------|:------:|
| G2 | `transfer_selling_price_required=true` → dispatch without prices | `SELLING_PRICE_REQUIRED` | Approve ✅ + Dispatch ✅ (no enforcement) | ⚠️ NOT ENFORCED |
| G3 | `transfer_shipping_fee_allowed=false` → approve with fee | `SHIPPING_FEE_NOT_ALLOWED` | `SHIPPING_FEE_NOT_ALLOWED` | ✅ PASS |
| G4 | Franchise updates `central_resell_markup_percent` | 403 | `UNAUTHORIZED_ACTION` | ✅ PASS |
| G5 | Franchise details → no `source_purchase_price` | null/hidden | null | ✅ PASS |

---

## Reference Code Uniqueness

| TID | reference_code | Type | Status |
|:---:|:--------------:|------|--------|
| 182 | TRF-2026-0009 | request | received |
| 184 | TRF-2026-0010 | dispatch | received |
| 186 | TRF-2026-0011 | dispatch | received |
| 187 | TRF-2026-0012 | lateral | pending_lateral_approval |
| 188 | TRF-2026-0013 | request | withdrawn |
| 189 | TRF-2026-0014 | request | dispatched |

**All unique:** ✅ | **Sequential:** ✅ | **Not null/empty/legacy:** ✅

---

## Observed Prices Snapshot

```
Buy hint (vendor-item-list unit_price):     0.0002
Catalog estimated_unit_price:               0.0002
Approved selling_unit_price (Scenario B):   500
Approved selling_line_total (Scenario B):   1000 (500 × 2kg)
shipping_fee (Scenario B):                  150
selling_goods_total (Scenario B):           1000
selling_grand_total (Scenario B):           1150
Inward audit grand total:                   1150
FIFO unit_cost (franchise):                 27.5
Direct dispatch selling_unit_price:         600
Direct dispatch selling_grand_total:        800 (600 + 200 shipping)
Lateral selling_unit_price:                 450
Lateral selling_grand_total:                975 (900 + 75 shipping)
```

---

## Issues / Blockers

| # | Severity | Issue | Detail |
|:-:|:--------:|-------|--------|
| 1 | 🔴 BLOCKER | **Lateral approval path broken** | `pending_lateral_approval` status not accepted by `approve/{id}` (`TRANSFER_NOT_HOLDABLE`). Transfer doesn't appear in any pending-queue. No alternative endpoint found. |
| 2 | 🟡 MEDIUM | **`transfer_selling_price_required` not enforced** | Setting to `true` does NOT prevent approve or dispatch without prices. Both succeed normally. Policy flag has no effect. |
| 3 | ⚪ INFO | **Central re-sell policy (Scenario C) untestable** | Cannot be validated until lateral flow works (Central A would need parent-origin stock to test markup enforcement against franchise). |
| 4 | ⚪ INFO | **`source_purchase_price` null on master details (Scenario B)** | Master viewing a request transfer sees null for `source_purchase_price` on lines. Expected per vendor-item-list integration — buy hint may only populate on dispatch/initiate flows, not on request-approve flows. |
| 5 | ⚪ INFO | **History `items_count`/`line_count` = 0** | Both present but always 0 on history rows. DB query doesn't join line count. Frontend shows "—". |

---

## Final Recommendation

### 🟡 CONDITIONAL READY

**Core pricing chain WORKS:** Request → estimate → approve with sell/ship → dispatch → receive → audit → valuation. All math correct. reference_code consistent. Regression checks pass.

**BLOCKED for lateral:** `pending_lateral_approval` cannot be approved through any discovered endpoint. Central→Central transfers are stuck.

**NOT ENFORCED:** `transfer_selling_price_required=true` has no effect. Approve and dispatch succeed without prices regardless.

### Required before READY:
1. Fix lateral approval path (or document correct endpoint)
2. Wire `transfer_selling_price_required` enforcement at approve/dispatch

### Safe to proceed with for frontend:
- Request flow pricing (estimated → final)
- Direct dispatch pricing
- Shipping fee display
- Inward audit totals
- Buy/sell price visibility rules
- All G-012/G-013 features
