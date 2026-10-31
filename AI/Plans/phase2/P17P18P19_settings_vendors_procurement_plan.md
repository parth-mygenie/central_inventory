# P17-Settings / P18-Vendors / P19-AddStock — Frontend Implementation Plan

> **Status:** PLANNING ONLY — no code changes
> **Author:** E1 agent, 27 May 2026
> **Depends on:** P15/P16/P17 lifecycle (all implemented)
> **API validation:** All 3 API groups confirmed WORKING on live POS API (preprod)

---

## 0. API Investigation Summary (27 May 2026)

### P17 Operational Settings — CONFIRMED

| Probe | Result |
|-------|--------|
| Master reads own settings | 200 — `resolved_settings` (13 keys), `stored_settings`, `defaults`, `source_restaurant_id` |
| Master reads franchise settings | 200 — inherited values (stored=null, resolved=parent values) |
| Franchise reads own (no body) | 200 — defaults to own `restaurant_id` |
| Franchise updates policy key | 403 `UNAUTHORIZED_ACTION` |
| Master updates policy key | 200 — partial merge |

**Response shape:**
```json
{
  "data": {
    "restaurant_id": 786,
    "stored_settings": null,         // null = purely inherited
    "resolved_settings": { ... },    // effective after chain merge
    "defaults": { ... },             // config/inventory.php defaults
    "source_restaurant_id": 1        // last contributor in chain
  }
}
```

### P18 Vendor CRUD — CONFIRMED

| Probe | Result |
|-------|--------|
| Master GET vendors | 200 — 13 vendors (array, not wrapped) |
| Central GET (disabled) | 403 `VENDOR_PURCHASE_NOT_ALLOWED` |
| Franchise GET (disabled) | 403 `VENDOR_PURCHASE_NOT_ALLOWED` |
| Master POST add-vendor | 200 — `{id, vendor_name, contact_*...}` |
| Master PUT update-vendor | 200 — `"Vendor updated successfully."` |
| Master DELETE vendor | 200 — `"Vendor deleted successfully."` |
| Enable flag → franchise GET | 200 — 0 vendors (own store scoped, no vendors yet) |

**Response shapes:**
- `GET get-vendor` → raw array `[{id, vendor_name, contact_person_name, contact_number, email, address, vendor_type, gst_no}, ...]`
- `POST add-vendor` → `{data: {id, vendor_name, ...}}`
- `PUT update-vendor/{id}` → `{message: "Vendor updated successfully."}`
- `DELETE vendor-delete/{id}` → `{message: "Vendor deleted successfully."}`

### P19 Add Stock — CONFIRMED

| Probe | Result |
|-------|--------|
| Master add-stock (JSON body) | 200 — `{stock_id, purchase_id, ingredient_name, added_quantity, display_qty, ...}` |
| Inventory master list | 200 — 4 items `[{id, stock_title, cal_quantity, unit, display_unit}]` |

**Response shape:**
```json
{
  "stock_id": "16981",
  "purchase_id": 5103,
  "ingredient_name": "maida",
  "added_quantity": 0.05,
  "unit": "kg",
  "display_qty": 109.15,
  "vendor_id": 226,
  "purchase_date": "2026-05-27",
  "source_restaurant_id": 1,
  "origin_transfer_id": null
}
```

---

## 1. Operational Settings UI

### 1.1 Component Map

```
/settings                           ← new route
  └── OperationalSettings.jsx       ← main page component
        ├── SettingsRestaurantPicker ← hierarchy-scoped store selector (master/central only)
        ├── SettingsGroup            ← grouped setting cards
        │     ├── SettingToggle      ← boolean on/off with lock icon for inherited
        │     └── SettingNumber      ← numeric input with inherited indicator
        └── SettingsInheritanceBanner ← shows inheritance chain info
```

### 1.2 Routing

```js
// App.js — add inside protected routes
<Route path="/settings" element={<OperationalSettings />} />
```

**Navigation:** Add "Settings" nav item in Sidebar — visible to `master` and `central` (franchise read-only, low utility).

```js
// screenVisibility.js addition
"scr-settings": { master: FULL, central: READ, franchise: READ }
```

### 1.3 State Model

```js
const [targetRestaurantId, setTargetRestaurantId] = useState(null); // defaults to own
const [settingsData, setSettingsData] = useState(null);
// settingsData shape:
// { stored_settings, resolved_settings, defaults, source_restaurant_id, restaurant_id }
const [saving, setSaving] = useState(false);
```

