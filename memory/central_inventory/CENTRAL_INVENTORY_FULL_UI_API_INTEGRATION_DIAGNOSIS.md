# CENTRAL INVENTORY — FULL UI/API INTEGRATION DIAGNOSIS REPORT

> **Date:** 25 May 2026
> **Scope:** Production-readiness diagnosis — ALL screens, ALL APIs, post-seed-shutdown
> **Method:** Live POS API testing via cached auth token (rid=1, type=master) + full code trace
> **Status:** DIAGNOSIS ONLY — no code modified

---

## EXECUTIVE SUMMARY

**14 distinct integration failures identified across 11 screens.**

The seed shutdown successfully removed all seed data paths. However, the real POS API has different field names, response shapes, validation requirements, and route structures than what the frontend expects. The app is currently **non-functional on most screens** when using real POS APIs.

### Failure Classification

| Severity | Count | Description |
|----------|-------|-------------|
| CRITICAL | 5 | Screen completely broken — no data loads or form cannot submit |
| HIGH | 5 | Screen partially broken — key data missing, wrong field mapping |
| MEDIUM | 3 | Screen works but displays incorrect/missing values |
| LOW | 1 | Minor field mapping gap, non-blocking |

---

## 1. LOGIN PAGE (`/login`)

### APIs Called
- `POST /api/proxy/auth/login` → POS V1 `/auth/vendoremployee/common-login`
- `GET /api/v1/vendoremployee/profile` (server-side, for context enrichment)

### Status: PARTIALLY WORKING

**Working:**
- Login itself works with valid POS credentials
- Token returned correctly
- POS profile enrichment extracts `restaurant_id`, `restaurant_type_flag`, `parent_restaurant_id`

**Issues:**
| # | Issue | Severity | Root Cause |
|---|-------|----------|------------|
| L-1 | Seed user credentials (abhishek@kalabahia.com, hisoka@phantom.com) return 401 | HIGH | Seed passwords (123456) no longer work on POS API. Only real POS credentials work. The previously-working session was from a prior browser login. |
| L-2 | `restaurant_name` missing from login enrichment for some users | LOW | POS profile `restaurants[0].name` may be absent; fallback is `null` |

---

## 2. OPERATIONS HUB (`/` — SCR-01)

### APIs Called
1. `POST /proxy/v2/inventory-transfer/pending-queues` → 200 OK
2. `POST /proxy/v2/inventory-transfer/history` → 200 OK (for Ready to Dispatch count)
3. `POST /proxy/v2/inventory-transfer/hierarchy-detail` → 200 OK (via ContextSelector)

### Status: PARTIALLY WORKING

**Working:**
- Pending queues load correctly (approval_pending, receive_pending, my_requests)
- Quick action buttons render based on permissions

**Issues:**
| # | Issue | Severity | Root Cause |
|---|-------|----------|------------|
| OH-1 | Transfer history missing `from_restaurant_name` and `to_restaurant_name` | MEDIUM | POS API `/history` returns flat transfer objects without restaurant names. Frontend expects `t.from_restaurant_name` and `t.to_restaurant_name` for Ready to Dispatch filtering, but gets `null`. The count still works (uses `from_restaurant_id` comparison), but display is degraded. |
| OH-2 | ContextSelector "View as store" may show `store_restaurant_name: null` | MEDIUM | POS hierarchy-detail response does NOT return `store_restaurant_name` or `restaurant_type` at the top level. Frontend expects `data.store_restaurant_name`. |

---

## 3. HIERARCHY SUMMARY (`/hierarchy` — SCR-02)

### APIs Called
1. `POST /proxy/v2/inventory-transfer/hierarchy-summary` → **422** on page load

### Status: **CRITICAL FAILURE**

**Root Cause:** Frontend calls `getHierarchySummary()` with optional `storeType` parameter. The `STORE_TYPE_FILTERS` mapping converts UI tab names to backend values (`masterStores` → `"central"`, `outlets` → `"franchise"`). **However, the POS API requires `store_type` as a MANDATORY field.** When the frontend sends `{}` (empty payload), it gets 422.

