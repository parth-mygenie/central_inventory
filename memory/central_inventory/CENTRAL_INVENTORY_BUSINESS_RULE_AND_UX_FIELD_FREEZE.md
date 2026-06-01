# Central Inventory Business Rule and UX Field Freeze

> **Document Version:** 1.0
> **Created:** January 2026
> **Author:** Senior Business Rule + UX Field Freeze Agent
> **Project:** MyGenie POS — Central Inventory Module
> **Scope:** Phase 1 UX Implementation Readiness

---

## 1. Freeze Status

**`ready_for_limited_phase_1_ui`**

Foundational screens (Operations Hub, Hierarchy Summary, Store Detail, Pending Queues, Transfer Detail, API Verification Tool) can proceed to UX implementation. Transfer mutation forms (Dispatch Wizard, Request Stock, Receive, Cancel/Reject) are limited due to the active UNIT_CONVERSION_NOT_DEFINED backend blocker on all write APIs. Stock Adjustment, Wastage, Return, and Recipe screens are blocked pending missing backend APIs.

---

## 2. Executive Summary

### What Is Ready
- **96 owner decisions** are recorded and reconciled (50 Round 1 + 3 conflict resolutions + 2 follow-ups + 11 skipped recoveries + 30 Round 2 gap)
- **Terminology mapping CONFIRMED** via actual API responses: backend `master` = Business Central (TOP), backend `central` = Business Master (MIDDLE), backend `franchise` = Business Outlet (BOTTOM)
- **22 read APIs verified working** against `preprod.mygenie.online`
- **Login context identified**: `restaurant_type_flag` from login response determines user hierarchy level; `restaurant_id` determines assigned store
- **23 screens planned** (SCR-00 through SCR-22), of which 14 are Phase 1 candidates
- **E2E transfer lifecycle tested**: 18/19 passed across 8 test scenarios (before unit conversion blocker)
- **Internal API Verification Tool already built** and operational at `/verify`
- **Terminology adapter module exists** (`terminology.js`) with `scanForTerminology()`, `TERM_MAP`, method/status color helpers

### What Is Blocked
- **ALL transfer write APIs blocked** by `UNIT_CONVERSION_NOT_DEFINED` error (backend `unit` table missing `conversion_factor`/`base_unit` columns)
- **11 backend capabilities need new work** before full frontend integration (partial dispatch, soft reservation, over-receive, lateral transfers, return flow, reconciliation, wastage API, adjustment decrease API, stocktake, cost models, pack conversion)
- **Stock Adjustment API** (decrease endpoint) does not exist yet
- **Wastage API** (hierarchy-aware) needs rework from beta franchise-level-only
- **Return flow API** unclear (may reuse request flow reversed; needs backend confirmation)
- **Recipe/consumption APIs** not mapped for this module
- **Operations Hub KPIs** not yet specified by owner (RPT-003: D)

---

## 3. Documents and Evidence Reviewed

| # | Document | Path | Found | Lines | Status |
|---|---|---|---|---|---|
| 1 | CR Requirement Planning v1 | `/app/memory/central_inventory/CENTRAL_INVENTORY_CR_REQUIREMENT_PLANNING.md` | YES | 2,282 | Reviewed in full |
| 2 | Enterprise Review Round 2 | `/app/memory/central_inventory/CENTRAL_INVENTORY_ENTERPRISE_REQUIREMENT_REVIEW_ROUND_2.md` | YES | 946 | Reviewed in full |
| 3 | Requirement Review Status | `/app/memory/central_inventory/CENTRAL_INVENTORY_REQUIREMENT_REVIEW_STATUS.md` | YES | 66 | Reviewed in full |
| 4 | Owner Answers Complete | `/app/memory/central_inventory/OWNER_ANSWERS_COMPLETE.md` | YES | 342 | Reviewed in full — **PRIMARY AUTHORITY** |
| 5 | API Verification Report | `/app/memory/central_inventory/api_evidence/API_VERIFICATION_REPORT.md` | YES | 162 | Reviewed in full |
| 6 | API Verification Update 2 | `/app/memory/central_inventory/api_evidence/API_VERIFICATION_UPDATE_2.md` | YES | 66 | Reviewed in full |
| 7 | Raw: API Implementation Status | `/app/memory/central_inventory/raw_reference/AI/Plans/api_implementation_status.md` | YES | 463 | Reviewed in full |
| 8 | Raw: Frontend UI Flow | `/app/memory/central_inventory/raw_reference/AI/Plans/frontend_hierarchy_integration_ui_flow.md` | YES | 294 | Reviewed in full |
| 9 | Raw: Full API Curl Collection | `/app/memory/central_inventory/raw_reference/AI/curls/full_api_flow_curls.sh` | YES | 494 | Reviewed in full |

### Code Files Inspected (Evidence Only — Not Modified)
| File | Purpose |
|---|---|
| `/app/temp_repo/frontend/src/App.js` | Route structure, existing screens |
| `/app/temp_repo/frontend/src/lib/terminology.js` | Existing terminology adapter module |
| `/app/temp_repo/frontend/src/components/ApiVerificationTool.jsx` | Existing API verification tool patterns |
| `/app/temp_repo/backend/server.py` | API catalog, proxy route, verification CRUD |

---

## 4. Owner Answer Reconciliation

### 4.1 Hierarchy Questions

| Question | Earlier Planning Status | Owner Answer (OWNER_ANSWERS_COMPLETE.md) | Final Decision | Conflict? | Affected Screens |
|---|---|---|---|---|---|
| Q-HIER-001: Central→Outlet direct transfer | Pending (recommended A) | **A** — Central can transfer to both Master and Outlet directly | CONFIRMED: Direct Central→Outlet allowed | No | SCR-07 Dispatch Wizard |
| Q-HIER-002: Master→Central return | Pending (recommended C) | **C** — Special return workflow only | CONFIRMED: Returns via special return workflow | No | SCR-11 Cancel/Reject, Return Flow |
| Q-HIER-003: Outlet→Master return | Pending (recommended A) | **C initially, LATER CORRECTED** via Conflict-002 | SUPERSEDED: Transfer return IS a separate flow, not just wastage/adjustment | YES — see Section 5 | Return Flow |
| Q-HIER-004: Outlet→Central direct return | Pending (recommended C) | **C** — Only if Central dispatched directly | CONFIRMED: Return routes to original sender | No | Return Flow |
| Q-HIER-005: Master↔Master lateral | Pending (recommended B) | **A** — Allowed with Central approval ("special gatekeep") | SUPERSEDES planning recommendation (B→A). Needs backend work. | No conflict, but supersedes recommendation | SCR-07 Dispatch Wizard |
| Q-HIER-006: Outlet↔Outlet lateral | Pending (recommended B) | **B** — Not allowed | CONFIRMED: No lateral Outlet transfers | No | SCR-07 |
| Q-HIER-007: Central→multiple Masters | Pending (recommended A) | **A** — One Central can manage multiple Masters | CONFIRMED: One-to-many | No | SCR-02 Hierarchy Summary |
| Q-HIER-008: Master→multiple Outlets | Pending (recommended A) | **A** — One Master can manage multiple Outlets | CONFIRMED: One-to-many | No | SCR-02 |
| Q-HIER-009: Outlet→multiple Masters | Pending (recommended A) | **D** — Not required in Phase 1 (assume single parent) | CONFIRMED: Single parent per Outlet | No | All hierarchy screens |
| Q-HIER-010: Fixed vs configurable levels | Pending (recommended A) | **A** — Fixed 3-level hierarchy | CONFIRMED: Fixed levels | No | Architecture |

### 4.2 Terminology Questions

| Question | Earlier Planning Status | Owner Answer | Final Decision | Conflict? |
|---|---|---|---|---|
| Q-TERM-001: Backend `master` = Business Central? | Pending (high confidence) | **A** — CONFIRMED | CONFIRMED: backend master = Business Central (TOP) | No |
| Q-TERM-002: UI label for top level | Pending | **C** — "Central Store" | CONFIRMED: Use "Central Store" in UI | No |
| Q-TERM-003: Show backend terms in UI? | Pending | **A** — Business terms only | CONFIRMED: Never show backend terms | No |
| Q-TERM-004: Mapping adapter required? | Pending | **A** — Mandatory | CONFIRMED: Terminology adapter mandatory | No |

### 4.3 Transfer Flow Questions

| Question | Earlier Planning Status | Owner Answer | Final Decision | Conflict? |
|---|---|---|---|---|
| Q-XFER-001: Direct transfer visibility | Pending | **B** — Only direct parties see | CONFIRMED | No |
| Q-XFER-002: Approval mandatory? | Pending (recommended B) | **A initially, LATER CLARIFIED** via Conflict-001 | SUPERSEDED: Approval mandatory for request-based only; parent direct dispatch skips approval | YES — see Section 5 |
| Q-XFER-003: Edit resets status? | Pending | **A** — Resets to "requested" | CONFIRMED | No |
| Q-XFER-004: Strict stock enforcement? | Pending | **A** — Block if insufficient | CONFIRMED for transfers; consumption CAN go negative | No |
| Q-XFER-005: Lateral transfer approval | Pending | **C** — Central must approve | CONFIRMED | No |
| Q-XFER-006: Post-dispatch rejection | Pending | **C** — Destination CANNOT reject post-dispatch; must receive first | CRITICAL: Post-dispatch reject disabled. Must receive, then return. | No |
| Q-XFER-007: Transfer notes | Pending | **C** — Both transfer-level and line-level, optional | CONFIRMED | No |
| Q-XFER-008: Expiry threshold | Pending | **B** — Configurable per store | CONFIRMED | No |
| Q-XFER-009: Partial receive resolution | Pending | **B** — Per rejected line | CONFIRMED | No |
| Q-XFER-010: Auto-escalation | Pending | **D** — Phase 2 | CONFIRMED: Phase 2 | No |

