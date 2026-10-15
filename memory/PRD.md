# Central Inventory — PRD

## Original Problem Statement
Deploy the existing React frontend repo directly into `/app` and run it as-is, with no code edits.
- Repo: https://github.com/parth-mygenie/central_inventory.git
- Branch: 7-8-26
- Destination: `/app` (repo contents pulled directly into `/app`, not a subfolder)
- Platform files preserved during clear-and-clone
- No code edits — deployed and run as-is

## Architecture
- **Frontend:** React 19 + CRACO + Tailwind CSS 3 + Radix UI + React Router DOM 7 + Recharts + Axios
- **Backend:** FastAPI + Motor (async MongoDB) + httpx (proxy to preprod POS API) + Pydantic v2 + Uvicorn
- **Database:** MongoDB (local, MONGO_URL from .env)
- **External API:** preprod.mygenie.online (POS API proxy)

## Deployment History

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

## Prioritized Backlog
- Supply real env variable values when ready (PREPROD_API_BASE_V1, PREPROD_API_BASE_V2 have defaults)
