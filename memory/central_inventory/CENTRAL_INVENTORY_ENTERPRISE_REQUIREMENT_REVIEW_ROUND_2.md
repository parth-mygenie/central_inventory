# Central Inventory Enterprise Requirement Review — Round 2

> **Document Version:** 1.0
> **Created:** January 2026
> **Author:** Senior Enterprise Requirement Review Agent
> **Project:** MyGenie POS — Central Inventory Module
> **Review Type:** Second-round enterprise production-grade gap analysis

---

## 1. Review Status

**Status:** `round_2_questions_required`

The CR planning is comprehensive for a first pass, but 43 second-round questions have been identified covering conflicts, missing enterprise scenarios, and implementation-blocking gaps. Owner answers are required before marking ready for API verification or frontend analysis.

---

## 2. Inputs Reviewed

| # | Input | Path / Location | Status |
|---|---|---|---|
| 1 | Central Inventory CR Requirement Planning Document | `/app/memory/central_inventory/CENTRAL_INVENTORY_CR_REQUIREMENT_PLANNING.md` | Reviewed (2,281 lines, 28 sections) |
| 2 | PRD Summary | `/app/memory/PRD.md` | Reviewed |
| 3 | API Implementation Status (raw reference) | `/app/memory/central_inventory/raw_reference/AI/Plans/api_implementation_status.md` | Reviewed |
| 4 | Frontend Integration UI Flow (raw reference) | `/app/memory/central_inventory/raw_reference/AI/Plans/frontend_hierarchy_integration_ui_flow.md` | Reviewed |
| 5 | Full API Curl Collection (raw reference) | `/app/memory/central_inventory/raw_reference/AI/curls/full_api_flow_curls.sh` | Reviewed |
| 6 | Owner Answers (50+ questions) | Conversation history only — **NOT persisted to any file** | Reviewed from conversation |

### CRITICAL META-GAP: Owner Answers Not Persisted

Owner answers to 50+ questions exist **only in conversation history**. They have not been saved to any file in the repository. This is a documentation risk — if context is lost, all answers must be re-collected. Answers should be persisted to `/app/memory/central_inventory/OWNER_ANSWERS_ROUND_1.md` before proceeding.

---

## 3. Executive Summary

The Central Inventory CR planning document is **above-average for a first-pass requirement** — 26 modules, 22 workflows, 23 screens, 31+ APIs, and 36 acceptance criteria are documented. The terminology inversion risk is well-identified and prominently documented.

However, the requirement is **not yet enterprise-production-grade** for the following reasons:

1. **3 direct conflicts** between owner answers and existing backend behavior / other answers
2. **12 original document questions were never asked** to the owner (conversation renumbered/reorganized questions, skipping some)
3. **No stock-in-transit, reservation, or concurrent operation rules** defined
4. **No ledger immutability, before/after quantity, or reversal entry rules** specified
5. **No item master governance** (who creates items, hierarchy-wide vs store-specific, inactive item handling)
6. **No cost model defined** (average cost, FIFO cost, latest cost, transfer pricing)
7. **No decimal precision/rounding policy**
8. **No sales reversal / void / refund impact on inventory** defined
9. **No stock freeze / physical count / reconciliation process**
10. **No data retention / archival policy**
11. **No concurrency / race condition handling** rules for dispatch
12. **MVP scope not formally approved** by owner

---

## 4. Owner Answer Completeness Review

### Summary

| Metric | Count |
|---|---|
| Total questions asked in conversation | ~50 |
| Clear, unambiguous answers | 39 |
| Answers with conflicts or contradictions | 3 |
| Answers too vague for implementation | 4 |
| Original document questions NEVER asked | 12 |
| New questions created in conversation (not in original doc) | 8 |
| Critical enterprise areas with no coverage | 14 |

### 4.1 Conflicting Answers

**CONFLICT-001: Direct dispatch vs mandatory approval**

- Owner answered Q-XFER-002 (conversation): **"A — Approval always mandatory before dispatch"**
- But backend has two paths: `request→approve→dispatch` AND `initiate` (direct dispatch without approval)
- Owner also answered Q-HIER-001: **"A — Central can transfer to both Master and Outlet"** (which implies direct dispatch)
- **Question:** If approval is ALWAYS mandatory, is the `initiate` (direct dispatch) endpoint deprecated? Or does "always mandatory" apply only to request-based transfers?
- **Impact:** If `initiate` is disabled, Central cannot do quick/emergency dispatches without going through request→approve→dispatch cycle.

**CONFLICT-002: Outlet return flow contradiction**

- Owner answered Q-HIER-003: **"C — Outlet returns to Master only through wastage/adjustment"** (no transfer-based return)
- Owner answered Q-HIER-004: **"C — Outlet→Central return only if Central dispatched directly"** (implies a return transfer flow exists)
- **Question:** If Outlet cannot return via transfer (HIER-003 says wastage/adjustment only), how does Outlet return to Central when Central dispatched directly (HIER-004)? Is it also via wastage/adjustment, or is there a special return transfer flow?
- **Impact:** Return workflow design is contradictory.

