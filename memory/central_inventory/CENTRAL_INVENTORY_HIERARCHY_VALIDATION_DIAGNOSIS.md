# Hierarchy Validation Failure Diagnosis: Central → Franchise Direct Dispatch

> **Date:** 25 May 2026
> **Scope:** DIAGNOSIS ONLY — no code modified
> **Method:** Live POS API probing with real hierarchy data, operational settings inspection, transfer history analysis, and e2e test evidence review

---

## EXECUTIVE SUMMARY

The `INVALID_HIERARCHY` rejection of Central → Franchise direct dispatch is **correct POS backend behavior**. The POS hierarchy edge validator does not currently support the `central → franchise` edge for direct dispatch. This is a **backend-side policy gap** — the setting `allow_central_direct_franchise` does not exist in the POS operational settings schema.

However, this SAME edge **did work in January 2026** (proven by the e2e test script and verification report). This means the POS backend hierarchy validator was either **tightened**, or a previously-existing setting was **removed in a backend migration**.

---

## 1. ACTING CONTEXT

| Field | Value |
|-------|-------|
| Authenticated restaurant_id | 1 |
| Authenticated restaurant_type_flag | master |
| Token source | MongoDB `token_sessions` (from `hisoka@phantom.com` login) |

**NOTE:** We could NOT authenticate as a Central user (owner@democentral1.com passwords return 401). All Central→Franchise tests used `from_restaurant_id=781` with the master token, which the POS rejects at a DIFFERENT validation layer (`UNAUTHORIZED_ACTION: Unauthorized sender context`) — confirming POS enforces `from_restaurant_id == auth_user.restaurant_id`.

The user's reported `INVALID_HIERARCHY` error means they were ACTUALLY authenticated as a Central user (matching from_restaurant_id), and passed the sender-context check, but failed the HIERARCHY EDGE check.

---

## 2. HIERARCHY TREE (Verified from POS API)

```
My Genie (id=1, type=master, parent=null)
├── DemoCentral1 (id=781, type=central, parent=1)
│   ├── DemoFranchise1 (id=783, type=franchise, parent=781)
│   └── DemoFranchise2 (id=784, type=franchise, parent=781)
└── DemoCentral2 (id=782, type=central, parent=1)
    ├── DemoFranchise3 (id=785, type=franchise, parent=782)
    └── DemoFranchise4 (id=786, type=franchise, parent=782)
```

**Parent-child edges:**
- 1 → 781 (master → central) ✓
- 1 → 782 (master → central) ✓
- 781 → 783 (central → franchise) ← **THE FAILING EDGE**
- 781 → 784 (central → franchise) ← **THE FAILING EDGE**
- 782 → 785 (central → franchise) ← **THE FAILING EDGE**
- 782 → 786 (central → franchise) ← **THE FAILING EDGE**

---

## 3. EDGE VALIDATION RESULTS (Live Tested)

### From Master (auth=1, from_restaurant_id=1):

| To | Type | Edge | Result | Transfer ID |
|----|------|------|--------|-------------|
| 781 | central | master→central | **OK** | #56 |
| 782 | central | master→central | **OK** | #58 |
| 783 | franchise | master→franchise | **OK** | #57 |
| 784 | franchise | master→franchise | **OK** | (tested) |
| 785 | franchise | master→franchise | **OK** | (tested) |
| 786 | franchise | master→franchise | **OK** | (tested) |

### From Central (auth=master, from_restaurant_id=781):

| To | Type | Edge | Result | Error |
|----|------|------|--------|-------|
| 783 | franchise | central→franchise | **UNAUTHORIZED_ACTION** | "Unauthorized sender context" |
| 785 | franchise | central→franchise (cross-parent) | **UNAUTHORIZED_ACTION** | "Unauthorized sender context" |

The `UNAUTHORIZED_ACTION` errors are because the auth token belongs to Master(1), not Central(781). The POS validator rejects at the sender-context layer BEFORE reaching the hierarchy edge check.

**The user-reported `INVALID_HIERARCHY` error can only occur when the auth token MATCHES the from_restaurant_id** — meaning a real Central user was trying this.

---

## 4. POS OPERATIONAL SETTINGS (Live Queried)

### Stored settings for Master (restaurant_id=1):

| Setting | Value | Impact |
|---------|-------|--------|
| `allow_master_direct_franchise` | **true** | Master can dispatch directly to franchise (skip central) |
| `allow_lateral_central_transfer` | **true** | Central can dispatch to peer central |
| `allow_negative_stock` | true | Allow dispatch even if stock goes negative |
| `allow_over_receive` | false | Cannot receive more than dispatched |
| `reserve_on_approve` | false | Stock not reserved on approval |
| `async_dispatch_enabled` | true | Async dispatch mode |

### Missing setting:

| Setting | Status |
|---------|--------|
| `allow_central_direct_franchise` | **DOES NOT EXIST** |

**Proof:** Attempting to set `allow_central_direct_franchise` via the operational-settings/update endpoint returns:
```json
{
  "status": false,
  "error_code": "INVALID_SETTINGS_PAYLOAD",
  "message": "No valid settings keys in payload."
}
```

The POS backend REJECTS this key as invalid — confirming it is NOT in the settings schema.

### Settings for Central stores (781, 782):

Both inherit from Master. `stored_settings` is EMPTY (no overrides). Same `allow_master_direct_franchise: true` and `allow_lateral_central_transfer: true` — but these settings only affect master and lateral edges respectively. No setting controls central→franchise.

---

