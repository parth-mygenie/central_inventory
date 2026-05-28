# Central Inventory — Gate Control Framework

> **Last Updated:** 28 May 2026
> **Purpose:** Define mandatory stage gates for enterprise-grade quality control.
> **Rule:** No CR/phase advances to the next stage without passing ALL gate criteria.

---

## OWNER-MANDATED RULES (NON-NEGOTIABLE)

### RULE 1: Baseline Freeze Prerequisites

**No baseline can be declared FROZEN unless ALL three of the following are complete:**

| # | Prerequisite | Description | Who Validates |
|---|-------------|-------------|---------------|
| 1 | **QA Passed** | Independent QA agent has validated all checks with zero critical defects | QA Agent |
| 2 | **Owner Smoke Test Passed** | Owner (or owner-delegated smoke agent) has executed smoke checklist across all 3 roles | Owner / Smoke Agent |
| 3 | **Owner Explicit Approval** | Owner has recorded a written acceptance statement covering both **UI correctness** and **business logic correctness** | Owner (human only) |

**Enforcement:**
- A Freeze Agent MUST verify all 3 prerequisites exist before declaring freeze
- If any prerequisite is missing, freeze is BLOCKED — no exceptions, no implicit approvals
- Automated QA alone is NOT sufficient — owner smoke + explicit approval are mandatory
- The acceptance statement MUST explicitly confirm: "UI reviewed and approved" AND "Business logic reviewed and approved"

### RULE 2: Slice 6 Entry Gate

**No work on Slice 6 (or any new slice/CR beyond current scope) may begin until:**

| # | Condition | Description |
|---|-----------|-------------|
| 1 | **CI-060 completed** | UI Consolidation CR passes all screens × 3 roles |
| 2 | **All CI-010 to CI-036 FROZEN** | Every item in CR Registry that is `IMPLEMENTED`, `QA_PASSED`, or `SMOKE_PASSED` must reach `FROZEN` via CI-060 |
| 3 | **Owner gives final explicit approval** | Owner must record: "All current UI and business logic is approved. Proceed to Slice 6." |
| 4 | **Freeze declaration exists** | `BASELINE_FREEZE_DECLARATION.md` created with full freeze manifest |
| 5 | **CR Registry clean** | Zero items in `IMPLEMENTED` / `QA_PASSED` / `SMOKE_PASSED` status — everything is either `FROZEN` or `DEFERRED` |

**Enforcement:**
- Any agent asked to start Slice 6 work MUST first check CR Registry
- If ANY baseline is not `FROZEN` or `DEFERRED`, the agent MUST refuse and redirect to freeze completion
- Owner approval for Slice 6 is SEPARATE from baseline freeze approval — both are required
- This rule prevents scope creep and ensures no unfinished work carries forward

---

## Stage Pipeline

```
PLANNING → APPROVED → IMPLEMENTING → IMPLEMENTED → QA_PASSED → SMOKE_PASSED → ACCEPTED → FROZEN
```

Every CR/phase MUST pass through each gate sequentially. No skipping.

---

## Gate 1: PLANNING → APPROVED

**Who gates:** Owner / Product Lead
**Evidence required:**

| # | Criteria | Evidence |
|---|---------|----------|
| 1 | Requirements documented | Planning doc in `/app/memory/central_inventory/` or `/app/AI/Plans/` |
| 2 | API endpoints identified and verified | API addendum or verification report |
| 3 | Owner questions answered (if any) | Reference to `OWNER_ANSWERS_COMPLETE.md` or inline answers |
| 4 | Scope explicitly bounded | "In scope" / "Out of scope" section in planning doc |
| 5 | Dependencies identified | Blocked-by list with resolution path |
| 6 | CR Registry row created | Entry in `CR_REGISTRY.md` with status `PLANNING` |

**Output:** Planning doc approved → status moves to `APPROVED`

---

## Gate 2: APPROVED → IMPLEMENTING

**Who gates:** Implementation Agent
**Evidence required:**

