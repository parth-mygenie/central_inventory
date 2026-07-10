# L5 — Env & Config Registry

> **Updated:** 2026-06-02 (Branch change to 02-june, new deploy URL)

---

## Backend Environment (`/app/backend/.env`)

| Variable | Value | Purpose | Protected? |
|----------|-------|---------|:----------:|
| `MONGO_URL` | `mongodb://localhost:27017` | Local MongoDB connection | YES |
| `DB_NAME` | `test_database` | MongoDB database name | YES |
| `CORS_ORIGINS` | `*` | CORS allowed origins | NO |
| `PREPROD_API_BASE_V1` | `https://preprod.mygenie.online/api/v1` | POS API v1 base | NO |
| `PREPROD_API_BASE_V2` | `https://preprod.mygenie.online/api/v2/vendoremployee` | POS API v2 base | NO |

## Frontend Environment (`/app/frontend/.env`)

| Variable | Value | Purpose | Protected? |
|----------|-------|---------|:----------:|
| `REACT_APP_BACKEND_URL` | `https://7d067d86-11d0-4171-9ae2-57e426a47f39.preview.emergentagent.com` | Backend API URL | YES |
| `WDS_SOCKET_PORT` | `443` | WebSocket dev server port | YES |
| `ENABLE_HEALTH_CHECK` | `false` | Health check plugin toggle | NO |

## Config History

| Date | Change | By | Reason |
|------|--------|----|----|
| 2026-05-31 | Initial registry created | Governance setup | Baseline |
| 2026-06-01 | PREPROD_API_BASE_V1/V2 added | Deployment | Moved from code defaults |
| 2026-06-01 | Test credentials moved to env vars | CR-022 | Security fix |
| 2026-06-02 | Branch changed to `02-june`, new deploy URL | Redeployment | Fresh pull from GitHub |
