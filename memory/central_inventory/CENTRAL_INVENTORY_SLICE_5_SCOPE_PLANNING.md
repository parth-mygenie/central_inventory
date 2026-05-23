# Central Inventory Slice 5 Scope Planning

> **Date:** 23 May 2026
> **Agent:** Senior Central Inventory Slice 5 Scope Planning Agent
> **Status:** Scope planning only — no code modified

---

## 1. Planning Status

### `slice_5_scope_recommended_owner_approval_required`

All 5 candidate items evaluated against business value, API readiness, UX complexity, dependency, and risk. Recommended scope: **Option A — Focused Stock Correction Slice** (Stock Adjustment + Wastage as must-have, Edit Transfer as should-have). 10 owner questions prepared. Owner approval required before implementation planning begins.

---

## 2. Inputs Reviewed

| # | Document | Reviewed |
|---|----------|----------|
| 1 | PRD.md (updated post-closure) | YES — 218 lines, Slice 1-4 closure status |
| 2 | Slice 1-4 Final Acceptance & Closure Report | YES — 339 lines, all 4 slices closed |
| 3 | Post-Slice-4 Open Items Register | YES — 234 lines, 16 open items (OI-001 to OI-016) |
| 4 | Slice 1-4 Owner Sign-Off Checklist | YES — owner smoke pending |
| 5 | PRD Update After Slice 1-4 Closure | YES — change note |
| 6 | Slice 4 Implementation Report | YES — 12/12 MH + 3/4 SH done |
| 7 | Slice 4 QA Handover | YES — 20/20 + 14/14 PASS |
| 8 | Owner Answers Complete (104 decisions) | YES — Batch 4 (Adj/Wastage), Conflict-002 (Returns), SKIP-001 to SKIP-011, Gap questions |
| 9 | API Verification Comprehensive Final (52/52) | YES — Section E: Decrease Adjustment PASS, Record Wastage PASS, Return Initiate PASS, Lateral Transfer PASS |
| 10 | Slice 1-3 Blocker Reconciliation | YES — all write blockers resolved |

**Total: 10 inputs reviewed**

---

## 3. Current Project Status

- **Slices 1-3:** Closed with QA evidence
- **Slice 4:** Implementation complete (12/12 MH + 3/4 SH), automated QA 34/34 PASS. Owner manual smoke PENDING.
- **PRD:** Updated to reflect closure status
- **Open items:** 16 registered (OI-001 to OI-016)
- **P1 candidates for Slice 5:** Edit Transfer, Stock Adjustment, Wastage, Stock Return, Lateral Transfers
- **API evidence:** 52/52 E2E PASS including Section E ops APIs (Adjustment, Wastage, Return, Lateral all verified)
- **Owner decisions recorded:** 104 total including adjustment/wastage rules (Batch 4), return flow (Conflict-002), lateral transfer (Q-HIER-005)

---

## 4. Candidate Item Review

### 4.1 Edit Transfer

| Aspect | Assessment |
|--------|------------|
| **Business value** | MEDIUM. Allows users to correct transfer requests before approval/dispatch. Reduces need for reject-and-recreate cycle. |
| **Dependency** | Depends on Slice 4 TransferDetail (complete). Edit button already renders but is noop. |
| **API readiness** | **UNKNOWN.** Edit/update API endpoint was NOT tested in the 52/52 E2E report. API contract (endpoint, payload, behavior) is unverified. The generic proxy may forward an edit call, but the endpoint name and payload shape are unknown. |
| **UX complexity** | MEDIUM. Can reuse RequestStockForm or DirectDispatchForm with pre-populated data. Per Q-XFER-003, editing resets status to "requested" and forces re-approval. |
| **Risk** | MEDIUM. Main risk is API discovery failure. If edit endpoint doesn't exist or behaves differently, work is wasted. |
| **Owner decisions available** | Q-XFER-003: Edit resets to "requested". Role: only requester can edit their own request (already in `transferActions.js`). |
| **Recommendation** | **should_have** — include if API discovery succeeds during early implementation. Defer if API is not found. |

### 4.2 Stock Adjustment