### 4.4 Adjustment, Wastage, Recipe, Notification, Report, Role, API, MVP Questions

| Question | Owner Answer | Final Decision | Status |
|---|---|---|---|
| Q-ADJ-001 | Hybrid: `add-stock` for increases; dedicated API for decreases | CONFIRMED — **Needs backend work** (decrease API missing) | confirmed |
| Q-ADJ-002 | A: Only Central Store manager + wastage at store level | CONFIRMED, then CLARIFIED via Conflict-003 | superseded — see Section 5 |
| Q-ADJ-003 | A: Mandatory reason with predefined categories | CONFIRMED | confirmed |
| Q-WASTE-001 | B: Build as new feature; beta exists | CONFIRMED — **Needs backend work** | confirmed |
| Q-WASTE-002 | D: Photo evidence Phase 2 | CONFIRMED | confirmed |
| Q-RECIPE-001 | D: Existing system handles; just display | CONFIRMED | confirmed |
| Q-RECIPE-002 | A: FEFO batch deduction | CONFIRMED | confirmed |
| Q-RECIPE-003 | A: Real-time consumption visibility | CONFIRMED | confirmed |
| Q-RECIPE-004 | A: Central controls everything (top-down push) | CONFIRMED | confirmed |
| Q-RECIPE-005 | A: Predictive alerts | CONFIRMED | confirmed |
| Q-NOTIF-001 | D: All alert types | CONFIRMED | confirmed |
| Q-NOTIF-002 | D: Polling Phase 1; WebSocket Phase 2 | CONFIRMED | confirmed |
| Q-NOTIF-003 | B: Email/WhatsApp/SMS via CRM; configurable | CONFIRMED | confirmed |
| Q-NOTIF-004 | C: Cascade all levels up to Central | CONFIRMED | confirmed |
| Q-NOTIF-005 | A: Per-user toggle preferences | CONFIRMED | confirmed |
| Q-REPORT-001 | A: Today/yesterday/week/month/custom range | CONFIRMED | confirmed |
| Q-REPORT-002 | A: PDF + Excel export | CONFIRMED | confirmed |
| Q-REPORT-003 | A: Show purchase price + total value | CONFIRMED | confirmed |
| Q-REPORT-004 | A: Sent vs received reconciliation must-have | CONFIRMED | confirmed |
| Q-REPORT-005 | A: Transfer efficiency must-have | CONFIRMED | confirmed |
| Q-REPORT-006 | A: Cross-hierarchy Central + Super Admin only | CONFIRMED | confirmed |
| Q-ROLE-001 | C: Hardcoded Phase 1, configurable Phase 2 | CONFIRMED | confirmed |
| Q-ROLE-002 | D: Kitchen Manager requests — not Phase 1 | CONFIRMED | confirmed |
| Q-ROLE-003 | C: Use existing role system | CONFIRMED | confirmed |
| Q-ROLE-004 | D: Multi-role not Phase 1 | CONFIRMED | confirmed |
| Q-ROLE-005 | A: Detailed per-action activity log | CONFIRMED | confirmed |
| Q-API-001 | C: Separate internal tool | CONFIRMED — **Already built** | confirmed |
| Q-API-002 | B: All admin roles can access | CONFIRMED | confirmed |
| Q-API-003 | A: Persist all test runs to DB | CONFIRMED — **Already implemented** | confirmed |
| Q-API-004 | A: Predefined automated sequences | CONFIRMED | confirmed |
| Q-API-005 | B (default): Response time with threshold warnings | CONFIRMED | confirmed |
| Q-MVP-001 | A: MVP scope approved (with condition) | CONFIRMED | confirmed |
| Q-MVP-002 | A: Adjustment + Wastage are Must Have Phase 1 | CONFIRMED | confirmed |

### 4.5 Round 2 Gap Questions (All Answered)

| Question | Owner Answer | Final Decision | Status |
|---|---|---|---|
| SKIP-001: Partial dispatch | **B** — Allowed, remaining stays approved | CONFIRMED — **Needs backend work** | confirmed |
| SKIP-002: Stock debited when? | **A** — On dispatch | CONFIRMED (matches backend) | confirmed |
| SKIP-003: Outlet cost visibility | **C** — Configurable per deployment | CONFIRMED | confirmed |
| SKIP-004: Adjustment approval | **B** — No approval, immediate with audit | CONFIRMED | confirmed |
| SKIP-005: Wastage approval | **B** — No approval, immediate with audit | CONFIRMED | confirmed |
| SKIP-006: Wastage stock timing | **A** — Immediate reduction | CONFIRMED | confirmed |
| SKIP-007: Who creates wastage | **A** — Any store manager at own level | CONFIRMED | confirmed |
| SKIP-008: Missing recipe | **A** — Skip deduction, log warning | CONFIRMED | confirmed |
| SKIP-009: Negative stock | **A** — Sales CAN go negative (sales never blocked) | CONFIRMED | confirmed |
| SKIP-010: MVP scope approved | **A** — Approved with condition | CONFIRMED | confirmed |
| SKIP-011: Adj+Wastage priority | **A** — Must Have Phase 1 | CONFIRMED | confirmed |
| STK-001: In-transit tracking | **A** — Show in reports + dedicated report | CONFIRMED | confirmed |
| STK-002: Soft reservation | **A** — Approved qty is soft-reserved | CONFIRMED — **Needs backend work** | confirmed |
| STK-003: Over-receive | **B** — Allowed with reason | CONFIRMED — **Needs backend work** | confirmed |
| STK-004: Physical stocktake | **A** — Phase 1 with system vs actual | CONFIRMED | confirmed |
| STK-005: Stock freeze during audit | **B** — No freeze, count alongside operations | CONFIRMED | confirmed |
| STK-006: Stale transfer handling | **B** — Auto-escalate but don't auto-cancel | CONFIRMED | confirmed |
| LED-001: Before/after qty in ledger | **A** — Every movement records before_qty + after_qty | CONFIRMED | confirmed |
| LED-002: Ledger immutability | **A** — Fully immutable | CONFIRMED | confirmed |
| LED-003: Reversal entries | **A** — New reversal entry (original stays) | CONFIRMED | confirmed |
| ITM-001: Item creation | **A** — Only Central creates; pushed down | CONFIRMED | confirmed |
| ITM-002: Decimal precision | **C** — Whole for pcs, 2 decimal for weight/volume | CONFIRMED | confirmed |
| ITM-003: Cost model | **C** — Track all 3 (weighted avg, FIFO, latest); default weighted avg | CONFIRMED — **Needs backend verification** | confirmed |
| ITM-004: Deactivated item in transfer | **A** — Block deactivation until transfers complete | CONFIRMED | confirmed |
| ITM-005: Pack-to-unit conversion | **A** — Needed | CONFIRMED — **Needs backend work** | confirmed |
| RCP-001: Consumption timing | **D** — Existing system behavior | CONFIRMED | confirmed |
| RCP-002: Order cancel reversal | **D** — Existing system behavior | CONFIRMED | confirmed |
| RCP-003: Recipe breakdown visible | **A** — Full breakdown to Outlet | CONFIRMED | confirmed |
| RPT-001: In-transit report | **A** — Must have Phase 1 | CONFIRMED | confirmed |
| RPT-002: Theoretical vs actual | **A** — Must have Phase 1 | CONFIRMED | confirmed |
| RPT-003: Ops Hub KPIs | **D** — Owner to specify later | **PENDING** | pending |
| UX-001: Stale data handling | **Custom** — Soft lock on approval | CONFIRMED — ties to STK-002 | confirmed |
| UX-002: Duplicate prevention | **A** — Frontend disable + backend idempotency | CONFIRMED | confirmed |
| SEC-001: Token masking | **A** — Masked, last 4 chars | CONFIRMED | confirmed |
| SEC-002: Destructive action confirmation | **A** — Confirmation dialog for ALL | CONFIRMED | confirmed |
| EDGE-001: Concurrent dispatch | **A** — First wins, second gets error | CONFIRMED | confirmed |
| EDGE-002: API timeout | **A** — "Check status before retrying" message | CONFIRMED | confirmed |
| EDGE-003: Lateral Master transfer | **A** — Backend supports; needs Central approval | CONFIRMED — **Needs backend work** | confirmed |
| MVP-001: Lateral in Phase 1 | **A** — Must have Phase 1 | CONFIRMED | confirmed |
| MVP-002: Notifications Phase 1 | **B** — In-app polling only; external Phase 2 | CONFIRMED | confirmed |

