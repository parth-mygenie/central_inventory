# P23 — Hierarchy Management (Create / View / Bundle Push) — API Validation + Frontend Planning

> **Status:** PLANNING + API VALIDATION — no code changes
> **Author:** E1 agent, 29 May 2026
> **API validation:** 24 probes against live POS API (preprod.mygenie.online)
> **Actors:** Master (rid=1), Central (rid=782), Franchise (rid=784)

---

## 0. API Validation Summary (29 May 2026)

### Endpoints Confirmed

| Endpoint | Method | Status |
|----------|--------|--------|
| `/franchise/list` | GET | **WORKING** |
| `/franchise/create` | GET | **WORKING** (form schema) |
| `/franchise/create` | POST | **WORKING** |
| `/franchise/push-form/{id}` | GET | **WORKING** |
| `/franchise/push/{id}` | POST | **WORKING** |
| `/franchise/history` | POST | **WORKING** |

---

## 1. Hierarchy List — GET /franchise/list

### Probe Results

| # | Actor | Params | HTTP | Children | Relationship | Notes |
|---|-------|--------|:---:|:---:|:---:|-------|
| H1 | Master | default | 200 | 4 | hierarchy_children | 3 central + 1 franchise (all direct children) |
| H2 | Master | child_type=central | 200 | 3 | master_to_central | Filtered to central only |
| H3 | Master | child_type=franchise | 200 | 1 | — | Only DIRECT franchise under master (not grandchildren) |
| H4 | Central | default | 200 | 3 | central_to_franchise | Only franchise children of this central |
| H5 | Franchise | default | — | — | — | `success:false`, "not allowed to manage hierarchy children" |
| H6 | Master | limit=50 | 200 | 4 | hierarchy_children | Pagination works |

### Response Shape

```json
{
  "success": true,
  "message": "Hierarchy children fetched successfully",
  "data": {
    "parent": {
      "id": 1,
      "name": "My Genie",
      "restaurant_type_flag": "master",
      "parent_restaurant_id": null
    },
    "allowed_child_types": ["central", "franchise"],
    "relationship": "hierarchy_children",
    "children": [
      {
        "id": 782,
        "name": "DemoCentral2",
        "phone": "9000000002",
        "email": "owner@democentral2.com",
        "address": "Demo Central Store 2, City",
        "status": 1,
        "active": true,
        "restaurant_type_flag": "central",
        "parent_restaurant_id": 1,
        "slug": "democentral2",
        "created_at": "2026-05-18T12:34:00.000000Z",
        "vendor": {
          "id": 805,
          "f_name": "DemoCentral2",
          "email": "owner@democentral2.com",
          "phone": "9000000002"
        }
      }
    ]
  },
  "meta": {
    "current_page": 1,
    "last_page": 1,
    "per_page": 25,
    "total": 2
  }
}
```

### Key Field Observations

| Field | Type | Notes |
|-------|------|-------|
| `data.parent` | object | Actor's own restaurant context |
| `data.allowed_child_types` | string[] | Master: `["central","franchise"]`, Central: `["franchise"]` |
| `data.relationship` | string | `"hierarchy_children"` (default), `"master_to_central"` (filtered), `"central_to_franchise"` |
| `data.children[]` | array | Full restaurant objects with 100+ fields each |
| `data.children[].vendor` | object | Login credentials owner: `{id, f_name, l_name, email, phone}` |
| `data.children[].restaurant_type_flag` | string | `"central"` or `"franchise"` |
| `meta` | object | Standard pagination: `{current_page, last_page, per_page, total}` |

### Relationship Values Matrix

| Actor | Default | child_type=central | child_type=franchise |
|-------|---------|--------------------|----------------------|
| Master | `hierarchy_children` | `master_to_central` | — (still hierarchy_children) |
| Central | `central_to_franchise` | N/A | N/A |
| Franchise | FORBIDDEN | FORBIDDEN | FORBIDDEN |

### Critical: Child objects are MASSIVE (~150 fields each)
Frontend MUST extract only needed fields at normalization layer. Do NOT pass raw objects to components.

---

## 2. Create Hierarchy — GET + POST /franchise/create

### Probe Results

