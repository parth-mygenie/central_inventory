# L9 — Open Gaps Register

> **Updated:** 2026-07-11 (Synced with `AI/openGaps/gap_validation.md` retest of 2026-07-07 — backend resolved 22 gaps; frontend adoption registered as CR-037→044)

---

## Backend Dependencies (Cannot Be Fixed in Frontend)

| # | Gap | Blocked Feature | Priority | Status |
|---|-----|-----------------|:--------:|--------|
| G-001 | No stock adjustment history API | Traceability | P2 | **DISCARDED** (owner, per gap_validation) |
| G-002 | No before/after qty in transfer API | Ledger display | P2 | **BACKEND CLOSED** — `qty_before/qty_after` on post-deploy transfers. Frontend: CR-037 |
| G-003 | No user name resolution API | Actor display | P3 | **BACKEND CLOSED** — `*_by_name` fields. Frontend: CR-037 |
| G-004 | History API missing restaurant_type | Store badges | P3 | **BACKEND CLOSED** — `from/to_restaurant_type/name`. Frontend: CR-037 |
| G-005 | Dedicated stock ledger API | N+1 calls | P2 | **BACKEND CLOSED** — `POST /inventory-transfer/stock-ledger` (4 source types, paginated). Frontend: CR-037 |
| G-006 | Stock return flow API | Return feature | P1 | **BACKEND CLOSED** — `return/eligible` + `return/initiate` + wastage-reasons CRUD. Frontend: CR-038 |
| G-009 | Partial dispatch | Dispatch subset | P1 | **CLOSED** — works via `approval_lines` |
| G-010 | Soft stock reservation on approval | Reservation | P1 | **CLOSED** — `reserve_on_approve` setting |
| G-011 | WebSocket infrastructure | Real-time events | P2 | OPEN |
| G-012 | request-catalog missing category | Category grouping | P1 | **CLOSED** — `category_id` + `category_name` in response |
| G-013 | No PO number in transfer API | All screens | P0 | **CLOSED** — `reference_code` field. Frontend wired. |
| **G-014** | **Invoice OCR/AI extraction** | **PO Receive Upload tab** | **P1** | **OPEN — UI shows "Coming Soon"** (aliased as G-024 in AI/openGaps docs) |
| **G-015** | **Excel/CSV parsing** | **Procurement Excel import** | **P2** | **BACKEND CLOSED** — `import-template` + `parse-import` live. Frontend: CR-039 (needs proxy multipart/binary passthrough — owner GO) |
| G-016 | Invoice number storage | Duplicate detection | P2 | **BACKEND CLOSED** — `check-invoice-number`. Frontend: CR-040 |
| G-017 | Vendor purchase history API | Vendor + Raw Material intelligence | P2 | **CLOSED** — `vendor-item-list` API confirmed working (75 records, 2026-06-14). Used in CR-030 Vendor Management + Raw Material Master + PO Create. |
| G-018 | Production run list/history API | Production History | P0 | **CLOSED** — `GET /inventory/production-run` confirmed |
| G-019 | Segment `unit_cost` | Cost estimation | P1 | **CLOSED** — `unit_cost` in segments[] confirmed |
| **G-020** | **Custom unit conversion** | **Mixed-unit display** | **P1** | **BACKEND CLOSED** — read+write live (`consumption_unit`, `converion_factor` [sic], `has_unit_conversion`, `purchase_unit`). Frontend: CR-042 |
| G-021 | Purchase Order Module | PO lifecycle | P0 | **CLOSED** — All 10 PO endpoints validated (32/32 checks, 2026-06-14). Contract: `AI/Plans/phase3/P35_purchase_order_api_contract.md`. Frontend implemented in CR-030. |
| G-022 | Aggregated stock with segments/consumption | Expanded stock detail | P1 | **NOT NEEDED** — API supports `include_segments` + `include_consumption` params (confirmed 2026-06-14). Response ~29s — used basic call for page load, purchase data for estimates. |
| **G-023** | **Push-form API missing ingredients/sub_recipes/recipes in child_existing** | **Accurate push status on Store Management** | **P1** | **CLOSED — Backend added `ingredient_names`, `sub_recipe_names`, `recipe_names` to `child_existing` AND `push_summary` object (Option C). Verified 2026-06-14.** |
| G-025 | items_count in transfer lists | List display | P2 | **CLOSED** — populated (verified 2026-07-07) |
| G-026 | parent_restaurant_id in hierarchy-summary | Hierarchy mapping | P2 | **CLOSED** — verified 2026-07-07 |
| G-027 | Master-controlled operational settings | Settings lockdown | P1 | **CLOSED** — `READONLY_HIERARCHY_SETTINGS` enforced |
| **G-028** | **Pushed hierarchy bundle write lock** | **Catalogue integrity on children** | **P1** | **BACKEND CLOSED** — `is_pushed_managed` + 403 `PUSHED_CATALOG_LOCKED` (qty paths exempt). Frontend: CR-043 |
| **G-029** | **Child catalogue/inventory edit policy** | **Parent control of child edits** | **P1** | **BACKEND CLOSED** — `franchise/catalog-policy/{id}` GET/POST + 403 `CHILD_CATALOG_POLICY_DENIED`. Frontend: CR-043 |
| **G-030** | **Manufactured recipe → auto sub-recipe** | **Batch-manufactured dishes** | **P2** | **BACKEND CLOSED** — single-call recipe+sub-recipe+FG item. Frontend: CR-044 |
| G-019 | Segment `unit_cost` (detail follow-up) | Batch valuation on Stock Detail | P2 | **BACKEND CLOSED** — `unit_cost` on segments verified 2026-07-07. Frontend: CR-041 |
| **G-031** | **Reverse push `stock_items` 500 + timeout** | **Default wizard flow + forward push** | **P1** | **BACKEND CLOSED** (rounds 1-4: skip→dedupe+sanitize, per-module commit, concurrency 409, N+1 speedup). **PROXY FIXED** — timeout 30→50s. Frontend: 409 handling + `not_seeded` status wired. |

