# P25 Wastage Report Validation — API Findings & Planning Addendum

> **Status:** VALIDATED — backend confirmed operational
> **Date:** 30 May 2026 (validation), Jan 2026 (revalidation)
> **Probes:** 13 probes against live POS API via proxy
> **Actor:** Master/killua (rid=1), hierarchy scope includes rids 1,781-789

---

## 0. Validation Summary

### Endpoints Confirmed

| Endpoint | Method | Status | Proxy Path |
|----------|--------|--------|------------|
| `/inventory/wastage-reasons` | GET | **WORKING** | `/api/proxy/v2/inventory/wastage-reasons` |
| `/inventory/wastage-report` | POST | **WORKING** | `/api/proxy/v2/inventory/wastage-report` |

### All Filters Tested

| Filter | Status | Notes |
|--------|--------|-------|
| `start_date` / `end_date` | **WORKING** | Date range correctly scopes records |
| `restaurant_ids[]` | **WORKING** | Correctly scopes to specified stores within hierarchy |
| `waste_type` (Loss/Gain) | **WORKING** | Filters by type. Gain returns 0 records in test data |
| `food_id` | **WORKING** | Filters to specific ingredient (tested: maida=16981 → 2 records) |
| `has_batch` | **WORKING** | Returns only rows with `segment_allocations_json` populated (1 record) |
| `include_segments` | **WORKING** | Adds `segment_snapshot[]` with live on-hand segments |
| Combined filters | **WORKING** | `restaurant_ids + has_batch + include_segments` all work together |

---

## 1. Wastage Reasons API — Findings

### Probe 1: GET /inventory/wastage-reasons (Master store)

**Response:**
```json
{
  "status": true,
  "reasons": [
    { "id": 15, "reason": "Others" },
    { "id": 14, "reason": "Expired" },
    { "id": 13, "reason": "Pilferage" },
    { "id": 12, "reason": "Spillage" }
  ]
}
```

### Findings

| # | Finding | Severity |
|---|---------|----------|
| R1 | API returns 4 active reasons for master store | INFO |
| R2 | Response shape matches spec: `{ status: bool, reasons: [{id, reason}] }` | CONFIRMED |
| R3 | Reasons are **store-specific** (not universal) — fallback to master (rid=0) if empty | CONFIRMED (per spec) |
| R4 | **Frontend currently uses hardcoded WASTAGE_REASONS** in `reasonCategories.js` with different labels | **GAP** |

### Gap: Hardcoded vs API Reasons

| Source | Reasons |
|--------|---------|
| **API (live)** | Others, Expired, Pilferage, Spillage |
| **Frontend hardcoded** | Expired, Spoiled, Damaged, Spillage, Pest/Contamination, Other |

**Impact:** Frontend sends reason labels that may not match what admin configured. The write path stores free-text, so it works — but the picker should reflect the store's actual configured reasons.

**Recommendation:** Replace hardcoded `WASTAGE_REASONS` with a hook that fetches `GET /inventory/wastage-reasons` on mount, with fallback to hardcoded list on error.

---

## 2. Wastage Report API — Findings

### Confirmed Response Shape

```
Top-level keys: [status, summary, totals, by_restaurant, wastage_records, segment_snapshot, segment_snapshot_note]
```

| Block | Type | Always Present | Notes |
|-------|------|:-:|-------|
| `status` | bool | YES | Always `true` on success |
| `summary` | object | YES | `{total_records, total_loss, total_gain, net_wastage, applied_restaurant_ids}` |
| `totals` | object | YES | `{total_loss, total_gain, net_wastage}` — duplicated from summary |
| `by_restaurant[]` | array | YES | Per-store rollup: `{restaurant_id, total_records, total_loss, total_gain, net_wastage}` |
| `wastage_records[]` | array | YES | Event rows |
| `segment_snapshot[]` | array | YES* | Always present key (empty unless `include_segments=true`) |
| `segment_snapshot_note` | string | YES* | Always present — clarifying note |

*NOTE: `segment_snapshot` and `segment_snapshot_note` keys are ALWAYS present in response, even without `include_segments=true`. When not requested, `segment_snapshot` is an empty array.