**Key UX principle:** Display `resolved_settings` as the truth. When a value differs from `stored_settings`, show "Inherited" badge with source info.

### 1.4 Permission Matrix

| Actor | View settings | Edit non-policy | Edit policy keys | Pick other restaurant |
|-------|---------------|-----------------|------------------|-----------------------|
| Master | All stores | Yes | Yes | Yes (full tree) |
| Central | Self + children | Self only (non-policy) | No (403) | Limited (own + children) |
| Franchise | Own only | Own only (non-policy) | No (403) | No |

### 1.5 Settings Groups

**Group 1: Hierarchy Policy** (master-only, red lock icon for non-master)

| Key | Label | Type | Danger Level |
|-----|-------|------|-------------|
| `allow_child_direct_vendor_purchase` | "Allow Direct Vendor Purchase" | toggle | HIGH — unlocks procurement for children |
| `allow_lateral_central_transfer` | "Allow Lateral Central Transfers" | toggle | MEDIUM |
| `allow_cross_central_franchise_dispatch` | "Allow Cross-Branch Dispatch" | toggle | MEDIUM |

**Group 2: Transfer Behavior**

| Key | Label | Type |
|-----|-------|------|
| `reserve_on_approve` | "Reserve Stock on Approve" | toggle |
| `allow_over_receive` | "Allow Over-Receive" | toggle |
| `allow_negative_stock` | "Allow Negative Stock" | toggle |
| `allow_master_direct_franchise` | "Master Direct to Franchise" | toggle |

**Group 3: Alerts & Thresholds**

| Key | Label | Type |
|-----|-------|------|
| `near_expiry_alert_days` | "Near-Expiry Alert (days)" | number |
| `stale_transfer_hours_tier1` | "Stale Transfer Tier 1 (hours)" | number |
| `stale_transfer_hours_tier2` | "Stale Transfer Tier 2 (hours)" | number |
| `reconciliation_tolerance` | "Reconciliation Tolerance" | number |

**Group 4: System** (low-touch, collapsed by default)

| Key | Label | Type |
|-----|-------|------|
| `allow_legacy_conversion` | "Legacy Unit Conversion" | toggle |
| `async_dispatch_enabled` | "Async Dispatch" | toggle |

### 1.6 Inheritance Rendering

For each setting:
```
[Toggle/Input]  "Allow Direct Vendor Purchase"
                ├── value: ON/OFF (from resolved_settings)
                ├── if stored_settings[key] exists → "Set on this store"
                ├── if stored_settings[key] is null → "Inherited from Store #X" (source_restaurant_id)
                └── if value === defaults[key] → "(default)" label
```

**Dangerous toggle UX:** Policy keys show a confirmation dialog before toggling:
```
"Enabling direct vendor purchase allows all child stores to create vendors
 and record stock inward independently. This cannot be scoped per-store —
 it applies to the entire hierarchy below this store."
 [Cancel] [Enable]
```

### 1.7 API Integration

```js
// api.js additions
function getOperationalSettings(restaurantId) {
  const payload = {};
  if (restaurantId) payload.restaurant_id = restaurantId;
  return client.post("/proxy/v2/inventory-transfer/operational-settings/get", payload);
}

function updateOperationalSettings(restaurantId, settings) {
  return client.post("/proxy/v2/inventory-transfer/operational-settings/update", {
    restaurant_id: restaurantId,
    settings,
  });
}
```

### 1.8 Refresh Strategy

- Fetch on mount + on restaurant picker change
- Refetch after successful update (optimistic update not safe — inheritance chain may change resolved values)
- No polling — settings change infrequently

---

## 2. Vendor Management UI

### 2.1 Component Map

```
/vendors                         ← new route
  └── VendorManagement.jsx       ← main page
        ├── VendorPolicyGate     ← checks allow_child_direct_vendor_purchase
        ├── VendorTable          ← list with search
        ├── VendorFormDialog     ← create/edit form (shared)
        └── VendorDeleteConfirm  ← delete confirmation
```

### 2.2 Routing

```js
<Route path="/vendors" element={<VendorManagement />} />
```

**Navigation:** Add "Vendors" nav item — visible to all roles, but content gated by policy.

```js
// screenVisibility.js addition
"scr-vendors": { master: FULL, central: FULL, franchise: FULL }

// ACTION_PERMISSIONS addition
"manage-vendors": { master: true, central: true, franchise: true }
```

### 2.3 Policy Gate Flow

