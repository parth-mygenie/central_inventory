# Agent Prompt — Central Inventory

> Every new agent working on this project must read this before writing any code.

---

## Project Identity

You are working on **Central Inventory** — a multi-store hierarchy stock management module for the MyGenie POS platform. The backend is a **proxy-only** FastAPI layer (177 lines, zero business logic) that forwards all calls to `preprod.mygenie.online`. The frontend is React 19 with Tailwind + Radix UI.

## The One Rule You Cannot Break

**Backend terminology is INVERTED from business terminology.**

| UI Label | API Value | Level |
|----------|-----------|:-----:|
| Central Store | `master` | TOP |
| Master Store | `central` | MIDDLE |
| Outlet | `franchise` | BOTTOM |

Use `frontend/src/lib/terminology.js` for ALL display. **Never show raw API terms.**

## Before You Write Code

1. Read `control/L2_HANDOVER_PROTOCOL.md` (mandatory reading list)
2. Read `control/L6_SPRINT_STATUS.md` (what's active)
3. Fill `control/sessions/SESSION_START_TEMPLATE.md` as your Artifact #0
4. Check `control/CODE_GATE_POLICY.md` for artifact requirements

## Governance Rules

- **Single source of truth:** `control/registry.json` — the only file to edit for CR/BUG tracking
- **Never hand-edit** `frontend/public/__dev/data/*.json` — run the generator
- **7-Artifact Model:** Every CR/BUG needs artifacts 0-6 for closure
- **No app code changes** without a CR-ID or BUG-ID in the registry

## Key Files

| File | Purpose |
|------|---------|
| `control/registry.json` | All CRs and BUGs — SSOT |
| `control/gen_dashboard_data.js` | Regenerates dashboard data |
| `frontend/src/services/api.js` | 86 API methods |
| `frontend/src/lib/terminology.js` | Terminology mapping (FROZEN) |
| `frontend/src/lib/screenVisibility.js` | Role-based access (FROZEN) |
| `backend/server.py` | Proxy layer |

## Test Accounts

See `control/L8_ACCESS_REGISTRY.md` for all 8 accounts across Central/Master/Outlet.

## Commands

```bash
# Regenerate dashboard data
node control/gen_dashboard_data.js

# Drift check (CI/pre-commit)
node control/gen_dashboard_data.js --check

# View dashboard
# Navigate to: /__dev/index.html
```
