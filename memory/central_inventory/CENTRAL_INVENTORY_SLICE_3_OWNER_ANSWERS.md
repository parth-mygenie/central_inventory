# Central Inventory Slice 3 Owner Answers

> **Created:** 20 May 2026
> **Last Updated:** 20 May 2026
> **Total Questions:** 11
> **Answered:** 11/11

---

## 1. Answer Status

### `all_answers_recorded_owner_approved`

---

## 2. Source Planning Docs

| # | Document | Path | Reviewed |
|---|----------|------|----------|
| 1 | Slice 3 Planning | `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_3_HISTORY_LEDGER_PLANNING.md` | YES |
| 2 | Slice 3 Handover | `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_3_PLANNING_HANDOVER.md` | YES |

---

## 3. Batch 1 Questions — Q-S3-001 to Q-S3-006

### Q-S3-001: Stock Ledger Data Source
- **Question:** What should be the Stock Ledger data source for Slice 3?
- **Options:** A. Derive from transfers | B. Wait for API | C. Show Transfer History only, defer Ledger | D. Decide later
- **Recommended:** A
- **Owner Answer:** **A**
- **Final Decision:** Derive Stock Ledger from transfer data for Slice 3
- **Impact:** Stock Ledger tab UNBLOCKED — proceed with transfer-derived ledger entries
- **Status:** answered

### Q-S3-002: Screen Structure
- **Question:** What screen structure should Slice 3 use?
- **Options:** A. One screen, two tabs | B. Two separate screens | C. Inside Pending Queues | D. Decide later
- **Recommended:** A
- **Owner Answer:** **A**
- **Final Decision:** One "History & Ledger" screen with two tabs (Transfer History + Stock Ledger) at route `/history`
- **Impact:** Screen structure CONFIRMED — single route, single nav item, two tabs
- **Status:** answered

### Q-S3-003: Outlet Visibility of Parent Store Names
- **Question:** Should Outlet users see source/destination store names when those names refer to Master or Central?
- **Options:** A. Yes, show names | B. Generic labels | C. Hide parent names | D. Decide later
- **Recommended:** A
- **Owner Answer:** **A**
- **Final Decision:** Outlet users can see source/destination names as part of the transfer record. Hierarchy BROWSING remains restricted (Outlet cannot navigate to parent stores).
- **Impact:** Column display rules finalized — show real store names for all roles
- **Status:** answered

### Q-S3-004: Transfer History Status Scope
- **Question:** Which transfer statuses should appear in Transfer History?
- **Options:** A. All statuses | B. Only completed | C. Only dispatched+received | D. Decide later
- **Recommended:** A
- **Owner Answer:** **A**
- **Final Decision:** Transfer History shows ALL statuses (requested, approved, dispatched, partially_received, received, rejected, cancelled) for complete traceability
- **Impact:** Filter defaults finalized — no status exclusion, all 7 statuses in filter
- **Status:** answered

### Q-S3-005: Cost/Value Exclusion
- **Question:** Should cost/value fields be excluded from Slice 3?
- **Options:** A. Yes, exclude | B. Show to Central only | C. Show to Central+Master | D. Decide later
- **Recommended:** A
- **Owner Answer:** **A**
- **Final Decision:** Exclude ALL cost/value fields from Slice 3. Defer to future Reports slice with proper permissions.
- **Impact:** No cost columns in Transfer History or Stock Ledger
- **Status:** answered

### Q-S3-006: Export Deferral
- **Question:** Should export features be deferred from Slice 3?
- **Options:** A. Yes, defer | B. CSV only | C. CSV + PDF | D. Decide later
- **Recommended:** A
- **Owner Answer:** **A**
- **Final Decision:** Defer CSV/PDF export to a future Reports slice. Slice 3 is read-only traceability only.
- **Impact:** No export buttons in Slice 3
- **Status:** answered

---

## 4. Batch 2 Questions — Q-S3-007 to Q-S3-011

### Q-S3-007: Actor/User Names
- **Question:** Should actor/user names be shown in Transfer History and Stock Ledger if available?
- **Options:** A. Yes | B. Timestamps only | C. Central+Master only | D. Decide later
- **Recommended:** A
- **Owner Answer:** **A**
- **Final Decision:** Show actor/user names if available in data. If name is not resolved (only numeric ID), use fallback display.
- **Impact:** Actor column included in Transfer History and Stock Ledger where data is available
- **Status:** answered

### Q-S3-008: Sales Consumption Entries
- **Question:** Should sales consumption entries be hidden until recipe/write integration is ready?
- **Options:** A. Yes, hide | B. Show placeholder | C. Show if available | D. Decide later
- **Recommended:** A
- **Owner Answer:** **A**
- **Final Decision:** Hide sales consumption entries until recipe/write integration is ready. Do not fake or placeholder consumption data.
- **Impact:** Stock Ledger will NOT show sales consumption movement type in Slice 3
- **Status:** answered

