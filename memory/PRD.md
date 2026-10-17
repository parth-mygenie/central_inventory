# Central Inventory — PRD

## Original Problem Statement
Deploy the existing React frontend repo directly into `/app` and run it as-is, with no code edits.
- Repo: https://github.com/parth-mygenie/central_inventory.git
- **Current Branch: handover_investigate_intake-16oct** (deployed 2026-10-17)
- Previous Branch: 7-8-26 (deployed 2026-10-15)
- Destination: `/app` (repo contents pulled directly into `/app`, not a subfolder)
- Platform files preserved during clear-and-clone
- No code edits — deployed and run as-is

## Architecture
- **Frontend:** React 19 + CRACO + Tailwind CSS 3 + Radix UI + React Router DOM 7 + Recharts + Axios
- **Backend:** FastAPI + Motor (async MongoDB) + httpx (proxy to preprod POS API) + Pydantic v2 + Uvicorn
- **Database:** MongoDB (local, MONGO_URL from .env)
- **External API:** preprod.mygenie.online (POS API proxy)

## Deployment History

### 2026-10-17 — Branch handover_investigate_intake-16oct Deployed
- Cleared `/app` (git clone directly into `/app`)
- Cloned branch `handover_investigate_intake-16oct` from GitHub directly into `/app`
- Preserved platform files: `backend/.env`, `frontend/.env`, `.emergent/emergent.yml` (release-15102026-1), `memory/`, `test_reports/`
- Backend packages: all present (no reinstall needed)
- Ran `yarn install` for frontend (success, no errors)
- Restarted backend + frontend via supervisorctl
- Both services running: backend (port 8001), frontend (port 3000)
- App loads: Central Inventory sign-in page confirmed via screenshot

### 2026-10-15 — Branch 7-8-26 Deployed
- Cleared `/app` (preserved `.git`)
- Cloned branch `7-8-26` from GitHub via rsync into `/app`
- Preserved platform files: `backend/.env`, `frontend/.env`, `.emergent/emergent.yml`, `memory/`, `test_reports/`, `pytest.ini`
- Ran `pip install -r requirements.txt` for backend
- Ran `yarn install` for frontend
- Restarted backend + frontend via supervisorctl
- Both services running: backend (port 8001), frontend (port 3000)
- App loads: Central Inventory sign-in page confirmed via screenshot

### 2026-07-28 — Branch 28-7-26 Deployed (previous)
- Initial deploy from branch `28-7-26`
- UX improvements: PO creation simplified, Batch/Expiry made mandatory

## Platform Files Preserved
| File/Folder | Reason |
|---|---|
| `backend/.env` | MONGO_URL, DB_NAME, CORS_ORIGINS |
| `frontend/.env` | REACT_APP_BACKEND_URL, WDS_SOCKET_PORT |
| `.emergent/emergent.yml` | env_image_name for this pod (release-08102026-1) |
| `memory/` | Fully from repo (has investigation reports, PRD, QA reports) |
| `test_reports/` | Fully from repo (65+ test report iterations) |

## Investigation Session — 2026-10-15/16 (Storekeeper Purchase UX Overhaul)

**Role:** INVESTIGATION → prepared for INTAKE
**Master doc:** `control/sessions/INVESTIGATION_MASTER_PURCHASE_UX_OVERHAUL.md`
**Mockups:** `purchase_form_mockup.html` (Add Stock) + `po_flow_mockup.html` (PO flow, 6 screens)

### Key Findings
- `AddStockPurchaseForm.jsx`: 7 UX gaps — card layout → spreadsheet row, auto-batch, auto-total, search combobox, auto-open row, prices on confirm
- `PurchaseOrderCreate.jsx`: 5 gaps — 266 pre-selected items, TARGET_DAYS=30 hardcoded (should be selector 3/7/10/30d), wrong fallback "10" vs min_qty_alert, 9-column table overload, no vendor search
- `PurchaseOrderDetail.jsx` receive form: 5 gaps — card-per-item, no auto-batch, no live total, no grand total bar
- Owner confirmed: suggested quantities are editable, vendor is shared (not per-line), payment is single-type

### Proposed Registrations (for INTAKE)
| ID | Type | Title | Severity |
|----|------|-------|:--------:|
| CR-047 | CR | Add Stock — Storekeeper Spreadsheet UX | P1 |
| CR-048 | CR | PO Create — Storekeeper Spreadsheet UX + Coverage Days Selector | P1 |
| CR-049 | CR | PO Receive Goods — Storekeeper Spreadsheet UX | P1 |
| BUG-049 | BUG | PO Create — Wrong fallback qty ("10" instead of min_qty_alert) | P2 |

## Prioritized Backlog
- Supply real env variable values when ready (PREPROD_API_BASE_V1, PREPROD_API_BASE_V2 have defaults)
- G-035 (split payment backend gap) → **CLOSED** — new `add-purchase` endpoint supports `partial_payments[]`
- New investigation: `INVESTIGATION_20261016_ADD_PURCHASE_API.md` — add-purchase API confirmed, split payment confirmed, proxy works as-is
- 9 open questions pending owner answers before INTAKE can proceed
- **Q2 ANSWERED** — `po_coverage_days` stored via `operational-settings` API. Key pending from BE → **G-036 registered**
- ALL 9 questions answered. INTAKE can proceed with all 4 items (CR-047, CR-048, CR-049, BUG-049, G-036)
