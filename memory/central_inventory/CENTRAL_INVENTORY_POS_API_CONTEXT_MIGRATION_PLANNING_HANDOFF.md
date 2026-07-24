# Central Inventory POS API Context Migration Planning Handoff

> **Date:** 24 May 2026
> **From:** Senior Central Inventory POS API Context Migration Planning Agent
> **To:** Backend/Proxy POS Context Adapter Implementation Agent

---

## 1. Migration Plan Path

`/app/memory/central_inventory/CENTRAL_INVENTORY_POS_API_CONTEXT_MIGRATION_PLAN.md`

---

## 2. Owner Decision

No more seed-data dependency for real Central Inventory context. Connect to POS API.

---

## 3. Target Architecture

```
Login → POS API (token) → POS API V1 profile (restaurant context) → proxy normalizes → frontend
```

**Key endpoint discovered:**
`GET /api/v1/vendoremployee/profile` returns `restaurants[]` array containing:
- `id` (restaurant_id)
- `name` (restaurant_name)
- `restaurant_type_flag` (master/central/franchise)
- `parent_restaurant_id` (hierarchy parent)

**Verified for ALL 4 user types with runtime API probes.**

---

## 4. Required POS API Fields (All Available)

| Field | POS Endpoint | Location | Status |
|---|---|---|---|
| restaurant_id | V1 profile | `restaurants[0].id` | AVAILABLE |
| restaurant_name | V1 profile | `restaurants[0].name` | AVAILABLE |
| restaurant_type_flag | V1 profile | `restaurants[0].restaurant_type_flag` | AVAILABLE |
| parent_restaurant_id | V1 profile | `restaurants[0].parent_restaurant_id` | AVAILABLE |
| hierarchy children | V2 franchise/list | `data.children[]` | AVAILABLE |

**No POS API contract changes needed.**

---

## 5. Open Blockers

| Blocker | Phase Affected | Owner Action Required |
|---|---|---|
| POS `unit_id` migration not run | Phase 3 (hierarchy-detail) | Run `php artisan migrate` on preprod |
| POS `pendingQueues` method missing | Phase 3 (pending-queues) | Deploy latest controller code |

**Phase 1 (login context) has ZERO blockers.**

---

## 6. Recommended Phases

| Phase | Scope | Blocked? | Files |
|---|---|---|---|
| **Phase 1** | Login context from POS API profile | **NO** | `server.py` only |
| Phase 2 | Data endpoints from POS API | No | `server.py` |
| Phase 3 | Full seed removal | Yes (POS backend) | `server.py`, `seed_data.py` |
| Phase 4 | Demo/dev seed gating | No | `server.py`, `.env` |
| Phase 5-7 | QA, regression, docs | No | Multiple |

---

## 7. Implementation Details for Phase 1

### What to change in `server.py`:

1. **After login succeeds** (line 80: token extracted):
   - Call `GET {PREPROD_V1}/vendoremployee/profile` with `Authorization: Bearer {token}`
   - Extract `restaurants[0]` from response
   - Set `data["restaurant_type_flag"] = restaurants[0]["restaurant_type_flag"]`
   - Set `data["restaurant_id"] = restaurants[0]["id"]`
   - Set `data["restaurant_name"] = restaurants[0]["name"]`

2. **Token→restaurant_id storage:**
   - Store in MongoDB collection `token_sessions` instead of `_token_restaurant_map`
   - Schema: `{token: str, restaurant_id: int, created_at: datetime}`

3. **Actor resolution (`_get_actor_restaurant`):**
   - Read from MongoDB `token_sessions` collection
   - If not found: return 401 (not default=1)

4. **Seed fallback (optional):**
   - Add `SEED_FALLBACK_ENABLED` env flag
   - If `true` and profile call fails: fall back to `EMAIL_RESTAURANT_MAP`
   - If `false` (default): no seed fallback

### What NOT to change:

- Frontend files (no changes needed)
- `seed_data.py` (keep as-is; gated by env flag)
- Other proxy endpoints (Phase 2)
- Terminology mapping
- Screen visibility matrix

---

## 8. Recommended Next Agent

### `Backend/Proxy POS Context Adapter Implementation Agent`

---

*End of Planning Handoff*
