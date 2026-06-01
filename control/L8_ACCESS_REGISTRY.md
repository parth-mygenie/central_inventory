# L8 — Access Registry (Test Accounts & Credentials)

> **Rule:** Updated on credential rotation or new account creation.
> **Note:** References only. No raw secrets.

---

## Test Accounts (POS Preprod)

| Email | Password | API Type | RID | Business Label | Hierarchy |
|-------|----------|----------|:---:|----------------|:---------:|
| `abhishek@kalabahia.com` | `Qplazm@10` | master | 1 | Central Store | TOP |
| `killua@zoldyck.com` | `Qplazm@10` | master | 1 | Central Store | TOP |
| `owner@democentral1.com` | `Qplazm@10` | central | 781 | Master Store (Demo 1) | MIDDLE |
| `owner@democentral2.com` | `Qplazm@10` | central | 782 | Master Store (Demo 2) | MIDDLE |
| `owner@demofranchise1.com` | `Qplazm@10` | franchise | 783 | Outlet (Demo 1) | BOTTOM |
| `owner@demofranchise2.com` | `Qplazm@10` | franchise | 784 | Outlet (Demo 2) | BOTTOM |
| `owner@demofranchise3.com` | `Qplazm@10` | franchise | 785 | Outlet (Demo 3) | BOTTOM |
| `owner@demofranchise4.com` | `Qplazm@10` | franchise | 786 | Outlet (Demo 4) | BOTTOM |

## API Endpoints

| Service | URL | Auth |
|---------|-----|------|
| POS API v1 | `https://preprod.mygenie.online/api/v1` | Bearer token from login |
| POS API v2 | `https://preprod.mygenie.online/api/v2/vendoremployee` | Bearer token from login |
| Proxy (local) | `http://localhost:8001/api/proxy/v2/{path}` | Pass-through |
| Login proxy | `POST /api/proxy/auth/login` | Email + password |

## Test Entities (Created During API Probing)

| Entity IDs | Created During | Status |
|------------|---------------|--------|
| 787, 788, 789 | P23 hierarchy probing | Still in preprod. Cleanup needed (BUG-014). |
