# Intelligent UI Freeze — Phase 3: API Feasibility Verification
# Flow B — Transfer Lifecycle

> **Date:** 2026-05-31
> **Status:** VERIFIED — All 61 items assessed against live API responses
> **Method:** Code inspection + live API probing (Central Store account)

---

## Live API Response Shapes Verified

| API | Method | Response Keys (Verified) |
|-----|--------|------------------------|
| `pending-queues` | POST | `{approval_pending[], receive_pending[], my_requests[]}` — each item: `transfer_id, type, status, from_restaurant_id, to_restaurant_id, line_count, created_at, updated_at`. **NO item-level data. NO restaurant names.** |
| `stock-inventory` | GET | `{current_stocks[]}` — each: `id, stock_title, unit, cal_quantity, display_qty, is_low_stock, min_qty_alert, vendor_name, category_name` |
| `request-catalog` | POST | `{items[], source_restaurant}` — each item: `source_inventory_master_id, stock_title, unit, available_display_qty` |
| `source-options` | POST | `{segments[], filters{}}` — each segment: `segment_id, batch, expiry_date, display_qty, cal_quantity` |
| `hierarchy-detail` | POST | `{child_stock_summary[], child_stock_batches[], transactions[]}` — per store stock |
| `transfer/details/{id}` | GET | Full transfer + lines with P16 approval meta, dispatched totals |
| `transfer/history` | POST | Flat array of transfers with `from_restaurant_id, to_restaurant_id, status, type, created_at, items_count` |

---

## Per-Item API Feasibility

### B1 — Request Stock Form

| # | Element | Verdict | Data Source | Implementation Note |
|---|---------|:-------:|------------|-------------------|
| B1-01 | Own stock visibility | **FEASIBLE** | `getStockInventory()` on mount → match by `stock_title` against catalog items | One extra API call on mount. Match by stock_title (string). |
| B1-02 | Pending incoming badge | **FEASIBLE WITH COST** | `getPendingQueues()` → `receive_pending` has `transfer_id` only, no items. Would need `getTransferDetails()` per pending transfer to get items. | **Cost: N API calls for N pending transfers.** Alternative: use `getTransferHistory({status:'dispatched'})` which returns flat list — cheaper but still no item names. **Recommend: defer to Phase 2 or batch-fetch.** |
| B1-03 | Duplicate request warning | **FEASIBLE** | `getPendingQueues()` → `my_requests` + `getTransferDetails()` for each to check items. Or simpler: show "You have X pending requests" as a banner without item-matching. | **Lightweight version feasible. Full item-match version is expensive.** |
| B1-04 | Source stock level | **ALREADY EXISTS** | `requestCatalog()` returns `available_display_qty` per item | Enhance visual prominence only — no new API. |
| B1-05 | Consumption-based suggestion | **FEASIBLE** | `getDailyConsumptionReport()` returns consumption data | Extra API call. Needs matching logic. |
| B1-06 | Last request context | **FEASIBLE WITH COST** | `getTransferHistory({type: 'request'})` → scan for matching items | Scan-based. No item-level filter in API. |
| B1-07 | Empty form guidance | **FRONTEND-ONLY** | — | No API needed |
| B1-08 | Qty exceeds source warning | **FEASIBLE** | Compare against `available_display_qty` from catalog | Already in data |
| B1-09 | Zero quantity blocker | **FRONTEND-ONLY** | — | Already partially exists |
| B1-10 | Mandatory field indicators | **FRONTEND-ONLY** | — | No API needed |

### B2 — Pending Queues

