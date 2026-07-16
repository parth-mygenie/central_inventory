# Mobile & Desktop Responsiveness Review

> **Date:** 2026-06-01
> **Reference:** UI/UX Final Design Review Report
> **Tested Breakpoints:** Desktop (1200px+), Tablet (900-1200px), Mobile (<900px)

---

## 1. Global Responsive Patterns Found

All 9 preview files share the same `@media(max-width:900px)` breakpoint with these consistent behaviors:

| Behavior | Applied? | Notes |
|----------|:--------:|-------|
| Sidebar hidden | YES | All files: `.sidebar { display: none; }` |
| Content padding reduced | YES | Most files: `16px` on mobile vs `20px 28px` on desktop |
| 4-col grid → 2-col | YES | Priority cards, stat rows |
| 2-col grid → 1-col | YES | Store grid, from/to cards, footer layout |
| Tables responsive | **PARTIAL** | Tables retain all columns — need overflow wrapper |

---

## 2. Desktop Review (1200px+)

| Preview | Max-Width | Desktop Rating | Notes |
|---------|:---------:|:--------------:|-------|
| A1 Hub | 1200px | EXCELLENT | All sections well-spaced, cards scan easily |
| B1 Request | 1100px | GOOD | Items table with 7 columns fits well |
| B2 Queues | 1100px | EXCELLENT | Card-based layout very comfortable |
| B3 Detail | 1000px | GOOD | Narrower max-width, but content fits |
| B5 Dispatch | 1100px | GOOD | Needs table 7 cols comfortable at 1100px |
| B6/B7/B8 | 1100px | EXCELLENT | Modal sizing appropriate |
| C Operations | 1100px | NEEDS WORK | C3 invoice table (9 cols) tight even at 1100px |
| D Visibility | 1200px | GOOD | D1 table (9 cols) fits at 1200px |
| E Config | 1200px | EXCELLENT | Clean layout throughout |

### Desktop Issues Found

| # | Screen | Issue | Severity |
|---|--------|-------|:--------:|
| DT-01 | C3 Upload Invoice | 9-column table with inline inputs clips at <1200px | HIGH |
| DT-02 | C3 Manual Entry | 11-column table with inline inputs clips at <1100px | HIGH |
| DT-03 | D1 Inventory | 9-column table tight at 1024px tablet landscape | MEDIUM |

---

## 3. Mobile Review (<900px)

### What Works Well on Mobile

| Feature | Assessment |
|---------|-----------|
| Sidebar collapse | Correct — hides completely |
| Priority KPI cards | 2-col grid is appropriate |
| Next Best Action banners | Full-width, readable |
| Store health cards | Single column, appropriate |
| Quick actions grid | 2-col on mobile — appropriate |
| Activity feed | Linear, works well |
| Form layouts | 1-col stacking via `form-row` |
| Modal content | Naturally constrained by modal width |

### Mobile Issues Found

| # | Screen | Issue | Impact | Fix |
|---|--------|-------|:------:|-----|
| MB-01 | B1, B5, D1, C3, E3 | Multi-column tables overflow without scroll | HIGH | Add `overflow-x: auto` wrapper |
| MB-02 | B7 Receive Dialog | 2-col input grid (Accepted/Rejected) too cramped at 320px | MEDIUM | Stack to 1-col on mobile |
| MB-03 | B2 Card footer | 4 buttons may wrap awkwardly on 375px screens | LOW | Already has `flex-wrap`, but test gap sizing |
| MB-04 | All screens | 9-10px text (meta, badge text) may be below comfortable reading size | LOW | Set minimum 11px on mobile for readability |
| MB-05 | B8 Dispute | Accept/Reject impact cards side-by-side won't fit at 375px | LOW | Stack on mobile (already partially handled) |
| MB-06 | C3 Procurement | Upload zone + template panel side-by-side layout collapses, but inline inputs in review table still overflow | HIGH | Table overflow wrapper essential |
| MB-07 | A1 Expiry Scan | Table columns (Item, Batch, Qty, Expires, Days Left, Action) may overflow | MEDIUM | Add overflow-x wrapper |

---

## 4. Tablet Review (900px - 1200px)

This is the transitional zone. At 900px, the sidebar disappears (mobile breakpoint triggers), but tables still have desktop column counts.

| Concern | Screens Affected | Fix |
|---------|-----------------|-----|
| Tables with 7+ columns overflow | B1, B5, D1, C3, C4 | `overflow-x: auto` on table wrapper |
| Content max-width (1100-1200px) works well at 1024px | All | No change needed |
| Card layouts comfortable | All | No change needed |

---

## 5. Responsive Recommendations by Priority

### MUST HAVE (Block implementation if missing)

| # | Recommendation | Screens |
|---|---------------|---------|
| R-01 | Add `overflow-x: auto` wrapper to all tables with 6+ columns | B1, B3, B5, C3, C4, D1, D3, E2, E3, E8 |

### SHOULD HAVE (Implement during Sprint A/B/C)

| # | Recommendation | Screens |
|---|---------------|---------|
| R-02 | Stack B7 receive inputs to 1-col on mobile | B7 |
| R-03 | Stack B8 impact cards to 1-col on mobile | B8 |
| R-04 | Set minimum 11px body font on mobile | Global |

### COULD HAVE (Polish phase)

| # | Recommendation | Screens |
|---|---------------|---------|
| R-05 | Add touch-friendly tap targets (44px min) for small buttons on mobile | All |
| R-06 | Consider horizontal card scroll for B2 approval inbox on mobile (swipe between cards) | B2 |

### DEFER (Future phase)

| # | Recommendation | Reason |
|---|---------------|--------|
| R-07 | C3 procurement table: freeze first column on scroll | Complex CSS, low priority |
| R-08 | Native date picker replacement on mobile | Platform handles natively |

---

## 6. Summary

| Category | Verdict |
|----------|---------|
| Desktop (1200px+) | READY — 1 screen needs attention (C3) |
| Tablet (900-1200px) | READY — table overflow wrapper needed |
| Mobile (<900px) | CONDITIONAL — tables need scroll wrappers, 2 modal layouts need stacking |
| Overall Responsive | **IMPLEMENTATION-READY** with overflow-x fix applied globally |

The responsive foundation is solid. The single biggest gap is **table horizontal scroll** — a global 1-line CSS fix that should be applied to the table wrapper component during implementation.
