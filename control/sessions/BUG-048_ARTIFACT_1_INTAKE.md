# BUG-048 — Receive Transfer Fails: "Invalid stock data" (INVALID_STOCK_DATA)

> **Registered:** 2026-07-24
> **Severity:** P1 — HIGH (transfers cannot be received — stock stuck in transit)
> **Source:** OWNER-REPORTED + AGENT-CONFIRMED (Investigation role, full e2e test)
> **Duplicate Check:** DISTINCT
> **Classification:** BACKEND / DATA — No frontend fix possible

---

## Summary

Receiving any dispatched transfer in the **palm central (813) → palmbharat (815)** hierarchy fails with HTTP 400 `INVALID_STOCK_DATA`. Root cause: `destination_inventory_master_id` is NULL on all transfer lines because the POS backend cannot resolve the source→destination inventory mapping.

---

## Reproduction

```bash
# 1. Login as child (receiver)
TOKEN=$(curl -s -X POST ".../api/proxy/auth/login" \
  -d '{"email":"owner@palmbharat.com","password":"Qplazm@10"}' | jq -r .token)

# 2. Confirm dispatched transfer exists
curl -s ".../api/proxy/v2/inventory-transfer/details/309" -H "Authorization: Bearer $TOKEN"
# → status: "dispatched", lines[0].destination_inventory_master_id: null

# 3. Attempt receive
curl -s -X POST ".../api/proxy/v2/inventory-transfer/receive/309" \
  -H "Authorization: Bearer $TOKEN" -d '{}'
# → 400: {"error_code":"INVALID_STOCK_DATA","message":"Invalid stock data"}
```

Tested on **two separate transfers** (307 and 309, fresh dispatch) — same result.

---

## Why `destination_inventory_master_id` Is NULL

| Check | Endpoint | Result |
|-------|----------|--------|
| Hierarchy linked? | `POST franchise/list` (as 813) | **0 children** — 815 not registered as child |
| Catalog pushed? | `GET franchise/push-form/815` (as 813) | **0 parent_items, 0 child_existing** |
| Items exist on parent? | `GET inventory/get-inventory-master` (813) | ✅ Ooty Tea Powder = **18527** |
| Items exist on child? | `GET inventory/get-inventory-master` (815) | ✅ Ooty Tea Powder = **18528** |
| Items linked? | Transfer line `destination_inventory_master_id` | ❌ **NULL** |

**The items exist on both stores with matching `stock_title` + `unit`, but they are not linked through the POS catalog push system.** The `initiate` endpoint creates transfer lines with only `source_inventory_master_id`, and the backend never resolves the destination mapping.

---

## Affected Transfers

| Transfer ID | Reference | From → To | Status | Lines | Issue |
|:-----------:|-----------|:---------:|:------:|:-----:|-------|
| 307 | TRF-813-2026-0009 | 813 → 815 | dispatched | 2 | `dst_inv_master=null` on both |
| 309 | TRF-813-2026-0010 | 813 → 815 | dispatched | 1 | `dst_inv_master=null` |

---

## Questions for Backend Team

1. **Why does `franchise/list` return 0 children for RID 813?** — Is the 813→815 hierarchy properly configured in the POS DB?
2. **Should `initiate` auto-resolve `destination_inventory_master_id`** by matching `stock_title` + `unit` on the destination restaurant, even without push linkage?
3. **Can the 2 stuck transfers (307, 309) be patched?** — Manually set `destination_inventory_master_id` (354→18528, 355→18529, 356→18528) so the child can receive.
4. **Is a catalog push required before dispatch?** — If so, should the frontend block dispatch to stores without push linkage?

---

## Accounts for Testing

| Role | Email | Password | RID |
|------|-------|----------|:---:|
| Parent (master) | `owner@palmcentral.com` | `Qplazm@10` | 813 |
| Child (franchise) | `owner@palmbharat.com` | `Qplazm@10` | 815 |