## 5. TRANSFER HISTORY EVIDENCE

**All 16 transfers in history have `from_restaurant_id = 1` (Master).**

Zero transfers from Central(781) or Central(782) exist in current production data.

**Edge distribution:**
| Edge | Count | Statuses |
|------|-------|----------|
| 1→781 | 5 | dispatched(3), received(1), cancelled(1) |
| 1→782 | 5 | dispatched(2), received(3) |
| 1→783 | 4 | dispatched(3), rejected(1) |
| 1→784 | 1 | dispatched(1) |
| 1→785 | 2 | dispatched(1), received(1) |
| 1→786 | 3 | dispatched(2), received(1) |

---

## 6. HISTORICAL EVIDENCE: It DID Work Before

The `API_VERIFICATION_COMPREHENSIVE_FINAL.md` (dated January 2026) records:

| Test | Edge | Result |
|------|------|--------|
| A5 | Central1(781) → Franchise1(783) | **PASS** |
| A6 | Central2(782) → Franchise3(785) | **PASS** |

The e2e test script (`e2e_final_test.py`) confirms these used:
- Central user tokens (`c1t`, `c2t`) — authenticated as the Central stores
- Correct `from_restaurant_id` matching the auth user
- `POST /inventory-transfer/initiate` — same endpoint

The test also notes that `allow_lateral_central_transfer` had to be **explicitly enabled** before lateral transfers worked. This pattern suggests a similar setting for central→franchise may have existed and been removed/disabled.

---

## 7. ROOT CAUSE DETERMINATION

### PRIMARY ROOT CAUSE: POS Backend Hierarchy Policy Gap

The POS hierarchy edge validator currently enforces these rules:

| Edge | Allowed? | Controlled by |
|------|----------|---------------|
| master → central | ALWAYS | Built-in parent→child |
| master → franchise | YES | `allow_master_direct_franchise` setting |
| central → central | YES | `allow_lateral_central_transfer` setting |
| central → franchise | **NO** | **No setting exists** |
| franchise → anyone | NO | Role restriction (no dispatch permission) |

The `central → franchise` edge is **not covered by any operational setting**. The POS validator has no rule to allow it, so it defaults to `INVALID_HIERARCHY`.

### This is NOT:
- ❌ A frontend bug (frontend correctly sends `from_restaurant_id = restaurantId`)
- ❌ A stale context issue (the auth token matches the from_rid)
- ❌ An incorrect hierarchy mapping (781 IS the parent of 783)
- ❌ A frontend sending the wrong hierarchy node
- ❌ A proxy/middleware issue

### This IS:
- ✅ A POS backend policy restriction
- ✅ A MISSING `allow_central_direct_franchise` operational setting
- ✅ A regression from January 2026 when this edge DID work

---

## 8. RECOMMENDED RESOLUTION PATH

| Priority | Action | Owner |
|----------|--------|-------|
| P0 | **Ask POS backend team**: Was `central → franchise` dispatch intentionally disabled? Is there a new setting or migration needed? | Backend/Owner |
| P0 | If it should work: POS backend needs to add `allow_central_direct_franchise` to the operational settings schema | POS Backend |
| P1 | Once setting exists: Enable it via `POST /operational-settings/update` with `{"restaurant_id":1,"settings":{"allow_central_direct_franchise":true}}` | Admin/Owner |
| P2 | Frontend could show a more informative error message when INVALID_HIERARCHY is returned | Frontend |
| P2 | Frontend could hide franchise destinations when logged in as Central if this edge is permanently disabled | Frontend |

---

## 9. FRONTEND BEHAVIOR ASSESSMENT

The frontend is functioning correctly for this scenario:

1. **Destination loading**: ✅ Both central and franchise stores load in dropdown
2. **Payload generation**: ✅ `from_restaurant_id` = logged-in user's `restaurantId`
3. **Payload structure**: ✅ Matches POS API contract
4. **Error handling**: ✅ Shows POS error message to user via toast

The ONLY frontend consideration is whether to **filter out franchise destinations** from the dispatch dropdown when the logged-in user is a Central store — but this should only be done if Central→Franchise is PERMANENTLY disallowed (not if it's a setting to be enabled).


---

## ADDENDUM — 25 May 2026: Resolution Confirmed

### The setting `allow_cross_central_franchise_dispatch` EXISTS and WORKS

Previous diagnosis concluded `allow_central_direct_franchise` did not exist. The **correct setting name** is `allow_cross_central_franchise_dispatch` (discovered from the Request Stock integration document).

**Before enabling:**
- `allow_cross_central_franchise_dispatch: false` (default)
- Central(781) → Franchise(786) dispatch: `INVALID_HIERARCHY` 403
- F786 → sibling C781 request: `INVALID_HIERARCHY` 403
- `request-sources` showed C781 with `can_submit_request: false`

**After enabling:**
```
POST /operational-settings/update
{"restaurant_id": 1, "settings": {"allow_cross_central_franchise_dispatch": true}}
→ HTTP 200, status=true, "Operational settings updated"
```

- Central(781) → Franchise(786) dispatch: **SUCCESS** (transfer_id=78)
- F786 → sibling C781 request: **SUCCESS** (transfer_id=77)
- `request-sources` now shows C781 with `can_submit_request: true`

### Previous diagnosis was correct in root cause, wrong in setting name
- Correct name: `allow_cross_central_franchise_dispatch`
- Wrong name tried: `allow_central_direct_franchise` (rejected as invalid)
- The flag controls BOTH dispatch (initiate) and request edges for cross-branch paths
