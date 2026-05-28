# Central Inventory — Gate Control Framework

> **Last Updated:** 28 May 2026
> **Purpose:** Define mandatory stage gates for enterprise-grade quality control.
> **Rule:** No CR/phase advances to the next stage without passing ALL gate criteria.

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
**Evidence required:**

| # | Criteria | Evidence |
|---|---------|----------|
| 1 | All prior gates passed | Complete evidence chain |
| 2 | No open defects for this scope | Defect register clear |
| 3 | Regression verified | Existing features still work |
| 4 | Freeze declaration created | `*_BASELINE_FREEZE_DECLARATION.md` |
| 5 | Files/routes/modules explicitly listed as frozen | Freeze manifest |
| 6 | Post-freeze rules documented | What's allowed vs forbidden |
| 7 | CR Registry updated | Status → `FROZEN`, freeze date recorded |

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