| # | Criteria | Evidence |
|---|---------|----------|
| 1 | Planning doc reviewed and understood | Agent confirms in implementation report |
| 2 | No unresolved blockers | All dependencies available |
| 3 | Baseline of pre-change code identified | Git commit or snapshot reference |

**Output:** Implementation starts → status moves to `IMPLEMENTING`

---

## Gate 3: IMPLEMENTING → IMPLEMENTED

**Who gates:** Implementation Agent
**Evidence required:**

| # | Criteria | Evidence |
|---|---------|----------|
| 1 | Implementation report created | `*_IMPLEMENTATION_REPORT.md` with files changed, features delivered |
| 2 | Backend compiles and starts | Supervisor log confirms startup |
| 3 | Frontend compiles | Webpack "compiled successfully" |
| 4 | Self-verification tests pass | curl / screenshot / testing agent iteration |
| 5 | No regression in existing routes | Existing screens still load |
| 6 | CR Registry updated | Status → `IMPLEMENTED`, impl date recorded |

**Output:** Implementation complete → status moves to `IMPLEMENTED`

---

## Gate 4: IMPLEMENTED → QA_PASSED

**Who gates:** Independent QA Agent (NOT the implementing agent)
**Evidence required:**

| # | Criteria | Evidence |
|---|---------|----------|
| 1 | QA handoff document exists | `*_QA_HANDOFF.md` with checks, users, expected results |
| 2 | All QA checks executed | Check-by-check matrix with pass/fail |
| 3 | Zero critical/high defects | Defect list with severity |
| 4 | Known limitations documented and accepted | Limitation table in QA report |
| 5 | Role-based testing (all 3 roles) | Evidence for Central, Master, Outlet |
| 6 | No stock-changing mutations (unless safe test data exists) | Safety verification in report |
| 7 | QA report created | `*_QA_REPORT.md` |
| 8 | CR Registry updated | Status → `QA_PASSED`, QA date recorded |

**Output:** QA report with verdict → status moves to `QA_PASSED`

---

## Gate 5: QA_PASSED → SMOKE_PASSED

**Who gates:** Owner Smoke Agent or Owner directly
**Evidence required:**

| # | Criteria | Evidence |
|---|---------|----------|
| 1 | Smoke checklist exists | `*_OWNER_SMOKE_CHECKLIST.md` |
| 2 | All smoke checks executed (3 roles) | Smoke result with screenshots |
| 3 | Zero blocking issues | Issue list empty or all non-blocking |
| 4 | Known limitations acknowledged | Owner-visible limitation table |
| 5 | Smoke result recorded | `*_OWNER_SMOKE_RESULT.md` |
| 6 | CR Registry updated | Status → `SMOKE_PASSED` |

**Output:** Smoke result → status moves to `SMOKE_PASSED`

---

## Gate 6: SMOKE_PASSED → ACCEPTED

**Who gates:** Owner (human sign-off REQUIRED)
**Evidence required:**

| # | Criteria | Evidence |
|---|---------|----------|
| 1 | Owner reviews smoke result | Owner statement recorded |
| 2 | Owner explicitly accepts | Acceptance statement in `*_ACCEPTANCE.md` |
| 3 | Scope matches what was planned | Owner confirms no missing features |
| 4 | Known limitations accepted | Owner acknowledges limitations |
| 5 | CR Registry updated | Status → `ACCEPTED` |

**Output:** Owner acceptance statement → status moves to `ACCEPTED`

---

## Gate 7: ACCEPTED → FROZEN

**Who gates:** Freeze Agent
**Prerequisite:** RULE 1 must be fully satisfied (see top of document)
**Evidence required:**

