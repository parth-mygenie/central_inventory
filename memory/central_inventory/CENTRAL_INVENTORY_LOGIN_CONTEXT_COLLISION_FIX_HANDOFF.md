# Central Inventory Login Context Collision Fix Handoff

> **Date:** 24 May 2026
> **From:** Senior Central Inventory Login Context Collision Investigation Agent
> **To:** Central Inventory Login Context Collision Fix Implementation Agent

---

## 1. Investigation Report Path

`/app/memory/central_inventory/CENTRAL_INVENTORY_LOGIN_CONTEXT_COLLISION_INVESTIGATION_REPORT.md`

---

## 2. Root Cause

**Mixed root cause** with clear primary:

| Priority | Classification | Description |
|---|---|---|
| **PRIMARY** | `proxy_auth_response_mismatch` | `killua@zoldyck.com` not in `seed_data.EMAIL_RESTAURANT_MAP` → proxy does not enrich login response with `restaurant_type_flag`, `restaurant_id`, `restaurant_name` |
| **SECONDARY** | `frontend_default_fallback_bug` | `useLoginContext.js` line 38 defaults missing `restaurant_type_flag` to `"master"` (Central Store) — any unmapped user gets Central Store role |
| **TERTIARY** | `backend_or_proxy_cache_key_bug` | `_token_restaurant_map` is in-memory volatile dict — server restart wipes all mappings |

---

## 3. Affected Files

| File | Lines | Issue |
|---|---|---|
| `/app/backend/seed_data.py` | 37-45 | `killua@zoldyck.com` missing from `EMAIL_RESTAURANT_MAP` |
| `/app/frontend/src/hooks/useLoginContext.js` | 33-39 | Hard default to `"master"` when `restaurant_type_flag` missing |
| `/app/backend/server.py` | 31, 85, 101 | In-memory `_token_restaurant_map`, default actor = 1 |
| `/app/frontend/src/components/layout/AppHeader.jsx` | 41-44 | Warning badge (symptom display, not root cause) |

---

## 4. Required Fix Scope

### MUST DO (P0)

1. **Add killua to EMAIL_RESTAURANT_MAP**
   - File: `/app/backend/seed_data.py`
   - Add: `"killua@zoldyck.com": 1` (restaurant_id=1, My Genie)
   - Evidence: API verification report confirms killua is restaurant_type_flag=master (Central Store)
   - Risk: None — additive change

### SHOULD DO (P1)

2. **Harden frontend fallback**
   - File: `/app/frontend/src/hooks/useLoginContext.js`
   - Change line 38 to NOT default to "master" for missing flag
   - Instead: block privileged access when type is unknown
   - Risk: Low — may affect demo logins with unmapped emails

### NICE TO HAVE (P2)

3. **Persist token→restaurant map**
   - File: `/app/backend/server.py`
   - Move `_token_restaurant_map` to MongoDB collection
   - Risk: Low — requires schema addition

4. **Change default actor behavior**
   - File: `/app/backend/server.py` line 101
   - Replace `default=1` with error/401
   - Risk: Medium — may break existing sessions after restart

---

## 5. Forbidden Changes

| Rule | Reason |
|---|---|
| Do NOT modify preprod API behavior | External dependency — not our code |
| Do NOT change localStorage key names | Would break existing sessions |
| Do NOT remove the `restaurantTypeUnknown` warning flag | Useful diagnostic indicator |
| Do NOT change terminology mapping in `terminology.js` | Verified correct across all slices |
| Do NOT update `/app/memory/final/` | Per investigation rules |
| Do NOT change auth token handling logic | Working correctly for mapped users |
| Do NOT change CORS or proxy middleware | Unrelated to bug |

---

## 6. QA Plan

### Verification Tests (Post-Fix)

| # | Test | Method | Expected |
|---|---|---|---|
| 1 | Login killua via curl | `curl -X POST .../api/proxy/auth/login` | Response has `restaurant_type_flag: "master"` |
| 2 | Login abhishek via curl | Same | Response unchanged |
| 3 | Login killua in browser | Screenshot | "Central Store" badge, NO warning banner, "My Genie" store name |
| 4 | Login abhishek in browser | Screenshot | Same as before — no regression |
| 5 | Login killua → Stock Adjustment | Screenshot | "Adjust Stock" button visible and form loads |
| 6 | Login Master user | Screenshot | "Master Store" badge, no Stock Adjustment |
| 7 | Login Outlet user | Screenshot | "Outlet" badge, no Dispatch |
| 8 | Logout/login cycle | Both users | Context fully replaced, no stale data |

### Regression Tests

| Area | Check |
|---|---|
| All 3 mapped roles | Login + hub + badges unchanged |
| Slice 1-4 features | Hierarchy, queues, transfers, dispatch unchanged |
| Slice 5 features | Adjustment, wastage entry, wastage report, history & ledger unchanged |

---

## 7. Recommended Next Agent

### `Central Inventory Login Context Collision Fix Implementation Agent`

**Minimum scope:**
1. Add `killua@zoldyck.com` to `EMAIL_RESTAURANT_MAP`
2. Verify via curl
3. Verify via browser screenshot
4. Update test credentials doc if needed

**Extended scope (if time permits):**
1. Harden frontend fallback
2. Persist token→restaurant map
3. Full QA per Section 6

---

*End of Fix Handoff*
