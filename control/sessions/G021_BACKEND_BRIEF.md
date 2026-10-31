# Purchase Order Module — Backend Brief

> **For:** POS Backend Team
> **From:** Central Inventory Frontend Team
> **Date:** 2026-06-13
> **Full spec:** `control/sessions/G021_PURCHASE_ORDER_MODULE_POS_SPEC.md`

---

## What & Why

Currently `add-stock/{id}` instantly adds inventory — there's no purchase order flow. We need a proper PO lifecycle so operators can:
- Create PO before ordering from vendor
- Track what's ordered vs what's received
- Validate invoice against PO (catch price/qty mismatches)

---

## The Flow

```
CREATE PO (draft) → APPROVE → SEND TO VENDOR → RECEIVE GOODS (GRN) → CLOSE
```

---

## What We Need Built

### 2 New Tables

**`purchase_orders`** — PO header (vendor, status, totals, dates)
**`purchase_order_lines`** — line items (ingredient, ordered_qty, expected_rate, received_qty, actual_rate, variance)

### 10 Endpoints

| # | Endpoint | Method | What it does |
|---|----------|--------|-------------|
| 1 | `/inventory/purchase-order/create` | POST | Create PO with vendor + line items |
| 2 | `/inventory/purchase-order/list` | GET | List POs (filter: status, vendor, date, pagination) |
| 3 | `/inventory/purchase-order/{id}` | GET | PO detail with all lines |
| 4 | `/inventory/purchase-order/{id}/update` | PUT | Edit draft PO only |
| 5 | `/inventory/purchase-order/{id}` | DELETE | Delete draft PO only |
| 6 | `/inventory/purchase-order/{id}/approve` | POST | Draft → Approved |
| 7 | `/inventory/purchase-order/{id}/send` | POST | Approved → Sent |
| 8 | **`/inventory/purchase-order/{id}/receive`** | **POST** | **KEY: Record GRN — calls add-stock per line internally, computes variance** |
| 9 | `/inventory/purchase-order/{id}/cancel` | POST | Any → Cancelled (with reason) |
| 10 | `/inventory/purchase-order/{id}/close` | POST | Received → Closed |

**Bonus (nice-to-have):**
| 11 | `/inventory/purchase-order/suggest` | GET | Suggest reorder items (low stock + best vendor rates) |

### 4 New Operational Settings Keys

| Key | Default | Purpose |
|-----|---------|---------|
| `require_po_approval` | false | POs need manager approval before sending |
| `po_auto_close_on_full_receive` | true | Auto-close when all lines received |
| `po_variance_alert_pct` | 10 | Flag if actual rate exceeds expected by X% |
| `require_po_for_purchase` | false | Block direct add-stock (force PO flow) |

### PO Number Format

Auto-generate: `PO-{restaurant_id}-{year}-{sequence}`
Example: `PO-806-2026-0001`

---

## The Critical Endpoint: Receive (#8)

This is the most important one. When operator receives goods against a PO:

**Input:**
```json
{
  "receive_lines": [
    { "line_id": 5001, "received_qty": 4.5, "actual_rate": 160, "batch": "BP-JUN-001", "expiry_date": "2026-12-31" },
    { "line_id": 5002, "received_qty": 10, "actual_rate": 40, "batch": "MILK-JUN-001", "expiry_date": "2026-06-20" }
  ],
  "purchase_date": "2026-06-15",
  "payment_type": "Cash"
}
```

**Backend should:**
1. For each line → call existing `add-stock/{inventory_master_id}` internally (stock increases, segment created)
2. Store the `purchase_id` from add-stock response on the PO line
3. Compute variance: `actual_rate(160) vs expected_rate(150) = +6.7%`
4. Update PO status: all lines done → `received`, some pending → `partially_received`

**Output:** PO with updated lines showing ordered vs received vs variance.

---

## Status Lifecycle

```
DRAFT → APPROVED → SENT → PARTIALLY_RECEIVED → RECEIVED → CLOSED
                                                    ↑
                                              (or direct if all lines received at once)

Any status (except CLOSED) → CANCELLED (with reason)
DRAFT = editable. APPROVED onwards = locked.
```

---

## Permissions

| Action | Master | Central | Franchise |
|--------|:------:|:-------:|:---------:|
| Create/Edit/Send PO | ✅ | ✅ (if vendor purchase enabled) | ✅ (if enabled) |
| Approve PO | ✅ | ✅ (own) | ❌ |
| Receive/Close | ✅ | ✅ | ✅ |
| Cancel | ✅ (any in tree) | ✅ (own) | ✅ (own draft) |
| View list | ✅ (all in tree) | ✅ (own + children) | ✅ (own) |

---

## Backward Compatibility

- `require_po_for_purchase` defaults to `false` — existing `add-stock` flow continues working
- PO is an additional flow, not a replacement (until operator enables enforcement)
- No changes to existing endpoints

---

## Estimated Effort

| Task | Hours |
|------|:-----:|
| Tables + migrations | 2 |
| CRUD endpoints (create, list, detail, update, delete) | 8 |
| Status actions (approve, send, cancel, close) | 4 |
| **Receive endpoint (GRN + add-stock + variance)** | **8** |
| Suggest/reorder endpoint | 4 |
| Permissions + settings | 3 |
| PO number generation | 1 |
| **Total** | **~30h** |

---

## Questions for Backend Team

1. Does `PO-{rid}-{year}-{seq}` work for PO numbering, or should it follow the same `reference_code` pattern as transfers?
2. Should the receive endpoint call `add-stock` internally, or should frontend call `add-stock` separately and then link via a `link-grn` endpoint?
3. Any existing tables we should extend instead of creating new ones (e.g., is there an `orders` table already)?
4. Do you prefer the endpoints under `/inventory/purchase-order/` or a different namespace like `/procurement/`?

---

*Full detailed spec with complete JSON contracts: `G021_PURCHASE_ORDER_MODULE_POS_SPEC.md`*