**CONFLICT-003: Stock adjustment permission vs wastage permission**

- Owner answered Q-ADJ-002 (conversation): **"A — Only Central Store manager"** can adjust stock
- But same answer said: **"wastage will be managed at store level"**
- **Question:** Is wastage separate from adjustment? Can Outlet/Master managers record wastage (which reduces stock) but NOT adjust stock? This implies two different stock-reduction mechanisms with different permission models.
- **Impact:** Permission matrix incomplete; wastage module vs adjustment module boundary unclear.

### 4.2 Vague Answers Needing Clarification

| Answer | Issue |
|---|---|
| Q-HIER-005: "A, special gatekeep" | What does "special gatekeep" mean operationally? Central approval? Permission flag? Admin toggle? |
| Q-NOTIF-003: "configurable in CRM as well as inventory module" | Does this mean CRM integration is required for Phase 1 notifications? Or just that the CRM has its own configuration? |
| Q-WASTE-001: "beta wastage API at franchise level, might redo it" | Is the beta API usable as-is for Phase 1, or must a new one be built? What's the endpoint? |
| Q-RECIPE-005: "threshold quantity also to be considered" | What threshold? Low-stock alert threshold, or a separate consumption-prediction threshold? |

### 4.3 Original Document Questions Never Asked to Owner

The following questions from Section 23 of the planning document were **never presented** to the owner. The conversation reorganized and renumbered questions, accidentally skipping these:

| # | Original Doc Question | Topic | Impact |
|---|---|---|---|
| 1 | Q-ROLE-002 (doc) | Should Outlet Manager see stock cost/value? | Report field visibility unclear |
| 2 | Q-XFER-002 (doc) | Can a transfer be partially dispatched? | Dispatch UI unclear |
| 3 | Q-XFER-004 (doc) | Is stock reduced on dispatch or approval? | Stock timing — assumed dispatch but unconfirmed |
| 4 | Q-ADJ-003 (doc) | Is approval required for stock adjustment? | Adjustment flow unclear |
| 5 | Q-ADJ-005 (doc) | Photo/evidence required for adjustments? | Adjustment form design unclear |
| 6 | Q-WASTE-002 (doc) | Who can create wastage entries? | Wastage permission unclear |
| 7 | Q-WASTE-003 (doc) | Is approval required for wastage? | Wastage flow unclear |
| 8 | Q-WASTE-004 (doc) | Does wastage affect stock ledger immediately? | Stock accuracy timing unclear |
| 9 | Q-RECIPE-002 (doc) | What happens if recipe mapping is missing for a sold item? | Consumption gap handling |
| 10 | Q-RECIPE-003 (doc) | What happens if stock is insufficient during a sale? | Negative stock policy for consumption |
| 11 | Q-RECIPE-005 (doc) | Can stock go negative? | Stock floor policy — CRITICAL |
| 12 | Q-MVP-001 (doc) | Is the recommended MVP scope acceptable? | Scope not formally approved |

---

## 5. Production-Grade Gap Review

| # | Review Area | Status | Notes |
|---|---|---|---|
| 1 | Hierarchy completeness | **partial** | Hierarchy defined; lateral Master transfer needs backend work; outlet return flow contradictory |
| 2 | Terminology mapping | **complete** | Well-documented, owner-confirmed; mapping adapter mandated |
| 3 | Role and permission | **partial** | 12 unanswered questions from doc; Outlet cost visibility unknown; wastage/adjustment permission boundary unclear |
| 4 | Stock movement | **partial** | Core transfer flows defined; in-transit tracking, reservation, concurrent ops, over-receive all undefined |
| 5 | Ledger and audit | **missing** | No before/after qty rule, no immutability rule, no reversal entry rule, no cost audit rule |
| 6 | Item/SKU/UOM/batch/expiry | **partial** | FEFO confirmed; item creation permission unknown; decimal policy unknown; cost model unknown; inactive item handling unknown |
| 7 | Recipe/consumption | **partial** | Owner said "existing system handles, just display"; but consumption timing, reversal on cancel/refund, negative stock policy all undefined |
| 8 | Reporting | **partial** | Reports scope ambitious (all must-have); in-transit report missing; theoretical vs actual consumption report missing |
| 9 | API verification tool | **complete** | Well-defined; separate internal tool; persistent results; automated sequences |
| 10 | Error/empty/loading/failure states | **partial** | Documented per screen in planning doc; stale data, offline, concurrent edits, duplicate prevention all missing |
| 11 | Enterprise security/access | **partial** | RBAC defined; data isolation rules assumed but not explicit; token masking in API tool undefined |
| 12 | Production edge cases | **missing** | No concurrent dispatch handling, no timeout/retry policy, no stock-changed-during-creation handling, no deactivated-item-mid-transfer handling |
| 13 | MVP scope | **needs owner answer** | Not formally approved; lateral Master transfer phasing unclear |

---

## 6. Critical Gaps Found

### CRITICAL (blocks implementation)

