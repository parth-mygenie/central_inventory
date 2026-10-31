# G-021: Purchase Order Module — POS Backend Spec

> **Filed:** 2026-06-13
> **Priority:** P0
> **Status:** OPEN — POS backend work required
> **Requested by:** Owner
> **Blocks:** Purchase screen UX freeze (CR-030)

---

## Overview

Replace the current direct `add-stock` (instant GRN) flow with a full Purchase Order lifecycle:

```
CREATE PO → APPROVE PO → SEND TO VENDOR → RECEIVE (GRN) → VALIDATE → CLOSE
 (draft)    (approved)     (sent)         (partial/full)   (matched)  (closed)
```

---

## 1. Data Model

### PO Header — `purchase_orders` table

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | int (auto) | auto | Primary key |
| `po_number` | string | auto | Auto-generated: `PO-{restaurant_id}-{year}-{sequence}` |
| `restaurant_id` | int | YES | Which store created the PO |
| `vendor_id` | int | YES | FK to vendors table |
| `status` | enum | YES | `draft`, `approved`, `sent`, `partially_received`, `received`, `closed`, `cancelled` |
| `expected_delivery_date` | date | NO | When vendor should deliver |
| `payment_type` | string | NO | Cash / Credit / Online |
| `notes` | text | NO | Free text notes for vendor |
| `total_expected_amount` | decimal | computed | Sum of (ordered_qty × expected_rate) across lines |
| `total_received_amount` | decimal | computed | Sum of (received_qty × actual_rate) across lines |
| `total_variance` | decimal | computed | total_received - total_expected |
| `variance_pct` | decimal | computed | (variance / total_expected) × 100 |
| `created_by` | int | auto | User who created |
| `approved_by` | int | NO | User who approved (null if auto-approved) |
| `created_at` | datetime | auto | |
| `approved_at` | datetime | NO | |
| `sent_at` | datetime | NO | |
| `first_received_at` | datetime | NO | First GRN against this PO |
| `closed_at` | datetime | NO | |
| `cancelled_at` | datetime | NO | |
| `cancel_reason` | text | NO | |

### PO Lines — `purchase_order_lines` table

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | int (auto) | auto | Primary key |
| `purchase_order_id` | int | YES | FK to purchase_orders |
| `inventory_master_id` | int | YES | FK to inventory master (which ingredient) |
| `stock_title` | string | YES | Denormalized ingredient name |
| `category_id` | int | NO | Ingredient category |
| `category_name` | string | NO | Denormalized |
| `ordered_qty` | decimal | YES | How much to order |
| `ordered_unit` | string | YES | Unit (kg, ltr, piece, pkt) |
| `expected_rate` | decimal | YES | Expected price per unit |
| `expected_line_total` | decimal | computed | ordered_qty × expected_rate |
| `received_qty` | decimal | default 0 | Actual quantity received (updated on GRN) |
| `actual_rate` | decimal | NO | Actual invoice rate (filled on receive) |
| `actual_line_total` | decimal | computed | received_qty × actual_rate |
| `variance_amount` | decimal | computed | actual_line_total - expected_line_total |
| `variance_pct` | decimal | computed | (variance / expected_line_total) × 100 |
| `batch` | string | NO | Batch label (filled on receive) |
| `expiry_date` | date | NO | Expiry date (filled on receive) |
| `line_status` | enum | YES | `ordered`, `partially_received`, `received`, `cancelled` |
| `grn_purchase_id` | int | NO | Links to `purchase_id` from `add-stock` response (after receive) |

---

## 2. Status Lifecycle

```
                    ┌──────────┐
                    │  DRAFT   │ ← Created, editable
                    └────┬─────┘
                         │ approve
                    ┌────▼─────┐
                    │ APPROVED │ ← Locked, ready to send
                    └────┬─────┘
                         │ send
                    ┌────▼─────┐
                    │   SENT   │ ← Waiting for vendor delivery
                    └────┬─────┘
                         │ receive (partial)
              ┌──────────▼───────────┐
              │ PARTIALLY_RECEIVED   │ ← Some lines received, rest pending
              └──────────┬───────────┘
                         │ receive (remaining)
                    ┌────▼─────┐
                    │ RECEIVED │ ← All lines received
                    └────┬─────┘
                         │ close (after validation)
                    ┌────▼─────┐
                    │  CLOSED  │ ← Final, archived
                    └──────────┘

  Any status except CLOSED → CANCELLED (with reason)
  DRAFT → can be edited (add/remove lines, change qty/rate)
  APPROVED onwards → locked (no edits, only receive)
```

