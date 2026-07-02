
---

## Addendum: P21 Catalogue Phase — API Investigation (27 May 2026)

> **Source:** Live POS API probing (preprod.mygenie.online) — 30 probes
> **Actors tested:** Master (rid=1), Central C782, Franchise F786
> **Curl evidence:** `AI/curls/p21_catalogue_curls.sh`
> **Full planning:** `AI/Plans/phase3/P21_catalogue_planning.md`

### Endpoint Status Summary

| Group | Total Endpoints | Working | Blocked (404) |
|-------|:-:|:-:|:-:|
| Inventory Catalogue | 7 | **7** | 0 |
| Product Catalogue | 6 | **6** | 0 |
| Recipe Catalogue | 6 | 0 | **6** |
| Sub-recipe Catalogue | 3 | 0 | **3** |
| Addon-recipe Catalogue | 6 | **6** | 0 |
| **Total** | **28** | **19** | **9** |

### CRITICAL: Recipe + Sub-Recipe Routes NOT REGISTERED

All 9 recipe/sub-recipe endpoints return `404 NotFoundHttpException`. Laravel routing exception confirms routes are not registered in the vendoremployee V2 route group on current preprod build.

**Blocked endpoints:**
- `GET /product/recipes` → 404
- `GET /product/get-recipe` → 404
- `GET /product/recipe/{id}` → 404
- `POST /product/store-recipe` → 404
- `PUT /product/update-recipe/{id}` → 404 (assumed)
- `DELETE /product/delete-recipe/{id}` → 404 (assumed)
- `GET /product/sub-recipes` → 404
- `POST /product/store-sub-recipe` → 404
- `PUT /product/update-sub-recipe/{id}` → 404 (assumed)

### Response Shape Inconsistencies

| Group | Wrapper | Extract Pattern |
|-------|---------|----------------|
| Stock categories | `{success, data: [...]}` | `resp.data.data` |
| Foods | `{foods: [...]}` | `resp.data.foods` |
| Food categories | Raw array `[...]` | `resp.data` |
| Addons | `{addons: [...]}` | `resp.data.addons` |
| Addon-recipes | `{recipes: [...]}` | `resp.data.recipes` |

Validation errors also inconsistent: foods use `{errors: [{code, message}]}` (array), others use `{errors: {field: [messages]}}` (object).

### Role-Based Access

All roles (master/central/franchise) can READ all catalogue endpoints (200 OK). No backend role guard. UI visibility is frontend-only gate.

### Implementation Phases

| Phase | Scope | Status | Effort |
|-------|-------|--------|--------|
| 1: Inventory Catalogue | Category CRUD + ingredient management | **READY** | 5-6h |
| 2: Product Catalogue | Food CRUD + categories + addons | **READY** | 5-6h |
| 3: Recipe/Sub-recipe | Recipe CRUD + ingredient composition | **BLOCKED** (404) | deferred |
| 4: Addon-recipe | Addon-recipe CRUD + orphan detection | **READY** | 4-5h |

### Recommended Order: Phase 1 → Phase 4 → Phase 2

Phase 4 (addon-recipes) has the cleanest API contract and links to inventory ingredients. Phase 2 (foods) has complex payload (35+ fields) — MVP should cover core fields only.