| # | Gap | Category | Impact |
|---|---|---|---|
| 1 | Direct dispatch vs mandatory approval conflict | Stock Movement | Cannot design dispatch workflow without resolving |
| 2 | Outlet return flow contradiction | Stock Movement | Cannot design return/wastage boundary |
| 3 | Negative stock policy undefined | Stock Movement | Backend allows negatives; owner mandated strict enforcement for transfers but consumption policy unknown |
| 4 | Stock adjustment approval requirement unknown | Roles/Permissions | Cannot build adjustment workflow |
| 5 | Wastage entry permissions unknown | Roles/Permissions | Cannot build wastage workflow |
| 6 | Item master governance unknown | Item/SKU | Who creates items at which level? |
| 7 | Owner answers not persisted | Documentation | Risk of answer loss |
| 8 | MVP scope not formally approved | MVP Scope | Cannot prioritize implementation |

### HIGH (impacts production quality)

| # | Gap | Category |
|---|---|---|
| 9 | No stock-in-transit tracking rules | Stock Movement |
| 10 | No ledger before/after quantity or immutability rules | Ledger/Audit |
| 11 | No cost model defined (average, FIFO, transfer pricing) | Item/SKU |
| 12 | No decimal precision / rounding policy | Item/SKU |
| 13 | No concurrent dispatch / race condition handling | Edge Cases |
| 14 | No sales reversal / void impact on inventory | Recipe/Consumption |
| 15 | No stock reconciliation / physical count process | Stock Movement |
| 16 | Lateral Master↔Master transfer needs backend work — not in current API | Hierarchy |

### MEDIUM (impacts enterprise completeness)

| # | Gap | Category |
|---|---|---|
| 17 | No data retention / archival policy | Production |
| 18 | No stock freeze during audit | Stock Movement |
| 19 | No reorder point/quantity (different from low stock alert) | Stock Movement |
| 20 | No transfer SLA / stale transfer handling | Stock Movement |
| 21 | No offline / poor network behavior defined | UI/UX |
| 22 | No multi-tab conflict handling | Edge Cases |

---

## 7. Second-Round Owner Question Packet

### 7.1 Conflict Resolution Questions (MUST answer — blocks implementation)

---

**Q-R2-CONF-001:** You said approval is ALWAYS mandatory (Q-XFER-002). But backend has a `initiate` endpoint for direct dispatch without approval. Which is correct?

A. Approval is mandatory for ALL transfers including Central-initiated dispatches (disable `initiate` endpoint)
B. Approval is mandatory only for request-based transfers; parent-initiated direct dispatch (`initiate`) skips approval
C. Central can direct-dispatch without approval; Master must always get Central approval
D. Configurable per store level

Recommended answer: B
Reason: Emergency stock allocation needs exist; backend already supports both paths.
Impact if not answered: **BLOCKS** dispatch workflow design.
Related section: WF-006, WF-007, WF-008, SCR-07

---

**Q-R2-CONF-002:** You said Outlet→Master returns are ONLY through wastage/adjustment (Q-HIER-003: C). But you also said Outlet→Central return is allowed "if Central dispatched directly" (Q-HIER-004: C). How does Outlet→Central return work if transfers are not allowed?

A. Outlet→Central return is ALSO through wastage/adjustment only (both HIER-003 and HIER-004 use wastage/adjustment)
B. Outlet→Central return uses a special return transfer flow (exception to HIER-003 rule)
C. Outlet→Master uses wastage/adjustment; Outlet→Central uses transfer return (different rules per destination)
D. All returns are Phase 2; wastage/adjustment handles everything in Phase 1

Recommended answer: A
Reason: Consistent rule — all returns from Outlet use wastage/adjustment regardless of who dispatched.
Impact if not answered: **BLOCKS** return workflow and wastage module design.
Related section: WF-014, WF-016

---

**Q-R2-CONF-003:** You said stock adjustments are Central Store manager ONLY (Q-ADJ-002: A), but wastage is "managed at store level." Is wastage a separate mechanism from stock adjustment?

A. Yes, wastage and adjustment are completely separate modules with different permissions (wastage: any store, adjustment: Central only)
B. Wastage is a sub-type of adjustment (same module, same permissions — Central only)
C. Wastage: Outlet/Master can record; Adjustment: Central only; both reduce stock
D. Decide later

Recommended answer: C
Reason: F&B operations require Outlet/Kitchen staff to record wastage daily, but formal stock corrections should be controlled.
Impact if not answered: **BLOCKS** permission matrix and module boundary.
Related section: Module 16, Module 18, WF-015, WF-016

---

### 7.2 Unanswered Document Questions (originally skipped)

---

**Q-R2-SKIP-001:** Can a transfer be partially dispatched? (e.g., approved for 10 items but only 7 available to ship now)

A. No, full dispatch only — all approved lines must be dispatched together
B. Yes, partial dispatch allowed — remaining lines stay in approved status
C. No, but transfer can be edited to reduce quantity before dispatch
D. Phase 2

Recommended answer: A
Reason: Backend dispatches all approved lines at once; partial dispatch would need new backend logic.
Impact if not answered: Dispatch UI and stock reservation unclear.
Related section: WF-010, SCR-07

