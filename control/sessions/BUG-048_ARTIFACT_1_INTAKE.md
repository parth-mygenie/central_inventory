# BUG-048 — Receive Transfer Fails: "Invalid stock data" (INVALID_STOCK_DATA)

> **Registered:** 2026-07-24
> **Updated:** 2026-07-24 (root cause confirmed via controlled test)
> **Severity:** P1 — HIGH (transfers cannot be received — stock stuck in transit)
> **Source:** OWNER-REPORTED + AGENT-CONFIRMED
> **Classification:** BACKEND — `assertValidStockData()` rejects negative destination stock before credit runs

---

## Confirmed Root Cause

`assertValidStockData(..., 'destination')` in the POS receive flow checks the destination store's `cal_quantity`. If negative → throws `INVALID_STOCK_DATA` and rolls back the transaction **before** `seedLegacyOpeningSegmentForDestination` and the `cal_quantity + consumeCal` update can execute.

**Intended flow (after planned harden):**
```
destination cal_quantity = -12
receive +5000 cal
new cal_quantity = -12 + 5000 = 4988  ← should work
```

**What happens now:**
```
destination cal_quantity = -12
assertValidStockData() sees -12 → THROWS INVALID_STOCK_DATA
transaction rolls back → no seed, no credit, no math runs
```

---

## Proof (Controlled Test on Same Hierarchy)

| Item | dst inv_master | dst `cal_qty` before | Receive | dst `cal_qty` after |
|------|:-:|:-:|:-:|:-:|
| Ooty Tea Powder | 18528 | **-12.00** | ❌ INVALID_STOCK_DATA | -12.00 (no change) |
| Mangalore Coffee Powder | 18529 | **0.00** | ✅ Received OK | 1000.00 (+1 kg) |

**Both items dispatched from same parent (813→815), same hierarchy, same mechanism. Only difference: destination `cal_quantity`.**

### Test Transfers

| Transfer | Ref | Item | Segment | dst cal_qty | Result |
|:--------:|-----|------|:-------:|:-----------:|:------:|
| 307 | TRF-813-2026-0009 | Ooty Tea (5kg) + Mangalore Coffee (1kg) | batch segments | -12 / 0 | ❌ INVALID_STOCK_DATA |
| 309 | TRF-813-2026-0010 | Ooty Tea (2kg) | seg 645 (batch=2) | -12 | ❌ INVALID_STOCK_DATA |
| **313** | **TRF-813-2026-0011** | **Mangalore Coffee (1kg)** | **seg 644 (batch=2)** | **0** | **✅ RECEIVED** |

---

## Fix Required (Backend)

`assertValidStockData()` should **allow negative `cal_quantity` on the destination side** during receive. The math is self-correcting: `-12 + received_qty` resolves the negative. The assertion should only block invalid data shapes/types, not legitimate negative balances that are about to be credited.

---

## Reproduction

```bash
# Login as child (receiver)
TOKEN=$(curl -s -X POST ".../api/proxy/auth/login" \
  -d '{"email":"owner@palmbharat.com","password":"Qplazm@10"}' | jq -r .token)

# Confirm negative stock on destination
curl -s ".../api/proxy/v2/inventory/stock-inventory/18528" -H "Authorization: Bearer $TOKEN"
# → cal_quantity: "-12.00"

# Attempt receive on transfer with negative-stock destination item
curl -s -X POST ".../api/proxy/v2/inventory-transfer/receive/309" \
  -H "Authorization: Bearer $TOKEN" -d '{}'
# → 400: INVALID_STOCK_DATA

# Compare: receive on transfer with zero-stock destination item → WORKS
curl -s -X POST ".../api/proxy/v2/inventory-transfer/receive/313" \
  -H "Authorization: Bearer $TOKEN" -d '{}'
# → 200: "Transfer received successfully"
```

---

## Stuck Transfers (Need Backend Patch or Manual Fix)

| Transfer | Lines affected | Blocked by item |
|:--------:|:-:|:-:|
| 307 | 354 (Ooty Tea), 355 (Mangalore Coffee) | 18528 cal=-12 |
| 309 | 356 (Ooty Tea) | 18528 cal=-12 |

After the backend hardens `assertValidStockData` to allow destination negatives, these transfers should be receivable without any other changes.

---

## Accounts

| Role | Email | Password | RID |
|------|-------|----------|:---:|
| Parent (master) | `owner@palmcentral.com` | `Qplazm@10` | 813 |
| Child (franchise) | `owner@palmbharat.com` | `Qplazm@10` | 815 |
