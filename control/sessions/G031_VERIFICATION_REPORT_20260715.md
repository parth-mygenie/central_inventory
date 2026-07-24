# G-031 — VERIFICATION REPORT: Backend Fix Rounds 1-3

> **Date:** 2026-07-15
> **Investigator:** Agent (INVESTIGATION role)
> **Backend Fixes Tested:** Round 1 (stock_items skip), Round 2 (per-module commit + concurrency guard), Round 3 (N+1 speedup + forward push hardening)
> **Test Hierarchy:** master 809 (bhole chature) ← franchise 689 (Kunafa Mahal)
> **Token:** `owner@bholechature.com` / `Qplazm@10`

---

## Executive Summary

All three rounds of backend fixes are **VERIFIED WORKING** directly against preprod. Through the proxy:
- **Reverse push: PASS** (barely — 29.8s vs 30s timeout, coin-flip territory)
- **Forward push: FAIL** (74s, well over 30s proxy timeout)
- **Concurrency guards (409): PASS** for both directions
- **Proxy timeout bump to 120s is still needed** as safety margin

---

## Detailed Test Results

### Reverse Push — Through Proxy (`server.py` → preprod)

| # | Test | HTTP | Duration | Verdict |
|:-:|------|:----:|:--------:|:-------:|
| 1 | Full bundle default `{push_food_bundle:true, enforce_child_lock:false}` | **200** | 29.8s | ✅ PASS |
| 2 | Explicit `modules:["stock_items"]` only | **200** | 2.2s | ✅ PASS (skipped:true) |
| 3 | `enforce_child_lock:true` + full bundle | **200** | 28.9s | ✅ PASS |
| 4a | Concurrent call 1 (full bundle) | **200** | ~29s | ✅ PASS |
| 4b | Concurrent call 2 (fired 3s after 4a) | **409** | 0.9s | ✅ PASS `REVERSE_PUSH_IN_PROGRESS` |
| 5 | Preview `GET reverse-push-form/from/689` | **200** | <1s | ✅ PASS `status:partial, target_seeded:true` |

**Round 3 N+1 speedup brought reverse push from ~32s to ~29s** — just under the proxy timeout. Reverse push no longer 500s through the proxy.

### Reverse Push Response Shape (CURL 1)

```json
{
  "success": true,
  "data": {
    "direction": "reverse",
    "results": {
      "categories":           { "inserted": 0, "updated": 23,  "failed": 0, "warnings": 0 },
      "stock_item_categories": { "inserted": 0, "updated": 70,  "failed": 0, "warnings": 0 },
      "addons":               { "inserted": 0, "updated": 10,  "failed": 0, "warnings": 0 },
      "sub_recipes":          { "inserted": 0, "updated": 0,   "failed": 0, "note": "No source records found in source restaurant" },
      "ingredients":          { "inserted": 0, "updated": 105, "failed": 0, "warnings": 0 },
      "stock_items":          { "inserted": 0, "updated": 0,   "failed": 0, "skipped": true, "note": "stock_items is transactional and is not synced on reverse push" },
      "foods":                { "inserted": 0, "updated": 98,  "failed": 0, "warnings": 0 },
      "recipes":              { "inserted": 0, "updated": 97,  "failed": 0, "warnings": 0 }
    }
  }
}
```

### Forward Push — Through Proxy

| # | Test | HTTP | Duration | Verdict |
|:-:|------|:----:|:--------:|:-------:|
| 6 | Standalone forward push | **500** | 30.2s | ❌ FAIL (proxy timeout) |
| 6b | Same call DIRECT to preprod | **200** | 74s | ✅ backend works |
| 7a | Concurrent call 1 | **500** | 30.2s | ❌ (proxy timeout) |
| 7b | Concurrent call 2 (fired 3s after 7a) | **409** | 1.4s | ✅ `PUSH_IN_PROGRESS` |