### Per-Row Fields (wastage_records[])

**Existing (P10) — confirmed:**
- `wastage_id` (int)
- `restaurant_id` (int)
- `food_id` (int)
- `item_name` (string)
- `item_type` (string: "Ingredient")
- `waste_type` (string: "Loss" | "Gain")
- `previous_stock` (string — quantity before wastage)
- `wastage_quantity` (number)
- `unit` (string)
- `wastage_value` (number — monetary, 0 in test data)
- `waste_reason` (string — free text stored at write time)
- `waste_date` (string: "YYYY-MM-DD HH:MM:SS")
- `created_at` (string: "YYYY-MM-DD HH:MM:SS")

**P24 extensions — confirmed:**
- `segment_allocations_json` (string | null — raw JSON from DB)
- `source_type` (string | null — "hierarchy_wastage" | "physical_count" | "sub_recipe_count" | null for legacy)
- `segment_allocations` (array — parsed from JSON, empty when null)
- `batch` (string | null — first allocation batch name)
- `expiry_date` (string | null — "YYYY-MM-DD" from first allocation)

### segment_allocations[] Schema (confirmed from FEFO record)

```json
{
  "batch": "MAIDA-BATCH-01",
  "qty_cal": 1000,
  "unit_id": 1,
  "segment_id": 22,
  "category_id": null,
  "expiry_date": "2026-12-31",
  "qty_display": 1,
  "stock_title": "maida",
  "display_unit": "kg",
  "purchase_price": null,
  "inventory_master_id": 17001
}
```

**Note:** Allocation shape is richer than P24 planning doc suggested — includes `unit_id`, `category_id`, `stock_title`, `display_unit`, `purchase_price`, `inventory_master_id`. Frontend should use subset: `batch`, `segment_id`, `qty_cal`, `qty_display`, `expiry_date`.

### segment_snapshot[] Schema (confirmed)

```json
{
  "id": 22,
  "restaurant_id": 785,
  "stock_title": "maida",
  "unit_id": 1,
  "batch": "MAIDA-BATCH-01",
  "expiry_date": "2026-12-31",
  "cal_quantity": "1000.00000000",
  "display_qty": "1.00000000"
}
```

**Critical:** `cal_quantity` and `display_qty` are STRINGS here (high-precision decimal). Must `parseFloat()`.

---

## 3. Legacy vs FEFO Classification

### Test Data Distribution

| Classification | Count | Details |
|----------------|:-----:|---------|
| **FEFO-audited** (has segment_allocations) | **1** | #650 maida at F3 — hierarchy_wastage with MAIDA-BATCH-01 |
| **Legacy** (no batch audit) | **7** | All pre-FEFO or non-segment writes |

### Source Type Distribution

| source_type | Count |
|-------------|:-----:|
| `hierarchy_wastage` | 1 |
| `null` (legacy) | 7 |

### Waste Reason Distribution

| waste_reason | Count |
|-------------|:-----:|
| "Hierarchy wastage" | 6 |
| "damage" | 2 |

**Observation:** 6 of 7 legacy records have reason "Hierarchy wastage" but `source_type=null` — these predated the P24 migration that added `source_type` tracking.

---

## 4. Edge Cases & Risks

