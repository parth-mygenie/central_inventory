# CR-033 — Artifact 1: Intake (Action Screens Audit)

> **Date:** 2026-06-13
> **Scope:** Direct Dispatch, Request Stock, Stock Adjustment, Wastage Entry, Transfer Detail

---

## Screen 1: Direct Dispatch (`/dispatch/new`)

### What's Working ✅
- Coverage selector (3/7/10/30 days) — CR-025 Intelligent PO
- Destination store dropdown with hierarchy
- Integrated dispatch table with inline source segment picker
- "You'll retain X%" projection per item
- Duplicate dispatch warning (checks today's transfers)
- Review section before submit
- Post-submit confirmation with PostSubmitConfirmation
- Store health strip for destination
- Role-gating: only stores that can initiate dispatch

### Issues Found ⚠️
| # | Issue | Severity |
|---|-------|----------|
| A-1 | **FROM field shows "—"** on Transfer Detail when viewed by recipient — source store name missing | MEDIUM |
| A-2 | No multi-select for items — must add items one-by-one beyond suggestions | LOW |
| A-3 | "Create Dispatch" button text doesn't match action well — should be "Send Dispatch" or "Dispatch Stock" | LOW |

---

## Screen 2: Request Stock (`/request/new`)

### What's Working ✅
- CR-025 Intelligent PO: coverage selector, consumption-based ordering
- 4 KPIs: Need Ordering (10), Partially Covered (0), Fully Covered (2), In This PO (0)
- Source selector "german fluid (Central Store) — Direct Parent"
- "4 pending requests with this source" warning
- Suggested vs Manual mode toggle
- Category-grouped suggested items
- Source cross-validation
- Post-submit confirmation

### Issues Found ⚠️
| # | Issue | Severity |
|---|-------|----------|
| A-4 | **Suggested items area shows skeleton loading cards** but no actual items rendered despite 10 "Need Ordering" | MEDIUM — items may be loading indefinitely or filtered out |
| A-5 | Request Stock only available to outlets/children — Central Store can't request (correct behavior, but no guidance text for Central users) | LOW |

---

## Screen 3: Stock Adjustment (`/adjustment/new`)

### What's Working ✅
- Two-mode selector: Increase / Decrease
- Item dropdown from inventory master
- Quantity + Unit input
- Reason selector with predefined reasons + "Other" freetext
- Source Selector for FEFO segment selection (decrease mode)
- Confirmation dialog before submit
- Permission gate: `adjust-stock` action required
- Warning: "Wastage records are permanent" note

### Issues Found ⚠️
| # | Issue | Severity |
|---|-------|----------|
| A-6 | **No current stock context shown** — when selecting an item, doesn't show current stock level or what it will become after adjustment | MEDIUM |
| A-7 | **No after-adjustment projection** — Phase 7 Freeze (C-1) specifies "after-adjustment projection" | MEDIUM |
| A-8 | Form is very basic — single item only, no multi-line adjustment | LOW |

---

## Screen 4: Wastage Entry (`/wastage/new`)

### What's Working ✅
- Item dropdown from inventory master
- Quantity + Unit input
- Reason dropdown from `getWastageReasons()` API with "Other" freetext
- Source Selector for FEFO segment selection
- Confirmation dialog before submit
- Permission gate: `record-wastage` action required
- "Wastage records are permanent" warning note

### Issues Found ⚠️
| # | Issue | Severity |
|---|-------|----------|
| A-9 | **No wastage-this-month context** — Phase 7 Freeze (C-2) specifies showing "Wastage-this-month context" | MEDIUM |
| A-10 | **No anomaly detection** — Phase 7 Freeze (C-2): "anomaly detection" if wastage qty is unusually high | MEDIUM |
| A-11 | **No after-wastage projection** — Phase 7 Freeze (C-2): "after-wastage projection" | MEDIUM |
| A-12 | Form nearly identical to Stock Adjustment (Decrease) — could be confusing. Different screens for similar actions. | LOW |

---

## Screen 5: Transfer Detail (`/transfer/:id`)

### What's Working ✅
- Reference code header (TRF-806-2026-0013) with status badge
- Status timeline: Dispatched → Received with relative timestamps
- Total lifecycle time display ("Total lifecycle: < 1 hour")
- FROM / TO cards with store names and type badges
- Transfer ID, Status, Created, Updated metadata
- Resolution Details section (Accepted/Rejected/Damaged/Returned counts)
- Line Items table with Item, Qty, Unit
- P16 line-level breakdown (Requested/Approved/Hold/Cancelled/Dispatched)
- Contextual action buttons based on status (Approve, Dispatch, Receive, Reject, Cancel)
- Requester Store Snapshot (stock health table)
- Approval Impact summary
- Status Timeline with duration between steps
- Dispute Resolution dialog

### Issues Found ⚠️
| # | Issue | Severity |
|---|-------|----------|
| A-13 | **FROM shows "—"** when source store name isn't resolved — same as A-1 | MEDIUM |
| A-14 | Transfer Detail is 857 lines — very large component, could benefit from splitting into sub-components | LOW (code quality) |

---

## Summary: Prioritized Fix List

| Priority | ID | Screen | Issue | Effort |
|----------|-----|--------|-------|--------|
| MEDIUM | A-4 | Request Stock | Suggested items not rendering despite "10 Need Ordering" | 2h (investigate) |
| MEDIUM | A-6 | Stock Adjustment | No current stock context when selecting item | 1h |
| MEDIUM | A-7 | Stock Adjustment | No after-adjustment projection | 1h |
| MEDIUM | A-9 | Wastage Entry | No wastage-this-month context | 2h |
| MEDIUM | A-10 | Wastage Entry | No anomaly detection for high wastage | 2h |
| MEDIUM | A-11 | Wastage Entry | No after-wastage projection | 1h |
| MEDIUM | A-1/13 | Dispatch/Transfer Detail | FROM store name shows "—" | 1h |
| LOW | A-2 | Dispatch | No multi-select for items | 2h |
| LOW | A-3 | Dispatch | Button text "Create Dispatch" → "Dispatch Stock" | 5min |
| LOW | A-5 | Request Stock | No guidance for Central Store users | 15min |
| LOW | A-8 | Stock Adjustment | Single-item only, no multi-line | 3h |
| LOW | A-12 | Wastage | Very similar to Stock Adj (Decrease) — consider merging UX | 4h |
| LOW | A-14 | Transfer Detail | 857 lines — split into sub-components | 3h |

### Not Yet Covered (separate future CRs)
- **Returns flow** — no screen, no API (G-006)
- **Store Detail** (`/store/:id`) — drill-down from Store Management
- **Operations Hub** — dashboard screen, separate audit