### Status Transition Rules

| From | To | Who Can | Condition |
|------|----|---------|-----------|
| `draft` | `approved` | Master, Central | All lines have qty > 0 and rate > 0 |
| `draft` | `cancelled` | Creator | Any time while draft |
| `approved` | `sent` | Master, Central | Manual action (marks as communicated to vendor) |
| `approved` | `cancelled` | Master, Central | With reason |
| `sent` | `partially_received` | System | When first GRN is recorded |
| `sent` | `received` | System | When all lines fully received |
| `partially_received` | `received` | System | When remaining lines received |
| `received` | `closed` | Master, Central | Manual close after validation |
| Any (except closed) | `cancelled` | Master | With reason |

---

## 3. API Endpoints Needed

### 3.1 PO CRUD

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /inventory/purchase-order/create` | POST | Create new PO (status: draft) |
| `GET /inventory/purchase-order/list` | GET | List POs with filters |
| `GET /inventory/purchase-order/{id}` | GET | PO detail with lines |
| `PUT /inventory/purchase-order/{id}/update` | PUT | Edit draft PO (add/remove/change lines) |
| `DELETE /inventory/purchase-order/{id}` | DELETE | Delete draft PO only |

### 3.2 PO Status Actions

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /inventory/purchase-order/{id}/approve` | POST | Draft → Approved |
| `POST /inventory/purchase-order/{id}/send` | POST | Approved → Sent |
| `POST /inventory/purchase-order/{id}/cancel` | POST | Any → Cancelled (body: `{reason}`) |
| `POST /inventory/purchase-order/{id}/close` | POST | Received → Closed |

### 3.3 GRN (Receive Against PO)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /inventory/purchase-order/{id}/receive` | POST | Record received goods against PO |

This is the KEY endpoint. It should:
1. Accept received lines with actual qty and rate
2. Call `add-stock` internally for each line (creates segments, updates inventory)
3. Update PO line `received_qty`, `actual_rate`, `grn_purchase_id`
4. Update PO status (partially_received or received)
5. Compute variance per line and header total