---

**Q-R2-SKIP-002:** Is stock debited from source on dispatch or on approval?

A. On dispatch (source stock reduces when goods leave)
B. On approval (source stock reserved/earmarked)
C. Both — soft reserve on approval, hard debit on dispatch

Recommended answer: A
Reason: Backend debits on dispatch, credits on receive (confirmed in api_implementation_status.md).
Impact if not answered: Stock availability calculation wrong.
Related section: WF-006, WF-010

---

**Q-R2-SKIP-003:** Should Outlet Manager see stock cost/value?

A. Yes, full cost visibility
B. No, cost hidden from Outlet level
C. Configurable per deployment/role
D. Decide later

Recommended answer: C
Reason: Some F&B businesses hide cost from outlet level for security.
Impact if not answered: Report fields and stock detail UI unclear for Outlets.
Related section: SCR-03, SCR-20, Q-REPORT-003

---

**Q-R2-SKIP-004:** Is approval required for stock adjustments?

A. Yes, all adjustments require parent approval
B. No, immediate effect with audit trail
C. Only for adjustments above a quantity/value threshold
D. Decide later

Recommended answer: C
Reason: Enterprise-grade: small corrections shouldn't block operations, large ones need oversight.
Impact if not answered: Adjustment workflow design blocked.
Related section: WF-015, Module 16

---

**Q-R2-SKIP-005:** Is approval required for wastage entries?

A. Yes, parent must approve
B. No, immediate effect with audit trail
C. Only above threshold
D. Phase 2

Recommended answer: B
Reason: Wastage is an operational reality in F&B; blocking on approval delays accurate stock tracking.
Impact if not answered: Wastage workflow design blocked.
Related section: WF-016, Module 18

---

**Q-R2-SKIP-006:** Does wastage affect stock ledger immediately?

A. Yes, stock reduced immediately on entry
B. Only after approval
C. At day-end batch processing
D. Decide later

Recommended answer: A
Reason: Delayed wastage recording leads to stock discrepancies.
Impact if not answered: Stock accuracy timing unclear.
Related section: WF-016

---

**Q-R2-SKIP-007:** Who can create wastage entries?

A. Any store manager at their own level
B. Only Outlet Manager and Kitchen Manager
C. Configurable per role
D. Decide later

Recommended answer: A
Reason: Wastage can occur at any level (warehouse damage, spoilage during storage).
Impact if not answered: Wastage permission matrix incomplete.
Related section: WF-016, Section 9.2

---

**Q-R2-SKIP-008:** What happens if recipe mapping is missing for a sold item?

A. Skip deduction, log warning (current backend behavior)
B. Block the sale
C. Deduct from a default/miscellaneous bucket
D. Allow sale, flag for manual reconciliation

Recommended answer: A
Reason: Backend `manage_stock()` already skips when `recipe_id` is null; blocking sales is unacceptable.
Impact if not answered: Missing consumption data may be silently lost without alerting.
Related section: WF-017

---

**Q-R2-SKIP-009:** Can stock go negative (floor policy)?

A. Yes, allowed — current backend behavior
B. No, enforce floor at zero for all operations
C. Transfers cannot go negative (already confirmed); consumption/sales can go negative
D. Configurable per item/store

Recommended answer: C
Reason: Owner already mandated strict enforcement for transfers (Q-XFER-004: A), but consumption during busy service should not block sales.
Impact if not answered: **CRITICAL** — stock floor is undefined for consumption. Backend currently allows negatives everywhere.
Related section: WF-017, Q-RECIPE-005 (doc)

---

**Q-R2-SKIP-010:** Is the recommended MVP scope (Section 21) acceptable?

A. Yes, proceed as documented
B. Need adjustments (specify in follow-up)
C. Too large, reduce scope
D. Too small, add more

Recommended answer: A
Reason: Owner has answered all scoping questions; formal approval unlocks implementation planning.
Impact if not answered: Implementation priority unclear; team cannot commit to deliverables.
Related section: Section 21

---

**Q-R2-SKIP-011:** Should stock adjustment and wastage be Must Have (Phase 1) or Should Have?

A. Must Have — production-grade requires this
B. Should Have — nice to have but not blocking
C. Phase 2

Recommended answer: A
Reason: Owner already requested enterprise/production-grade; no stock correction mechanism would be a production gap.
Impact if not answered: Feature priority unclear.
Related section: Section 21

---

### 7.3 Stock Movement Gap Questions

---

**Q-R2-STK-001:** How should stock-in-transit be tracked? When stock is dispatched but not yet received, should it appear in any report or dashboard?

A. Show "In Transit" column in stock reports (deducted from source, not yet at destination)
B. Show separate "Stock in Transit" report/screen
C. No special tracking — source shows reduced, destination shows nothing until received
D. Both A and B

Recommended answer: D
Reason: Enterprise inventory requires visibility of goods between locations.
Impact if not answered: In-transit stock is invisible; reconciliation impossible.
Related section: Section 19 (Reports), SCR-20

---

**Q-R2-STK-002:** Should stock be reserved/earmarked when a transfer is approved (before dispatch)?

