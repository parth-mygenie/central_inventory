# Central Inventory CR Requirement Planning

> **Document Version:** 1.0  
> **Created:** January 2026  
> **Last Updated:** January 2026  
> **Author:** CR Requirement Planning Agent  
> **Project:** MyGenie POS — Central Inventory Module  

---

## 1. Planning Status

**Current Status:** `owner_questions_pending`

**Sub-statuses:**
- Requirement intake: complete
- Requirement structuring: complete
- Backend terminology mapping: documented (CRITICAL — inverse naming confirmed)
- Owner question packet: prepared
- API collection: documented from owner-provided reference docs
- API verification: not_yet_started (tool to be built as Phase 1)
- MVP scope: recommended (pending owner approval)
- Frontend screen planning: complete
- Acceptance criteria: drafted
- Handover readiness: pending owner answers

---

## 2. Plain English Summary

### What is this CR?

We are building a **Central Inventory** module for the MyGenie POS platform. This module manages stock movement across a three-level business hierarchy:

1. **Central Inventory (top level)** — The main warehouse or central store that holds bulk stock.
2. **Master Inventory (middle level)** — Regional or intermediate stores that sit between Central and individual outlets.
3. **Outlet / Unit (bottom level)** — The actual restaurant or retail unit that consumes stock through sales.

### What does it do?

- Central can issue stock to Master stores, and Master stores can issue stock to Outlets.
- Central may also issue stock directly to Outlets if business rules permit.
- Outlets consume stock through sales (recipe-based deduction), wastage, and adjustments.
- Every stock movement is tracked in a segment-level ledger with batch and expiry awareness.
- Transfer workflows include: request, approval, dispatch, receive, partial receive, reject, cancel, and edit.
- Reports provide stock visibility across all three hierarchy levels.
- An internal API verification tool will be built to validate backend APIs before frontend integration.

### Why are we building it?

The MyGenie POS system currently handles individual outlet inventory. This CR extends it to support **multi-level inventory management** where a parent organization can manage stock distribution across multiple stores and outlets, with full traceability, approval workflows, and hierarchy-aware reporting.

### Who will use it?

- Central/Master store managers who dispatch and monitor stock
- Outlet managers who receive stock and manage daily consumption
- Business owners who need cross-hierarchy stock visibility and reports
- Admins who manage hierarchy setup and permissions

---

## 3. Confirmed Requirements

Based on analysis of owner-provided reference documents (`api_implementation_status.md`, `frontend_hierarchy_integration_ui_flow.md`, `full_api_flow_curls.sh`), the following are confirmed:

### 3.1 Hierarchy Structure
- Three-level hierarchy is confirmed: Top → Middle → Bottom
- Backend implements this as: `master` → `central` → `franchise`
- Business names this as: Central → Master → Outlet
- Parent-child relationships enforced server-side via `parent_restaurant_id`

### 3.2 Transfer Flow (Confirmed via Backend Docs)
- **Request flow:** Child can request stock from parent (franchise→central, central→master)
- **Approval flow:** Parent approves before dispatch
- **Direct dispatch:** Parent can initiate direct dispatch to child (legacy compatibility)
- **Dispatch:** Mandatory segment/batch selection (no silent FEFO fallback)
- **Receive:** Full or partial receive supported with line-level acceptance
- **Reject:** Pre-dispatch (by source) and post-dispatch (by destination)
- **Cancel:** By source after dispatch
- **Edit:** Pre-dispatch only; resets status to `requested` (forces re-approval)
- **Resolution types:** return_to_source, damaged, partial_return, in_transit_hold

### 3.3 Stock Tracking (Confirmed)
- Segment ledger (`inventory_stock_segments`) is source of truth for stock movement
- `inventory_master` is aggregate summary (synced totals)
- Batch and expiry tracking supported
- FEFO (First Expiry First Out) ordering enforced
- Expired segments excluded from dispatch
- Source selector required for all dispatch/request operations

### 3.4 Transfer Statuses (Confirmed)
`requested` → `approved` → `dispatched` → `received` / `partially_received` / `rejected` / `cancelled` / `on_hold`

### 3.5 Audit Trail (Confirmed)
- `inventory_transfer_events` table captures: request_created, approved, request_edited, dispatched, received, cancelled, rejected, on_hold
- Each event includes actor, line snapshot, and resolution metadata

### 3.6 Hierarchy Visibility Rules (Confirmed from Backend)
- **Backend `master`** (= Business Central): sees all backend `central` stores and all backend `franchise` outlets
- **Backend `central`** (= Business Master): sees self, own franchises, sibling centrals, and sibling franchises
- **Backend `franchise`** (= Business Outlet): sees only self; transactions are incoming-only

### 3.7 API Base
- External API: `https://preprod.mygenie.online/api/v2/vendoremployee`
- Auth: Bearer token from vendor employee login
- Backend stack: Laravel (PHP)

---

## 4. Assumptions

The following are assumptions that need owner confirmation:

| ID | Assumption | Confidence | Impact if Wrong |
|---|---|---|---|
| A-001 | Backend `master` entity represents business Central/Center (top level) | High (confirmed from visibility rules in backend docs) | Entire hierarchy UI would be inverted |
| A-002 | Backend `central` entity represents business Master (middle level) | High (confirmed from backend docs) | Stock transfers would route to wrong level |
| A-003 | Backend `franchise` entity represents business Outlet/Unit (bottom level) | High (confirmed from backend docs) | Outlet operations would fail |
| A-004 | The hierarchy is fixed at 3 levels (not configurable) | Medium | Would need dynamic hierarchy support later |
| A-005 | Central (top) can dispatch directly to Outlet (bottom), bypassing Master | High (backend supports master→franchise direct dispatch) | Direct allocation workflow would be blocked |
| A-006 | Recipe-based consumption is handled separately from this transfer module | Medium | May need additional consumption tracking integration |
| A-007 | Stock can go negative (observed in backend logs per docs) | Medium — needs confirmation | May need stock floor enforcement |
| A-008 | All users authenticate via vendoremployee login (not separate admin login) | High (curl collection confirms this) | Auth flow would need redesign |
| A-009 | Opening stock is added via `add-stock/{id}` endpoint | High (confirmed in backend docs) | Would need separate opening stock API |
| A-010 | Reports use the hierarchy-summary + hierarchy-detail API combo | High (confirmed: hierarchy-report is backward-compat alias) | Wrong API usage |

---

## 5. Inventory Hierarchy

### 5.1 Business Hierarchy (Source of Truth for UI)

```
Central Inventory / Center / Central Store
         (TOP LEVEL — main warehouse)
              ↓
Master Inventory / Master Store
         (MIDDLE LEVEL — regional store)
              ↓
Actual Unit / Outlet / Restaurant
         (BOTTOM LEVEL — consumption point)
```

### 5.2 Backend Hierarchy (Implementation Detail)

```
master (restaurant_type = master)
         (TOP LEVEL in backend)
              ↓
central (restaurant_type = central)
         (MIDDLE LEVEL in backend)
              ↓
franchise (restaurant_type = franchise)
         (BOTTOM LEVEL in backend)
```

### 5.3 Hierarchy Mapping (CRITICAL)

| Level | Business Term (UI) | Backend Term (API) | Backend restaurant_type | Backend store_type filter |
|---|---|---|---|---|
| TOP | Central / Center | master | master | N/A (master is the root) |
| MIDDLE | Master | central | central | `store_type: "central"` |
| BOTTOM | Outlet / Unit | franchise | franchise | `store_type: "franchise"` |

### 5.4 Open Hierarchy Questions

**Q-HIER-001:** Can Central Inventory transfer stock directly to an Outlet (bypassing Master)?

A. Yes, Central can transfer to both Master and Outlet  
B. No, Central can transfer only to Master  
C. Depends on user permission  
D. Not required in Phase 1  

**Recommended answer:** A  
**Reason:** Backend already supports `master → franchise` direct dispatch with parent-chain validation. This enables emergency stock allocation.  
**Impact if not answered:** Frontend cannot finalize transfer flow options.

---

**Q-HIER-002:** Can Master transfer back to Central (reverse/return flow)?

A. Yes, Master can return stock to Central  
B. No, stock only flows downward  
C. Only through a special return workflow  
D. Not required in Phase 1  

**Recommended answer:** C  
**Reason:** Returns are operationally different from regular transfers and may need separate approval logic.  
**Impact if not answered:** Return flow UI cannot be designed.

---

**Q-HIER-003:** Can Outlet return stock to Master?

A. Yes, Outlet can return to Master  
B. No, stock only flows downward  
C. Only through a wastage/adjustment entry  
D. Not required in Phase 1  

**Recommended answer:** A  
**Reason:** Outlets may receive wrong items or excess stock that needs to go back.  
**Impact if not answered:** Outlet return workflow blocked.

---

**Q-HIER-004:** Can Outlet return stock directly to Central?

A. Yes, Outlet can return directly to Central  
B. No, Outlet can only return to Master  
C. Depends on whether Central dispatched directly  
D. Not required in Phase 1  

**Recommended answer:** C  
**Reason:** If Central dispatched directly to Outlet, returns should go back to Central.  
**Impact if not answered:** Return routing logic unclear.

---

**Q-HIER-005:** Can Master transfer to another Master (lateral transfer)?

A. Yes, peer-to-peer Master transfers are allowed  
B. No, transfers only flow vertically (parent→child)  
C. Phase 2 feature  
D. Not required  

**Recommended answer:** B  
**Reason:** Current backend validates hierarchy parent-chain for transfers. Lateral transfers would need new validation logic.  
**Impact if not answered:** UI may incorrectly show lateral transfer options.

---

**Q-HIER-006:** Can Outlet transfer to another Outlet (lateral transfer)?

A. Yes, peer-to-peer Outlet transfers are allowed  
B. No, transfers only flow vertically  
C. Phase 2 feature  
D. Not required  

**Recommended answer:** B  
**Reason:** Same as Q-HIER-005.  
**Impact if not answered:** Same as Q-HIER-005.

---

**Q-HIER-007:** Can Central have multiple Master stores?

A. Yes, one Central can manage multiple Masters  
B. No, one-to-one mapping  
C. Configurable per deployment  
D. Not sure  

**Recommended answer:** A  
**Reason:** Backend `getAccessibleChildRestaurants` returns multiple centrals under a master, implying one-to-many.  
**Impact if not answered:** Store picker UI and hierarchy display cannot be finalized.

---

**Q-HIER-008:** Can one Master store manage multiple Outlets?

A. Yes, one Master can manage multiple Outlets  
B. No, one-to-one mapping  
C. Configurable  
D. Not sure  

**Recommended answer:** A  
**Reason:** Backend already supports this (central sees own franchises).  
**Impact if not answered:** Store management UI cannot be finalized.

---

**Q-HIER-009:** Can one Outlet belong to more than one Master?

A. No, each Outlet has exactly one parent Master  
B. Yes, shared Outlets are possible  
C. Not sure  
D. Not required in Phase 1  

**Recommended answer:** A  
**Reason:** Backend uses single `parent_restaurant_id` per restaurant.  
**Impact if not answered:** Stock ownership and transfer routing become ambiguous.

---

**Q-HIER-010:** Are Central, Master, and Outlet fixed levels, or should hierarchy be configurable later?

A. Fixed 3 levels for now  
B. Should be configurable from the start  
C. Fixed for Phase 1, configurable in Phase 2  
D. Not sure  

**Recommended answer:** A  
**Reason:** Backend is built on fixed restaurant_type values (master, central, franchise).  
**Impact if not answered:** Architecture decision for dynamic hierarchy is deferred.

---

## 6. Backend Terminology Mapping / Naming Mismatch

### 6.1 The Problem

There is a **CRITICAL inverse naming mismatch** between business language and backend API language.

**Business says:** Central (top) → Master (middle) → Outlet (bottom)  
**Backend says:** master (top) → central (middle) → franchise (bottom)

