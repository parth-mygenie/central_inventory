# QA HANDOVER — CR-MODPUSH: Forward Push by Module

> **Date:** 2026-10-31
> **From:** IMPLEMENTATION agent
> **Test Account:** `manager@mygenietest002.com` / `Qplazm@10` (RID 828, Central Store → child 827 Mygenietest001)

---

## Test Cases

### TC-1: "Push by Module" button visible in child row
1. Login as `manager@mygenietest002.com`
2. Navigate to Store Management
3. **Expected:** Child row (Mygenietest001) shows three action buttons: "Push", "Push by Module", "Pull"
4. **Verify:** "Push by Module" has Layers icon and `data-testid="module-push-btn-827"`

### TC-2: Module Push dialog opens with correct data
1. Click "Push by Module" on Mygenietest001 row
2. **Expected:** Dialog opens with title "Push by Module to Mygenietest001"
3. **Expected:** Direction cards: "FROM (YOUR STORE) Mygenietest002 / Central" → "TO (CHILD STORE) Mygenietest001 / Outlet"
4. **Expected:** Status chip (Synced/Partial/Stale) + summary counts (source/child/behind)
5. **Expected:** 6 module checkboxes: Categories, Products, Addons, Ingredients (187), Sub-Recipes, Recipes
6. **Expected:** Info note about auto-seeded Stock Item Categories / Stock Items
7. **Verify:** `data-testid="module-push-wizard-dialog"` and `data-testid="modpush-modules-step"`

### TC-3: Module selection toggles work
1. Click Ingredients checkbox
2. **Expected:** Checkbox becomes checked
3. Click again → unchecked
4. **Expected:** All checkboxes are independent

### TC-4: Confirm step shows selected modules
1. Select "Ingredients" checkbox
2. Click "Review & Push"
3. **Expected:** Confirm panel shows "Modules: Ingredients."
4. **Expected:** Back button returns to modules step

### TC-5: Confirm step with no modules selected
1. Leave all checkboxes unchecked
2. Click "Review & Push"
3. **Expected:** Confirm panel shows "Modules: pushing everything."

### TC-6: Push execution (live — may create real data on preprod)
1. Select "Ingredients" only
2. Click "Review & Push" → "Push Now"
3. **Expected:** Loading spinner with elapsed timer + stage messages
4. **Expected:** On success → results table with per-module Inserted/Updated/Failed counts + Total row
5. **Expected:** "Done" button closes dialog and refreshes push status in the row

### TC-7: Category filter (conditional — requires account with source categories)
1. Open dialog on an account that has source categories (not RID 828 — it has 0 categories)
2. **Expected:** "Narrow by categories" collapsible section appears
3. Click to expand → search, All/None buttons, category list with synced/new badges
4. Select some categories → confirm step shows "Narrowed to N categories"

### TC-8: Existing "Push" button still works (regression)
1. Click existing "Push" button (not "Push by Module")
2. **Expected:** CategoryPushDialog opens (category checklist, not module checkboxes)
3. **Expected:** No interference with ModulePushWizardDialog

### TC-9: Existing "Pull" button still works (regression)
1. Click "Pull" button
2. **Expected:** ReversePushWizardDialog opens (pull direction, module checkboxes)
3. **Expected:** No interference with ModulePushWizardDialog

### TC-10: Error handling — push in progress
1. If a push is already running (trigger via another tab)
2. **Expected:** Error banner "A push is already running for this outlet. Try again shortly."

### TC-11: Dialog close behavior
1. Open dialog → click X or Cancel (before push) → dialog closes, no data changes
2. Open dialog → complete push → click Done → dialog closes, push status refreshes in row

---

## Notes
- TC-6 will create/update real data on preprod. Execute with caution.
- TC-7 requires an account with categories (806 hierarchy has categories but credentials may be expired).
- Pre-existing warning in Sidebar.jsx (react-hooks/exhaustive-deps) is NOT from this CR.
