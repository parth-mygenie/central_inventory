# P35 — Purchase Order API Contract

> **Date:** 2026-06-14
> **Status:** ALL VALIDATED (32/32 checks pass)
> **Environment:** preprod.mygenie.online
> **Actor:** manager@germanfluid.com (Master, RID 806)

---

## Overview

Hierarchy stores (master / central / franchise) require a **purchase order** before vendor stock intake by default (`require_po_for_purchase: true`). Normal standalone stores are unchanged — direct `POST add-stock/{id}` still works.

**Vendor identity:** all PO APIs use **`vendor_id`** (FK → `vendors_suplier.id`). Names are join-only at read time.

## Flow

```
POST create (vendor_id + lines) → draft
POST approve (optional if require_po_approval=false)
POST send → sent
POST receive → GRN (stock_vendor + stock_item + segments)
POST close (or auto-close when po_auto_close_on_full_receive=true)
```

## Endpoints

Base: `GET/POST /api/v2/vendoremployee/inventory/purchase-order/...`

| Method | Route | Action |
|--------|-------|--------|
| POST | `create` | Create draft PO |
| GET | `list` | List POs (`status`, `vendor_id`, dates, pagination) |
| GET | `{id}` | Detail with lines + receipts |
| PUT | `{id}/update` | Edit draft only |
| DELETE | `{id}` | Delete draft only |
| POST | `{id}/approve` | Draft → approved |
| POST | `{id}/send` | Approved/draft → sent |
| POST | `{id}/receive` | Record GRN against PO lines |
| POST | `{id}/cancel` | Cancel with `cancel_reason` |
| POST | `{id}/close` | Close received PO |

## Settings (hierarchy only)

| Key | Default |
|-----|---------|
| `require_po_for_purchase` | `true` |
| `require_po_approval` | `false` |
| `po_auto_close_on_full_receive` | `true` |
| `po_variance_alert_pct` | `10` |

Master can set `require_po_for_purchase: false` via operational-settings to restore direct add-stock during rollout.

## Gate on add-stock

`POST inventory/add-stock/{id}` on hierarchy stores returns:
```json
{"errors": [{"code": "DIRECT_PURCHASE_REQUIRES_PO", "message": "Direct stock intake is disabled. Create a purchase order and receive goods against it."}]}
```

## Status Lifecycle

```
                   ┌─── approve ──→ approved ───┐
                   │                             │
  create → draft ──┤                             ├── send → sent ──┬── receive → partially_received ──┐
                   │                             │                 │                                    │
                   └── (require_approval=false) ─┘                 ├── receive (full) → received ──────┤
                   │                                               │                                    │
                   └── delete (draft only)                         └── cancel                    auto-close
                                                                                                    │
                                                                                              → closed
                                                                                                    │
                                                                                              manual close
```

## Create PO Payload

```json
{
  "vendor_id": 233,
  "expected_delivery_date": "2026-06-20",
  "notes": "Monthly flour order",
  "payment_type": "Cash",
  "tot_tax": 0,
  "lines": [{
    "inventory_master_id": 17633,
    "ordered_qty": 30,
    "ordered_unit": "kg",
    "expected_rate": 150
  }]
}
```

Response: `status: "draft"`, `reference_code: "PO-806-2026-XXXX"`, lines with `line_status: "open"`.

## Receive Payload

```json
{
  "purchase_date": "2026-06-15",
  "payment_type": "Cash",
  "receive_lines": [{
    "line_id": 1,
    "received_qty": 25,
    "actual_rate": 160,
    "batch": "GSM-JUN-001",
    "expiry_date": "2026-12-31"
  }]
}
```

Response includes `variance_pct` and `variance_flagged` per receipt.

## List Filters

| Param | Example |
|-------|---------|
| `status` | `draft`, `approved`, `sent`, `partially_received`, `received`, `closed`, `cancelled` |
| `vendor_id` | `233` |
| `from_date` / `to_date` | `2026-06-01` / `2026-06-30` |
| `restaurant_ids[]` | `806` (master: filter by child) |
| `limit` / `offset` | `20` / `0` |

## Error Codes (frontend must handle)

| Code | When | HTTP |
|------|------|:----:|
| `DIRECT_PURCHASE_REQUIRES_PO` | add-stock on hierarchy with PO required | 403 |
| `PO_INVALID_STATUS` | Action on wrong status (e.g. receive on draft) | 422 |
| `PO_LINE_OVER_RECEIVE` | received_qty > remaining ordered | 422 |
| `VENDOR_PURCHASE_NOT_ALLOWED` | Store without vendor purchase permission | 403 |
| `PO_NOT_DELETABLE` | Delete non-draft PO | 422 |
| `PO_APPROVAL_REQUIRED` | Send without approve when setting on | 422 |
| `VALIDATION_FAILED` | Past expiry date, missing fields, etc. | 422 |

## Variance Detection

When `actual_rate` differs from `expected_rate` by more than `po_variance_alert_pct`:
- `variance_pct` = % difference
- `variance_flagged` = `true`
- Frontend should highlight flagged variances in receive flow

## Test Accounts

| Role | Email | RID | PO Access |
|------|-------|:---:|-----------|
| Master | manager@germanfluid.com | 806 | Full lifecycle |
| Central (MID) | manager@centralkitchenalpha.com | 807 | Full (if vendor purchase allowed) |
| Franchise | manager@costtestoutlet.com | 811 | Blocked (`VENDOR_PURCHASE_NOT_ALLOWED`) |