| # | Actor | Action | HTTP | Result |
|---|-------|--------|:---:|-------|
| C1 | Master | GET form | 200 | child_type defaults to "central", allowed: [central, franchise] |
| C2 | Central | GET form | 200 | child_type: "franchise", allowed: [franchise] only |
| C3 | Franchise | GET form | **403** | "not allowed to create hierarchy children" |
| C4 | Master | GET ?child_type=franchise | 200 | **Ignores param** — still returns child_type: "central" |
| C5 | Master | POST empty body | **422** | Required: name, phone, email, password, address |
| C6 | Master | POST → central | **201** | "Central created successfully" — child.id=787 |
| C7 | Master | POST → franchise | **201** | "Franchise created successfully" — child.id=788, parent=1 |
| C8 | Central | POST → franchise | **201** | "Franchise created successfully" — child.id=789, parent=782 |
| C9 | Master | POST duplicate email | **422** | `{errors: {email: ["The email has already been taken."]}}` |
| C10 | Central | POST → central | **422** | `{errors: {child_type: ["The selected child type is invalid."]}}` |

### GET /franchise/create Response Shape

```json
{
  "success": true,
  "message": "Create metadata fetched successfully",
  "data": {
    "parent": {
      "id": 1,
      "name": "My Genie",
      "restaurant_type_flag": "master",
      "parent_restaurant_id": null
    },
    "allowed_child_types": ["central", "franchise"],
    "child_type": "central",
    "available_entities": {
      "categories": 2,
      "foods": 3,
      "addons": 1,
      "ingredients": 4,
      "sub_recipes": 0,
      "recipes": 3,
      "roles": 12,
      "employees": 47
    }
  }
}
```

### POST /franchise/create Request & Response

**Required fields:**
| Field | Type | Validation |
|-------|------|------------|
| `name` | string | Required |
| `email` | string | Required, unique |
| `phone` | string | Required |
| `password` | string | Required |
| `address` | string | Required |
| `child_type` | string | Optional — defaults per actor. Master→"central", Central→"franchise" |

**Success response (201):**
```json
{
  "success": true,
  "message": "Central created successfully",
  "data": {
    "parent": { "id": 1, "name": "My Genie", "restaurant_type_flag": "master" },
    "child": { "id": 787, "name": "TestCentral", "restaurant_type_flag": "central", "parent_restaurant_id": 1 },
    "vendor_id": 810
  }
}
```

### Create Permission Matrix

| Actor | → central | → franchise |
|-------|:---------:|:-----------:|
| Master | **YES** | **YES** (direct) |
| Central | **NO** (422) | **YES** |
| Franchise | **NO** (403) | **NO** (403) |

### Validation Error Shape (422)

```json
{
  "success": false,
  "errors": {
    "email": ["The email has already been taken."],
    "name": ["The name field is required."]
  }
}
```

---

## 3. Bundle Push — GET push-form + POST push

### Probe Results

| # | Actor | Target | Action | HTTP | Result |
|---|-------|--------|--------|:---:|-------|
| B1 | Master | 782 (DemoCentral2) | GET push-form | 200 | source_entities with all module counts |
| B2 | Master | 787 (TestCentral) | GET push-form | 200 | Same source entities |
| B3 | Master | 787 | POST without flag | **422** | `BUNDLE_ONLY_PUSH` error |
| B4 | Master | 787 | POST push_food_bundle=true | **200** | Full push results with diagnostics |
| B5 | Master | 786 (non-direct child) | POST push | **404** | "Child restaurant not found" |
| B6 | Franchise | 782 | GET push-form | **403** | "Forbidden hierarchy action" |
| B7 | Central | 785 (own child) | POST push | **200** | Updated counts (re-push) |

### GET /franchise/push-form/{id} Response Shape

```json
{
  "success": true,
  "message": "Push form data fetched successfully",
  "data": {
    "parent": { "id": 1, "name": "My Genie", "restaurant_type_flag": "master" },
    "child": { "id": 782, "name": "DemoCentral2", "restaurant_type_flag": "central" },
    "source_entities": {
      "categories": [ { "id": 7740, "name": "toast", "image": "def.png", ... } ],
      "foods": [ { "id": 202575, "name": "aloo parantha", "price": "101.00", "category_id": 7740 } ],
      "addons": [ { "id": 12625, "name": "rossa", "price": "50.00", ... } ],
      "ingredients": [ { "id": 16980, "stock_title": "Cooking Oil", "unit": "ltr" } ],
      "sub_recipes": [],
      "recipes": [ { "id": 8549, "name": "aloo parantha" } ],
      "roles": [ { "id": 1, "name": "KDS", "parent_role": "STATION", ... } ]
    }
  }
}
```

