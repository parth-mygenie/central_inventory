# G-031 — INVESTIGATION REPORT: Reverse Push 500 Post-Backend-Fix

> **Role:** INVESTIGATION
> **Date:** 2026-07-15
> **Investigator:** Agent (INVESTIGATION role)
> **Item:** G-031 (Reverse Push `stock_items` 500) + iteration_59 follow-up
> **Backend Fix Applied:** 2026-07-15 (two rounds — stock_items exclusion + per-module commits + concurrency guard)

---

## TL;DR

**All five backend fixes are VERIFIED working** against `preprod.mygenie.online` directly. However, **the wizard still 500s through our proxy** because the FastAPI proxy timeout (`server.py:177`, `httpx.AsyncClient(timeout=30.0)`) is 30s while the full-bundle reverse push consistently takes ~32s. This is a **proxy configuration bug**, not a backend regression.

Additionally, three frontend gaps need to be addressed to support the new backend response shapes (`409 REVERSE_PUSH_IN_PROGRESS`, `skipped: true` modules, `not_seeded` status).

---

## Curl Evidence

### Backend Direct (bypassing proxy) — ALL PASS

| # | Test | Direct Result | Duration |
|:-:|------|:------------:|:--------:|
| 1 | Full bundle default `{push_food_bundle:true, enforce_child_lock:false}` | **HTTP 200** ✅ | 32.5s |
| 2 | Explicit `modules:["stock_items"]` only | **HTTP 200** (skipped:true) ✅ | ~1s |
| 3 | `enforce_child_lock:true` + full bundle | **HTTP 200** ✅ | 31.5s |
| 4a | Concurrent call 1 | **HTTP 200** ✅ | ~32s |
| 4b | Concurrent call 2 (fired 2s after 4a) | **HTTP 409** `REVERSE_PUSH_IN_PROGRESS` ✅ | instant |
| 5 | Preview (`GET reverse-push-form/from/689`) | **HTTP 200** `status:"partial"`, `target_seeded:true` ✅ | ~1s |

### Through Proxy (our `server.py`) — TIMEOUT

| # | Test | Proxy Result | Duration |
|:-:|------|:----------:|:--------:|
| 1 | Full bundle default | **HTTP 500** `"Internal Server Error"` ❌ | 30.2s |
| ctrl | Single module `["categories"]` | **HTTP 200** ✅ | ~2s |

**Root cause confirmed:** proxy timeout (30.0s) < backend response time (~32s).

---

## Data Flow Trace

```
User clicks "Pull Now" in wizard
  → ReversePushWizardDialog.handleExecute()
  → useHierarchyManagement.executeReverse(childId, opts)
  → api.reversePushFromChild(childId, opts)
  → axios POST /api/proxy/v2/franchise/reverse-push/from/{childId}
    → timeout: 30000ms (api.js L16, global)
  → server.py proxy_v2() handler (L165)
    → httpx.AsyncClient(timeout=30.0) (L177)              ← BOTTLENECK
    → https://preprod.mygenie.online/api/v2/vendoremployee/franchise/reverse-push/from/{childId}
    → Backend processes per-module commits ~32s
    → ❌ httpx timeout at 30s → proxy returns 500
  → axios receives 500 → reverseError = "Reverse push failed"
  → UI renders error banner via data-testid="reverse-error"
```

---

## Issue Classification

### 1. PROXY TIMEOUT — BLOCKING (Root Cause of User-Facing 500)

**File:** `backend/server.py` L177
**Current:** `httpx.AsyncClient(timeout=30.0)`
**Impact:** Full-bundle reverse push (default wizard path) always 500s through proxy because backend takes ~32s.
**Fix:** Increase timeout to 120s for this endpoint path. Options:
  - (A) Add a dedicated route for reverse-push with higher timeout (clean, specific)
  - (B) Raise the generic proxy timeout to 120s (broad, affects all proxied calls)
  - (C) Use per-path timeout logic in the generic handler (moderate complexity)

**Category:** Proxy configuration bug → **hand to BUG FIX / IMPLEMENTATION**

### 2. FRONTEND AXIOS TIMEOUT — SECONDARY

