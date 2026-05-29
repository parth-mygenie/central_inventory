
---

## Addendum: P23 Hierarchy Management — API Investigation (29 May 2026)

> **Source:** Live POS API probing (preprod.mygenie.online) — 24 probes
> **Actors:** Master (rid=1), Central (rid=782), Franchise (rid=784)

### Endpoints Confirmed

| Endpoint | Method | Status |
|----------|--------|--------|
| `GET /franchise/list` | GET | **WORKING** |
| `GET /franchise/create` | GET | **WORKING** (form metadata) |
| `POST /franchise/create` | POST | **WORKING** |
| `GET /franchise/push-form/{id}` | GET | **WORKING** |
| `POST /franchise/push/{id}` | POST | **WORKING** |
| `POST /franchise/history` | POST | **WORKING** |

### Permission Matrix

| Endpoint | Master | Central | Franchise |
|----------|:------:|:-------:|:---------:|
| List children | YES | YES (own children) | FORBIDDEN |
| Create child | YES (central + franchise) | YES (franchise only) | FORBIDDEN (403) |
| Push form | YES (direct children) | YES (direct children) | FORBIDDEN (403) |
| Push execute | YES (direct children) | YES (direct children) | FORBIDDEN (403) |
| History | YES | YES | FORBIDDEN (403) |

### Key Behavioral Findings

1. **List default view**: Master sees ALL direct children (mixed types). `child_type` param filters.
2. **Child objects are massive**: ~150 fields per restaurant. Must normalize at API layer.
3. **Relationship values** change with filter: `hierarchy_children` (default), `master_to_central`, `central_to_franchise`.
4. **Create defaults**: Master → central, Central → franchise. GET query param for child_type is IGNORED.
5. **Push requires `push_food_bundle: true`**: Missing flag → 422 BUNDLE_ONLY_PUSH.
6. **Push only works for DIRECT children**: Non-direct → 404 "Child restaurant not found".
7. **Re-push is safe**: Second push to same child → updated counts (not duplicate inserted).
8. **History is per-entity-row**: Each log entry = one entity sync. Group by timestamp for session view.
9. **Pagination**: Standard `{current_page, last_page, per_page, total}` on list and history.

### Test Entities Created During Probing

| ID | Name | Type | Parent | Created By |
|----|------|------|--------|------------|
| 787 | TestCentral_P23_Probe | central | 1 (Master) | Probe C6 |
| 788 | TestFranchise_P23_Probe | franchise | 1 (Master) | Probe C7 |
| 789 | TestFranchise_P23_Central | franchise | 782 (Central) | Probe C8 |

### Implementation: ~11-14h (3 phases)

Phase 1: Hierarchy list + create dialog (~5-6h) — **DONE**
Phase 2: Bundle push wizard + results viewer (~4-5h) — **DONE**
Phase 3: Push history table + pagination (~2-3h) — **DONE**

### Implementation Status (29 May 2026)
- All 3 phases implemented in single pass
- 12/12 frontend tests passed (100%)
- Files: HierarchyManagement.jsx, useHierarchyManagement.js, api.js, screenVisibility.js, Sidebar.jsx, App.js
- Sidebar "Store Management" added with GitBranch icon (hidden for franchise)
- Route: /hierarchy/manage
- Master can push to nested franchises (via hierarchy-summary tree discovery)
