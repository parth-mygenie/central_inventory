# Central Inventory Slice 3 — Transfer History + Stock Ledger Planning

> **Date:** 20 May 2026
> **Agent:** Senior Central Inventory Slice 3 Planning Agent
> **Status:** Code inspection and document review only — no modifications made

---

## 1. Planning Status

### `slice_3_scope_recommended_owner_approval_required`

All 10 recommended Slice 3 items are planned across two tabs (Transfer History + Stock Ledger) inside a single "History & Ledger" screen. File targets identified. Role visibility matrix created. API/data dependencies mapped. 11 owner questions require answers before implementation begins.

---

## 2. Inputs Reviewed

| # | Input | Path | Reviewed |
|---|-------|------|----------|
| 1 | CR Requirement Planning | `/app/memory/central_inventory/CENTRAL_INVENTORY_CR_REQUIREMENT_PLANNING.md` | YES |
| 2 | Enterprise Review Round 2 | `/app/memory/central_inventory/CENTRAL_INVENTORY_ENTERPRISE_REQUIREMENT_REVIEW_ROUND_2.md` | YES |
| 3 | Slice 2 UX Review & Planning | `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_2_UX_REVIEW_AND_PLANNING.md` | YES |
| 4 | Slice 2 Implementation Plan | `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_2_IMPLEMENTATION_PLAN.md` | YES |
| 5 | Slice 2 Implementation Report | `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_2_IMPLEMENTATION_REPORT.md` | YES |
| 6 | Slice 2 QA Handover | `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_2_QA_HANDOVER.md` | YES |
| 7 | Owner Answers Complete | `/app/memory/central_inventory/OWNER_ANSWERS_COMPLETE.md` | YES |
| 8 | Business Rule & UX Field Freeze | `/app/memory/central_inventory/CENTRAL_INVENTORY_BUSINESS_RULE_AND_UX_FIELD_FREEZE.md` | YES |
| 9 | PRD | `/app/memory/PRD.md` | YES |
| 10 | Test Credentials | `/app/memory/test_credentials.md` | YES |
| 11 | Seed Data Module | `/app/backend/seed_data.py` (491 lines) | YES — full review |
| 12 | Backend Server | `/app/backend/server.py` (292 lines) | YES — full review |
| 13 | Frontend API Service | `/app/frontend/src/services/api.js` (132 lines) | YES |
| 14 | App Routes | `/app/frontend/src/App.js` (83 lines) | YES |
| 15 | All 7 screen components | `/app/frontend/src/components/central-inventory/*.jsx` | YES — line counts reviewed |
| 16 | All infrastructure files | `formatters.js`, `transferActions.js`, `screenVisibility.js`, `terminology.js` | YES |
| 17 | Slice 2 QA Test Report | `/app/test_reports/iteration_4.json` | YES — 12/12 items PASS |

---

## 3. Current Project Status

### Slice 1 — COMPLETE
Full codebase pulled from GitHub. All core screens operational: Login, Operations Hub, Hierarchy Summary, Store Detail, Pending Queues, Transfer Detail. Role-based UX for Central/Master/Outlet. Terminology mapping infrastructure.

### Slice 2 — COMPLETE + QA VALIDATED (20 May 2026)
12/12 items implemented and tested:
1. Ready to Dispatch tab ✓
2. Status timeline ✓
3. Line-level accept/reject ✓
4. Timestamp formatting ✓
5. Resolution reasons ✓
6. Date range picker ✓
7. Contextual action buttons ✓
8. Items count column ✓
9. Store name fix ✓
10. Downward-only hierarchy ✓
11. Context selector in-place ✓
12. KPI placeholder removed ✓

**Backend**: 10/10 pytest passed. **Frontend**: 12/12 Playwright verified.

### Active Blocker
**Write API integration is blocked by `UNIT_CONVERSION_NOT_DEFINED`** — the backend `unit` table is missing `conversion_factor`/`base_unit` columns. All transfer write APIs (approve, dispatch, receive, reject, cancel) return this error. This blocker makes write operations impossible in Slice 3.

### Implication for Slice 3
Slice 3 must remain **read-only**. No write operations (approve, dispatch, receive, reject, cancel) can be introduced until the backend blocker is resolved.

---

## 4. Slice 3 Goal

### Why Transfer History + Stock Ledger?

1. **Enterprise traceability is the next natural step.** Slices 1-2 built operational screens (hub, queues, detail). Users can see current state but cannot trace historical movements — the "what happened" story is missing.

2. **Data already exists.** Transfer history data is fully available in seed data (12 transfers covering all statuses). Stock movement entries can be derived from transfer events. No new backend API is required for the core implementation.

3. **Read-only scope fits the current blocker.** Since write APIs are blocked, a read-only traceability slice delivers maximum value without waiting for backend resolution.

4. **Owner requirement alignment.** WF-019 (View Stock Ledger) is listed as "Must have P1" in the CR planning. Report #4 (Transfer History) is listed in Section 19 of the requirement planning. Both are confirmed must-haves.