| # | Criteria | Evidence |
|---|---------|----------|
| 1 | **QA report exists with pass verdict** (RULE 1.1) | `*_QA_REPORT.md` with check-by-check matrix |
| 2 | **Owner smoke test passed** (RULE 1.2) | `*_OWNER_SMOKE_RESULT.md` with 3-role coverage |
| 3 | **Owner explicit approval recorded — UI + business logic** (RULE 1.3) | Acceptance statement explicitly confirming both UI and business logic |
| 4 | All prior gates passed | Complete evidence chain from PLANNING through ACCEPTED |
| 5 | No open defects for this scope | Defect register clear |
| 6 | Regression verified | Existing frozen features still work |
| 7 | Freeze declaration created | `*_BASELINE_FREEZE_DECLARATION.md` |
| 8 | Files/routes/modules explicitly listed as frozen | Freeze manifest |
| 9 | Post-freeze rules documented | What's allowed vs forbidden |
| 10 | CR Registry updated | Status → `FROZEN`, freeze date recorded |

**RULE 1 checkpoint (Freeze Agent must verify):**
- [ ] QA report path: _______________
- [ ] Owner smoke result path: _______________
- [ ] Owner approval statement path: _______________
- [ ] Approval explicitly mentions UI: YES / NO
- [ ] Approval explicitly mentions business logic: YES / NO
- [ ] All three confirmed? → Proceed to freeze
- [ ] Any missing? → BLOCK freeze, document what's missing

**Output:** Freeze declaration → status moves to `FROZEN` → code changes require new CR

---

## Post-Freeze Rules

### Allowed after freeze:
- Bug fixes with QA evidence and regression verification
- New features behind new CR (separate registry row)
- Configuration changes (env vars, not code logic)
- Documentation updates

### Forbidden after freeze:
- Modifying frozen component behavior without new CR
- Adding features to frozen scope
- Removing existing functionality
- Changing API contracts consumed by frozen components

### Emergency hotfix process:
1. Create `HOTFIX-XXX` entry in CR Registry
2. Implement fix with minimal scope
3. QA the fix + regression
4. Record in CR Registry
5. Update freeze manifest

---

## Slice 6 Entry Gate (RULE 2 Enforcement)

**This gate MUST be passed before any Slice 6 / new scope work begins.**

| # | Checkpoint | How to Verify | Status |
|---|-----------|--------------|--------|
| 1 | CI-060 UI Consolidation complete | `CI_060_UI_CONSOLIDATION_REPORT.md` exists with all screens validated | NOT MET |
| 2 | CR Registry has ZERO items at `IMPLEMENTED` | `grep "IMPLEMENTED" CR_REGISTRY.md` returns 0 | NOT MET (7 items) |
| 3 | CR Registry has ZERO items at `QA_PASSED` | `grep "QA_PASSED" CR_REGISTRY.md` returns 0 | NOT MET (6 items) |
| 4 | CR Registry has ZERO items at `SMOKE_PASSED` | `grep "SMOKE_PASSED" CR_REGISTRY.md` returns 0 | NOT MET (1 item) |
| 5 | Every active baseline is `FROZEN` or `DEFERRED` | All rows checked | NOT MET |
| 6 | `BASELINE_FREEZE_DECLARATION.md` exists | File exists in memory | NOT MET |
| 7 | Owner recorded: "All current UI and business logic approved. Proceed to Slice 6." | Statement in `CI_060_OWNER_APPROVAL.md` | NOT MET |

**If ANY checkpoint fails:** Agent MUST refuse Slice 6 work and return:
> "BLOCKED by RULE 2: Cannot start Slice 6. The following baselines are not frozen: [list]. Owner Slice 6 approval not recorded."

---

## Production Gate (Future)

Before production deployment, ALL of the following must be true:

| # | Criteria | Current Status |
|---|---------|---------------|
| 1 | All active CRs at `FROZEN` status | NOT MET — 7 at `IMPLEMENTED` |
| 2 | Production API URL configured | NOT MET — still preprod |
| 3 | SEC-001 token masking implemented | NOT MET |
| 4 | Live mutation testing completed | NOT MET |
| 5 | Error monitoring/alerting configured | NOT MET |
| 6 | Rate limiting on proxy | NOT MET |
| 7 | Performance testing at scale | NOT MET |
| 8 | Production deployment runbook | NOT MET |
| 9 | Rollback procedure documented | NOT MET |
| 10 | Owner sign-off on production readiness | NOT MET |

---

*End of Gate Control Framework*
