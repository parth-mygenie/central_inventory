# Central Inventory Slice 3 — Planning Handover

> **Date:** 20 May 2026
> **From:** Senior Slice 3 Planning Agent
> **To:** Owner / Slice 3 Implementation Planning Agent

---

## 1. Planning Document Path

`/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_3_HISTORY_LEDGER_PLANNING.md`

---

## 2. Recommended Scope

### Must Have (10 items)
1. History & Ledger screen with two tabs (new route `/history`)
2. Transfer History tab (full transfer list with rich filtering)
3. Stock Ledger tab (item-level movements derived from transfers)
4. Date range filter (reuse Slice 2 DateRangePicker)
5. Status filter (Transfer History)
6. Movement type filter (Stock Ledger)
7. Direction filter (Incoming/Outgoing/All)
8. Search by Transfer ID / item name
9. Role-based visibility enforcement
10. Transfer Detail linkage (clickable rows → `/transfer/:id`)

### Should Have (5 items)
11. Store/context filter dropdown
12. Reason/note display in ledger
13. Ledger reference detail fallback
14. Empty/loading/error state polish
15. Pagination

### Deferred (10+ items)
CSV/PDF export, KPI dashboard, Cost/value reporting, Write operations, Real-time updates, Sales consumption entries, Audit log, Before/after quantity (pending real API), Actor/user names (no API), Adjustment/wastage entries (no write API).

---

## 3. Owner Questions (11 total)

| # | Question | Recommended | Impact |
|---|----------|-------------|--------|
| Q-S3-001 | Derive ledger from transfers or wait for API? | C (derive now, replace later) | BLOCKS Stock Ledger |
| Q-S3-002 | One screen with tabs or two screens? | A (one screen, two tabs) | Screen structure |
| Q-S3-003 | Can Outlet see source/dest names? | A (yes) | Column display |
| Q-S3-004 | Show before/after quantity? | B (show "—" with seed) | Column structure |
| Q-S3-005 | All statuses or only completed? | A (all statuses) | Filter defaults |
| Q-S3-006 | Exclude cost/value from Slice 3? | A (yes, defer) | Scope control |
| Q-S3-007 | Show actor/user names? | D (defer) | Column decision |
| Q-S3-008 | Include export in Slice 3? | C (defer to Reports) | Scope control |
| Q-S3-009 | Hide sales consumption entries? | C (disabled filter option) | Filter design |
| Q-S3-010 | Show adjustment/wastage if data exists? | C (disabled filter option) | Filter design |
| Q-S3-011 | Use seed data for ledger? | A (yes, derive from transfers) | BLOCKS implementation |

**Critical questions (block implementation):** Q-S3-001, Q-S3-002, Q-S3-011

---

## 4. Data Dependencies

| Data | Available? | Action Needed |
|------|-----------|---------------|
| Transfer history | YES (seed + endpoint) | Add restaurant types to history response |
| Stock ledger entries | NO — must derive | Create `derive_stock_ledger()` in seed_data.py |
| Store hierarchy | YES | No change |
| Item names | YES | No change |
| Date/status filtering | PARTIAL | Add filter support to seed_data endpoints |
| Before/after quantity | NO | Defer or synthesize |
| Actor names | NO | Defer |

---

## 5. Approval Required

Owner must approve:
1. Screen structure (one screen, two tabs)
2. Must-have scope (10 items)
3. Data source (derive ledger from transfers)
4. Visibility rules (downward-only)
5. Deferred items list
6. Before/after quantity handling

---

## 6. Reusable Assets from Slice 2

| Asset | Path | Reuse in Slice 3 |
|-------|------|------------------|
| DateRangePicker | `src/components/common/DateRangePicker.jsx` | Both tabs |
| formatTimestamp() | `src/lib/formatters.js` | All date columns |
| mapRestaurantType() | `src/lib/terminology.js` | Store badges |
| STATUS_CONFIG | `src/lib/terminology.js` | Status badges |
| StoreTypeBadge | `src/components/common/Badges.jsx` | Store columns |
| Tab pattern | `PendingQueues.jsx` | Tab container pattern |
| Skeleton loading | Existing in PendingQueues/OperationsHub | Loading states |

---

## 7. Next Agent Recommendation

**`Central Inventory Slice 3 Implementation Planning Agent`**

Only after owner approves the planning document and answers critical questions (Q-S3-001, Q-S3-002, Q-S3-011 minimum).

---

*End of Planning Handover*