| Aspect | Assessment |
|--------|------------|
| **Business value** | HIGH. Essential inventory operation. Central Store manager corrects stock levels (increase/decrease) for any discrepancy. Owner confirmed "Must Have Phase 1" (SKIP-011: A). |
| **Dependency** | Minimal — new screen/form. Reuses existing SourceSelector (segment_id) and useWriteAction hook. |
| **API readiness** | **VERIFIED.** E2E Section E: "Decrease Adjustment PASS" with segment_id selector. `add-stock` API exists for increases. Both verified_ready. |
| **UX complexity** | LOW-MEDIUM. Single form: select store (Central only), select item, select segment, enter quantity, enter reason, submit. Simpler than DirectDispatchForm (no destination selector, no multi-item rows needed for MVP). |
| **Risk** | LOW. API is proven. Permission model is clear (Central-only). No approval required (SKIP-004: B). Immediate with audit trail. |
| **Owner decisions available** | Q-ADJ-001: Hybrid — `add-stock` for increases, dedicated API for decreases. Q-ADJ-002: Central Store manager only. Q-ADJ-003: Mandatory reason with predefined categories. SKIP-004: No approval. |
| **Recommendation** | **must_have** — API ready, owner rules clear, high business value, low risk. |

### 4.3 Wastage

| Aspect | Assessment |
|--------|------------|
| **Business value** | HIGH. Records spoiled/damaged goods at store level. Reduces stock immediately. Separate from transfer returns (Conflict-002). Owner confirmed "Must Have Phase 1" (SKIP-011: A). |
| **Dependency** | Minimal — new screen/form. Similar pattern to Stock Adjustment. Reuses SourceSelector and useWriteAction. |
| **API readiness** | **VERIFIED.** E2E Section E: "Record Wastage PASS" with segment_id selector. "Wastage Report PASS" with multi-restaurant scope. |
| **UX complexity** | LOW-MEDIUM. Form: select item, select segment, enter quantity, enter reason (mandatory, predefined categories), submit. Any store manager can record at their own level (SKIP-007: A). |
| **Risk** | LOW. API is proven. Permission model is clear (all store levels). No approval required (SKIP-005: B). Affects stock ledger immediately (SKIP-006: A). |
| **Owner decisions available** | Q-WASTE-001: Build as new feature. Q-WASTE-002: Photo evidence Phase 2 (not now). SKIP-005: No approval. SKIP-006: Immediate ledger impact. SKIP-007: Any store manager at own level. Conflict-003: Wastage is separate from adjustment and reconciliation. |
| **Recommendation** | **must_have** — API ready, owner rules clear, high business value, low risk. Natural companion to Stock Adjustment. |

### 4.4 Stock Return

| Aspect | Assessment |
|--------|------------|
| **Business value** | MEDIUM-HIGH. Allows stores to return stock to the original sender (not any store). Important for handling overstock, wrong items, or quality issues post-receive. |
| **Dependency** | Depends on Slice 4 receive flow being complete (it is). Return Initiate API uses `lines` field with `line_id` from transfer details. Sender must accept the return. |
| **API readiness** | **VERIFIED.** E2E Section E: "Return Initiate PASS" — uses `lines` field (not `return_lines`). Correct `line_id` from details endpoint. |
| **UX complexity** | HIGH. Requires: (1) identifying the original transfer, (2) selecting which items to return, (3) entering return quantities, (4) sender acceptance flow. The "return to original sender only" constraint adds UI logic to determine the correct destination. May need a new screen or modification to TransferDetail. |
| **Risk** | MEDIUM-HIGH. While API works, the full workflow is complex: return initiation → sender receives notification → sender accepts/rejects return → stock moves back. The acceptance side may require modifications to the existing receive flow. |
| **Owner decisions available** | Conflict-002: Returns go ONLY to original sender. Return dispatch must be accepted by receiving (original sender) store. |
| **Recommendation** | **defer_to_slice_6** — API ready but UX is complex. Higher risk of breaking Slice 4 receive flow. Better to stabilize adjustment/wastage first. |

### 4.5 Lateral Transfers (Master to Master)

