# Central Inventory — Owner Answers (Complete Record)

> **Last Updated:** 23 May 2026
> **Total Questions Answered:** 66 (50+ Round 1 + 3 Conflict Resolutions + 2 Follow-ups + 11 Skipped Questions Recovered)
> **Round 2 Gap Questions:** 29 answered + 1 clarification = 30
> **Slice 4 Owner Decisions:** 8 answered (22 May 2026)
> **Slice 4 Final Scope Approval:** 23 May 2026
> **Grand Total:** 104 answered decisions

---

## ROUND 1 — Owner Answers

### Batch 1: Hierarchy (Q-HIER-001 to Q-HIER-010)

| Question | Answer | Decision |
|---|---|---|
| Q-HIER-001 | **A** | Central can transfer to both Master and Outlet directly |
| Q-HIER-002 | **C** | Master→Central returns via special return workflow only |
| Q-HIER-003 | **C** | Outlet→Master returns via wastage/adjustment entry only — **LATER CORRECTED** (see Conflict-002 resolution: transfer return IS a separate flow) |
| Q-HIER-004 | **C** | Outlet→Central return only if Central dispatched directly |
| Q-HIER-005 | **A** | Lateral Master↔Master transfers allowed with special gatekeep (Central approval) |
| Q-HIER-006 | **B** | No lateral Outlet↔Outlet transfers |
| Q-HIER-007 | **A** | One Central can manage multiple Masters |
| Q-HIER-008 | **A** | One Master can manage multiple Outlets |
| Q-HIER-009 | **D** | Shared Outlets — not required in Phase 1 (assume single parent) |
| Q-HIER-010 | **A** | Fixed 3-level hierarchy (Central→Master→Outlet) |

### Batch 2: Terminology (Q-TERM-001 to Q-TERM-004)

| Question | Answer | Decision |
|---|---|---|
| Q-TERM-001 | **A** | Backend `master` = business Central/Center (TOP level) — **CONFIRMED** |
| Q-TERM-002 | **C** | UI label for top level: **"Central Store"** |
| Q-TERM-003 | **A** | Business terms only in UI — never show backend terms |
| Q-TERM-004 | **A** | Mandatory mapping adapter module in frontend code |

### Confirmed UI Terminology

| Level | UI Label | Backend `restaurant_type` | Backend `store_type` filter |
|---|---|---|---|
| TOP | **Central Store** | `master` | N/A |
| MIDDLE | **Master Store** | `central` | `"central"` |
| BOTTOM | **Outlet** | `franchise` | `"franchise"` |

### Batch 3: Transfer Flow (Q-XFER-001 to Q-XFER-010)

| Question | Answer | Decision |
|---|---|---|
| Q-XFER-001 | **B** | Direct Central→Outlet transfers invisible to Master in reports (only direct parties see) |
| Q-XFER-002 | **A** | Approval always mandatory — **LATER CLARIFIED** (see Conflict-001: applies to request-based only; parent direct dispatch skips approval) |
| Q-XFER-003 | **A** | Edit resets status to "requested" (forces re-approval) |
| Q-XFER-004 | **A** | Strict stock enforcement — block if insufficient |
| Q-XFER-005 | **C** | Lateral Master↔Master transfers require Central Store manager approval |
| Q-XFER-006 | **C** | User chooses resolution type; **Destination CAN "Report Issue" post-dispatch** — OVERRIDE applied 23 May 2026 per Q-S4-006: C (see Slice 4 Override section below). Original rule was "cannot reject post-dispatch". New action labeled "Report Issue" (not "Reject") on UI. Uses `reject/{id}` API. |
| Q-XFER-007 | **C** | Both transfer-level and line-level notes, optional |
| Q-XFER-008 | **B** | Configurable expiry threshold per store |
| Q-XFER-009 | **B** | Destination must choose resolution per rejected line during partial receive |
| Q-XFER-010 | **D** | Auto-escalation — Phase 2 |

### Batch 4: Adjustment & Wastage

| Question | Answer | Decision |
|---|---|---|
| Q-ADJ-001 | **Hybrid** | `add-stock` for increases; new dedicated API for decreases |
| Q-ADJ-002 | **A** | Only Central Store manager can perform adjustments; wastage at store level |
| Q-ADJ-003 | **A** | Mandatory reason with predefined categories |
| Q-WASTE-001 | **B** | Build as new feature; beta franchise API exists as reference |
| Q-WASTE-002 | **D** | Photo evidence — Phase 2 (future AI camera integration planned) |

