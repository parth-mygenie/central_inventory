# Screen-by-Screen UI Change Matrix

> **Date:** 2026-06-01
> **Reference:** UI/UX Final Design Review Report
> **Priority Key:** MH = Must Have, SH = Should Have, CH = Could Have, DF = Defer

---

## Flow A — Operations Hub

### A1: Operations Hub (`A1_operations_hub.html`)

| # | Issue | Recommended Change | Scope | Visual/UX | Mobile | Desktop | Priority | Owner? |
|---|-------|-------------------|:-----:|:---------:|:------:|:-------:|:--------:|:------:|
| A1-01 | Expiry scan table has no scroll wrapper | Add `overflow-x:auto` wrapper | Global | Visual | Yes | No | SH | No |
| A1-02 | Quick Actions grid labels could have icons | Add subtle icon per action (lucide-react) | Screen | Visual | Minor | Minor | CH | No |

**Overall Assessment:** Excellent. Strong visual hierarchy. NBA banners are immediately actionable. Store health grid scans well. No crowding.

---

## Flow B — Transfer Lifecycle

### B1: Request Stock (`B1_request_stock.html`)

| # | Issue | Recommended Change | Scope | Visual/UX | Mobile | Desktop | Priority | Owner? |
|---|-------|-------------------|:-----:|:---------:|:------:|:-------:|:--------:|:------:|
| B1-01 | Items table with 7 columns — tight on <1100px | Add overflow-x wrapper | Global | Visual | Yes | Minor | MH | No |
| B1-02 | Mode bar ("Suggested Reorder" / "Manual Request") — good | No change recommended | — | — | — | — | — | — |

**Overall Assessment:** Clean. Intelligent PO flow is intuitive. Category grouping works. Source availability + own stock context is clear. Footer summary/submit layout is solid.

### B2: Pending Queues (`B2_pending_queues.html`)

| # | Issue | Recommended Change | Scope | Visual/UX | Mobile | Desktop | Priority | Owner? |
|---|-------|-------------------|:-----:|:---------:|:------:|:-------:|:--------:|:------:|
| B2-01 | Card footer actions: 4 buttons (Reject, View, Partial, Approve) may wrap oddly on tablet | Ensure flex-wrap with consistent gap | Screen | Visual | Yes | No | SH | No |
| B2-02 | Empty state is defined (good) | No change recommended | — | — | — | — | — | — |

**Overall Assessment:** Excellent. Card-based inbox is a major upgrade from table view. Fulfillment verdict is immediately scannable. Age badges with left-border accent give instant priority sense. Requester health strip contextualizes urgency.

### B3: Transfer Detail (`B3_transfer_detail.html`)

| # | Issue | Recommended Change | Scope | Visual/UX | Mobile | Desktop | Priority | Owner? |
|---|-------|-------------------|:-----:|:---------:|:------:|:-------:|:--------:|:------:|
| B3-01 | Requester Store Snapshot table has 6 columns | Add overflow-x wrapper | Global | Visual | Yes | No | MH | No |
| B3-02 | Impact card alignment — header columns (Requested/Your Stock/After) use inline gap:40px | Use a proper grid or table for alignment | Screen | Visual | No | Minor | SH | No |