| Aspect | Assessment |
|--------|------------|
| **Business value** | MEDIUM. Allows Master Store to Master Store transfers with Central approval (Q-HIER-005: A). Useful for rebalancing stock across regions. |
| **Dependency** | Requires operational settings UI (`allow_lateral_central_transfer` setting must be enabled). Requires Central approval workflow for lateral transfers (Q-XFER-005: C). Extends existing Direct Dispatch form. |
| **API readiness** | **VERIFIED.** E2E Section E: "Lateral Transfer (C1→C2) PASS" after enabling `allow_lateral_central_transfer`. Operational Settings GET also verified. |
| **UX complexity** | HIGH. Requires: (1) operational settings management screen (new), (2) modification to Direct Dispatch form to allow lateral destinations, (3) Central approval gate for lateral transfers, (4) handling the `allow_lateral_central_transfer` toggle. Breaks the downward-only model that Slice 1-4 relies on. |
| **Risk** | HIGH. Modifying the destination selector in Direct Dispatch form to include lateral targets risks breaking the existing downward-only hierarchy behavior. The Central approval gate for lateral transfers is a new workflow not present in Slice 4. |
| **Owner decisions available** | Q-HIER-005: Lateral allowed with Central approval. EDGE-003: Backend supports it. MVP-001: Must have Phase 1. |
| **Recommendation** | **defer_to_slice_6** — API ready but UX complexity and risk of breaking existing hierarchy model is high. Requires operational settings UI which is a separate feature. Better after adjustment/wastage/returns are stable. |

---

## 5. Option Comparison

### Option A — Focused Stock Correction Slice

| Aspect | Details |
|--------|---------|
| **Scope** | Stock Adjustment (must-have) + Wastage (must-have) + Edit Transfer (should-have, if API discovered) |
| **Pros** | Smallest scope. Both APIs verified. Owner rules clear. Low risk. Natural next step after transfer writes — completes the "stock correction" category. Adjustment + wastage are owner-confirmed "Must Have Phase 1" (SKIP-011). |
| **Cons** | Does not address returns or lateral transfers. Edit Transfer may not be possible without API discovery. |
| **Estimated items** | 5-7 must-have + 3-4 should-have |
| **Risk level** | LOW |

### Option B — Transfer Lifecycle Completion Slice

| Aspect | Details |
|--------|---------|
| **Scope** | Edit Transfer + Stock Return + Lateral Transfers |
| **Pros** | Completes the transfer lifecycle. All APIs verified. |
| **Cons** | High UX complexity (returns + lateral). Edit Transfer API unknown. Lateral modifies hierarchy model. Higher risk of breaking Slice 4. Does not address owner's "Must Have Phase 1" adjustment/wastage. |
| **Risk level** | HIGH |

### Option C — Conservative API-Ready Slice

| Aspect | Details |
|--------|---------|
| **Scope** | Only items with 100% verified APIs AND low UX complexity: Stock Adjustment + Wastage |
| **Pros** | Safest option. Zero API risk. Lowest UX complexity. |
| **Cons** | Very small scope. Doesn't move Edit Transfer forward. |
| **Risk level** | VERY LOW |

### Option D — Split Slice 5 into 5A and 5B

| Aspect | Details |
|--------|---------|
| **Scope** | 5A: Stock Adjustment + Wastage. 5B: Edit Transfer + Returns |
| **Pros** | Delivers value incrementally. 5A is low risk. 5B can wait for API discovery. |
| **Cons** | Two review/QA cycles. May slow overall delivery. |
| **Risk level** | LOW (5A) + MEDIUM (5B) |

---

## 6. Recommended Slice 5 Scope

### Recommendation: **Option A — Focused Stock Correction Slice**

This is the safest, highest-value option. Both Stock Adjustment and Wastage have verified APIs, clear owner rules, and are confirmed "Must Have Phase 1." Edit Transfer is included as should-have with an API discovery prerequisite.

### Must-Have (7 items)

