# L9 — Open Gaps Register

> **Updated:** 2026-06-01 (Session closing)

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
| G-009 | Partial dispatch | Dispatch subset | P1 | OPEN |
| G-010 | Soft stock reservation on approval | Reservation | P1 | OPEN |
| G-011 | WebSocket infrastructure | Real-time events | P2 | OPEN |
| G-012 | request-catalog missing category | Category grouping | P1 | OPEN |
| **G-013** | **No PO number in transfer API** | **All screens** | **P0** | **OPEN — Frontend workaround: formatPO(id)** |
| **G-014** | **Invoice OCR/AI extraction** | **Procurement Upload Invoice tab** | **P1** | **OPEN — UI ready, shows "Coming Soon"** |
| **G-015** | **Excel/CSV parsing** | **Procurement Excel import** | **P2** | **OPEN — Upload zone ready, pending backend** |
| G-016 | Invoice number storage | Duplicate detection | P2 | OPEN |
| **G-017** | **Vendor purchase history API (last_purchase_date, avg_order_value, total_orders)** | **VendorManagement intelligence** | **P2** | **NEW — No workaround. Registered in CR-023** |

## Implementation Gaps — AUDIT REVISION (CR-023)

Previous agent marked IG-001 through IG-011 as "DONE". CR-023 audit found several were not actually
working due to API field mismatches. Corrected status below:

| # | Item | Previous | Actual Status |
|---|------|:--------:|:------:|
| IG-001 | Catalogue vendor column | DONE | DONE (confirmed) |
| IG-002 | Consumption days-of-cover | DONE | **NOT WORKING** — API lacks `days_of_cover` field. Fix in CR-023 Batch 4 (B9) |
| IG-003 | Hierarchy push status | DONE | **NOT WORKING** — API lacks push fields. Fix in CR-023 Batch 6 (B11) |
| IG-004 | Request low-stock suggestions | DONE | PARTIAL — basic banner present, full Intelligent PO missing |
| IG-005 | Dispatch destination health | DONE | PARTIAL — StoreHealthStrip present, auto-detect missing. Fix in CR-023 Batch 4 (C2) |
| IG-006 | Procurement 3-mode UI | DONE | DONE (AI/Excel blocked on G-014/G-015) |
| IG-007 | Product Has Recipe column | DONE | **NOT WORKING** — API lacks `has_recipe`. Fix in CR-023 Batch 6 (B6) |
| IG-008 | Recipe Cost Mapped column | DONE | **NOT WORKING** — API lacks `cost_mapped`. Fix in CR-023 Batch 6 (B7) |
| IG-009 | Addon-Recipe Cost Mapped | DONE | **NOT WORKING** — same as IG-008. Fix in CR-023 Batch 6 (B7) |
| IG-010 | Hierarchy Summary health | DONE | **NOT WORKING** — API lacks health fields. Fix in CR-023 Batch 5 (B5) |
| IG-011 | Store Detail health strip | DONE | DONE (confirmed) |

## Bugs Fixed

| # | Issue | Status |
|---|-------|:------:|
| BUG-016 | display_qty string arithmetic TypeError | FIXED |