This means:
- When the backend returns `restaurant_type: "master"`, the UI must display **"Central Inventory"**
- When the backend returns `restaurant_type: "central"`, the UI must display **"Master Store"**  
- When the backend returns `restaurant_type: "franchise"`, the UI must display **"Outlet"**
- When the backend API says `store_type: "central"` as a filter, it means filtering for **business Master stores**
- When the backend API says `store_type: "franchise"` as a filter, it means filtering for **business Outlets**

### 6.2 Complete Terminology Mapping Table

| Business Term (UI Label) | Business Meaning | Backend API Term | Backend restaurant_type | Backend store_type Filter | Confirmed? | Risk Level |
|---|---|---|---|---|---|---|
| Central Inventory / Center | Top-level warehouse | `master` / `master_store` / `master_id` | `master` | N/A | **CONFIRMED from docs** | CRITICAL |
| Master Store / Master Inventory | Middle-level regional store | `central` | `central` | `"central"` | **CONFIRMED from docs** | CRITICAL |
| Outlet / Unit / Restaurant | Bottom-level consumption point | `franchise` | `franchise` | `"franchise"` | **CONFIRMED from docs** | HIGH |
| Central Store Manager (role) | Manages top-level inventory | `master` restaurant employee | `master` | N/A | Confirmed | HIGH |
| Master Store Manager (role) | Manages middle-level inventory | `central` restaurant employee | `central` | N/A | Confirmed | HIGH |
| Outlet Manager (role) | Manages bottom-level inventory | `franchise` restaurant employee | `franchise` | N/A | Confirmed | HIGH |

### 6.3 API Field Mapping Examples

| UI Display | API Request Field | API Response Field | Notes |
|---|---|---|---|
| "Central stores" tab | `store_type: "central"` | Returns middle-level stores | COUNTERINTUITIVE: `"central"` filter returns business Master stores |
| "Outlet stores" tab | `store_type: "franchise"` | Returns bottom-level stores | `"franchise"` filter returns business Outlets |
| "Send to Master Store" | `to_restaurant_id` where target is `central` type | — | Backend central = Business Master |
| "Send to Outlet" | `to_restaurant_id` where target is `franchise` type | — | Backend franchise = Business Outlet |
| "From Central" | `from_restaurant_id` where source is `master` type | — | Backend master = Business Central |

### 6.4 Mapping Rules

1. **UI must NEVER display backend terminology directly.** All `restaurant_type` values must pass through a mapping function.
2. Frontend must create a **terminology adapter/mapper** that converts backend terms to business terms.
3. The mapping adapter should be a single-source-of-truth module so changes propagate everywhere.
4. API filters like `store_type: "central"` must be documented as meaning "business Master stores" in all frontend code comments.
5. All test cases must verify that UI labels match business terminology, not backend terminology.

### 6.5 Mapping Risk Assessment

| Risk | Severity | Likelihood | Impact |
|---|---|---|---|
| Developer reads backend `master` and thinks it means business Master | CRITICAL | HIGH | Entire hierarchy inverted in UI |
| Frontend sends `store_type: "central"` thinking it filters business Central stores | CRITICAL | HIGH | Wrong data displayed |
| Transfer source/destination mapped to wrong hierarchy level | CRITICAL | HIGH | Stock sent to wrong store |
| Stock reports show wrong store labels | HIGH | MEDIUM | Confusing/incorrect reports |
| New developer joins and does not know about the inversion | HIGH | HIGH | Regression risk |

---

## 7. Hierarchy Mapping Risk

### Risk Statement

**Backend `master` means business Central/Center (TOP level), while business `Master` means the MIDDLE level which backend calls `central`.** Additionally, **backend `central` means business Master (MIDDLE level), while business `Central` means the TOP level which backend calls `master`.** This is a full inverse mapping.

### Impact

- Incorrect stock movement if transfer source/destination is mapped wrong
- Wrong UI labels across every screen
- Wrong transfer routing (stock goes to wrong hierarchy level)
- Confused implementation — every developer touching this module must understand the inversion
- Reports show wrong hierarchy labels, making them useless for business decisions
- QA test cases may pass technically but be wrong from business perspective

### Required Mitigation

1. Create a **confirmed mapping table** during API verification before ANY frontend integration
2. Build a **terminology adapter module** in frontend code
3. Add **prominent documentation** in code and planning docs
4. Include **terminology verification** as a mandatory QA check
5. The API verification tool must highlight `master`/`central`/`franchise` terms and show their business meaning
6. Every pull request touching hierarchy code must be reviewed for terminology correctness

---

## 8. Business Goals

| # | Business Goal | Priority |
|---|---|---|
| 1 | Enable centralized stock management across multiple stores and outlets | P0 |
| 2 | Provide real-time stock visibility at all hierarchy levels | P0 |
| 3 | Enforce approval workflows for stock transfers | P0 |
| 4 | Track stock at batch and expiry level for quality control | P0 |
| 5 | Reduce stock discrepancies through segment-level tracking | P1 |
| 6 | Enable partial receiving and resolution handling (damaged, returns) | P1 |
| 7 | Provide stock movement history and audit trail | P1 |
| 8 | Support recipe-based consumption tracking | P1 |
| 9 | Alert on low stock conditions | P1 |
| 10 | Generate reports for management decision-making | P1 |
| 11 | Minimize manual errors through mandatory source selection | P1 |
| 12 | Support franchise metadata push from parent to child | P2 |

---

## 9. User Roles and Permissions

### 9.1 Proposed Roles

| Role | Business Level | Backend restaurant_type | Description |
|---|---|---|---|
| Super Admin / Owner | All levels | Any | Full access to all stores and operations |
| Central Store Manager | TOP | `master` | Manages central warehouse, dispatches to Master/Outlet |
| Master Store Manager | MIDDLE | `central` | Manages regional store, dispatches to Outlets, requests from Central |
| Outlet Manager | BOTTOM | `franchise` | Manages outlet inventory, requests stock, receives transfers |
| Kitchen Manager | BOTTOM | `franchise` | Views outlet stock, manages recipe consumption | 
| Accountant | All levels | Any | Views stock values and reports (read-only) |
| Auditor | All levels | Any | Views audit trail and stock ledger (read-only) |
| Read-only Management | All levels | Any | Dashboard and report viewing only |

### 9.2 Permission Matrix

| Permission | Super Admin | Central Mgr | Master Mgr | Outlet Mgr | Kitchen Mgr | Accountant | Auditor | Read-only |
|---|---|---|---|---|---|---|---|---|
| View stock | confirmed | confirmed | confirmed | confirmed | assumed | assumed | assumed | assumed |
| Create transfer request | confirmed | confirmed | confirmed | confirmed | needs confirm | N/A | N/A | N/A |
| Approve transfer | confirmed | confirmed | confirmed | N/A | N/A | N/A | N/A | N/A |
| Dispatch stock | confirmed | confirmed | confirmed | N/A | N/A | N/A | N/A | N/A |
| Receive stock | confirmed | confirmed | confirmed | confirmed | needs confirm | N/A | N/A | N/A |
| Reject stock | confirmed | confirmed | confirmed | confirmed | N/A | N/A | N/A | N/A |
| Partially receive | confirmed | confirmed | confirmed | confirmed | N/A | N/A | N/A | N/A |
| Adjust stock | confirmed | needs confirm | needs confirm | needs confirm | N/A | N/A | N/A | N/A |
| Add wastage | confirmed | needs confirm | needs confirm | confirmed | confirmed | N/A | N/A | N/A |
| Create/edit item | confirmed | needs confirm | needs confirm | needs confirm | N/A | N/A | N/A | N/A |
| Manage recipes | confirmed | needs confirm | needs confirm | needs confirm | confirmed | N/A | N/A | N/A |
| View reports | confirmed | confirmed | confirmed | confirmed | N/A | confirmed | confirmed | confirmed |
| View cost/value | confirmed | confirmed | needs confirm | needs confirm | N/A | confirmed | confirmed | needs confirm |
| Use API verification tool | confirmed | N/A | N/A | N/A | N/A | N/A | N/A | N/A |

**Note:** Most permissions are `assumed` or `needs confirm` — owner must approve the full permission matrix.

---

## 10. Functional Modules

### Module Breakdown

| # | Module | Purpose | Phase | API Dependency | Terminology Risk | Owner Question Needed? |
|---|---|---|---|---|---|---|
| 1 | Inventory hierarchy setup | Define Central→Master→Outlet structure | Must have P1 | Existing restaurant hierarchy | CRITICAL | Yes (Q-HIER-*) |
| 2 | Backend terminology mapping | Map backend master/central/franchise to business Central/Master/Outlet | Must have P1 | All hierarchy APIs | CRITICAL | Yes (Q-TERM-*) |
| 3 | Store / outlet mapping | View and manage stores in hierarchy | Must have P1 | hierarchy-summary, hierarchy-detail | HIGH | Yes |
| 4 | Item / SKU management | Create and manage inventory items | Must have P1 | get-inventory-master, add-stock | LOW | Minimal |
| 5 | Unit of measurement | Handle unit conversions (kg/gm, ltr/ml) | Must have P1 | Backend unit table | LOW | Minimal |
| 6 | Opening stock | Add initial stock to stores | Must have P1 | add-stock/{id} | LOW | Minimal |
| 7 | Central stock view | View aggregate stock at Central level | Must have P1 | hierarchy-detail | HIGH (term mapping) | No |
| 8 | Master stock view | View aggregate stock at Master level | Must have P1 | hierarchy-detail | HIGH (term mapping) | No |
| 9 | Outlet stock view | View aggregate stock at Outlet level | Must have P1 | hierarchy-detail | HIGH (term mapping) | No |
| 10 | Stock transfer request | Child requests stock from parent | Must have P1 | inventory-transfer/request | MEDIUM | Yes (Q-XFER-*) |
| 11 | Stock transfer approval | Parent approves child request | Must have P1 | inventory-transfer/approve/{id} | LOW | Yes |
| 12 | Stock dispatch | Dispatch approved/direct transfer | Must have P1 | inventory-transfer/dispatch/{id}, initiate | MEDIUM | Yes |
| 13 | Stock receiving | Destination confirms receipt | Must have P1 | inventory-transfer/receive/{id} | LOW | Yes |
| 14 | Partial receiving | Accept some lines, reject others | Must have P1 | inventory-transfer/receive/{id} with received_lines | LOW | Yes |
| 15 | Transfer rejection | Reject pre/post-dispatch with resolution | Must have P1 | inventory-transfer/reject/{id} | LOW | Yes |
| 16 | Stock adjustment | Manual stock corrections | Should have P1 | Needs owner confirmation | LOW | Yes (Q-ADJ-*) |
| 17 | Stock return | Return stock from child to parent | Should have P1 | May reuse request flow (reversed) | MEDIUM | Yes (Q-HIER-002/003) |
| 18 | Wastage / spoilage | Record damaged or wasted stock | Should have P1 | Needs owner confirmation | LOW | Yes (Q-WASTE-*) |
| 19 | Recipe-based consumption | Auto-deduct stock based on sales/recipes | Should have P1 | Existing recipe system + manage_stock | MEDIUM | Yes (Q-RECIPE-*) |
| 20 | Low-stock / reorder threshold | Alert when stock below minimum | Should have P1 | hierarchy-detail (is_low_stock) | LOW | Yes (Q-NOTIF-*) |
| 21 | Stock ledger / movement history | Full history of stock changes | Must have P1 | inventory-transfer/history, details | LOW | No |
| 22 | Reports | Stock reports by hierarchy level | Must have P1 | hierarchy-summary, hierarchy-detail | HIGH (term mapping) | Yes (Q-REPORT-*) |
| 23 | Role-based access | Control who sees/does what | Must have P1 | Backend auth + permissions | LOW | Yes (Q-ROLE-*) |
| 24 | Notifications / alerts | In-app notifications for transfers | Should have P1 | pending-queues (polling) | LOW | Yes (Q-NOTIF-*) |
| 25 | Audit trail | Event log for all transfer operations | Must have P1 | inventory_transfer_events | LOW | No |
| 26 | Internal API verification tool | Test/verify backend APIs before integration | Must have P1 (support) | All APIs | HIGH | Yes (Q-API-*) |

