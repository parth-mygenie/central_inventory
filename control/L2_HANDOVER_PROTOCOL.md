# L2 — Handover Protocol (Agent Onboarding)

> **Updated:** 2026-06-02 (S3 active — CR-023/024/025 in QA)

---

## Mandatory Reading Order

1. **This file** — orientation
2. **`control/L1_CONTROL_DASHBOARD.md`** — current project state
3. **`control/L0_BASELINE_INDEX.md`** — what's frozen and cannot be changed
4. **`control/L8_ACCESS_REGISTRY.md`** — test accounts and credentials
5. **`control/L5_ENV_CONFIG_REGISTRY.md`** — environment setup
6. **`control/L6_SPRINT_STATUS.md`** — what's active, what to work on
7. **`control/CODE_GATE_POLICY.md`** — artifact requirements before coding
8. **`control/sessions/INTELLIGENT_UI_FREEZE_PHASE_7_FINAL_FREEZE.md`** — frozen implementation spec
9. **`memory/PRD.md`** — full implementation history and backlog

## Critical Architecture Facts

### The Terminology Inversion (READ THIS)

| What the UI displays | What the API returns | Hierarchy Level |
|---------------------|---------------------|:---------------:|
| **Central Store** | `restaurant_type: "master"` | TOP |
| **Master Store** | `restaurant_type: "central"` | MIDDLE |
| **Outlet** | `restaurant_type: "franchise"` | BOTTOM |

Mandatory mapping at `frontend/src/lib/terminology.js`. **NEVER display raw API terms.**

### Backend is a Proxy

`backend/server.py` (181 lines) is a pass-through proxy to `preprod.mygenie.online`:
- Login proxy with POS profile enrichment
- Generic V2 catch-all (`/api/proxy/v2/{path}`)
- Zero business logic. All intelligence is frontend-computed.

### API Cache Layer (CR-024)

`frontend/src/services/api.js` has an in-memory response cache:
- TTL: LONG 60s (hierarchy-summary, stock-inventory), MEDIUM 45s (hierarchy-detail, transfer-details), SHORT 30s (pending-queues, history)
- In-flight dedup prevents concurrent identical requests
- All write endpoints auto-invalidate related caches
- `api.invalidateAll()` available for manual refresh

### Intelligent PO Architecture (CR-025)

Both Request Stock and Direct Dispatch share the same intelligence model:
- **Coverage selector**: [3d] [7d] [10d] [30d]
- **Dual mode**: Consumption-based (`getDailyConsumptionReport`) when data exists, threshold-based (`min_qty_alert`) fallback when it doesn't
- **Tight filter**: Only items that genuinely need ordering/dispatching appear
- **Smart qty**: gap-to-min or consumption × days, capped at source/own stock

### Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Central (TOP) | abhishek@kalabahia.com | Qplazm@10 |
| Master (MID) | owner@democentral1.com | Qplazm@10 |
| Outlet (BOT) | owner@demofranchise1.com | Qplazm@10 |

Full list: `control/L8_ACCESS_REGISTRY.md` and `memory/test_credentials.md`

### What's Left for Next Agent

1. **Owner signoff pending** on CR-023, CR-024, CR-025 (all in QA, implementation complete)
2. **Backlog CRs:** CR-015 (FEFO Batch Detail, P0), CR-016 (Hierarchy Toggle, P1), CR-017 (Smart Dispatch, P1)
3. **Catalogue preview gaps:** DailyConsumptionReport Trend column, Product "Has Recipe" cross-ref
4. **Backend team** delivers G-013 (PO numbers), G-014 (Invoice OCR), G-015 (Excel parsing), G-017 (Vendor history)
5. **Governance note:** CR-024 and CR-025 had gate waived (velocity exception). Artifacts 0 + 4 waived, 1-3 documented in PRD.md.

### Branch Info

| Field | Value |
|-------|-------|
| Current branch | `02-june` |
| Repo | `Abhi-mygenie/central-iventory` |
| Deploy URL | `https://7d067d86-11d0-4171-9ae2-57e426a47f39.preview.emergentagent.com` |
