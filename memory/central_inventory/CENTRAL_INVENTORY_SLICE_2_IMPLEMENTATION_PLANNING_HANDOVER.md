# Central Inventory Slice 2 — Implementation Planning Handover

> **Date:** 19 May 2026

## 1. Planning Document

`/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_2_IMPLEMENTATION_PLAN.md`

## 2. Approved Scope (12 items)

1. Ready to Dispatch tab (Q1: B)
2. Status timeline on Transfer Detail
3. Line-level accept/reject display
4. Timestamp formatting (date-fns)
5. Resolution reason display
6. Date range picker on Hierarchy Summary
7. Contextual action buttons by role + status (Q5: A)
8. Items count column in Pending Queues
9. Store name fix (validate existing fix)
10. Downward-only hierarchy visibility (Q2: A)
11. Context selector updates hub in-place (Q3: B)
12. Remove KPI placeholder (Q4: B)

## 3. File Targets (14 files)

- **4 NEW files:** `formatters.js`, `transferActions.js`, `StatusTimeline.jsx`, `DateRangePicker.jsx`
- **10 MODIFIED files:** `seed_data.py`, `server.py`, `OperationsHub.jsx`, `ContextSelector.jsx`, `PendingQueues.jsx`, `TransferDetail.jsx`, `HierarchySummary.jsx`, `StoreDetail.jsx`, `screenVisibility.js` (if needed), `useLoginContext.js` (validation only)

## 4. Key Risks

- HIGH: Contextual action matrix must match freeze exactly (role + status combinations)
- HIGH: Context selector in-place hub update must not break default behavior
- MEDIUM: Hierarchy downward-only filter must not break Central's full view
- MEDIUM: Date filtering with seed data (dates shift on restart)

## 5. Owner Approval Required

Owner must approve before implementation:
- [ ] 12-item scope
- [ ] Role + Status action matrix (Section 8)
- [ ] Hierarchy visibility matrix (Section 9)
- [ ] Smoke checklist (Section 13)

## 6. Next Agent

`Central Inventory Slice 2 Implementation Agent` — trigger only after owner approval.

---

*End of Handover*