**Detailed breakdown:**
| # | Issue | Severity | Root Cause |
|---|-------|----------|------------|
| HS-1 | `hierarchy-summary` 422 on initial load | CRITICAL | POS API validation: `"The store type field is required."` Frontend's `api.getHierarchySummary()` sends `store_type` only when `storeType` param is truthy. On DirectDispatchForm and RequestStockForm, it's called with NO `storeType`, producing `{}` → 422. |
| HS-2 | Same 422 when Hierarchy Summary page defaults to "masterStores" tab | HIGH | On page load, `activeTab = "masterStores"` → `STORE_TYPE_FILTERS["masterStores"] = "central"` → this SHOULD work. But the `fetchSummary` callback builds `params.storeType` only if truthy. Since `"central"` is truthy, tab-based fetches DO work. The 422 comes from **DirectDispatchForm** and **RequestStockForm** calling `api.getHierarchySummary()` with NO params. |

**POS API Contract:**
```
POST /inventory-transfer/hierarchy-summary
Required: { "store_type": "central" | "franchise" }
Optional: { "from_date": "YYYY-MM-DD", "to_date": "YYYY-MM-DD" }
```

**Frontend assumption mismatch:**
```javascript
// DirectDispatchForm.jsx line 31 — calls WITHOUT storeType
api.getHierarchySummary()  // sends {} → 422

// HierarchySummary.jsx line 42 — calls WITH storeType (works)
api.getHierarchySummary({ storeType: STORE_TYPE_FILTERS[tab] })  // sends { store_type: "central" } → 200
```

---

## 4. STORE DETAIL (`/store/:id` — SCR-03)

### APIs Called
1. `POST /proxy/v2/inventory-transfer/hierarchy-detail`

### Status: PARTIALLY WORKING (with data gaps)

**Issues:**
| # | Issue | Severity | Root Cause |
|---|-------|----------|------------|
| SD-1 | `store_restaurant_name` is `null` in POS response | MEDIUM | POS hierarchy-detail returns `store_restaurant_id` but NOT `store_restaurant_name` or `restaurant_type`. Frontend falls back to `navState.storeName` (from navigation state) which works when navigating from Hierarchy Summary, but fails on direct URL access. |
| SD-2 | `child_stock_summary` field name mismatch | HIGH | POS returns `total_quantity` and `display_quantity` but frontend reads `cal_quantity` and `display_qty`. Stock values will show as `undefined`. |
| SD-3 | Batch drilldown field mapping | HIGH | POS returns `available_quantity` and `display_quantity` for batches but frontend reads `cal_quantity`. Batch quantities will show as `undefined`. |

**POS API response shape vs Frontend expectation:**
```
POS returns:                         Frontend expects:
child_stock_summary[].total_quantity  → cal_quantity
child_stock_summary[].display_quantity → display_qty
child_stock_summary[].min_qty_alert   → (not expected - extra)
child_stock_batches[].available_quantity → cal_quantity
child_stock_batches[].display_quantity → (not used)
```

---

## 5. DIRECT DISPATCH (`/dispatch/new` — SCR-07)

### APIs Called on Load
1. `POST /proxy/v2/inventory-transfer/hierarchy-summary` → **422**
2. `GET /proxy/v2/inventory/get-inventory-master` → 200

### Status: **CRITICAL FAILURE**

This is the screen shown in the user's screenshot.