### 3.4 Intelligence

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /inventory/purchase-order/suggest` | GET | Suggest items to reorder (low stock + best vendor rates) |

**Existing endpoints (no changes needed):**
- `GET /inventory/vendor-item-list` → purchase history for rate intelligence
- `GET /inventory/get-vendor` → vendor list
- `GET /inventory/get-inventory-master` → item list for PO line creation
- `GET /inventory/stock-inventory` → current stock levels

---

## 4. Request/Response Contracts

### 4.1 Create PO

**Request:** `POST /inventory/purchase-order/create`
```json
{
  "vendor_id": 236,
  "expected_delivery_date": "2026-06-20",
  "payment_type": "Credit",
  "notes": "Monthly grocery order",
  "lines": [
    {
      "inventory_master_id": 17635,
      "ordered_qty": 5,
      "ordered_unit": "kg",
      "expected_rate": 150
    },
    {
      "inventory_master_id": 17640,
      "ordered_qty": 10,
      "ordered_unit": "ltr",
      "expected_rate": 40
    }
  ]
}
```

**Response:**
```json
{
  "data": {
    "id": 1001,
    "po_number": "PO-806-2026-0001",
    "restaurant_id": 806,
    "vendor_id": 236,
    "vendor_name": "Premium Organics Ltd",
    "status": "draft",
    "total_expected_amount": 1150,
    "lines": [
      {
        "id": 5001,
        "inventory_master_id": 17635,
        "stock_title": "Baking Powder",
        "category_name": "Cookie",
        "ordered_qty": 5,
        "ordered_unit": "kg",
        "expected_rate": 150,
        "expected_line_total": 750,
        "received_qty": 0,
        "line_status": "ordered"
      },
      {
        "id": 5002,
        "inventory_master_id": 17640,
        "stock_title": "Milk",
        "category_name": "Dairy",
        "ordered_qty": 10,
        "ordered_unit": "ltr",
        "expected_rate": 40,
        "expected_line_total": 400,
        "received_qty": 0,
        "line_status": "ordered"
      }
    ],
    "created_at": "2026-06-13T10:00:00Z"
  }
}
```

### 4.2 List POs

**Request:** `GET /inventory/purchase-order/list?status=sent&vendor_id=236&from_date=2026-06-01&to_date=2026-06-30&limit=25&page=1`

**Response:**
```json
{
  "data": [
    {
      "id": 1001,
      "po_number": "PO-806-2026-0001",
      "vendor_name": "Premium Organics Ltd",
      "status": "sent",
      "line_count": 5,
      "total_expected_amount": 1150,
      "total_received_amount": null,
      "expected_delivery_date": "2026-06-20",
      "created_at": "2026-06-13T10:00:00Z",
      "sent_at": "2026-06-13T10:05:00Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 25
  }
}
```

### 4.3 Receive Against PO (GRN)

**Request:** `POST /inventory/purchase-order/{id}/receive`
```json
{
  "receive_lines": [
    {
      "line_id": 5001,
      "received_qty": 4.5,
      "actual_rate": 160,
      "batch": "BP-JUN-001",
      "expiry_date": "2026-12-31"
    },
    {
      "line_id": 5002,
      "received_qty": 10,
      "actual_rate": 40,
      "batch": "MILK-JUN-001",
      "expiry_date": "2026-06-20"
    }
  ],
  "purchase_date": "2026-06-15",
  "payment_type": "Cash"
}
```

**Backend internally does for each line:**
```
1. Call add-stock/{inventory_master_id} with qty, unit, vendor_id, batch, expiry, price
2. Get back purchase_id from response
3. Update PO line: received_qty, actual_rate, grn_purchase_id = purchase_id
4. Compute variance: actual_rate(160) vs expected_rate(150) = +6.7%
5. Update PO status: all lines received? → "received" : "partially_received"
```

**Response:**
```json
{
  "data": {
    "id": 1001,
    "po_number": "PO-806-2026-0001",
    "status": "received",
    "lines": [
      {
        "id": 5001,
        "stock_title": "Baking Powder",
        "ordered_qty": 5,
        "received_qty": 4.5,
        "expected_rate": 150,
        "actual_rate": 160,
        "variance_pct": 6.7,
        "line_status": "received",
        "grn_purchase_id": 6022
      },
      {
        "id": 5002,
        "stock_title": "Milk",
        "ordered_qty": 10,
        "received_qty": 10,
        "expected_rate": 40,
        "actual_rate": 40,
        "variance_pct": 0,
        "line_status": "received",
        "grn_purchase_id": 6023
      }
    ],
    "total_expected_amount": 1150,
    "total_received_amount": 1120,
    "total_variance": -30,
    "variance_pct": -2.6,
    "received_at": "2026-06-15T14:00:00Z"
  }
}
```

### 4.4 Suggest Reorder

**Request:** `GET /inventory/purchase-order/suggest?coverage_days=7`

**Response:**
```json
{
  "data": {
    "suggestions": [
      {
        "inventory_master_id": 17635,
        "stock_title": "Baking Powder",
        "category_name": "Cookie",
        "current_stock_qty": 3.21,
        "current_stock_unit": "kg",
        "daily_consumption": 0.042,
        "days_of_stock": 76,
        "suggested_qty": 0,
        "vendors": [
          { "vendor_id": 237, "vendor_name": "Budget Ingredients Co", "last_rate": 100, "avg_rate": 100, "is_cheapest": true },
          { "vendor_id": 236, "vendor_name": "Premium Organics Ltd", "last_rate": 150, "avg_rate": 145, "is_cheapest": false }
        ]
      },
      {
        "inventory_master_id": 17699,
        "stock_title": "coffee beans",
        "category_name": "coffee",
        "current_stock_qty": 0,
        "current_stock_unit": "pkt",
        "daily_consumption": 0.5,
        "days_of_stock": 0,
        "suggested_qty": 4,
        "vendors": [
          { "vendor_id": 238, "vendor_name": "bakery raw wala", "last_rate": 533, "avg_rate": 533, "is_cheapest": true }
        ]
      }
    ]
  }
}
```

---

## 5. Permission Matrix

| Action | Master | Central | Franchise |
|--------|:------:|:-------:|:---------:|
| Create PO | ✅ | ✅ (if vendor purchase enabled) | ✅ (if vendor purchase enabled) |
| Edit draft PO | ✅ (any) | ✅ (own) | ✅ (own) |
| Approve PO | ✅ (any in tree) | ✅ (own) | ❌ (needs parent approval?) |
| Send PO | ✅ | ✅ | ✅ (own approved POs) |
| Receive against PO | ✅ | ✅ | ✅ |
| Cancel PO | ✅ (any in tree) | ✅ (own) | ✅ (own draft only) |
| Close PO | ✅ | ✅ | ✅ |
| View PO list | ✅ (all in tree) | ✅ (own + children) | ✅ (own only) |

**Note:** Franchise PO approval could be optional — configurable via operational settings key: `require_po_approval_for_franchise` (true/false).

---

## 6. Operational Settings Keys (new)

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `require_po_approval` | boolean | false | If true, POs need approval before sending |
| `po_auto_close_on_full_receive` | boolean | true | Auto-close PO when all lines fully received |
| `po_variance_alert_pct` | number | 10 | Alert if actual rate exceeds expected by X% |
| `require_po_for_purchase` | boolean | false | If true, direct add-stock is blocked — must go through PO |

---

## 7. What Changes on Frontend (our side)

### New Screens

| Screen | Route | Purpose |
|--------|-------|---------|
| **PO List** | `/purchase/orders` | Dashboard of all POs (filters: status, vendor, date) |
| **Create PO** | `/purchase/orders/new` | Multi-select items (category-grouped), vendor, rates |
| **PO Detail** | `/purchase/orders/{id}` | View PO, status timeline, actions (approve/send/receive/close) |
| **Receive Against PO** | `/purchase/orders/{id}/receive` | Enter actual qty + rate per line, variance display |

### Modified Screens

| Screen | Change |
|--------|--------|
| **Purchase (existing)** | Rename to "Quick Purchase" — for ad-hoc add-stock without PO. Only available if `require_po_for_purchase = false`. |
| **Operations Hub** | Add "Open POs" KPI card + "Items to Reorder" NBA using suggest endpoint |
| **Sidebar (INWARD section)** | Restructure: `Vendor Management`, `Raw Material Master`, `Purchase Orders`, `Quick Purchase` |

### New API Methods (api.js)

```javascript
// PO CRUD
createPurchaseOrder(payload)
getPurchaseOrderList({ status, vendorId, fromDate, toDate, limit, page })
getPurchaseOrderDetail(poId)
updatePurchaseOrder(poId, payload)
deletePurchaseOrder(poId)

// PO Actions
approvePurchaseOrder(poId)
sendPurchaseOrder(poId)
receivePurchaseOrder(poId, { receiveLines, purchaseDate, paymentType })
cancelPurchaseOrder(poId, { reason })
closePurchaseOrder(poId)

// Intelligence
getPurchaseOrderSuggestions({ coverageDays })
```

---

## 8. Migration Path (backward compatible)

| Phase | What | Impact |
|-------|------|--------|
| **Phase 0** | POS builds endpoints, frontend builds screens. `require_po_for_purchase = false` (default). Both old and new flows coexist. | Zero disruption |
| **Phase 1** | Enable PO flow. Train users. Old "Quick Purchase" still available. | Gradual adoption |
| **Phase 2** | Set `require_po_for_purchase = true`. Direct add-stock blocked. All purchases must go through PO. | Full PO enforcement |
| **Phase 3** | Add invoice OCR (G-014) that creates PO lines from scanned invoice. Auto-match against open POs. | Full automation |

---

## 9. Summary — Who Does What

### POS Backend Team

| # | Task | Effort Estimate |
|---|------|:---------------:|
| 1 | Create `purchase_orders` + `purchase_order_lines` tables | 2h |
| 2 | PO CRUD endpoints (create, list, detail, update, delete) | 8h |
| 3 | PO status action endpoints (approve, send, cancel, close) | 4h |
| 4 | **Receive endpoint** — validate, call add-stock per line, update PO, compute variance | 8h |
| 5 | Suggest/reorder endpoint | 4h |
| 6 | Permission gates per role | 2h |
| 7 | 4 new operational settings keys | 1h |
| 8 | PO number auto-generation (sequence per restaurant) | 1h |
| **Total POS** | | **~30h** |

### Frontend Team (us)

| # | Task | Depends On |
|---|------|:----------:|
| 1 | PO List screen | POS #2 |
| 2 | Create PO screen (with category multi-select + price intelligence) | POS #2 |
| 3 | PO Detail screen (status timeline, actions) | POS #2, #3 |
| 4 | Receive Against PO screen (variance validation) | POS #4 |
| 5 | Operations Hub — PO KPIs + reorder NBA | POS #5 |
| 6 | Sidebar restructure | None |
| 7 | api.js — 10 new methods | POS endpoints |
| **Total Frontend** | **~25h** | After POS delivers |

---

*This spec replaces the current direct add-stock purchase flow. Filed as G-021 in gap register. Previous gaps G-022 to G-025 are subsumed into this single spec.*
