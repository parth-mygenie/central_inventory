# Agent Prompt — Central Inventory

> **Updated:** 2026-06-13
> Every new agent working on this project MUST read this before writing any code.

---

## Project Identity

You are working on **Central Inventory** — a multi-store hierarchy stock management module for the MyGenie POS platform. The backend is a **proxy-only** FastAPI layer (~180 lines, zero business logic) that forwards all calls to `preprod.mygenie.online`. The frontend is React 19 + Craco + Tailwind + Radix UI (shadcn).

## The One Rule You Cannot Break

**Backend terminology is INVERTED from business terminology.**

| UI Label | API Value | Level |
|----------|-----------|:-----:|
| Central Store | `master` | TOP |
| Master Store | `central` | MIDDLE |
| Outlet | `franchise` | BOTTOM |

Use `frontend/src/lib/terminology.js` for ALL display. **Never show raw API terms.**

---

## Your Onboarding Checklist

Read these files **in order** before doing anything else:

| # | File | What You Learn |
|---|------|----------------|
| 1 | `control/L1_CONTROL_DASHBOARD.md` | Current project state, active sprint, what's closed/open |
| 2 | `control/L0_BASELINE_INDEX.md` | 6 frozen documents + 6 architecture contracts you CANNOT break |
| 3 | `control/CODE_GATE_POLICY.md` | 7-artifact closure model — what's required before you code |
| 4 | `control/MAINTENANCE_RULES.md` | When to update each governance layer |
| 5 | `control/L6_SPRINT_STATUS.md` | Sprint S3 active — what's done, what's next |
| 6 | `control/L8_ACCESS_REGISTRY.md` | Test accounts (806 hierarchy is primary) |
| 7 | `control/L7_FILE_OWNERSHIP.md` | Frozen files — check before touching anything |
| 8 | `control/L9_OPEN_GAPS_REGISTER.md` | Backend gaps — what you can't fix in frontend |
| 9 | `control/sessions/INTELLIGENT_UI_FREEZE_PHASE_7_FINAL_FREEZE.md` | Frozen UI spec (24 screens) |
| 10 | `memory/test_credentials.md` | Quick-reference login credentials |

**Do NOT write code until you have completed this reading.**

---

## Current State (as of 2026-06-13)

| Field | Value |
|-------|-------|
| **Branch** | `13-6-26` |
| **Active Sprint** | S3 — API Reality Check + Intelligent PO + FEFO Detail |
| **Closed in S3** | CR-023, CR-024, CR-025 (all CLOSED) |
| **Next work** | CR-025 sub-task (wire `reference_code`), then CR-015 (FEFO Batch Detail) |
| **Backend** | FastAPI proxy on port 8001 (supervisor-managed) — DO NOT MODIFY |
| **Frontend** | React 19 + Craco on port 3000 (supervisor-managed) |
| **POS API** | `preprod.mygenie.online/api/v2/vendoremployee` |

### Immediate Work Items

| Priority | Item | Status | Notes |
|----------|------|--------|-------|
| **Do first** | CR-025 sub-task: wire `reference_code` as PO number | Planning done (artifacts 0-3 at `control/sessions/CR025_REFERENCE_CODE_*.md`) | Frontend-only, 9 files, 17 edits |
| **P0** | CR-015: FEFO Batch Stock Detail Panel | PLANNED in S3, code ~80% built | Planning doc at `AI/Plans/phase3/P24_fefo_batch_stock_planning.md`. Needs Session-Start, smoke test, Phase 3 (wastage), QA |

---

## Before You Write ANY Code — Code Gate Policy

For CRs, **ALL 7 artifacts are MANDATORY:**

| # | Artifact | What to Create |
|---|----------|---------------|
| 0 | **Session-Start** | Copy `control/sessions/SESSION_START_TEMPLATE.md`, fill in context |
| 1 | **Intake** | Problem statement, scope, requirements |
| 2 | **Impact Analysis** | Files affected, APIs used, risk assessment |
| 3 | **Implementation Plan** | Step-by-step file targets, test checkpoints |
| 4 | **Code-Gate** | Review checkpoint before major coding |
| 5 | **QA Report** | Test results, screenshots, curl evidence |
| 6 | **Owner Signoff** | Mark PENDING until owner confirms |

Save artifacts at: `control/sessions/CR{ID}_ARTIFACT_{N}_{NAME}.md`

---

## Rules You Must Not Break

1. **L0 Baseline** — NEVER edit the 6 frozen documents. Changes require owner re-approval.
2. **Terminology** — ALWAYS use `terminology.js` mapping. Never raw API terms in UI.
3. **Backend** — `server.py` is proxy-only. Don't add business logic.
4. **Cache** — Don't break the `api.js` cache layer. Write endpoints must invalidate.
5. **registry.json** — Source of truth. Never hand-edit generated JSONs in `__dev/data/`.
6. **display_qty is a STRING** from POS API — always `Number()` wrap before arithmetic.
7. **Stock source of truth** is segment ledger (`inventory_stock_segments`), not aggregate.

---

## After Every Status Change — Governance Updates

```
1. Edit control/registry.json — update CR/BUG status + artifact refs
2. Run:  node control/gen_dashboard_data.js
3. Verify: node control/gen_dashboard_data.js --check
4. Update control/L1_CONTROL_DASHBOARD.md if sprint state changed
5. Update control/L6_SPRINT_STATUS.md if items moved
6. Update control/L9_OPEN_GAPS_REGISTER.md if gaps resolved
7. Update control/L7_FILE_OWNERSHIP.md if new files created/frozen
```

---

## Test Accounts (Primary — Restaurant 806 Hierarchy)

| Role | Email | Password | RID |
|------|-------|----------|:---:|
| Central Store (TOP) | `manager@germanfluid.com` | `Qplazm@10` | 806 |
| Master Store (MID) | `manager@centralkitchenalpha.com` | `Qplazm@10` | 807 |
| Outlet (BOTTOM) | `manager@outletdirectone.com` | `Qplazm@10` | 809 |

Full list: `control/L8_ACCESS_REGISTRY.md`

---

## Key Files

| File | Purpose | Frozen? |
|------|---------|:-------:|
| `control/registry.json` | All CRs + BUGs — SSOT | Edit carefully |
| `control/gen_dashboard_data.js` | Regenerates dashboard data | No |
| `frontend/src/services/api.js` | ~86 API methods + cache layer (~997 lines) | No |
| `frontend/src/lib/terminology.js` | Terminology mapping | **YES** |
| `frontend/src/lib/screenVisibility.js` | Role-based access + nav | **YES** |
| `frontend/src/lib/formatters.js` | Date/number/PO formatting | No |
| `frontend/src/App.js` | Routes + auth guards | No |
| `frontend/src/hooks/useLoginContext.js` | Auth context + restaurant type | No |
| `backend/server.py` | Proxy layer — DO NOT ADD LOGIC | **YES** (by policy) |

---

## Commands

```bash
# Regenerate dashboard data (after registry.json edits)
node control/gen_dashboard_data.js

# Drift check (must pass before committing)
node control/gen_dashboard_data.js --check

# View dev dashboard
# Navigate to: /__dev/index.html
```
