# INVESTIGATION REPORT — Reverse Push (Franchise → Master seed upward)

> **Role:** INVESTIGATION
> **Date:** 2026-02-15
> **Investigator:** Agent (INVESTIGATION role)
> **Scope:** Understand how reverse push works today; determine feasibility of frontend adoption.
> **Trigger:** Owner supplied API contract for `reverse-push-form/*` + `reverse-push/*` and asked how it works.

---

## TL;DR

**Backend not ready.** The four reverse-push endpoints described in the owner-supplied contract are **routed** on preprod but the Laravel controller methods are **missing** (`BadMethodCallException`). Frontend adoption is blocked until POS backend ships the controller implementation.

- **Root cause classification:** `Backend gap (API doesn't provide needed data)` — this is an L9 gap. Recommend registering as **G-031**.
- **Next step:** File backend brief for POS team → wait for controller implementation on `preprod.mygenie.online` → then hand to PLANNING for frontend adoption CR.
- **No code changes made** (INVESTIGATION role does not write code — R0/R7).

---

## 1. Setup

### Test hierarchy used

| Account | Email | Password | RID | API flag | UI label | Parent |
|---------|-------|----------|:---:|:--------:|----------|:------:|
| Franchise | `owner@kunafamahal.com` | `Qplazm@10` | **689** (Kunafa Mahal) | `franchise` | Outlet | 809 |
| Master | `owner@bholechature.com` | `Qplazm@10` | **809** (bhole chature) | `master` | Central Store | — |

Login endpoint: `POST /api/proxy/auth/login` → forwards to `PREPROD_V1/auth/vendoremployee/common-login`.
Response contract is **flat** (not wrapped in `data`): `{ token, restaurant_id, restaurant_type_flag, parent_restaurant_id, … }`.

### Proxy path used

All four reverse-push endpoints go through the generic FastAPI catch-all in `backend/server.py:165`:

```
/api/proxy/v2/{path} → https://preprod.mygenie.online/api/v2/vendoremployee/{path}
```

No backend code change is required — the proxy already forwards these paths.

---

## 2. Curl-Probe (Rule R9)

`BASE = https://repo-deploy-74.preview.emergentagent.com/api/proxy/v2/franchise`

### 2.1 GET `reverse-push-form/{parentId}` — franchise-initiated preview

```bash
curl -sS -X GET "$BASE/reverse-push-form/809" \
  -H "Authorization: Bearer <token_kunafa_689>" \
  -H "Accept: application/json"
```

**Actual response:**

```json
{
  "message": "Method App\\Http\\Controllers\\Api\\V2\\Vendoremployee\\FranchiseApiController::getReversePushForm does not exist.",
  "exception": "BadMethodCallException",
  "file": "/var/www/html/vendor/laravel/framework/src/Illuminate/Routing/Controller.php",
  "line": 68
}
```

**Expected (per owner-supplied contract):** `{ success:true, data:{ direction:"reverse", source:{…689}, target:{…809}, source_entities:{…}, target_existing:{…}, push_summary:{…} } }`

### 2.2 GET `reverse-push-form/from/{childId}` — master-initiated preview

```bash
curl -sS -X GET "$BASE/reverse-push-form/from/689" \
  -H "Authorization: Bearer <token_bhole_809>"
```

**Actual response:** `BadMethodCallException — FranchiseApiController::getReversePushFormFromChild does not exist.`

### 2.3 POST `reverse-push/{parentId}` — franchise-initiated execute

```bash
curl -sS -X POST "$BASE/reverse-push/809" \
  -H "Authorization: Bearer <token_kunafa_689>" \
  -H "Content-Type: application/json" \
  -d '{"push_food_bundle": true, "enforce_child_lock": false}'
```

**Actual response:** `BadMethodCallException — FranchiseApiController::reversePush does not exist.`

### 2.4 POST `reverse-push/from/{childId}` — master-initiated execute

```bash
curl -sS -X POST "$BASE/reverse-push/from/689" \
  -H "Authorization: Bearer <token_bhole_809>" \
  -H "Content-Type: application/json" \
  -d '{"push_food_bundle": true, "enforce_child_lock": false}'
```

