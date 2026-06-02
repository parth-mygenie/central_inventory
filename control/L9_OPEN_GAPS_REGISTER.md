# L9 — Open Gaps Register

> **Updated:** 2026-06-02 (Post CR-023/024/025)

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
| **G-017** | **Vendor purchase history API** | **VendorManagement intelligence** | **P2** | **OPEN — No workaround** |

## Implementation Gaps — Status After CR-023/024/025

| # | Item | Status | Notes |
|---|------|:------:|-------|
| IG-001 | Catalogue vendor column | DONE | |
| IG-002 | Consumption days-of-cover | DONE | CR-025 consumption-based coverage |
| IG-003 | Hierarchy push status | DONE | CR-023 Batch 6 |
| IG-004 | Request low-stock suggestions | **DONE** | CR-025 Intelligent PO replaces basic banner |
| IG-005 | Dispatch destination health | **DONE** | CR-025 integrated dispatch table |
| IG-006 | Procurement 3-mode UI | DONE | AI/Excel blocked on G-014/G-015 |
| IG-007 | Product Has Recipe column | DONE | CR-023 Batch 6 |
| IG-008 | Recipe Cost Mapped column | DONE | CR-023 Batch 6 |
| IG-009 | Addon-Recipe Cost Mapped | DONE | CR-023 Batch 6 |
| IG-010 | Hierarchy Summary health | DONE | CR-023 Batch 5 |
| IG-011 | Store Detail health strip | DONE | |

## Performance — RESOLVED (CR-024)

| Metric | Before | After |
|--------|:------:|:-----:|
| Operations Hub → Queues → Detail → Hub | 71 API calls | 20 calls (72% reduction) |
| `stock-inventory` calls per session | 8x | 1x (cached 60s) |
| Back-navigation to Hub | 22 new calls | 2 calls (from cache) |

## Remaining Preview Gaps (P2)

| Screen | Gap | Blocked By |
|--------|-----|-----------|
| DailyConsumptionReport | Trend column (compare current vs previous period) | Needs 2 consumption API calls |
| ProductCatalogue | "Has Recipe" computed column | Cross-ref recipe data |
| VendorManagement | Purchase history intelligence | G-017 (backend) |