---

## 5. Decision Conflict / Superseded Notes

### CONFLICT-001: Direct Dispatch vs Mandatory Approval (RESOLVED)

**Original answer:** Q-XFER-002 = A ("Approval always mandatory before dispatch")
**Conflict:** Backend has two paths — `request→approve→dispatch` AND `initiate` (direct dispatch without approval). Owner also confirmed Central can direct-dispatch to Outlet (Q-HIER-001: A).
**Resolution (from OWNER_ANSWERS_COMPLETE.md):** Approval is mandatory only for **request-based** transfers. Parent-initiated direct dispatch (`initiate` endpoint) **skips approval** — parent IS the authority.
**Superseded assumption:** Section 3.2 of CR Planning implied all transfers need approval.
**Affected screens:** SCR-06 (Approve Request), SCR-07 (Dispatch Wizard). Dispatch Wizard must support both `initiate` (no prior approval) and `dispatch/{id}` (from approved request).

### CONFLICT-002: Outlet Return Flow (RESOLVED)

**Original answer:** Q-HIER-003 = C ("Outlet→Master returns via wastage/adjustment only")
**Conflict:** Q-HIER-004 = C ("Outlet→Central return only if Central dispatched directly") — implies a transfer-based return exists.
**Resolution (from OWNER_ANSWERS_COMPLETE.md):** Wastage and Transfer Return are **separate mechanisms**:
- **Wastage** = Record spoiled/damaged goods, destroyed locally (any store, no approval)
- **Transfer Return** = Send stock back to **original sender only**; sender must accept
**Superseded assumption:** Q-HIER-003 answer "C" (wastage/adjustment only) is superseded. Transfer returns ARE allowed.
**Affected screens:** Return Flow screens (new), SCR-11 Cancel/Reject, SCR-17 Stock Adjustment, SCR-18 Wastage. These are distinct workflows with distinct permissions.

### CONFLICT-003: Adjustment vs Wastage vs Reconciliation Boundary (RESOLVED)

**Original answer:** Q-ADJ-002 = A ("Only Central Store manager can adjust; wastage at store level")
**Conflict:** Unclear if wastage is a sub-type of adjustment or separate.
**Resolution (from OWNER_ANSWERS_COMPLETE.md):** Three separate mechanisms:

| Mechanism | Purpose | Who | Approval | Stock Effect |
|---|---|---|---|---|
| Wastage | Spoiled/damaged goods | Any store manager | No — immediate with audit | Reduced locally |
| Stock Adjustment | Manual correction | Central Store manager ONLY | No — immediate with audit | Increase or decrease |
| Reconciliation Request | Counting discrepancy | Any store → parent/sender | YES — formal request → parent adjusts | Adjusted by parent |

**Superseded assumption:** Section 9.2 Permission Matrix row "Adjust stock" showed "needs confirm" for non-Central roles. Now CONFIRMED: Only Central can adjust.
**Affected screens:** SCR-17 (Adjustment — Central only), SCR-18 (Wastage — any store), New Reconciliation Request screen needed.

### CONFLICT-004: Post-Dispatch Rejection Disabled (OWNER CORRECTION)

**Original CR Planning (Section 3.2):** Stated "Reject: Pre-dispatch (by source) and post-dispatch (by destination)"
**Owner Answer (Q-XFER-006: C):** "Destination CANNOT reject post-dispatch — must receive first"
**Impact:** SCR-11 Cancel/Reject must NOT show "Reject" action for destination when transfer status is `dispatched`. Destination must Receive (full or partial), then initiate a Return if needed.
**Affected screens:** SCR-09 Transfer Detail (action buttons), SCR-10 Receive Stock, SCR-11 Cancel/Reject.

---

## 6. Verified APIs Summary

### 6.1 Verified Working (Read APIs) — 22 total

| # | API | Endpoint | Method | Terminology Risk | Contains `master`? | Contains `central`? | Contains `franchise`? | Status |
|---|---|---|---|---|---|---|---|---|
| 1 | Vendor Employee Login | `/api/v1/auth/vendoremployee/common-login` | POST | LOW | YES (`restaurant_type_flag`) | YES | YES | verified_working |
| 2 | Hierarchy Summary (franchise filter) | `/inventory-transfer/hierarchy-summary` | POST | CRITICAL | YES (`store_type` filter) | YES | YES | verified_working |
| 3 | Hierarchy Summary (central filter) | `/inventory-transfer/hierarchy-summary` | POST | CRITICAL | YES | YES | YES | verified_working |
| 4 | Hierarchy Detail | `/inventory-transfer/hierarchy-detail` | POST | HIGH | YES | YES | YES | verified_working |
| 5 | Hierarchy Report (alias) | `/inventory-transfer/hierarchy-report` | POST | HIGH | YES | YES | YES | verified_working (deprecated) |
| 6 | Direct Dispatch (Initiate) | `/inventory-transfer/initiate` | POST | HIGH | YES (`from_restaurant_id`) | YES | YES | verified_working (422 validation) |
| 7 | Request Stock | `/inventory-transfer/request` | POST | MEDIUM | NO | YES (error msg) | YES (error msg) | verified_working (403 correct) |
| 8 | Approve Transfer | `/inventory-transfer/approve/{id}` | POST | LOW | NO | NO | NO | verified_working (404 correct) |
| 9 | Dispatch Approved | `/inventory-transfer/dispatch/{id}` | POST | LOW | NO | NO | NO | verified_working (404 correct) |
| 10 | Receive Stock | `/inventory-transfer/receive/{id}` | POST | LOW | NO | NO | NO | verified_working (404 correct) |
| 11 | Cancel Transfer | `/inventory-transfer/cancel/{id}` | POST | LOW | NO | NO | NO | verified_working (404 correct) |
| 12 | Reject Transfer | `/inventory-transfer/reject/{id}` | POST | LOW | NO | NO | NO | verified_working (404 correct) |
| 13 | Edit Transfer | `/inventory-transfer/edit/{id}` | POST | LOW | NO | NO | NO | verified_working (422 correct) |
| 14 | Transfer Details | `/inventory-transfer/details/{id}` | GET | HIGH | YES | YES | YES | verified_working (404 correct) |
| 15 | Transfer History | `/inventory-transfer/history` | POST | MEDIUM | YES | YES | YES | verified_working |
| 16 | Source Options | `/inventory-transfer/source-options` | POST | MEDIUM | NO | NO | NO | verified_working |
| 17 | Add Stock | `/inventory/add-stock/{id}` | POST | LOW | NO | NO | NO | verified_working (422 correct) |
| 18 | Get Inventory Master | `/inventory/get-inventory-master` | GET | LOW | NO | NO | NO | verified_with_notes (negative stock exists) |
| 19 | Pending Queues | `/inventory-transfer/pending-queues` | POST | LOW | NO | NO | NO | verified_working |
| 20 | Franchise List | `/franchise/list` | GET | HIGH | YES (`master_to_central`) | YES | YES | verified_working |
| 21 | Franchise Push Form | `/franchise/push-form/{id}` | GET | HIGH | NO | NO | NO | verified_working (404 correct) |
| 22 | Franchise History | `/franchise/history` | POST | HIGH | YES | YES | YES | verified_working |

### 6.2 Blocked APIs

| # | API | Reason | Impact |
|---|---|---|---|
| 1 | ALL transfer write mutations | UNIT_CONVERSION_NOT_DEFINED (unit table missing conversion_factor/base_unit) | Cannot complete any transfer lifecycle via API |

### 6.3 Missing/Not-Yet-Provided APIs

| # | API | Status | Owner Action |
|---|---|---|---|
| 1 | Stock Adjustment (decrease) | owner_to_provide | Need dedicated decrease endpoint |
| 2 | Wastage Entry (hierarchy-aware) | owner_to_provide | Beta exists at franchise only; needs rework |
| 3 | Stock Return (child→parent) | owner_to_provide | May reuse request flow reversed |
| 4 | Recipe List | api_sample_missing | Existing system; not mapped for this module |
| 5 | Recipe Ingredient Detail | api_sample_missing | Existing system |
| 6 | Consumption Update | api_sample_missing | Internal `manage_stock()` |
| 7 | Low-stock Alert Configuration | owner_to_provide | No API exists |
| 8 | User Roles/Permissions | api_sample_missing | Existing system |
| 9 | Physical Stocktake | owner_to_provide | No API exists |
| 10 | Reconciliation Request | owner_to_provide | New workflow per Conflict-003 |

---

## 7. Terminology Mapping Freeze

### 7.1 Core Hierarchy Mapping

| UI Business Term | Business Meaning | Backend `restaurant_type` | Backend `store_type` Filter | Verified? | Evidence |
|---|---|---|---|---|---|
| **Central Store** | Top-level warehouse (TOP) | `master` | N/A (root entity) | **YES** | Login response: `restaurant_type_flag: "master"`. API_VERIFICATION_REPORT.md |
| **Master Store** | Regional/intermediate store (MIDDLE) | `central` | `"central"` | **YES** | Franchise List: `relationship: "master_to_central"`. API_VERIFICATION_REPORT.md |
| **Outlet** | Actual restaurant/unit (BOTTOM) | `franchise` | `"franchise"` | **YES** | Request Stock 403: "Only franchise or central can request". API_VERIFICATION_REPORT.md |