**Actual response:** `BadMethodCallException — FranchiseApiController::reversePushFromChild does not exist.`

### 2.5 Control curl — forward push works today

```bash
curl -sS -X GET "$BASE/push-form/689" -H "Authorization: Bearer <token_bhole_809>"
```

**Actual response:** `{ success:true, message:"Push form data fetched successfully", data:{ parent:{…809 master}, child:{…689 franchise}, source_entities:{…}, child_existing:{…}, push_summary:{ status:"synced", total_source:13, total_child_matched:13, breakdown:{…} } } }`

**Conclusion:** Proxy layer + auth + route wiring on preprod are all fine. Only the reverse-push controller methods are missing.

---

## 3. Interpretation — What "the routes exist but methods do not" means

Laravel returned `BadMethodCallException` (from `Illuminate/Routing/Controller.php:68`), not `404 Not Found`. That confirms:

1. The route file **is** registered to point at `FranchiseApiController@getReversePushForm` (and siblings).
2. The controller **class** exists (otherwise the framework would fail earlier).
3. Only the individual **methods** are missing — someone wired the routes without shipping the method bodies.

This is exactly the pattern seen previously in **G-023** (push-form missing fields) — the POS team pushed a partial deploy. The fix must come from the POS backend team.

---

## 4. Data-Flow Trace — What the frontend adoption would look like once backend ships

### 4.1 Comparable existing flow (FORWARD push — WORKS TODAY)

```
UI (Central Store user in Store Management)
  └─ clicks "Push" on child row (689)
     └─ useHierarchyManagement.fetchPushForm(689)
        └─ api.getPushForm(689)              // frontend/src/services/api.js:928
           └─ GET /api/proxy/v2/franchise/push-form/689
              └─ FastAPI proxy → PREPROD /franchise/push-form/689
                 └─ Laravel FranchiseApiController::getPushForm
                    ← { data: { parent, child, source_entities, child_existing, push_summary } }
     ← setPushForm(...)
  └─ PushWizardDialog (HierarchyManagement.jsx:164) renders preview → user clicks Execute
     └─ useHierarchyManagement.executePush(689)
        └─ api.pushBundle(689)              // api.js:932
           └─ POST /api/proxy/v2/franchise/push/689  { push_food_bundle:true }
              ← results per module { inserted, updated, failed, warnings }
```

### 4.2 Expected REVERSE flow (once backend ships)

```
Case A — Franchise-initiated (source = self, target = parent)
  UI (Franchise user in Store Management / dedicated "Seed to Central" screen)
    └─ api.getReversePushForm(parentId)   // NEW
       └─ GET /api/proxy/v2/franchise/reverse-push-form/{parentId}
    └─ api.reversePush(parentId, { push_food_bundle:true, enforce_child_lock:false })
       └─ POST /api/proxy/v2/franchise/reverse-push/{parentId}

Case B — Master-initiated (source = specified child, target = self)
  UI (Master user in Store Management, selecting a child row → "Pull from this outlet")
    └─ api.getReversePushFormFromChild(childId)   // NEW
       └─ GET /api/proxy/v2/franchise/reverse-push-form/from/{childId}
    └─ api.reversePushFromChild(childId, { push_food_bundle:true, enforce_child_lock:false })
       └─ POST /api/proxy/v2/franchise/reverse-push/from/{childId}
```

Terminology mapping (CI-R1) for the wizard:

| API term (do NOT show) | UI term (show) |
|------------------------|----------------|
| `franchise` (source) | Outlet |
| `master` (target) | Central Store |
| `direction: "reverse"` | "Seed upward" / "Pull from outlet" |

### 4.3 Estimated frontend blast radius (for future PLANNING agent)

