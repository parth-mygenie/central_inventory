# Central Inventory — MyGenie POS Module

> Multi-level inventory transfer management system for the MyGenie POS platform.

## What Is This

Central Inventory manages stock movement across a three-level business hierarchy:

```
Central Store (top — main warehouse)
    ↓
Master Store (middle — regional store)
    ↓
Outlet (bottom — restaurant / retail unit)
```

The frontend is a React SPA that proxies all data requests through a FastAPI backend to MyGenie's POS API (`preprod.mygenie.online`). No local inventory data — all stock, transfers, and hierarchy come from the real POS API.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Tailwind CSS, shadcn/ui (Radix), CRACO, react-router-dom v7 |
| Backend | FastAPI (Python 3.11), httpx (async proxy), motor (async MongoDB) |
| Database | MongoDB (token sessions only — no inventory data stored locally) |
| External API | MyGenie POS API V1 (auth) + V2 (vendoremployee inventory endpoints) |
| Build | CRACO (CRA + custom webpack config) |

## Quick Start

```bash
# Backend
cd /app/backend
pip install -r requirements.txt
# Runs on port 8001 (supervisor-managed)

# Frontend
cd /app/frontend
yarn install
# Runs on port 3000 (supervisor-managed, hot reload)

# Services
sudo supervisorctl restart backend frontend
```

## Environment Variables

### Backend (`/app/backend/.env`)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
CORS_ORIGINS=*
```

### Frontend (`/app/frontend/.env`)
```
REACT_APP_BACKEND_URL=https://<preview-url>.preview.emergentagent.com
WDS_SOCKET_PORT=443
ENABLE_HEALTH_CHECK=false
```

## Architecture

```
Browser → React SPA (port 3000)
            ↓ API calls via axios
     Kubernetes Ingress (/api/* → port 8001)
            ↓
     FastAPI Proxy (port 8001)
       ├── POST /api/proxy/auth/login → POS V1 login + profile enrichment
       └── ANY  /api/proxy/v2/{path}  → POS V2 pass-through
            ↓
     preprod.mygenie.online (real POS API)
```

**Key design decisions:**
- Backend is a **pure proxy** — no local inventory logic, no seed data
- Login enriches response with POS profile context (`restaurant_type_flag`, `restaurant_id`, `parent_restaurant_id`)
- Token sessions persisted in MongoDB for restart survival
- Frontend derives all permissions from `restaurant_type_flag` via terminology adapter

## Terminology Mapping (CRITICAL)

Backend and business use **inverted** hierarchy terms:

| Business Term (UI) | Backend API Term | Level |
|---------------------|-----------------|-------|
| **Central Store** | `master` | TOP |
| **Master Store** | `central` | MIDDLE |
| **Outlet** | `franchise` | BOTTOM |

All mapping handled by `src/lib/terminology.js`. UI never displays raw backend terms.

## Test Accounts

| Email | Password | Role | Store |
|-------|----------|------|-------|
| `killua@zoldyck.com` | `Qplazm@10` | Central Store | My Genie (ID=1) |
| `abhishek@kalabahia.com` | `Qplazm@10` | Central Store | My Genie (ID=1) |
| `owner@democentral1.com` | `Qplazm@10` | Master Store | DemoCentral1 (ID=781) |
| `owner@demofranchise1.com` | `Qplazm@10` | Outlet | DemoFranchise1 (ID=783) |

## Routes

| Path | Screen | Access |
|------|--------|--------|
| `/` | Operations Hub | All roles |
| `/inventory` | Stock Inventory Summary | All roles |
| `/hierarchy` | Hierarchy Summary | All roles |
| `/store/:id` | Store Detail | All roles (scoped) |
| `/queues` | Pending Queues | All roles |
| `/history` | History & Ledger | All roles |
| `/dispatch/new` | Direct Dispatch Form | Central, Master |
| `/request/new` | Request Stock Form | Master, Outlet |
| `/adjustment/new` | Stock Adjustment | Central only |
| `/wastage/new` | Wastage Entry | All roles |
| `/wastage/report` | Wastage Report | All roles |
| `/settings` | Operational Settings | Central, Master |
| `/vendors` | Vendor Management | Central, Master |
| `/procurement/new` | Add Stock (Vendor) | Central, Master |
| `/transfer/:id` | Transfer Detail | All roles |

## Baseline Status (28 May 2026)

| Baseline | Status | Freeze Date | Evidence |
|----------|--------|-------------|----------|
| S1: Read-only Foundation | `FROZEN` | 23 May | Closure report + QA |
| S2: UX Polish + Enterprise | `FROZEN` | 23 May | Closure report + QA |
| S3: History & Ledger | `FROZEN` | 23 May | Closure report + QA |
| S4: Transfer Write Flows | `FROZEN` | 23 May | Closure report + QA |
| Seed Shutdown | `FROZEN` | 28 May | QA report 20/20, seed_data.py deleted |
| POS API Context Migration P1 | `FROZEN` | 28 May | QA report 17/17 |
| S5: Stock Adj / Wastage / Cleanup | `SMOKE_PASSED` | — | 55/57 QA + 44/44 smoke; owner acceptance pending |
| P15/P16: Request-Line Lifecycle | `IMPLEMENTED` | — | Code + iteration tests; closure doc pending |
| P17: Amend/Withdraw/Modification | `IMPLEMENTED` | — | Code + iteration tests; closure doc pending |
| P17-Settings: Operational Settings | `IMPLEMENTED` | — | Code + iteration tests; closure doc pending |
| P18: Vendor Management | `IMPLEMENTED` | — | Code + iteration tests; closure doc pending |
| P19: Add Stock / Procurement | `IMPLEMENTED` | — | Code + iteration tests; closure doc pending |
| P20: Stock Inventory Summary | `IMPLEMENTED` | — | Code + iteration tests; closure doc pending |
| P21: Smart Dispatch Assist | `PLANNING` | — | Planning doc only, no code |

**Frozen: 6 | Smoke Passed: 1 | Implemented (needs QA): 6 | Planning: 1**

**Owner-Mandated Rules:**
- **RULE 1:** No baseline freeze without QA + Owner Smoke Test + Owner Explicit Approval (UI + business logic confirmed)
- **RULE 2:** No Slice 6 work until ALL baselines are FROZEN and owner gives explicit go-ahead

> Full baseline matrix: `CENTRAL_INVENTORY_CONSOLIDATED_STATUS_AND_BASELINE_FREEZE_REPORT.md`
> Gate criteria + rules: `GATE_CONTROL_FRAMEWORK.md`
> CR tracker: `CR_REGISTRY.md`

## Project Governance

| Document | Path | Purpose |
|----------|------|---------|
| **CR Registry** | `/app/memory/central_inventory/CR_REGISTRY.md` | Master tracker for all CRs, slices, phases |
| **Gate Control** | `/app/memory/central_inventory/GATE_CONTROL_FRAMEWORK.md` | Stage gate criteria and checklists |
| **PRD** | `/app/memory/PRD.md` | Product requirements + backlog |
| **Consolidation Report** | `/app/memory/central_inventory/CENTRAL_INVENTORY_CONSOLIDATED_STATUS_AND_BASELINE_FREEZE_REPORT.md` | Current baseline status |
| **Document Index** | `/app/memory/central_inventory/DOCUMENT_INDEX.md` | Navigate all 87+ project docs |

## Branch

Current working branch: `28_5_26_ux`