### 7.2 Role Mapping

| UI Role | Business Meaning | Backend `restaurant_type` | Verified? |
|---|---|---|---|
| Central Store Manager | Manages top-level inventory | Employee at `master` restaurant | YES |
| Master Store Manager | Manages regional store | Employee at `central` restaurant | YES |
| Outlet Manager | Manages outlet inventory | Employee at `franchise` restaurant | YES |

### 7.3 API Filter Mapping (CRITICAL — Counterintuitive)

| UI Tab/Filter Label | What User Expects | Backend `store_type` Value to Send | What Backend Returns | Risk |
|---|---|---|---|---|
| "Master Stores" tab | List of Master (middle) stores | `"central"` | Backend `central` restaurants = Business Master stores | CRITICAL |
| "Outlets" tab | List of Outlets (bottom) | `"franchise"` | Backend `franchise` restaurants = Business Outlets | CRITICAL |

### 7.4 Terminology Adapter Requirements

1. **UI must NEVER display raw `restaurant_type` values** — always pass through mapping function
2. Existing `terminology.js` module provides `TERM_MAP`: `{ master: "Central / Center", central: "Master Store", franchise: "Outlet / Unit" }`
3. For new screens, import and use `TERM_MAP` consistently
4. API filters documentation must note that `store_type: "central"` returns Business Master stores (inverted)
5. All test cases must verify UI labels use business terms

---

## 8. Login Context / Profile Mapping

### 8.1 Login API

| Field | Value | Evidence |
|---|---|---|
| Login endpoint | `POST /api/v1/auth/vendoremployee/common-login` | full_api_flow_curls.sh, API_VERIFICATION_REPORT.md |
| Request body | `{ "email": "...", "password": "...", "fcm_token": "..." }` | Curl collection |
| Response contains | Bearer token + `restaurant_type_flag` + `restaurant_id` (via token) | API verification: "Returns token + restaurant_type_flag=master" |
| Alternative login | `POST /api/v1/auth/adminemployee/login-as-restaurant` (admin impersonation) | Curl collection |

### 8.2 Login Context Table

| Login Context | Backend `restaurant_type_flag` | Business Meaning | Data Scope | Default Dashboard | Can Switch Entity? | Status |
|---|---|---|---|---|---|---|
| Central User | `master` | TOP-level — manages all | All centrals (Master stores) + all franchises (Outlets) | Central Dashboard (full hierarchy) | Navigate to any child store detail (not auth switch) | **confirmed** |
| Master User | `central` | MIDDLE-level — manages assigned Outlets | Self + own franchises + sibling centrals + sibling franchises | Master Dashboard (own outlets) | Navigate to own child store details | **confirmed** |
| Outlet User | `franchise` | BOTTOM-level — manages own outlet | Self only; transactions incoming-only | Outlet Dashboard (own stock + requests) | No switching — locked to self | **confirmed** |
| Super Admin / Owner | `master` (or via admin login-as-restaurant) | All levels | All stores | Central Dashboard or entity switcher | YES — via admin login-as-restaurant | **confirmed** (admin path verified in curl collection) |

### 8.3 Key Login Context Fields

| Concept | Field / Source | Verified? |
|---|---|---|
| User hierarchy level | `restaurant_type_flag` from login response | YES — API verification confirms `master` for Central |
| Assigned restaurant | `restaurant_id` tied to Bearer token | YES — all API calls scoped by token |
| Visible stores | `getAccessibleChildRestaurants()` server-side; exposed via hierarchy-summary/detail | YES — visibility rules documented in api_implementation_status.md |
| "Acting as" another store | **NOT auth impersonation** — navigate via `store_restaurant_id` parameter in hierarchy-detail | YES — frontend_hierarchy_integration_ui_flow.md Screen 0 |
| Parent restaurant | `parent_restaurant_id` per restaurant (server-side) | YES — request flow uses caller's parent automatically |

### 8.4 Important: No Impersonation

Backend does **not** support token-based impersonation. A `master` user's token always maps to their `restaurant_id`. "Acting as" another store means **navigating** to that store's data in the hierarchy-detail API by passing `store_restaurant_id` — it does NOT switch auth context. This means:
- Central user can VIEW any Master/Outlet data
- Central user's WRITE operations (dispatch, approve) are always authenticated as Central
- Franchise user CANNOT view other stores' data

### 8.5 Login-Related Questions Status

| Question | Status | Answer Source |
|---|---|---|
| Q-LOGIN-001: How to identify user type | ANSWERED | `restaurant_type_flag` from login response (field C: both role + entity) |
| Q-LOGIN-002: Different dashboards per user | ANSWERED | YES — owner confirmed role visibility differs per screen (frontend_ui_flow.md) |
| Q-LOGIN-003: Central user visibility | ANSWERED | Full hierarchy (Q-HIER-007: A, visibility rules in api_implementation_status.md) |
| Q-LOGIN-004: Master user visibility | ANSWERED | Self + own franchises + siblings (api_implementation_status.md) |
| Q-LOGIN-005: Outlet user visibility | ANSWERED | Self only; transactions incoming-only (api_implementation_status.md) |
| Q-LOGIN-006: Backend `franchise` meaning | ANSWERED | Business Outlet/Unit (CONFIRMED via API evidence) |
| Q-LOGIN-007: User in multiple entities | ANSWERED | No switching within single token; Super Admin uses `login-as-restaurant` (Q-ROLE-004: D, curl collection) |
| Q-LOGIN-008: Unauthorized screens | NOT EXPLICITLY ANSWERED | Recommend: Hide from menu, show 403 on direct URL (standard practice). Mark as implementation decision. |

---

## 9. Dashboard Variation Freeze

### 9.1 Central Dashboard

| Field | Value |
|---|---|
| **Purpose** | Top-level operations hub — full hierarchy visibility and control |
| **User type** | `restaurant_type_flag: "master"` |
| **Data scope** | All Master stores + all Outlets; own Central stock |
| **Primary cards/widgets** | Pending Approvals count, Pending Receives count, Pending Dispatches count, Low Stock across hierarchy, My Requests count |
| **Primary actions** | Navigate to: Pending Queues, Hierarchy Summary, Direct Dispatch, Store Detail (any store), Reports |
| **Hidden actions** | "Request Stock" (Central cannot request — it IS the top) |
| **Required APIs** | `pending-queues`, `hierarchy-summary`, `hierarchy-detail` |
| **Required API filters** | `store_type: "central"` for Master stores, `store_type: "franchise"` for Outlets |
| **Pending questions** | RPT-003 (Ops Hub KPIs — owner to specify) |
| **UX readiness** | **limited_phase_1_ux** — KPI cards pending owner specification; shell with pending counts can proceed |

### 9.2 Master Dashboard

| Field | Value |
|---|---|
| **Purpose** | Regional store operations — manage own stock and downstream Outlets |
| **User type** | `restaurant_type_flag: "central"` |
| **Data scope** | Own Master stock + assigned Outlets; can also see sibling centrals/franchises |
| **Primary cards/widgets** | Pending Receives (from Central), Pending Outlet Requests to Approve, Own Stock Low Alerts, My Requests to Central |
| **Primary actions** | Navigate to: Pending Queues, Outlet List, Direct Dispatch to Outlets, Request Stock from Central, Store Detail |
| **Hidden actions** | Full hierarchy reports (Central + Super Admin only per Q-REPORT-006) |
| **Required APIs** | `pending-queues`, `hierarchy-summary`, `hierarchy-detail` |
| **Required API filters** | Scoped by token; hierarchy-summary with `store_type: "franchise"` for own Outlets |
| **Pending questions** | RPT-003 |
| **UX readiness** | **limited_phase_1_ux** — same as Central; shell can proceed |

### 9.3 Outlet Dashboard

| Field | Value |
|---|---|
| **Purpose** | Outlet-level operations — own stock, incoming transfers, request stock |
| **User type** | `restaurant_type_flag: "franchise"` |
| **Data scope** | Own outlet stock ONLY; transactions incoming-only |
| **Primary cards/widgets** | Pending Receives count, My Requests status, Own Low Stock alerts |
| **Primary actions** | Navigate to: Receive Stock, Request Stock (from parent Master/Central), Own Stock Detail, Own Transaction History |
| **Hidden actions** | Hierarchy Summary (cannot see other stores), Dispatch (cannot dispatch), Approve (cannot approve), Cross-hierarchy Reports, Stock Adjustment (Central only) |
| **Required APIs** | `pending-queues`, `hierarchy-detail` (own store only) |
| **Required API filters** | Token-scoped to self; hierarchy-detail with own `store_restaurant_id` |
| **Pending questions** | RPT-003 |
| **UX readiness** | **limited_phase_1_ux** |

### 9.4 Super Admin Dashboard