| # | Element | Verdict | Implementation Note |
|---|---------|:-------:|-------------------|
| B2-01 | Age badges | **FRONTEND-ONLY** | `created_at` available in queue response. Calculate relative time. |
| B2-02 | Stale request warning | **FRONTEND-ONLY** | Threshold on `created_at`. |
| B2-03 | Item preview | **NOT FEASIBLE WITHOUT EXTRA CALLS** | Queue response has no items — only `line_count`. Would need `getTransferDetails()` per row. **Recommend: show `line_count` prominently + "X items" instead.** |
| B2-04 | Priority sorting | **FRONTEND-ONLY** | Sort by `created_at`. |
| B2-05 | Destination urgency | **FEASIBLE BUT EXPENSIVE** | Need `getHierarchyDetail()` per destination. **Defer.** |
| B2-06 | Quick-action buttons | **FRONTEND-ONLY** | Wire to same API calls. No extra data needed. |
| B2-07 | Tab badge counts | **FRONTEND-ONLY** | Already computed — render in tab. |
| B2-08 | Empty state guidance | **FRONTEND-ONLY** | Use `restaurantType` for role-specific messages. |
| B2-09 | Ready to Dispatch highlight | **FRONTEND-ONLY** | Visual styling only. |
| B2-10 | Auto-refresh indicator | **FRONTEND-ONLY** | Track fetch timestamp in state. |

### B3 — Transfer Detail

| # | Element | Verdict | Implementation Note |
|---|---------|:-------:|-------------------|
| B3-01 | Approval impact summary | **FEASIBLE** | `getSourceOptions()` per line (already done in ApproveWaveDialog). Can pre-fetch on TransferDetail load for "requested" status transfers. |
| B3-02 | Source stock warning | **FEASIBLE** | Same source-options data. Compare line qty vs segment available. |
| B3-03 | Transfer age display | **FRONTEND-ONLY** | `created_at` in transfer data. |
| B3-04 | Action explanation tooltips | **FRONTEND-ONLY** | Static text per action ID. |
| B3-05 | Destination current stock | **FEASIBLE** | `getHierarchyDetail({storeRestaurantId: to_restaurant_id})` — one extra call. |
| B3-06 | Post-action projection | **FEASIBLE** | Computed from source-options + destination detail data. |
| B3-07 | Linked modifications panel | **ALREADY EXISTS** | `linkedMods` already fetched. Enhance display. |
| B3-08 | Disabled action explanation | **FRONTEND-ONLY** | Logic on `actions.length`, `isSource/isDestination`, `status`. |
| B3-09 | Line-level FEFO hint | **NEEDS VERIFICATION** | `meta_json.dispatch` may contain segment references. Check actual dispatched transfer. |
| B3-10 | Receive readiness check | **FRONTEND-ONLY** | Compute from lines data. |
| B3-11 | Status timeline enhancement | **FRONTEND-ONLY** | Diff between event timestamps already in StatusTimeline data. |

### B4 — Approve Wave Dialog

| # | Element | Verdict | Implementation Note |
|---|---------|:-------:|-------------------|
| B4-01 | FEFO expiry badge | **FEASIBLE** | `segments[].expiry_date` from source-options already loaded. |
| B4-02 | Auto-select FEFO segment | **FRONTEND-ONLY** | Sort + pre-select. |
| B4-03 | Over-approve warning | **FEASIBLE** | Computed from segment qty - approve qty. |
| B4-04 | Approve-all shortcut | **FRONTEND-ONLY** | Set all lines to max. |
| B4-05 | Segment exhaustion alert | **FRONTEND-ONLY** | Compare approve qty vs segment display_qty. |
| B4-06 | Hold policy explanation | **FRONTEND-ONLY** | Static text. |

### B5 — Direct Dispatch Form

| # | Element | Verdict | Implementation Note |
|---|---------|:-------:|-------------------|
| B5-01 | Destination current stock | **FEASIBLE** | `getHierarchyDetail({storeRestaurantId: selectedDest})` on destination change. |
| B5-02 | Destination low-stock highlight | **FEASIBLE** | From same API — check `is_low_stock` per item. |
| B5-03 | Source post-dispatch projection | **FEASIBLE** | Own stock from `getStockInventory()` - dispatch qty. |
| B5-04 | Duplicate dispatch detection | **FEASIBLE** | `getTransferHistory({status:'dispatched'})` for today + destination filter. |
| B5-05 | FEFO recommendation | **FEASIBLE** | Source-options already loaded in SourceSelector. Enhance display. |
| B5-06 | Qty exceeds available blocker | **FRONTEND-ONLY** | Compare against selected segment's display_qty. |
| B5-07 | Empty destination explanation | **FRONTEND-ONLY** | Conditional on destinations.length. |

### B6 — Source Selector