---

## 11. Core Workflows

### WF-001: Create Inventory Item

| Field | Detail |
|---|---|
| **Workflow** | Create a new inventory item (SKU) |
| **Role** | Central Store Manager, Master Store Manager, Outlet Manager (needs confirm) |
| **Starting screen** | Inventory Item Master |
| **Steps** | 1. Click "Add Item" → 2. Enter stock title, unit, category → 3. Save → 4. Item appears in inventory list |
| **Stock impact** | None (item creation only; stock added separately) |
| **Approval required** | Unknown — needs owner confirmation |
| **API dependency** | Existing inventory CRUD APIs (not in transfer module) |
| **API verification status** | not_yet_verified |
| **Terminology mapping risk** | LOW |
| **Error/edge cases** | Duplicate item name, missing required fields |
| **Owner questions** | Who can create items? Only Central or all levels? |
| **Phase** | Must have P1 |

### WF-002: Add Opening Stock

| Field | Detail |
|---|---|
| **Workflow** | Add initial stock quantity to a store |
| **Role** | Store manager at respective level |
| **Starting screen** | Add Stock / Opening Stock Entry |
| **Steps** | 1. Select item → 2. Enter quantity, unit, batch (optional), expiry (optional, must be future) → 3. Enter vendor, price → 4. Submit → 5. Stock appears in store's inventory |
| **Stock impact** | Increases store stock (segment + aggregate) |
| **Approval required** | No (per current backend) |
| **API dependency** | `POST /inventory/add-stock/{id}` |
| **API verification status** | available_for_validation |
| **Terminology mapping risk** | LOW |
| **Error/edge cases** | Backdated expiry (422), unit case sensitivity (fixed in backend), duplicate segments |
| **Owner questions** | None critical |
| **Phase** | Must have P1 |

### WF-003: View Central Stock

| Field | Detail |
|---|---|
| **Workflow** | View aggregate stock at Central (top) level |
| **Role** | Central Store Manager (backend: master employee) |
| **Starting screen** | Central Inventory Dashboard → Store Detail |
| **Steps** | 1. Login as Central user → 2. View dashboard → 3. See aggregate stock list → 4. Tap item for batch drilldown |
| **Stock impact** | None (read-only) |
| **API dependency** | `POST /inventory-transfer/hierarchy-detail` with own `store_restaurant_id` |
| **API verification status** | available_for_validation |
| **Terminology mapping risk** | HIGH — API returns data scoped to `master` restaurant; UI must label as "Central" |
| **Phase** | Must have P1 |

### WF-004: View Master Stock

| Field | Detail |
|---|---|
| **Workflow** | View aggregate stock at Master (middle) level |
| **Role** | Master Store Manager (backend: central employee), Central Manager viewing child |
| **Starting screen** | Master Inventory Dashboard → Store Detail |
| **Steps** | 1. Login as Master user OR select Master store from Central's hierarchy view → 2. View stock list → 3. Tap item for batch drilldown |
| **Stock impact** | None (read-only) |
| **API dependency** | `POST /inventory-transfer/hierarchy-detail` |
| **API verification status** | available_for_validation |
| **Terminology mapping risk** | HIGH — API scopes to `central` restaurant; UI must label as "Master Store" |
| **Phase** | Must have P1 |

### WF-005: View Outlet Stock

| Field | Detail |
|---|---|
| **Workflow** | View aggregate stock at Outlet (bottom) level |
| **Role** | Outlet Manager (backend: franchise employee), Master/Central viewing child |
| **Starting screen** | Outlet Inventory Dashboard → Store Detail |
| **Steps** | 1. Login as Outlet user OR select Outlet from parent hierarchy view → 2. View stock list → 3. Tap item for batch drilldown |
| **Stock impact** | None (read-only) |
| **API dependency** | `POST /inventory-transfer/hierarchy-detail` |
| **API verification status** | available_for_validation |
| **Terminology mapping risk** | MEDIUM — API scopes to `franchise` restaurant; UI must label as "Outlet" |
| **Phase** | Must have P1 |

### WF-006: Transfer Central to Master

| Field | Detail |
|---|---|
| **Workflow** | Central dispatches stock to a Master store |
| **Role** | Central Store Manager (backend: master employee) |
| **Starting screen** | Dispatch Wizard (Screen 7) |
| **Steps** | 1. Select destination Master store → 2. Select item(s) → 3. Call source-options → 4. Select segment/batch → 5. Enter quantity → 6. Submit dispatch |
| **Stock impact** | Source (Central) debited immediately on dispatch; Destination (Master) credited on receive |
| **Approval required** | No (direct dispatch via `initiate`) |
| **API dependency** | `POST /inventory-transfer/initiate`, `POST /inventory-transfer/source-options` |
| **API verification status** | available_for_validation |
| **Terminology mapping risk** | HIGH — `from_restaurant_id` is backend `master`, `to_restaurant_id` is backend `central` |
| **Phase** | Must have P1 |

### WF-007: Transfer Master to Outlet

| Field | Detail |
|---|---|
| **Workflow** | Master dispatches stock to an Outlet |
| **Role** | Master Store Manager (backend: central employee) |
| **Starting screen** | Dispatch Wizard |
| **Steps** | Same as WF-006 but Master→Outlet |
| **Stock impact** | Source (Master) debited; Destination (Outlet) credited on receive |
| **API dependency** | `POST /inventory-transfer/initiate`, `POST /inventory-transfer/source-options` |
| **API verification status** | available_for_validation |
| **Terminology mapping risk** | HIGH — `from_restaurant_id` is backend `central`, `to_restaurant_id` is backend `franchise` |
| **Phase** | Must have P1 |

### WF-008: Transfer Central to Outlet (Direct)

| Field | Detail |
|---|---|
| **Workflow** | Central dispatches stock directly to Outlet, bypassing Master |
| **Role** | Central Store Manager (backend: master employee) |
| **Starting screen** | Dispatch Wizard |
| **Steps** | Same as WF-006 but Central→Outlet |
| **Stock impact** | Source (Central) debited; Destination (Outlet) credited on receive |
| **API dependency** | `POST /inventory-transfer/initiate` — backend validates parent-chain for master→franchise |
| **API verification status** | available_for_validation |
| **Terminology mapping risk** | HIGH |
| **Owner questions** | Q-HIER-001 — Is this allowed by business rules? |
| **Phase** | Must have P1 (pending Q-HIER-001) |

### WF-009: Approve Transfer

| Field | Detail |
|---|---|
| **Workflow** | Parent approves child's stock request |
| **Role** | Parent store manager (source side) |
| **Starting screen** | Pending Queues → Approval tab |
| **Steps** | 1. View approval_pending list → 2. Tap transfer → 3. Review lines → 4. Approve or Reject |
| **Stock impact** | None on approval (stock moves on dispatch) |
| **API dependency** | `POST /inventory-transfer/approve/{id}`, `POST /inventory-transfer/reject/{id}` |
| **API verification status** | available_for_validation |
| **Terminology mapping risk** | LOW |
| **Phase** | Must have P1 |

### WF-010: Dispatch Transfer (from Approved Request)

| Field | Detail |
|---|---|
| **Workflow** | Parent dispatches an already-approved request |
| **Role** | Parent store manager |
| **Starting screen** | Transfer Detail → Dispatch action |
| **Steps** | 1. Open approved transfer → 2. Dispatch → 3. Backend debits source stock |
| **Stock impact** | Source debited |
| **API dependency** | `POST /inventory-transfer/dispatch/{id}` |
| **API verification status** | available_for_validation |
| **Phase** | Must have P1 |

### WF-011: Receive Transfer

| Field | Detail |
|---|---|
| **Workflow** | Destination confirms full receipt |
| **Role** | Destination store manager |
| **Starting screen** | Pending Queues → Receive tab |
| **Steps** | 1. View receive_pending → 2. Tap transfer → 3. Confirm full receipt → 4. Stock credited to destination |
| **Stock impact** | Destination credited |
| **API dependency** | `POST /inventory-transfer/receive/{id}` |
| **API verification status** | available_for_validation |
| **Phase** | Must have P1 |

### WF-012: Partially Receive Transfer

| Field | Detail |
|---|---|
| **Workflow** | Destination accepts some lines, rejects others |
| **Role** | Destination store manager |
| **Steps** | 1. View transfer → 2. Per line: set accepted_qty and rejected_qty → 3. Choose resolution type for rejected → 4. Submit |
| **Stock impact** | Accepted: destination credited. Rejected: depends on resolution_type |
| **API dependency** | `POST /inventory-transfer/receive/{id}` with `received_lines[]` |
| **Phase** | Must have P1 |

### WF-013: Reject Transfer

| Field | Detail |
|---|---|
| **Workflow** | Reject a transfer pre-dispatch (source) or post-dispatch (destination) |
| **Role** | Source (pre-dispatch) or Destination (post-dispatch) |
| **Steps** | 1. View transfer → 2. Choose reject → 3. Select resolution type → 4. Add reason → 5. Confirm |
| **Stock impact** | Post-dispatch: source stock restored (if return_to_source) |
| **API dependency** | `POST /inventory-transfer/reject/{id}` |
| **Phase** | Must have P1 |

### WF-014: Return Stock

| Field | Detail |
|---|---|
| **Workflow** | Child returns stock to parent |
| **Role** | Child store manager |
| **Steps** | TBD — may use request flow in reverse or dedicated return API |
| **API dependency** | Unknown — needs owner confirmation |
| **Owner questions** | Q-HIER-002, Q-HIER-003, Q-HIER-004 |
| **Phase** | Should have P1 |

### WF-015: Adjust Stock

| Field | Detail |
|---|---|
| **Workflow** | Manual stock correction (increase or decrease) |
| **Role** | Store manager with adjustment permission |
| **Steps** | 1. Select item → 2. Enter adjustment qty (+ or -) → 3. Enter reason → 4. Submit |
| **API dependency** | Needs owner confirmation — dedicated adjustment API or reuse add-stock |
| **Owner questions** | Q-ADJ-001 through Q-ADJ-005 |
| **Phase** | Should have P1 |

### WF-016: Add Wastage

| Field | Detail |
|---|---|
| **Workflow** | Record stock wastage or spoilage |
| **Role** | Store manager, Kitchen manager |
| **Steps** | 1. Select item → 2. Enter wasted qty → 3. Enter reason → 4. Optionally attach photo → 5. Submit |
| **API dependency** | Needs owner confirmation |
| **Owner questions** | Q-WASTE-001 through Q-WASTE-005 |
| **Phase** | Should have P1 |

### WF-017: Recipe-based Stock Consumption

| Field | Detail |
|---|---|
| **Workflow** | Auto-deduct inventory when sales orders are placed |
| **Role** | System (automatic via order flow) |
| **Steps** | 1. Order placed → 2. Recipe ingredients identified → 3. Stock deducted per recipe |
| **API dependency** | Existing `manage_stock()` in backend + recipe linkage |
| **Owner questions** | Q-RECIPE-001 through Q-RECIPE-005 |
| **Phase** | Should have P1 |

### WF-018: Low-stock Alert

| Field | Detail |
|---|---|
| **Workflow** | System flags items below minimum threshold |
| **Role** | All roles with stock view permission |
| **Steps** | 1. View stock list → 2. Low-stock items highlighted → 3. Filter to show only low-stock → 4. Action: request/dispatch |
| **API dependency** | `hierarchy-detail` returns `is_low_stock`, `min_qty_alert` |
| **Phase** | Should have P1 |

