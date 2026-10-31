# Central Inventory — Login Context and Screen Visibility Matrix

> **Document Version:** 1.0
> **Created:** January 2026
> **Author:** Senior Business Rule + UX Field Freeze Agent
> **Project:** MyGenie POS — Central Inventory Module

---

## 1. Login Context Determination

### 1.1 Login API

| Field | Value |
|---|---|
| Endpoint | `POST /api/v1/auth/vendoremployee/common-login` |
| Request | `{ "email": "...", "password": "...", "fcm_token": "..." }` |
| Response key field | `restaurant_type_flag` — determines hierarchy level |
| Token | Bearer token — all subsequent API calls use this |
| Restaurant ID | Embedded in token; scopes all data access |

### 1.2 Alternative Login (Admin)

| Field | Value |
|---|---|
| Endpoint | `POST /api/v1/auth/adminemployee/login-as-restaurant` |
| Purpose | Admin impersonates specific restaurant for testing/management |
| Request | `{ "restaurant_id": <id> }` with admin Bearer token |
| Use case | Super Admin entity switching |

### 1.3 Login Context Resolution

```
Login Response
  └── restaurant_type_flag
       ├── "master"    → Central Store User (TOP level)
       ├── "central"   → Master Store User (MIDDLE level)
       └── "franchise"  → Outlet User (BOTTOM level)
```

**CRITICAL:** Backend `restaurant_type_flag` values use inverted terminology:
- `"master"` in backend = **Central Store** in business
- `"central"` in backend = **Master Store** in business
- `"franchise"` in backend = **Outlet** in business

---

## 2. Login Context Table

| Login Context | Backend `restaurant_type_flag` | UI Label | Business Meaning | Data Scope | Default Dashboard | Can Navigate to Other Stores? | Can Switch Auth Context? | Status |
|---|---|---|---|---|---|---|---|---|
| Central User | `master` | "Central Store" | TOP — manages all | All Master stores + all Outlets + own stock | Central Dashboard (full hierarchy) | YES — navigate via `store_restaurant_id` | NO (token-bound) | **confirmed** |
| Master User | `central` | "Master Store" | MIDDLE — manages assigned Outlets | Self + own franchises + sibling centrals + sibling franchises | Master Dashboard (own outlets) | YES — navigate to visible child stores | NO (token-bound) | **confirmed** |
| Outlet User | `franchise` | "Outlet" | BOTTOM — manages own outlet | Self only; transactions incoming-only | Outlet Dashboard (own stock + requests) | NO — locked to self | NO (token-bound) | **confirmed** |
| Super Admin | `master` (via admin login) | "Central Store" (or admin badge) | All levels | All stores | Central Dashboard + admin tools | YES — via admin `login-as-restaurant` | YES (admin path only) | **confirmed** |

---

## 3. Hierarchy Visibility Rules (Server-Enforced)

| Actor Type | Backend `restaurant_type` | Can See |
|---|---|---|
| Central (backend `master`) | `master` | ALL `central` (Master) stores + ALL `franchise` (Outlet) stores |
| Master (backend `central`) | `central` | Self + own `franchise` children + sibling `central` stores + sibling `franchise` stores |
| Outlet (backend `franchise`) | `franchise` | Self ONLY; transactions incoming-only |

**Source:** `getAccessibleChildRestaurants()` in `InventoryTransferApiController` (api_implementation_status.md)

---

## 4. "Acting As" Behavior

Backend does NOT support token-based impersonation for normal users:

| Behavior | How It Works |
|---|---|
| "Acting as" another store | Pass `store_restaurant_id` to `hierarchy-detail` API to VIEW that store's data |
| Auth context | Token always maps to one `restaurant_id` — does not change |
| Write operations | Always authenticated as the token's own restaurant |
| Franchise users | Cannot "act as" any other store — locked to self |
| Store picker | Central/Master roles get a store picker populated from `data.restaurants[]` in hierarchy-detail |

---

## 5. Screen Visibility Matrix (Full)

### Legend

