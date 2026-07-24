# Step 2: HTML Preview Rebuild Plan

> **Date:** 2026-06-01
> **Reference:** UI/UX Final Design Review Report
> **Status:** CONDITIONAL — Only execute if owner requests visual preview of fixes

---

## Recommendation: SKIP Step 2

The current HTML previews are **implementation-ready**. All issues identified in the review are implementation-time fixes (CSS overflow wrappers, button tokens, accessibility attributes) that don't require preview-level visual changes.

**If the owner approves the review and proceeds to implementation, this document serves as a reference for implementation-time refinements only.**

---

## IF Owner Requests Preview Rebuild

### Scope: Targeted Rebuild Only (2 files max)

| # | Preview | Reason | Estimated Time |
|---|---------|--------|:--------------:|
| 1 | `C_stock_operations.html` | C3 procurement table overflow — add scroll wrapper to demonstrate table responsiveness at 1024px | 30 min |
| 2 | `B2_pending_queues.html` | Add loading skeleton state and error state below the existing empty state — demonstrate all 3 state patterns | 45 min |

### Files NOT requiring rebuild

| Preview | Reason |
|---------|--------|
| A1 Hub | No visual issues. Implementation-time fixes only. |
| B1 Request | Table overflow is a 1-line CSS fix. No visual change needed. |
| B3 Detail | Impact card alignment is minor. Handled during implementation. |
| B5 Dispatch | Same as B1 — table overflow wrapper. |
| B6/B7/B8 Modals | No issues. Excellent as-is. |
| D Visibility | No major issues. Table overflow wrapper during implementation. |
| E Config | No issues. Excellent as-is. |

---

## Implementation-Time Refinements (No Preview Change)

These refinements should be applied during React implementation, not in HTML previews:

### Global CSS Additions

```css
/* GSR-01: Table overflow */
.table-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

/* GSR-02: Button size tokens */
.btn-xs { font-size: 10px; padding: 3px 8px; }
.btn-sm { font-size: 11px; padding: 5px 12px; }
.btn-md { font-size: 12px; padding: 7px 18px; }
.btn-lg { font-size: 14px; padding: 10px 20px; }

/* GSR-03: Accessibility */
*:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
}

/* GSR-04: Mobile minimum text */
@media (max-width: 900px) {
  .badge-s, .stock-label, .sl, .seg-meta {
    font-size: 11px;
  }
}
```

### Component Patterns to Create During Implementation

| Component | Purpose | Used In |
|-----------|---------|---------|
| `TableWrapper` | `<div className="table-wrapper">` around all tables | All screens with tables |
| `LoadingSkeleton` | Pulse animation skeleton for card/table loading | All screens |
| `EmptyState` | Icon + title + description + optional CTA | B2, D1, D3, E2, E3 |
| `ErrorState` | Error message + retry button | All API-consuming screens |

---

## Rebuild Checklist (if executed)

- [ ] Owner confirms rebuild is needed
- [ ] Modify `C_stock_operations.html` — add `overflow-x:auto` wrapper to C3 tables
- [ ] Modify `B2_pending_queues.html` — add loading skeleton and error state examples
- [ ] Verify no other previews are changed
- [ ] Update `APPROVED_PREVIEW_SCREENSHOT_INDEX.md` with rebuild date
- [ ] Notify owner for re-review

---

## Decision Matrix

| If Owner Says... | Action |
|-------------------|--------|
| "Looks good, proceed to implementation" | Skip Step 2 entirely. Apply refinements during Sprint A. |
| "I want to see the table scroll fix" | Rebuild C_stock_operations.html only (~30 min) |
| "I want to see loading/error states" | Rebuild B2_pending_queues.html only (~45 min) |
| "Rebuild everything" | All 9 files (~4 hours). NOT RECOMMENDED — same visual outcome, more work. |

---

*This plan ensures minimum disruption to the implementation timeline while addressing all review findings.*