### WF-019: View Stock Ledger

| Field | Detail |
|---|---|
| **Workflow** | View complete history of stock movements for a store |
| **Role** | All roles with view permission |
| **Steps** | 1. Select store → 2. View transaction timeline → 3. Filter by date/item → 4. Tap transfer for detail |
| **API dependency** | `hierarchy-detail` → `transactions[]`, `inventory-transfer/history` |
| **Phase** | Must have P1 |

### WF-020: View Reports

| Field | Detail |
|---|---|
| **Workflow** | View stock reports across hierarchy |
| **Role** | All roles with report permission |
| **Steps** | 1. Open reports → 2. Select report type → 3. Apply filters (date, store, item) → 4. View data |
| **API dependency** | `hierarchy-summary`, `hierarchy-detail` |
| **Phase** | Must have P1 |

### WF-021: Verify API Using Internal Tool

| Field | Detail |
|---|---|
| **Workflow** | Developer/admin tests an API endpoint before frontend integration |
| **Role** | Super Admin / Developer |
| **Steps** | 1. Open API Test Console → 2. Select workflow → 3. Enter endpoint, method, payload → 4. Send → 5. View response → 6. Mark API status → 7. Note terminology mapping |
| **API dependency** | All APIs |
| **Phase** | Must have P1 (support tool) |

### WF-022: Verify Backend Terminology Mapping

| Field | Detail |
|---|---|
| **Workflow** | Verify that backend `master`/`central`/`franchise` map correctly to business terms |
| **Role** | Developer / QA |
| **Steps** | 1. Call hierarchy API → 2. Check restaurant_type values → 3. Compare with mapping table → 4. Flag mismatches |
| **API dependency** | All hierarchy-related APIs |
| **Phase** | Must have P1 |

## 12. Frontend Screen List

### SCR-00: Context / Acting-as Selector

| Field | Detail |
|---|---|
| **Purpose** | Show logged-in user's role and allow navigation to visible stores |
| **User role** | All roles |
| **Main actions** | Display actor type badge (Central/Master/Outlet), store picker for parent roles |
| **Required API** | Employee profile (existing), hierarchy-summary for store list |
| **Loading state** | Skeleton badge + picker |
| **Empty state** | N/A (always has own store) |
| **Error state** | 403 if out-of-scope store selected |
| **Success state** | Badge + picker populated |
| **UI terminology** | "Central Inventory" (for backend master), "Master Store" (for backend central), "Outlet" (for backend franchise) |
| **Backend term concern** | CRITICAL — `restaurant_type` must be mapped before display |
| **Phase** | Must have P1 |

### SCR-01: Operations Hub (Home Dashboard)

| Field | Detail |
|---|---|
| **Purpose** | Entry point with pending action counts and shortcuts |
| **User role** | All roles (content varies by role) |
| **Main actions** | Navigate to: Pending Approvals, Pending Receives, My Requests, Hierarchy Report, Direct Dispatch |
| **Required API** | `POST /inventory-transfer/pending-queues` |
| **Loading state** | Skeleton cards with shimmer |
| **Empty state** | "No pending actions" message |
| **Error state** | API error banner |
| **Success state** | Badge counts populated, shortcuts active |
| **UI terminology** | Standard business terms |
| **Backend term concern** | LOW — pending-queues returns transfers, not restaurant types directly |
| **Phase** | Must have P1 |

### SCR-02: Hierarchy Summary (Store List)

| Field | Detail |
|---|---|
| **Purpose** | List visible stores with transfer activity metrics |
| **User role** | Central Manager, Master Manager (limited for Outlet) |
| **Main actions** | Toggle Master/Outlet tabs, date filter, tap store for detail |
| **Required API** | `POST /inventory-transfer/hierarchy-summary` |
| **Loading state** | Skeleton list |
| **Empty state** | "No stores found" |
| **Error state** | API error with retry |
| **Success state** | Store list with sent/received/txn counts |
| **UI terminology** | Tab labels: "Master Stores" (sends `store_type: "central"`), "Outlets" (sends `store_type: "franchise"`) |
| **Backend term concern** | CRITICAL — `store_type` filter values are INVERTED from business terms |
| **Phase** | Must have P1 |

### SCR-03: Store Detail (Stock + Transactions + Drilldown)

| Field | Detail |
|---|---|
| **Purpose** | Single-store operational view with stock, batches, and transactions |
| **User role** | All roles (scoped to visible stores) |
| **Main actions** | View stock list, tap item for batch drilldown, filter transactions, dispatch/request |
| **Required API** | `POST /inventory-transfer/hierarchy-detail` |
| **Loading state** | Skeleton stock list + transaction list |
| **Empty state** | "No stock items" / "No transactions today" |
| **Error state** | 403 out-of-scope, general API error |
| **Success state** | Stock summary with low-stock highlights, transaction timeline |
| **UI terminology** | All store/restaurant labels must use mapped business terms |
| **Backend term concern** | HIGH — `restaurant_type` in response must be mapped |
| **Phase** | Must have P1 |

### SCR-04: Request Stock (Child to Parent)

| Field | Detail |
|---|---|
| **Purpose** | Child store requests stock from parent |
| **User role** | Outlet Manager (→ Master), Master Manager (→ Central) |
| **Main actions** | Add line items with source selector, submit request |
| **Required API** | `POST /inventory-transfer/request`, `POST /inventory-transfer/source-options` |
| **Loading state** | Form loading |
| **Empty state** | N/A |
| **Error state** | 422 validation errors, missing selector |
| **Success state** | Transfer created with `requested` status |
| **UI terminology** | "Request from [Parent Store Name]" |
| **Backend term concern** | MEDIUM — parent restaurant label must be mapped |
| **Phase** | Must have P1 |

### SCR-05: Pending Queues (Action Inbox)

| Field | Detail |
|---|---|
| **Purpose** | Unified inbox for approvals, receives, and own requests |
| **User role** | All roles (tabs vary) |
| **Main actions** | Approve, Reject, Receive, Track status |
| **Required API** | `POST /inventory-transfer/pending-queues`, `GET /inventory-transfer/details/{id}` |
| **Loading state** | Tab skeleton lists |
| **Empty state** | Per-tab empty messages |
| **Error state** | API error |
| **Success state** | Three populated tabs |
| **UI terminology** | Standard |
| **Backend term concern** | LOW |
| **Phase** | Must have P1 |

### SCR-06: Approve Request

| Field | Detail |
|---|---|
| **Purpose** | Parent reviews and approves/rejects child request |
| **User role** | Central Manager, Master Manager |
| **Main actions** | Approve or Reject with resolution |
| **Required API** | `POST /inventory-transfer/approve/{id}`, `POST /inventory-transfer/reject/{id}` |
| **Phase** | Must have P1 |

### SCR-07: Dispatch Wizard

| Field | Detail |
|---|---|
| **Purpose** | Dispatch stock with mandatory segment selection |
| **User role** | Central Manager, Master Manager |
| **Main actions** | Pick destination, pick item, select source segment, submit |
| **Required API** | `POST /inventory-transfer/initiate` or `dispatch/{id}`, `POST /inventory-transfer/source-options` |
| **UI terminology** | Destination labels must use business terms |
| **Backend term concern** | HIGH — destination `restaurant_type` must be mapped |
| **Phase** | Must have P1 |

### SCR-08: Source Selector Picker (Modal)

| Field | Detail |
|---|---|
| **Purpose** | Sub-UI for mandatory batch/segment selection during dispatch |
| **User role** | Central Manager, Master Manager |
| **Main actions** | Select segment row or filter bucket |
| **Required API** | `POST /inventory-transfer/source-options` |
| **UI terminology** | Show batch, expiry, quantity, source store (mapped) |
| **Phase** | Must have P1 |

### SCR-09: Transfer Detail

| Field | Detail |
|---|---|
| **Purpose** | Full transfer header + lines + timeline + contextual actions |
| **User role** | All roles |
| **Main actions** | Approve, Dispatch, Receive, Cancel, Reject, Edit (based on status + role) |
| **Required API** | `GET /inventory-transfer/details/{id}` |
| **UI terminology** | From/To labels must use mapped business terms |
| **Backend term concern** | HIGH — from/to restaurant labels |
| **Phase** | Must have P1 |

### SCR-10: Receive Stock

| Field | Detail |
|---|---|
| **Purpose** | Destination confirms full or partial receipt |
| **User role** | Destination store manager |
| **Main actions** | Full receive or line-by-line with resolution |
| **Required API** | `POST /inventory-transfer/receive/{id}` |
| **Phase** | Must have P1 |

### SCR-11: Cancel / Reject (Resolution)

| Field | Detail |
|---|---|
| **Purpose** | Abort or dispute transfer with stock resolution policy |
| **User role** | Source (cancel) or Destination (post-dispatch reject) |
| **Main actions** | Choose resolution type, add reason, confirm |
| **Required API** | `POST /inventory-transfer/cancel/{id}`, `POST /inventory-transfer/reject/{id}` |
| **Phase** | Must have P1 |

### SCR-12: Batch / Expiry Drilldown (Embedded)

| Field | Detail |
|---|---|
| **Purpose** | View batch-level stock for one item at a store |
| **User role** | All with stock view |
| **Required API** | `hierarchy-detail` with `selected_stock_title` + `selected_unit_id` |
| **Phase** | Must have P1 |

### SCR-13: Low Stock Alerts (Embedded)

| Field | Detail |
|---|---|
| **Purpose** | Highlight items below minimum threshold |
| **Required API** | `hierarchy-detail` → `is_low_stock`, `min_qty_alert` |
| **Phase** | Should have P1 |

### SCR-14: Transaction Timeline (Embedded)

| Field | Detail |
|---|---|
| **Purpose** | Day/range transfer history for a store |
| **Required API** | `hierarchy-detail` → `transactions[]` |
| **Backend term concern** | MEDIUM — from/to restaurant names in transactions |
| **Phase** | Must have P1 |

### SCR-15: Add Stock

| Field | Detail |
|---|---|
| **Purpose** | Add stock (opening or replenishment) with batch/expiry |
| **Required API** | `POST /inventory/add-stock/{id}` |
| **Phase** | Must have P1 |

### SCR-16: Franchise Push (Admin/Central Ops)

| Field | Detail |
|---|---|
| **Purpose** | Sync menu/recipe/stock metadata from parent to child |
| **Required API** | `POST /franchise/push/{id}` |
| **Phase** | Should have P1 |

### SCR-17: Stock Adjustment

| Field | Detail |
|---|---|
| **Purpose** | Manual stock corrections with reason tracking |
| **Required API** | Needs owner confirmation |
| **Phase** | Should have P1 |

### SCR-18: Wastage Entry

| Field | Detail |
|---|---|
| **Purpose** | Record wastage/spoilage |
| **Required API** | Needs owner confirmation |
| **Phase** | Should have P1 |

### SCR-19: Recipe Mapping

| Field | Detail |
|---|---|
| **Purpose** | View/manage recipe ingredient mappings for consumption |
| **Required API** | Existing recipe APIs |
| **Phase** | Should have P1 |

### SCR-20: Reports Dashboard

| Field | Detail |
|---|---|
| **Purpose** | Stock reports across hierarchy with filters |
| **Required API** | `hierarchy-summary`, `hierarchy-detail` |
| **Backend term concern** | HIGH — all store labels must be mapped |
| **Phase** | Must have P1 |

### SCR-21: Internal API Verification Tool

| Field | Detail |
|---|---|
| **Purpose** | Test/verify backend APIs before frontend integration |
| **User role** | Super Admin / Developer only |
| **Main actions** | Select API, set endpoint/method/headers/payload, send, view response, mark status, check terminology |
| **Required API** | Calls all APIs dynamically |
| **Phase** | Must have P1 (support tool) |

