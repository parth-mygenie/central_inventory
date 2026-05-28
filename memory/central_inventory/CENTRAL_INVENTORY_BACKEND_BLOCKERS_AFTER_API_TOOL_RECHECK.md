# Central Inventory Backend Blockers After API Tool Recheck

> **Date:** 22 May 2026
> **Agent:** Senior Central Inventory Blocker Reconciliation Agent
> **Source Evidence:** `API_VERIFICATION_COMPREHENSIVE_FINAL.md` (52/52 PASS)

---

## 1. Status

### `partial_backend_blockers_remaining`

The vast majority of backend blockers are resolved. 3 LOW-priority items and 1 MEDIUM-priority enhancement remain. None block Slice 3 or Slice 4 implementation — all have owner-approved frontend fallbacks.

---

## 2. API Tool Report Reviewed

| # | Report | Path | Date |
|---|--------|------|------|
| 1 | API Verification Report (Initial) | `/app/memory/central_inventory/api_evidence/API_VERIFICATION_REPORT.md` | January 2026 |
| 2 | API Verification Update 2 | `/app/memory/central_inventory/api_evidence/API_VERIFICATION_UPDATE_2.md` | January 2026 |
| 3 | **API Verification Comprehensive Final** | `/app/memory/central_inventory/api_evidence/API_VERIFICATION_COMPREHENSIVE_FINAL.md` | January 2026 (latest) |
| 4 | E2E Final Test Script | `/app/memory/central_inventory/api_evidence/e2e_final_test.py` | January 2026 |

---

## 3. Remaining Backend Blockers

### BLK-R-001: No Dedicated Stock Ledger API

| Field | Value |
|-------|-------|
| **Blocker ID** | BLK-R-001 |
| **Workflow affected** | Stock Ledger display (WF-019) |
| **API endpoint/method** | No dedicated endpoint exists. Currently derived from transfer data. |
| **Expected field/value** | Dedicated `POST /inventory-transfer/stock-ledger` or similar with: `store_id`, `item`, `movement_type`, `direction`, `quantity`, `unit`, `before_qty`, `after_qty`, `reference_type`, `reference_id`, `timestamp`, `actor` |
| **Actual field/value from tool report** | No such endpoint tested in any report. Transfer history and hierarchy-detail provide partial data. |
| **Missing key/value** | Entire endpoint: item-level movement history with before/after balance tracking |
| **Error observed** | N/A — endpoint does not exist |
| **Business impact** | Cannot show granular item-level stock movement history from a single API call. Must derive from transfer events. |
| **Frontend impact** | LOW — Slice 3 derives ledger from transfers per owner approval (Q-S3-001: A). Works for demo/development. |
| **Required backend fix** | Create dedicated stock ledger API endpoint that returns item-level movements with before/after quantities |
| **Priority** | **P2** — Frontend has approved workaround. Real API improves accuracy. |
| **Frontend can proceed with fallback?** | **YES** — derive from transfers |

---

### BLK-R-002: No Before/After Quantity Fields in API Responses

| Field | Value |
|-------|-------|
| **Blocker ID** | BLK-R-002 |
| **Workflow affected** | Stock Ledger before/after balance columns |
| **API endpoint/method** | All transfer and stock-related endpoints |
| **Expected field/value** | `before_qty` and `after_qty` per movement/transfer event |
| **Actual field/value from tool report** | Not present in any API response documented in E2E report. Transfer details show `quantity` per line but not running balance. |
| **Missing key/value** | `before_qty`, `after_qty` fields |
| **Error observed** | N/A — fields simply not present |
| **Business impact** | Cannot reconstruct exact stock balance at any historical point in time. Audit trail incomplete for balance verification. |
| **Frontend impact** | LOW — Show "—" per owner approval (Q-S3-010: A). No frontend calculation. |
| **Required backend fix** | Add `before_qty` and `after_qty` to transfer event records and/or dedicated ledger API |
| **Priority** | **P2** — Enterprise audit requirement (LED-001: A — owner confirmed). Not blocking current implementation. |
| **Frontend can proceed with fallback?** | **YES** — show "—" fallback |

---

### BLK-R-003: No User Name Resolution API

| Field | Value |
|-------|-------|
| **Blocker ID** | BLK-R-003 |
| **Workflow affected** | Actor/user display in Transfer History and Stock Ledger |
| **API endpoint/method** | No user/employee lookup endpoint tested or documented |
| **Expected field/value** | `actor_name` or user lookup by `requested_by`, `approved_by`, `dispatched_by`, `received_by` IDs |
| **Actual field/value from tool report** | Only numeric IDs (e.g., `requested_by: 4520`, `approved_by: 4062`) in seed data. E2E test does not test user name resolution. |
| **Missing key/value** | User/employee name resolution for numeric actor IDs |
| **Error observed** | N/A — no API exists for this |
| **Business impact** | Cannot show "Approved by John Smith" — only "Approved by #4062". Less user-friendly for audit trail. |
| **Frontend impact** | LOW — Show name if available in data, numeric ID as fallback per owner approval (Q-S3-007: A). |
| **Required backend fix** | Provide user/employee name in transfer detail responses, or provide a bulk user lookup API |
| **Priority** | **P3** — Nice-to-have. Fallback is acceptable for current phase. |
| **Frontend can proceed with fallback?** | **YES** — show numeric ID fallback |