## Implementation Gaps — Status After CR-030

| # | Item | Status | Notes |
|---|------|:------:|-------|
| IG-001 | Catalogue vendor column | DONE | |
| IG-002 | Consumption days-of-cover | DONE | CR-025 + CR-030 |
| IG-003 | Hierarchy push status | DONE | |
| IG-004 | Request low-stock suggestions | DONE | CR-025 |
| IG-005 | Dispatch destination health | DONE | CR-025 |
| IG-006 | Procurement 3-mode UI | DONE (PO gate) | AI/Excel blocked on G-014/G-015 |
| IG-007 | Product Has Recipe column | DONE | |
| IG-008 | Recipe Cost Mapped column | DONE | |
| IG-009 | Addon-Recipe Cost Mapped | DONE | |
| IG-010 | Hierarchy Summary health | DONE | |
| IG-011 | Store Detail health strip | DONE | |
| IG-012 | Vendor purchase intelligence | **DONE** | CR-030 — vendor-item-list powers 3 KPIs + chart + recent purchases |
| IG-013 | Raw Material vendor price comparison | **DONE** | CR-030 — horizontal bars per vendor |
| IG-014 | PO lifecycle management | **DONE** | CR-030 — 9 screens, full create/approve/send/receive/close |

## Performance — RESOLVED (CR-024)

| Metric | Before | After |
|--------|:------:|:-----:|
| Operations Hub → Queues → Detail → Hub | 71 API calls | 20 calls (72% reduction) |
| `stock-inventory` calls per session | 8x | 1x (cached 60s) |

## Remaining Preview Gaps (P2)

| Screen | Gap | Blocked By |
|--------|-----|-----------|
| DailyConsumptionReport | Trend column | Needs 2 consumption API calls |
| PO Receive | Upload Invoice tab | G-014 (backend OCR — still open) |
| Procurement | Excel import | ~~G-015~~ backend live → CR-039 (planned) |