### Batch 5: Recipe & Consumption

| Question | Answer | Decision |
|---|---|---|
| Q-RECIPE-001 | **D** | Existing system handles consumption; just display in inventory UI |
| Q-RECIPE-002 | **A** | FEFO batch deduction on orders |
| Q-RECIPE-003 | **A** | Central/Master get real-time consumption visibility for Outlets |
| Q-RECIPE-004 | **A** | Central controls everything — menu, category, sub-recipe, ingredients pushed down |
| Q-RECIPE-005 | **A** | Predictive alerts based on avg daily consumption + threshold quantity |

### Batch 6: Notifications

| Question | Answer | Decision |
|---|---|---|
| Q-NOTIF-001 | **D** | All: transfers + low stock + expiry + daily summary |
| Q-NOTIF-002 | **D** | Polling Phase 1; real-time (WebSocket) Phase 2 |
| Q-NOTIF-003 | **B** | All transfer status changes via email/WhatsApp/SMS; medium configurable via CRM + inventory module |
| Q-NOTIF-004 | **C** | Alerts cascade all levels up to Central |
| Q-NOTIF-005 | **A** | Per-user notification toggle preferences |

### Batch 7: Reports

| Question | Answer | Decision |
|---|---|---|
| Q-REPORT-001 | **A** | Today, yesterday, this week, this month, custom range |
| Q-REPORT-002 | **A** | Export to both PDF and Excel |
| Q-REPORT-003 | **A** | Show purchase price and total value |
| Q-REPORT-004 | **A** | Sent vs received reconciliation — must have |
| Q-REPORT-005 | **A** | Transfer efficiency (request→receive time) — must have |
| Q-REPORT-006 | **A** | Cross-hierarchy reports: Central Store manager + Super Admin only |

### Batch 8: Roles & Permissions

| Question | Answer | Decision |
|---|---|---|
| Q-ROLE-001 | **C** | Hardcoded Phase 1, configurable Phase 2 |
| Q-ROLE-002 | **D** | Kitchen Manager requests — not Phase 1 |
| Q-ROLE-003 | **C** | Use existing role system |
| Q-ROLE-004 | **D** | Multi-role — not Phase 1 |
| Q-ROLE-005 | **A** | Detailed per-action activity log |

### Batch 9: API Verification Tool

| Question | Answer | Decision |
|---|---|---|
| Q-API-001 | **C** | Separate internal tool (not part of main app) |
| Q-API-002 | **B** | All admin roles can access |
| Q-API-003 | **A** | Persist all test runs to database |
| Q-API-004 | **A** | Predefined automated workflow sequences |
| Q-API-005 | **B** (default) | Response time with threshold warnings |

---

## CONFLICT RESOLUTIONS

### Conflict-001: Direct Dispatch vs Mandatory Approval

**Resolution: Interpretation B**

- Approval is mandatory only for **request-based** transfers (child requests → parent must approve before dispatch)
- **Parent-initiated direct dispatch** (`initiate` endpoint) skips approval — parent IS the authority
- `initiate` endpoint remains active for Central/Master direct dispatches

### Conflict-002: Outlet Return Flow

**Resolution: Wastage ≠ Transfer Return — they are separate mechanisms**

| Mechanism | What it does | Who does it | Stock goes where |
|---|---|---|---|
| **Wastage** | Record spoiled/damaged goods | Any store (store-level) | Destroyed locally (removed from system) |
| **Transfer Return** | Send stock back to another store | Any store → **original sender only** | Moves to sender store; sender must accept |

- Outlet CAN do transfer-based returns
- Returns go ONLY to the **original sender** (if Central dispatched → return to Central; if Master dispatched → return to Master)
- Return dispatch must be **accepted by the receiving (original sender) store**

**Follow-up confirmed:** Returns only to original sender (not to any store in hierarchy)

### Conflict-003: Adjustment vs Wastage vs Reconciliation

**Resolution: Three separate mechanisms with different permissions**

| Mechanism | Purpose | Who initiates | Approval | Stock effect |
|---|---|---|---|---|
| **Wastage** | Spoiled/damaged goods | Any store manager (store-level) | No — immediate with audit trail | Reduced locally |
| **Stock Adjustment** | Manual correction (Central only) | Central Store manager only | No — immediate with audit trail | Increased or decreased |
| **Reconciliation Request** | Store finds counting discrepancy | Any store → parent/sender | **Yes — formal in-system request** → parent reviews and adjusts | Adjusted by parent after approval |