### SCR-22: User Permission / Access View

| Field | Detail |
|---|---|
| **Purpose** | View current user's permissions and accessible stores |
| **Phase** | Phase 2 |

---

## 13. Internal API Verification Tool

### 13.1 Purpose

Test and verify backend APIs before frontend integration. Ensures no API is blindly trusted. Specifically designed to catch terminology mapping issues where backend `master`/`central`/`franchise` may confuse developers.

### 13.2 Who Can Use It

- Super Admin
- Developers during development/QA phase
- Should NOT be visible to normal users

### 13.3 Temporary or Permanent

- **Recommended:** Permanent but hidden behind admin/dev flag
- Can be removed before production if owner prefers (Q-API-001)

### 13.4 Required Features

1. Select API workflow from a pre-configured list
2. Enter or load endpoint URL (pre-populated from API collection)
3. Select HTTP method (GET, POST, PUT, DELETE)
4. Add request headers / Bearer auth token
5. Add request payload (JSON editor)
6. Send API request
7. View raw response
8. View formatted/pretty-printed JSON response
9. View HTTP status code prominently
10. View error response clearly with error code extraction
11. Save or document sample request/response for handover
12. Mark API status: verified_working, failed, unclear, needs_backend_fix
13. Capture notes for frontend integration requirements
14. Identify required frontend fields from response structure
15. Compare expected vs actual response if expected sample is provided
16. **Highlight terminology issues:** flag any use of `master`, `central`, `franchise` in response
17. **Show mapped business terms:** display "Backend `master` = Business Central" alongside raw response
18. Export verified API evidence to `/app/memory/central_inventory/api_evidence/`

### 13.5 Security/Access

- Development/admin mode only (Q-API-002)
- Not exposed to regular users
- Auth tokens required but entered by developer (not stored)

### 13.6 Terminology Mapping Support

The tool must:
- Scan every API response for `restaurant_type`, `store_type`, `master`, `central`, `franchise`
- Display a terminology mapping sidebar/banner showing the business meaning
- Flag any response where hierarchy terms appear without clear context

### 13.7 Open Owner Questions

See Q-API-001 through Q-API-005 in Section 23.

---

## 14. API Collection Matrix

### 14.1 Hierarchy & Store APIs

| # | Workflow | Endpoint | Method | Request Sample | Response Sample | Auth | Filters | `master` appears? | Meaning | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Store list + activity | `/inventory-transfer/hierarchy-summary` | POST | Yes (from docs) | Partial (from docs) | Bearer | store_type, date range | YES — `store_type: "central"` = Business Master | Inverted | available_for_validation |
| 2 | Store detail + stock | `/inventory-transfer/hierarchy-detail` | POST | Yes (from docs) | Partial (from docs) | Bearer | store_restaurant_id, stock, date | YES — returns `restaurant_type` | Inverted | available_for_validation |
| 3 | Store detail (alias) | `/inventory-transfer/hierarchy-report` | POST | Yes | Same as detail | Bearer | Same | YES | Inverted | available_for_validation (deprecated for new UI) |

### 14.2 Transfer Flow APIs

| # | Workflow | Endpoint | Method | Request Sample | Response Sample | Auth | `master` appears? | Status |
|---|---|---|---|---|---|---|---|---|
| 4 | Direct dispatch | `/inventory-transfer/initiate` | POST | Yes (from curls) | Partial | Bearer | YES — `from_restaurant_id` may be master type | available_for_validation |
| 5 | Request stock | `/inventory-transfer/request` | POST | Yes (from curls) | Partial | Bearer | NO — uses caller's parent | available_for_validation |
| 6 | Approve request | `/inventory-transfer/approve/{id}` | POST | Yes | Partial | Bearer | NO | available_for_validation |
| 7 | Dispatch approved | `/inventory-transfer/dispatch/{id}` | POST | Yes | Partial | Bearer | NO | available_for_validation |
| 8 | Receive stock | `/inventory-transfer/receive/{id}` | POST | Yes (with variants) | Partial | Bearer | NO | available_for_validation |
| 9 | Cancel transfer | `/inventory-transfer/cancel/{id}` | POST | Yes (with variants) | Partial | Bearer | NO | available_for_validation |
| 10 | Reject transfer | `/inventory-transfer/reject/{id}` | POST | Yes (with variants) | Partial | Bearer | NO | available_for_validation |
| 11 | Edit request | `/inventory-transfer/edit/{id}` | POST | Yes | Partial | Bearer | NO | available_for_validation |
| 12 | Transfer detail | `/inventory-transfer/details/{id}` | GET | N/A | Partial | Bearer | YES — from/to restaurant type | available_for_validation |
| 13 | Transfer history | `/inventory-transfer/history` | POST | Yes | Partial | Bearer | YES — restaurant type in results | available_for_validation |

### 14.3 Stock & Source APIs

| # | Workflow | Endpoint | Method | Request Sample | Response Sample | Auth | Status |
|---|---|---|---|---|---|---|---|
| 14 | Source selector | `/inventory-transfer/source-options` | POST | Yes (from curls) | Partial (from docs) | Bearer | available_for_validation |
| 15 | Add stock | `/inventory/add-stock/{id}` | POST | Yes (from curls) | Partial | Bearer | available_for_validation |
| 16 | Get inventory items | `/inventory/get-inventory-master` | GET | N/A | Unknown | Bearer | api_sample_missing |

### 14.4 Pending Queues

| # | Workflow | Endpoint | Method | Request Sample | Response Sample | Auth | Status |
|---|---|---|---|---|---|---|---|
| 17 | Pending actions | `/inventory-transfer/pending-queues` | POST | Yes | Partial (from docs) | Bearer | available_for_validation |

### 14.5 Franchise APIs

| # | Workflow | Endpoint | Method | Request Sample | Auth | Status |
|---|---|---|---|---|---|---|
| 18 | Franchise list | `/franchise/list` | GET | N/A | Bearer | available_for_validation |
| 19 | Franchise create | `/franchise/create` | POST | Yes | Bearer | available_for_validation |
| 20 | Franchise manage | `/franchise/manage/{id}` | GET | N/A | Bearer | available_for_validation |
| 21 | Franchise push | `/franchise/push/{id}` | POST | Yes | Bearer | available_for_validation |
| 22 | Franchise push form | `/franchise/push-form/{id}` | GET | N/A | Bearer | available_for_validation |
| 23 | Franchise history | `/franchise/history` | POST | Yes | Bearer | available_for_validation |

### 14.6 Auth APIs

| # | Workflow | Endpoint | Method | Status |
|---|---|---|---|---|
| 24 | Vendor employee login | `/api/v1/auth/vendoremployee/common-login` | POST | available_for_validation |
| 25 | Admin login as restaurant | `/api/v1/auth/adminemployee/login-as-restaurant` | POST | available_for_validation |
| 26 | Normal vendor login | `/api/v1/auth/vendoremployee/login` | POST | available_for_validation |

### 14.7 APIs Not Yet Provided

| # | Workflow | Expected Endpoint | Status |
|---|---|---|---|
| 27 | Stock adjustment | Unknown | owner_to_provide |
| 28 | Wastage entry | Unknown | owner_to_provide |
| 29 | Stock return (child to parent) | Unknown (may reuse request) | owner_to_provide |
| 30 | Recipe list | Unknown (existing system) | api_sample_missing |
| 31 | Recipe ingredient mapping | Unknown (existing system) | api_sample_missing |
| 32 | Consumption update | Unknown (manage_stock internal) | api_sample_missing |
| 33 | Low-stock alert configuration | Unknown | owner_to_provide |
| 34 | User roles / permissions API | Unknown (existing system) | api_sample_missing |

---

## 15. API Verification Matrix

| # | API Name | Endpoint | Method | Request Provided | Response Provided | Owner Tested | Internal Tool Tested | Terminology Checked | `master` Meaning Confirmed | Final Status | Frontend Ready |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Hierarchy Summary | /hierarchy-summary | POST | Yes | Partial | Unknown | No | No | No | available_for_validation | not_ready |
| 2 | Hierarchy Detail | /hierarchy-detail | POST | Yes | Partial | Unknown | No | No | No | available_for_validation | not_ready |
| 3 | Direct Dispatch | /initiate | POST | Yes | Partial | Unknown | No | No | No | available_for_validation | not_ready |
| 4 | Request Stock | /request | POST | Yes | Partial | Unknown | No | No | No | available_for_validation | not_ready |
| 5 | Approve | /approve/{id} | POST | Yes | Partial | Unknown | No | No | No | available_for_validation | not_ready |
| 6 | Dispatch Approved | /dispatch/{id} | POST | Yes | Partial | Unknown | No | No | No | available_for_validation | not_ready |
| 7 | Receive | /receive/{id} | POST | Yes | Partial | Unknown | No | No | No | available_for_validation | not_ready |
| 8 | Cancel | /cancel/{id} | POST | Yes | Partial | Unknown | No | No | No | available_for_validation | not_ready |
| 9 | Reject | /reject/{id} | POST | Yes | Partial | Unknown | No | No | No | available_for_validation | not_ready |
| 10 | Edit | /edit/{id} | POST | Yes | Partial | Unknown | No | No | No | available_for_validation | not_ready |
| 11 | Details | /details/{id} | GET | N/A | Partial | Unknown | No | No | No | available_for_validation | not_ready |
| 12 | History | /history | POST | Yes | Partial | Unknown | No | No | No | available_for_validation | not_ready |
| 13 | Source Options | /source-options | POST | Yes | Partial | Unknown | No | No | No | available_for_validation | not_ready |
| 14 | Add Stock | /add-stock/{id} | POST | Yes | Partial | Unknown | No | No | N/A | available_for_validation | not_ready |
| 15 | Pending Queues | /pending-queues | POST | Yes | Partial | Unknown | No | No | No | available_for_validation | not_ready |
| 16 | Get Inventory | /get-inventory-master | GET | No | No | Unknown | No | No | N/A | api_sample_missing | not_ready |
| 17 | Stock Adjustment | Unknown | Unknown | No | No | No | No | No | N/A | owner_to_provide | not_ready |
| 18 | Wastage Entry | Unknown | Unknown | No | No | No | No | No | N/A | owner_to_provide | not_ready |

---

## 16. API Hierarchy Mapping Checklist

For each hierarchy-related API, the following must be verified during API verification:

| Check | hierarchy-summary | hierarchy-detail | initiate | request | details | history | pending-queues |
|---|---|---|---|---|---|---|---|
| Backend top-level key | `store_type:"central"` returns Master stores | In `restaurants` list | `from_restaurant_id` (master type) | N/A (auto from parent) | `from_restaurant` | `restaurant` | N/A |
| Backend middle-level key | `store_type:"franchise"` returns Outlets | `store_restaurant_id` | `to_restaurant_id` | N/A | `to_restaurant` | `restaurant` | N/A |
| Backend outlet key | N/A | `store_restaurant_id` | `to_restaurant_id` | N/A | `to_restaurant` | `restaurant` | N/A |
| Parent-child relationship | Implied by visibility | `restaurants` list | Validated server-side | `parent_restaurant_id` | Transfer relationship | N/A | N/A |
| Transfer source field | N/A | N/A | `from_restaurant_id` | Auto (parent) | `from_restaurant_id` | `from_restaurant_id` | `from_restaurant_id` |
| Transfer destination field | N/A | N/A | `to_restaurant_id` | Auto (self) | `to_restaurant_id` | `to_restaurant_id` | `to_restaurant_id` |
| Display label to use | Mapped business term | Mapped business term | Mapped | Mapped | Mapped | Mapped | Mapped |
| `master` means Central? | YES | YES | YES | N/A | YES | YES | Possibly |

**ALL hierarchy APIs must have terminology mapping verified before frontend integration.**

---

## 17. API Verification Gate

**Current Status:** `not_yet_verified`

