# INVESTIGATION REPORT — Forward Push Module-Level Selection

> **Date:** 2026-10-31
> **Investigator:** Agent (INVESTIGATION role)
> **Account:** manager@mygenietest002.com (RID 828)

---

## 1. The Question

Push dialog only lets you pick categories. Pull dialog lets you pick individual modules (Ingredients, Foods, etc.). Can push support module-level selection too — specifically pushing only Ingredients + Stock Categories?

## 2. Root Cause: NOT blocked by backend. Frontend is guarding.

The backend already supports `modules` on forward push. This was proven in a prior investigation (2026-07-16, `INVESTIGATION_CATEGORY_SCOPED_PUSH_20260716.md`, Curl 6):

```
POST /franchise/push/815
Body: { "push_food_bundle": true, "category_ids": [8381], "modules": ["categories","foods","recipes"] }
→ 200 OK — only categories/foods/recipes pushed, others skipped
```

The `modules` parameter works on forward push the same way it works on reverse push. Same whitelist applies: `categories, stock_item_categories, addons, sub_recipes, ingredients, stock_items, foods, recipes`.

## 3. Where The Frontend Guards

| Layer | What It Does | What's Missing |
|-------|-------------|----------------|
| `api.js:978` `pushBundle()` | Sends `{ push_food_bundle: true, category_ids: [...] }` | **Never sends `modules`** — parameter not accepted by the function |
| `StoreManagement.jsx:734` | Calls `api.pushBundle(childId, { categoryIds })` | **Only passes categoryIds** — no modules option |
| `CategoryPushDialog` (line 644) | Shows category checklist only | **No module checkboxes** (unlike Pull's `ReversePushWizardDialog` which has Categories/Foods/Ingredients/etc. checkboxes) |

## 4. Comparison: Pull vs Push

| Feature | Pull (`reversePushFromChild`) | Push (`pushBundle`) |
|---------|------|------|
| API supports `modules`? | YES — wired in `api.js:999-1007` | YES — backend supports it (Curl 6 proof) but `api.js:978` doesn't send it |
| Frontend shows module checkboxes? | YES — `ReversePushWizardDialog` | NO — `CategoryPushDialog` only shows categories |

## 5. What's Needed (Frontend-Only)

To add module-level selection to Push:

1. `api.js:pushBundle()` — accept `modules` parameter and include in body (same pattern as `reversePushFromChild`)
2. `CategoryPushDialog` — add module checkboxes (same as Pull dialog: Categories, Foods, Ingredients, Addons, Sub-recipes, Recipes) alongside the existing category picker
3. No backend changes — API already accepts `modules` on forward push
4. No server.py changes — proxy already forwards everything

## 6. Backend Verification Status

| Check | Result |
|-------|--------|
| `POST /franchise/push/{id}` accepts `modules` | Verified (Curl 6, prior investigation) |
| `POST /franchise/push/{id}` accepts `category_ids` | Verified |
| `POST /franchise/push/{id}` accepts both together | Verified — scopes by category AND module |
| Proxy forwards correctly | Yes — generic proxy in server.py |

## 7. Classification

**Frontend gap.** Backend is ready. Hand to PLANNING for Gate 2-3.
