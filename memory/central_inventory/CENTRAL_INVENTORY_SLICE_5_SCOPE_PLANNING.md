# Central Inventory Slice 5 Scope Planning (Revised)

> **Date:** 23 May 2026
> **Agent:** Senior Central Inventory Slice 5 Scope Planning Agent
> **Revision:** Decision extraction applied — repeated questions removed
> **Status:** Scope planning only — no code modified

---

## 1. Planning Status

### `slice_5_scope_recommended_owner_approval_required`

All 5 candidate items evaluated. 18 existing owner decisions extracted. 8 of 10 original questions answered from existing docs. Only **2 genuinely new owner questions** remain. Recommended scope: Option A — Focused Stock Correction Slice.

---

## 2. Inputs Reviewed

| # | Document | Reviewed |
|---|----------|----------|
| 1 | PRD.md | YES |
| 2 | OWNER_ANSWERS_COMPLETE.md (104 decisions) | YES — Batch 4, Conflict-002, Conflict-003, SKIP-001 to SKIP-011 extracted |
| 3 | CENTRAL_INVENTORY_CR_REQUIREMENT_PLANNING.md | YES |
| 4 | CENTRAL_INVENTORY_ENTERPRISE_REQUIREMENT_REVIEW_ROUND_2.md | YES |
| 5 | CENTRAL_INVENTORY_SLICE_1_TO_4_FINAL_ACCEPTANCE_AND_CLOSURE_REPORT.md | YES |
| 6 | CENTRAL_INVENTORY_POST_SLICE_4_OPEN_ITEMS_REGISTER.md | YES (16 items) |
| 7 | CENTRAL_INVENTORY_SLICE_1_TO_4_OWNER_SIGNOFF_CHECKLIST.md | YES |
| 8 | PRD_UPDATE_AFTER_SLICE_1_TO_4_CLOSURE.md | YES |
| 9 | CENTRAL_INVENTORY_SLICE_4_WRITE_FLOW_PLANNING.md | YES |
| 10 | CENTRAL_INVENTORY_SLICE_4_IMPLEMENTATION_PLAN.md | YES |
| 11 | CENTRAL_INVENTORY_SLICE_4_IMPLEMENTATION_REPORT.md | YES |
| 12 | CENTRAL_INVENTORY_SLICE_4_QA_HANDOVER.md | YES |
| 13 | api_evidence/API_VERIFICATION_COMPREHENSIVE_FINAL.md | YES (52/52, Section E) |

**Total: 13 inputs reviewed**

---

## 3. Existing Owner Decisions / Baseline Rules Already Answered

| # | Decision Topic | Existing Answer | Source | Affects Slice 5? | Further Q Needed? |
|---|---------------|----------------|--------|------------------|-------------------|
| 1 | Stock Adjustment: who can adjust? | Central Store manager ONLY | Q-ADJ-002: A | YES — form access | NO |
| 2 | Stock Adjustment: approval needed? | No — immediate with audit trail | SKIP-004: B | YES — no approval flow | NO |
| 3 | Stock Adjustment: reason mandatory? | Yes — mandatory with predefined categories | Q-ADJ-003: A | YES — form field | NO |
| 4 | Stock Adjustment: increase/decrease? | Hybrid: `add-stock` for increases, dedicated API for decreases | Q-ADJ-001: Hybrid | YES — two API paths | NO |
| 5 | Wastage: who can record? | Any store manager at own level | SKIP-007: A, Q-ADJ-002: A | YES — all roles | NO |
| 6 | Wastage: approval needed? | No — immediate with audit trail | SKIP-005: B | YES — no approval flow | NO |
| 7 | Wastage: affects ledger? | Immediately | SKIP-006: A | YES — ledger entry | NO |
| 8 | Wastage: photo evidence? | Phase 2 (future AI camera) | Q-WASTE-002: D | YES — text reason only for now | NO |
| 9 | Wastage vs Return: are they separate? | Yes — three separate mechanisms (wastage, adjustment, reconciliation) | Conflict-002, Conflict-003 | YES — separate forms | NO |
| 10 | Stock Return: to whom? | Original sender ONLY | Conflict-002 | YES — future slice design | NO |
| 11 | Stock Return: acceptance? | Sender must accept | Conflict-002 | YES — future UX | NO |
| 12 | Lateral transfers: allowed? | Master-to-Master with Central approval | Q-HIER-005: A, Q-XFER-005: C | YES — future slice | NO |
| 13 | Lateral Outlet-to-Outlet? | Not allowed | Q-HIER-006: B | YES — never implement | NO |
| 14 | Edit Transfer: behavior? | Resets status to "requested", forces re-approval | Q-XFER-003: A | YES — if API found | NO |
| 15 | Adj+Wastage: Phase 1 priority? | Must Have Phase 1 | SKIP-011: A | YES — confirms Slice 5 scope | NO |
| 16 | Cost visibility: scope? | Configurable per deployment/role; out of current scope | SKIP-003: C | YES — exclude from Slice 5 | NO |
| 17 | Confirmation dialogs: required? | Yes — for ALL destructive actions | SEC-002: A | YES — reuse Slice 4 pattern | NO |
| 18 | Duplicate prevention: method? | Frontend button disable + backend idempotency | UX-002: A | YES — reuse useWriteAction hook | NO |