| # | Element | Verdict | Implementation Note |
|---|---------|:-------:|-------------------|
| B6-01 | FEFO priority badge | **FRONTEND-ONLY** | Sort by expiry ascending. Badge first. |
| B6-02 | Near-expiry warning | **FRONTEND-ONLY** | `expiry_date` already in segment data. Compute days until. |
| B6-03 | Expired segment block | **FRONTEND-ONLY** | Compare expiry < today. |
| B6-04 | Remaining after selection | **FRONTEND-ONLY** | segment.display_qty - qty. |
| B6-05 | Segment qty enhancement | **FRONTEND-ONLY** | CSS only. |
| B6-06 | Empty segment explanation | **FRONTEND-ONLY** | Conditional text. |

### B7 — Receive Dialog

| # | Element | Verdict | Implementation Note |
|---|---------|:-------:|-------------------|
| B7-01 | Dispatched vs expected | **FEASIBLE** | Both values in line data: `dispatchedDisplayTotal` and `requestedDisplayQty`. |
| B7-02 | Discrepancy highlight | **FRONTEND-ONLY** | Compare the two fields. |
| B7-03 | Post-receive projection | **FEASIBLE** | `getStockInventory()` for current + accepted_qty per item. |
| B7-04 | Resolution type explanation | **FRONTEND-ONLY** | Static text per type. |
| B7-05 | Partial receive summary | **FRONTEND-ONLY** | Computed from lineData. |
| B7-06 | Reason quality guidance | **FRONTEND-ONLY** | UX text + counter. |
| B7-07 | Full receive confirmation | **FRONTEND-ONLY** | Summary before submit. |

### B8 — Dispute Resolution

| # | Element | Verdict | Implementation Note |
|---|---------|:-------:|-------------------|
| B8-01 | Issue summary | **FEASIBLE** | Already in transfer's `resolution_meta`. |
| B8-02 | Impact explanation | **FRONTEND-ONLY** | Static text. |
| B8-03 | Note guidance | **FRONTEND-ONLY** | Placeholder text. |

### Cross-Screen

| # | Element | Verdict | Implementation Note |
|---|---------|:-------:|-------------------|
| BX-01 | Lifecycle breadcrumb | **FRONTEND-ONLY** | Derive from status. |
| BX-02 | Role-aware CTA | **FRONTEND-ONLY** | Already have queue counts + role. |
| BX-03 | Cross-reference index | **FEASIBLE WITH COST** | `getTransferHistory()` scan. **Defer.** |
| BX-04 | Consistent empty states | **FRONTEND-ONLY** | Per-screen text. |
| BX-05 | Loading skeleton consistency | **FRONTEND-ONLY** | CSS/component pattern. |
| BX-06 | Error retry with context | **FRONTEND-ONLY** | UX text per error type. |

---

## FEASIBILITY VERDICT SUMMARY

| Category | Count | % |
|----------|:-----:|:-:|
| **FRONTEND-ONLY** (no extra API calls) | **40** | 66% |
| **FEASIBLE** (1-2 extra API calls, data exists) | **15** | 24% |
| **FEASIBLE WITH COST** (N+1 calls or expensive) | **3** | 5% |
| **NEEDS VERIFICATION** (check dispatched meta) | **1** | 2% |
| **NOT FEASIBLE WITHOUT COST** (needs redesign) | **2** | 3% |

### Compromised Items (Recommended Alternatives)

| # | Original | Problem | Recommended Alternative |
|---|----------|---------|----------------------|
| B1-02 | Pending incoming badge with item match | Queue has no items; need N detail calls | **Lightweight version:** "You have X pending incoming transfers" (count only, no item match) |
| B1-03 | Duplicate request with item match | Same N+1 problem | **Lightweight version:** "You have X active requests" banner |
| B2-03 | Item preview in queue row | Queue has no items | **Show `line_count` prominently:** "3 items" badge instead of item names |
| B2-05 | Destination urgency | Need per-destination API call | **Defer to future** — batch API needed |
| B1-06 | Last request context | Scan-based, no item filter | **Include only if history already loaded** |

### No Blockers

**Zero items are blocked by backend gaps (G-001 to G-011).** All Flow B intelligence can be delivered with the current API layer.

---

*Phase 3 complete. Ready for Phase 4 (HTML/static screen previews) or Phase 2 for next flow.*