**Issues:**
| # | Issue | Severity | Root Cause |
|---|-------|----------|------------|
| DD-1 | Destination Store dropdown EMPTY | CRITICAL | `api.getHierarchySummary()` called with NO `storeType` param → sends `{}` → 422. `destinations` stays `[]`. No stores to select. |
| DD-2 | Item dropdown EMPTY despite `get-inventory-master` returning 200 | HIGH | `get-inventory-master` returns items inside `{ data: [...] }` (no nested `data.data`). Frontend extracts `invResp.data?.data || invResp.data || []`. Since axios wraps response in `.data`, the actual path is `resp.data.data` which is the array — this WORKS. However, the item objects from POS have `id` field but NO `unit_id` field. The `unit` field IS present. Items should populate BUT the mapping for `unit_id` is missing. |
| DD-3 | Source selector uses wrong field names | HIGH | Frontend sends `{ inventory_master_id, restaurant_id }` via `getSourceOptions()`. POS API requires `{ source_inventory_master_id, from_restaurant_id }`. The `source-options` call will fail with 422 VALIDATION_FAILED. |
| DD-4 | `initiateTransfer` payload uses `source_inventory_master_id` (correct) but source_selector shape is passed raw | LOW | The `source_selector` field in payload items is `{ mode: "segment_id", segment_id: N }` which aligns with POS API's `selector` format. Likely works. |

---

## 6. REQUEST STOCK (`/request/new` — SCR-04)

### APIs Called on Load
1. `POST /proxy/v2/inventory-transfer/hierarchy-summary` → **422**
2. `GET /proxy/v2/inventory/get-inventory-master` → 200

### Status: **CRITICAL FAILURE**

**Issues:**
| # | Issue | Severity | Root Cause |
|---|-------|----------|------------|
| RS-1 | Parent store resolution fails | CRITICAL | `api.getHierarchySummary()` called with NO `storeType` → 422 → `stores = []` → parent store cannot be found from hierarchy. Falls back to `user.parent_restaurant_id` if available. If `parent_restaurant_id` is set in login context, shows fallback label but without real store name. |
| RS-2 | Source selector same field name mismatch as DD-3 | HIGH | `getSourceOptions({ restaurantId: parentRestaurantId, inventoryMasterId })` sends `{ inventory_master_id, restaurant_id }` but POS requires `{ source_inventory_master_id, from_restaurant_id }` → 422. |
| RS-3 | `unit_id` missing from real inventory items | MEDIUM | POS `get-inventory-master` does NOT return `unit_id` field. Frontend sets `unitId: item?.unit_id || null` in rows. The `requestStock` payload includes `unit_id` which will be `null`. |

---

## 7. PENDING QUEUES (`/queues` — SCR-05)

### APIs Called
1. `POST /proxy/v2/inventory-transfer/pending-queues` → 200
2. `POST /proxy/v2/inventory-transfer/history` → 200 (for Ready to Dispatch tab)

### Status: MOSTLY WORKING

**Issues:**
| # | Issue | Severity | Root Cause |
|---|-------|----------|------------|
| PQ-1 | Transfer rows show "—" for From/To names | MEDIUM | POS pending-queues response items do NOT contain `from_restaurant_name` or `to_restaurant_name`. Frontend reads these fields and falls back to `mapRestaurantType(item.from_restaurant_type)` — but those are also missing. Shows "—" for source/destination. |
| PQ-2 | Ready to Dispatch tab — same history name issue | LOW | Transfer history items lack restaurant names. Filtering by `from_restaurant_id` works, but display shows "—". |
| PQ-3 | `items_count` field missing | LOW | POS transfers don't have `items_count`. Frontend falls back to `item.lines?.length` which is also missing in list responses. Shows "—". |

---

## 8. HISTORY & LEDGER (`/history` — SCR-history-ledger)

### APIs Called
1. `POST /proxy/v2/inventory-transfer/history` → 200
2. `GET /proxy/v2/inventory-transfer/details/{id}` → 200 (for each transfer, lazy)
3. `POST /proxy/v2/inventory/wastage-report` → 200

### Status: PARTIALLY WORKING

**Transfer History Tab:**
| # | Issue | Severity | Root Cause |
|---|-------|----------|------------|
| HL-1 | `from_restaurant_name` and `to_restaurant_name` are null in history items | MEDIUM | POS `/history` returns flat objects without restaurant names. Table shows "—" for Source and Destination columns. |
| HL-2 | `items_count` missing | LOW | Same as PQ-3. |
| HL-3 | `resolution_meta` is a JSON STRING, not an object | HIGH | POS returns `resolution_meta` as a serialized JSON string: `"{\"reason\": \"Refused delivery\", ...}"`. Frontend accesses `data.resolution_meta?.reason` which returns `undefined` because it's a string, not an object. Must JSON.parse first. |