### POST /franchise/push/{id} Response Shape

```json
{
  "success": true,
  "message": "Push completed successfully",
  "data": {
    "parent": { "id": 1, "name": "My Genie" },
    "child": { "id": 787, "name": "TestCentral_P23_Probe" },
    "results": {
      "categories": { "inserted": 2, "updated": 0, "failed": 0, "warnings": 0 },
      "stock_item_categories": { "inserted": 2, "updated": 0, "failed": 0, "warnings": 0 },
      "addons": { "inserted": 1, "updated": 0, "failed": 0, "warnings": 0 },
      "sub_recipes": { "inserted": 0, "updated": 0, "failed": 0, "note": "No source records found" },
      "ingredients": { "inserted": 4, "updated": 0, "failed": 0, "warnings": 0 },
      "stock_items": { "inserted": 18, "updated": 0, "failed": 0, "warnings": 0 },
      "foods": { "inserted": 3, "updated": 0, "failed": 0, "warnings": 0 },
      "recipes": { "inserted": 3, "updated": 0, "failed": 0, "warnings": 0 },
      "_audit": { "table": "central_push_log", "enabled": true },
      "_diagnostics": {
        "warning_total": 0,
        "warning_by_module": [],
        "link_repair": {
          "fixed_recipe_addon_id": 0,
          "fixed_addon_recipe_id": 1,
          "fixed_inventory_category_id": 0,
          "fixed_food_recipe_id": 2
        }
      }
    }
  }
}
```

### Push Module Result Structure

Each module in `results`:
| Field | Type | Notes |
|-------|------|-------|
| `inserted` | number | New entities created in child |
| `updated` | number | Existing entities updated (re-push) |
| `failed` | number | Entities that failed to sync |
| `warnings` | number | Non-fatal issues (optional) |
| `note` | string | Optional — e.g., "No source records found" |

### Diagnostics Payload

| Field | Notes |
|-------|-------|
| `_audit.table` | Always `"central_push_log"` |
| `_audit.enabled` | Always `true` |
| `_diagnostics.warning_total` | Total cross-module warnings |
| `_diagnostics.warning_by_module` | Array of per-module warning details |
| `_diagnostics.link_repair` | Auto-fixed cross-entity references |

### Push Permission Matrix

| Actor | → direct central | → direct franchise | → non-direct child |
|-------|:----------------:|:------------------:|:------------------:|
| Master | **YES** | **YES** | **NO** (404) |
| Central | N/A | **YES** (own children) | **NO** (404) |
| Franchise | **NO** (403) | **NO** (403) | **NO** (403) |

---

## 4. History — POST /franchise/history

### Probe Results

| # | Actor | Params | HTTP | Logs | Notes |
|---|-------|--------|:---:|:---:|-------|
| HI1 | Master | default | 200 | 59 | Full push log, per_page=50 default |
| HI2 | Master | limit=5, page=1 | 200 | 5 | Pagination works: last_page=12, total=59 |
| HI3 | Central | default | 200 | 39 | Only this central's push operations |
| HI4 | Franchise | default | **403** | — | "not allowed to view hierarchy push history" |

### Response Shape

```json
{
  "success": true,
  "message": "Push history fetched successfully",
  "data": {
    "parent": { "id": 1, "name": "My Genie", "restaurant_type_flag": "master" },
    "allowed_child_types": ["central", "franchise"],
    "relationship": "hierarchy_children",
    "logs": [
      {
        "id": 111,
        "parent_restaurant_id": 1,
        "child_restaurant_id": 787,
        "entity_type": "recipes",
        "source_entity_id": 8551,
        "target_entity_id": 8572,
        "action": "inserted",
        "pushed_by": 300,
        "status": "success",
        "notes": "api_v2_push",
        "created_at": "2026-05-29 17:19:29"
      }
    ]
  },
  "meta": {
    "current_page": 1,
    "last_page": 12,
    "per_page": 5,
    "total": 59
  }
}
```

