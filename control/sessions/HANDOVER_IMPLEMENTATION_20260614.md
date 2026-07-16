# Agent Handover — Central Inventory (Implementation Session)

> **Date:** 2026-06-14
> **From:** QA + Planning Agent
> **To:** Implementation Agent
> **Priority:** Pick from planned items below, get owner approval, implement

---

## READ THESE FILES IN ORDER

| # | File | What You Learn | Time |
|---|------|----------------|:----:|
| 1 | **This file** | What's ready, what to do next | 3 min |
| 2 | `control/AGENT_PROMPT.md` | Project rules, terminology inversion, frozen files | 5 min |
| 3 | `memory/test_credentials.md` | Login credentials for Chai (813) and German Fluid (806) | 1 min |

**Do NOT read the full governance stack (L0-L9) unless modifying governance. For implementation, the plan artifacts are self-contained.**

---

## WHAT WAS DONE THIS SESSION

| Task | Status | Artifacts |
|------|:------:|-----------|
| CR-034: Recipe/Sub-Recipe API fix | QA PASS (21/21) | All 7 artifacts done |
| Chai 813 seed (Phases 5.3-10) | COMPLETE | 19 sub-recipes, 19 recipes, 6 POs, 22 runs, 10 transfers |
| Recipe data correction | DONE | Each recipe → 1 sub-recipe ref (not raw ingredients) |
| RecipeCatalogue UI fix | DONE | Linked Food = plain text, Delete hidden |
| Catalog push to 14 stores | DONE | All stores synced |
| Math Discovery QA | COMPLETE | 172 tests, 155 PASS, 0 FAIL, 0 mismatches |
| CR-035 planning | Artifacts 0-3 DONE | Session-Start, Intake, Impact, Plan |
| BUG-017 planning | Artifacts 0-3 DONE | Session-Start, Intake, Impact, Plan |

---

## ITEMS READY FOR IMPLEMENTATION

**Ask the owner which to implement. Both have full plans ready.**

### Option 1: CR-035 — Store Creation 2-Step + Outlet Visibility (~65 min)

**What:** Replace single-step store create with 2-step wizard (details → push preview → Create & Push). Also fix outlets not visible from Central Store.

**Plan:** `control/sessions/CR035_ARTIFACT_3_IMPLEMENTATION_PLAN.md`

**Summary:**
- **Part A:** 2-step wizard in `StoreManagement.jsx` (lines 198-229). Step 1: same 6 fields + Next. Step 2: summary + 7 catalog count cards (Categories, Ingredients, Products, Recipes, Sub-Recipes, Addons, Addon Recipes) + "Create & Push" button. Single action: `createChild()` → `pushBundle(childId)`.
- **Part B:** Outlet visibility. `hierarchy-detail` API already returns `restaurants[]` with all 14 stores. Extract from existing health fetch, merge outlets into `displayChildren`, update filter tabs.
- **Files:** `StoreManagement.jsx` only. No hook/API changes.
- **Imports to add:** `Check, ArrowRight, ArrowLeft` from lucide-react

### Option 2: BUG-017 — Duplicate Ingredient Filter (~15 min)

**What:** Ingredient dropdown allows selecting same item multiple times in Recipe and Sub-Recipe BOM editors.

**Plan:** `control/sessions/BUG017_ARTIFACT_3_IMPLEMENTATION_PLAN.md`

**Summary:**
- Filter `inventoryMaster` per dropdown row to exclude IDs selected in OTHER rows
- **Files:** `RecipeCatalogue.jsx` (line 317) + `SubRecipeMaster.jsx` (line 363)
- ~5 lines per file

---

## KEY GOTCHAS

| # | Gotcha | Detail |
|---|--------|--------|
| 1 | Terminology inversion | API `master`=Central, `central`=Master, `franchise`=Outlet. Use `terminology.js`. |
| 2 | Recipe `name` = food_id integer | CR-034 fix — `store-recipe` expects `name: Number(foodId)`, not string |
| 3 | Sub-recipe create vs update | CREATE uses `ingredient` (singular), UPDATE uses `ingredients` (plural) |
| 4 | `display_qty` is STRING | Always `Number()` wrap before arithmetic |
| 5 | `require_po_for_purchase=true` on Chai 813 | Direct add-stock blocked — must use POs |
| 6 | Outlet credentials | `manager@chaioutletn1.com` format (not `outlet.n1@chai.com`) |

---

## ENVIRONMENT

| Item | Value |
|------|-------|
| Branch | `14-june-1` |
| Deploy URL | `https://02fce931-39c9-4311-aebe-ea25b8965e82.preview.emergentagent.com` |
| Backend | FastAPI proxy on port 8001 (supervisor) — DO NOT MODIFY |
| Frontend | React 19 + Craco on port 3000 (supervisor) |
| POS API | `https://preprod.mygenie.online/api/v2/vendoremployee` |

---

## CODE GATE REMINDER

For implementation, you still need:
- **Artifact 4 (Code-Gate):** Quick review before coding — can be brief for bugs
- **Artifact 5 (QA-Report):** Test after implementation
- **Artifact 6 (Owner Signoff):** Mark PENDING

After implementation: update `registry.json` → run `node control/gen_dashboard_data.js` → verify with `--check`.

---

## WHAT NOT TO DO

1. **Do NOT modify `server.py`** — proxy-only architecture
2. **Do NOT create new test data** without owner approval
3. **Do NOT touch frozen files** (`terminology.js`, `screenVisibility.js`, `.env` files)
4. **Do NOT implement without owner choosing** which item to work on first
5. **Do NOT skip Code Gate** (Artifact 4) — even for bugs

---

*End of Handover*
