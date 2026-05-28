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

| ID | Name | What | Status | QA | Smoke | Owner Approval |
|----|------|------|--------|----|-------|----------------|
| CI-010 | Read-Only Foundation | 6 screens + login + roles | `QA_PASSED` | Done | **NO** | **NO** |
| CI-011 | UX Polish | Timeline, actions, pickers | `QA_PASSED` | Done | **NO** | **NO** |
| CI-012 | History & Audit | History + Ledger + filters | `QA_PASSED` | Done | **NO** | **NO** |
| CI-013 | Transfer Write Actions | Approve, dispatch, receive, forms | `QA_PASSED` | Done | **NO** | **NO** |
| CI-014 | Stock Adj / Wastage | Adjustment, wastage, cleanup | `SMOKE_PASSED` | Done | Done | **NO** |
| CI-020 | POS Login Context | Real POS profile for login | `QA_PASSED` | Done | **NO** | **NO** |
| CI-021 | Seed Data Removal | All fake data removed | `QA_PASSED` | Done | **NO** | **NO** |
| CI-030 | Line-Level Approval | Approve/reject per line | `IMPLEMENTED` | **NO** | **NO** | **NO** |
| CI-031 | Dispute Resolution | Disputes + item editing | `IMPLEMENTED` | **NO** | **NO** | **NO** |
| CI-032 | Amend/Withdraw/Modify | Lifecycle extensions | `IMPLEMENTED` | **NO** | **NO** | **NO** |
| CI-033 | Operational Settings | Store policy config | `IMPLEMENTED` | **NO** | **NO** | **NO** |
| CI-034 | Vendor Management | Vendor CRUD | `IMPLEMENTED` | **NO** | **NO** | **NO** |
| CI-035 | Add Stock from Vendor | Procurement form | `IMPLEMENTED` | **NO** | **NO** | **NO** |
| CI-036 | Stock Inventory Summary | Stock dashboard + hierarchy | `IMPLEMENTED` | **NO** | **NO** | **NO** |

**FROZEN: 0 implementation baselines | Owner action needed: 14 baselines**

**Owner-Mandated Rules:**
- **RULE 1:** No baseline freeze without QA + Owner Smoke Test + Owner Explicit Approval (UI + business logic). No implicit. No assumed.
- **RULE 2:** No new work (CI-040+) until ALL baselines CI-010 to CI-036 are FROZEN + owner gives explicit go-ahead

> CR Registry: `CR_REGISTRY.md` | Gate criteria: `GATE_CONTROL_FRAMEWORK.md`

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