| Gate | Status |
|---|---|
| APIs provided by owner | Yes (documented with curl samples) |
| Request samples available | Yes for most transfer APIs |
| Response samples available | Partial (documented from backend implementation docs, not actual captures) |
| Internal API verification tool built | No (Phase 1 — to be built) |
| Terminology mapping verified per API | No |
| All Phase 1 APIs tested | No |
| APIs marked frontend-ready | None |

**Required before frontend integration:**
1. Build internal API verification tool
2. Run each API with real tokens
3. Capture actual response samples
4. Verify terminology mapping per API
5. Mark each API with final status

---

## 18. Data Entities -- Planning Level

| # | Entity | Purpose | Used in Workflows | Business Term | Backend/API Term | API Source | Fields Provided | Fields Unknown |
|---|---|---|---|---|---|---|---|---|
| 1 | Inventory Item | Stock item / SKU | WF-001, WF-002 | Item | `inventory_master` row | add-stock, get-inventory-master | stock_title, unit_id, cal_quantity | category, min_qty_alert config |
| 2 | Unit of Measurement | Quantity units (kg, gm, ltr, ml) | All transfer workflows | Unit | `unit` table | Backend unit metadata | id, name, conversion_factor, base_unit | Full list |
| 3 | Store / Warehouse | Any hierarchy-level store | All workflows | Store | `restaurant` | hierarchy-summary/detail | restaurant_id, restaurant_name, restaurant_type | Full restaurant model |
| 4 | Central Store | Top-level store | WF-003, WF-006, WF-008 | Central | Backend `master` restaurant | hierarchy APIs | restaurant_id, name, type=master | — |
| 5 | Master Store | Middle-level store | WF-004, WF-007 | Master | Backend `central` restaurant | hierarchy APIs | restaurant_id, name, type=central | — |
| 6 | Outlet / Unit | Bottom-level store | WF-005, WF-007, WF-008 | Outlet | Backend `franchise` restaurant | hierarchy APIs | restaurant_id, name, type=franchise | — |
| 7 | Stock Balance | Aggregate stock per item per store | Stock views | Balance | `inventory_master` | hierarchy-detail | stock_title, unit_id, cal_quantity, display_qty, is_low_stock | — |
| 8 | Stock Segment | Batch-level stock ledger | Dispatch, source selection | Batch/Lot | `inventory_stock_segments` | source-options | batch, expiry_date, cal_quantity, source_restaurant_id, origin_transfer_id | — |
| 9 | Stock Transfer | Transfer header | All transfer workflows | Transfer | `inventory_transfers` | All transfer APIs | id, from_restaurant_id, to_restaurant_id, status, type, resolution_type | — |
| 10 | Transfer Line Item | Individual item in transfer | Transfer workflows | Line Item | `inventory_transfer_lines` | details, history | stock_title, quantity, unit, source_selector, meta_json | — |
| 11 | Stock Dispatch | Dispatch event | WF-006-008, WF-010 | Dispatch | Transfer with status=dispatched | initiate, dispatch/{id} | Same as transfer | — |
| 12 | Stock Receiving | Receive event | WF-011, WF-012 | Receive | Transfer with status=received | receive/{id} | received_lines, resolution | — |
| 13 | Stock Adjustment | Manual correction | WF-015 | Adjustment | Unknown | owner_to_provide | Unknown | All |
| 14 | Wastage Entry | Spoilage record | WF-016 | Wastage | Unknown | owner_to_provide | Unknown | All |
| 15 | Stock Return | Child→parent return | WF-014 | Return | Unknown (may reuse transfer) | owner_to_provide | Unknown | All |
| 16 | Stock Ledger Entry | Movement record | WF-019 | Transaction | `transactions` in hierarchy-detail | hierarchy-detail | transfer_id, from/to, stock_title, qty, status, date | — |
| 17 | Recipe | Recipe definition | WF-017 | Recipe | `recipes` | Existing APIs | id, name, restaurant_id | Full model |
| 18 | Recipe Ingredient | Ingredient in recipe | WF-017 | Ingredient | `recipe_detail` | Existing APIs | main_recipe, ingredients (inventory_master_id) | Quantities |
| 19 | Transfer Event | Audit trail entry | WF-019 | Event | `inventory_transfer_events` | Not directly exposed via API | event_type, actor, meta_json | API exposure |
| 20 | Push Entity Map | Franchise push mapping | WF (push) | Push Map | `central_push_entity_map` | franchise/push | source/target IDs, module | — |
| 21 | API Verification Record | API test result | WF-021 | API Test | Frontend-only (local storage or DB) | N/A | endpoint, status, notes, terminology_flags | — |

---

## 19. Reports

### Required Reports (Phase 1)

| # | Report | Description | API Source | Role |
|---|---|---|---|---|
| 1 | Hierarchy Stock Overview | Stock across all visible stores | hierarchy-summary | Central, Master |
| 2 | Store Stock Detail | Detailed stock for one store | hierarchy-detail | All roles |
| 3 | Transfer Activity by Store | Sent/received/txn counts per store per date range | hierarchy-summary | Central, Master |
| 4 | Transfer History | List of all transfers with filters | history | All roles |
| 5 | Low Stock Report | Items below minimum threshold | hierarchy-detail (is_low_stock) | All roles |
| 6 | Batch Expiry Report | Items nearing or past expiry | hierarchy-detail (batches) | All roles |

### Optional Reports (Phase 2 / Future)

| # | Report | Description |
|---|---|---|
| 7 | Stock Valuation Report | Stock with cost/value |
| 8 | Wastage Report | Wastage by store/item/period |
| 9 | Consumption vs Stock Report | Recipe consumption vs available stock |
| 10 | Transfer Turnaround Report | Time from request to receive |
| 11 | Adjustment History Report | All manual adjustments |
| 12 | Audit Trail Report | Event log summary |

### Open Questions

See Q-REPORT-001 through Q-REPORT-006 in Section 23.

---

## 20. Notifications / Alerts

### Phase 1 (In-App)

| # | Alert | Trigger | Recipient |
|---|---|---|---|
| 1 | New transfer request | Child requests stock | Parent store manager |
| 2 | Transfer approved | Parent approves request | Requesting store |
| 3 | Transfer dispatched | Stock dispatched | Destination store |
| 4 | Transfer received | Stock received | Source store |
| 5 | Transfer rejected | Transfer rejected | Relevant party |
| 6 | Low stock | Stock below minimum | Store manager |

### Phase 2 (External)

| # | Alert | Channel |
|---|---|---|
| 7 | Low stock critical | WhatsApp / Email |
| 8 | Transfer overdue | WhatsApp / Email |
| 9 | Expiry approaching | WhatsApp / Email |

### Implementation Notes

- Phase 1 notifications via polling `pending-queues` API (already returns counts)
- No dedicated notification API exists yet — needs owner confirmation
- See Q-NOTIF-001 through Q-NOTIF-005

---

## 21. MVP Scope Recommendation

### A. Must Have -- Phase 1

| # | Feature | Reason |
|---|---|---|
| 1 | Three-level hierarchy setup (Central → Master → Outlet) | Core architecture |
| 2 | Backend terminology mapping adapter | CRITICAL — prevents hierarchy inversion |
| 3 | Operations Hub dashboard | Entry point for all users |
| 4 | Hierarchy Summary (store list with activity) | Core visibility |
| 5 | Store Detail (stock + batches + transactions) | Core operations |
| 6 | Stock transfer request flow | Core workflow |
| 7 | Transfer approval flow | Business control |
| 8 | Direct dispatch (parent to child) | Primary stock movement |
| 9 | Source selector / batch selection | Mandatory for dispatch accuracy |
| 10 | Stock receiving (full + partial) | Complete transfer cycle |
| 11 | Transfer rejection + cancel with resolutions | Error handling |
| 12 | Transfer detail + status tracking | Operational visibility |
| 13 | Pending queues (action inbox) | Workflow management |
| 14 | Add stock (opening + replenishment) | Stock initialization |
| 15 | Stock ledger / transaction timeline | Audit and tracking |
| 16 | Low-stock alerts (embedded in stock views) | Operational efficiency |
| 17 | Reports dashboard (hierarchy summary + detail) | Management visibility |
| 18 | Role-based visibility (scoped by hierarchy) | Security |
| 19 | Transfer edit (pre-dispatch) | Correction workflow |
| 20 | Internal API verification tool | API trust foundation |
| 21 | Audit trail (transfer events) | Compliance |

### B. Should Have -- Phase 1

| # | Feature | Reason |
|---|---|---|
| 1 | Stock adjustment with reason | Operational necessity |
| 2 | Wastage / spoilage entry | Common in F&B |
| 3 | Recipe-based consumption tracking | Inventory accuracy |
| 4 | Stock return (child to parent) | Reverse flow need |
| 5 | Franchise push (metadata sync) | Parent-child setup |
| 6 | Batch expiry highlighting (near-expiry warning) | Quality control |
| 7 | In-app notifications (polling-based) | User awareness |

### C. Phase 2

| # | Feature | Reason |
|---|---|---|
| 1 | External notifications (WhatsApp, Email) | Enhanced alerting |
| 2 | Stock valuation reports | Financial visibility |
| 3 | Configurable permissions UI | Granular access control |
| 4 | Lateral transfers (peer-to-peer) | Advanced workflow |
| 5 | Multi-warehouse per store level | Complex deployments |
| 6 | Barcode/QR scanning for receiving | Operational efficiency |
| 7 | Advanced analytics dashboard | Decision support |

### D. Future

| # | Feature | Reason |
|---|---|---|
| 1 | Dynamic hierarchy (N levels) | Enterprise scalability |
| 2 | Purchase order integration | End-to-end procurement |
| 3 | Vendor management | Supplier tracking |
| 4 | Automated reorder | Smart replenishment |
| 5 | Mobile-optimized interface | Field operations |

---

## 22. Acceptance Criteria

### Core Hierarchy

1. Owner can view stock at Central, Master, and Outlet levels with correct business terminology labels.
2. UI displays "Central Inventory" for top-level stores (backend `master`), "Master Store" for middle-level (backend `central`), and "Outlet" for bottom-level (backend `franchise`).
3. Backend terminology (`master`, `central`, `franchise`) never appears in user-facing UI elements.

### Stock Transfer

4. Central user can create and dispatch a transfer to a Master store.
5. Master user can create and dispatch a transfer to an Outlet.
6. Central user can create a direct transfer to an Outlet (if business rule approved).
7. Outlet user can request stock from their parent Master store.
8. Master user can request stock from their parent Central store.
9. Parent user can approve or reject a child's stock request.
10. Approved request can be dispatched with mandatory source segment selection.
11. Destination user can receive stock (full or partial).
12. Partial receiving with resolution types (return_to_source, damaged, partial_return, in_transit_hold) works correctly.
13. Transfer rejection (pre-dispatch and post-dispatch) works with correct stock restoration behavior.
14. Transfer cancellation restores source stock when resolution is return_to_source.
15. Edit of a request/approved transfer resets status to requested (forces re-approval).

### Stock Visibility

16. Receiving stock updates stock visibility at the destination store.
17. Dispatching stock reduces stock visibility at the source store.
18. Stock ledger records every stock movement with date, source, destination, quantity, and status.
19. Rejected and cancelled transfers are visible in transfer history.
20. Low-stock items are highlighted in stock views.

### Batch & Expiry

21. Dispatch requires explicit source segment/batch selection (no silent FEFO fallback).
22. Expired segments are excluded from dispatch options.
23. Batch and expiry information is visible in drilldown views.

### Reports

24. Reports show stock by hierarchy level with correct business terminology.
25. Date range and store filters work correctly.

### Validation & Errors

26. Required fields prevent invalid transfer submission.
27. Missing source_selector results in clear 422 error.
28. API errors are shown clearly to the user with actionable messages.
29. Out-of-scope store access returns 403 with clear message.

### API Verification