**Overall Assessment:** Very strong. Dual stock context (yours + requester's) is immediately clear. Impact summary card is the standout element. Action explanations are helpful. Disabled explanation for wrong role is a good UX touch.

### B5: Direct Dispatch (`B5_direct_dispatch.html`)

| # | Issue | Recommended Change | Scope | Visual/UX | Mobile | Desktop | Priority | Owner? |
|---|-------|-------------------|:-----:|:---------:|:------:|:-------:|:--------:|:------:|
| B5-01 | Destination needs table has 7 columns with segment selector | Add overflow-x wrapper | Global | Visual | Yes | Minor | MH | No |
| B5-02 | Segment selector inline (dropdown + FEFO badge) may clip | Ensure FEFO badge wraps below on narrow | Screen | Visual | Yes | No | CH | No |

**Overall Assessment:** Strong. Auto-detect needs is the key intelligence win. FEFO badges on segment selectors are clear. Duplicate dispatch warning is useful.

### B6: Source Selector (`B6_B7_B8_modals.html`, section 1)

| # | Issue | Recommended Change | Scope | Visual/UX | Mobile | Desktop | Priority | Owner? |
|---|-------|-------------------|:-----:|:---------:|:------:|:-------:|:--------:|:------:|
| — | No issues found | No change recommended | — | — | — | — | — | — |

**Overall Assessment:** Clean modal. Radio-style segment list is intuitive. FEFO badges and expiry warnings are clear. Expired segments are visually greyed out and blocked. "Remaining after" display is a nice touch.

### B7: Receive Dialog (`B6_B7_B8_modals.html`, section 2)

| # | Issue | Recommended Change | Scope | Visual/UX | Mobile | Desktop | Priority | Owner? |
|---|-------|-------------------|:-----:|:---------:|:------:|:-------:|:--------:|:------:|
| B7-01 | 2-column input grid (Accepted/Rejected) may be cramped on 320px mobile | On mobile, stack to 1-column | Screen | UX | Yes | No | SH | No |
| B7-02 | Resolution type explanation box — helpful | No change recommended | — | — | — | — | — | — |

**Overall Assessment:** Good. Dispatch-vs-request comparison is useful. Partial receive summary is clear. Character counter for resolution note is a good validation indicator.

### B8: Dispute Resolution (`B6_B7_B8_modals.html`, section 3)

| # | Issue | Recommended Change | Scope | Visual/UX | Mobile | Desktop | Priority | Owner? |
|---|-------|-------------------|:-----:|:---------:|:------:|:-------:|:--------:|:------:|
| B8-01 | Impact cards (Accept/Reject) side-by-side — could collapse on mobile | Stack on mobile | Screen | Visual | Yes | No | CH | No |

**Overall Assessment:** Clean and minimal. Two-option card selection is intuitive. Issue summary display in amber is clear.

---

## Flow C — Stock Operations

### C1: Stock Adjustment (`C_stock_operations.html`, section 1)

| # | Issue | Recommended Change | Scope | Visual/UX | Mobile | Desktop | Priority | Owner? |
|---|-------|-------------------|:-----:|:---------:|:------:|:-------:|:--------:|:------:|
| — | No issues found | No change recommended | — | — | — | — | — | — |

**Overall Assessment:** Clean form. Stock context strip (current/min/category/after) is clear. Impact box with undo guidance is helpful. FEFO segment pre-selection is logical.

### C2: Wastage Entry (`C_stock_operations.html`, section 2)

| # | Issue | Recommended Change | Scope | Visual/UX | Mobile | Desktop | Priority | Owner? |
|---|-------|-------------------|:-----:|:---------:|:------:|:-------:|:--------:|:------:|
| — | No issues found | No change recommended | — | — | — | — | — | — |

**Overall Assessment:** Good. Wastage anomaly detection ("3.2x above avg") is immediately visible. Undo guidance is clear.

### C3: Procurement (`C_stock_operations.html`, section 3)

| # | Issue | Recommended Change | Scope | Visual/UX | Mobile | Desktop | Priority | Owner? |
|---|-------|-------------------|:-----:|:---------:|:------:|:-------:|:--------:|:------:|
| C3-01 | Upload invoice extracted data table: 9 columns with inline inputs — overflows on < 1200px | Add overflow-x wrapper + freeze first column (Item) if possible | Screen | UX | Yes | Yes | MH | No |
| C3-02 | Manual entry table: 11 columns — same issue | Add overflow-x wrapper | Screen | UX | Yes | Yes | SH | No |
| C3-03 | Tab toggle uses inline onclick JS | Replace with proper tab component during implementation | Screen | UX | No | No | DF | No |

**Overall Assessment:** Most complex screen. The 3-mode procurement (Upload + Excel + Manual) is well-structured. Match confidence indicators (green/amber/red dots) are intuitive. Price comparison warnings are useful. **This screen needs the most responsive attention** due to table complexity.

### C4: Wastage Report (`C_stock_operations.html`, section 4)

| # | Issue | Recommended Change | Scope | Visual/UX | Mobile | Desktop | Priority | Owner? |
|---|-------|-------------------|:-----:|:---------:|:------:|:-------:|:--------:|:------:|
| C4-01 | Missing date range filter and drill-down UI | Add date picker + per-store drill-down during implementation | Screen | UX | Minor | Minor | CH | No |

**Overall Assessment:** Clean report layout. Top wasted items ranking with trend is immediately actionable. Stat cards provide good summary.

---

## Flow D — Stock Visibility

### D1: Stock Inventory Summary (`D_stock_visibility.html`, section 1)

| # | Issue | Recommended Change | Scope | Visual/UX | Mobile | Desktop | Priority | Owner? |
|---|-------|-------------------|:-----:|:---------:|:------:|:-------:|:--------:|:------:|
| D1-01 | Table with 9 columns — needs scroll on mobile | Add overflow-x wrapper | Global | Visual | Yes | No | SH | No |

**Overall Assessment:** Excellent. The new columns (Expiry Risk, Pending In/Out, Days of Cover) add significant operational value. Search + category filter + sort are present. Export CSV button is placed correctly.

### D2: Stock Detail Panel (`D_stock_visibility.html`, section 2)

| # | Issue | Recommended Change | Scope | Visual/UX | Mobile | Desktop | Priority | Owner? |
|---|-------|-------------------|:-----:|:---------:|:------:|:-------:|:--------:|:------:|
| — | No issues found | No change recommended | — | — | — | — | — | — |

**Overall Assessment:** Strong. FEFO batch ordering is clear. "Dispatch first" badge on near-expiry batches is actionable. Expired batch greyed out + "Record Wastage" action is correct. Consumption context with reorder suggestion adds real value.

### D3: History & Ledger (`D_stock_visibility.html`, section 3)

| # | Issue | Recommended Change | Scope | Visual/UX | Mobile | Desktop | Priority | Owner? |
|---|-------|-------------------|:-----:|:---------:|:------:|:-------:|:--------:|:------:|
| D3-01 | Movement type badges (Transfer In, Transfer Out, Adjustment, Wastage) are well-differentiated | No change recommended | — | — | — | — | — | — |
| D3-02 | Date filter uses native date inputs — functional but basic | Consider date range picker component during implementation | Screen | UX | Minor | Minor | DF | No |

**Overall Assessment:** Clean. Movement badges with signed quantities (+/-) make the ledger immediately scannable. PO reference column is present. From/To with store type adds context.

### D4: Status Timeline (`D_stock_visibility.html`, section 4)

| # | Issue | Recommended Change | Scope | Visual/UX | Mobile | Desktop | Priority | Owner? |
|---|-------|-------------------|:-----:|:---------:|:------:|:-------:|:--------:|:------:|
| D4-01 | Timeline may overflow horizontally on mobile | Allow flex-wrap (already present) | Screen | Visual | Minor | No | DF | No |

**Overall Assessment:** Excellent. Relative timestamps, duration between steps, and stale detection are all clearly communicated. The two examples (completed vs stuck) demonstrate both states well.

---

## Flow E — Configuration

### E1: Operational Settings (`E_configuration.html`, section 1)
**Assessment:** No change recommended. Impact badges (High/Medium/Low) per setting are clear. "Affects all stores" warning header is visible.

### E2: Vendor Management (`E_configuration.html`, section 2)
**Assessment:** No change recommended. Last purchase relative time, inactive vendor detection, and avg order value add clear operational context.

### E3-E6: Catalogue (`E_configuration.html`, section 3)
| # | Issue | Recommended Change | Scope | Visual/UX | Mobile | Desktop | Priority | Owner? |
|---|-------|-------------------|:-----:|:---------:|:------:|:-------:|:--------:|:------:|
| E3-01 | "Used in X recipes" + "Pushed to X stores" columns may need scroll on mobile | Add overflow-x wrapper | Global | Visual | Yes | No | CH | No |

**Assessment:** Strong. Cross-reference data ("3 recipes", "4 stores") and unmapped item highlighting are visually clear.

### E7: Daily Consumption Report (`E_configuration.html`, section 4)
**Assessment:** No change recommended. Consumption vs current stock with days-of-cover and trend is well-presented.

### E8: Hierarchy Management (`E_configuration.html`, section 5)
**Assessment:** No change recommended. Push status (Synced/Stale) with "2 items behind" gap indicator is immediately actionable. "Push Now" button is correctly highlighted for stale stores.

---

*No screen requires a full design rethink. All issues are refinements for implementation.*