5. **Reusable infrastructure.** Slice 2 created `DateRangePicker`, `StatusTimeline`, `formatters.js`, `transferActions.js`, and `terminology.js` — all directly reusable for Slice 3.

---

## 5. Proposed Screen Structure

### Recommendation: Option B — One "History & Ledger" screen with two tabs

**Route:** `/history`

**Sidebar navigation:** New nav item "History & Ledger" between "Pending Queues" and any future items.

**Tab 1:** Transfer History
- Shows all past and current transfers visible to the logged-in user based on hierarchy permissions.
- Rich filtering: date range, status, store/context, direction, search.
- Rows link to existing Transfer Detail (`/transfer/:id`).

**Tab 2:** Stock Ledger
- Shows item-level stock movements across the allowed hierarchy.
- Each row represents one stock movement event (transfer in, transfer out, receive, partial receive, rejection, cancellation reversal).
- Rows with transfer references link to Transfer Detail.

### Why Option B over alternatives?

| Option | Evaluation |
|--------|-----------|
| **A: Two separate screens** | Adds 2 routes + 2 nav items. Clutters sidebar. User must remember which screen has what. |
| **B: One screen, two tabs** ✓ | Single "History & Ledger" nav item. User can switch between transfer-level and item-level views in one place. Consistent with Pending Queues pattern (tabs). |
| **C: Tabs inside Pending Queues** | Mixes operational (pending actions) with historical (completed transfers). Confusing. Overloads an already 4-tab screen. |

**Current code structure supports Option B well.** `PendingQueues.jsx` (268 lines) already implements a multi-tab pattern with tab state, tab badges, and per-tab content rendering. The same pattern can be replicated for the History & Ledger screen.

---

## 6. Transfer History Planning

### 6.1 Purpose

Show all past and current transfers visible to the logged-in user based on hierarchy permissions. Provides a chronological, filterable view of the complete transfer lifecycle across the user's accessible hierarchy.

### 6.2 Columns

| # | Column | Source Field | Notes |
|---|--------|-------------|-------|
| 1 | Transfer ID | `id` | Clickable → opens `/transfer/:id` |
| 2 | Date | `created_at` | Formatted via `formatTimestamp()` |
| 3 | Source Store | `from_restaurant_name` | With type badge via `mapRestaurantType()` |
| 4 | Destination Store | `to_restaurant_name` | With type badge via `mapRestaurantType()` |
| 5 | Status | `status` | Colored badge via `STATUS_CONFIG` from `terminology.js` |
| 6 | Type | `type` | "Request" or "Direct Dispatch" badge |
| 7 | Items | `items_count` | "3 items" / "1 item" |
| 8 | Direction | Derived | "Incoming" / "Outgoing" relative to current user/context |
| 9 | Last Updated | `updated_at` | Formatted via `formatTimestamp()` |
| 10 | Action | — | "View Details" link → `/transfer/:id` |

### 6.3 Filters

| # | Filter | Type | Notes |
|---|--------|------|-------|
| 1 | Date Range | DateRangePicker (reuse Slice 2 component) | Default: Last 30 Days |
| 2 | Status | Multi-select dropdown | All 7 statuses: requested, approved, dispatched, received, partially_received, cancelled, rejected |
| 3 | Direction | Toggle/tabs: All / Incoming / Outgoing | Relative to logged-in user's store |
| 4 | Store Filter | Dropdown (where role permits) | Central: all stores. Master: own + outlets. Outlet: locked. |
| 5 | Search | Text input | Search by Transfer ID or store name |
| 6 | Clear/Reset | Button | Resets all filters to defaults |

### 6.4 Data Source

**Current:** `POST /api/proxy/v2/inventory-transfer/history` → calls `seed_data.get_transfer_history(actor_restaurant_id)`.

**Current response shape:**
```json
{
  "data": [
    {
      "id": 101,
      "type": "request",
      "status": "requested",
      "from_restaurant_id": 1,
      "to_restaurant_id": 783,
      "from_restaurant_name": "My Genie",
      "to_restaurant_name": "DemoFranchise1",
      "created_at": "2026-05-20T03:20:21...",
      "updated_at": "2026-05-20T03:20:21...",
      "items_count": 2
    }
  ],
  "meta": {"total": 5, "page": 1}
}
```

**Missing fields needed:** `from_restaurant_type`, `to_restaurant_type` (for store badges). These exist in the full transfer objects but are not included in the `proxy_transfer_history` slim response in `server.py`.

**Seed data enhancement needed:**
- Add `from_restaurant_type` and `to_restaurant_type` to the history response.
- Support optional filter params: `status`, `from_date`, `to_date`, `direction` (incoming/outgoing relative to actor).

### 6.5 Role Visibility

| Role | What they see | Store filter available? |
|------|--------------|----------------------|
| Central (master) | All transfers where from/to is any store in their hierarchy (currently: all 12 transfers) | Yes — can filter by any child store |
| Master (central) | Transfers where from/to is self or own child outlets (not sibling Masters, not Central above) | Yes — can filter by own outlets |
| Outlet (franchise) | Only transfers where self is source or destination | No — locked to own |