| # | Risk | Severity | Finding | Mitigation |
|---|------|----------|---------|------------|
| E1 | `segment_snapshot` always returned (even without `include_segments`) | LOW | Key present but empty array — safe | Frontend should not show snapshot section when array is empty |
| E2 | `segment_allocations_json` is raw JSON string | LOW | API also provides parsed `segment_allocations` array — use parsed version | Never parse raw JSON in frontend |
| E3 | `cal_quantity`/`display_qty` in snapshot are high-precision strings | MEDIUM | "1000.00000000" — needs `parseFloat()` | Add normalization in API layer |
| E4 | No `restaurant_name` in wastage_records or by_restaurant | MEDIUM | Only `restaurant_id` present — need name resolution | Resolve from hierarchy children list or maintain local map |
| E5 | `waste_reason` is free-text, not enum | LOW | Different sources write different text ("Hierarchy wastage", "damage") | Display as-is, no filtering by reason needed |
| E6 | `previous_stock` is a string | LOW | e.g., "2" — parse to number for display | parseFloat in normalizer |
| E7 | No `recorded_by`/`user_name` in response | LOW | Frontend WastageReport renders `entry.recorded_by` — always shows "—" | Column can be removed or hidden |
| E8 | `totals` duplicates `summary` fields | LOW | Redundant — use `summary` as canonical source | Ignore `totals` block |
| E9 | No Gain-type records exist in test data | INFO | Cannot verify Gain display path | Will work when data exists — field is simple string |
| E10 | Empty date range returns clean empty state | CONFIRMED | summary.total_records=0, wastage_records=[] | Frontend handles correctly |

---

## 5. Current Frontend Gaps

### WastageReport.jsx (existing)

| # | Gap | Impact |
|---|-----|--------|
| G1 | Missing columns: `waste_type` (Loss/Gain), `batch`, `expiry_date`, `source_type` | P24/P25 data not visible |
| G2 | No `has_batch` toggle for batch-audit-only filter | Cannot filter to FEFO-audited rows |
| G3 | No `include_segments` toggle for live segment snapshot | Missing dashboard feature |
| G4 | `recorded_by` column always shows "—" (field not in response) | Dead column |
| G5 | No summary KPI cards (total_loss, total_gain, net_wastage) | Missing overview |
| G6 | No by_restaurant breakdown display | Missing multi-store rollup |
| G7 | API normalizer in `api.js` drops summary/totals/by_restaurant — only passes `wastage_records` as `data` | Frontend can't access report-level stats |

### WastageEntryForm.jsx (existing)

| # | Gap | Impact |
|---|-----|--------|
| G8 | Uses hardcoded `WASTAGE_REASONS` from `reasonCategories.js` | Does not reflect store's configured reasons from API |
| G9 | No call to `GET /inventory/wastage-reasons` | Admin-configured reasons ignored |

### api.js

| # | Gap | Impact |
|---|-----|--------|
| G10 | `getWastageReport` doesn't pass `waste_type`, `food_id`, `has_batch`, `include_segments` filters | Cannot use advanced filtering |
| G11 | No `getWastageReasons()` function | Reasons API not accessible |
| G12 | Normalizer destructures response — loses `summary`, `totals`, `by_restaurant` | Report-level data unavailable |

---

## 6. Recommendations

### Phase 1: API Layer (immediate, ~1h)