A. Yes, approved quantity is soft-reserved (cannot be dispatched elsewhere)
B. No reservation — stock is available until physically dispatched
C. Configurable per store
D. Phase 2

Recommended answer: B
Reason: Backend debits only on dispatch. Reservation would need new backend logic.
Impact if not answered: Two approved transfers could claim the same stock.
Related section: WF-009, WF-010

---

**Q-R2-STK-003:** Can a destination receive MORE than what was dispatched?

A. No, strict max — accepted_qty + rejected_qty must equal dispatched_qty per line
B. Yes, allow over-receive with reason (e.g., bonus items, packing extras)
C. Flag over-receive as exception but allow it
D. Not possible in system

Recommended answer: A
Reason: Backend validates `accepted_qty + rejected_qty == requested_qty` per line.
Impact if not answered: Receive validation unclear.
Related section: WF-012

---

**Q-R2-STK-004:** Should there be a stock reconciliation / physical count feature in Phase 1?

A. Yes, periodic physical stocktake with system vs actual comparison
B. No, handle through adjustment entries
C. Phase 2
D. Not required

Recommended answer: C
Reason: Physical count is important but complex; adjustments cover immediate needs.
Impact if not answered: No formal process for verifying physical stock.
Related section: Module 16

---

**Q-R2-STK-005:** Should there be a stock freeze/lock mechanism during physical audits?

A. Yes, freeze all stock movement during count
B. Yes, freeze specific store only
C. No freeze, count alongside operations
D. Phase 2

Recommended answer: D
Reason: Stock freeze requires coordinated locking across APIs; Phase 2 with reconciliation.
Impact if not answered: Audit accuracy during active operations.
Related section: Related to Q-R2-STK-004

---

**Q-R2-STK-006:** Should old pending/approved transfers be auto-cancelled after N days?

A. Yes, auto-cancel after configurable days (e.g., 7 days)
B. Yes, auto-escalate (alert) but not cancel
C. No auto-cancellation, manual only
D. Phase 2

Recommended answer: B
Reason: Auto-cancel risks losing legitimate transfers delayed by logistics. Alert is safer.
Impact if not answered: Stale transfers accumulate in pending queues.
Related section: WF-009, Q-NOTIF, SCR-05

---

### 7.4 Ledger and Audit Gap Questions

---

**Q-R2-LED-001:** Should every stock movement create a ledger entry with before-quantity and after-quantity?

A. Yes, every movement (transfer, adjustment, wastage, consumption) records before_qty and after_qty
B. Only transfers record before/after; others record delta only
C. No before/after — just record the delta and current balance
D. Decide later

Recommended answer: A
Reason: Enterprise audit requirement — auditors need to trace exact balance at any point in time.
Impact if not answered: Audit trail incomplete; cannot reconstruct stock balance history.
Related section: Section 5 (Ledger), WF-019

---

**Q-R2-LED-002:** Is the stock ledger immutable (no edits/deletes after creation)?

A. Yes, fully immutable — corrections happen through new adjustment/reversal entries only
B. Admins can edit/delete ledger entries with audit trail
C. Decide later

Recommended answer: A
Reason: Financial/audit compliance — ledger entries should never be altered retroactively.
Impact if not answered: Data integrity and audit compliance undefined.
Related section: Section 5 (Ledger), Acceptance Criteria

---

**Q-R2-LED-003:** Should the system support ledger reversal entries? (e.g., when a cancel restores stock, is it a new "reversal" entry or an update to the original?)

A. New reversal entry (debit becomes credit, with link to original)
B. Update the original entry
C. Both — reversal entry created, original marked as reversed
D. Decide later

Recommended answer: A
Reason: Immutable ledger requires new entries, not modifications.
Impact if not answered: Cancel/reject stock restoration not properly auditable.
Related section: WF-013, WF-014

---

### 7.5 Item, SKU, UOM, Batch, Expiry Gap Questions

---

**Q-R2-ITM-001:** Who can create new inventory items (SKUs)?

A. Only Central Store manager — items are pushed down to Master/Outlet
B. Any store manager can create items locally
C. Central creates; Master/Outlet can suggest (needs approval)
D. Decide later

Recommended answer: A
Reason: Owner confirmed Central controls everything (menu, recipes, ingredients pushed top-down — Q-RECIPE-004).
Impact if not answered: Item master governance unclear; duplicate/conflicting items across stores.
Related section: WF-001, Module 4

---

**Q-R2-ITM-002:** What decimal precision is used for quantities? (e.g., can you transfer 1.333 kg?)

A. 2 decimal places (e.g., 1.33 kg)
B. 3 decimal places (e.g., 1.333 kg)
C. Whole numbers only for units (pcs), 2 decimals for weight/volume
D. Backend-determined (use whatever backend returns)

Recommended answer: C
Reason: Pieces should be whole; weight/volume needs decimals. Rounding consistency matters for reconciliation.
Impact if not answered: Rounding discrepancies across reports; stock mismatches.
Related section: All transfer and stock workflows

---

**Q-R2-ITM-003:** What cost model should be used for inventory valuation?

