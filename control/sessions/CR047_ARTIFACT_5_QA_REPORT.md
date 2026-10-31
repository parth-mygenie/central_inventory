# CR-047 — QA Report (Artifact 5)

> **Date:** 2026-07-16
> **QA Agent:** QA role
> **Test Environment:** Palm hierarchy — owner@palmcentral.com (master 813) → palm india (816, fresh outlet) + palmbharat (815) + palmruby (814)
> **Tested against:** owner@palmindia.com (franchise 816) — fresh outlet with zero prior pushes

---

## Test Results

| # | Test Case | Result | Evidence |
|---|-----------|:------:|----------|
| TC-1 | Category badges display | **PASS** | palm india: 0/36 (slate), palmbharat: 2/36 (blue), palmruby: 36/36 (green). All correct. |
| TC-2 | Push button opens dialog (NOT direct push) | **PASS** | Clicking Push on palm india opens `CategoryPushDialog`. No immediate push executed. |
| TC-3 | Previously pushed pre-selected (fresh outlet) | **PASS** | Fresh outlet: "Previously Pushed" section NOT shown (correct — 0 categories on child). |
| TC-4 | Not yet pushed categories shown | **PASS** *(with UI bug)* | All 36 categories listed as "new". See BUG-047 below. |
| TC-5 | Resolution preview auto-updates | **PASS** | Preview appears ~400ms after toggling. Shows 8 resolved count tiles. Disappears when 0 selected. |
| TC-6 | Push disabled when 0 selected | **PASS** | "Push 0 Categories" shown, button disabled. Cannot click. |
| TC-7 | Select All / None buttons | **PASS** | All → "36 selected", None → "0 selected". Badge updates instantly. |
| TC-8 | Category search | **PASS** | "COFFEE" → 1 row. Clear → 36 rows. |
| TC-9 | Execute push (fresh outlet, 2 categories) | **PASS** | COFFEE + Cake Cabinet pushed to palm india. Results: 2 cats +2, 63 products +47/16upd, 7 addons +7, 4 recipes +4, 8 ingredients +8, 3 stock cats +3. Toast: "Push complete — 2 categories synced". |
| TC-10 | Done closes and refreshes | **PASS** | Dialog closed. palm india badge updated from 0/36 → 2/36 categories. |
| TC-11 | Re-push pre-selection (palm india after push) | **PASS** | Re-opening dialog: "Previously Pushed" section now shows COFFEE + Cake Cabinet checked with "synced" badges. "2 selected" auto-applied. |
| TC-13 | Empty push blocked | **PASS** | Button disabled when 0 categories selected. |

---

## Regression Spot-Check

| # | Adjacent Feature | Result | Notes |
|---|-----------------|:------:|-------|
| R-1 | Reverse Push button (Pull) | **PASS** | `reverse-pull-btn-816` visible and clickable for all franchise outlets. Not affected by CR-047. |
| R-2 | Store table loads (3 outlets) | **PASS** | palm india, palmbharat, palmruby all render with correct type badges, email, OOS/Low/OK columns. |
| R-3 | Type filter pills | **PASS** | All (3), Master (0), Outlet (3) filters work correctly. |

---

## UI Bugs Found

### BUG-047: Category list scroll area has no visible scrollbar
- **Severity:** P2 — MEDIUM (usability, not blocking)
- **Steps to reproduce:**
  1. Login as owner@palmcentral.com
  2. Navigate to Store Management
  3. Click Push on any outlet (e.g., palm india with 36 categories)
  4. Observe the category list in the dialog
- **Expected:** Scrollbar visible on the right side of the category list, indicating more items below the fold
- **Actual:** Only ~8 categories visible. The list IS scrollable (mouse wheel/trackpad works) but there is **no visible scrollbar indicator**. Users cannot tell that 28 more categories exist below without attempting to scroll.
- **Root cause:** The `ScrollArea` component (Radix UI) uses a thin invisible scrollbar by default. With 36 categories in a `max-h-[280px]` container, the overflow is clipped with no visual hint.
- **Screenshot evidence:** Owner-provided screenshot shows only "huma" visible under "NOT YET PUSHED" with no scrollbar. QA screenshots confirm: visible items cut off at SMOOTHIES (8th item).
- **Recommended fix:** Add visible scrollbar styling to the ScrollArea, or increase the `max-h` to show more categories, or add a "scroll for more" indicator at the bottom.

---

## Summary
- **Tests passed:** 12/12 (TC-12 and TC-14 not executed — TC-12 requires store creation which is a destructive test, TC-14 requires concurrent push timing which is non-deterministic)
- **Failures:** 0
- **UI Bugs:** 1 (BUG-047 — scrollbar not visible, P2)
- **Regression:** Clean (3/3 spot-checks pass)

## Recommendation
- **PASS** → Proceed to SMOKE FACILITATOR for owner verification
- **BUG-047** should be fixed before or during smoke — it's a usability issue that will confuse operators with large category lists (>8 categories)