**Key rule:** Stores discovering counting errors do NOT adjust stock themselves. They submit a formal **reconciliation request** to the sender/parent store. Parent reviews and performs the adjustment. Everything recorded in system for audit.

**Follow-up confirmed:** Reconciliation request is a formal in-system audit-tracked workflow (not informal communication).

---

## ROUND 2 — Skipped Questions Recovered (Q-R2-SKIP)

| Question | Answer | Decision |
|---|---|---|
| SKIP-001 | **B** | Partial dispatch allowed — remaining lines stay in approved status. **Needs backend work.** |
| SKIP-002 | **A** | Stock debited on dispatch (confirmed — matches backend) |
| SKIP-003 | **C** | Outlet Manager cost visibility — configurable per deployment/role |
| SKIP-004 | **B** | Adjustments: no approval, immediate with audit trail (Central-only already) |
| SKIP-005 | **B** | Wastage: no approval, immediate with audit trail (store-level) |
| SKIP-006 | **A** | Wastage affects stock ledger immediately |
| SKIP-007 | **A** | Any store manager can create wastage entries at their own level |
| SKIP-008 | **A** | Missing recipe: skip deduction, log warning (sales only at franchise level) |
| SKIP-009 | **A** | Stock CAN go negative during sales/consumption (sales must never be blocked) |
| SKIP-010 | **A** | MVP scope approved — **with condition**: any business rule conflict needs explicit owner approval before modifying planning docs |
| SKIP-011 | **A** | Adjustment + wastage are Must Have Phase 1 |

### Two Distinct Stock Policies (from SKIP-009 + Q-XFER-004)

| Operation | Stock Floor Policy |
|---|---|
| Transfers (dispatch) | **STRICT** — block if insufficient stock |
| Sales / consumption | **ALLOW NEGATIVE** — sales must never be blocked |
| Wastage | Immediate reduction — can go negative if stock already low |
| Adjustment | Central-controlled — can increase or decrease |

---

## ROUND 2 — Gap Questions (Q-R2-*)

### Stock Movement

| Question | Answer | Decision |
|---|---|---|
| STK-001 | **A** | In-transit tracking: show column in stock reports + dedicated "Stock in Transit" report |
| STK-002 | **A** | Approved quantity is **soft-reserved** (cannot be dispatched elsewhere) — **needs backend work** |
| STK-003 | **B** | Over-receive allowed with reason — **needs backend work** (currently enforces strict equality) |
| STK-004 | **A** | Physical stocktake with system vs actual comparison — Phase 1 |
| STK-005 | **B** | No stock freeze — count alongside operations |
| STK-006 | **B** | Auto-escalate (alert) stale transfers but don't auto-cancel |

### Ledger and Audit

| Question | Answer | Decision |
|---|---|---|
| LED-001 | **A** | Every movement records before_qty and after_qty |
| LED-002 | **A** | Ledger is fully immutable — corrections through reversal entries only |
| LED-003 | **A** | New reversal entry for cancellations (original debit stays, new credit entry with link) |

### Item, SKU, UOM

| Question | Answer | Decision |
|---|---|---|
| ITM-001 | **A** | Only Central Store creates items — pushed down to Master/Outlet |
| ITM-002 | **C** | Whole numbers for units (pcs); 2 decimal places for weight/volume |
| ITM-003 | **C** | Track all 3 cost models (weighted average, FIFO, latest); default to weighted average, user can switch view |
| ITM-004 | **A** | Block item deactivation until all active transfers complete |
| ITM-005 | **A** | Pack-to-unit conversion needed (purchase in cases, consume individually) |

### Recipe and Consumption

| Question | Answer | Decision |
|---|---|---|
| RCP-001 | **D** | Existing system behavior — don't change timing, just display |
| RCP-002 | **D** | Existing system behavior for order cancel/refund — don't change |
| RCP-003 | **A** | Full recipe breakdown visible to Outlet (ingredients + quantities) |

### Reports

| Question | Answer | Decision |
|---|---|---|
| RPT-001 | **A** | Dedicated "Stock in Transit" report — must have Phase 1 |
| RPT-002 | **A** | Theoretical vs actual consumption variance report — must have Phase 1 |
| RPT-003 | **D** | Operations Hub KPIs — owner to specify exact list later |

