# Central Inventory Slice 3 Owner Answers

> **Created:** 20 May 2026
> **Last Updated:** 20 May 2026
> **Total Questions:** 11
> **Answered:** 6/11

---

## 1. Answer Status

### `batch_1_answers_recorded_batch_2_pending`

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
- **Owner Answer:** PENDING
- **Final Decision:** —
- **Impact:** Timeline and audit columns
- **Status:** pending

### Q-S3-008: Sales Consumption Entries
- **Question:** Should sales consumption entries be hidden until recipe/write integration is ready?
- **Options:** A. Yes, hide | B. Show placeholder | C. Show if available | D. Decide later
- **Recommended:** A
- **Owner Answer:** PENDING
- **Final Decision:** —
- **Impact:** Ledger movement types
- **Status:** pending

### Q-S3-009: Adjustment/Wastage Entries
- **Question:** Should adjustment and wastage entries appear if already present in data?
- **Options:** A. Yes, show | B. Hide until write screens built | C. Show adjustment only | D. Decide later
- **Recommended:** A
- **Owner Answer:** PENDING
- **Final Decision:** —
- **Impact:** Ledger movement-type scope
- **Status:** pending

### Q-S3-010: Before/After Quantity
- **Question:** Should before/after stock quantity be shown only if backend/source data provides it?
- **Options:** A. Show when available, fallback otherwise | B. Calculate on frontend | C. Hide entirely in Slice 3 | D. Decide later
- **Recommended:** A
- **Owner Answer:** PENDING
- **Final Decision:** —
- **Impact:** Ledger column structure
- **Status:** pending

### Q-S3-011: Seed/Local Data Usage
- **Question:** Can Slice 3 use current seed/local data where backend APIs are not ready?
- **Options:** A. Yes | B. Wait for APIs | C. Seed for demo only | D. Decide later
- **Recommended:** A
- **Owner Answer:** PENDING
- **Final Decision:** —
- **Impact:** BLOCKS implementation
- **Status:** pending

---

## 5. Final Slice 3 Decisions

*(To be filled after all answers are recorded)*

---

## 6. Owner Approval Summary

*(To be filled after all answers are recorded)*

---

*End of Slice 3 Owner Answers*
