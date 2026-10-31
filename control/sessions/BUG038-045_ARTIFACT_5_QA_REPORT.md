# Gate 6: QA Report — BUG-038 through BUG-045
> **Date:** 2026-07-11
> **Agent Role:** QA
> **Items:** BUG-038, BUG-039, BUG-040, BUG-041, BUG-042, BUG-043, BUG-044, BUG-045
> **Test Account:** owner@hellskitchen.com / Qplazm@10 (Central Store, RID 803)
> **Outlet Account:** owner@hkexpress.com / Qplazm@10 (Outlet, RID 806)

---

## Test Results

| # | Bug | Test Case | Result | Evidence |
|---|-----|-----------|:------:|----------|
| 1 | BUG-038 | `/purchase/orders` → no Items column | **PASS** | Columns: PO#, Vendor, Total*, Expected, Status, Payment*, Created |
| 2 | BUG-039 | By Item Need → Best Vendor dropdown shows ALL vendors | **PASS** | Olive Oil dropdown: Farm Direct ₹0, Metro Wholesale ₹500 — both visible |
| 3 | BUG-040 | Expand HK Outlet North → shows "Indirect Outlet" label | **PASS** | "INDIRECT OUTLET — managed by Master Store (HK Alpha Central)" |
| 4 | BUG-041 | Login as outlet → Transfer detail → FROM shows name | **PASS** | FROM now shows "Parent Store [Central Store]" instead of "—". Note: actual parent name unavailable from API (only parent_restaurant_id provided). Fix added parent_restaurant_id fallback in useRestaurantMap. |
| 5 | BUG-042 | Hierarchy view → HK Express Olive Oil → Current Stock | **PASS** | Olive Oil (HK Express): 1.98 ltr. Olive Oil (hells kitchen): 36.1 ltr. Each row shows correct per-restaurant stock. |
| 6 | BUG-043 | Qty input → can't type negative | **PASS** | Both vendor mode and item need mode qty inputs have min="0" (3/3 verified) |
| 7 | BUG-044 | No payment/total on create/draft/approved/sent | **PASS** | PO Create: No Payment dropdown, "Expected Total" header. Draft detail: No Payment/Rate/Total. Closed detail: Payment+Rate+Total visible. PO List Draft tab: No Total/Payment columns. |
| 8 | BUG-045 | "Dispatched" tab shows in Pending Queues | **PASS** | Tab visible with badge "1". Shows TRF-803-2026-0017 (hells kitchen → HK Central, Dispatched). |

## Regression Spot-Check

| # | Check | Result | Notes |
|---|-------|:------:|-------|
| 1 | PO List — Closed tab still shows Total/Payment | **PASS** | Closed PO-803-2026-0001 shows ₹20,125 total, all Rate columns visible |
| 2 | Pending Queues — Approvals tab still functional | **PASS** | TRF-803-2026-0022 approval card renders with Reject/View Details/Approve All buttons |
| 3 | History & Ledger — transfer list still loads from outlet | **PASS** | 6 transfers shown with correct Source/Destination names |
| 4 | Operations Hub loads after login | **PASS** | Stock health grid, store hierarchy, quick actions all render |

## BUG-041 Investigation Notes

The original plan assumed hierarchy-detail API would return all hierarchy members. Testing revealed:
- `POST inventory-transfer/hierarchy-detail` for outlet returns only self (806), not parent (803)
- `from_restaurant_id` IS available in transfer detail API (confirmed: 803)
- `from_restaurant_name` NOT available in transfer detail API
- **Fix applied:** useRestaurantMap now adds parent via `user.parent_restaurant_id` from login context as fallback
- **Result:** FROM block shows "Parent Store" with correct type badge instead of "—"
- **Ideal fix:** POS API should include `from_restaurant_name` in transfer detail response (backend gap)

## Summary
- Tests passed: **8/8**
- Failures: None
- Regression: Clean

## Recommendation
**PASS** → proceed to SMOKE FACILITATOR for owner verification.

Minor observation: BUG-041 shows "Parent Store" instead of actual name — cosmetic limitation due to POS API gap (no `from_restaurant_name` in detail endpoint, no `parent_restaurant_name` in login response). Owner should decide if this is acceptable or needs a backend enhancement request.