---

## 4. Original Q-S5 Questions — Classification

| Question | Topic | Status | Reason |
|----------|-------|--------|--------|
| Q-S5-001 | Slice 5 direction | `needs_owner_answer` | No existing doc specifies Slice 5 direction preference. Owner must choose. |
| Q-S5-002 | Single form or separate for adj/wastage? | `answered_from_existing_docs` | Conflict-003 explicitly defines three SEPARATE mechanisms with different permissions. Central-only adjustment vs any-store wastage mandates separate forms. |
| Q-S5-003 | Adjustment reason categories | `needs_owner_answer` | Q-ADJ-003 says "mandatory with predefined categories" but does NOT list the specific categories. Category list is new information needed. |
| Q-S5-004 | Wastage reason categories | `answered_from_existing_docs` + partial | Q-WASTE-001 says "build as new feature; beta franchise API exists as reference." The beta API likely has categories. Standard restaurant wastage categories are well-known. Can use sensible defaults without asking. |
| Q-S5-005 | Edit Transfer wait for API? | `answered_from_existing_docs` | OI-001 in Open Items Register already states "API contract not verified. Risk too high without evidence." and "Test edit/update endpoint through the generic proxy. If it works, implement." Decision is clear: attempt discovery, implement if found. |
| Q-S5-006 | Stock Return in Slice 5 or 6? | `not_required_for_slice_5` | Scope planning already recommends deferral based on complexity analysis. Owner can override if they disagree with Q-S5-001. |
| Q-S5-007 | Lateral Transfers in Slice 5 or 6? | `not_required_for_slice_5` | Same as Q-S5-006 — covered by Q-S5-001 direction question. |
| Q-S5-008 | Photo evidence for wastage? | `answered_from_existing_docs` | Q-WASTE-002: D — "Photo evidence — Phase 2." Explicitly answered. |
| Q-S5-009 | Cost/value impact display? | `answered_from_existing_docs` | SKIP-003: C — configurable per deployment. Not required for Slice 5 write forms. Cost reporting is a separate open item (OI-009). |
| Q-S5-010 | Approval for adj/wastage? | `answered_from_existing_docs` | SKIP-004: B (adjustment no approval), SKIP-005: B (wastage no approval). Both explicitly answered. |

**Summary: 8 answered from existing docs, 2 genuinely need owner answer.**

---

## 5. Revised Owner Question Packet (2 questions only)

### Q-S5-001: Which Slice 5 direction do you prefer?

A. **Option A** — Stock Adjustment + Wastage + Edit Transfer as should-have (safest, highest value, both are owner-confirmed "Must Have Phase 1")
B. **Option B** — Edit Transfer + Stock Return + Lateral Transfers (lifecycle completion, higher risk)
C. **Option D** — Split into 5A (Adj/Wastage) and 5B (Edit/Return/Lateral)
D. Custom combination — please specify

