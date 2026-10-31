# API Verification Report — Update 2

> **Date:** January 2026  
> **Status:** PARTIALLY BLOCKED — Unit conversion metadata missing

---

## Re-verification Results (3 previously blocked APIs)

| API | Previous Status | Current Status | Notes |
|---|---|---|---|
| Hierarchy Detail | blocked_backend_issue | **verified_working** | Returns stock summary, restaurants list, batch drilldown |
| Hierarchy Report | blocked_backend_issue | **verified_working** | Backward-compat alias, same handler |
| Pending Queues | blocked_backend_issue | **verified_working** | Returns approval/receive/request queues |

## NEW BLOCKER: UNIT_CONVERSION_NOT_DEFINED

**Every transfer operation fails** with error `UNIT_CONVERSION_NOT_DEFINED`.

### Affected APIs (ALL transfer mutations)
- `POST /inventory-transfer/initiate` (direct dispatch)
- `POST /inventory-transfer/request` (child requests stock)
- `POST /inventory-transfer/dispatch/{id}` (dispatch approved)
- All other transfer write operations

### Root Cause
The `unit` table in the database lacks `conversion_factor` and `base_unit` columns/data. The backend code uses DB-first conversion lookup, and when it finds no metadata, it throws UNIT_CONVERSION_NOT_DEFINED.

### Required Fix
Seed the `unit` table with conversion metadata:

```sql
-- Example (owner should verify exact column names):
UPDATE units SET conversion_factor = 1000, base_unit = 'gm' WHERE id = 1;  -- kg
UPDATE units SET conversion_factor = 1000, base_unit = 'ml' WHERE id = 3;  -- ltr
-- Add other units as needed (pieces, etc.)
```

Or run the unit seeder if one exists:
```bash
php artisan db:seed --class=UnitSeeder
```

### What Was Successfully Verified Before This Block

1. add-stock creates proper segments with batch/expiry
2. source-options returns segments + filter buckets correctly
3. segment_id-based selection works in source-options
4. hierarchy-detail returns full stock data with unit_id
5. pending-queues returns proper queue structure
6. All error handling (404, 422, 403) works correctly
7. Authentication and role-based access works across all 3 levels
8. Hierarchy visibility rules confirmed (master sees all, central sees children, franchise sees self)

### Updated API Status

| Category | Status |
|---|---|
| Read APIs (hierarchy, stock, queues, history) | **22/22 verified_working** |
| Write APIs (transfers, dispatch, receive) | **ALL BLOCKED** (unit conversion) |
| Total verified working | 22 |
| Total blocked | 8+ (all transfer writes) |

### Once Owner Fixes Unit Conversion
Re-run: `/tmp/e2e_test_v3.py` — should pass all 8 tests