| # | Item | Justification |
|---|------|---------------|
| 1 | **Stock Adjustment form** (Central Store manager only) | API verified (Decrease Adjustment PASS, add-stock exists). Central-only access. Mandatory reason. No approval. |
| 2 | **Wastage Entry form** (any store manager, own level) | API verified (Record Wastage PASS). All roles at own level. Mandatory reason with predefined categories. No approval. |
| 3 | **Adjustment/Wastage entries in Stock Ledger** | Stock Ledger (Slice 3) currently only derives from transfers. Must add adjustment/wastage movement types. |
| 4 | **Wastage Report view** | API verified (Wastage Report PASS, multi-restaurant scope). Read-only report of recorded wastage. |
| 5 | **Predefined reason categories** for adjustment and wastage | Owner confirmed mandatory reasons (Q-ADJ-003: A). Predefined dropdown options. |
| 6 | **Confirmation dialogs** for adjustment and wastage | Consistent with Slice 4 destructive action pattern (SEC-002: A). |
| 7 | **Duplicate prevention + toast feedback** | Reuse existing useWriteAction hook + Toaster. |

### Should-Have (4 items)

| # | Item | Justification |
|---|------|---------------|
| 8 | **Edit Transfer** (if API discoverable) | API contract unknown. Include only if generic proxy testing discovers the endpoint. Can reuse form patterns. |
| 9 | **Read-only banner text update** | Replace "Phase 1 Limited Slice — Read-only mode" with accurate text (cosmetic, P3). |
| 10 | **Adjustment/Wastage history in Operations Hub** | Show recent adjustments/wastage count or summary on Operations Hub for Central/all roles. |
| 11 | **Source selector refinement** | Fix parent store resolution heuristic for Request Stock form (known issue #9). |

### Future / Not Slice 5

| # | Item | Reason |
|---|------|--------|
| 12 | Stock Return flow | High UX complexity. Requires sender acceptance flow. Defer to Slice 6. |
| 13 | Lateral Master-to-Master transfers | Requires operational settings UI + Central approval gate. High risk. Defer to Slice 6. |
| 14 | Reports screen | Awaiting owner specification (RPT-003: D). |
| 15 | CSV/PDF export | Defer until reports screen defined. |
| 16 | KPI dashboard | Awaiting owner KPI specification. |
| 17 | WebSocket notifications | Phase 2 per owner decision. |

### Blocked / Needs Evidence

| # | Item | Blocker |
|---|------|---------|
| 18 | Edit Transfer | API contract unknown. Needs generic proxy testing. If API not found, defer entirely. |

---

## 7. API / Data Dependency Review

| Candidate | API Known? | Evidence | Payload Known? | Response Known? | Backend Blocker? | Owner Decision Needed? |
|-----------|-----------|----------|---------------|----------------|-----------------|----------------------|
| Stock Adjustment (decrease) | YES | Section E: "Decrease Adjustment PASS" | YES — segment_id selector | YES | NO | Reason categories list |
| Stock Adjustment (increase) | YES (implied) | `add-stock` API exists per Q-ADJ-001 | Partially — needs discovery | Partially | NO | NO |
| Wastage (record) | YES | Section E: "Record Wastage PASS" | YES — segment_id selector | YES | NO | Reason categories list |
| Wastage (report) | YES | Section E: "Wastage Report PASS" | YES — multi-restaurant scope | YES | NO | NO |
| Edit Transfer | **NO** | Not in 52/52 E2E report | **UNKNOWN** | **UNKNOWN** | **POSSIBLE** | NO (rules known from Q-XFER-003) |
| Stock Return | YES | Section E: "Return Initiate PASS" | YES — `lines` field | YES | NO | NO (rules from Conflict-002) |
| Lateral Transfer | YES | Section E: "Lateral Transfer PASS" | YES | YES | NO | Operational settings UI scope |

---

## 8. Role / Permission Planning

| Action | Central Store | Master Store | Outlet |
|--------|--------------|-------------|--------|
| Stock Adjustment (increase) | ALLOWED | HIDDEN | HIDDEN |
| Stock Adjustment (decrease) | ALLOWED | HIDDEN | HIDDEN |
| Wastage Entry | ALLOWED (own level) | ALLOWED (own level) | ALLOWED (own level) |
| Wastage Report (view) | ALLOWED (all stores) | ALLOWED (own + children) | ALLOWED (own only) |
| Edit Transfer | N/A (Central doesn't request) | ALLOWED (own requests, status=requested) | ALLOWED (own requests, status=requested) |

Sources: Q-ADJ-002 (Central-only adjustments), SKIP-007 (any store wastage), transferActions.js (edit = requester only, requested status).

---

## 9. Ledger / History Impact

| Action | Stock Ledger Entry | Movement Type | Direction |
|--------|-------------------|---------------|-----------|
| Stock Adjustment (increase) | New entry: "Adjustment (Increase)" | New type | N/A (internal) |
| Stock Adjustment (decrease) | New entry: "Adjustment (Decrease)" | New type | N/A (internal) |
| Wastage Entry | New entry: "Wastage" | New type | Out (stock reduced) |

The Slice 3 Stock Ledger currently derives entries only from transfers. Slice 5 must extend the ledger derivation to include adjustment and wastage events. This requires either:
- A new data source API for adjustment/wastage entries, OR
- The Stock Ledger fetches wastage report data and merges with transfer-derived entries

---

## 10. Owner Questions

### Q-S5-001: Which Slice 5 direction do you prefer?

A. **Option A** — Stock Adjustment + Wastage (safest, highest value)
B. **Option B** — Edit Transfer + Stock Return + Lateral Transfers (lifecycle completion)
C. **Option D** — Split into 5A (Adj/Wastage) and 5B (Edit/Return/Lateral)
D. Custom combination — please specify

**Recommended:** A
**Reason:** Adjustment and Wastage are owner-confirmed "Must Have Phase 1" with verified APIs and low risk.
**Impact if not answered:** Cannot finalize Slice 5 scope.

### Q-S5-002: Should Stock Adjustment and Wastage share a single form or be separate screens?

A. Single "Stock Correction" form with type selector (Adjustment / Wastage)
B. Two separate screens: one for Adjustment, one for Wastage
C. Owner decides after seeing mockup

**Recommended:** B
**Reason:** Different permission models (Central-only vs all levels). Separate screens prevent role confusion.
**Impact if not answered:** Implementation agent will default to B.

### Q-S5-003: What are the predefined reason categories for Stock Adjustment?

A. Owner provides specific list now
B. Use common defaults: Counting Error, System Correction, Opening Balance, Quality Issue, Other
C. Free-text only (no predefined categories)

**Recommended:** B (with owner override if needed)
**Reason:** Q-ADJ-003 says mandatory reason with predefined categories. Need the category list.
**Impact if not answered:** Will use reasonable defaults.

### Q-S5-004: What are the predefined reason categories for Wastage?

A. Owner provides specific list now
B. Use common defaults: Expired, Spoiled, Damaged, Spillage, Pest/Contamination, Other
C. Free-text only

**Recommended:** B (with owner override)
**Reason:** Same as Q-S5-003. Wastage reasons differ from adjustment reasons.
**Impact if not answered:** Will use reasonable defaults.

### Q-S5-005: Should Edit Transfer wait for API contract discovery?

A. Include Edit Transfer in Slice 5 — do API discovery during implementation
B. Defer Edit Transfer entirely until API contract is confirmed
C. Include as should-have — implement only if API is found during early phases

**Recommended:** C
**Reason:** Low cost to attempt discovery. If API works, it removes a visible noop button. If not found, gracefully defer.
**Impact if not answered:** Will default to C.

### Q-S5-006: Should Stock Return be in Slice 5 or Slice 6?

A. Include in Slice 5 (adds complexity but completes return workflow)
B. Defer to Slice 6 (lower risk, focus on adj/wastage first)
C. Include as should-have in Slice 5

**Recommended:** B
**Reason:** Return flow is complex (sender acceptance, original-sender constraint). Stabilize corrections first.
**Impact if not answered:** Will defer to Slice 6.

### Q-S5-007: Should Lateral Transfers be in Slice 5 or Slice 6?

A. Include in Slice 5
B. Defer to Slice 6 (lower risk, requires operational settings UI)

**Recommended:** B
**Reason:** Requires operational settings UI and Central approval gate — both new UX patterns. High risk of breaking hierarchy model.
**Impact if not answered:** Will defer to Slice 6.

### Q-S5-008: Does photo/evidence apply to Slice 5 wastage?

A. Yes — require photo upload with wastage entry
B. No — text reason only (Phase 2 for photo per Q-WASTE-002: D)

**Recommended:** B
**Reason:** Q-WASTE-002 explicitly deferred photo evidence to Phase 2. Keep Slice 5 simple.
**Impact if not answered:** Will follow Q-WASTE-002: D (no photo).

### Q-S5-009: Should cost/value impact be shown for adjustments and wastage?

A. Yes — show cost impact on adjustment/wastage entries
B. No — cost/value reporting remains out of scope for Slice 5
C. Show if API provides cost data, hide if not

**Recommended:** C
**Reason:** Cost Valuation API is verified (Section E PASS) but cost model UI is complex. Show if data is available.
**Impact if not answered:** Will follow C.

### Q-S5-010: Is approval required for adjustment or wastage?

A. No approval for either (confirmed by SKIP-004 and SKIP-005)
B. Approval for adjustment, not wastage
C. Approval for both

**Recommended:** A
**Reason:** SKIP-004 (adjustment: no approval) and SKIP-005 (wastage: no approval) are already answered.
**Impact if not answered:** Will follow existing owner answers.

---

## 11. Risks / Ambiguities

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| 1 | **Edit Transfer API unknown** | MEDIUM | Attempt discovery via generic proxy. If not found, defer gracefully. Button already exists as noop. |
| 2 | **Adjustment permission leakage** | MEDIUM | Central-only enforcement. Backend validates server-side. Frontend hides form for non-Central roles. |
| 3 | **Wastage at wrong store level** | LOW | Frontend restricts to own-store items. Backend validates. |
| 4 | **Ledger consistency with new movement types** | MEDIUM | Stock Ledger must be extended to include adjustment/wastage entries. Risk of missing entries if data source changes. |
| 5 | **Stock going negative from wastage** | LOW | Per policy (SKIP-009), wastage can reduce stock below zero. Frontend should display this clearly without blocking. |
| 6 | **Cost/value scope creep** | LOW | Cost display is should-have at most. Do not build full cost reporting UI. |
| 7 | **Reason category mismatch** | LOW | Use sensible defaults. Owner can override. |
| 8 | **add-stock API payload shape** | LOW | Decrease API verified. Increase API (`add-stock`) is implied by Q-ADJ-001 but exact payload needs discovery. Generic proxy should forward. |
| 9 | **Regression risk on Slice 1-4** | LOW | New screens/forms — minimal modification to existing components. Ledger extension is additive. |

---

## 12. Recommendation

### Proceed with **Option A — Focused Stock Correction Slice**

**Rationale:**
1. Stock Adjustment and Wastage are owner-confirmed "Must Have Phase 1" items with verified APIs
2. Both have clear permission models, no approval requirements, and low UX complexity
3. Risk to existing Slice 1-4 functionality is minimal (new screens, additive ledger changes)
4. Edit Transfer included as should-have contingent on API discovery
5. Returns and Lateral Transfers deferred to Slice 6 where they can be planned with proper UX design

**Recommended next step:** Present owner questions Q-S5-001 through Q-S5-010. After owner answers, proceed to Slice 5 implementation planning.

---

## 13. Recommended Next Agent

### `Slice 5 Owner Question Gate Agent`

Present the 10 owner questions from Section 10. Record answers. Then hand off to `Slice 5 Implementation Planning Agent` with the finalized scope.

If owner chooses Option A (recommended), the implementation planning agent should:
1. Design Stock Adjustment form (Central-only)
2. Design Wastage Entry form (all roles, own level)
3. Plan Wastage Report view
4. Plan Stock Ledger extension for adjustment/wastage entries
5. Plan Edit Transfer API discovery (should-have)
6. Plan predefined reason categories
7. Define file targets, API payloads, validation rules
8. Create smoke checklist for 3 roles

---

*End of Slice 5 Scope Planning*
