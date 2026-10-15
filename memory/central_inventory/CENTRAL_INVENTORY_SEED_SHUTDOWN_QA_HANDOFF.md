# Central Inventory Seed Shutdown QA Handoff

> **Date:** 25 May 2026
> **From:** Senior Central Inventory Seed Shutdown Implementation Agent

---

## 1. Implementation Report Path

`/app/memory/central_inventory/CENTRAL_INVENTORY_SEED_SHUTDOWN_IMPLEMENTATION_REPORT.md`

---

## 2. Recommended QA Agent

`Central Inventory Seed Shutdown QA Agent`

---

## 3. QA Objective

Validate that real Central Inventory flows no longer use seed/local/Mongo demo data. All data must come from real POS API via the generic V2 pass-through proxy.

---

## 4. Required QA Users

| # | Email | Password | Expected Role | Expected Restaurant |
|---|---|---|---|---|
| 1 | `killua@zoldyck.com` | `Qplazm@10` | Central Store (master) | My Genie (ID=1) |
| 2 | `abhishek@kalabahia.com` | `Qplazm@10` | Central Store (master) | My Genie (ID=1) |
| 3 | `owner@democentral1.com` | `Qplazm@10` | Master Store (central) | DemoCentral1 (ID=781) |
| 4 | `owner@demofranchise1.com` | `Qplazm@10` | Outlet (franchise) | DemoFranchise1 (ID=783) |

---

## 5. Required QA Checks

| # | Check | Method | Expected |
|---|---|---|---|
| 1 | Login/profile context POS-sourced | curl + browser | POS profile context for all 4 users |
| 2 | No `EMAIL_RESTAURANT_MAP` use | Code grep | 0 references in server.py |
| 3 | No `RESTAURANTS` use | Code grep | 0 references in server.py |
| 4 | No `import seed_data` | Code grep | 0 references in server.py |
| 5 | No dedicated seed-backed handlers | Code review | Only generic V2 proxy remains |
| 6 | Generic proxy handles hierarchy-summary | curl | Real stores from POS API |
| 7 | Generic proxy handles hierarchy-detail | curl | Real stock data from POS API |
| 8 | Generic proxy handles pending-queues | curl | Real queue counts from POS API |
| 9 | Generic proxy handles transfer/history | curl | Real transfers from POS API (16 items) |
| 10 | Generic proxy handles transfer/details | curl | Real transfer data from POS API |
| 11 | Franchise list works | curl | Real parent/children from POS API |
| 12 | RequestStockForm no hardcoded IDs | Code grep | No `restaurant_id: 1` or `restaurant_id: 781` |
| 13 | Frontend build passes | Supervisor log | No compilation errors |
| 14 | Operations Hub shows real data | Browser | Real counts (not seed fake counts) |
| 15 | Hierarchy Summary shows real stores | Browser | 2 central or 4 franchise stores |
| 16 | Store badge correct per role | Browser | Central Store / Master Store / Outlet |
| 17 | Missing API fails closed | Code review | POS errors returned directly |
| 18 | No stock-changing APIs run | Log review | Only read operations |
| 19 | No secrets exposed | Log review | Tokens masked in all docs |

---

## 6. QA Must Not Do

- No implementation changes
- No backend changes
- No frontend changes
- No inventory mutation
- No stock-changing APIs unless owner-approved safe test data exists
- No `/app/memory/final/` updates
- No Slice 5 closure

---

## 7. Expected QA Output

QA should create:

`/app/memory/central_inventory/CENTRAL_INVENTORY_SEED_SHUTDOWN_QA_REPORT.md`

---

*End of QA Handoff*
