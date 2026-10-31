# Bug Fix: GET Proxy 500 — `json=None` on httpx GET

> **Date:** 24 May 2026
> **File:** `/app/backend/server.py` line 259
> **Severity:** High — all GET proxy routes returned 500

---

## Root Cause

The generic `proxy_v2` catch-all route passed `json=body` (evaluating to `json=None`) to every HTTP method including GET. `httpx==0.28.1` raises `TypeError: AsyncClient.get() got an unexpected keyword argument 'json'` because GET requests do not accept a `json` keyword argument.

## Affected Routes

All V2 GET endpoints routed through the generic proxy:

| Endpoint | Used By |
|----------|---------|
| `GET /proxy/v2/inventory/get-inventory-master` | DirectDispatchForm, StockAdjustmentForm, WastageEntryForm (item dropdowns) |
| `GET /proxy/v2/franchise/list` | getFranchiseList |
| Any other `GET /proxy/v2/*` | Generic proxy catch-all |

**Not affected:** Seed-data custom routes (hierarchy-summary, hierarchy-detail, pending-queues, transfer details, transfer history) — these have dedicated POST handlers above the catch-all.

## Fix Summary

Changed line 259 from:

```python
resp = await getattr(http, method)(
    target_url,
    json=body if body else None,
    headers=headers,
)
```

To:

```python
kwargs = {"headers": headers}
if method in ("post", "put", "patch") and body is not None:
    kwargs["json"] = body
resp = await getattr(http, method)(target_url, **kwargs)
```

Only passes `json=` to POST/PUT/PATCH when a body exists. GET and DELETE never receive `json=`.

## Regression Risk

**Minimal.** The fix is strictly additive gating — POST/PUT/PATCH with a body behave identically to before. GET/DELETE now work correctly. No response shapes, auth, routing, or business logic changed.

## Validation Steps

| Check | Result |
|-------|--------|
| `GET /api/proxy/v2/inventory/get-inventory-master` | 200 (was 500) |
| `POST /api/proxy/v2/inventory-transfer/hierarchy-summary` | 200 (unchanged) |
| `GET /api/` | 200 (unchanged) |
| Backend restart | Clean — no errors |

---

*End of bug fix note*