---

### BLK-R-004: Negative Stock May Exist in Production Data

| Field | Value |
|-------|-------|
| **Blocker ID** | BLK-R-004 |
| **Workflow affected** | Stock display accuracy, stock reports |
| **API endpoint/method** | `GET /inventory/get-inventory-master` |
| **Expected field/value** | Non-negative `cal_quantity` values |
| **Actual field/value from tool report** | Initial report noted `cal_quantity: -5000` for "Ginger Garlic Paste". Comprehensive Final report doesn't address legacy data but shows positive values for test items. |
| **Missing key/value** | Clean production data guarantee |
| **Error observed** | Negative stock values in legacy data (initial report) |
| **Business impact** | Stock reports may show nonsensical negative values. User confusion. |
| **Frontend impact** | LOW — Display as-is. Optionally flag negative values with visual indicator. |
| **Required backend fix** | Data cleanup: reconcile negative stock items. Add backend validation to prevent future negatives (for transfer operations — already confirmed via Q-XFER-004: A). |
| **Priority** | **P3** — Does not block any implementation. Visual flagging can mitigate. |
| **Frontend can proceed with fallback?** | **YES** — display with visual warning |

---

## 4. Resolved Backend Blockers

| # | Blocker | Evidence | Resolution |
|---|---------|----------|------------|
| 1 | **UNIT_CONVERSION_NOT_DEFINED** | 52/52 E2E PASS — all write APIs work with segment_id selectors | Unit table conversion metadata seeded/migrated. All transfer mutations operational. |
| 2 | **Missing `unit_id` column in `inventory_master`** | Section D: Hierarchy Detail PASS for 4 stores | Database migration applied. Column exists. |
| 3 | **Missing `pendingQueues` method** | Section D: Pending Queues PASS for 3 stores | Controller code deployed. Route registered. |
| 4 | **No test hierarchy (no children)** | Franchise Bundle Push completed 6/6 relationships | All 7 stores populated: 1 Master + 2 Centrals + 4 Franchises. |
| 5 | **No test stock data** | Section F: Stock verified across all 7 stores | Stock seeded via add-stock API with batch/expiry. |
| 6 | **Write API general blocker** | Sections A-C: 28/28 transfer write operations PASS | All lifecycle operations work: initiate, request, approve, dispatch, receive, partial receive, reject, cancel. |
| 7 | **Stock Adjustment decrease API** | Section E: "Decrease Adjustment PASS" | API exists and works with `segment_id` selector. |
| 8 | **Wastage API** | Section E: "Record Wastage PASS" + "Wastage Report PASS" | API exists with multi-restaurant scope. Uses `segment_id` selector. |
| 9 | **Return flow API** | Section E: "Return Initiate PASS" | Uses `lines` field (not `return_lines`). Correct `line_id` from details endpoint. |
| 10 | **Lateral transfer backend support** | Section E: "Lateral Transfer (C1→C2) PASS" | Works when `allow_lateral_central_transfer` operational setting is enabled. |
| 11 | **`bill_pdf` column missing (Inward Audit)** | Section E: "Inward Audit PASS" | Owner ran migration. Column exists. |
| 12 | **`filter_bucket` selector failures** | Key Fixes section: Changed to `segment_id` selector | `segment_id` is the correct/reliable mode. `filter_bucket` fails when stock has batch/expiry. |

---

## 5. Still Unclear / More Evidence Needed

| # | Item | What's Unclear | Evidence Needed | Impact |
|---|------|---------------|----------------|--------|
| 1 | **Negative stock prevalence** | Comprehensive Final shows clean test data, but doesn't address legacy production data with negative values | Query production DB for items with `cal_quantity < 0` and assess scope | LOW — visual flagging is sufficient |
| 2 | **User/employee name availability** | No evidence of user name in any API response | Test whether transfer details API returns actor names or just IDs | LOW — fallback to ID is acceptable |
| 3 | **Stock ledger backend roadmap** | No indication of whether backend team plans a dedicated ledger API | Confirm with backend team: is a `stock-ledger` endpoint planned? Timeline? | MEDIUM — affects data accuracy long-term |

---

## 6. Recommendation to Backend

### Priority Actions

| Priority | Action | Impact |
|----------|--------|--------|
| **P2** | Create dedicated stock ledger API endpoint with item-level movements, before/after quantities, actor info | Eliminates need for frontend derivation; enables accurate audit trail |
| **P2** | Add `before_qty` and `after_qty` fields to transfer event records | Enterprise audit compliance (owner confirmed LED-001: A) |
| **P3** | Include actor/employee name in transfer details response (or provide bulk user lookup) | Better UX in audit trail display |
| **P3** | Clean up negative stock values in production data | Data accuracy for reports |

### No Urgent Backend Work Required

All critical blockers are resolved. Frontend Slices 3 and 4 can proceed without any backend changes. The P2/P3 items above are enhancements that improve quality but do not block delivery.

---

*End of Backend Blockers After API Tool Recheck*