**Current `get_transfer_history()` already filters correctly:** returns transfers where `from_restaurant_id == actor OR to_restaurant_id == actor`. However, for Central (master), it returns ALL transfers since Central is typically involved in most. For strict downward-only visibility, Central should see all, Master should see own + own-outlets, Outlet sees own only. The current implementation covers this since transfers are between related stores.

**Potential visibility concern:** Should Master see transfers between Central and a sibling Master's outlets (e.g., Central → DemoFranchise3 where DemoFranchise3 belongs to DemoCentral2, not DemoCentral1)? Per downward-only rule: **No.** Master should only see transfers involving themselves or their own children.

**Enhancement needed:** `get_transfer_history()` should be modified to enforce strict downward-only visibility:
- `master`: sees all transfers (top of hierarchy)
- `central`: sees transfers where `from_restaurant_id` or `to_restaurant_id` is self OR any of own children
- `franchise`: sees transfers where self is source or destination (already correct)

### 6.6 Detail Linkage

Transfer History rows should navigate to the existing Transfer Detail screen (`/transfer/:id`). The existing `TransferDetail.jsx` component (327 lines) already handles all status states, timeline, line-level display, and contextual actions. No modifications needed.

### 6.7 Empty/Loading/Error States

| State | Display |
|-------|---------|
| Loading | Skeleton table with shimmer rows (consistent with existing patterns in PendingQueues) |
| Empty (no transfers) | "No transfers found" with filter-context message (e.g., "No transfers match your filters" vs "No transfer history yet") |
| Empty after filter | "No transfers match your filters. Try adjusting your date range or status filter." with Reset button |
| Error | "Failed to load transfer history. Please try again." with Retry button |

### 6.8 Risks

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| 1 | Transfer history endpoint doesn't return restaurant_type for badges | LOW | Add `from_restaurant_type` and `to_restaurant_type` to server.py response |
| 2 | Direction filter logic may be ambiguous for transfers involving 3rd-party stores | LOW | Direction is relative to logged-in user's restaurant_id, not context selector |
| 3 | Large transfer volumes on real API | LOW | Pagination already supported via `meta.total` and `meta.page`. Seed data is small. |
| 4 | Date range filtering not implemented in seed_data | LOW | Add date filtering to `get_transfer_history()`. Already done in `get_hierarchy_summary()`. |

---

## 7. Stock Ledger Planning

### 7.1 Purpose

Show item-level stock movements across the allowed hierarchy. Each ledger row represents a single stock movement event — providing granular traceability of what moved, where, when, and why.

### 7.2 Movement Types

For Slice 3 (derived from existing transfer data):

| # | Movement Type | Direction | Source | Available in seed? |
|---|-------------|-----------|--------|-------------------|
| 1 | Transfer Out | Out | Transfer dispatched (source side) | YES — derived from dispatched transfers |
| 2 | Transfer In | In | Transfer received (destination side) | YES — derived from received transfers |
| 3 | Partial Receive | In | Partially received transfer | YES — transfer #110 |
| 4 | Rejection Return | In | Rejected/cancelled transfer reversal (stock restored to source) | YES — derived from cancelled/rejected transfers |
| 5 | Opening Stock | Neutral | Initial stock setup | NO — not in seed. Placeholder. |
| 6 | Adjustment | Neutral | Stock correction | NO — blocked (no adjustment API). Placeholder. |
| 7 | Wastage | Out | Spoilage/damage | NO — blocked (no wastage API). Placeholder. |
| 8 | Sales Consumption | Out | Recipe deduction | NO — not in scope. Placeholder. |

**Slice 3 scope:** Types 1-4 are implementable from existing transfer data. Types 5-8 are shown as "Coming Soon" filter options or hidden until data is available.

### 7.3 Columns

| # | Column | Source | Notes |
|---|--------|-------|-------|
| 1 | Date/Time | Transfer `created_at` / `dispatched_at` / `received_at` | Depends on movement type |
| 2 | Store | Store where movement occurred | With type badge |
| 3 | Item | `stock_title` from transfer line | — |
| 4 | Movement Type | Derived (see 7.2) | Color-coded badge |
| 5 | Direction | In / Out | Arrow icon: ↓ In (green), ↑ Out (red) |
| 6 | Quantity | Line `quantity` (or `accepted_qty` for partial) | With unit |
| 7 | Unit | Line `unit` | — |
| 8 | Reference Type | "Transfer" | For Slice 3, always "Transfer" (other types deferred) |
| 9 | Reference ID | Transfer `id` | Clickable → `/transfer/:id` |
| 10 | Counterparty | From/To store name | The "other" store in the movement |
| 11 | Before Qty | — | **NOT AVAILABLE in seed data** (see Q-S3-004) |
| 12 | After Qty | — | **NOT AVAILABLE in seed data** (see Q-S3-004) |

**Note on Before/After Quantity:** Owner answer LED-001 requires every movement to record `before_qty` and `after_qty`. However, this data does not exist in the current seed data or backend API responses. Options: (a) Seed it synthetically, (b) Show "—" with tooltip "Available when connected to live API", (c) Defer columns entirely. See Q-S3-004.

