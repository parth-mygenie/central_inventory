# L2 — Handover Protocol (Agent Onboarding)

> **Updated:** 2026-06-01 (Session closing — all implementation complete)

---

## Mandatory Reading Order

A new agent MUST read these in order before writing any code:

1. **This file** — orientation
2. **`control/L1_CONTROL_DASHBOARD.md`** — current project state
3. **`control/L0_BASELINE_INDEX.md`** — what's frozen and cannot be changed
4. **`control/L8_ACCESS_REGISTRY.md`** — test accounts and credentials
5. **`control/L5_ENV_CONFIG_REGISTRY.md`** — environment setup
6. **`control/L6_SPRINT_STATUS.md`** — what's active, what to work on
7. **`control/CODE_GATE_POLICY.md`** — artifact requirements before coding
8. **`control/sessions/INTELLIGENT_UI_FREEZE_PHASE_7_FINAL_FREEZE.md`** — frozen implementation spec
9. **`control/sessions/CR021_SESSION_START.md`** — what was implemented and how

## Critical Architecture Facts

### The Terminology Inversion (READ THIS)

| What the UI displays | What the API returns | Hierarchy Level |
|---------------------|---------------------|:---------------:|
| **Central Store** | `restaurant_type: "master"` | TOP |
| **Master Store** | `restaurant_type: "central"` | MIDDLE |
| **Outlet** | `restaurant_type: "franchise"` | BOTTOM |

Mandatory mapping at `frontend/src/lib/terminology.js`. **NEVER display raw API terms.**

### Backend is a Proxy

`backend/server.py` (177 lines) is a pass-through proxy to `preprod.mygenie.online`:
- Login proxy with POS profile enrichment
- Generic V2 catch-all (`/api/proxy/v2/{path}`)
- Zero business logic. All intelligence is frontend-computed.

### PO Number Format

`formatPO(id)` from `lib/formatters.js` converts transfer ID → `PO-XXXX` (last 4 digits, zero-padded). Transfer #129 → PO-0129. Temporary until G-013 (real PO numbers from backend).

### Intelligence Layer (Complete)

All intelligence is frontend-computed from existing API data:
- `useStockIntelligence.js` — shared hook (stale approvals, low stock, activity)
- `StockIntelligenceBar.jsx` — 6-metric health strip
- `FulfillmentVerdict.jsx` — can/partial/can't fulfill badge
- `StoreHealthStrip.jsx` — compact store health display
- `PostSubmitConfirmation.jsx` — success card after write actions
- Age badges: red (>72h stale), amber (24-72h aging), gray (fresh)
- Impact previews: stock before/after projections in all forms

### API Data Quirk

POS API returns `display_qty` as a **string**, not a number. Always wrap in `Number()` before arithmetic. (BUG-016)

### Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Central (TOP) | abhishek@kalabahia.com | Qplazm@10 |
| Master (MID) | owner@democentral1.com | Qplazm@10 |
| Outlet (BOT) | owner@demofranchise1.com | Qplazm@10 |

Full list: `control/L8_ACCESS_REGISTRY.md` and `memory/test_credentials.md`

### What's Left for Next Agent

1. **CR-023 is IN PROGRESS** — fixing 18 API-mismatch bugs in 6 batches. Owner smoke test required after each batch.
2. Current batch: **Batch 1** — `useRestaurantMap` hook + OperationsHub Store Health Grid
3. Read `control/sessions/CR023_ARTIFACT_4_CODE_GATE.md` for batch tracker + smoke test instructions
4. **Owner signoff** still pending on CR-021 + CR-022
5. **Backend team** delivers G-013 (PO numbers), G-014 (Invoice OCR), G-015 (Excel parsing), G-017 (Vendor history)

### Data Context

- **Previous demo data deleted** (Cooking Oil, Maida, Patri, Red Meat, demo foods/recipes)
- **ChocolateHut data seeded** — 158 inventory items, 163 with stock, 67 low-stock, 7 categories
- **Stores preserved** — same 10-store hierarchy (Central + 3 Masters + 6 Franchises)
- **Vendors preserved** — 12 existing vendors

### Governance Rules

Every CR/BUG follows the **7-Artifact Closure Model** (`CODE_GATE_POLICY.md`):
```
0 Session-Start → 1 Intake → 2 Impact Analysis → 3 Impl Plan →
4 Code-Gate → 5 QA Report → 6 Owner Signoff
```

**CRITICAL:** Register a CR in `registry.json` BEFORE starting work. Previous session had a governance gap — work started without CR registration. CR-023 follows the gate properly.

**CRITICAL:** Owner smoke test is MANDATORY after every batch in CR-023. Do not proceed to next batch without approval.

## Branch Info

| Field | Value |
|-------|-------|
| Current branch | `01-june` |
| Repo | `Abhi-mygenie/central-iventory` |
| Deploy URL | `https://api-sync-staging.preview.emergentagent.com` |
