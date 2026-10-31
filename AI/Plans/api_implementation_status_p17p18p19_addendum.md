
---

## Addendum: P17-Settings / P18-Vendors / P19-AddStock — API Investigation (27 May 2026)

> **Source:** Live POS API probing (preprod.mygenie.online)
> **Actors tested:** Master (rid=1), Central C782, Franchise F786

### P17 Operational Settings — Endpoints Confirmed

| Endpoint | Method | Status |
|----------|--------|--------|
| `POST /inventory-transfer/operational-settings/get` | POST | **WORKING** |
| `POST /inventory-transfer/operational-settings/update` | POST | **WORKING** |

**Response (get):** `{data: {restaurant_id, stored_settings, resolved_settings, defaults, source_restaurant_id}}`
- `stored_settings` = null when purely inherited (no row for that restaurant)
- `resolved_settings` = effective values after chain merge (root→leaf)
- `source_restaurant_id` = last restaurant in chain that contributed values
- 13 recognized keys confirmed (see plan doc)

**Permission verification:**
- Master reads any store in tree: 200 ✓
- Franchise reads own (empty body defaults to self): 200 ✓
- Franchise updates policy key: 403 `UNAUTHORIZED_ACTION` ✓
- Master updates policy key: 200 ✓

### P18 Vendor CRUD — Endpoints Confirmed

| Endpoint | Method | Status |
|----------|--------|--------|
| `GET /inventory/get-vendor` | GET | **WORKING** |
| `POST /inventory/add-vendor` | POST | **WORKING** |
| `PUT /inventory/update-vendor/{id}` | PUT | **WORKING** |
| `DELETE /inventory/vendor-delete/{id}` | DELETE | **WORKING** |

**Response shapes:**
- `get-vendor` → **raw array** `[{id, vendor_name, ...}]` (not wrapped in `{data: [...]}`)
- `add-vendor` → `{data: {id, vendor_name, ...}}`
- `update-vendor` → `{message: "Vendor updated successfully."}`
- `delete-vendor` → `{message: "Vendor deleted successfully."}`

**Policy gate verification:**
- Central (flag=false): 403 `VENDOR_PURCHASE_NOT_ALLOWED` ✓
- Franchise (flag=false): 403 `VENDOR_PURCHASE_NOT_ALLOWED` ✓
- Master enables flag → franchise lists vendors: 200 (0 results, own store scoped) ✓
- Master (always allowed): 200 ✓

### P19 Add Stock — Endpoint Confirmed

| Endpoint | Method | Status |
|----------|--------|--------|
| `POST /inventory/add-stock/{inventory_master_id}` | POST | **WORKING** |

**Response:** `{stock_id, purchase_id, ingredient_name, added_quantity, unit, display_qty, vendor_id, purchase_date, source_restaurant_id, origin_transfer_id, ...}`

**Inventory master list (for SKU picker):**
- `GET /inventory/get-inventory-master` → array of `{id, stock_title, cal_quantity, unit, display_unit}`
- Already in api.js as `getInventoryMaster()`

### Test Artifacts

| Action | Transfer/ID | Notes |
|--------|-------------|-------|
| Created vendor | id=226 "E1 Test Supplier" | Deleted after test |
| Added stock | purchase_id=5103 (0.05kg maida at master) | Confirmed qty increase |
| Settings toggle | allow_child_direct_vendor_purchase: false→true→false | Reverted |

### Frontend Planning

See `AI/Plans/phase2/P17P18P19_settings_vendors_procurement_plan.md` for full implementation plan.