### 7.4 Deriving Ledger Entries from Transfers

Each transfer produces 1-2 ledger entries depending on status:

| Transfer Status | Source Store Entry | Destination Store Entry |
|----------------|-------------------|----------------------|
| requested | — | — (no stock impact) |
| approved | — (soft reservation only, no ledger) | — |
| dispatched | Transfer Out (qty deducted) | — (in transit, not yet received) |
| received | — | Transfer In (qty credited) |
| partially_received | — | Partial Receive (accepted_qty credited) |
| cancelled (post-dispatch) | Rejection Return (qty restored) | — |
| rejected (pre-dispatch) | — | — (no stock impact) |

**Implementation approach:** Create a `derive_stock_ledger()` function in `seed_data.py` that iterates through all transfers and generates ledger entries based on the matrix above. Each entry captures: timestamp, store_id, item, movement_type, direction, quantity, unit, transfer_id.

### 7.5 Filters

| # | Filter | Type | Notes |
|---|--------|------|-------|
| 1 | Date Range | DateRangePicker (reuse) | Default: Last 30 Days |
| 2 | Movement Type | Multi-select dropdown | Transfer Out, Transfer In, Partial Receive, Rejection Return |
| 3 | Direction | Toggle: All / In / Out | — |
| 4 | Store | Dropdown (where role permits) | Same as Transfer History filter |
| 5 | Item | Search/dropdown | Search by item name |
| 6 | Reference ID | Text input | Search by transfer ID |
| 7 | Clear/Reset | Button | Resets all filters |

### 7.6 Role Visibility

| Role | What they see | Notes |
|------|--------------|-------|
| Central (master) | Ledger entries for all stores in hierarchy | Can filter by any store |
| Master (central) | Ledger entries for own store + own child outlets | Cannot see sibling Master or Central ledger |
| Outlet (franchise) | Only own ledger entries | Locked to own store |

### 7.7 Reference Linkage

- Ledger entries with `reference_type: "Transfer"` link to `/transfer/:id` via the Reference ID column.
- Future movement types (Adjustment, Wastage) may link to a detail drawer/modal or show inline detail.
- For Slice 3, all entries are transfer-derived, so all links go to Transfer Detail.

### 7.8 Empty/Loading/Error States

| State | Display |
|-------|---------|
| Loading | Skeleton table with shimmer rows |
| Empty (no movements) | "No stock movements found" with context message |
| Empty after filter | "No movements match your filters." with Reset button |
| Error | "Failed to load stock ledger. Please try again." with Retry |

### 7.9 Risks

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| 1 | Before/After quantity not available | MEDIUM | Show "—" or defer columns. See Q-S3-004. |
| 2 | Ledger derivation logic may miss edge cases | LOW | Test all 12 seed transfers systematically |
| 3 | No real stock ledger API exists on backend | MEDIUM | Derive from transfers in seed. Document as seed-only until real API available. |
| 4 | Actor/user names not available (only IDs) | LOW | Show "—" or "User #4520". See Q-S3-007. |
| 5 | Movement types beyond transfers not available | LOW | Show only transfer-derived types. Other types as "Coming Soon". |

---

## 8. Role Visibility Matrix

| Role | Backend Type | Transfer History Visibility | Stock Ledger Visibility | Store Filter Available | Can Open Detail | Can See Direction | Notes |
|------|-------------|---------------------------|------------------------|----------------------|----------------|------------------|-------|
| Central | `master` | All transfers in hierarchy (12 transfers in seed) | All ledger entries for all stores | YES — all child stores | YES | YES (In/Out relative to selected context) | Full downward visibility |
| Master | `central` | Transfers involving self or own child outlets | Ledger entries for own store + own child outlets | YES — own child outlets only | YES | YES | No sibling Master data. No Central data. |
| Outlet | `franchise` | Only transfers where self is source or destination | Only own store ledger entries | NO — locked to own store | YES | YES (always relative to self) | Self only. No upward or lateral visibility. |

### Visibility Enforcement