### Log Entry Fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | number | Auto-increment log ID |
| `parent_restaurant_id` | number | Who pushed |
| `child_restaurant_id` | number | Who received |
| `entity_type` | string | `"recipes"`, `"food"`, `"stock_item"`, `"ingredients"`, `"categories"`, `"stock_item_categories"`, `"addons"` |
| `source_entity_id` | number | ID in parent store |
| `target_entity_id` | number | ID in child store (post-push) |
| `action` | string | `"inserted"` or `"updated"` |
| `pushed_by` | number | Vendor/employee ID who triggered push |
| `status` | string | `"success"` observed |
| `notes` | string | `"api_v2_push"` observed |
| `created_at` | string | `"YYYY-MM-DD HH:MM:SS"` format |

---

## 5. Normalization Requirements

### Child Object Extraction (franchise/list)

Children objects have ~150 fields. Extract only:
```js
function normalizeChild(raw) {
  return {
    id: raw.id,
    name: raw.name,
    phone: raw.phone,
    email: raw.email,
    address: raw.address,
    status: raw.status,
    active: raw.active,
    restaurantTypeFlag: raw.restaurant_type_flag,
    parentRestaurantId: raw.parent_restaurant_id,
    slug: raw.slug,
    createdAt: raw.created_at,
    vendor: raw.vendor ? {
      id: raw.vendor.id,
      name: raw.vendor.f_name,
      email: raw.vendor.email,
      phone: raw.vendor.phone,
    } : null,
  };
}
```

### Push Preview Source Entities

Source entities vary by module. Key fields per module:
- **categories**: `id, name`
- **foods**: `id, name, price, category_id`
- **addons**: `id, name, price`
- **ingredients**: `id, stock_title, unit`
- **recipes**: `id, name`
- **sub_recipes**: `id, name`
- **roles**: `id, name, parent_role`

### Push Results Normalization

```js
function normalizePushResults(results) {
  const modules = {};
  const diagnostics = results._diagnostics || {};
  const audit = results._audit || {};
  
  for (const [key, val] of Object.entries(results)) {
    if (key.startsWith('_')) continue;
    modules[key] = {
      inserted: val.inserted || 0,
      updated: val.updated || 0,
      failed: val.failed || 0,
      warnings: val.warnings || 0,
      note: val.note || null,
    };
  }
  
  return { modules, diagnostics, audit };
}
```

---

## 6. Component Architecture

### Route Map

```js
<Route path="/hierarchy/manage" element={<HierarchyManagement />} />
```

### Component Map

```
/hierarchy/manage
  └── HierarchyManagement.jsx
        ├── HierarchyList               — children table with type tabs
        │     ├── ChildRow              — per-child: name, type badge, actions
        │     └── EmptyChildState       — "No [type] stores yet"
        ├── CreateChildDialog           — modal form: name, email, phone, password, address, child_type
        │     └── EntityPreview         — shows available_entities counts
        ├── BundlePushDialog            — push wizard: preview → confirm → results
        │     ├── PushPreview           — source_entities summary by module
        │     ├── PushConfirmation      — "Push X items to [child]?"
        │     └── PushResults           — per-module inserted/updated/failed + diagnostics
        └── PushHistorySection          — collapsible history table with pagination
              └── HistoryRow            — entity_type, action, child, timestamp
```

### Hook Architecture

```js
// hooks/useHierarchyManagement.js
function useHierarchyManagement() {
  // State: children list, create metadata, push form, push results, history
  // Fetches: GET /franchise/list, GET /franchise/create, GET /franchise/push-form/{id}
  // Mutations: POST /franchise/create, POST /franchise/push/{id}
  // Returns: { children, createMeta, pushForm, pushResults, history, loading, error, ... }
}
```

### API Layer Additions

```js
// api.js additions
getHierarchyList({ childType, limit, page })       // GET /franchise/list
getCreateMetadata()                                   // GET /franchise/create
createChild({ name, email, phone, password, address, childType })  // POST /franchise/create
getPushForm(childId)                                  // GET /franchise/push-form/{id}
pushBundle(childId)                                   // POST /franchise/push/{id}
getHierarchyHistory({ limit, page })                 // POST /franchise/history
```

---

## 7. UX Design

### 7.1 Hierarchy List (Primary View)