```
Page loads
  └── GET operational-settings (resolved)
        ├── allow_child_direct_vendor_purchase === true (or actor is master)
        │     └── Show vendor table + CRUD actions
        └── allow_child_direct_vendor_purchase === false
              └── Show BlockedState:
                  "Direct vendor procurement is disabled for your store.
                   Stock is received from your parent store via inventory transfers.
                   Contact your Central Store manager to enable this feature."
```

### 2.4 Vendor Table Columns

| Column | Source |
|--------|--------|
| Name | `vendor_name` |
| Contact | `contact_person_name` / `contact_number` |
| Email | `email` |
| GST | `gst_no` |
| Actions | Edit / Delete buttons |

### 2.5 VendorFormDialog Fields

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| Vendor Name | Yes | text | Unique per restaurant |
| Contact Person | No | text | |
| Phone | No | text | |
| Email | No | email | |
| Address | No | textarea | |
| GST Number | No | text | |

**Validation:** Only `vendor_name` required. Duplicate name → 409 error → show inline.

### 2.6 Empty State

```
"No vendors yet. Add your first supplier to start recording stock purchases."
[+ Add Vendor]
```

### 2.7 Error Handling

| Error | UX |
|-------|-----|
| `VENDOR_PURCHASE_NOT_ALLOWED` | Show blocked state (not toast — persistent gate) |
| `RESTAURANT_FROZEN` | Show freeze banner, disable mutations |
| `duplicate` (409) | Inline form error "A vendor with this name already exists" |
| `not_found` (404) | Toast + refetch list |

### 2.8 API Integration

```js
// api.js additions
function getVendors() {
  return client.get("/proxy/v2/inventory/get-vendor");
}

function addVendor(payload) {
  return client.post("/proxy/v2/inventory/add-vendor", payload);
}

function updateVendor(id, payload) {
  return client.put(`/proxy/v2/inventory/update-vendor/${id}`, payload);
}

function deleteVendor(id) {
  return client.delete(`/proxy/v2/inventory/vendor-delete/${id}`);
}
```

**Note:** `get-vendor` returns raw array (not `{data: [...]}`). Normalizer must handle both shapes.

---

## 3. Add Stock / Procurement UI

### 3.1 Component Map

```
/procurement/new                  ← new route
  └── AddStockForm.jsx            ← main form
        ├── PolicyGate             ← reuse from vendor (same gate)
        ├── SKUSelector            ← inventory master item picker
        ├── VendorSelector         ← vendor dropdown
        ├── BatchExpirySection     ← optional batch + expiry date fields
        ├── CommercialSection      ← price, amount, payment_type (collapsible)
        └── ConfirmationSummary    ← pre-submit review
```

### 3.2 Routing

```js
<Route path="/procurement/new" element={<AddStockForm />} />
```

**Navigation:** "Add Stock" quick action in Operations Hub (next to "Adjust Stock"), gated by `manage-vendors` permission + `allow_child_direct_vendor_purchase` resolved setting.

### 3.3 Form Architecture

**Step 1: Select Item**
- Dropdown from `GET get-inventory-master` (own store inventory)
- Shows: `stock_title (unit) — current qty`
- Selected item provides `inventory_master_id` for URL path

**Step 2: Vendor + Quantity**
- Vendor dropdown from `GET get-vendor`
- Quantity input + unit (auto-filled from selected item)
- Validation: qty > 0, unit matches item

**Step 3: Batch/Expiry (Optional)**
- Batch label (text input, optional)
- Expiry date (date picker, optional — must be `after:today` if set)
- Info: "Leave blank for non-batch stock"

**Step 4: Commercial (Collapsible)**
- Purchase date (defaults to today)
- Payment type (Cash / Credit / Online)
- Unit price, total amount, tax
- Bill reference

**Submit → POST `add-stock/{inventory_master_id}`**

### 3.4 Confirmation UX

Before submit, show summary card:
```
┌────────────────────────────────────┐
│ Add Stock Confirmation             │
│                                    │
│ Item:    maida                     │
│ Qty:     5 kg                      │
│ Vendor:  ABC Foods Pvt Ltd         │
│ Batch:   MAIDA-MAY-01             │
│ Expiry:  31 Dec 2026              │
│                                    │
│ This will increase maida stock     │
│ at your store by 5 kg.             │
│                                    │
│ [Cancel]  [Confirm & Add Stock]    │
└────────────────────────────────────┘
```

### 3.5 Post-Submit Flow

Success response returns `{stock_id, purchase_id, added_quantity, display_qty, ...}`.

