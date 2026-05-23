# Central Inventory Slice 5 Scope Planning (Revised)

> **Date:** 23 May 2026
> **Agent:** Senior Central Inventory Slice 5 Scope Planning Agent
> **Revision:** Decision extraction applied — repeated questions removed
> **Status:** Scope planning only — no code modified

---

## 1. Planning Status

### `slice_5_scope_approved_ready_for_implementation_planning`

All 5 candidate items evaluated. 18 existing owner decisions extracted. All questions answered. Owner approved **Option A — Focused Stock Correction Slice** (Q-S5-001: A). Adjustment reason categories: use defaults, configurable in next phase (Q-S5-003: B). Ready for implementation planning.

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

## 5. Owner Answers (23 May 2026)

| Question | Answer | Decision |
|----------|--------|----------|
| Q-S5-001 | **A** | Option A — Stock Adjustment + Wastage as must-have, Edit Transfer as should-have. Stock Return and Lateral Transfers deferred to Slice 6. |
| Q-S5-003 | **B** | Use defaults for now (Counting Error, System Correction, Opening Balance, Quality Issue, Other). Will be configurable in next phase. |

**All Slice 5 scope questions are now answered. No pending owner decisions.**

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

## 8. Questions Already Answered From Existing Docs

| Question Topic | Answer | Source Document | Status |
|---|---|---|---|
| Slice 5 direction | Option A — Adj + Wastage | Q-S5-001 owner answer (23 May 2026) | `answered` |
| Adjustment reason categories | Use defaults, configurable later | Q-S5-003 owner answer (23 May 2026) | `answered` |
| Single vs separate forms for adj/wastage | Separate — different permissions | Conflict-003 | `answered_from_existing_docs` |
| Who can adjust stock? | Central Store manager ONLY | Q-ADJ-002: A | `answered_from_existing_docs` |
| Adjustment approval needed? | No — immediate with audit trail | SKIP-004: B | `answered_from_existing_docs` |
| Adjustment increase/decrease method? | Hybrid: add-stock + dedicated decrease | Q-ADJ-001: Hybrid | `answered_from_existing_docs` |
| Adjustment reason mandatory? | Yes — predefined categories | Q-ADJ-003: A | `answered_from_existing_docs` |
| Who can record wastage? | Any store manager at own level | SKIP-007: A | `answered_from_existing_docs` |
| Wastage approval needed? | No — immediate with audit trail | SKIP-005: B | `answered_from_existing_docs` |
| Wastage affects ledger? | Immediately | SKIP-006: A | `answered_from_existing_docs` |
| Wastage photo evidence? | Phase 2 — not now | Q-WASTE-002: D | `answered_from_existing_docs` |
| Wastage reason categories | Use sensible defaults (beta API reference) | Q-WASTE-001: B | `answered_from_existing_docs` |
| Edit Transfer API wait? | Attempt discovery, implement if found | OI-001 | `answered_from_existing_docs` |
| Edit Transfer behavior? | Resets to "requested" | Q-XFER-003: A | `answered_from_existing_docs` |
| Stock Return in Slice 5? | Deferred to Slice 6 | Q-S5-001: A (scope = adj+wastage) | `answered` |
| Lateral Transfers in Slice 5? | Deferred to Slice 6 | Q-S5-001: A | `answered` |
| Cost/value in Slice 5? | Excluded | SKIP-003: C, OI-009 | `answered_from_existing_docs` |
| Confirmation dialogs? | Yes — all destructive actions | SEC-002: A | `answered_from_existing_docs` |
| Duplicate prevention method? | Frontend button disable + backend idempotency | UX-002: A | `answered_from_existing_docs` |
| Before/after quantity in ledger? | Show "—" if not available from API | Q-S3-010: A, BLK-R-002 | `answered_from_existing_docs` |
| Real preprod APIs required? | Yes — verified in Section E | Q-S4-001: A, API_VERIFICATION_COMPREHENSIVE_FINAL | `answered_from_existing_docs` |
| Seed/mock fallback for missing APIs? | Generic proxy forwards to preprod | server.py line 238 | `answered_from_existing_docs` |
| UOM rules? | pcs=whole, kg/ltr=2 decimals | ITM-002: C | `answered_from_existing_docs` |
| Backend terminology mapping? | Always map master/central/franchise to Central/Master/Outlet | Q-TERM-003: A, Q-TERM-004: A | `answered_from_existing_docs` |

**All 24 potential questions resolved. Zero pending owner decisions.**

---

## 9. Implementation Planning Readiness Gate