- **Transfer History:** Modify `get_transfer_history()` to support strict downward-only filtering for `central` type (currently returns all transfers where actor is source/dest, but doesn't include child-outlet transfers where actor is NOT directly involved).
- **Stock Ledger:** `derive_stock_ledger()` inherits visibility from transfer filtering — only generates entries for transfers visible to the actor.
- **Frontend:** Use `isTopLevel` / `isMiddleLevel` / `isBottomLevel` from `useLoginContext` to conditionally show store filter dropdown.

---

## 9. API / Data Dependency Matrix

| # | Data Needed | Current Source | Availability | API Required? | Seed Support? | Risk | Owner/API Question |
|---|------------|---------------|-------------|---------------|--------------|------|-------------------|
| 1 | Transfer list with full metadata | `GET /proxy/v2/inventory-transfer/history` → `seed_data.get_transfer_history()` | AVAILABLE — 12 transfers in seed | No new API | YES | LOW | None |
| 2 | Transfer restaurant types (from/to) | Transfer objects have `from_restaurant.restaurant_type` | PARTIALLY AVAILABLE — history endpoint strips type | No new API — fix server.py slim response | YES | LOW | None |
| 3 | Transfer line items (for ledger derivation) | Full transfer objects in `TRANSFERS` array | AVAILABLE in seed | N/A (seed-only derivation) | YES | LOW | None |
| 4 | Transfer status events/timeline | `_at` timestamp fields on transfers | AVAILABLE | No | YES | LOW | None |
| 5 | Stock movement / ledger entries | **DOES NOT EXIST** — must be derived from transfers | NOT AVAILABLE as dedicated data | Future: may need `/inventory/stock-ledger` API | YES — derive from transfers | MEDIUM | Q-S3-001 |
| 6 | Store hierarchy (names, types, children) | `RESTAURANTS` dict + `get_visible_restaurants()` | AVAILABLE | No | YES | LOW | None |
| 7 | Item names | `INVENTORY_ITEMS` list + transfer line `stock_title` | AVAILABLE | No | YES | LOW | None |
| 8 | UOM | Transfer line `unit` field | AVAILABLE | No | YES | LOW | None |
| 9 | User/actor names | Only numeric IDs (`requested_by: 4520`) | NOT AVAILABLE — only IDs, no name resolution | Would need user API | NO | LOW | Q-S3-007 |
| 10 | Reasons/notes | `resolution_meta.reason` on some transfers | PARTIALLY AVAILABLE — only on resolution transfers | No | YES | LOW | None |
| 11 | Before/after stock quantity | **DOES NOT EXIST** in seed or API | NOT AVAILABLE | Would need ledger API with balance tracking | POSSIBLE — synthetic seed | MEDIUM | Q-S3-004 |
| 12 | Date filtering for history | Server.py accepts body params but seed ignores them | NOT IMPLEMENTED in seed | No new API — add to seed_data.py | YES | LOW | None |
| 13 | Status filtering for history | Not in current endpoint | NOT IMPLEMENTED | No new API — add to seed_data.py | YES | LOW | None |

---

## 10. Backend Terminology Mapping Notes

### Existing mapping (unchanged from Slice 1/2)

| UI Label | Backend `restaurant_type` | Backend `store_type` filter |
|----------|--------------------------|---------------------------|
| Central Store | `master` | N/A |
| Master Store | `central` | `"central"` |
| Outlet | `franchise` | `"franchise"` |

### Slice 3 Specific Risks

| # | Risk Area | Where in Slice 3 | Mitigation |
|---|-----------|------------------|------------|
| 1 | Transfer History source/destination badges | "Source Store" and "Destination Store" columns | Use `mapRestaurantType()` from `terminology.js` — already proven in Pending Queues |
| 2 | Stock Ledger "Store" column | Shows which store the movement occurred at | Use `mapRestaurantType()` |
| 3 | Stock Ledger "Counterparty" column | Shows the other store in the movement | Use `mapRestaurantType()` |
| 4 | Store filter dropdown labels | Lists stores the user can filter by | Use `mapRestaurantType()` for type badges in dropdown |
| 5 | Direction filter ambiguity | "Incoming to Central Store" vs "Incoming to master" | Ensure direction labels use business terms, not backend terms |

**No new terminology risks in Slice 3.** All mapping infrastructure from Slice 1 (`terminology.js` with `mapRestaurantType()`, `TERM_MAP`, `STATUS_CONFIG`) is fully reusable. The `StoreTypeBadge` component from `Badges.jsx` already handles display.

---

## 11. Recommended Slice 3 Scope

### A. Must Have — Slice 3 (10 items)

| # | Item | Effort | Justification |
|---|------|--------|---------------|
| 1 | **History & Ledger screen with two tabs** | Medium | New route `/history`, new sidebar nav item, tab container |
| 2 | **Transfer History tab** | Medium | Table with all visible transfers, linked to Transfer Detail |
| 3 | **Stock Ledger tab** | High | Derive ledger entries from transfers, display item-level movements |
| 4 | **Date range filter (reuse DateRangePicker)** | Low | Already built for Slice 2. Apply to both tabs. |
| 5 | **Status filter (Transfer History)** | Low | Multi-select dropdown for 7 statuses |
| 6 | **Movement type filter (Stock Ledger)** | Low | Multi-select for transfer-derived types |
| 7 | **Direction filter (Incoming/Outgoing/All)** | Low | Toggle/tab filter on both tabs |
| 8 | **Search by Transfer ID / item name** | Low | Text input search |
| 9 | **Role-based visibility enforcement** | Medium | Central sees all, Master sees own + outlets, Outlet sees own |
| 10 | **Transfer Detail linkage** | Low | Clickable Transfer ID / Reference ID → existing `/transfer/:id` |

### B. Should Have — Slice 3 (5 items)

| # | Item | Effort | Justification |
|---|------|--------|---------------|
| 11 | **Store/context filter dropdown** | Medium | Central/Master can filter by specific child store |
| 12 | **Reason/note display in ledger** | Low | Show `resolution_meta.reason` for resolution-related movements |
| 13 | **Ledger reference detail fallback** | Low | For non-transfer references (future), show inline detail instead of broken link |
| 14 | **Empty/loading/error state polish** | Low | Consistent with existing Slice 2 patterns |
| 15 | **Pagination** | Medium | Current seed is small (12 transfers → ~20 ledger entries), but real data will need pagination |

### C. Future / Not Slice 3

| # | Item | Reason |
|---|------|--------|
| 16 | Export CSV/PDF | Report export is P1 but complex. Defer to Reports slice. |
| 17 | KPI dashboard | Blocked — owner hasn't specified KPIs (RPT-003: D) |
| 18 | Cost/value reporting | Requires cost model data not in seed (ITM-003) |
| 19 | Advanced reports (reconciliation, efficiency) | Requires dedicated Reports screen scope |
| 20 | Write operations (approve/dispatch/receive) | Blocked by UNIT_CONVERSION |
| 21 | Real-time ledger updates (WebSocket) | Phase 2 per owner (NOTIF-002: D) |
| 22 | Sales/recipe consumption entries | No consumption data in scope; display-only per RECIPE-001: D |
| 23 | Audit log admin screen | Separate admin feature, not user-facing |
| 24 | Before/After quantity columns | Requires either synthetic seed data or real ledger API. See Q-S3-004. |
| 25 | Actor/user name resolution | No user name API. See Q-S3-007. |
| 26 | Adjustment/Wastage ledger entries | No write APIs for these yet. Placeholder in filter. |

---

## 12. Owner Questions

### Q-S3-001: Should Slice 3 derive stock ledger from transfer data or wait for a dedicated ledger API?

A. Derive from transfers in seed data (item-level movement entries computed from transfer status changes)
B. Wait for a dedicated stock ledger API from backend team
C. Derive from transfers now; replace with real API when available
D. Defer stock ledger entirely — only build Transfer History in Slice 3

**Recommended answer:** C
**Reason:** Transfer data already provides rich movement history. Deriving ledger entries now gives immediate value. The derivation function can be replaced with a real API call later without UI changes.
**Impact if not answered:** Stock Ledger tab implementation is blocked.

---

### Q-S3-002: Should Transfer History and Stock Ledger be one screen with tabs (Option B) or two separate screens?

A. One screen with two tabs (Option B) — "History & Ledger"
B. Two separate screens — "Transfer History" and "Stock Ledger"
C. Add Transfer History as a tab inside Pending Queues (extend existing screen)
D. Defer — owner to decide later

**Recommended answer:** A
**Reason:** Keeps traceability in one place. Consistent with Pending Queues tab pattern. Single sidebar entry.
**Impact if not answered:** Screen structure cannot be finalized.

---

### Q-S3-003: Can Outlet users see source/destination names if the transfer came from Master/Central?

A. Yes — Outlet can see "My Genie" or "DemoCentral1" as the source name on incoming transfers
B. No — source should be anonymized as "Parent Store" or "Supplier"
C. Show name but not type/level
D. Owner decides later

**Recommended answer:** A
**Reason:** Outlet already sees source/destination in Transfer Detail (Slice 2). This is consistent behavior.
**Impact if not answered:** Column display rules for Outlet are unclear. LOW impact — default to A.

---

### Q-S3-004: Should Before/After quantity be shown in Stock Ledger if data is available?

A. Yes — show before_qty and after_qty columns (use synthetic seed data for now)
B. Yes — but only show when connected to real API (show "—" with seed data)
C. No — defer before/after columns entirely to a future slice
D. Owner decides later

**Recommended answer:** B
**Reason:** Owner answer LED-001 confirms before/after is required. Showing "—" with seed data sets the right expectation without blocking implementation.
**Impact if not answered:** Column structure unclear. LOW impact — default to B.

---

### Q-S3-005: Should Transfer History show all statuses or only completed/terminal statuses?

A. Show all statuses (requested, approved, dispatched, received, partially_received, cancelled, rejected)
B. Only show completed statuses (received, partially_received, cancelled, rejected)
C. All statuses, but default filter to completed only (user can toggle to see active)
D. Owner decides later

**Recommended answer:** A
**Reason:** Transfer History is a complete audit trail. Excluding active transfers would create gaps in traceability. Status filter allows users to narrow when needed.
**Impact if not answered:** Filter defaults unclear. LOW impact — default to A.

---

### Q-S3-006: Should cost/value be excluded from Slice 3?

A. Yes — exclude all cost/value columns from Slice 3 (defer to Reports slice)
B. Show cost if data is available in API response
C. Show a placeholder column "Cost (coming soon)"
D. Owner decides later

**Recommended answer:** A
**Reason:** Cost model is complex (owner requested all 3 models: weighted average, FIFO, latest — ITM-003: C). No cost data exists in seed. Better to defer entirely.
**Impact if not answered:** Scope creep risk. LOW impact — default to A.

---

### Q-S3-007: Should actor/user names be shown if available?

A. Yes — show actor name if backend provides it
B. Show "User #4520" (numeric ID) as fallback when name unavailable
C. No — hide actor column entirely (no user name API available)
D. Defer actor display to future slice

**Recommended answer:** D
**Reason:** No user name resolution API exists. Showing raw IDs is not user-friendly. Deferring avoids confusion.
**Impact if not answered:** Column decision unclear. LOW impact — default to D.

---

### Q-S3-008: Should export (CSV/PDF) be included in Slice 3?

A. Yes — add export buttons for both Transfer History and Stock Ledger
B. Only Transfer History export
C. Defer export to a dedicated Reports slice
D. Owner decides later

**Recommended answer:** C
**Reason:** Export adds significant effort (formatting, PDF generation, large dataset handling). Better as part of Reports scope.
**Impact if not answered:** Scope creep risk. LOW impact — default to C.

---

### Q-S3-009: Should sales consumption entries be hidden from Ledger until recipe/write integration is ready?

A. Hide entirely — only show transfer-derived movements
B. Show as placeholder rows with "Coming Soon" badge
C. Show as a disabled filter option with tooltip "Available after recipe integration"
D. Owner decides later

**Recommended answer:** C
**Reason:** Shows users that the system is designed for consumption tracking without cluttering the current view.
**Impact if not answered:** Filter design unclear. LOW impact — default to C.

---

### Q-S3-010: Should adjustment/wastage entries be shown if present in data, even though write flows are not yet built?

A. Yes — if any adjustment/wastage data exists in the future, show in ledger
B. Only show after the write flow for adjustment/wastage is built
C. Show as a disabled filter option with tooltip
D. Owner decides later

**Recommended answer:** C
**Reason:** Same rationale as Q-S3-009. Shows future capability without current data.
**Impact if not answered:** Filter design unclear. LOW impact — default to C.

---

### Q-S3-011: Should Slice 3 use seed/local data first if a dedicated stock ledger API is not ready?

A. Yes — derive ledger from seed transfer data, replace with real API when available
B. Wait for real API
C. Build UI skeleton only, no data
D. Owner decides later

**Recommended answer:** A
**Reason:** Consistent with Slices 1-2 approach. Seed data provides realistic demo. Implementation unblocks UX validation.
**Impact if not answered:** BLOCKS implementation — cannot proceed without data source decision.

---

## 13. Acceptance Criteria

1. Central user can open "History & Ledger" screen and see Transfer History tab with all transfers across the allowed downward hierarchy.
2. Master user can see only own and outlet-related transfer history. No sibling Master or Central-above transfers visible.
3. Outlet user can see only its own transfer history (where self is source or destination).
4. Transfer History rows show: Transfer ID, Date, Source, Destination, Status, Type, Items Count, Direction, Last Updated.
5. Transfer History row click opens existing Transfer Detail (`/transfer/:id`).
6. Stock Ledger tab shows item-level movements derived from transfer data.
7. Ledger rows show: Date/Time, Store, Item, Movement Type, Direction, Quantity, Unit, Reference Type, Reference ID, Counterparty.
8. Date range filter works on both tabs without breaking role visibility.
9. Status filter on Transfer History correctly filters by selected statuses.
10. Movement type filter on Stock Ledger correctly filters by movement type.
11. Direction filter (Incoming/Outgoing/All) works on both tabs.
12. Search by Transfer ID / item name returns relevant results.
13. No write actions are introduced in Slice 3.
14. UI uses Central → Master → Outlet terminology. No backend terms leak into labels, headings, or filters.
15. Empty states are clear and context-appropriate ("No transfers found" vs "No movements match your filters").
16. Loading states use skeleton shimmer consistent with existing screens.
17. Backend/API missing fields handled with safe fallback ("—" or hidden).
18. New sidebar nav item "History & Ledger" appears between "Pending Queues" and the bottom of the nav list.
19. Both tabs maintain filter state when switching between them.
20. Transfer Detail opened from History/Ledger correctly shows Back navigation.

---

## 14. Smoke Checklist

### Central Store Login (`abhishek@kalabahia.com` / `Qplazm@10`)

- [ ] Sidebar shows "History & Ledger" nav item
- [ ] Clicking "History & Ledger" opens the screen
- [ ] Transfer History tab is default/first tab
- [ ] Transfer History shows all 12 transfers from seed data
- [ ] Each row shows: ID, Date (formatted), Source (with badge), Destination (with badge), Status (colored), Type, Items, Direction
- [ ] Date range picker works (reused from Slice 2)
- [ ] Status filter works — selecting "received" shows only received transfers
- [ ] Direction filter works — "Outgoing" shows transfers FROM Central
- [ ] Search works — searching "101" shows transfer #101
- [ ] Clicking Transfer #101 row navigates to `/transfer/101`
- [ ] Back from Transfer Detail returns to History & Ledger
- [ ] Stock Ledger tab shows item-level movement entries
- [ ] Ledger entries derived from dispatched/received/partial/cancelled transfers
- [ ] Ledger shows: Date, Store (badge), Item, Movement Type, Direction (↑/↓), Quantity, Unit, Reference (clickable)
- [ ] Movement type filter works
- [ ] Item search works on Ledger tab
- [ ] No raw backend terms visible (no "master", "central", "franchise" in UI)

### Master Store Login (`owner@democentral1.com` / `Qplazm@10`)

- [ ] "History & Ledger" nav item visible
- [ ] Transfer History shows only transfers involving DemoCentral1 or its outlets (DemoFranchise1, DemoFranchise2)
- [ ] Does NOT show transfers between DemoCentral2 and its outlets
- [ ] Does NOT show transfers between Central and DemoCentral2
- [ ] Store filter dropdown shows: DemoCentral1 (self), DemoFranchise1, DemoFranchise2
- [ ] Stock Ledger shows movements only for own + own outlet stores
- [ ] All filters work within visibility scope
- [ ] Transfer Detail links work

### Outlet Login (`owner@demofranchise1.com` / `Qplazm@10`)

- [ ] "History & Ledger" nav item visible
- [ ] Transfer History shows only transfers where DemoFranchise1 is source or destination
- [ ] No store filter dropdown (locked to own)
- [ ] Stock Ledger shows only own store movements
- [ ] No transfers from DemoFranchise2, DemoCentral2, etc. visible
- [ ] Source/destination names visible (per Q-S3-003 default)
- [ ] All filters work within own scope
- [ ] Transfer Detail links work

### Cross-Role Checks

- [ ] No raw ISO timestamps visible — all formatted
- [ ] No raw backend terms in UI
- [ ] No write actions introduced
- [ ] Empty states show clear messages
- [ ] Loading states use skeleton shimmer
- [ ] Tab switch preserves filter state
- [ ] "History & Ledger" sidebar item is correctly positioned
- [ ] Responsive: table is scrollable on smaller screens

---

## 15. Risks / Ambiguities

| # | Risk | Severity | Status | Mitigation |
|---|------|----------|--------|------------|
| 1 | **Ledger data availability** | MEDIUM | No dedicated stock ledger API or data exists | Derive from transfer events. Document as seed-derived. Replace with real API when available. |
| 2 | **Backend terminology mismatch** | LOW | Fully mitigated by existing `terminology.js` | Continue using `mapRestaurantType()` for all new columns |
| 3 | **Role visibility leakage** | MEDIUM | Current `get_transfer_history()` may not enforce strict downward-only for Master | Modify `get_transfer_history()` to include child-outlet transfers even when Master isn't directly involved |
| 4 | **Source/destination label exposure for Outlet** | LOW | Outlet can already see these in Transfer Detail (Slice 2) | Default to showing names. Owner can restrict later (Q-S3-003). |
| 5 | **Missing before/after quantity fields** | MEDIUM | Not in seed data or current API | Show "—" with tooltip. Defer to real API. (Q-S3-004) |
| 6 | **Local/seed filtering vs API-backed filtering** | MEDIUM | Seed data is client-side filterable but real API may need server-side filtering | Build filter params into API calls now. Seed ignores them. Real API will use them. |
| 7 | **Actor/user name resolution** | LOW | Only numeric IDs in data | Defer actor column entirely (Q-S3-007). |
| 8 | **Ledger entry count explosion with real data** | MEDIUM | Seed has ~20 entries; real data could have thousands | Build pagination support. Default to latest-first. |
| 9 | **Tab state management complexity** | LOW | Two tabs with independent filter states | Use React state per tab. Filters reset on tab switch or persist (owner preference). |
| 10 | **Transfer History endpoint needs enhancement** | LOW | Missing `from_restaurant_type`, `to_restaurant_type` in history response | Add to `server.py` slim response — minimal change |

---

## 16. Owner Approval Gate

Owner must approve before implementation begins:

- [ ] **1. Screen structure:** Single "History & Ledger" screen with two tabs (Q-S3-002)
- [ ] **2. Data source:** Derive ledger from transfers in seed data (Q-S3-001, Q-S3-011)
- [ ] **3. Must-have scope:** 10 items listed in Section 11A
- [ ] **4. Visibility rules:** Downward-only hierarchy, Outlet can see source/destination names (Q-S3-003)
- [ ] **5. Deferred items:** Cost/value, export, actor names, before/after qty, write operations (Section 11C)
- [ ] **6. Before/After quantity handling:** Show "—" or defer columns (Q-S3-004)
- [ ] **7. Status scope:** All statuses in Transfer History (Q-S3-005)
- [ ] **8. Future movement types:** Disabled filter options with "Coming Soon" for adjustment/wastage/sales (Q-S3-009, Q-S3-010)

---

## 17. Recommended Next Agent

### `Central Inventory Slice 3 Implementation Planning Agent`

Only after owner approves this planning document.

The implementation planning agent should:

1. Inspect current code to identify exact file targets and line ranges
2. Plan the new `HistoryLedger.jsx` screen component
3. Plan seed data enhancements (`derive_stock_ledger()` function)
4. Plan server.py endpoint enhancements (filter params, restaurant types in history response)
5. Plan API service additions (`getStockLedger()` or derive client-side)
6. Plan route and sidebar additions (`App.js`, `screenVisibility.js`)
7. Create file target map with line-level change descriptions
8. Create acceptance criteria per item
9. Create implementation-order recommendation
10. Produce implementation plan document

---

*End of Slice 3 Planning Document*