**Stock Ledger Tab:**
| # | Issue | Severity | Root Cause |
|---|-------|----------|------------|
| HL-4 | Transfer detail response shape mismatch | HIGH | POS `/details/{id}` returns `{ data: { transfer: {...}, lines: [...] } }`. Frontend extracts `resp.data?.data || resp.data` which gives `{ transfer: {...}, lines: [...] }`. But `deriveLedgerEntries()` expects the transfer object itself with `.lines` embedded. Instead it gets a wrapper with `transfer` and `lines` as siblings. The transfer fields (status, from_restaurant_id, etc.) are NOT at the top level. |
| HL-5 | Transfer line `stock_title` field name mismatch | HIGH | POS transfer lines use `source_stock_title` instead of `stock_title`. Ledger entries will show "—" for item names. |
| HL-6 | Transfer line `quantity` vs `requested_qty` | HIGH | POS lines use `requested_qty` (as string: "0.50000000") instead of `quantity` (number). Quantities shown as "—" or NaN. |

---

## 9. TRANSFER DETAIL (`/transfer/:id` — SCR-09)

### APIs Called
1. `GET /proxy/v2/inventory-transfer/details/{id}` → 200

### Status: **CRITICAL FAILURE**

**Issues:**
| # | Issue | Severity | Root Cause |
|---|-------|----------|------------|
| TD-1 | Response shape: `data.transfer` + `data.lines` vs flat object | CRITICAL | Frontend expects `resp.data?.data || resp.data` to be the transfer object directly (with `.lines` embedded). POS returns `{ data: { transfer: { id, status, ... }, lines: [...] } }`. Frontend sets `data` to `{ transfer: {...}, lines: [...] }`. Then accesses `data.id` → undefined, `data.status` → undefined, `data.from_restaurant` → undefined. The entire detail page shows blanks. |
| TD-2 | `from_restaurant` / `to_restaurant` nested objects missing | HIGH | POS transfer object has `from_restaurant_id` and `to_restaurant_id` (integers) but NOT `from_restaurant` or `to_restaurant` (nested objects with `restaurant_name`/`restaurant_type`). Frontend reads `data.from_restaurant?.restaurant_name` → undefined. |
| TD-3 | `resolution_meta` is JSON string | HIGH | Same as HL-3. Frontend accesses `data.resolution_meta?.reason` → undefined. |
| TD-4 | Line items: `stock_title` → `source_stock_title` | HIGH | POS lines use `source_stock_title`. Frontend reads `line.stock_title || line.inventory_master?.stock_title` → both undefined. |
| TD-5 | Line items: `quantity` → `requested_qty` (string) | HIGH | POS: `"0.50000000"` (string). Frontend expects number `quantity`. |
| TD-6 | Line items: `accepted_qty` / `rejected_qty` missing on list response | MEDIUM | POS line-level acceptance data may be in `meta_json` (stringified). |

---

## 10. STOCK ADJUSTMENT (`/adjustment/new` — SCR-17)

### APIs Called on Load
1. `GET /proxy/v2/inventory/get-inventory-master` → 200

### APIs Called on Submit
- Increase: `POST /proxy/v2/inventory/add-stock` → **404 (Route not found)**
- Decrease: `POST /proxy/v2/inventory-transfer/decrease-adjustment` → **422**

### Status: **CRITICAL FAILURE**

**Issues:**
| # | Issue | Severity | Root Cause |
|---|-------|----------|------------|
| SA-1 | `add-stock` endpoint does NOT EXIST on POS API | CRITICAL | POS returns `NotFoundHttpException` (Laravel). The route `/inventory/add-stock` is not registered. The real POS API may use a different route for stock increase. |
| SA-2 | `decrease-adjustment` requires `restaurant_id` | HIGH | POS validation: `"The restaurant id field is required."` Frontend sends `{ source_inventory_master_id, quantity, unit, source_selector, reason }` but does NOT include `restaurant_id`. |
| SA-3 | Source selector field name mismatch | HIGH | Same as DD-3. `getSourceOptions` sends wrong field names. |
| SA-4 | Item `unit_id` missing from inventory master response | MEDIUM | Same as DD-2. |