### UI/UX

| Question | Answer | Decision |
|---|---|---|
| UX-001 | **Custom** | **Soft lock on item stock on approval itself** — when transfer is approved, stock is soft-locked/reserved at item level. Connects to STK-002. |
| UX-002 | **A** | Frontend button disable + backend idempotency for duplicate prevention |

### Security

| Question | Answer | Decision |
|---|---|---|
| SEC-001 | **A** | Auth tokens masked in API tool (show last 4 chars only) |
| SEC-002 | **A** | Confirmation dialog with action summary for ALL destructive actions |

### Production Edge Cases

| Question | Answer | Decision |
|---|---|---|
| EDGE-001 | **A** | Concurrent dispatch: first wins, second gets clear error message |
| EDGE-002 | **A** | API timeout: show "check transfer status before retrying" message |
| EDGE-003 | **A** | Backend supports lateral Master↔Master — needs Central Inventory approval |

### MVP Scope

| Question | Answer | Decision |
|---|---|---|
| MVP-001 | **A** | Lateral Master↔Master transfers — must have Phase 1 (coordinate with backend) |
| MVP-002 | **B** | Notifications: in-app polling only Phase 1; external channels (email/WhatsApp/SMS) Phase 2 |

---

## ITEMS REQUIRING BACKEND WORK (Identified from Answers)

| # | Item | Reason | Priority |
|---|---|---|---|
| 1 | **Partial dispatch** (SKIP-001: B) | Backend currently dispatches all lines at once | Phase 1 |
| 2 | **Soft stock reservation on approval** (STK-002: A, UX-001) | Backend debits only on dispatch; no reservation mechanism | Phase 1 |
| 3 | **Over-receive** (STK-003: B) | Backend enforces `accepted + rejected = dispatched`; over-receive not supported | Phase 1 |
| 4 | **Lateral Master↔Master transfer validation** (EDGE-003: A) | Backend validates parent-chain only; lateral needs new validation + Central approval | Phase 1 |
| 5 | **Transfer return flow** (Conflict-002) | Return-to-original-sender with acceptance — may need new endpoint or reuse request flow reversed | Phase 1 |
| 6 | **Reconciliation request workflow** (Conflict-003) | New formal in-system workflow not in current API | Phase 1 |
| 7 | **Stock adjustment decrease API** (ADJ-001) | Only `add-stock` exists; dedicated decrease endpoint needed | Phase 1 |
| 8 | **Wastage API (hierarchy-aware)** (WASTE-001) | Beta exists at franchise level only; needs hierarchy-level rework | Phase 1 |
| 9 | **Physical stocktake API** (STK-004) | No API exists | Phase 1 |
| 10 | **All 3 cost model calculations** (ITM-003: C) | Backend may not track all 3; needs verification | Phase 1 |
| 11 | **Pack-to-unit conversion** (ITM-005: A) | Backend has base unit conversion; pack conversion may need extension | Phase 1 |

---

## FINAL STOCK MOVEMENT RULES (Consolidated)

### Transfer Flows

| Flow | Allowed | Approval | Notes |
|---|---|---|---|
| Central → Master (direct dispatch) | YES | No (parent authority) | `initiate` endpoint |
| Central → Outlet (direct dispatch) | YES | No (parent authority) | `initiate` endpoint, bypasses Master |
| Master → Outlet (direct dispatch) | YES | No (parent authority) | `initiate` endpoint |
| Master → Master (lateral) | YES | **Central must approve** | New validation needed |
| Outlet → Master (request) | YES | Master must approve | `request` → `approve` → `dispatch` |
| Master → Central (request) | YES | Central must approve | `request` → `approve` → `dispatch` |
| Outlet → Outlet (lateral) | NO | — | Not allowed |
| Outlet → Master (return) | YES | **Original sender must accept** | Only if Master dispatched |
| Outlet → Central (return) | YES | **Original sender must accept** | Only if Central dispatched directly |
| Master → Central (return) | YES | **Central must accept** | Special return workflow |

### Stock Timing

| Event | Stock Effect |
|---|---|
| Transfer approved | **Soft lock / reservation** on source stock |
| Transfer dispatched | **Hard debit** from source; stock enters "in transit" |
| Transfer received | **Credit** to destination |
| Transfer cancelled | **Reversal entry** — source stock restored |
| Wastage recorded | **Immediate debit** at store level |
| Adjustment (Central) | **Immediate effect** with audit trail |
| Sales consumption | **Immediate debit** (can go negative) |

