# Backend Briefs — Two Pending Tasks (S4 — Purchase UX Overhaul)

> **Date:** 2026-10-16
> **Prepared by:** INTAKE agent
> **For:** Backend team
> **Context:** Frontend CR-047 (Add Stock) and CR-049 (PO Receive Goods) + CR-048 (PO Create) are ready to implement. Two backend changes are needed to complete the full feature set.

---

## Brief 1 — PO Receive Goods: Split Payment Support

**Priority:** P2 — Backlog (additive, non-breaking)
**Endpoint:** `POST /api/v2/vendoremployee/inventory/purchase-order/{id}/receive`

### Current payload (frontend sends today)
```json
{
  "purchase_date": "2026-10-16",
  "payment_type": "Cash",
  "receive_lines": [
    {
      "line_id": 101,
      "received_qty": 50,
      "actual_rate": 42.00,
      "batch": "MAIDA-OCT-15",
      "expiry_date": "2027-04-15"
    }
  ]
}
```

### Required change — add optional `partial_payments[]`
Same pattern already live on `add-purchase` endpoint:
```json
{
  "purchase_date": "2026-10-16",
  "payment_type": "partial",
  "partial_payments": [
    { "payment_mode": "Cash", "amount": 3000 },
    { "payment_mode": "UPI",  "amount": 1500, "transaction_id": "UPI-REF-OPTIONAL" }
  ],
  "receive_lines": [...]
}
```

### Rules

| Rule | Detail |
|------|--------|
| Backward-compatible | `partial_payments` is optional — existing single `payment_type` callers unaffected |
| Accepted `payment_mode` values | Cash, Card, UPI, Bank Transfer, Others |
| `transaction_id` | Optional on every leg |
| Validation | No strict sum check needed — frontend enforces `sum(amounts) === tot_amount` |
| When `payment_type != "partial"` | Ignore `partial_payments` entirely |

### Why needed
`add-purchase` (manual stock purchase) already supports `partial_payments[]` and is live. PO Receive is the other half of the same procurement workflow — a vendor delivers goods and payment is split across cash + UPI. Without this, Receive Goods is limited to single payment while Add Stock supports split.

### Frontend status
CR-049 (PO Receive Goods UX redesign) is ready to wire this once the endpoint supports it. Until then, CR-049 ships with single payment type only.

---

## Brief 2 — Coverage Days Preference: `po_coverage_days` Key in Operational Settings

**Priority:** P2
**Endpoints:** `POST /api/v2/vendoremployee/inventory-transfer/operational-settings/get` and `/update`

### Current `stored_settings` (live — probed 2026-10-16, RID 807)
```json
{
  "stored_settings": {
    "allow_negative_stock": true,
    "po_variance_alert_pct": 10,
    "require_po_for_purchase": true,
    "po_auto_close_on_full_receive": true,
    "near_expiry_alert_days": 3
    ...
    ← po_coverage_days NOT PRESENT
  }
}
```

### Required change — add one new key
```json
{
  "stored_settings": {
    ...existing keys unchanged...,
    "po_coverage_days": 3
  }
}
```

| Property | Value |
|----------|-------|
| Key name | `po_coverage_days` |
| Type | integer |
| Default | `3` |
| Scope | Per-restaurant (same as all other `stored_settings` keys) |
| Read via | `POST /operational-settings/get` → `data.stored_settings.po_coverage_days` |
| Write via | `POST /operational-settings/update` → `{ restaurant_id, settings: { ...existing, po_coverage_days: 7 } }` |

> Note: The `/update` endpoint does a **full-replace** of `stored_settings`. The frontend already handles the read-merge-write pattern correctly in `api.js updateOperationalSettings()`.

### How frontend uses it (CR-048)
```javascript
// On PO Create load — reads saved preference:
const days = settings?.stored_settings?.po_coverage_days ?? 3;
//                                                          ↑ fallback until BE ships

// When storekeeper changes coverage (e.g. selects 7d):
api.updateOperationalSettings(restaurantId, { po_coverage_days: 7 });
// uses existing updateOperationalSettings() which handles read-merge-write
```

### Why needed
PO Create screen will have a `[3d] [7d] [10d] [30d] + custom input` coverage selector. The storekeeper's preferred coverage period should persist across sessions. Without this key, the selector resets to 3 every page load.

### Non-blocking for frontend
CR-048 frontend falls back to `3d` gracefully if key is absent. No frontend work is blocked by this. BE can ship independently on any schedule.

---

## Summary

| # | Task | Endpoint | Priority | Blocking frontend? |
|---|------|----------|:--------:|:------------------:|
| 1 | PO Receive split payment (`partial_payments[]`) | `purchase-order/{id}/receive` | P2 | No — CR-049 ships without it, adds split later |
| 2 | `po_coverage_days` in operational-settings | `operational-settings/get` + `update` | P2 | No — CR-048 falls back to 3d |

Both are **additive, non-breaking, zero-risk** changes. No existing API consumers are affected.
