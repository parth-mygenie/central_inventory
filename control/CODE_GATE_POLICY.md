# Code-Gate Policy

> Defines when artifacts are mandatory vs. waivable for the 7-Artifact Closure Model.

---

## The 7 Artifacts

| # | Artifact | Purpose |
|---|----------|---------|
| 0 | **Session-Start** | Agent fills template before coding. Context capture. |
| 1 | **Intake** | Problem statement, scope, requirements doc. |
| 2 | **Impact Analysis** | What files/APIs/flows are affected. Risk assessment. |
| 3 | **Implementation Plan** | Step-by-step plan with file targets. |
| 4 | **Code-Gate** | Pre-implementation review checkpoint. Diff preview or plan approval. |
| 5 | **QA Report** | Test results, screenshots, curl evidence. |
| 6 | **Owner Signoff** | Owner accepts the delivered work. |

## Mandatory vs. Waivable

### For New Work (S1 onwards — governance in place)

| Artifact | CRs | BUGs (HIGH+) | BUGs (MEDIUM-) |
|----------|:---:|:------------:|:--------------:|
| 0 Session-Start | **MANDATORY** | **MANDATORY** | MANDATORY |
| 1 Intake | **MANDATORY** | **MANDATORY** | MANDATORY |
| 2 Impact Analysis | **MANDATORY** | **MANDATORY** | Waivable |
| 3 Impl Plan | **MANDATORY** | Waivable | Waivable |
| 4 Code-Gate | **MANDATORY** | Waivable | Waivable |
| 5 QA Report | **MANDATORY** | **MANDATORY** | **MANDATORY** |
| 6 Owner Signoff | **MANDATORY** | **MANDATORY** for HIGH | Waivable |

### For Pre-Governance Work (S0 — retroactive)

| Artifact | Policy |
|----------|--------|
| 0 Session-Start | WAIVED — didn't exist |
| 1 Intake | Map to existing planning doc if available |
| 2 Impact Analysis | Map to existing planning doc if available |
| 3 Impl Plan | Map to existing planning doc if available |
| 4 Code-Gate | WAIVED — process didn't exist |
| 5 QA Report | Map to existing QA/test report if available |
| 6 Owner Signoff | PENDING — needs retroactive batch sign-off |

## Waiver Registry

Waivers are logged directly in `registry.json` via `"status": "WAIVED"` on the artifact ref. The dashboard's Closure Debt tab distinguishes between WAIVED (acceptable) and MISSING (debt).

| Waiver Category | When Applied |
|----------------|-------------|
| Pre-governance | All S0 items: artifacts 0, 4 auto-waived |
| Low-severity bug | BUGs with severity LOW/INFO: artifacts 2, 3, 4, 6 waivable |
| Emergency hotfix | Document post-hoc. Artifacts 2, 3, 4 waived. 0, 1, 5 mandatory. |

## Closure Debt Rules

An item has **closure debt** when:
- It has any artifact with status `MISSING` or `PENDING`
- AND it is not in `PROPOSED` status (not started = no debt)

The dashboard's Closure Debt tab shows all items in debt with specific reasons.
