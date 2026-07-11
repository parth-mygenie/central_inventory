# Central Inventory POS API Context Migration Phase 1 QA Handoff

> **Date:** 24 May 2026
> **From:** Senior Backend/Proxy POS Context Adapter Implementation Agent

---

## 1. Implementation Report Path

`/app/memory/central_inventory/CENTRAL_INVENTORY_POS_API_CONTEXT_MIGRATION_PHASE_1_IMPLEMENTATION_REPORT.md`

---

## 2. Recommended QA Agent

`Central Inventory POS API Context Migration Phase 1 QA Agent`

---

## 3. QA Objective

Validate real users now receive Central Inventory context from POS API profile (`GET /api/v1/vendoremployee/profile → restaurants[0]`), not seed data (`EMAIL_RESTAURANT_MAP`).

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
| 1 | POS profile called after login | Backend logs | "POS profile context resolved" for each user |
| 2 | `restaurant_id` sourced from POS profile | curl | Correct ID per user |
| 3 | `restaurant_name` sourced from POS profile | curl | Correct name per user |
| 4 | `restaurant_type_flag` sourced from POS profile | curl | master/central/franchise per user |
| 5 | `parent_restaurant_id` sourced from POS profile | curl | null/1/781 per user |
| 6 | Seed not used for real users | Backend logs | No "Seed fallback context used" messages |
| 7 | Unknown/missing POS context fails closed | Code review | `SEED_FALLBACK_ENABLED=false` default |
| 8 | Frontend context still loads | Browser | Hub loads with correct badge and nav |
| 9 | Store badge correct per role | Browser | Central Store / Master Store / Outlet |
| 10 | Hierarchy visibility correct | Browser | Central sees all; Master sees outlets; Outlet locked |
| 11 | Stock Adjustment access correct | Browser | Central: visible; Master/Outlet: hidden |
| 12 | Wastage Entry access correct | Browser | All roles: visible |
| 13 | Wastage Report scoping correct | Browser | Page loads per role |
| 14 | History & Ledger scoping correct | Browser | Both tabs load per role |
| 15 | Same-browser user switching no collision | Browser | Logout killua → login abhishek: correct context |
| 16 | No secrets exposed in logs/responses | Review | Tokens masked in docs, not in logs |
| 17 | MongoDB token_sessions persisted | DB query | Entries for all 4 users |

---

## 6. QA Must Not Do

- No implementation changes
- No backend changes
- No frontend changes
- No stock-changing APIs
- No inventory mutation
- No `/app/memory/final/` updates
- No Slice 5 closure

---

## 7. Expected QA Output

QA should create:

`/app/memory/central_inventory/CENTRAL_INVENTORY_POS_API_CONTEXT_MIGRATION_PHASE_1_QA_REPORT.md`

---

*End of QA Handoff*