30. Internal API verification tool can send requests to any backend endpoint.
31. Tool shows raw and formatted JSON responses.
32. Tool highlights `master`/`central`/`franchise` terms with business meaning annotations.
33. APIs are not marked frontend-ready unless verified or explicitly approved with risk noted.
34. No API using `master` in its response is trusted until its business meaning is confirmed and documented.

### Audit

35. Transfer events (create, approve, edit, dispatch, receive, cancel, reject) are recorded.
36. Each event captures actor, timestamp, and relevant data snapshot.

---

## 23. Owner Question Packet

### Hierarchy Questions

**Q-HIER-001:** Can Central Inventory transfer stock directly to an Outlet (bypassing Master)?

A. Yes, Central can transfer to both Master and Outlet  
B. No, Central can transfer only to Master  
C. Depends on user permission  
D. Not required in Phase 1  

Recommended answer: A  
Reason: Backend already supports master→franchise direct dispatch.  
Impact if not answered: Frontend cannot finalize transfer flow options.

---

**Q-HIER-002:** Can Master transfer/return stock back to Central?

A. Yes, Master can return stock to Central  
B. No, stock only flows downward  
C. Only through a special return workflow  
D. Not required in Phase 1  

Recommended answer: C  
Reason: Returns need separate handling from regular transfers.  
Impact if not answered: Return flow cannot be designed.

---

**Q-HIER-003:** Can Outlet return stock to Master?

A. Yes  
B. No  
C. Only through a wastage/adjustment entry  
D. Not required in Phase 1  

Recommended answer: A  
Reason: Operational necessity for wrong/excess deliveries.  
Impact if not answered: Outlet return workflow blocked.

---

**Q-HIER-004:** Can Outlet return stock directly to Central?

A. Yes  
B. No, only through Master  
C. Only if Central dispatched directly  
D. Not required in Phase 1  

Recommended answer: C  
Reason: Return should trace back to original sender.  
Impact if not answered: Return routing unclear.

---

**Q-HIER-005:** Can Master transfer to another Master (lateral/peer transfer)?

A. Yes  
B. No, only vertical (parent→child)  
C. Phase 2  
D. Not required  

Recommended answer: B  
Reason: Backend validates hierarchy parent-chain; lateral not supported.  
Impact if not answered: UI may show invalid transfer options.

---

**Q-HIER-006:** Can Outlet transfer to another Outlet?

A. Yes  
B. No  
C. Phase 2  
D. Not required  

Recommended answer: B  
Reason: Same as Q-HIER-005.  
Impact if not answered: Same.

---

**Q-HIER-007:** Can one Central have multiple Master stores?

A. Yes  
B. No, one-to-one  
C. Configurable  

Recommended answer: A  
Reason: Backend supports one-to-many.  
Impact if not answered: Store hierarchy display unclear.

---

**Q-HIER-008:** Can one Master manage multiple Outlets?

A. Yes  
B. No  
C. Configurable  

Recommended answer: A  
Reason: Backend supports one-to-many.  
Impact if not answered: Store hierarchy display unclear.

---

**Q-HIER-009:** Can one Outlet belong to more than one Master?

A. No, one parent only  
B. Yes, shared  
C. Not sure  

Recommended answer: A  
Reason: Backend uses single `parent_restaurant_id`.  
Impact if not answered: Stock ownership ambiguity.

---

**Q-HIER-010:** Fixed 3-level hierarchy or configurable later?

A. Fixed 3 levels  
B. Configurable from start  
C. Fixed P1, configurable P2  

Recommended answer: A  
Reason: Backend is built on fixed types.  
Impact if not answered: Architecture deferred.

---

### Backend Terminology Mapping Questions

**Q-TERM-001:** In backend APIs, does `master` represent the top-level Central/Center inventory?

A. Yes, backend `master` = business Central/Center  
B. No, backend `master` = business Master (middle level)  
C. Depends on endpoint  
D. Verify from API samples  

Recommended answer: A (confirmed from docs but needs owner acknowledgment)  
Reason: Backend visibility rules confirm master is top-level.  
Impact if not answered: Entire hierarchy could be inverted in UI.

---

**Q-TERM-002:** What should the frontend UI call the top-level inventory?

A. Central Inventory  
B. Center Inventory  
C. Central Store  
D. Master Inventory (match backend)  

Recommended answer: A  
Reason: Business hierarchy uses Central as top level.  
Impact if not answered: Users confused.

---

**Q-TERM-003:** Should backend API field names be shown directly in the UI?

A. No, use business terms only  
B. Yes  
C. Only in developer/API tool  
D. Decide later  

Recommended answer: A  
Reason: Backend naming inverts business language.  
Impact if not answered: Confusing UI.

---

**Q-TERM-004:** Should frontend create a mapping adapter for backend→business terms?

A. Yes  
B. No, use backend names  
C. Only document, no adapter  
D. Decide during frontend  

Recommended answer: A  
Reason: Prevents naming confusion spreading across codebase.  
Impact if not answered: Risk of regression when new developers join.

---

### Role/Permission Questions

**Q-ROLE-001:** Should Kitchen Manager be able to request stock?

A. Yes  
B. No, only Outlet Manager  
C. Depends on configuration  
D. Decide later  

Recommended answer: B  
Reason: Stock requests are typically manager-level operations.  
Impact if not answered: Permission matrix incomplete.

---

**Q-ROLE-002:** Should Outlet Manager see stock cost/value?

A. Yes  
B. No, cost hidden from Outlet  
C. Configurable per deployment  
D. Decide later  

Recommended answer: C  
Reason: Some businesses hide cost from outlet level.  
Impact if not answered: Report fields unclear.

---

### Stock Transfer Questions

**Q-XFER-001:** Is approval required for ALL transfers or only request-based transfers?

A. All transfers require approval  
B. Only request-based; direct dispatch skips approval  
C. Configurable per store  
D. Decide later  

Recommended answer: B  
Reason: Backend has two paths: request→approve→dispatch and direct initiate.  
Impact if not answered: UI workflow unclear.

---

**Q-XFER-002:** Can a transfer be partially dispatched?

A. Yes  
B. No, full dispatch only  
C. Phase 2  
D. Not sure  

Recommended answer: B  
Reason: Backend dispatches all approved lines at once.  
Impact if not answered: Dispatch UI unclear.

---

**Q-XFER-003:** What happens if received quantity differs from dispatched?

A. Only exact match allowed  
B. Partial receive + resolution for difference  
C. System auto-adjusts  

Recommended answer: B  
Reason: Backend supports `received_lines` with `accepted_qty` + `rejected_qty`.  
Impact if not answered: Receive UI unclear.

---

**Q-XFER-004:** Is stock reduced from source on dispatch or on approval?

A. On dispatch  
B. On approval  
C. On receive  

Recommended answer: A  
Reason: Backend debits source on dispatch, credits destination on receive.  
Impact if not answered: Stock timing confusion.

---

### Stock Adjustment Questions

**Q-ADJ-001:** Is there a dedicated stock adjustment API?

A. Yes (please share)  
B. No, use add-stock with negative  
C. Not implemented yet  
D. Not needed  

Recommended answer: Owner to confirm  
Impact if not answered: Adjustment workflow blocked.

---

**Q-ADJ-002:** Who can adjust stock?

A. Only Central Manager  
B. Any store manager  
C. Configurable per role  

Recommended answer: C  
Impact if not answered: Permission unclear.

---

**Q-ADJ-003:** Is approval required for stock adjustment?

A. Yes  
B. No  
C. Only for adjustments above a threshold  
D. Decide later  

Recommended answer: B  
Impact if not answered: Adjustment flow unclear.

---

**Q-ADJ-004:** Should adjustment reason be mandatory?

A. Yes  
B. No  
C. Configurable  

Recommended answer: A  
Reason: Audit trail.  
Impact if not answered: Data integrity risk.

---

**Q-ADJ-005:** Should photo/evidence be required for adjustments?

A. Yes  
B. Optional  
C. Not required  
D. Phase 2  

Recommended answer: B  
Impact if not answered: UI form unclear.

---

### Wastage Questions

**Q-WASTE-001:** Is there a dedicated wastage API?

A. Yes (please share)  
B. No, not implemented yet  
C. Use stock adjustment as wastage  

Recommended answer: Owner to confirm  
Impact if not answered: Wastage workflow blocked.

---

**Q-WASTE-002:** Who can create wastage entries?

A. Any store manager  
B. Only Outlet Manager and Kitchen Manager  
C. Configurable  

Recommended answer: A  
Impact if not answered: Permission unclear.

---

**Q-WASTE-003:** Is approval required for wastage?

A. Yes  
B. No  
C. Only above threshold  

Recommended answer: B  
Impact if not answered: Wastage flow unclear.

---

**Q-WASTE-004:** Should wastage affect stock ledger immediately?

A. Yes  
B. Only after approval  
C. Decide later  

Recommended answer: A  
Impact if not answered: Stock accuracy timing unclear.

---

**Q-WASTE-005:** Should photo/evidence be required for wastage?

A. Yes, mandatory  
B. Optional  
C. Not required  

Recommended answer: B  
Impact if not answered: UI form unclear.

---

### Recipe/Consumption Questions

**Q-RECIPE-001:** Should outlet sales automatically reduce inventory?

A. Yes, live deduction  
B. Yes, but at day-end batch  
C. Manual reconciliation  
D. Phase 2  

Recommended answer: A  
Reason: Backend `manage_stock()` exists for live deduction.  
Impact if not answered: Consumption tracking unclear.

---

**Q-RECIPE-002:** What happens if recipe mapping is missing for a sold item?

A. Skip deduction, log warning  
B. Block the sale  
C. Deduct from a default bucket  

Recommended answer: A  
Reason: Backend already skips deduction when `recipe_id` is null.  
Impact if not answered: Missing consumption data.

---

**Q-RECIPE-003:** What happens if stock is insufficient during a sale?

A. Allow sale, stock goes negative  
B. Block sale  
C. Allow sale, alert manager  

Recommended answer: A  
Reason: Backend currently allows negative stock.  
Impact if not answered: Stock floor policy unclear.

---

**Q-RECIPE-004:** Should consumption be visible in stock ledger?

A. Yes  
B. No, separate consumption report  
C. Both  

Recommended answer: C  
Impact if not answered: Ledger completeness unclear.

---

**Q-RECIPE-005:** Can stock go negative?

A. Yes, allowed (current behavior)  
B. No, enforce floor at zero  
C. Configurable per item  
D. Decide later  

Recommended answer: A  
Reason: Backend currently allows it; changing would be a significant policy change.  
Impact if not answered: Stock constraints undefined.

---

### Reporting Questions

**Q-REPORT-001:** Should reports show quantity only or quantity plus value?

A. Quantity only  
B. Quantity + value  
C. Configurable per role  

Recommended answer: B  
Impact if not answered: Report content unclear.

---

**Q-REPORT-002:** Should cost be visible to Outlet users?

A. Yes  
B. No, Central/Master only  
C. Configurable  

Recommended answer: C  
Impact if not answered: Report access unclear.

---

**Q-REPORT-003:** Should Central see all Outlets directly?

A. Yes  
B. Only through Master hierarchy  
C. Both views  

Recommended answer: C  
Reason: Backend supports both direct and hierarchical visibility.  
Impact if not answered: Report scope unclear.

---

**Q-REPORT-004:** Should reports be exportable?

A. Yes (CSV/PDF)  
B. Phase 2  
C. Not needed  

Recommended answer: A  
Impact if not answered: Export feature deferred.

---

**Q-REPORT-005:** Should date, store, item, and category filters be required?

A. Yes, all filters  
B. Date and store minimum  
C. Decide per report  

Recommended answer: A  
Impact if not answered: Report filter scope unclear.

---

**Q-REPORT-006:** Should reports include a comparison period (e.g., vs last week)?