| # | Gate | Met? | Evidence |
|---|------|------|----------|
| 1 | Baseline/owner decision docs reviewed | YES | 13 documents reviewed (Section 2) |
| 2 | Existing owner decisions extracted | YES | 18 decisions extracted (Section 3) |
| 3 | Repeated questions removed | YES | 8/10 marked answered_from_existing_docs (Section 4) |
| 4 | Final Slice 5 scope selected | YES | Option A — Stock Correction (Q-S5-001: A) |
| 5 | Must-have items finalized | YES | 7 items (Section 7) |
| 6 | Should-have items finalized | YES | 4 items (Section 7) |
| 7 | Deferred items clearly listed | YES | Stock Return + Lateral Transfers to Slice 6 |
| 8 | Role permissions clear | YES | Adjustment=Central only, Wastage=all roles own level |
| 9 | Approval rules clear | YES | No approval for either (SKIP-004, SKIP-005) |
| 10 | Required forms/dialogs known | YES | 2 new forms + confirmation dialogs + reason input |
| 11 | Ledger/history impact clear | YES | New movement types: Adjustment Increase/Decrease, Wastage |
| 12 | API readiness known | YES | Decrease Adjustment PASS, Record Wastage PASS, Wastage Report PASS (Section E) |
| 13 | Owner questions answered | YES | Q-S5-001: A, Q-S5-003: B (Section 5) |
| 14 | Risks documented | YES | Edit Transfer API unknown, add-stock payload needs discovery |
| 15 | Clean scope for next agent | YES | All decisions locked, no ambiguity |

**All 15 gates met. Ready for implementation planning.**

---

## 10. Implementation Planning Handover

### Baseline docs reviewed: 13
### Existing owner decisions extracted: 18
### Owner decisions recorded this session: 2

### Final Slice 5 Scope: Option A — Focused Stock Correction

### Must-Have (7 items)

| # | Item | Role | API | Approval |
|---|------|------|-----|----------|
| 1 | Stock Adjustment form | Central only | Decrease: verified. Increase: `add-stock` (needs payload discovery) | None |
| 2 | Wastage Entry form | All roles, own level | Record Wastage: verified | None |
| 3 | Adjustment/Wastage entries in Stock Ledger | All roles (read) | Wastage Report: verified. Adjustment entries: derive from API | N/A |
| 4 | Wastage Report view | All roles (scoped by hierarchy) | Wastage Report: verified (multi-restaurant) | N/A |
| 5 | Predefined reason categories | N/A (form config) | N/A | N/A |
| 6 | Confirmation dialogs | N/A (reuse pattern) | N/A | N/A |
| 7 | Duplicate prevention + toast | N/A (reuse hook) | N/A | N/A |

### Should-Have (4 items)

| # | Item | Dependency |
|---|------|-----------|
| 8 | Edit Transfer | API discovery required |
| 9 | Read-only banner text update | None |
| 10 | Ops Hub adjustment/wastage summary | Adjustment/wastage data source |
| 11 | Source selector parent heuristic fix | None |

### Explicitly Deferred to Slice 6

| # | Item | Reason |
|---|------|--------|
| 12 | Stock Return flow | Complex UX (sender acceptance, original-sender constraint) |
| 13 | Lateral Master-to-Master transfers | Requires operational settings UI + Central approval gate |

### Questions answered from existing docs: 22
### Owner decisions still pending: 0

### API Evidence Gaps

| API | Status | Gap |
|-----|--------|-----|
| Decrease Adjustment | verified_ready | None |
| Record Wastage | verified_ready | None |
| Wastage Report | verified_ready | None |
| add-stock (increase) | implied by Q-ADJ-001 | Payload shape needs discovery via proxy |
| Edit Transfer (update) | unknown | Endpoint + payload unknown — attempt discovery |

### Role/Permission Summary

| Action | Central | Master | Outlet |
|--------|---------|--------|--------|
| Stock Adjustment (increase/decrease) | ALLOWED | HIDDEN | HIDDEN |
| Wastage Entry | ALLOWED (own) | ALLOWED (own) | ALLOWED (own) |
| Wastage Report | ALL stores | Own + children | Own only |

### Approval Requirement Summary

| Action | Approval Required? | Source |
|--------|-------------------|--------|
| Stock Adjustment | NO — immediate with audit trail | SKIP-004: B |
| Wastage Entry | NO — immediate with audit trail | SKIP-005: B |

### Ledger/History Impact

| Action | Ledger Entry Type | Stock Effect |
|--------|------------------|-------------|
| Adjustment (increase) | "Adjustment (Increase)" | Stock increased at store |
| Adjustment (decrease) | "Adjustment (Decrease)" | Stock decreased at store |
| Wastage | "Wastage" | Stock reduced immediately |

### Known Risks

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| 1 | Edit Transfer API unknown | MEDIUM | Attempt discovery; defer if not found |
| 2 | add-stock payload unknown | LOW | Discover via proxy; decrease API shape is reference |
| 3 | Adjustment permission leakage | MEDIUM | Central-only enforcement; backend validates |
| 4 | Ledger new movement types | MEDIUM | Extend existing derived ledger with new entry types |
| 5 | Wastage stock going negative | LOW | Allowed per policy (SKIP-009); display clearly |

### Recommended Next Agent

**`Slice 5 Implementation Planning Agent`**

### Can implementation planning start? **YES**

All 15 readiness gates met. Zero pending owner decisions. Scope is clean and unambiguous.

---

*End of Revised Slice 5 Scope Planning*