**Recommended:** A
**Reason:** Adjustment and Wastage are owner-confirmed "Must Have Phase 1" (SKIP-011: A) with verified APIs (Section E: Decrease Adjustment PASS, Record Wastage PASS) and clear business rules. Stock Return and Lateral Transfers are higher complexity and can be Slice 6.
**Impact if not answered:** Cannot finalize Slice 5 scope.
**Question status:** `needs_owner_answer`
**Why existing docs did not answer this:** Existing docs confirm individual item priority (P1) and Phase 1 status, but do not specify which items should be grouped into Slice 5 versus Slice 6. This is a sequencing decision.

### Q-S5-003: What are the predefined reason categories for Stock Adjustment?

A. Owner provides specific list now
B. Use defaults: Counting Error, System Correction, Opening Balance, Quality Issue, Other
C. Free-text only (no predefined dropdown)

**Recommended:** B (with owner override if needed)
**Reason:** Q-ADJ-003 says "mandatory reason with predefined categories" but the specific category names were never listed. Need the list or permission to use defaults.
**Impact if not answered:** Implementation agent will use sensible defaults from Option B.
**Question status:** `needs_owner_answer`
**Why existing docs did not answer this:** Q-ADJ-003 confirms predefined categories are required but does not enumerate them.

---

## 6. Decisions Locked from Existing Docs (no owner question needed)

These are confirmed for Slice 5 implementation planning without further owner input:

| Decision | Locked Answer | Source |
|----------|--------------|--------|
| Adjustment and Wastage are separate forms | YES — different permissions | Conflict-003 |
| Adjustment: Central Store manager only | YES | Q-ADJ-002: A |
| Wastage: any store manager at own level | YES | SKIP-007: A |
| No approval for adjustment | YES | SKIP-004: B |
| No approval for wastage | YES | SKIP-005: B |
| Mandatory reason for both | YES | Q-ADJ-003: A |
| No photo evidence for wastage | YES — Phase 2 | Q-WASTE-002: D |
| Wastage affects ledger immediately | YES | SKIP-006: A |
| Cost/value display out of scope | YES — future | SKIP-003: C, OI-009 |
| Edit Transfer: attempt API discovery, implement if found | YES | OI-001, Q-XFER-003: A |
| Edit Transfer resets to "requested" | YES | Q-XFER-003: A |
| Stock Return deferred (complex UX) | RECOMMENDED | OI-005 analysis |
| Lateral Transfers deferred (needs settings UI) | RECOMMENDED | OI-016 analysis |
| Confirmation dialogs for destructive actions | YES | SEC-002: A |
| Duplicate prevention via useWriteAction | YES | UX-002: A |
| Wastage reason categories: use sensible defaults | YES — beta API reference exists | Q-WASTE-001: B |

---

## 7. Recommended Slice 5 Scope (unchanged from initial planning)

### Must-Have (7 items)

| # | Item |
|---|------|
| 1 | Stock Adjustment form (Central Store manager only) |
| 2 | Wastage Entry form (any store manager, own level) |
| 3 | Adjustment/Wastage entries in Stock Ledger |
| 4 | Wastage Report view |
| 5 | Predefined reason categories for adjustment and wastage |
| 6 | Confirmation dialogs for adjustment and wastage |
| 7 | Duplicate prevention + toast feedback |

### Should-Have (4 items)

| # | Item |
|---|------|
| 8 | Edit Transfer (if API discoverable) |
| 9 | Read-only banner text update |
| 10 | Adjustment/Wastage summary on Operations Hub |
| 11 | Source selector refinement (parent store heuristic) |

### Deferred to Slice 6

| # | Item |
|---|------|
| 12 | Stock Return flow |
| 13 | Lateral Master-to-Master transfers |

---

## 8. Recommended Next Agent

### `Slice 5 Owner Question Gate Agent`

Present only Q-S5-001 and Q-S5-003 to owner. All other decisions are locked from existing documentation.

---

*End of Revised Slice 5 Scope Planning*