A. Weighted average cost (recalculated on each purchase/transfer)
B. FIFO cost (first purchased cost applied first)
C. Latest purchase cost
D. Not required in Phase 1 — track cost but don't calculate valuation model
E. Backend handles cost; frontend just displays

Recommended answer: E
Reason: Backend likely already has cost tracking. Frontend should display what API returns.
Impact if not answered: Stock valuation reports (Q-REPORT-003) cannot be designed.
Related section: SCR-20, Q-REPORT-003

---

**Q-R2-ITM-004:** What happens if an inventory item is deactivated/deleted while it's part of an in-transit or pending transfer?

A. Block deactivation until all transfers involving the item are completed
B. Allow deactivation; existing transfers proceed with warning
C. Allow deactivation; cancel all pending transfers involving the item
D. Decide later

Recommended answer: A
Reason: Preventing data integrity issues. Orphaned transfer lines cause ledger problems.
Impact if not answered: Edge case — deactivated item in active transfer.
Related section: WF-001, All transfer workflows

---

**Q-R2-ITM-005:** Is there a concept of purchase unit vs consumption unit? (e.g., purchase in cases of 24, consume individually)

A. Yes, need pack-to-unit conversion
B. No, single unit per item
C. Backend handles this
D. Phase 2

Recommended answer: C
Reason: Backend already has unit conversion (conversion_factor, base_unit in unit table).
Impact if not answered: Transfer quantity display may be incorrect.
Related section: Module 5

---

### 7.6 Recipe and Consumption Gap Questions

---

**Q-R2-RCP-001:** When exactly does recipe consumption deduct stock?

A. Real-time when order/KOT is placed
B. When bill is settled
C. Day-end batch processing
D. Existing system behavior — do not change

Recommended answer: D
Reason: Owner said existing system handles consumption (Q-RECIPE-001: D). Don't modify timing.
Impact if not answered: If we need to display consumption, we need to know when it happens.
Related section: WF-017

---

**Q-R2-RCP-002:** When an order is cancelled or refunded at an Outlet, is the inventory deduction reversed (stock restored)?

A. Yes, cancellation/refund restores stock automatically
B. No, stock is not restored — handle through adjustment
C. Depends on cancellation timing (before KOT vs after prep)
D. Existing system behavior — do not change

Recommended answer: D
Reason: This is existing POS behavior outside the CR scope. But we need to know for reporting accuracy.
Impact if not answered: Consumption reports may be inaccurate if reversals happen silently.
Related section: WF-017, Consumption reports

---

**Q-R2-RCP-003:** You said Central controls all recipes and pushes them down. After a franchise push, can the Outlet see which ingredients each menu item consumes?

A. Yes, Outlet should see full recipe breakdown (ingredients + quantities)
B. Outlet sees menu items only, not ingredient breakdown
C. Outlet Manager sees breakdown, Kitchen Manager sees simplified view
D. Existing behavior

Recommended answer: A
Reason: Outlet Manager needs to verify consumption accuracy and understand stock usage.
Impact if not answered: Recipe mapping display screen (SCR-19) unclear.
Related section: SCR-19, WF-017

---

### 7.7 Report Gap Questions

---

**Q-R2-RPT-001:** Should there be a dedicated "Stock in Transit" report showing all dispatched-but-not-received transfers?

A. Yes, must have in Phase 1
B. Visible within transfer history (filtered by status=dispatched)
C. Phase 2
D. Not required

Recommended answer: A
Reason: Enterprise operations need to track goods between locations at all times.
Impact if not answered: No visibility of in-transit goods.
Related section: Section 19 (Reports), SCR-20

---

**Q-R2-RPT-002:** Should there be a "Theoretical vs Actual Consumption" report comparing recipe-predicted stock usage against actual stock levels?

A. Yes, must have — critical for F&B cost control
B. Nice to have
C. Phase 2
D. Not required

Recommended answer: C
Reason: Complex calculation; requires accurate recipe data and consumption history. Phase 2 after core is stable.
Impact if not answered: Variance analysis impossible.
Related section: Section 19, Q-RECIPE-003

---

**Q-R2-RPT-003:** What specific KPIs should the Operations Hub dashboard (SCR-01) show?

A. Only pending action counts (approvals, receives, my requests)
B. Pending counts + today's transfer volume + low stock count
C. Pending counts + transfer volume + low stock + stock value summary
D. Owner to specify exact KPIs

Recommended answer: C
Reason: Operations Hub is the first screen managers see; comprehensive summary drives action.
Impact if not answered: Dashboard is generic; not operationally useful.
Related section: SCR-01

---

### 7.8 UI/UX and Production State Gap Questions

---

**Q-R2-UX-001:** How should the system handle stale data? (e.g., user views stock, but another user dispatches stock before first user submits)

A. Optimistic locking — check version/timestamp before submit; show conflict if stale
B. No special handling — last write wins
C. Show "data may be outdated" banner after N minutes; require refresh before action
D. Decide later

Recommended answer: C
Reason: Full optimistic locking needs backend support. Staleness warning is practical.
Impact if not answered: Two users could dispatch from the same stock segment.
Related section: All action screens