| Symbol | Meaning |
|---|---|
| **FULL** | Full access — all actions available |
| **READ** | Read-only — can view but not perform actions |
| **LIMITED** | Some actions hidden/restricted |
| **HIDDEN** | Screen not visible in navigation |
| **P2** | Phase 2 — not in Phase 1 |

### Matrix

| # | Screen | Central User | Master User | Outlet User | Super Admin | UX Phase | Notes |
|---|---|---|---|---|---|---|---|
| 00 | Context/Acting-as Selector | FULL (store picker) | FULL (own outlets) | READ (locked to self) | FULL | P1-Approved | Badge mapped via TERM_MAP |
| 01 | Operations Hub | FULL | FULL (filtered) | LIMITED (no approve/dispatch) | FULL | P1-Limited | KPIs pending |
| 02 | Hierarchy Summary | FULL (both tabs) | FULL (both tabs, siblings) | LIMITED (franchise tab, 1 row) | FULL | P1-Approved | Tab filters inverted |
| 03 | Store Detail | FULL (any store) | FULL (own + children) | READ (own only, incoming txns) | FULL | P1-Approved | — |
| 04 | Request Stock | HIDDEN | FULL (→Central) | FULL (→Master/Central) | FULL | P1-Limited | Central cannot request |
| 05 | Pending Queues | FULL (3 tabs) | FULL (3 tabs) | LIMITED (no Approval tab) | FULL | P1-Approved | — |
| 06 | Approve Request | FULL | FULL | HIDDEN | FULL | P1-Limited | Parent only |
| 07 | Dispatch Wizard | FULL | FULL | HIDDEN | FULL | P1-Limited | Parent only |
| 08 | Source Selector (Modal) | FULL | FULL | HIDDEN | FULL | P1-Approved | Part of dispatch |
| 09 | Transfer Detail | FULL + actions | FULL + actions | READ + Receive | FULL | P1-Approved | Actions per lifecycle |
| 10 | Receive Stock | FULL | FULL | FULL | FULL | P1-Limited | Destination only |
| 11 | Cancel / Reject | FULL (source) | FULL (source) | HIDDEN (no post-dispatch reject) | FULL | P1-Limited | See Q-XFER-006 |
| 12 | Batch/Expiry Drilldown | FULL | FULL | FULL (own store) | FULL | P1-Approved | Embedded |
| 13 | Low Stock Alerts | FULL | FULL | FULL (own store) | FULL | P1-Approved | Embedded |
| 14 | Transaction Timeline | FULL | FULL | FULL (incoming only) | FULL | P1-Approved | Franchise filter |
| 15 | Add Stock | FULL | FULL | FULL (own store) | FULL | P1-Limited | Per existing perms |
| 16 | Franchise Push | FULL | LIMITED | HIDDEN | FULL | P1-Limited | Central/master only |
| 17 | Stock Adjustment | FULL | HIDDEN | HIDDEN | FULL | P1-Blocked | Central only; API missing |
| 18 | Wastage Entry | FULL | FULL | FULL | FULL | P1-Blocked | API missing |
| 19 | Recipe Mapping | FULL | FULL | FULL | FULL | P1-Blocked | API missing |
| 20 | Reports Dashboard | FULL (cross-hierarchy) | FULL (own scope) | FULL (own scope) | FULL (cross) | P1-Limited | Cross-hierarchy: Central+Admin |
| 21 | API Verification Tool | HIDDEN | HIDDEN | HIDDEN | FULL | P1-Approved | Admin-only |
| 22 | User Permission View | P2 | P2 | P2 | P2 | P2 | — |

---

## 6. Action Permission Matrix by Login Context

### Transfer Actions

