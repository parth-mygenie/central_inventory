# CR-047 — QA Handover

> **Date:** 2026-07-16
> **Implementation Agent:** complete, self-test 12/12 PASS
> **EXIT GATE:** all 5 checks PASS

---

## What Changed

CR-047 replaces the **direct full-bundle forward push** with a **mandatory category selection dialog**. Without selecting ≥1 category, push is not possible. Previously-pushed categories are auto-selected on re-push.

### Files Modified

| File | Change |
|------|--------|
| `frontend/src/services/api.js` (lines 949-966) | `getPushForm` accepts optional `categoryIds` for preview; `pushBundle` accepts `categoryIds` array |
| `frontend/src/hooks/useHierarchyManagement.js` (line 107) | `executePush` passes `categoryIds` through to api |
| `frontend/src/components/central-inventory/StoreManagement.jsx` | New `CategoryPushDialog` component; `handlePush` opens dialog instead of direct push; create-and-push routes through dialog; category badges in store table |

---

## Test Cases

### Prerequisites
- Login as **owner@palmcentral.com** / **Qplazm@10** (master, RID 813)
- Navigate to **Store Management** (`/store-management`)
- Two child outlets visible: **palmbharat** (815) and **palmruby** (814)

---

### TC-1: Category badges display
**Steps:** Load Store Management page, observe Push Status column
**Expected:**
- palmbharat: shows "2/36 categories" badge (blue — partial)
- palmruby: shows "36/36 categories" badge (green — fully synced)

### TC-2: Push button opens dialog (NOT direct push)
**Steps:** Click "Push" button on palmbharat row
**Expected:**
- CategoryPushDialog opens (`data-testid="category-push-dialog"`)
- No immediate push execution — dialog loads push-form data first

### TC-3: Previously pushed categories pre-selected
**Steps:** Open push dialog for palmbharat
**Expected:**
- "Previously Pushed" section shows COFFEE and Cake Cabinet
- Both are checked (pre-selected)
- Both have "synced" badge

### TC-4: Not yet pushed categories shown
**Steps:** Scroll down in push dialog for palmbharat
**Expected:**
- "Not Yet Pushed" section lists remaining 34 categories
- All unchecked
- All have "new" badge

### TC-5: Resolution preview auto-updates
**Steps:** In push dialog, check/uncheck categories and observe preview panel
**Expected:**
- `data-testid="push-preview"` shows resolved counts (Categories, Products, Addons, Recipes, Sub-Recipes, Ingredients, Stock Categories, Stock Items)
- Counts update ~400ms after toggling categories
- Preview disappears when 0 categories selected

### TC-6: Push disabled when 0 selected
**Steps:** Click "None" button to deselect all, observe push button
**Expected:**
- Push button shows "Push 0 Categories" (or similar) and is **disabled**
- Cannot click to push

### TC-7: Select All / None buttons
**Steps:** Click "All" → observe all checked; click "None" → observe all unchecked
**Expected:**
- "All" selects all 36 categories, badge shows "36 selected"
- "None" deselects all, badge shows "0 selected"

### TC-8: Category search
**Steps:** Type "COFFEE" in search input
**Expected:**
- Only COFFEE category row visible
- Other categories hidden
- Clear search → all categories reappear

### TC-9: Execute category-scoped push
**Steps:** 
1. Open push dialog for palmbharat
2. Keep COFFEE and Cake Cabinet selected (pre-selected)
3. Click "Push 2 Categories"
**Expected:**
- Push executes (~30-60s, loading state with elapsed timer)
- Results panel shows per-module counts (inserted/updated)
- Toast: "Push complete — 2 categories synced"
- All should be "updated" (re-push, not first push)

### TC-10: Done closes dialog and refreshes
**Steps:** After push results appear, click "Done"
**Expected:**
- Dialog closes
- Store list refreshes
- Category badge updates if applicable

### TC-11: Push fully synced store (palmruby)
**Steps:** Click Push on palmruby row
**Expected:**
- All 36 categories pre-selected (all "synced" badges)
- "Not Yet Pushed" section empty or not shown
- Push executes with all 36

### TC-12: Create-and-push flow
**Steps:** Click "Create Store" → fill form → Next → Create & Push
**Expected:**
- After store creation, category push dialog opens (NOT direct push)
- All categories available for selection (new store, none pre-selected)

### TC-13: Error handling — empty push (regression)
**Steps:** Open dialog → deselect all → try to push
**Expected:**
- Push button disabled, cannot submit empty category_ids

### TC-14: Error handling — concurrent push
**Steps:** If another push is running for same outlet
**Expected:**
- Error: "A push is already running for this outlet. Try again shortly."

---

## Test Credentials

| Email | Password | Role | RID |
|-------|----------|------|:---:|
| owner@palmcentral.com | Qplazm@10 | master | 813 |
| owner@palmbharat.com | Qplazm@10 | franchise | 815 |
| owner@palmruby.com | Qplazm@10 | franchise | 814 |

## Self-Test Evidence
- Testing agent iteration_60.json: **12/12 PASS** (100%)
- Screenshots at `/app/.screenshots/cr047_*.png`

## Regression Notes
- Reverse push flow (`ReversePushWizardDialog`) is **NOT affected** — no changes to reverse push logic
- Proxy (`server.py`) is **NOT modified** — CI-R2 compliant
- The old full-bundle push (no category_ids) still works at the API level but is no longer reachable from the UI
