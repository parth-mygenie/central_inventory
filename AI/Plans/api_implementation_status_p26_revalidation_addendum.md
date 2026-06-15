# P26 G-012 & G-013 Gap Resolution — Revalidation Addendum (Post-Fix)

> **Status:** VALIDATED — G-012 PASS, G-013 PASS (fix confirmed)
> **Date:** 9 June 2026 (revalidation after POS API backend fix)
> **Probes:** 9 probes against live POS API via proxy
> **Hierarchy:** Tokyo Garden (rid=798, master) → Kyoto Garden (rid=799, franchise) + Hokkaido Garden (rid=800, franchise)
> **Branch:** 9-6-26
> **Previous addendum:** `api_implementation_status_p26_addendum.md` (pre-fix, blocker documented)

---

## 0. Executive Summary

| Gap | Pre-Fix (prev session) | Post-Fix (this session) | Verdict |
|-----|----------------------|------------------------|---------|
| **G-012** | ✅ PASS | ✅ PASS (unchanged) | **CLOSED** |
| **G-013** | 🔴 BLOCKER (write path) | ✅ PASS (fix confirmed) | **CLOSED** |

**The `reference_code` write-path blocker is resolved.** New transfers receive a generated `TRF-{year}-{seq:04d}` code. Three consecutive creates succeeded without SQL errors. Codes are persisted, unique, consistent across all endpoints, and distinct from the `TRF-legacy-{id}` computed fallback used for pre-fix transfers.

---

## 1. G-012: Request Catalog Categories — REVALIDATION

### Probes Executed

| Probe | Actor | Source | Items | Result |
|:-----:|-------|--------|:-----:|:------:|
| P1 | 799 (franchise) | 798 (master) | 3 | ✅ PASS |
| P2 | 800 (franchise) | 798 (master) | 3 | ✅ PASS |
| P3 | 798 (master) | 798 (self) | — | ✅ Expected `UNAUTHORIZED_ACTION` |
| P4 | 798 (master) | 799 (franchise) | — | ✅ Expected `UNAUTHORIZED_ACTION` |

### Check Matrix

| # | Check | P1 | P2 | Status |
|---|-------|:--:|:--:|:------:|
| C1a | `category_id` on all items | ✅ | ✅ | **PASS** |
| C1b | `category_name` on all items | ✅ | ✅ | **PASS** |
| C2 | Uncategorized: `category_id=null`, `category_name=""` | N/A | N/A | **UNTESTABLE** (no uncategorized items in data) |
| C3 | Sorted by `category_name` → `stock_title` | ✅ | ✅ | **PASS** |
| C4 | Category groups buildable from response | ✅ | ✅ | **PASS** |

### Sample Response (unchanged from pre-fix)

```json
{
  "status": true,
  "data": {
    "source_restaurant": {
      "restaurant_id": 798,
      "name": "Tokyo Garden",
      "restaurant_type": "master",
      "business_type": "restaurant",
      "can_submit_request": true
    },
    "items": [
      { "category_id": 1507, "category_name": "rice ball", "source_inventory_master_id": 17609, "stock_title": "rice", "unit": "kg", "unit_id": 1, "display_unit": "kg", "available_display_qty": 5, "available_cal_quantity": 5000, "is_mapped_to_child": true },
      { "category_id": 1507, "category_name": "rice ball", "source_inventory_master_id": 17610, "stock_title": "sea weed", ... },
      { "category_id": 1509, "category_name": "sushi", "source_inventory_master_id": 17611, "stock_title": "raw tuna", ... }
    ]
  }
}
```

**G-012 Verdict: PASS — CLOSED** ✅

---

## 2. G-013: Reference Codes — REVALIDATION (Post-Fix)

### Probes Executed