| Action | Central User | Master User | Outlet User | Condition |
|---|---|---|---|---|
| Create Direct Dispatch | YES | YES | NO | Actor must be parent of destination |
| Request Stock | NO | YES (→Central) | YES (→Master/Central) | Central is top; cannot request |
| Approve Request | YES | YES | NO | Actor = `from_restaurant_id` |
| Reject (pre-dispatch) | YES | YES | NO | Actor = source |
| Dispatch (from approved) | YES | YES | NO | Actor = source |
| Receive (full) | YES | YES | YES | Actor = `to_restaurant_id` |
| Receive (partial) | YES | YES | YES | Actor = destination |
| Cancel (post-dispatch) | YES | YES | NO | Actor = source |
| Reject (post-dispatch) | **NO** | **NO** | **NO** | DISABLED — must receive first (Q-XFER-006) |
| Edit (pre-dispatch) | YES | YES | YES | Actor = requester; resets to requested |

### Stock Actions

| Action | Central User | Master User | Outlet User | Notes |
|---|---|---|---|---|
| View Stock | YES (all stores) | YES (own + children) | YES (own only) | — |
| Add Stock | YES | YES | YES | Own store only |
| Adjust Stock | YES | NO | NO | Central ONLY (Conflict-003) |
| Record Wastage | YES | YES | YES | Any store at own level |
| Create Items | YES | NO | NO | Central ONLY (ITM-001) |
| View Cost/Value | YES | YES | Configurable | SKIP-003: C |
| View Cross-hierarchy Reports | YES | NO | NO | Q-REPORT-006: A |

---

## 7. Dashboard Content Variation

### Central Dashboard Widgets

| Widget | Data Source | API | Notes |
|---|---|---|---|
| Pending Approvals Badge | `approval_pending[].length` | `pending-queues` | From child requests |
| Pending Receives Badge | `receive_pending[].length` | `pending-queues` | Incoming to Central |
| My Requests Badge | N/A for Central | — | Central doesn't request |
| Low Stock Summary | Across hierarchy | `hierarchy-summary` / `hierarchy-detail` | Cross-store alerts |
| Store Overview | All stores summary | `hierarchy-summary` | Quick counts |
| Quick Actions | Dispatch, View Hierarchy, Reports | — | Navigation shortcuts |

### Master Dashboard Widgets

| Widget | Data Source | API | Notes |
|---|---|---|---|
| Pending Approvals Badge | `approval_pending[].length` | `pending-queues` | From Outlet requests |
| Pending Receives Badge | `receive_pending[].length` | `pending-queues` | From Central dispatches |
| My Requests Badge | `my_requests[].length` | `pending-queues` | Requests to Central |
| Low Stock (Own + Outlets) | Own store + children | `hierarchy-detail` | Filtered to own scope |
| Quick Actions | Dispatch to Outlet, Request from Central, View Outlets | — | — |

### Outlet Dashboard Widgets

| Widget | Data Source | API | Notes |
|---|---|---|---|
| Pending Receives Badge | `receive_pending[].length` | `pending-queues` | From Master/Central |
| My Requests Badge | `my_requests[].length` | `pending-queues` | Requests to parent |
| Own Stock Summary | `child_stock_summary[]` | `hierarchy-detail` | Own store only |
| Low Stock Alerts | `is_low_stock` items | `hierarchy-detail` | Own store only |
| Quick Actions | Request Stock, View Transactions | — | No Dispatch, No Approve |

---

## 8. Route Structure Recommendation

| Route | Screen | Login Context Access |
|---|---|---|
| `/` | Operations Hub (SCR-01) | All (content varies) |
| `/hierarchy` | Hierarchy Summary (SCR-02) | Central, Master, Outlet (limited) |
| `/store/:id` | Store Detail (SCR-03) | All (scoped by visibility) |
| `/request` | Request Stock (SCR-04) | Master, Outlet |
| `/queues` | Pending Queues (SCR-05) | All |
| `/transfer/:id` | Transfer Detail (SCR-09) | All |
| `/dispatch` | Dispatch Wizard (SCR-07) | Central, Master |
| `/receive/:id` | Receive Stock (SCR-10) | All (destination only) |
| `/add-stock` | Add Stock (SCR-15) | All |
| `/reports` | Reports Dashboard (SCR-20) | All (scope varies) |
| `/verify` | API Verification Tool (SCR-21) | Admin only |

---

*End of Login Context and Screen Visibility Matrix*