```
┌─────────────────────────────────────────────────────────────────┐
│ Hierarchy Management                           [+ Create Store] │
│                                                                 │
│ [All Children] [Master Stores] [Outlets]   (type tabs)          │
│                                                                 │
│ ┌──────────┬──────────┬──────────┬──────────┬──────────────────┐│
│ │ Name     │ Type     │ Email    │ Created  │ Actions          ││
│ ├──────────┼──────────┼──────────┼──────────┼──────────────────┤│
│ │ DemoC1   │ ▪Master  │ owner@.. │ 18 May   │ [Push] [View]   ││
│ │ DemoC2   │ ▪Master  │ owner@.. │ 18 May   │ [Push] [View]   ││
│ └──────────┴──────────┴──────────┴──────────┴──────────────────┘│
│                                                                 │
│ ▸ Push History (59 records)                                     │
└─────────────────────────────────────────────────────────────────┘
```

**Type tabs:**
- "All Children" → no child_type filter
- "Master Stores" → child_type=central (terminology inverted)
- "Outlets" → child_type=franchise

**Action buttons per child:**
- **Push** → opens BundlePushDialog
- **View** → navigates to /store/{id} (existing page)

### 7.2 Create Child Dialog

```
┌──────────────────────────────────────────────┐
│ Create New [Central ▼ | Outlet]              │
│                                              │
│ Store Name    [_________________________]    │
│ Email         [_________________________]    │
│ Phone         [_________________________]    │
│ Address       [_________________________]    │
│ Password      [_________________________]    │
│                                              │
│ Available in parent: 2 categories, 3 foods,  │
│ 1 addon, 4 ingredients, 3 recipes            │
│ (Will be pushed after creation)              │
│                                              │
│              [Cancel]  [Create Store]        │
└──────────────────────────────────────────────┘
```

- **child_type selector**: Master sees [Central | Outlet], Central sees [Outlet] only
- **available_entities**: Read-only preview from GET /franchise/create
- **Post-create**: Show success → offer to push bundle immediately

### 7.3 Bundle Push Dialog (3-step wizard)

**Step 1 — Preview:**
```
┌──────────────────────────────────────────────┐
│ Push Bundle → DemoCentral2                   │
│                                              │
│ From: My Genie (Central Store)               │
│ To:   DemoCentral2 (Master Store)            │
│                                              │
│ ┌── Source Entities ────────────────────────┐ │
│ │ Categories    2                           │ │
│ │ Foods         3                           │ │
│ │ Addons        1                           │ │
│ │ Ingredients   4                           │ │
│ │ Recipes       3                           │ │
│ │ Sub-recipes   0                           │ │
│ └───────────────────────────────────────────┘ │
│                                              │
│              [Cancel]  [Push Now →]          │
└──────────────────────────────────────────────┘
```

**Step 2 — Confirmation:**
```
┌──────────────────────────────────────────────┐
│ ⚠ Confirm Push                               │
│                                              │
│ This will sync all categories, foods,        │
│ addons, ingredients, and recipes from        │
│ My Genie to DemoCentral2.                   │
│                                              │
│ Existing items will be updated.              │
│ New items will be created.                   │
│                                              │
│              [Back]  [Confirm Push]          │
└──────────────────────────────────────────────┘
```

**Step 3 — Results:**
```
┌──────────────────────────────────────────────┐
│ ✓ Push Complete                              │
│                                              │
│ Module           Inserted  Updated  Failed   │
│ ─────────────────────────────────────────── │
│ Categories            2        0       0     │
│ Ingredients           4        0       0     │
│ Stock Items          18        0       0     │
│ Foods                 3        0       0     │
│ Addons                1        0       0     │
│ Recipes               3        0       0     │
│                                              │
│ Diagnostics:                                 │
│   Warnings: 0                                │
│   Link repairs: addon→recipe:1, food→recipe:2│
│                                              │
│              [Done]                          │
└──────────────────────────────────────────────┘
```

### 7.4 Push History Table