**File:** `frontend/src/services/api.js` L16, L980-981
**Current:** Global `timeout: 30000` (30s)
**Impact:** Even if proxy is fixed, axios client will timeout at 30s for full-bundle calls.
**Fix:** Per-call timeout override on the reverse-push POST (e.g., `client.post(url, body, { timeout: 120000 })`).

**Category:** Frontend bug → **hand to PLANNING / BUG FIX**

### 3. 409 `REVERSE_PUSH_IN_PROGRESS` NOT HANDLED — GAP

**File:** `frontend/src/hooks/useHierarchyManagement.js` L160-174
**Current:** Catch block reads `data?.message` generically → shows "Reverse push failed" for both 500 and 409.
**Impact:** User doesn't know a push is already running vs a real failure. No guidance to "try again shortly."
**Fix:** Check `err.response.status === 409` or `data.error_code === "REVERSE_PUSH_IN_PROGRESS"` and surface a specific message + retry guidance.

**Category:** Frontend gap → **hand to PLANNING / BUG FIX**

### 4. SKIPPED MODULE NOT VISUALIZED — UX POLISH

**File:** `frontend/src/components/central-inventory/ReversePushWizardDialog.jsx` L227-230
**Current:** Filter `typeof v === 'object' && v !== null && 'inserted' in v` includes skipped modules, rendered identically to "nothing changed" (0/0/0).
**Impact:** Users can't distinguish "nothing changed" from "intentionally skipped." The backend's `skipped:true` flag and `note` are dropped.
**Fix:** Check `v.skipped === true` and render a "Skipped" badge + tooltip with the note.

**Category:** Frontend UX gap → **hand to PLANNING**

### 5. `not_seeded` STATUS UNMAPPED — UX GAP

**File:** `frontend/src/components/central-inventory/ReversePushWizardDialog.jsx` L33-37
**Current:** `StatusChip` maps `synced`, `partial`, `stale` only. `not_seeded` falls through to `stale` (red).
**Impact:** Fresh/empty master shows angry red "Stale" when it should show an inviting "Ready to Seed" state.
**Fix:** Add `not_seeded` to StatusChip map with blue/info styling: `{ cls: "bg-blue-50 text-blue-700 border-blue-200", label: "Not Seeded" }`.

**Category:** Frontend UX gap → **hand to PLANNING**

---

## Priority Ranking

| Priority | Issue | Effort | Impact |
|:--------:|-------|:------:|--------|
| **P0** | Proxy timeout 30s → 120s (server.py) | 5 min | Unblocks default wizard flow |
| **P0** | Axios timeout per-call override for reverse-push | 5 min | Unblocks default wizard flow |
| **P1** | Handle 409 `REVERSE_PUSH_IN_PROGRESS` | 10 min | Better UX for concurrent access |
| **P2** | Skipped module "Skipped" badge + tooltip | 15 min | UX polish |
| **P2** | `not_seeded` status in StatusChip | 5 min | UX polish |

---

## Recommended Next Steps

1. **BUG FIX** role: Fix P0 issues (proxy timeout + axios timeout) — ~10 min total, zero risk
2. **IMPLEMENTATION** role: Wire P1 409 handling + P2 UX polish — ~30 min, low risk
3. **QA** role: Re-run Phase 2a-2e from iteration_59 test plan after fixes — all 5 phases should PASS

---

## Notes

- Backend fix docs mention `stock_items` as "transactional GRN/purchase-line ledger" — correct to skip on reverse push
- `inventory_master` (aliased as `ingredients` in the module list) remains the proper catalogue seeding module
- Per-module commits make the reverse push idempotent — safe to retry after partial failure
- Forward push (`POST /franchise/push/{id}`) is unchanged — single transaction, no per-module commit
- The 409 concurrency guard uses MySQL named locks scoped to `reverse_push:{parentId}:{childId}`

---

## Evidence Artifacts

- Curl transcripts: inline above
- Backend fix documentation: provided by owner (2026-07-15 round 1 + round 2)
- Previous QA report: `/app/test_reports/iteration_59.json`
- Gap doc: `control/sessions/G031_REVERSE_PUSH_STOCK_ITEMS_500.md`