| Layer | File | Change |
|-------|------|--------|
| API | `frontend/src/services/api.js` (~line 928) | Add 4 methods: `getReversePushForm`, `reversePush`, `getReversePushFromChild`, `reversePushFromChild`. Wrap with `_cached()` for GET (short TTL) and add cache invalidation on POST (invalidate `/franchise/hierarchy*`, `/franchise/push-form/*`, and reverse form keys). |
| Hook | `frontend/src/hooks/useHierarchyManagement.js` | Add `reverseForm`, `reverseResults`, `reverseLoading`, `reverseError` state + `fetchReverseForm`, `executeReverse`, `resetReverse` callbacks. Mirror the shape of existing push state. |
| Wizard | `frontend/src/components/central-inventory/HierarchyManagement.jsx` (`PushWizardDialog` around line 164) | Either (a) parameterize the existing wizard with `direction: "forward" \| "reverse"`, or (b) add a sibling `ReversePushWizardDialog`. Reuse `TypeBadge`, `push_summary.status` chips, source/target rendering. |
| Entry | `frontend/src/components/central-inventory/StoreManagement.jsx` (~line 32) | Add CTA per persona: franchise users see "Seed to Central Store"; master users see "Pull from outlet" on each child row. Gate via `screenVisibility.js` (FROZEN — needs owner GO if a new visibility rule required). |
| Terminology | `frontend/src/lib/terminology.js` | **FROZEN** — do not touch. Only add copy in the wizard component itself. |
| Backend | `backend/server.py` | **NO CHANGE** — generic `/proxy/v2/{path}` already forwards these routes (verified §2). |

Estimated scope: **MEDIUM** (~4 files, mostly additive).

---

## 5. Owner-Facing Questions

1. **Business rules — who is allowed to initiate reverse push?**
   - Both franchise AND master? Or only one?
   - Should there be an approval step (like transfers) or is it a one-shot merge?
2. **Conflict resolution:** Contract says same-name entities become `updated` on a 2nd push (merge-by-name). Confirm this behaviour is desired at master level — a franchise mis-naming (e.g. "Chai" vs "Masala Chai") could overwrite the master.
3. **Payload defaults:** should the frontend always send `enforce_child_lock: false`? What's the intended UX for `true`?
4. **Visibility:** is reverse push exposed to every franchise, or only to a "legacy franchise seeding a new master" edge-case? This changes whether the CTA is discoverable or hidden behind a feature flag.
5. **Backend timeline:** does POS team have an ETA for shipping `FranchiseApiController::getReversePushForm` / `reversePush` / `getReversePushFormFromChild` / `reversePushFromChild`?

---

## 6. Recommendation

1. **Register open gap G-031** (backend controller methods missing) in `control/L9_OPEN_GAPS_REGISTER.md` and `control/registry.json`. Model after G-023.
2. **Create backend brief** `control/sessions/G031_REVERSE_PUSH_POS_REQUEST.md` — attach the owner-supplied contract as the expected response shape, cite curl evidence in §2 for the reproducibility proof.
3. **Do NOT plan frontend adoption yet.** Wait for owner to confirm §5 answers AND POS to ship the controller. Then hand to PLANNING for a new CR (call it CR-045 tentatively) with the blast-radius outline in §4.3.
4. **No code changes in this session** — INVESTIGATION role output is diagnostic only.

---

## 7. Evidence

- Raw responses saved locally during investigation: `/tmp/kunafa.json`, `/tmp/bhole.json`, `/tmp/rp_form_f.json`, `/tmp/rp_form_m.json`, `/tmp/fp_form.json`. (Ephemeral — copy to `memory/evidence/G-031/` when the gap is filed.)
- Forward push control curl §2.5 confirms proxy + tokens are correct.

---

## 8. Root-Cause Classification (per AGENT_PROMPT § ROLE 6 Step 3)

| Category | Verdict |
|----------|:-------:|
| Frontend bug | NO |
| **Backend gap (API doesn't provide needed data)** | **YES — file G-031** |
| Data issue | NO |
| API contract mismatch | Partial — contract exists on paper but controller unshipped |

---

## 9. Handover

Next agent should be **INTAKE** (to formally register G-031 in L9 + registry) once owner acknowledges this report. After that, wait on POS backend before invoking PLANNING for the frontend CR.
