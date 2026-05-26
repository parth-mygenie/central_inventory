# Central Inventory Login Context Collision Fix QA Handoff

> **Date:** 24 May 2026
> **From:** Senior Central Inventory Login Context Collision Fix Implementation Agent
> **To:** Central Inventory Login Context Collision Fix QA Agent

---

## 1. Fix Report Path

`/app/memory/central_inventory/CENTRAL_INVENTORY_LOGIN_CONTEXT_COLLISION_FIX_IMPLEMENTATION_REPORT.md`

---

## 2. Recommended QA Agent

`Central Inventory Login Context Collision Fix QA Agent`

---

## 3. Required QA Users

| # | Email | Password | Expected Role | Expected Restaurant |
|---|---|---|---|---|
| 1 | `killua@zoldyck.com` | `Qplazm@10` | Central Store (master) | My Genie (ID=1) |
| 2 | `abhishek@kalabahia.com` | `Qplazm@10` | Central Store (master) | My Genie (ID=1) |
| 3 | `owner@democentral1.com` | `Qplazm@10` | Master Store (central) | DemoCentral1 (ID=781) |
| 4 | `owner@demofranchise1.com` | `Qplazm@10` | Outlet (franchise) | DemoFranchise1 (ID=783) |

---

## 4. Required QA Checks

### Primary Fix Verification

| # | Check | Method | Expected |
|---|---|---|---|
| 1 | Login as `killua@zoldyck.com` | Browser | Hub loads, "My Genie" header, "Central Store" badge |
| 2 | Login as `abhishek@kalabahia.com` | Browser | Hub loads, "My Genie" header, "Central Store" badge |
| 3 | Compare restaurant/store context | Both logins | Both show identical context: My Genie + Central Store |
| 4 | Confirm correct store type badge | Header + ContextSelector | "Central Store" badge for both users |
| 5 | Confirm no fallback warning banner | Header | NO "Store type unavailable" warning for either user |

### Same-Browser Sequence Tests

| # | Check | Method | Expected |
|---|---|---|---|
| 6 | abhishek → logout → killua | Sequential login | killua gets full Central Store context, no abhishek stale data |
| 7 | killua → logout → abhishek | Sequential login | abhishek gets full Central Store context, no killua stale data |

### Isolated Session

| # | Check | Method | Expected |
|---|---|---|---|
| 8 | Separate browser/incognito if possible | Incognito | Same result as normal browser — context correct |

### Role Regression

| # | Check | Method | Expected |
|---|---|---|---|
| 9 | Confirm hierarchy visibility (killua) | Navigate to /hierarchy | Can see all stores (Central top-level) |
| 10 | Confirm Stock Adjustment access (killua) | Hub → "Adjust Stock" | Button visible, form loads at /adjustment/new |
| 11 | Confirm Wastage Entry access (killua) | Hub → "Record Wastage" | Button visible, form loads at /wastage/new |
| 12 | Confirm Wastage Report scoping (killua) | Hub → "Wastage Report" | Report page loads at /wastage/report |
| 13 | Confirm History & Ledger (killua) | Navigate to /history | Both Transfer History and Stock Ledger tabs load |

### Cross-Role Regression

| # | Check | Method | Expected |
|---|---|---|---|
| 14 | Master user unchanged | Login as `owner@democentral1.com` | "Master Store" badge, "DemoCentral1", no Stock Adjustment button |
| 15 | Outlet user unchanged | Login as `owner@demofranchise1.com` | "Outlet" badge, "DemoFranchise1", no Dispatch button, no Stock Adjustment |

### Frontend Fallback Hardening Verification

| # | Check | Method | Expected |
|---|---|---|---|
| 16 | Unknown restaurant type fallback no longer silently maps to Central Store | Code inspection | `useLoginContext.js` line 37: `restaurantType = rawRestaurantType \|\| null` — no "master" default |

---

## 5. QA Must Not Do

| Rule |
|---|
| No stock-changing APIs (no submit on Stock Adjustment or Wastage forms) |
| No inventory mutation |
| No backend code changes |
| No `/app/memory/final/` updates |
| No scope expansion |
| No Slice 5 owner smoke / closure actions |

---

## 6. Expected QA Output

QA should create:

`/app/memory/central_inventory/CENTRAL_INVENTORY_LOGIN_CONTEXT_COLLISION_FIX_QA_REPORT.md`

With:
- Pass/fail per check
- Screenshots for UI checks
- API response evidence for curl checks
- Any unexpected findings
- Regression issues found
- Overall QA verdict

---

*End of Fix QA Handoff*