Show success toast:
```
"Added 5 kg maida — new balance: 114.15 kg"
```

Navigate to `/hierarchy` (store detail) or stay on form for another entry.

### 3.6 Separation from Transfer Inward

**CRITICAL:** This is NOT transfer receive. The UI must clearly label this as "Vendor Purchase" / "External Stock Inward" — never "Receive" (which is transfer terminology).

| | Vendor Purchase (P19) | Transfer Receive |
|--|----------------------|-----------------|
| Source | External supplier | Parent store |
| API | `POST add-stock/{id}` | `POST inventory-transfer/receive/{id}` |
| Navigation | /procurement/new | Transfer Detail → Receive |
| Stock impact | Increases own inventory | Credits from dispatched transfer |
| Lineage | `source_restaurant_id = self`, `origin_transfer_id = null` | `source_restaurant_id = sender`, `origin_transfer_id = transfer_id` |

### 3.7 Freeze State

If restaurant has active freeze session → show banner + disable form:
```
"Stock operations are frozen for this store. Complete the active stocktake session before adding stock."
```

### 3.8 API Integration

```js
// api.js — reuse existing adjustStockIncrease OR add dedicated method
function addStockPurchase(inventoryMasterId, payload) {
  return client.post(`/proxy/v2/inventory/add-stock/${inventoryMasterId}`, payload);
}
```

**Note:** Existing `adjustStockIncrease` also calls `add-stock/{id}` but was designed for the StockAdjustmentForm flow. Recommend a dedicated `addStockPurchase` method with different payload shape (vendor_id, batch, expiry, commercial fields) to avoid confusion.

---

## 4. Reusable Component Opportunities

| Component | Used by | Notes |
|-----------|---------|-------|
| PolicyGate | VendorManagement, AddStockForm | Checks `allow_child_direct_vendor_purchase` resolved setting |
| VendorSelector | AddStockForm, (future: add-purchase) | Dropdown from `get-vendor` |
| SKUSelector | AddStockForm, (existing: RequestStockForm catalog) | Dropdown from `get-inventory-master` |
| ConfirmActionDialog | Already exists — reuse for dangerous toggles | |
| BlockedAction | Already exists in StateDisplays | Reuse for policy-blocked states |

---

## 5. Permission & Navigation Updates

### screenVisibility.js additions

```js
"scr-settings":    { master: FULL, central: READ, franchise: READ },
"scr-vendors":     { master: FULL, central: FULL, franchise: FULL },
"scr-procurement": { master: FULL, central: FULL, franchise: FULL },
```

### ACTION_PERMISSIONS additions

```js
"manage-vendors":  { master: true, central: true, franchise: true },
"add-stock":       { master: true, central: true, franchise: true },
// Note: actual gate is allow_child_direct_vendor_purchase for central/franchise
```

### NAV_ITEMS additions

```js
{ id: "settings", screen: "scr-settings", label: "Settings", path: "/settings", icon: "Settings" },
{ id: "vendors", screen: "scr-vendors", label: "Vendors", path: "/vendors", icon: "Building2" },
```

**Add Stock** not a nav item — accessed via Operations Hub quick action button.

---

## 6. Phased Implementation Recommendation

### Phase 1: Operational Settings UI (standalone, zero procurement dependency)

**Files:** `OperationalSettings.jsx`, api.js additions, screenVisibility, App.js route, Sidebar
**Risk:** ZERO — additive only, no existing flow modified
**Effort:** ~2 hours
**Value:** Master gains governance visibility + control

### Phase 2: Vendor Management UI (depends on Phase 1 for policy gate)

**Files:** `VendorManagement.jsx`, `VendorFormDialog.jsx`, api.js additions, App.js route
**Risk:** LOW — new CRUD flow, no existing flow modified
**Effort:** ~2 hours
**Value:** Stores can manage supplier master data

### Phase 3: Add Stock / Procurement UI (depends on Phase 2 for vendor data)

**Files:** `AddStockForm.jsx`, api.js additions, App.js route, OperationsHub button
**Risk:** LOW — new form, clear separation from transfer flows
**Effort:** ~2 hours
**Value:** Complete procurement workflow unlocked

**Total: ~6 hours, 3 phases, each independently deployable.**

---

## 7. Risk Analysis