A. Yes  
B. Phase 2  
C. Not needed  

Recommended answer: B  
Impact if not answered: Report complexity deferred.

---

### Notification Questions

**Q-NOTIF-001:** Should low-stock alerts be shown in-app?

A. Yes  
B. Only in reports  
C. Phase 2  

Recommended answer: A  
Reason: hierarchy-detail already returns `is_low_stock`.  
Impact if not answered: Alert visibility unclear.

---

**Q-NOTIF-002:** Should transfer notifications be in-app?

A. Yes (via polling pending-queues)  
B. Real-time (WebSocket)  
C. Phase 2  

Recommended answer: A  
Reason: pending-queues API already provides counts; polling is simplest.  
Impact if not answered: Notification architecture unclear.

---

**Q-NOTIF-003:** Should WhatsApp/email alerts be in Phase 1?

A. Yes  
B. No, Phase 2  
C. Not needed  

Recommended answer: B  
Impact if not answered: Notification scope unclear.

---

**Q-NOTIF-004:** Who receives low-stock alerts?

A. Store manager only  
B. Store manager + parent manager  
C. Configurable  

Recommended answer: B  
Impact if not answered: Alert routing unclear.

---

**Q-NOTIF-005:** Should there be a notification center/inbox?

A. Yes, dedicated notification screen  
B. No, inline in dashboard only  
C. Phase 2  

Recommended answer: B  
Reason: Pending-queues already serves as action inbox.  
Impact if not answered: UI design unclear.

---

### API/Data Questions

**Q-API-001:** Should we build an internal API verification console inside this project?

A. Yes, build a simple API test console  
B. No, use external Postman only  
C. Build temporary dev-only page  
D. Decide later  

Recommended answer: A (**Owner selected this**)  
Impact if not answered: API verification approach unclear.

---

**Q-API-002:** Should the API verification tool be visible only in development/admin mode?

A. Yes, dev/admin only  
B. Only Super Admin  
C. Available in production  
D. Temporary only  

Recommended answer: A  
Impact if not answered: Security model unclear.

---

**Q-API-003:** Should verified request/response samples be saved into documentation?

A. Yes, save all  
B. Save only important  
C. Status only  
D. Decide later  

Recommended answer: A  
Impact if not answered: Future agents lack API evidence.

---

**Q-API-004:** Should frontend integration start only after API verification?

A. Yes, verified first  
B. Start with mock, final after verification  
C. Direct integration  
D. Per workflow  

Recommended answer: B  
Reason: Parallel work while maintaining trust.  
Impact if not answered: Frontend planning blocked or unreliable.

---

**Q-API-005:** Should API verification tool show backend-to-business terminology mapping?

A. Yes, for all responses  
B. Only hierarchy APIs  
C. Documentation only  
D. Decide later  

Recommended answer: B  
Impact if not answered: Terminology confusion in tool.

---

### MVP Scope Questions

**Q-MVP-001:** Is the recommended MVP scope (Section 21) acceptable?

A. Yes, proceed  
B. Need adjustments (please specify)  
C. Too large, reduce  
D. Too small, add more  

Recommended answer: A  
Impact if not answered: Scope not approved.

---

**Q-MVP-002:** Should stock adjustment and wastage be Must Have or Should Have for Phase 1?

A. Must Have  
B. Should Have  
C. Phase 2  

Recommended answer: A (user requested comprehensive/production-grade)  
Impact if not answered: Feature priority unclear.

---

## 24. API/Data Pending List

| # | Missing Item | Category | Blocking? | Needed Before |
|---|---|---|---|---|
| 1 | Stock adjustment API endpoint + payload | API | Yes (for adjustment workflow) | Frontend implementation |
| 2 | Wastage entry API endpoint + payload | API | Yes (for wastage workflow) | Frontend implementation |
| 3 | Stock return API (child→parent) or confirmation to reuse request | API | Yes (for return workflow) | Frontend implementation |
| 4 | Get inventory master full response sample | API | Partially | Item management screens |
| 5 | Recipe list API endpoint | API | For recipe screens | Recipe mapping screen |
| 6 | Recipe ingredient detail API | API | For consumption tracking | Consumption workflow |
| 7 | Low-stock alert configuration API | API | For alert setup | Alert configuration |
| 8 | User roles/permissions API | API | For role-based UI | Permission management |
| 9 | Actual response samples (not just documentation descriptions) | Data | For API verification | Verification tool testing |
| 10 | Test account tokens for each role (Central, Master, Outlet) | Credentials | For testing | All API verification |
| 11 | Confirmed restaurant IDs for test hierarchy | Data | For testing | All API verification |
| 12 | Terminology mapping confirmation from owner | Decision | CRITICAL | Frontend integration |

---

## 25. API Evidence Handover

### Recommended Evidence Path

`/app/memory/central_inventory/api_evidence/`

### Evidence Structure

```
/app/memory/central_inventory/api_evidence/
  /hierarchy/
    hierarchy-summary-request.json
    hierarchy-summary-response.json
    hierarchy-detail-request.json
    hierarchy-detail-response.json
  /transfers/
    initiate-request.json
    initiate-response.json
    request-stock-request.json
    request-stock-response.json
    approve-request.json
    approve-response.json
    dispatch-request.json
    dispatch-response.json
    receive-request.json
    receive-response.json
    partial-receive-request.json
    partial-receive-response.json
    cancel-request.json
    cancel-response.json
    reject-request.json
    reject-response.json
  /stock/
    source-options-request.json
    source-options-response.json
    add-stock-request.json
    add-stock-response.json
  /queues/
    pending-queues-request.json
    pending-queues-response.json
  /auth/
    login-request.json
    login-response.json
  /terminology-mapping/
    confirmed-mapping.json
    api-field-audit.json
```

**Note:** No fake evidence has been created. Evidence folder structure is recommended. Actual evidence should be captured during API verification phase using the internal API verification tool.

---

## 26. Risks / Ambiguities

| # | Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|---|
| 1 | **Backend `master` / `central` terminology is INVERTED from business hierarchy** | CRITICAL | CONFIRMED | Mandatory mapping adapter; verify per API; never display raw backend terms |
| 2 | API samples from docs are implementation descriptions, not actual captured responses | HIGH | HIGH | Use API verification tool to capture real responses before frontend integration |
| 3 | Stock adjustment and wastage APIs may not exist yet | HIGH | MEDIUM | Owner must confirm; if missing, backend work needed before frontend |
| 4 | Stock return flow not clearly defined in backend docs | MEDIUM | HIGH | Owner must clarify if request flow can be reused in reverse |
| 5 | Recipe consumption linkage breaks after franchise push | HIGH | CONFIRMED (fixed) | Verify push diagnostics; include in regression testing |
| 6 | Negative stock is allowed by current backend | MEDIUM | CONFIRMED | Owner must decide if this is acceptable for production |
| 7 | Transfer events table may not be exposed via API | MEDIUM | MEDIUM | May need dedicated audit API |
| 8 | Missing APIs block "Should Have" features | MEDIUM | HIGH | Clearly mark blocked features; don't mock critical paths |
| 9 | Role permissions are not well-defined in backend docs | MEDIUM | HIGH | Owner must provide permission matrix |
| 10 | `hierarchy-summary` filter `store_type: "central"` returns business Master stores — counterintuitive for developers | HIGH | HIGH | Document extensively; add code comments; verify in testing |

---

## 27. Handover to Next Agent

### What is Ready

- Complete CR Requirement Planning Document
- 26 functional modules identified and classified
- 22 core workflows documented
- 23 frontend screens planned (SCR-00 through SCR-22)
- Full API collection matrix (26+ APIs documented)
- API verification matrix initialized
- Backend terminology mapping CONFIRMED and documented (CRITICAL: inverse naming)
- Terminology mapping table created
- Complete owner question packet (50+ questions)
- MVP scope recommended (comprehensive Phase 1)
- Plain-English acceptance criteria drafted (36 criteria)
- API evidence folder structure recommended
- Raw reference documents saved at `/app/memory/central_inventory/raw_reference/`

### What is Pending

- Owner answers to question packet (50+ questions)
- Actual API response captures (only documentation-level descriptions available)
- API verification tool construction
- API verification execution
- Terminology mapping confirmed by owner
- MVP scope approved by owner
- Missing APIs (adjustment, wastage, return, recipe) — owner to provide or confirm
- Test account tokens and hierarchy restaurant IDs for verification
- Permission matrix finalized

### API Availability Summary

| Status | Count |
|---|---|
| available_for_validation | 23 APIs |
| api_sample_missing | 4 APIs |
| owner_to_provide | 4 APIs |
| Total documented | 31+ APIs |

### API Terminology Mapping Status

- Mapping table created: YES
- Mapping confirmed by owner: NO (pending Q-TERM-001)
- Mapping verified per API: NO (requires API verification tool)
- High-risk APIs identified: hierarchy-summary, hierarchy-detail, details, history (all contain restaurant_type)

### Can API Verification Start?

**YES** — APIs are documented with curl samples. The internal API verification tool needs to be built first, then each API can be tested with real tokens.

**Prerequisites for verification:**
1. Build API verification tool (Phase 1)
2. Obtain test tokens for Central (backend master), Master (backend central), and Outlet (backend franchise) roles
3. Obtain restaurant IDs for test hierarchy

### Can Frontend Analysis Start?

**PARTIALLY** — Screen planning and workflow documentation are complete. However:
- Frontend analysis should NOT finalize any integration until API verification confirms terminology mapping
- UI mockups can start using business terminology
- Component architecture can be planned
- Actual API integration must wait for verification

### Recommended Next Agent Sequence

1. **API Verification Agent** — Build verification tool, test all 23+ APIs, capture evidence, confirm terminology mapping
2. **Frontend Analysis Agent** — Analyze existing codebase, identify integration points, plan component architecture
3. **UI/UX Planning Agent** — Design screens based on workflow docs and business terminology
4. **Implementation Planning Agent** — Create technical implementation plan with verified APIs
5. **Implementation Agent** — Build frontend module
6. **QA Planning Agent** — Create test cases from acceptance criteria

---

## 28. Final Readiness

**Status:** `not_ready_owner_questions_pending`

### Readiness Checklist

| Gate | Status | Notes |
|---|---|---|
| Business hierarchy documented | DONE | Central → Master → Outlet |
| Backend terminology mismatch documented | DONE | CRITICAL inverse mapping confirmed |
| Mapping table created | DONE | See Section 6.2 |
| Terminology owner questions added | DONE | Q-TERM-001 through Q-TERM-004 |
| APIs using `master` flagged | DONE | hierarchy-summary, hierarchy-detail, details, history |
| UI terminology separated from backend | DONE | Business terms defined for all screens |
| Core hierarchy rules confirmed or marked pending | DONE | Q-HIER-001 through Q-HIER-010 |
| MVP scope recommended | DONE | Comprehensive Phase 1 |
| Required API endpoints listed | DONE | 31+ APIs |
| Missing APIs documented | DONE | 8 APIs missing/unclear |
| API verification approach documented | DONE | Internal tool + evidence capture |
| API verification tool included | DONE | Phase 1 support module |
| Stock movement rules answered or marked pending | DONE | 15+ owner questions |
| User roles provisionally mapped | DONE | 8 roles, permission matrix drafted |
| Required screens listed | DONE | 23 screens |
| Owner question packet created | DONE | 50+ questions |
| Acceptance criteria drafted | DONE | 36 criteria |

### NOT Ready For Implementation Because

1. Owner questions not yet answered (50+ pending)
2. MVP scope not yet approved by owner
3. Phase 1 APIs not yet verified with actual responses
4. Terminology mapping not yet confirmed by owner (though high confidence from docs)
5. Missing APIs (adjustment, wastage, return) not yet provided
6. API verification tool not yet built
7. No actual API response evidence captured

---

*End of Central Inventory CR Requirement Planning Document*