1. Add `getWastageReasons()` to `api.js`
2. Extend `getWastageReport()` to accept: `wasteType`, `foodId`, `hasBatch`, `includeSegments`
3. Fix normalizer: preserve full response (don't flatten to just `wastage_records`)
4. Add `parseFloat` normalization for `segment_snapshot` quantities

### Phase 2: Wastage Report Enhancement (~3-4h)

1. Add summary KPI cards (total loss, total gain, net wastage, record count)
2. Add columns: `waste_type` badge (Loss=red, Gain=green), `batch`, `expiry_date`, `source_type` badge
3. Add `has_batch` toggle button: "Show batch-audited only"
4. Add `include_segments` toggle: "Show current segments" (separate section/panel)
5. Remove `recorded_by` column (not in response)
6. Add `by_restaurant` breakdown section
7. Add `waste_type` filter dropdown (All / Loss / Gain)

### Phase 3: Wastage Entry Reason Picker (~1-2h)

1. Create `useWastageReasons()` hook → `GET /inventory/wastage-reasons`
2. Replace hardcoded dropdown in `WastageEntryForm.jsx` with API-driven picker
3. Keep "Other" free-text fallback
4. Fallback to hardcoded `WASTAGE_REASONS` on API error

### No Backend Changes Required

Backend proxy already passes through all V2 routes. Both APIs are fully functional.

---

## 7. Response Shape Quick Reference

### GET /inventory/wastage-reasons
```json
{
  "status": true,
  "reasons": [
    { "id": 15, "reason": "Others" },
    { "id": 14, "reason": "Expired" },
    { "id": 13, "reason": "Pilferage" },
    { "id": 12, "reason": "Spillage" }
  ]
}
```

### POST /inventory/wastage-report
```json
{
  "status": true,
  "summary": {
    "total_records": 8,
    "total_loss": 5.74,
    "total_gain": 0,
    "net_wastage": 5.74,
    "applied_restaurant_ids": [1, 781, 782, ...]
  },
  "totals": { "total_loss": 5.74, "total_gain": 0, "net_wastage": 5.74 },
  "by_restaurant": [
    { "restaurant_id": 785, "total_records": 1, "total_loss": 1, "total_gain": 0, "net_wastage": 1 }
  ],
  "wastage_records": [
    {
      "wastage_id": 650,
      "restaurant_id": 785,
      "food_id": 17001,
      "item_name": "maida",
      "item_type": "Ingredient",
      "waste_type": "Loss",
      "previous_stock": "2",
      "wastage_quantity": 1,
      "unit": "kg",
      "wastage_value": 0,
      "waste_reason": "Hierarchy wastage",
      "waste_date": "2026-05-30 23:02:14",
      "created_at": "2026-05-30 23:02:14",
      "segment_allocations_json": "[{\"batch\":\"MAIDA-BATCH-01\",...}]",
      "source_type": "hierarchy_wastage",
      "segment_allocations": [
        {
          "batch": "MAIDA-BATCH-01",
          "qty_cal": 1000,
          "segment_id": 22,
          "expiry_date": "2026-12-31",
          "qty_display": 1,
          "stock_title": "maida",
          "display_unit": "kg",
          "unit_id": 1,
          "category_id": null,
          "purchase_price": null,
          "inventory_master_id": 17001
        }
      ],
      "batch": "MAIDA-BATCH-01",
      "expiry_date": "2026-12-31"
    }
  ],
  "segment_snapshot": [
    {
      "id": 22,
      "restaurant_id": 785,
      "stock_title": "maida",
      "unit_id": 1,
      "batch": "MAIDA-BATCH-01",
      "expiry_date": "2026-12-31",
      "cal_quantity": "1000.00000000",
      "display_qty": "1.00000000"
    }
  ],
  "segment_snapshot_note": "Current on-hand segment rows when include_segments=true; not per-wastage event audit."
}
```

---

## 8. Data Validation Matrix

| Probe | Filter | Records | Correct | Notes |
|:-----:|--------|:-------:|:-------:|-------|
| P1 | reasons (GET) | 4 reasons | YES | Active store-specific reasons |
| P2 | date range only | 8 | YES | May 2026 scope, all Loss |
| P3 | restaurant_ids=[785] | 1 | YES | Only F3 record |
| P4 | waste_type=Loss | 8 | YES | All 8 are Loss |
| P5 | has_batch=true | 1 | YES | Only FEFO-audited record |
| P6 | include_segments=true | 37 snaps | YES | Live on-hand across hierarchy |
| P7 | waste_type=Gain | 0 | YES | No Gain data in range |
| P8 | food_id=16981 | 2 | YES | Master maida only |
| P9 | full classification | 1 FEFO, 7 legacy | YES | Matches P24 deployment timeline |
| P10 | future dates (empty) | 0 | YES | Clean empty state |
| P11 | combined filters | 1 rec, 5 snaps | YES | All filters compose correctly |
| P12 | raw JSON inspection | parsed OK | YES | API parses for us |
| P13 | response shape check | all keys present | YES | Even without include_segments |

---

## 9. Conclusion

**Both APIs are fully operational and ready for frontend integration.** The response shapes match the P25 spec with minor deviations documented above. Key action items:

1. **api.js needs 2 new functions** (`getWastageReasons`, extend `getWastageReport`)
2. **WastageReport.jsx needs P24/P25 columns** (batch, expiry, source_type, waste_type)
3. **WastageEntryForm.jsx should use API reasons** instead of hardcoded list
4. **No backend changes required** — proxy passes through correctly