| Field | Value |
|---|---|
| **Purpose** | Full system visibility with optional entity switching |
| **User type** | Owner/admin (may use `login-as-restaurant` for different contexts) |
| **Data scope** | All stores at all levels |
| **Primary cards/widgets** | Same as Central Dashboard + API Verification Tool access |
| **Primary actions** | All Central actions + API Verification Tool + potential entity switcher |
| **Hidden actions** | None |
| **Required APIs** | All APIs |
| **UX readiness** | **limited_phase_1_ux** — Super Admin effectively sees Central Dashboard in Phase 1 |

---

## 10. Screen Visibility Matrix

| Screen | Central User | Master User | Outlet User | Super Admin | Notes |
|---|---|---|---|---|---|
| SCR-00: Context/Acting-as Selector | Full access (store picker) | Full access (own outlets) | Read-only (locked to self) | Full access | Badge shows mapped business term |
| SCR-01: Operations Hub | Full access | Full access (filtered) | Action limited (no approve/dispatch) | Full access | Content varies by role per Section 9 |
| SCR-02: Hierarchy Summary | Full access (both tabs) | Full access (both tabs, includes siblings) | Action limited (franchise tab, typically one row) | Full access | Tab filters: `store_type` mapped |
| SCR-03: Store Detail | Full access (any visible store) | Full access (own + children) | Read-only (own store; transactions incoming-only) | Full access | Dispatch/Request buttons gated by role |
| SCR-04: Request Stock | Hidden | Full access (→ Central) | Full access (→ Master/Central) | Full access | Central CANNOT request (is top) |
| SCR-05: Pending Queues | Full access (3 tabs) | Full access (3 tabs) | Action limited (no Approval tab) | Full access | Approval tab: parent only |
| SCR-06: Approve Request | Full access | Full access | Hidden | Full access | Actor must be `from_restaurant_id` |
| SCR-07: Dispatch Wizard | Full access | Full access | Hidden | Full access | Only parent roles can dispatch |
| SCR-08: Source Selector (Modal) | Full access | Full access | Hidden | Full access | Part of Dispatch flow |
| SCR-09: Transfer Detail | Full access | Full access | Read-only + Receive action | Full access | Actions gated by status + role |
| SCR-10: Receive Stock | Full access | Full access | Full access | Full access | Actor = destination store |
| SCR-11: Cancel/Reject | Full access (source) | Full access (source) | Hidden (cannot reject post-dispatch per Q-XFER-006) | Full access | Post-dispatch reject disabled for destination |
| SCR-12: Batch/Expiry Drilldown | Full access | Full access | Full access (own store) | Full access | Embedded in Store Detail |
| SCR-13: Low Stock Alerts | Full access | Full access | Full access (own store) | Full access | Embedded |
| SCR-14: Transaction Timeline | Full access | Full access | Full access (incoming only) | Full access | Franchise: incoming-only filter |
| SCR-15: Add Stock | Full access | Full access | Full access (own store) | Full access | Per existing inventory permissions |
| SCR-16: Franchise Push | Full access | Action limited | Hidden | Full access | Central/master managing franchise |
| SCR-17: Stock Adjustment | Full access | Hidden | Hidden | Full access | Central Store manager ONLY |
| SCR-18: Wastage Entry | Full access | Full access | Full access | Full access | Any store manager at own level |
| SCR-19: Recipe Mapping | Full access | Full access | Full access | Full access | Display-only per Q-RECIPE-001 |
| SCR-20: Reports Dashboard | Full access (cross-hierarchy) | Full access (own scope) | Full access (own scope) | Full access (cross-hierarchy) | Cross-hierarchy: Central + Super Admin only |
| SCR-21: API Verification Tool | Hidden (admin-only) | Hidden | Hidden | Full access | Developer/admin only |
| SCR-22: User Permission View | Phase 2 | Phase 2 | Phase 2 | Phase 2 | Phase 2 |

---

## 11. Phase 1 Scope Freeze

| # | Screen/Feature | Classification | Reason |
|---|---|---|---|
| 1 | SCR-00: Context/Acting-as Selector | **Approved Phase 1** | Login context + terminology adapter — foundational |
| 2 | SCR-01: Operations Hub | **Limited Phase 1** | Shell with pending counts can proceed; KPI cards pending owner specification |
| 3 | SCR-02: Hierarchy Summary | **Approved Phase 1** | Read APIs verified working |
| 4 | SCR-03: Store Detail (Stock + Transactions + Drilldown) | **Approved Phase 1** | Read APIs verified working (hierarchy-detail) |
| 5 | SCR-04: Request Stock | **Limited Phase 1** | Write API blocked (UNIT_CONVERSION_NOT_DEFINED); form can be built, submission will fail |
| 6 | SCR-05: Pending Queues | **Approved Phase 1** | Read API verified (pending-queues) |
| 7 | SCR-06: Approve Request | **Limited Phase 1** | Write API blocked; UI can be built, action will fail |
| 8 | SCR-07: Dispatch Wizard | **Limited Phase 1** | Write API blocked; form can be built, submission will fail |
| 9 | SCR-08: Source Selector (Modal) | **Approved Phase 1** | Read API (source-options) verified working |
| 10 | SCR-09: Transfer Detail | **Approved Phase 1** | Read API (details/{id}) verified working |
| 11 | SCR-10: Receive Stock | **Limited Phase 1** | Write API blocked |
| 12 | SCR-11: Cancel/Reject | **Limited Phase 1** | Write API blocked |
| 13 | SCR-12: Batch/Expiry Drilldown | **Approved Phase 1** | Part of hierarchy-detail — verified |
| 14 | SCR-13: Low Stock Alerts | **Approved Phase 1** | Part of hierarchy-detail (`is_low_stock`) — verified |
| 15 | SCR-14: Transaction Timeline | **Approved Phase 1** | Part of hierarchy-detail — verified |
| 16 | SCR-15: Add Stock | **Limited Phase 1** | Write API verified for validation (422); actual addition needs UNIT_CONVERSION fix for transfers |
| 17 | SCR-16: Franchise Push | **Limited Phase 1** | API partially verified; franchise/push blocked on child existence |
| 18 | SCR-17: Stock Adjustment | **Blocked Phase 1** | API does not exist (decrease endpoint missing) |
| 19 | SCR-18: Wastage Entry | **Blocked Phase 1** | API needs hierarchy-aware rework |
| 20 | SCR-19: Recipe Mapping | **Blocked Phase 1** | Recipe APIs not mapped for this module |
| 21 | SCR-20: Reports Dashboard | **Limited Phase 1** | Read APIs verified; report rendering can proceed; export (PDF/Excel) needs implementation |
| 22 | SCR-21: API Verification Tool | **Approved Phase 1** | Already built and operational |
| 23 | SCR-22: User Permission View | **Phase 2** | Per CR Planning |
| 24 | Return Flow | **Blocked Phase 1** | API unclear; needs backend confirmation of return endpoint |
| 25 | Reconciliation Request | **Blocked Phase 1** | New workflow; API does not exist |
| 26 | Physical Stocktake | **Blocked Phase 1** | API does not exist |

**Summary:**
- Approved Phase 1: **9 screens**
- Limited Phase 1: **9 screens** (can build UI, but write actions blocked)
- Blocked Phase 1: **5 features** (missing APIs)
- Phase 2: **1 screen**

---

## 12. Business Rules Freeze

### 12.1 Transfer Rules

| # | Rule | Confirmed Value | Evidence | Affected Screens | Status |
|---|---|---|---|---|---|
| 1 | Central → Master transfer | YES — direct dispatch allowed | Q-HIER-001: A, Conflict-001 resolution | SCR-07 | confirmed |
| 2 | Master → Outlet transfer | YES — direct dispatch allowed | WF-007, backend docs | SCR-07 | confirmed |
| 3 | Central → Outlet direct transfer | YES — bypassing Master allowed | Q-HIER-001: A | SCR-07 | confirmed |
| 4 | Approval required? | Request-based: YES. Parent direct dispatch: NO. | Conflict-001 resolution | SCR-06, SCR-07 | confirmed |
| 5 | Dispatch required? | YES — stock moves on dispatch | SKIP-002: A | SCR-07 | confirmed |
| 6 | Receive required? | YES — destination must confirm | WF-011 | SCR-10 | confirmed |
| 7 | Partial receive | YES — per-line with resolution type | Q-XFER-009: B | SCR-10 | confirmed |
| 8 | Over-receive | YES — with reason | STK-003: B | SCR-10 | confirmed — **needs backend work** |
| 9 | Post-dispatch reject by destination | **NO** — must receive first, then return | Q-XFER-006: C | SCR-11 | confirmed |
| 10 | Pre-dispatch reject by source | YES | WF-013 | SCR-11 | confirmed |
| 11 | Cancel by source (after dispatch) | YES | WF-013, cancel endpoint verified | SCR-11 | confirmed |
| 12 | Partial dispatch | YES — remaining stays approved | SKIP-001: B | SCR-07 | confirmed — **needs backend work** |
| 13 | Edit pre-dispatch | YES — resets to `requested` | Q-XFER-003: A | SCR-09 | confirmed |
| 14 | Master↔Master lateral | YES — Central must approve | Q-HIER-005: A, MVP-001: A | SCR-07 | confirmed — **needs backend work** |
| 15 | Outlet↔Outlet lateral | NO | Q-HIER-006: B | N/A | confirmed |