### Q-S3-009: Adjustment/Wastage Entries
- **Question:** Should adjustment and wastage entries appear if already present in data?
- **Options:** A. Yes, show | B. Hide until write screens built | C. Show adjustment only | D. Decide later
- **Recommended:** A
- **Owner Answer:** **A**
- **Final Decision:** Show adjustment and wastage entries in Stock Ledger if they are already present in read data. Read-only display — no write actions introduced.
- **Impact:** Ledger movement-type filter includes adjustment/wastage. Currently no such data in seed, but will render correctly when real API provides it.
- **Status:** answered

### Q-S3-010: Before/After Quantity
- **Question:** Should before/after stock quantity be shown only if backend/source data provides it?
- **Options:** A. Show when available, fallback otherwise | B. Calculate on frontend | C. Hide entirely in Slice 3 | D. Decide later
- **Recommended:** A
- **Owner Answer:** **A**
- **Final Decision:** Show before/after quantity ONLY when backend/source data provides it. Use "—" fallback when not available. Do NOT calculate on frontend (risk of inaccuracy).
- **Impact:** Ledger columns include before_qty and after_qty with safe fallback. Seed data will show "—" for these fields.
- **Status:** answered

### Q-S3-011: Seed/Local Data Usage
- **Question:** Can Slice 3 use current seed/local data where backend APIs are not ready?
- **Options:** A. Yes | B. Wait for APIs | C. Seed for demo only | D. Decide later
- **Recommended:** A
- **Owner Answer:** **A**
- **Final Decision:** Yes, use current seed/local data where backend APIs are not ready. Slice 3 is read-only and can progress while write/ledger APIs are blocked.
- **Impact:** Implementation UNBLOCKED — proceed with seed-derived data for Transfer History and Stock Ledger
- **Status:** answered

---

## 5. Final Slice 3 Decisions

All 11 questions answered. Owner selected recommended answer (A) for all questions.

| Decision Area | Final Decision |
|--------------|---------------|
| **Screen structure** | One "History & Ledger" screen with two tabs (Transfer History + Stock Ledger) at route `/history` |
| **Ledger data source** | Derive from transfer data in seed. Replace with real API when available. |
| **Seed/local data usage** | Yes — use seed data where backend APIs are not ready |
| **Outlet visibility** | Outlet can see source/destination store names. Hierarchy browsing remains restricted. |
| **Status scope** | All 7 statuses in Transfer History (requested, approved, dispatched, partially_received, received, rejected, cancelled) |
| **Cost/value** | EXCLUDED from Slice 3. Deferred to future Reports slice. |
| **Export** | DEFERRED to future Reports slice. No CSV/PDF in Slice 3. |
| **Actor/user names** | Show if available in data. Fallback for unresolved IDs. |
| **Sales consumption** | HIDDEN until recipe/write integration is ready |
| **Adjustment/wastage** | Show in ledger if present in read data. Read-only display. |
| **Before/after quantity** | Show only when backend provides. Use "—" fallback. No frontend calculation. |

### Items Confirmed for Slice 3 Must-Have (10)
1. History & Ledger screen with two tabs (route `/history`)
2. Transfer History tab (all statuses, all visible transfers)
3. Stock Ledger tab (derived from transfer data)
4. Date range filter (reuse DateRangePicker)
5. Status filter (all 7 statuses)
6. Movement type filter (transfer-derived types + adjustment/wastage if data exists)
7. Direction filter (Incoming/Outgoing/All)
8. Search by Transfer ID / item name
9. Role-based visibility enforcement (downward-only)
10. Transfer Detail linkage (clickable rows → `/transfer/:id`)

### Items Confirmed Deferred
- Cost/value columns
- CSV/PDF export
- Sales consumption entries
- KPI dashboard
- Write operations
- Real-time updates

---

## 6. Owner Approval Summary

**All 11 Slice 3 planning questions have been answered.**

Owner approval is requested for the following before implementation planning begins:

1. **Screen structure:** One "History & Ledger" screen with two tabs ✓ (Q-S3-002: A)
2. **Route:** `/history` ✓
3. **Must-have scope:** 10 items (listed above) ✓
4. **Should-have scope:** 5 items (store filter, reason display, reference fallback, state polish, pagination) ✓
5. **Stock Ledger data source:** Derive from transfer data ✓ (Q-S3-001: A, Q-S3-011: A)
6. **Transfer History visibility:** All statuses, all roles see own downward hierarchy ✓ (Q-S3-004: A)
7. **Outlet visibility:** Can see source/dest names, hierarchy browsing restricted ✓ (Q-S3-003: A)
8. **Deferred items:** Cost/value, export, sales consumption, KPI ✓ (Q-S3-005: A, Q-S3-006: A, Q-S3-008: A)
9. **Before/after quantity:** Show when available, "—" fallback ✓ (Q-S3-010: A)
10. **Actor names:** Show when available ✓ (Q-S3-007: A)

**Next step:** Owner explicitly approves → trigger `Central Inventory Slice 3 Implementation Planning Agent`

---

*End of Slice 3 Owner Answers*
0 May 2026**
- All 11 answers confirmed
- Scope approved: 10 must-have + 5 should-have
- Constraint: Planning only — no code modification
- Ready for: `Central Inventory Slice 3 Implementation Planning Agent`

---

*End of Slice 3 Owner Answers*