---

**Q-R2-UX-002:** Should the system prevent duplicate transfer submissions? (e.g., user clicks "Dispatch" twice quickly)

A. Yes, frontend button disable + backend idempotency
B. Frontend button disable only
C. Backend idempotency only (backend returns ALREADY_PROCESSED)
D. Not required

Recommended answer: A
Reason: Backend already has ALREADY_PROCESSED guards; frontend should complement with UI disable.
Impact if not answered: Duplicate transfers or confusing error messages.
Related section: All mutation screens

---

### 7.9 Security and Enterprise Access Gap Questions

---

**Q-R2-SEC-001:** In the API verification tool, should auth tokens entered by developers be masked/hidden after entry?

A. Yes, tokens are masked after paste (show last 4 chars only)
B. No, tokens visible during session (tool is admin-only)
C. Tokens never saved — re-enter each session
D. Decide later

Recommended answer: A
Reason: Even admin tools should follow security best practices. Tokens in screenshots/screen-shares are a risk.
Impact if not answered: Token exposure risk in API verification tool.
Related section: Section 13 (API Verification Tool), SCR-21

---

**Q-R2-SEC-002:** Should there be a confirmation dialog for all destructive actions (cancel transfer, reject, stock adjustment)?

A. Yes, confirmation dialog with action summary for ALL destructive actions
B. Only for cancel and reject (adjustments are already form-based)
C. No confirmation — action is immediate
D. Decide later

Recommended answer: A
Reason: Enterprise applications must prevent accidental destructive actions.
Impact if not answered: Accidental cancellations or rejections.
Related section: SCR-11, WF-013, WF-015, WF-016

---

### 7.10 Production Edge Case Questions

---

**Q-R2-EDGE-001:** What happens if two users try to dispatch from the same stock segment at the same time?

A. First wins; second gets INSUFFICIENT_STOCK error with clear message
B. System should lock the segment during dispatch (pessimistic locking)
C. Backend handles this — frontend just shows error if it happens
D. Not a concern for Phase 1

Recommended answer: C
Reason: Backend has concurrency guards (lock + re-read). Frontend should handle error gracefully.
Impact if not answered: Race condition results in confusing UX.
Related section: WF-006, WF-007, WF-008

---

**Q-R2-EDGE-002:** What happens if an API call times out during dispatch? (stock may or may not have been debited)

A. Frontend shows "action may have been processed — please check transfer status before retrying"
B. Frontend auto-retries once
C. Frontend shows generic error
D. Backend idempotency handles this — safe to retry

Recommended answer: A
Reason: Financial operations should never auto-retry. User must verify state before re-attempting.
Impact if not answered: Potential double-dispatch or lost dispatch.
Related section: All mutation flows

---

**Q-R2-EDGE-003:** For the lateral Master↔Master transfer (Q-HIER-005: A with Central approval), does the backend currently support this?

A. Yes, backend supports it (please confirm endpoint)
B. No, backend needs new validation logic for lateral transfers
C. Not sure — needs API verification
D. Use existing request flow with Central as intermediary (Master→Central→Master)

Recommended answer: B or D
Reason: Backend currently validates parent-chain hierarchy only. Lateral transfers are not in the existing validation rules.
Impact if not answered: **Lateral Master transfers cannot be implemented** without backend support.
Related section: Q-HIER-005, Transfer Flow Table

---

### 7.11 MVP Scope Questions

---

**Q-R2-MVP-001:** Given that lateral Master↔Master transfer (Q-HIER-005) needs backend work, should it be:

A. Must have Phase 1 (requires backend team coordination)
B. Phase 2 (build vertical-only in Phase 1, add lateral later)
C. Implement as Central-mediated workaround (Master→Central→Master) in Phase 1
D. Decide after API verification

Recommended answer: B
Reason: Vertical flows are complex enough for Phase 1. Adding lateral with new backend logic adds risk.
Impact if not answered: Phase 1 scope unclear; may delay delivery.
Related section: Section 21

---

**Q-R2-MVP-002:** The notification requirement is ambitious (all channels: email/WhatsApp/SMS, configurable per user, CRM integration). Should Phase 1 be:

A. Full notification stack (email/WhatsApp/SMS + CRM integration)
B. In-app polling notifications only; external channels in Phase 2
C. In-app + email only; WhatsApp/SMS in Phase 2
D. Owner to decide priority

Recommended answer: B
Reason: CRM-integrated multi-channel notifications is a project in itself. Phase 1 should focus on core inventory.
Impact if not answered: Phase 1 scope bloated; delivery delayed.
Related section: Section 20, Q-NOTIF-003

---

---

## 8. Questions Not Repeated

The following areas from Round 1 are **sufficiently answered** and not repeated in Round 2:

| Area | Status |
|---|---|
| Three-level hierarchy structure (Central→Master→Outlet) | Complete |
| Backend terminology inversion (master→Central, central→Master, franchise→Outlet) | Complete — owner confirmed |
| UI label: "Central Store" for top level | Complete |
| Mapping adapter requirement | Complete — mandatory |
| Transfer flow: request→approve→dispatch→receive | Complete |
| Transfer edit resets to requested | Complete |
| Partial receiving with per-line resolution | Complete |
| Configurable expiry threshold per store | Complete |
| Transfer notes (both levels, optional) | Complete |
| Report date ranges (today/yesterday/week/month/custom) | Complete |
| Report export (PDF + Excel) | Complete |
| Cross-hierarchy reports: Central + Super Admin only | Complete |
| Per-user notification preferences | Complete |
| API verification tool: separate, persistent, automated sequences | Complete |
| Roles: hardcoded Phase 1, configurable Phase 2 | Complete |
| Detailed per-action activity log | Complete |

---

## 9. API Verification Readiness

**Status:** `not_ready_owner_answers_pending`

API verification **cannot start** because:

1. **Conflict Q-R2-CONF-001** (direct dispatch vs mandatory approval) must be resolved first — it determines which API endpoints are in scope
2. **Lateral Master transfer** (Q-R2-EDGE-003) — if backend doesn't support it, it's not verifiable
3. **Test credentials** (Bearer tokens, restaurant IDs) have not been provided
4. **Terminology mapping** is owner-confirmed but not yet API-verified with real responses

**Can start AFTER:**
- Conflict questions resolved
- Test credentials provided
- Round 2 critical questions answered

---

## 10. Frontend Analysis Readiness

**Status:** `ready_after_round_2_answers`

Frontend analysis can begin in **limited scope** (screen layout, component architecture, navigation flow) without Round 2 answers. However, the following screens are **blocked** until conflicts/gaps are resolved:

| Screen | Blocked By |
|---|---|
| SCR-07 (Dispatch Wizard) | Q-R2-CONF-001 (direct dispatch vs approval) |
| SCR-11 (Cancel/Reject) | Q-R2-CONF-002 (return flow), Q-XFER-006 (post-dispatch reject disabled) |
| SCR-17 (Stock Adjustment) | Q-R2-SKIP-004, Q-R2-CONF-003 (adjustment permissions and boundary) |
| SCR-18 (Wastage Entry) | Q-R2-SKIP-005, Q-R2-SKIP-006, Q-R2-SKIP-007 (wastage permissions, approval, timing) |
| SCR-01 (Operations Hub) | Q-R2-RPT-003 (KPI definition) |

---

## 11. MVP Scope Risk

**Status:** `medium_risk — needs formal approval and scoping adjustments`

| Risk | Severity | Details |
|---|---|---|
| Lateral Master transfer requires backend work not in current API | HIGH | May delay Phase 1 if kept as must-have |
| Full notification stack (email/WhatsApp/SMS + CRM) in Phase 1 | HIGH | Scope bloat risk |
| Stock adjustment + wastage as must-have without clear API | MEDIUM | Backend endpoints don't exist yet |
| 23 screens + API verification tool in Phase 1 | MEDIUM | Large surface area |
| Reports with PDF/Excel export, valuation, reconciliation, efficiency | MEDIUM | Ambitious for Phase 1 |
| MVP scope not formally approved by owner | HIGH | No commitment to prioritization |

---

## 12. Recommended Next Owner Action

### Immediate (before any further work):

1. **Answer the 3 conflict resolution questions** (Q-R2-CONF-001, Q-R2-CONF-002, Q-R2-CONF-003) — these BLOCK implementation design
2. **Answer unanswered document questions** (Q-R2-SKIP-001 through Q-R2-SKIP-011) — 11 questions skipped in Round 1
3. **Formally approve MVP scope** (Q-R2-SKIP-010)
4. **Confirm negative stock policy for consumption** (Q-R2-SKIP-009)
5. **Confirm lateral Master transfer phasing** (Q-R2-MVP-001)

### Before API Verification:

6. **Provide test credentials** — Bearer tokens for Central, Master, Outlet roles + restaurant IDs
7. **Confirm backend support for lateral Master transfers** (Q-R2-EDGE-003)

### Before Frontend Implementation:

8. Answer remaining Round 2 questions (stock movement, ledger, item, recipe, UI/UX, security, edge cases)
9. **Persist all owner answers** to a dedicated file in the repository

---

## 13. Final Verdict

**`second_round_questions_required_before_next_stage`**

The Central Inventory CR has strong first-pass planning but is **not yet production-grade**. Three direct conflicts between owner answers must be resolved, 12 original questions were never asked, and 14 enterprise-critical areas (stock-in-transit, ledger rules, cost model, concurrency, sales reversal) have no coverage. A total of **43 second-round questions** have been generated.

**Priority order for owner:**
1. Resolve 3 conflicts (CONF-001, CONF-002, CONF-003) — **IMMEDIATE**
2. Answer 11 skipped questions (SKIP-001 to SKIP-011) — **IMMEDIATE**
3. Answer remaining 29 gap questions — **before implementation**
4. Provide test credentials — **before API verification**
5. Formally approve MVP scope — **before sprint planning**

---

*End of Central Inventory Enterprise Requirement Review — Round 2*