### 12.2 Stock Rules

| # | Rule | Confirmed Value | Evidence | Status |
|---|---|---|---|---|
| 1 | Stock decreases at which step? | On DISPATCH (hard debit) | SKIP-002: A | confirmed |
| 2 | Stock increases at which step? | On RECEIVE (credit to destination) | WF-011 | confirmed |
| 3 | Soft reservation on approval? | YES — approved qty is soft-locked | STK-002: A, UX-001 | confirmed — **needs backend work** |
| 4 | Can stock go negative (transfers)? | NO — strict enforcement, block if insufficient | Q-XFER-004: A | confirmed |
| 5 | Can stock go negative (sales/consumption)? | YES — sales must never be blocked | SKIP-009: A | confirmed |
| 6 | Can stock go negative (wastage)? | YES — immediate reduction even if low | OWNER_ANSWERS stock policy table | confirmed |
| 7 | Are batches shown? | YES — FEFO ordering, expired excluded from dispatch | Section 3.3 | confirmed |
| 8 | Are expiry dates shown? | YES — with configurable threshold per store | Q-XFER-008: B | confirmed |
| 9 | Are costs shown? | YES — purchase price + value shown | Q-REPORT-003: A | confirmed |
| 10 | Outlet cost visibility | Configurable per deployment/role | SKIP-003: C | confirmed |
| 11 | Decimal precision | Whole numbers for pcs; 2 decimal for weight/volume | ITM-002: C | confirmed |
| 12 | Ledger immutability | Fully immutable — corrections via reversal entries | LED-002: A | confirmed |

### 12.3 Permission Rules

| # | Rule | Value | Evidence | Status |
|---|---|---|---|---|
| 1 | Who can view stock? | All roles at visible stores | Section 9.2 | confirmed |
| 2 | Who can dispatch? | Central (master) + Master (central) | Parent roles only | confirmed |
| 3 | Who can approve? | Central (master) + Master (central) | Parent roles only | confirmed |
| 4 | Who can receive? | Destination store manager | Actor = to_restaurant_id | confirmed |
| 5 | Who can request? | Master (→Central) + Outlet (→Master/Central) | Non-top roles | confirmed |
| 6 | Who can adjust stock? | Central Store manager ONLY | Conflict-003 resolution | confirmed |
| 7 | Who can record wastage? | Any store manager at own level | SKIP-007: A | confirmed |
| 8 | Who can create items? | Central Store manager ONLY (pushed down) | ITM-001: A | confirmed |
| 9 | Who can view cross-hierarchy reports? | Central + Super Admin only | Q-REPORT-006: A | confirmed |
| 10 | Who can access API verification tool? | All admin roles | Q-API-002: B | confirmed |
| 11 | Roles hardcoded or configurable? | Hardcoded Phase 1, configurable Phase 2 | Q-ROLE-001: C | confirmed |

---

## 13. Transfer Status Lifecycle

### 13.1 Primary Lifecycle

```
requested → approved → dispatched → received
                                  → partially_received
                                  → cancelled (by source)
           → rejected (pre-dispatch, by source)
```

### 13.2 Status Transition Matrix

| Current Status | Action | Next Status | Allowed Login Context | API | Stock Impact | UI Screen | Status |
|---|---|---|---|---|---|---|---|
| (new) | Direct Dispatch | `dispatched` | Central, Master (parent) | `POST /initiate` | Source debited | SCR-07 | confirmed |
| (new) | Request Stock | `requested` | Outlet, Master (child) | `POST /request` | None | SCR-04 | confirmed |
| `requested` | Approve | `approved` | Parent of requester | `POST /approve/{id}` | Soft reservation (needs backend) | SCR-06 | confirmed |
| `requested` | Reject (pre-dispatch) | `rejected` | Parent of requester | `POST /reject/{id}` | None | SCR-11 | confirmed |
| `requested` | Edit | `requested` (reset) | Requester | `POST /edit/{id}` | None | SCR-04/SCR-09 | confirmed |
| `approved` | Dispatch | `dispatched` | Parent (source) | `POST /dispatch/{id}` | Source debited (hard) | SCR-07 | confirmed |
| `approved` | Edit | `requested` (forces re-approval) | Requester | `POST /edit/{id}` | Reservation released | SCR-04/SCR-09 | confirmed |
| `dispatched` | Receive (full) | `received` | Destination | `POST /receive/{id}` | Destination credited | SCR-10 | confirmed |
| `dispatched` | Receive (partial) | `partially_received` | Destination | `POST /receive/{id}` + `received_lines` | Partial credit + resolution | SCR-10 | confirmed |
| `dispatched` | Cancel | `cancelled` | Source | `POST /cancel/{id}` | Source restored (reversal entry) | SCR-11 | confirmed |
| `dispatched` | Reject by destination | **NOT ALLOWED** | N/A | N/A | N/A | N/A | confirmed (Q-XFER-006: C) |

### 13.3 Resolution Types (for cancel/reject/partial receive)

| Resolution Type | Meaning | Stock Behavior |
|---|---|---|
| `return_to_source` | Return stock to source store | Source stock restored |
| `damaged` | Goods are damaged | Stock written off (destroyed) |
| `partial_return` | Partial return to source | Partial source restoration |
| `in_transit_hold` | Goods held in transit | Movement paused; status `on_hold` |

---

## 14. API-to-UI Field Mapping

### 14.1 SCR-01: Operations Hub

| UI Label | Backend Field | API | Required? | Type | Display Rule | Visible To | Evidence |
|---|---|---|---|---|---|---|---|
| Pending Approvals | `approval_pending[].length` | `POST /pending-queues` | Yes | Number (badge) | Count; 0 = "No pending" | Central, Master | verified_working |
| Pending Receives | `receive_pending[].length` | `POST /pending-queues` | Yes | Number (badge) | Count | All roles | verified_working |
| My Requests | `my_requests[].length` | `POST /pending-queues` | Yes | Number (badge) | Count | All roles | verified_working |
| Recent Activity | `data[]` | `POST /history` (optional) | No | List | Last N transfers | All roles | verified_working |

### 14.2 SCR-02: Hierarchy Summary

| UI Label | Backend Field | API | Required? | Type | Display Rule | Visible To | Notes |
|---|---|---|---|---|---|---|---|
| Store Name | `stores[].restaurant_name` | `POST /hierarchy-summary` | Yes | String | Direct display | Central, Master | — |
| Store Type Badge | `stores[].restaurant_type` | Same | Yes | String | **MAP via TERM_MAP** — never show raw | All | CRITICAL |
| Sent Quantity | `stores[].sent_quantity` | Same | Yes | Number | Format with unit | All | — |
| Received Quantity | `stores[].received_quantity` | Same | Yes | Number | Format with unit | All | — |
| Transaction Count | `stores[].transaction_count` | Same | Yes | Number | Direct display | All | — |
| Date Filter | `from_date`, `to_date` (request) | Same | No | Date range | Default: today | All | — |
| Tab Filter | `store_type` (request) | Same | Yes | Enum | "Master Stores" sends `"central"`, "Outlets" sends `"franchise"` | Central, Master | CRITICAL: inverted |

### 14.3 SCR-03: Store Detail

| UI Label | Backend Field | API | Type | Display Rule | Notes |
|---|---|---|---|---|---|
| Store Name | `data.store_restaurant_name` | `POST /hierarchy-detail` | String | Direct | — |
| Store Type | `data.restaurant_type` | Same | String | **MAP via TERM_MAP** | CRITICAL |
| Stock Summary | `data.child_stock_summary[]` | Same | Array | Table: stock_title, unit, cal_quantity, display_qty, is_low_stock | Low stock = highlight |
| Batch Detail | `data.child_stock_batches[]` | Same (with `selected_stock_title` + `selected_unit_id`) | Array | batch, expiry_date, cal_quantity | FEFO order |
| Parent Batches | `data.parent_stock_batches[]` | Same | Array | For dispatch source | Only when actor is parent |
| Transactions | `data.transactions[]` | Same | Array | transfer_id, from/to (MAPPED), stock_title, qty, status, date | Franchise: incoming only |
| Child Stores | `data.restaurants[]` | Same | Array | Store picker for parent roles | MAP restaurant_type |

### 14.4 SCR-05: Pending Queues

| UI Label | Backend Field | API | Type | Notes |
|---|---|---|---|---|
| Approval Pending Tab | `data.approval_pending[]` | `POST /pending-queues` | Array | Parent roles only; each item has transfer summary |
| Receive Pending Tab | `data.receive_pending[]` | Same | Array | All roles |
| My Requests Tab | `data.my_requests[]` | Same | Array | All roles |
| Actions per transfer | `data.actions{}` | Same | Object | Endpoint templates for contextual buttons |

### 14.5 SCR-09: Transfer Detail