```
┌─────────────────────────────────────────────────────────────────┐
│ ▼ Push History (59 records)                 [← Prev] [Next →]  │
│                                                                 │
│ ┌──────────┬──────────┬──────────┬──────────┬──────────────────┐│
│ │ Time     │ Target   │ Type     │ Action   │ Entity           ││
│ ├──────────┼──────────┼──────────┼──────────┼──────────────────┤│
│ │ 29 May   │ TestC... │ recipes  │ inserted │ 8551 → 8572      ││
│ │ 17:19    │          │          │          │                  ││
│ │ 29 May   │ TestC... │ food     │ inserted │ 202591 → 202594  ││
│ │ 17:19    │          │          │          │                  ││
│ └──────────┴──────────┴──────────┴──────────┴──────────────────┘│
│                                              Page 1 of 12      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Visibility Rules

| Element | Master | Central | Franchise |
|---------|:------:|:-------:|:---------:|
| Hierarchy page | **visible** | **visible** | **hidden** |
| Child list | **visible** | **visible** | hidden |
| Create button | **visible** | **visible** | hidden |
| child_type selector | **both** (central/franchise) | **franchise only** | hidden |
| Push button | **visible** (direct children) | **visible** (direct children) | hidden |
| Push history | **visible** | **visible** | hidden |

**Screen visibility:**
```js
"scr-hierarchy-manage": { master: FULL, central: FULL, franchise: HIDDEN }
```

---

## 9. Risk Analysis

| Risk | Severity | Mitigation |
|------|----------|------------|
| Child objects are ~150 fields each — bandwidth/memory | **HIGH** | Normalize at API layer, extract only 10-12 needed fields |
| Push is destructive (creates/updates entities in child) | **HIGH** | 3-step wizard with confirmation dialog, no auto-push |
| Push to non-direct child returns 404 (not 403) | MEDIUM | Only show Push button for direct children from list |
| GET /franchise/create ignores child_type query param | LOW | Use POST child_type field instead; pre-select based on allowed_child_types |
| Duplicate email on create returns 422 with field errors | LOW | Standard form validation with inline error display |
| History logs are per-entity-row (not per-push-session) | MEDIUM | Group logs by child_restaurant_id + created_at for session view |
| Central cannot create central (422 invalid child_type) | LOW | Hide "Central" option in child_type selector for central actors |
| Password field required on create | MEDIUM | Clear UX: this creates a login for the new store owner |
| Push results may show `_audit` and `_diagnostics` with nested link_repair | LOW | Parse and display in dedicated diagnostics section |
| No child deletion API discovered | LOW | Omit delete from Phase 1; investigate separately |

---

## 10. Implementation Plan

### Phase 1: Hierarchy Management (~5-6h)

**Scope:** Hierarchy list page + child creation dialog + role-aware visibility
**Files:**
- `HierarchyManagement.jsx` — main page
- `useHierarchyManagement.js` — hook
- `api.js` — add getHierarchyList, getCreateMetadata, createChild
- `screenVisibility.js` — add scr-hierarchy-manage (HIDDEN for franchise)
- `App.js` — add route /hierarchy/manage
- Sidebar — add nav item

**Risk:** LOW — new page, additive only, no existing flow changes

### Phase 2: Bundle Push (~4-5h)

**Scope:** Push wizard (preview → confirm → results), diagnostics display
**Files:**
- Enhance `HierarchyManagement.jsx` with BundlePushDialog
- `api.js` — add getPushForm, pushBundle
- Push results viewer with per-module breakdown

**Risk:** MEDIUM — push is a write operation that creates entities. Confirmation dialog is critical safety gate.

### Phase 3: History (~2-3h)

**Scope:** Push history table with pagination, search/filter
**Files:**
- Enhance `HierarchyManagement.jsx` with PushHistorySection
- `api.js` — update getHierarchyHistory (already exists as getFranchiseHistory)
- Pagination controls, entity_type grouping

**Risk:** LOW — read-only display

**Total: ~11-14h, 3 phases.**

### Rollout Order

1. **Phase 1 first** — establishes the page and list view, no write risk
2. **Phase 2 second** — push functionality with safety gates
3. **Phase 3 last** — history is read-only, lowest priority

---

## 11. Open Questions

1. **Should the new page replace /hierarchy or live alongside it?**
   Recommendation: Alongside — `/hierarchy` is the summary view, `/hierarchy/manage` is the admin view.

2. **Post-create auto-push?**
   Recommendation: Offer a "Push bundle now?" button in create success state, but don't auto-push.

3. **History grouping: per-entity or per-push-session?**
   Recommendation: Group by `child_restaurant_id + created_at` (same timestamp = same push session) for readability. Individual entity rows available on expand.

4. **Delete/deactivate child?**
   Recommendation: Defer — no delete API discovered in probing. Investigate in Phase 4.

5. **Employee/role push modules?**
   Recommendation: Show in preview (source_entities.roles shows 12 roles) but clarify that `push_food_bundle` only pushes food-related entities. Role push may need separate flag.
