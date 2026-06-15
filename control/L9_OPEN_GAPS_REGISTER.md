# L9 — Open Gaps Register

> **Updated:** 2026-06-14 (G-023 CLOSED — backend added push_summary + missing child_existing keys)

---

## Backend Dependencies (Cannot Be Fixed in Frontend)

| # | Gap | Blocked Feature | Priority | Status |
|---|-----|-----------------|:--------:|--------|
| G-001 | No stock adjustment history API | Traceability | P2 | OPEN |
| G-002 | No before/after qty in transfer API | Ledger display | P2 | OPEN |
| G-003 | No user name resolution API | Actor display | P3 | OPEN |
| G-004 | History API missing restaurant_type | Store badges | P3 | OPEN |
| G-005 | Dedicated stock ledger API | N+1 calls | P2 | OPEN |
| G-006 | Stock return flow API | Return feature | P1 | OPEN |
| G-009 | Partial dispatch | Dispatch subset | P1 | **CLOSED** — works via `approval_lines` |
| G-010 | Soft stock reservation on approval | Reservation | P1 | **CLOSED** — `reserve_on_approve` setting |
| G-011 | WebSocket infrastructure | Real-time events | P2 | OPEN |
| G-012 | request-catalog missing category | Category grouping | P1 | **CLOSED** — `category_id` + `category_name` in response |
| G-013 | No PO number in transfer API | All screens | P0 | **CLOSED** — `reference_code` field. Frontend wired. |
| **G-014** | **Invoice OCR/AI extraction** | **PO Receive Upload tab** | **P1** | **OPEN — UI shows "Coming Soon"** |
| **G-015** | **Excel/CSV parsing** | **Procurement Excel import** | **P2** | **OPEN — Upload zone ready** |
| G-016 | Invoice number storage | Duplicate detection | P2 | OPEN |
| G-017 | Vendor purchase history API | Vendor + Raw Material intelligence | P2 | **CLOSED** — `vendor-item-list` API confirmed working (75 records, 2026-06-14). Used in CR-030 Vendor Management + Raw Material Master + PO Create. |
| G-018 | Production run list/history API | Production History | P0 | **CLOSED** — `GET /inventory/production-run` confirmed |
| G-019 | Segment `unit_cost` | Cost estimation | P1 | **CLOSED** — `unit_cost` in segments[] confirmed |
| **G-020** | **Custom unit conversion** | **Mixed-unit display** | **P1** | **OPEN — POS backend required** |
| G-021 | Purchase Order Module | PO lifecycle | P0 | **CLOSED** — All 10 PO endpoints validated (32/32 checks, 2026-06-14). Contract: `AI/Plans/phase3/P35_purchase_order_api_contract.md`. Frontend implemented in CR-030. |
| G-022 | Aggregated stock with segments/consumption | Expanded stock detail | P1 | **NOT NEEDED** — API supports `include_segments` + `include_consumption` params (confirmed 2026-06-14). Response ~29s — used basic call for page load, purchase data for estimates. |
| **G-023** | **Push-form API missing ingredients/sub_recipes/recipes in child_existing** | **Accurate push status on Store Management** | **P1** | **CLOSED — Backend added `ingredient_names`, `sub_recipe_names`, `recipe_names` to `child_existing` AND `push_summary` object (Option C). Verified 2026-06-14.** |

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
| PO Receive | Upload Invoice tab | G-014 (backend OCR) |
| Procurement | Excel import | G-015 (backend parsing) |