| UI Label | Backend Field | API | Type | Display Rule | Notes |
|---|---|---|---|---|---|
| Transfer ID | `data.id` | `GET /details/{id}` | Number | Direct | — |
| From Store | `data.from_restaurant` (name + type) | Same | Object | **MAP restaurant_type** | CRITICAL |
| To Store | `data.to_restaurant` (name + type) | Same | Object | **MAP restaurant_type** | CRITICAL |
| Status | `data.status` | Same | String | Status chip with color | See lifecycle |
| Transfer Type | `data.type` | Same | String | "direct" or "request" | — |
| Line Items | `data.lines[]` | Same | Array | stock_title, quantity, unit, source_selector | — |
| Resolution | `data.resolution_type` | Same | String | If cancelled/rejected | — |
| Created At | `data.created_at` | Same | DateTime | Formatted | — |
| Updated At | `data.updated_at` | Same | DateTime | Formatted | — |
| Action Buttons | Based on status + role | — | — | See Section 13.2 lifecycle | Contextual |

### 14.6 SCR-07: Dispatch Wizard

| UI Label | Backend Field (Request) | API | Type | Validation | Notes |
|---|---|---|---|---|---|
| Destination Store | `to_restaurant_id` | `POST /initiate` | Number | Required; visible child stores only | MAP store label |
| Source Store | `from_restaurant_id` | Same | Number | Required; = actor restaurant | Auto-filled |
| Items | `items[]` | Same | Array | At least 1 item required | — |
| Item → Inventory ID | `items[].source_inventory_master_id` | Same | Number | Required | From inventory list |
| Item → Quantity | `items[].quantity` | Same | Number | Required; > 0 | — |
| Item → Unit | `items[].unit` | Same | String | Required | Normalize case |
| Item → Source Selector | `items[].source_selector` | Same | Object | **REQUIRED** — block submit until populated | Mode: segment_id or filter_bucket |

### 14.7 SCR-21: Internal API Verification Tool (Already Built)

| Feature | Implementation Status | Notes |
|---|---|---|
| API Catalog sidebar | Implemented | 6 groups, 20 APIs |
| Search/filter | Implemented | By name/workflow |
| Method selector | Implemented | GET/POST/PUT/DELETE |
| URL input | Implemented | Pre-populated from catalog |
| Headers/auth input | Implemented | Bearer token entry |
| JSON payload editor | Implemented | Monospace, dark theme |
| Send request | Implemented | Via backend proxy |
| Response viewer (formatted/raw/headers) | Implemented | Tabbed view |
| Status code display | Implemented | Color-coded |
| Terminology warnings | Implemented | `scanForTerminology()` |
| Verification status marking | Implemented | 9 statuses |
| Save/load evidence | Implemented | MongoDB via backend |
| Token masking | NOT implemented | SEC-001: A requires this |

---

## 15. Screen-Level UX Freeze

### SCR-00: Context / Acting-as Selector

| Field | Value |
|---|---|
| **Purpose** | Display logged-in user's hierarchy level; allow parent roles to navigate to child stores |
| **Login context** | All roles |
| **Data shown** | Actor type badge (Central Store / Master Store / Outlet), store name, store picker for parents |
| **Actions** | Parent: switch viewed store; Outlet: locked to self |
| **Primary CTA** | Store picker dropdown |
| **Loading state** | Skeleton badge + picker |
| **Empty state** | N/A (always has own store) |
| **Error state** | 403 if out-of-scope store selected |
| **Permission restrictions** | Franchise locked to self; no switching |
| **API dependency** | Login response (`restaurant_type_flag`), hierarchy-detail `data.restaurants[]` for picker |
| **Terminology dependency** | CRITICAL — `restaurant_type_flag` must be mapped |
| **UX readiness** | **approved_for_phase_1_ux** |

### SCR-01: Operations Hub

| Field | Value |
|---|---|
| **Purpose** | Entry dashboard with pending action counts and navigation shortcuts |
| **Login context** | All roles (content varies) |
| **Data shown** | Pending counts (approvals, receives, requests), recent activity |
| **Actions** | Navigate to queues, hierarchy, dispatch, reports |
| **Primary CTA** | Depends on role: Central/Master → "Dispatch Stock", Outlet → "Request Stock" |
| **Loading state** | Skeleton cards |
| **Empty state** | "No pending actions" |
| **Error state** | API error banner |
| **Permission restrictions** | Outlet: hide Approve/Dispatch shortcuts |
| **API dependency** | `pending-queues` (verified) |
| **UX readiness** | **limited_phase_1_ux** (KPI cards pending RPT-003) |

### SCR-02: Hierarchy Summary

| Field | Value |
|---|---|
| **Purpose** | List visible stores with transfer activity metrics |
| **Login context** | Central (all stores), Master (own + siblings), Outlet (limited) |
| **Data shown** | Store list with sent/received/txn counts per date range |
| **Actions** | Toggle tabs (Master Stores / Outlets), date filter, tap store → Store Detail |
| **Primary CTA** | Tap store row |
| **Loading state** | Skeleton list |
| **Empty state** | "No stores found" |
| **Error state** | API error with retry |
| **Permission restrictions** | Outlet sees only franchise tab, typically one row |
| **API dependency** | `hierarchy-summary` (verified) |
| **Terminology dependency** | CRITICAL — tab labels must send inverted `store_type` values |
| **UX readiness** | **approved_for_phase_1_ux** |

### SCR-03: Store Detail

| Field | Value |
|---|---|
| **Purpose** | Single-store view: stock list, batch drilldown, transactions |
| **Login context** | All roles (scoped to visible stores) |
| **Data shown** | Stock summary, batch detail, transaction timeline |
| **Actions** | Batch drilldown, filter transactions, Dispatch (parent), Request (child) |
| **Primary CTA** | "Dispatch" for parent; "Request Stock" for child |
| **Loading state** | Skeleton stock list + transaction list |
| **Empty state** | "No stock items" / "No transactions today" |
| **Permission restrictions** | Franchise: own store only; transactions incoming-only |
| **API dependency** | `hierarchy-detail` (verified) |
| **Terminology dependency** | HIGH — `restaurant_type` in response must be mapped |
| **UX readiness** | **approved_for_phase_1_ux** |

### SCR-04: Request Stock

| Field | Value |
|---|---|
| **Purpose** | Child requests stock from parent |
| **Login context** | Outlet (→ Master/Central), Master (→ Central) |
| **Data shown** | Item picker, quantity input, source selector |
| **Actions** | Add lines, submit request |
| **Primary CTA** | "Submit Request" |
| **Error state** | 422 validation, missing selector |
| **Permission restrictions** | Central CANNOT request (hidden) |
| **API dependency** | `request` (verified for 403), `source-options` (verified) |
| **UX readiness** | **limited_phase_1_ux** (write blocked by UNIT_CONVERSION) |

### SCR-05: Pending Queues

| Field | Value |
|---|---|
| **Purpose** | Unified inbox: approve, receive, track requests |
| **Login context** | All roles |
| **Data shown** | Three tabs: Approval Pending, Receive Pending, My Requests |
| **Actions** | Approve, Reject, Receive, Track status |
| **Primary CTA** | Tab-dependent action buttons |
| **Permission restrictions** | Approval tab: parent only |
| **API dependency** | `pending-queues` (verified) |
| **UX readiness** | **approved_for_phase_1_ux** |

### SCR-07: Dispatch Wizard

| Field | Value |
|---|---|
| **Purpose** | Dispatch stock with mandatory segment selection |
| **Login context** | Central, Master (parent roles) |
| **Data shown** | Destination picker, item picker, source segments, quantity |
| **Actions** | Pick destination, pick item, call source-options, select segment, submit |
| **Primary CTA** | "Dispatch" (blocked until segment selected) |
| **Error states** | INSUFFICIENT_STOCK, STOCK_EXPIRED, LEGACY_SELECTOR_REQUIRED, UNIT_CONVERSION_NOT_DEFINED |
| **Permission restrictions** | Only parent roles |
| **API dependency** | `initiate` or `dispatch/{id}`, `source-options` (both verified for validation/error handling) |
| **UX readiness** | **limited_phase_1_ux** (write blocked by UNIT_CONVERSION) |

### SCR-09: Transfer Detail

| Field | Value |
|---|---|
| **Purpose** | Full transfer view: header + lines + timeline + contextual actions |
| **Login context** | All roles |
| **Data shown** | From/To (MAPPED), status, lines, resolution, timestamps |
| **Actions** | Approve, Dispatch, Receive, Cancel, Reject, Edit — gated by status + role |
| **Primary CTA** | Status-dependent (e.g., "Approve" if `requested` and user is parent) |
| **Permission restrictions** | Action buttons per lifecycle matrix (Section 13) |
| **API dependency** | `details/{id}` (verified) |
| **Terminology dependency** | HIGH — from/to restaurant labels |
| **UX readiness** | **approved_for_phase_1_ux** |

### SCR-17: Stock Adjustment

| Field | Value |
|---|---|
| **UX readiness** | **blocked_api_mapping_pending** — decrease API does not exist |

### SCR-18: Wastage Entry

| Field | Value |
|---|---|
| **UX readiness** | **blocked_api_mapping_pending** — hierarchy-aware wastage API needs rework |

### SCR-19: Recipe Mapping