| Probe | Endpoint | Actor | Payload | Result |
|:-----:|----------|-------|---------|:------:|
| P1 | POST /request (create #1) | 799 | rice 1kg → 798 | ✅ tid=174, ref=TRF-2026-0001 |
| P2 | POST /request (create #2) | 800 | raw tuna 2kg → 798 | ✅ tid=175, ref=TRF-2026-0002 |
| P3 | POST /request (create #3) | 799 | sea weed 1kg + raw tuna 3kg → 798 | ✅ tid=176, ref=TRF-2026-0003 |
| P4 | GET /details (3 transfers) | 799/800 | tids 174,175,176 | ✅ All match |
| P5 | POST /pending-queues | 799 | — | ✅ refs on all items |
| P6 | POST /pending-queues | 798 | — | ✅ refs on all items |
| P7 | POST /pending-queues | 800 | — | ✅ refs on all items |
| P8 | GET /details (legacy) | 799/800 | tids 151,167,171 | ✅ TRF-legacy-{id} preserved |
| P9 | Cross-reference analysis | all | all data | ✅ 100% consistent |

### Check Matrix — Core Requirements

| # | Check | Result | Evidence |
|---|-------|:------:|----------|
| C1 | Multiple consecutive creates succeed | **PASS** | 3/3 succeeded (174, 175, 176) |
| C2 | `reference_code` is generated and persisted | **PASS** | Same code on create response AND details endpoint |
| C3 | Code is not empty string | **PASS** | `TRF-2026-0001`, `TRF-2026-0002`, `TRF-2026-0003` |
| C4 | Code is not null | **PASS** | All non-null |
| C5 | Code is not `TRF-legacy-{id}` | **PASS** | New format: `TRF-{year}-{seq:04d}` |
| C6 | Details returns same `reference_code` | **PASS** | 174→TRF-2026-0001, 175→TRF-2026-0002, 176→TRF-2026-0003 |
| C7 | Pending-queues returns same `reference_code` | **PASS** | Verified from all 3 actor perspectives |
| C8 | `line_reference` values generated correctly | **PASS** | Format: `{reference_code}-L{line_no:02d}` |
| C9 | Uniqueness across transfers | **PASS** | 6/6 unique codes (3 legacy + 3 new) |
| C10 | No SQL duplicate-key errors | **PASS** | Zero errors across 3 consecutive creates |

### Cross-Reference Consistency Matrix

| Transfer | Era | Creation | Details | Queue (requester) | Queue (approver) | Consistent |
|:--------:|:---:|----------|---------|-------------------|------------------|:----------:|
| 151 | LEGACY | — | TRF-legacy-151 | TRF-legacy-151 (799) | TRF-legacy-151 (798) | ✅ |
| 167 | LEGACY | — | TRF-legacy-167 | TRF-legacy-167 (800) | TRF-legacy-167 (798) | ✅ |
| 171 | LEGACY | — | TRF-legacy-171 | TRF-legacy-171 (799) | TRF-legacy-171 (798) | ✅ |
| **174** | **NEW** | **TRF-2026-0001** | **TRF-2026-0001** | **TRF-2026-0001** (799) | **TRF-2026-0001** (798) | ✅ |
| **175** | **NEW** | **TRF-2026-0002** | **TRF-2026-0002** | **TRF-2026-0002** (800) | **TRF-2026-0002** (798) | ✅ |
| **176** | **NEW** | **TRF-2026-0003** | **TRF-2026-0003** | **TRF-2026-0003** (799) | **TRF-2026-0003** (798) | ✅ |

### Line Reference Validation

| Transfer | Line | line_no | line_reference | Format Match |
|:--------:|:----:|:-------:|----------------|:------------:|
| 151 | 1 | null | TRF-legacy-151-L01 | ✅ (legacy, line_no null) |
| 151 | 2 | null | TRF-legacy-151-L02 | ✅ |
| 167 | 1 | null | TRF-legacy-167-L01 | ✅ |
| 171 | 1 | 1 | TRF-legacy-171-L01 | ✅ |
| **174** | **1** | **1** | **TRF-2026-0001-L01** | ✅ |
| **175** | **1** | **1** | **TRF-2026-0002-L01** | ✅ |
| **176** | **1** | **1** | **TRF-2026-0003-L01** | ✅ |
| **176** | **2** | **2** | **TRF-2026-0003-L02** | ✅ |

**Note:** `line_no` is `null` on pre-fix transfers (151, 167) — this is a legacy data issue, not related to the reference_code fix. New transfers have `line_no` correctly populated.

---

## 3. Before vs After Comparison

### Reference Code Format

| Transfer | Era | Before (pre-fix) | After (post-fix) |
|:--------:|:---:|-------------------|------------------|
| 151 | Pre-existing | TRF-legacy-151 | TRF-legacy-151 (unchanged) |
| 167 | Pre-existing | TRF-legacy-167 | TRF-legacy-167 (unchanged) |
| 171 | Created during pre-fix validation | TRF-legacy-171 | TRF-legacy-171 (unchanged) |
| 174 | — | N/A (would have failed) | **TRF-2026-0001** |
| 175 | — | N/A (SQL error) | **TRF-2026-0002** |
| 176 | — | N/A (SQL error) | **TRF-2026-0003** |

### Write Path Behavior

| Scenario | Before | After |
|----------|--------|-------|
| First create | ✅ Succeeded (but stored `''`) | ✅ Succeeded (stored `TRF-2026-0001`) |
| Second create | ❌ SQL duplicate `''` error | ✅ Succeeded (`TRF-2026-0002`) |
| Third create | ❌ SQL duplicate `''` error | ✅ Succeeded (`TRF-2026-0003`) |
| Reference stored in DB | Empty string `''` | Actual generated code |
| Read-layer behavior | Computed `TRF-legacy-{id}` fallback | Returns real stored code |

### New Format Pattern

```
Transfer: TRF-{year}-{sequence:04d}
  Example: TRF-2026-0001, TRF-2026-0002, TRF-2026-0003

Line:     {transfer_reference_code}-L{line_no:02d}
  Example: TRF-2026-0001-L01, TRF-2026-0003-L02
```

- Year: 4-digit year
- Sequence: 4-digit zero-padded, globally incrementing within the year
- Line suffix: `-L` + 2-digit zero-padded line number

---

## 4. Remaining Items & Observations

### No Remaining Blockers

| Item | Status | Notes |
|------|:------:|-------|
| G-012 category fields | ✅ Closed | All checks pass |
| G-013 write path SQL error | ✅ Closed | Fix confirmed — 3 consecutive creates |
| G-013 reference_code generation | ✅ Closed | New `TRF-{year}-{seq}` format |
| G-013 persistence | ✅ Closed | Same code on create, details, queues |
| G-013 line_reference | ✅ Closed | `{ref}-L{nn}` format correct |
| G-013 uniqueness | ✅ Closed | 6/6 unique codes |
| G-013 cross-endpoint consistency | ✅ Closed | 6/6 transfers consistent |
| Legacy backward compatibility | ✅ OK | `TRF-legacy-{id}` fallback preserved for old transfers |

### Minor Observations (not blockers)

| # | Observation | Severity | Notes |
|---|-------------|----------|-------|
| O1 | Legacy transfers (151, 167) have `line_no=null` | LOW | Pre-existing data issue, unrelated to fix |
| O2 | Creation response lines have `stock_title=null` | LOW | Pre-existing — stock_title only populated in details response |
| O3 | Uncategorized items edge case (G-012 C2) untestable | INFO | No uncategorized items exist in test data |
| O4 | Transfer 171 (created during pre-fix session) retains `TRF-legacy-171` | INFO | Expected — legacy fallback for transfers created with empty reference_code |

### Transfers Created During Validation

| Transfer | From→To | Items | Status | Created By |
|:--------:|---------|-------|--------|------------|
| 174 | 798→799 | rice 1kg | requested | P26 revalidation probe |
| 175 | 798→800 | raw tuna 2kg | requested | P26 revalidation probe |
| 176 | 798→799 | sea weed 1kg + raw tuna 3kg | requested | P26 revalidation probe |

These should be cancelled or cleaned up after validation.

---

## 5. Final Recommendation

### G-012: **CLOSED** ✅
Request catalog categories are correctly returned with `category_id` and `category_name`. Sorting is correct. Frontend can build category-grouped UI from the response without additional API changes.

### G-013: **CLOSED** ✅
Reference codes are now:
- **Generated** on the write path (not computed fallback)
- **Persisted** in the database (survives across endpoints)
- **Unique** (sequential `TRF-{year}-{seq:04d}` pattern)
- **Consistent** across creation, details, and pending-queues
- **Non-empty, non-null, non-legacy-pattern** for all new transfers
- **Backward compatible** with pre-fix transfers via `TRF-legacy-{id}` fallback

**Both gaps are resolved. P26 validation is complete. Frontend implementation can proceed.**