| Risk | Severity | Mitigation |
|------|----------|------------|
| Stock duplication confusion | HIGH | Clear UI labeling: "Vendor Purchase" vs "Transfer Receive". Never use "Receive" for procurement. |
| Policy toggle accidentally enabling procurement | MEDIUM | Confirmation dialog for dangerous toggles. Clear warning text about hierarchy-wide effect. |
| Vendor creation without master flag | LOW | PolicyGate component blocks CRUD + procurement when flag is off. |
| Existing StockAdjustmentForm conflict | LOW | Separate API method (`addStockPurchase` vs `adjustStockIncrease`). Different routes. |
| Freeze state during procurement | LOW | Check freeze before form submission. Banner + form disable. |
| P15/P16/P17 lifecycle regression | ZERO | No shared code modified. New routes, new components only. |

---

## 8. Operational UX Recommendations

1. **Settings page:** Show "What this affects" explainer under each toggle. E.g., "When enabled, central and franchise stores can create vendors and record external stock purchases."

2. **Vendor list:** Empty state should guide user: "Add your first vendor to start recording purchases from external suppliers."

3. **Add Stock confirmation:** Show before/after stock qty: "Current: 109.15 kg → After: 114.15 kg (+5 kg)".

4. **Procurement vs Transfer:** In Operations Hub, visually separate "Transfer Actions" (Dispatch, Request, Receive) from "Procurement Actions" (Add Stock, Vendors).

5. **Hierarchy inheritance:** In Settings, show a small tree visualization: "Master (1) → Central (782) → Franchise (786)" with the setting value at each level.

---

## 9. Files to Create

### New files:
- `frontend/src/components/central-inventory/OperationalSettings.jsx`
- `frontend/src/components/central-inventory/VendorManagement.jsx`
- `frontend/src/components/central-inventory/VendorFormDialog.jsx`
- `frontend/src/components/central-inventory/AddStockForm.jsx` (procurement version)

### Modified files:
- `frontend/src/services/api.js` — 6 new methods
- `frontend/src/lib/screenVisibility.js` — 3 new screens + 2 new actions
- `frontend/src/App.js` — 3 new routes
- `frontend/src/components/layout/Sidebar.jsx` — 2 new nav items
- `frontend/src/components/central-inventory/OperationsHub.jsx` — "Add Stock" quick action (procurement)

### NOT modified:
- `backend/server.py` — proxy already handles all paths
- Transfer lifecycle components — no changes
- Existing StockAdjustmentForm — preserved as-is (different purpose)

---

## 10. API Contract Mapping (Complete)

### P17 Settings

| Frontend Method | HTTP | Path | Body |
|----------------|------|------|------|
| `getOperationalSettings(rid)` | POST | `/proxy/v2/inventory-transfer/operational-settings/get` | `{restaurant_id}` |
| `updateOperationalSettings(rid, settings)` | POST | `/proxy/v2/inventory-transfer/operational-settings/update` | `{restaurant_id, settings}` |

### P18 Vendors

| Frontend Method | HTTP | Path | Body |
|----------------|------|------|------|
| `getVendors()` | GET | `/proxy/v2/inventory/get-vendor` | — |
| `addVendor(payload)` | POST | `/proxy/v2/inventory/add-vendor` | `{vendor_name, ...}` |
| `updateVendor(id, payload)` | PUT | `/proxy/v2/inventory/update-vendor/{id}` | `{vendor_name, ...}` |
| `deleteVendor(id)` | DELETE | `/proxy/v2/inventory/vendor-delete/{id}` | — |

### P19 Add Stock

| Frontend Method | HTTP | Path | Body |
|----------------|------|------|------|
| `addStockPurchase(imId, payload)` | POST | `/proxy/v2/inventory/add-stock/{inventory_master_id}` | `{quantity, unit, vendor_id, batch?, expiry_date?, ...}` |

**Note:** `get-vendor` returns raw array. `add-vendor` returns `{data: {...}}`. `update-vendor` and `delete-vendor` return `{message: "..."}`. Frontend normalizer must handle all shapes.

---

## 11. Open Questions

1. **Settings page placement:** Sidebar nav item or gear icon in header? (Recommendation: sidebar for master, gear icon shortcut for all)
2. **Vendor types:** POS has `GET vendor-type` endpoint — should we populate a dropdown? (Recommendation: skip for MVP, free text or omit)
3. **Purchase history:** Should Add Stock page show recent purchases? (Recommendation: defer — procurement history is a separate reporting concern)
4. **Multi-line purchase:** POS has `add-purchase` (multiple SKUs). Should we support? (Recommendation: defer — single-SKU via `add-stock` covers operational need)
5. **Bill upload:** POS accepts `bill_pdf` field. Should we add file upload? (Recommendation: defer for Phase 3)