**Forward push takes 74s** because it syncs `stock_items` (1142 rows) — expected behavior per spec. The N+1 fix helped, but stock_items at 1142 rows is inherently slow. The 30s proxy timeout guarantees failure.

### Stuck Named Lock After Proxy Timeout

When the proxy times out during a forward push (at 30s), the backend continues processing (for another ~44s). The MySQL named lock `forward_push:{parentId}:{childId}` remains held until the backend finishes. During this window (~44s), all subsequent push calls to the same hierarchy get `409 PUSH_IN_PROGRESS`.

| Time after initial call | Retry result |
|:---:|:---:|
| 10s | 409 `PUSH_IN_PROGRESS` |
| 70s | 409 `PUSH_IN_PROGRESS` |
| ~180s | 200 (lock released, push succeeds) |

The 3-minute actual recovery suggests the named lock timeout may be longer than the push execution time, or there's a lock-release delay.

---

## Issue Status Update

### From Previous Investigation (iteration_59 issues)

| Issue | iteration_59 Status | Post-Round-3 Status |
|-------|:---:|:---:|
| Full bundle default 500 | HIGH | ✅ **RESOLVED** (29.8s through proxy) |
| enforce_child_lock:true + full bundle 500 | HIGH | ✅ **RESOLVED** (28.9s through proxy) |
| Back-to-back 500 (lock contention) | MEDIUM | ✅ **RESOLVED** (instant 409) |
| Skipped module not visualized | LOW (UX) | ⬜ Frontend gap (unchanged) |

### New / Updated Issues

| Priority | Issue | Category | Details |
|:--------:|-------|----------|---------|
| **P0** | Forward push 500 through proxy (74s > 30s timeout) | Proxy config | `server.py:177` `httpx.AsyncClient(timeout=30.0)` |
| **P1** | Proxy timeout 30s is razor-thin for reverse push (29.8s) | Proxy config | One slow backend response = 500 |
| **P1** | Axios global timeout 30s | Frontend config | `api.js:16` — same issue client-side |
| **P1** | Handle 409 `PUSH_IN_PROGRESS` + `REVERSE_PUSH_IN_PROGRESS` | Frontend gap | Show specific message, not generic error |
| **P2** | Skipped module not visualized (stock_items `skipped:true`) | Frontend UX | Badge + tooltip needed |
| **P2** | `not_seeded` status unmapped in StatusChip | Frontend UX | Currently falls to red "Stale" |
| **P2** | Stuck lock window (~3 min) after proxy-timeout push | Backend concern | Users get 409 for minutes after a timeout |

---

## Recommendations

### Immediate (Proxy + Frontend Timeout)

**Bump proxy timeout for push paths to 120s:**
```python
# server.py — dedicated route or path-specific timeout
# For /franchise/push/* and /franchise/reverse-push/*
async with httpx.AsyncClient(timeout=120.0) as http:
```

**Bump axios per-call timeout for push endpoints:**
```javascript
// api.js — reversePushFromChild and pushBundle
client.post(url, body, { timeout: 120000 })
```

These two changes unblock forward push and add safety margin for reverse push.

### Frontend Adoption (409 handling + UX polish)

1. Handle `409` with `error_code: "PUSH_IN_PROGRESS"` / `"REVERSE_PUSH_IN_PROGRESS"` — show "A push is already running. Try again shortly." with a retry hint.
2. Add `not_seeded` to StatusChip (blue info state, not red error).
3. Add "Skipped" badge for `stock_items` row when `skipped:true`.

### Backend Follow-Up (P2, for backend team)

- Investigate the ~3-minute lock hold after a proxy-timed-out forward push. Expected: lock releases when backend finishes (~74s). Observed: lock held for ~180s.
- Consider reducing forward push stock_items scope or implementing incremental sync.

---

## Evidence Artifacts

All curl transcripts are inline above. No screenshots needed (API-only investigation).
Previous report: `control/sessions/G031_INVESTIGATION_REPORT_20260715.md`
Previous QA: `/app/test_reports/iteration_59.json`