---

## 11. WASTAGE ENTRY (`/wastage/new` — SCR-18)

### APIs Called on Load
1. `GET /proxy/v2/inventory/get-inventory-master` → 200

### API Called on Submit
- `POST /proxy/v2/inventory/record-wastage` → **404 (Route not found)**

### Status: **CRITICAL FAILURE**

**Issues:**
| # | Issue | Severity | Root Cause |
|---|-------|----------|------------|
| WE-1 | `record-wastage` endpoint does NOT EXIST on POS API | CRITICAL | POS returns `NotFoundHttpException`. Route not registered. Need to discover real wastage recording endpoint. |
| WE-2 | Source selector field name mismatch | HIGH | Same as DD-3. |

---

## 12. WASTAGE REPORT (`/wastage/report` — SCR-20)

### APIs Called
1. `POST /proxy/v2/inventory/wastage-report` → 200

### Status: PARTIALLY WORKING

**Issues:**
| # | Issue | Severity | Root Cause |
|---|-------|----------|------------|
| WR-1 | Response shape mismatch | HIGH | POS returns `{ status, summary, totals, by_restaurant, wastage_records, segment_snapshot }`. Frontend expects `resp.data?.data || resp.data` to be an array of wastage entries. Instead it gets the full wrapper object. Frontend does `Array.isArray(data) ? data : []` which will return `[]` because `data` is an object, not an array. Should read from `data.wastage_records`. |
| WR-2 | Wastage record field mapping | MEDIUM | POS records use `item_name` (not `stock_title`), `food_id` (not `inventory_master_id`), and different date fields. Frontend handles some of these via fallbacks (`entry.stock_title || entry.item_name`) but `created_at` vs `date` vs `timestamp` mapping may be inconsistent. |

---

## 13. REPORTS PAGE (`/reports` — SCR-20)

### Status: NOT IMPLEMENTED (marked "coming soon")

No API calls. No issues to diagnose.

---

## CROSS-CUTTING ISSUES

### A. Source Options API Field Name Mismatch (affects 4 screens)

**Frontend sends:** `{ inventory_master_id, restaurant_id }`
**POS API requires:** `{ source_inventory_master_id, from_restaurant_id }`

**Affected screens:** Direct Dispatch, Request Stock, Stock Adjustment, Wastage Entry

### B. `get-inventory-master` Response Shape (affects 5 screens)

**POS returns items WITHOUT `unit_id` field.**
Frontend code references `item.unit_id` in multiple components.

**Affected:** Direct Dispatch (payload), Request Stock (payload), Stock Adjustment, Wastage Entry, and any form that builds transfer payloads.

### C. Transfer History — Missing Restaurant Names (affects 3 screens)

POS `/history` returns transfer objects WITHOUT `from_restaurant_name` or `to_restaurant_name`.
Only `from_restaurant_id` and `to_restaurant_id` (integers) are present.

**Affected:** Operations Hub, Pending Queues, History & Ledger

### D. Transfer Detail — Nested Shape Mismatch (affects 2 screens)

POS returns `{ data: { transfer: {...}, lines: [...] } }` instead of a flat object with embedded `lines`.

**Affected:** Transfer Detail page, Stock Ledger (History & Ledger)

### E. `resolution_meta` is JSON String (affects 2 screens)

POS returns `resolution_meta` as a **serialized JSON string**, NOT a parsed object.
Frontend accesses `.resolution_meta?.reason` which fails on strings.

**Affected:** Transfer Detail, Stock Ledger

### F. Transfer Line Field Names (affects 2 screens)