| Field | Value |
|---|---|
| **UX readiness** | **blocked_api_mapping_pending** — recipe APIs not mapped for this module |

### SCR-21: API Verification Tool

| Field | Value |
|---|---|
| **Purpose** | Test/verify backend APIs before integration |
| **Login context** | Admin/developer only |
| **Who can access** | All admin roles (Q-API-002: B) |
| **Visibility** | NOT visible to normal users; separate `/verify` route |
| **Features** | Catalog browser, request builder, response viewer, terminology warnings, evidence save |
| **Security** | Token masking needed (SEC-001); tokens not stored permanently |
| **UX readiness** | **approved_for_phase_1_ux** — already built and operational |

---

## 16. Internal API Verification Tool UX Freeze

| Field | Value |
|---|---|
| Who can access | All admin roles (Q-API-002: B); developer/admin only |
| Permanent or temporary | Permanent but hidden from normal users (Q-API-001: C — separate tool) |
| Navigation location | `/verify` route — not in main app navigation for normal users |
| Normal user visibility | NEVER — hidden from Franchise/Outlet/Master users |
| Supported methods | GET, POST, PUT, DELETE |
| Payload input | JSON editor (monospace, JetBrains Mono) |
| Header/auth handling | Manual Bearer token entry; should be masked after paste (SEC-001: A — NOT YET IMPLEMENTED) |
| Response display | Formatted JSON, Raw JSON, Headers tabs |
| Error display | Status code color-coded; error body displayed |
| Save evidence | Saves to MongoDB via backend `/api/verifications` |
| API status marking | 9 statuses: not_tested, verified_working, verified_with_notes, failed, blocked_backend_issue, blocked_auth_issue, blocked_terminology_unclear, needs_backend_fix, unclear |
| Terminology mapping | `scanForTerminology()` scans responses for master/central/franchise and shows business meaning |
| Security note | Token masking (SEC-001) needs implementation before production; tokens not stored server-side |

---

## 17. Blocked Feature Register

| # | Feature | Reason Blocked | Missing API / Rule | Owner Action Needed | Can UI Placeholder Exist? |
|---|---|---|---|---|---|
| 1 | ALL transfer write operations | UNIT_CONVERSION_NOT_DEFINED error | Backend `unit` table needs `conversion_factor` + `base_unit` seeded | YES — run migration/seeder | Yes — forms can be built; submit will fail with clear error |
| 2 | Stock Adjustment (decrease) | Dedicated decrease API missing | API endpoint #27 in planning doc | YES — provide endpoint or confirm reuse of existing API | Yes — form shell with "Coming Soon" |
| 3 | Wastage Entry | Hierarchy-aware API missing | Beta exists at franchise level only; needs rework to support all levels | YES — confirm if beta is usable as-is or provide new endpoint | Yes — form shell |
| 4 | Return Flow (child→parent) | API unclear | May reuse request flow in reverse; needs backend confirmation | YES — confirm endpoint and flow | No — unclear workflow |
| 5 | Reconciliation Request | New workflow; no API exists | Per Conflict-003: formal in-system request to parent | YES — provide endpoint | No — workflow undefined |
| 6 | Recipe Consumption Display | APIs not mapped for this module | Recipe list + ingredient detail APIs needed | YES — provide endpoints | Yes — section placeholder |
| 7 | Physical Stocktake | No API exists | System vs actual comparison flow needs backend | YES — provide endpoint | No |
| 8 | Partial Dispatch | Backend dispatches all lines at once | New backend logic needed (SKIP-001: B) | YES — backend team | Yes — form can be built; will dispatch all |
| 9 | Soft Reservation on Approval | Backend debits only on dispatch | New reservation mechanism needed (STK-002: A) | YES — backend team | No — invisible to frontend without backend |
| 10 | Over-Receive | Backend enforces strict qty equality | Backend validation change needed (STK-003: B) | YES — backend team | Yes — form can include; backend will reject |
| 11 | Lateral Master↔Master Transfer | Backend validates parent-chain only | New validation logic + Central approval flow needed (EDGE-003) | YES — backend team | Yes — but will fail on submit |
| 12 | Token Masking in API Tool | Not yet implemented | Frontend feature (SEC-001: A) | No — implementation task | Yes |
| 13 | Operations Hub KPIs | Owner has not specified | RPT-003: D ("owner to specify later") | YES — specify KPI list | Yes — shell with pending counts |

---

## 18. Owner Questions Still Pending

### Business Rules
| Question | Impact |
|---|---|
| RPT-003: Operations Hub KPIs | Dashboard widget design blocked beyond pending counts |

### API/Backend
| Question | Impact |
|---|---|
| Stock Adjustment decrease endpoint | SCR-17 blocked |
| Wastage API (hierarchy-aware) endpoint | SCR-18 blocked |
| Return flow endpoint confirmation | Return feature blocked |
| Reconciliation request endpoint | New feature blocked |
| Physical stocktake endpoint | Stocktake feature blocked |
| Recipe list/ingredient APIs for this module | SCR-19 blocked |
| When will UNIT_CONVERSION_NOT_DEFINED be fixed? | ALL write operations blocked |

### UX (Implementation Decisions — Not Blocking)
| Question | Recommendation |
|---|---|
| Q-LOGIN-008: Unauthorized screen behavior | Recommend: Hide from menu + 403 on direct URL |

**NOTE:** All other original planning questions have been answered by OWNER_ANSWERS_COMPLETE.md. No Round 1 or Round 2 questions remain pending.

---

## 19. Implementation Slice Recommendation

**Recommendation: B — Limited Phase 1 UI can start**

### Recommended First Implementation Slice (in order)

1. **Terminology adapter enhancement** — Extend existing `terminology.js` with full `mapRestaurantType()` function usable across all new screens
2. **Login context adapter** — Create `useLoginContext()` hook that reads `restaurant_type_flag` from token/session and returns `{ level: "central"|"master"|"outlet", businessLabel, canDispatch, canApprove, canRequest, visibleStoreTypes }`
3. **Route structure + navigation** — Set up routes for all Phase 1 screens with login-context-aware menu
4. **Screen visibility enforcement** — Hide/show menu items and route guards based on login context
5. **SCR-00: Context/Acting-as Selector** — Role badge + store picker
6. **SCR-01: Operations Hub shell** — Pending queue counts (exclude unspecified KPI cards)
7. **SCR-02: Hierarchy Summary** — Full implementation (read APIs verified)
8. **SCR-03: Store Detail** — Full implementation including batch drilldown, transactions, low-stock
9. **SCR-05: Pending Queues** — Full implementation (read APIs verified)
10. **SCR-09: Transfer Detail** — Full implementation (read API verified; action buttons shown but write-blocked)

### Do NOT implement yet
- Transfer mutation forms (Dispatch, Request, Receive, Cancel/Reject) — build UI shells but defer API integration until UNIT_CONVERSION fix
- Stock Adjustment, Wastage, Return, Recipe — APIs missing
- Reports export (PDF/Excel) — implementation detail, not blocked

---

## 20. Final Readiness

**`limited_frontend_ui_ready`**

### Why Limited (Not Full)

1. **All transfer write APIs blocked** by `UNIT_CONVERSION_NOT_DEFINED` — forms can be built but will not function end-to-end
2. **5 features blocked** by missing backend APIs (adjustment, wastage, return, reconciliation, stocktake)
3. **Operations Hub KPIs** not specified by owner (RPT-003: D)
4. **Token masking** in API verification tool not yet implemented (SEC-001)
5. **11 backend capabilities** need new work before full implementation

### Why Ready (Limited)

1. **96 owner decisions confirmed** — no unresolved conflicts
2. **Terminology mapping verified** with actual API evidence
3. **Login context identified** — `restaurant_type_flag` determines dashboard variation
4. **Screen visibility matrix complete** — all 23 screens mapped by login context
5. **9 screens approved** for full Phase 1 UX (read-only APIs verified)
6. **9 screens approved** for limited Phase 1 UX (UI can be built; write actions blocked)
7. **Transfer lifecycle frozen** — status transitions, allowed actions, and stock impacts confirmed
8. **API-to-UI field mapping complete** for core screens
9. **Internal API Verification Tool already operational**
10. **Terminology adapter module already exists** in codebase

### Readiness Gate Status

| Gate | Status |
|---|---|
| Owner answers reconciled | **YES** — 96 decisions, 4 conflicts resolved |
| Conflicts/superseded documented | **YES** — Section 5 |
| Login context identified | **YES** — `restaurant_type_flag` |
| User differentiation documented | **YES** — Section 9 dashboards |
| Screen visibility matrix | **YES** — Section 10 |
| Dashboard variation by user type | **YES** — Section 9 |
| Backend `franchise` mapped | **YES** — Business Outlet |
| Backend `master` mapped | **YES** — Business Central |
| Missing login fields listed | **NO missing fields** — all identified |
| Business rules for approved screens frozen | **YES** — Section 12 |
| API-to-UI fields mapped | **YES** — Section 14 (core screens) |
| Transfer lifecycle frozen | **YES** — Section 13 |
| Blocked features separated | **YES** — Section 17 |

---

*End of Central Inventory Business Rule and UX Field Freeze*
