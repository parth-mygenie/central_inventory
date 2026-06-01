# L5 — Env & Config Registry

> **Updated:** 2026-06-01 (Session closing)

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
| `REACT_APP_BACKEND_URL` | `https://api-sync-staging.preview.emergentagent.com` | Backend API URL | YES |
| `WDS_SOCKET_PORT` | `443` | WebSocket dev server port | YES |
| `ENABLE_HEALTH_CHECK` | `false` | Health check plugin toggle | NO |

## Test Environment Variables (for pytest)

| Variable | Purpose | Where Used |
|----------|---------|-----------|
| `TEST_PASSWORD` | Shared test password | All test files in `backend/tests/` |
| `TEST_MASTER_EMAIL` | Central store test email | test_p17, test_p21, etc. |
| `TEST_CENTRAL_EMAIL` | Master store test email | test_p12, test_p17, etc. |
| `TEST_FRANCHISE_EMAIL` | Outlet test email | test_p12, test_p17, etc. |

**Note:** Test credentials were moved from hardcoded values to environment variables as part of CR-022 security fixes.

## Config History

| Date | Change | By | Reason |
|------|--------|----|----|
| 2026-05-31 | Initial registry created | Governance setup | Baseline |
| 2026-06-01 | PREPROD_API_BASE_V1/V2 added to backend .env | Deployment | Moved from code defaults |
| 2026-06-01 | Frontend .env updated for deploy-workflow-14 | Platform | New preview URL |
| 2026-06-01 | Test credentials moved to env vars | CR-022 | Security fix |
| 2026-06-01 | Redeployed on `deploy-inventory` — new preview URL | CR-023 | Code pulled from `01-june` branch |
| 2026-06-01 | Backend proxy fix: DELETE method now forwards JSON body | CR-023 | `server.py` line 155 — `http.request("DELETE", ...)` with json param |