| POS Field | Frontend Expected |
|-----------|-------------------|
| `source_stock_title` | `stock_title` |
| `requested_qty` (string) | `quantity` (number) |
| `requested_unit` | `unit` |
| `quantity_cal` (string) | N/A |

**Affected:** Transfer Detail, Stock Ledger

### G. Two POS API Routes Do Not Exist (affects 2 screens)

| Route | Status | Affected Screen |
|-------|--------|----------------|
| `POST /inventory/add-stock` | 404 NotFound | Stock Adjustment (Increase) |
| `POST /inventory/record-wastage` | 404 NotFound | Wastage Entry |

---

## AUTH/PROFILE CONTEXT VERIFICATION

| Field | Source | Status |
|-------|--------|--------|
| `restaurant_id` | POS profile `restaurants[0].id` | WORKING (=1 for master user) |
| `restaurant_type_flag` | POS profile `restaurants[0].restaurant_type_flag` | WORKING (="master") |
| `parent_restaurant_id` | POS profile `restaurants[0].parent_restaurant_id` | WORKING (=null for master) |
| `restaurant_name` | POS profile `restaurants[0].name` | WORKING (="My Genie") |

No hardcoded hierarchy IDs remain in the codebase (verified — seed shutdown removed all).

---

## SUMMARY TABLE — ALL SCREENS

| Screen | Route | Status | Blocking Issue(s) |
|--------|-------|--------|-------------------|
| Login | `/login` | WORKS (with real POS creds) | Seed test creds no longer valid |
| Operations Hub | `/` | PARTIAL | Missing restaurant names in history |
| Hierarchy Summary | `/hierarchy` | WORKS (tab-based) | Only fails when called without storeType |
| Store Detail | `/store/:id` | PARTIAL | Stock quantity field mapping wrong |
| Pending Queues | `/queues` | PARTIAL | Missing restaurant names |
| History & Ledger | `/history` | PARTIAL | Transfer detail shape mismatch, JSON string resolution_meta |
| Direct Dispatch | `/dispatch/new` | **BROKEN** | hierarchy-summary 422, source-options 422 |
| Request Stock | `/request/new` | **BROKEN** | hierarchy-summary 422, source-options 422 |
| Stock Adjustment | `/adjustment/new` | **BROKEN** | add-stock 404, decrease-adjustment 422, source-options 422 |
| Wastage Entry | `/wastage/new` | **BROKEN** | record-wastage 404, source-options 422 |
| Wastage Report | `/wastage/report` | **BROKEN** | Response shape mismatch (object vs array) |
| Transfer Detail | `/transfer/:id` | **BROKEN** | Entire page blank — response shape mismatch |
| Reports | `/reports` | N/A | Not implemented (coming soon) |

---

## PRIORITY FIX ORDER (recommended)

1. **P0 — hierarchy-summary mandatory `store_type`** → Fix `getHierarchySummary()` to always send a default `store_type` (or fix callers to always provide it)
2. **P0 — Transfer Detail response shape** → Unwrap `data.transfer` + merge `data.lines`
3. **P0 — source-options field name mapping** → `inventory_master_id` → `source_inventory_master_id`, `restaurant_id` → `from_restaurant_id`
4. **P0 — Stock Adjustment / Wastage route discovery** → Find real POS endpoints for `add-stock` and `record-wastage`
5. **P1 — Transfer line field mapping** → `source_stock_title` → `stock_title`, `requested_qty` → `quantity`
6. **P1 — `resolution_meta` JSON.parse** → Parse string before accessing properties
7. **P1 — Wastage Report response unwrap** → Read from `data.wastage_records` not `data` directly
8. **P1 — hierarchy-detail stock summary field mapping** → `total_quantity`/`display_quantity` → `cal_quantity`/`display_qty`
9. **P2 — Transfer history restaurant name resolution** → Either API must return names, or frontend must resolve via hierarchy data
10. **P2 — `decrease-adjustment` missing `restaurant_id`** → Add `restaurant_id` to payload
11. **P2 — `unit_id` absent from inventory master** → Handle gracefully or derive from POS structure