### Post-Dispatch Rules

| Action | Allowed by destination? |
|---|---|
| Full receive | YES |
| Partial receive (per-line resolution) | YES |
| Over-receive (more than dispatched) | YES (with reason) |
| Direct reject | **NO** — but destination CAN use **"Report Issue"** post-dispatch (Q-S4-006 override, 23 May 2026). Uses `reject/{id}` API. UI label is "Report Issue", not "Reject". |
| Return after receiving | YES (to original sender, sender must accept) |

---

## ANSWER STATISTICS

| Category | Count |
|---|---|
| Round 1 original questions | 50 |
| Conflict resolutions | 3 |
| Conflict follow-up clarifications | 2 |
| Round 2 skipped questions recovered | 11 |
| Round 2 gap questions | 29 |
| Round 2 clarifications | 1 |
| Slice 4 owner decisions | 8 |
| **Grand Total Decisions** | **104** |

---

## SLICE 4 — OWNER APPROVAL (23 May 2026)

### Scope Approved

| Category | Count | Status |
|---|---|---|
| Must-have items | 12 | **APPROVED** |
| Should-have items | 4 | **APPROVED** |
| Real preprod APIs for all write flows | YES | **APPROVED** |

### Slice 4 Owner Questions (answered 22 May 2026)

| Question | Answer | Decision |
|----------|--------|----------|
| Q-S4-001 | **A** | Real preprod API for all write operations |
| Q-S4-002 | **B** | Both modes — user can choose `segment_id` or `filter_bucket` (configurable picker) |
| Q-S4-003 | **A** | Central → Outlet direct dispatch included |
| Q-S4-004 | **A** | Outlet can create stock requests from parent |
| Q-S4-005 | **A** | Parent can direct-dispatch without prior request |
| Q-S4-006 | **C** | Include post-dispatch destination action as "Report Issue" — **Q-XFER-006 OVERRIDE APPLIED** |
| Q-S4-007 | **A** | Partial receive promoted to must-have |
| Q-S4-008 | **A** | Adjustment/wastage excluded — Slice 4 = transfer writes only |

### Q-XFER-006 Override Record

| Field | Value |
|---|---|
| **Original Rule (Q-XFER-006)** | Destination CANNOT reject post-dispatch — must receive first |
| **Override Decision (Q-S4-006: C)** | Destination CAN "Report Issue" post-dispatch |
| **Override Approved By** | Owner, 23 May 2026 |
| **UI Label** | "Report Issue" (NOT "Reject") |
| **API Used** | `POST /inventory-transfer/reject/{id}` |
| **Payload** | `{ "resolution_type": "...", "resolution_meta": { "reason": "..." } }` |
| **Rationale** | Destination should be able to report transit damage, wrong items, or quantity discrepancies without being forced to first receive and then return. Labeled "Report Issue" to maintain semantic distinction from pre-dispatch rejection. |

### Promotions Applied

| Item | From | To | Reason |
|---|---|---|---|
| Partial receive | Should-have | **Must-have** | Owner Q-S4-007: A |
| Request Stock (child → parent) | Should-have | **Must-have** | Owner Q-S4-004: A |
| Report Issue action | Not planned | **Must-have** | Owner Q-S4-006: C |

### Final Slice 4 Must-Have Scope (12 items)

| # | Item |
|---|------|
| 1 | Approve transfer action |
| 2 | Reject transfer action with reason dialog |
| 3 | Dispatch approved transfer |
| 4 | Receive transfer (full) |
| 5 | Partial receive with line-level resolution |
| 6 | Cancel transfer with reason dialog |
| 7 | "Report Issue" action for destination on dispatched transfers |
| 8 | Direct Dispatch form (Central/Master → child, including Central→Outlet) |
| 9 | Request Stock form (child → parent) |
| 10 | Source selector (configurable: segment_id + filter_bucket modes) |
| 11 | Confirmation dialogs for all destructive actions |
| 12 | Duplicate submission prevention + post-action data refresh |

### Final Slice 4 Should-Have Scope (4 items)

| # | Item |
|---|------|
| 13 | Edit transfer (pre-dispatch, resets to requested) |
| 14 | Success/error toast notifications |
| 15 | Quantity validation with UOM awareness |
| 16 | API error message terminology mapping |

---

*End of Owner Answers Document*
