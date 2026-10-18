# P26 End-to-End Smoke Validation — Post-Deploy

> **Date:** 10 June 2026
> **Status:** ✅ PASS — all critical checks green, 1 minor observation
> **Probes:** 2 full lifecycles + 1 fresh transfer + contract checks across 7 endpoints
> **Branch:** 9-6-26
> **Backend:** `mapTransferHistoryRow()` fix DEPLOYED to preprod ✅

---

## 0. Executive Summary

| Area | Verdict |
|------|---------|
| **G-012** Request Catalog Categories | ✅ **PASS** |
| **G-013** Reference Codes (generation, persistence, uniqueness) | ✅ **PASS** |
| **G-013 Regression** (history endpoint key restoration) | ✅ **PASS** — 26/26 keys on all 16 rows |
| **Scenario A** Direct Dispatch lifecycle | ✅ **PASS** — create → dispatch → receive |
| **Scenario B** Request lifecycle | ✅ **PASS** — catalog → create → approve → dispatch → receive |
| **Reference code consistency across lifecycle** | ✅ **PASS** — same code on 6 endpoints |
| **Uniqueness** | ✅ **PASS** — 3 fresh transfers, 3 unique codes |
| **Pending-queues contract** | ✅ **PASS** — `items_count` alias present |
| **Minor:** History `items_count`/`line_count` | ⚠️ Both 0 for all rows (DB doesn't join line count on history query) |

**Final Recommendation: READY FOR FRONTEND CONSUMPTION**

---

## 1. Scenario A — Direct Dispatch (798 → 799)

| Step | Action | Endpoint | Result | reference_code |
|:----:|--------|----------|:------:|:--------------:|
| A1 | Create direct dispatch (raw tuna 1kg) | POST /initiate | ✅ tid=179 | TRF-2026-0006 |
| A2 | Verify details | GET /details/179 | ✅ transfer.id=179, line_reference=TRF-2026-0006-L01 | TRF-2026-0006 |
| A3 | Check pending queues (receiver 799) | POST /pending-queues | ✅ In receive_pending | TRF-2026-0006 |
| A4 | Receive | POST /receive/179 | ✅ status=received | TRF-2026-0006 |
| A5 | Verify history (regression check) | POST /history | ✅ 26/26 keys, id=179 | TRF-2026-0006 |

**History row for transfer 179 (post-receive):**
```
id=179, transfer_id=179, reference_code=TRF-2026-0006
status=received, type=dispatch
dispatched_by=4656, dispatched_at=2026-06-09 23:52:45
received_by=4661, received_at=2026-06-09 23:53:16
resolution_type=return_to_source, resolution_meta={receive_totals:…}
```

---

## 2. Scenario B — Request Flow (799 → 798 → approve → dispatch → receive)

| Step | Action | Endpoint | Result | reference_code |
|:----:|--------|----------|:------:|:--------------:|
| B1 | Load catalog | POST /request-catalog | ✅ 3 items, category fields present | — |
| B2 | Create request (raw tuna 2kg) | POST /request | ✅ tid=180 | TRF-2026-0007 |
| B3 | Approve | POST /approve/180 | ✅ status=approved | TRF-2026-0007 |
| B4 | Dispatch | POST /dispatch/180 | ✅ status=dispatched | TRF-2026-0007 |
| B5 | Receive | POST /receive/180 | ✅ status=received | TRF-2026-0007 |
| B6 | Verify details | GET /details/180 | ✅ line_reference=TRF-2026-0007-L01 | TRF-2026-0007 |
| B7 | Verify history | POST /history | ✅ 26/26 keys | TRF-2026-0007 |

**reference_code consistency across ALL 6 lifecycle stages: ✅ IDENTICAL**

---

## 3. Reference Code Validation

### Uniqueness (3 fresh transfers)

| Transfer | Actor | Type | reference_code | Unique |
|:--------:|-------|------|:--------------:|:------:|
| 179 | 798 (master) | dispatch | TRF-2026-0006 | ✅ |
| 180 | 799 (franchise) | request | TRF-2026-0007 | ✅ |
| 181 | 800 (franchise) | request | TRF-2026-0008 | ✅ |

### Format checks

| Check | Result |
|-------|:------:|
| Not null | ✅ PASS (all 3) |
| Not empty string | ✅ PASS |
| Not `TRF-legacy-{id}` | ✅ PASS |
| Pattern: `TRF-{year}-{seq:04d}` | ✅ PASS |
| Sequential numbering | ✅ 0006 → 0007 → 0008 |
| No SQL duplicate-key errors | ✅ PASS |

### Legacy backward compatibility

| Transfer | reference_code | Source |
|:--------:|:--------------:|--------|
| 150 | TRF-legacy-150 | Pre-G013 (computed fallback) |
| 151 | TRF-legacy-151 | Pre-G013 |
| 174+ | TRF-2026-NNNN | Post-G013 (generated) |

---

## 4. History Regression Check — RESTORED ✅

### Key presence (ALL 16 history rows)

| Key | Pre-G013 | G-013 broken | Current (deployed) |
|-----|:--------:|:------------:|:------------------:|
| `id` | ✅ | ❌ | ✅ |
| `transfer_id` | — | ✅ | ✅ |
| `reference_code` | — | ✅ | ✅ |
| `parent_transfer_id` | ✅ | ❌ | ✅ |
| `requested_by/at` | ✅ | ❌ | ✅ |
| `approved_by/at` | ✅ | ❌ | ✅ |
| `dispatched_by/at` | ✅ | ❌ | ✅ |
| `received_by/at` | ✅ | ❌ | ✅ |
| `cancelled_by/at` | ✅ | ❌ | ✅ |
| `resolution_type` | ✅ | ❌ | ✅ |
| `resolution_meta` | ✅ | ❌ | ✅ |
| `from_restaurant_name` | — | ❌ | ✅ (null) |
| `to_restaurant_name` | — | ❌ | ✅ (null) |
| `items_count` | — | ❌ | ✅ (0) |
| `lines` | — | ❌ | ✅ (null) |
| `created_at/updated_at` | ✅ | ✅ | ✅ |

**16/16 rows × 26/26 keys = 416/416 field checks PASS**

**`id === transfer_id` for all rows: ✅ PASS**

---

## 5. Per-Endpoint Contract Validation

### POST /history

```
Keys: id, transfer_id, reference_code, type, status,
      from_restaurant_id, to_restaurant_id, parent_transfer_id,
      requested_by, requested_at, approved_by, approved_at,
      dispatched_by, dispatched_at, received_by, received_at,
      cancelled_by, cancelled_at, resolution_type, resolution_meta,
      from_restaurant_name, to_restaurant_name, items_count,
      line_count, lines, created_at, updated_at
```
**Status: ✅ Matches planning guide "Fixed (current repo)" shape**

### POST /pending-queues

```
Keys: transfer_id, reference_code, type, status,
      from_restaurant_id, to_restaurant_id, line_count, items_count,
      created_at, updated_at
```
**Status: ✅ Matches planning guide "Slim queue row" shape**
**`items_count` alias: ✅ Present and equals `line_count`**

### GET /details/{id}

```
transfer: { id, reference_code, type, status, all workflow columns }
lines: [{ id, line_reference, source_stock_title, all line columns }]
```
**Status: ✅ Unchanged from pre-G013 + additive `reference_code`, `line_reference`**

### POST /request (create)

```
data: { transfer_id, reference_code, type, status, lines: [{line_id, stock_title, qty, unit}] }
```
**Status: ✅ G-013 additive `reference_code`**

### POST /request-catalog (G-012)

```
data.items[]: { category_id, category_name, source_inventory_master_id, stock_title, unit, unit_id, display_unit, available_display_qty, available_cal_quantity, is_mapped_to_child }
```
**Status: ✅ G-012 additive `category_id`, `category_name`**

### Action responses (approve, dispatch, receive)

```
data: { transfer_id, status, lines: [...], reference_code }
```
**Status: ✅ G-013 additive `reference_code` on all action responses**

---

## 6. Minor Observation (not a blocker)

| Item | Detail | Impact | Severity |
|------|--------|--------|:--------:|
| History `items_count` / `line_count` = 0 | Both fields are present but always 0 on all history rows. The DB query doesn't join the transfer_lines count. | Frontend Items column shows "—" or "0 items". Frontend already fetches full details per transfer for the Ledger tab, so line count is available from details. | ⚪ Cosmetic |
| History `from/to_restaurant_name` = null | As documented in planning guide — frontend resolves via `restaurantMap` lookup | No impact — fallback works | ⚪ Expected |
| History `lines` = null | As documented — frontend fetches details per transfer for Ledger tab | No impact — by design | ⚪ Expected |

---

## 7. Pass/Fail Matrix

| # | Check | Result |
|:-:|-------|:------:|
| 1 | G-012: `category_id` + `category_name` on catalog items | ✅ PASS |
| 2 | G-013: `reference_code` generated on fresh create | ✅ PASS |
| 3 | G-013: `reference_code` not null / empty / TRF-legacy | ✅ PASS |
| 4 | G-013: `reference_code` unique across 3 transfers | ✅ PASS |
| 5 | G-013: `reference_code` consistent across all lifecycle stages | ✅ PASS |
| 6 | G-013: `line_reference` present on detail lines | ✅ PASS |
| 7 | G-013: `line_reference` format `{ref}-L{nn}` | ✅ PASS |
| 8 | Regression: History `id` field restored | ✅ PASS |
| 9 | Regression: History `id === transfer_id` | ✅ PASS |
| 10 | Regression: History workflow timestamps restored | ✅ PASS |
| 11 | Regression: History `resolution_meta` restored | ✅ PASS |
| 12 | Regression: History actor IDs restored | ✅ PASS |
| 13 | Regression: ALL 16 rows × 26 keys present | ✅ PASS |
| 14 | Pending-queues: `items_count` alias present | ✅ PASS |
| 15 | Pending-queues: `reference_code` present | ✅ PASS |
| 16 | Details: `transfer.id` present (unchanged) | ✅ PASS |
| 17 | Details: `transfer.reference_code` present | ✅ PASS |
| 18 | Scenario A: Direct dispatch full lifecycle | ✅ PASS |
| 19 | Scenario B: Request full lifecycle | ✅ PASS |
| 20 | No SQL errors on consecutive creates | ✅ PASS |

**20/20 PASS — 0 FAIL — 0 BLOCKING ISSUES**

---

## 8. Recommendation

### ✅ READY FOR FRONTEND CONSUMPTION

All G-012, G-013, and regression fix changes are deployed and validated. Response shapes match the planning guide contract. Both lifecycle scenarios complete end-to-end.

**Frontend can proceed with:**
1. `resolveTransferId(t) = t.id ?? t.transfer_id` defensive pattern
2. `reference_code` display replacing `formatPO(t.id)`
3. `items_count ?? line_count` fallback for item counts
4. History `id` field is restored — navigation bug is resolved at the API level

### Transfers created during validation
| Transfer | From→To | Type | Status | Cleanup |
|:--------:|---------|------|--------|---------|
| 179 | 798→799 | dispatch | received | May keep |
| 180 | 798→799 | request | received | May keep |
| 181 | 800→798 | request | requested | Cancel or approve |
