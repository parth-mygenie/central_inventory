# CR-047 — Category-Scoped Forward Push (Frontend)

## Artifact 2: Impact Analysis
> **Date:** 2026-07-16
> **Code Reality:** NONE — no category-scoped push UI exists

---

### Requirement
Forward push MUST require category selection. Without selecting categories, push is not possible. Previously-pushed categories are pre-selected on re-push.

### Data Flow Trace

```
User clicks "Push" on store row
  ↓
NEW: Opens CategoryPushDialog (instead of direct push)
  ↓
api.getPushForm(childId) → baseline push-form (no category_ids)
  → data.source_entities.categories[] = all master categories [{id, name}]
  → data.child_existing.category_names[] = categories on child (string[])
  ↓
Frontend: cross-reference → pre-select matching categories
User checks/unchecks categories (≥1 required)
  ↓
OPTIONAL PREVIEW: api.getPushForm(childId, {categoryIds}) → category_selection_preview
  → resolved_counts, resolved_names
  ↓
User clicks "Push Selected Categories"
  ↓
api.pushBundle(childId, {categoryIds}) → POST with category_ids[]
  → results + _selection.resolved_counts
  ↓
Show push results → close dialog → refresh push status
```

### Affected Files

| # | File | Change | Risk |
|---|------|--------|:----:|
| 1 | `frontend/src/services/api.js` | `getPushForm`: add optional `categoryIds` param; `pushBundle`: accept `categoryIds` | LOW |
| 2 | `frontend/src/hooks/useHierarchyManagement.js` | `executePush`: pass categoryIds to api; add `categoryPreview` state | LOW |
| 3 | `frontend/src/components/central-inventory/StoreManagement.jsx` | Replace direct push with CategoryPushDialog; category multi-select + preview + pre-selection | MEDIUM |

### Conflict Pre-Check
- `api.js` — HIGH-RISK file but changes are additive (new optional params). No conflict with CR-037→044.
- `StoreManagement.jsx` — last modified by BUG-040 (indirect outlet label) + CR-043 (CatalogPolicyCard) + G-031 (push timer). No overlap with category selection logic.
- `useHierarchyManagement.js` — last modified by G-031 (409 handling). No overlap.

### Downstream Consumers
- `handlePush()` in StoreManagement.jsx — CHANGED (now goes through dialog)
- `handleCreateAndPush()` in StoreManagement.jsx — also uses pushBundle. Decision: **for new stores, default to full bundle push (no category filter)** or force category selection too. Per owner's instruction ("without selecting categories it's not possible"), create-and-push should also go through category selection.

---

## Artifact 3: Implementation Plan

### Scope Lock
**Files WILL change:** `api.js`, `useHierarchyManagement.js`, `StoreManagement.jsx`
**Files will NOT touch:** `terminology.js`, `screenVisibility.js`, `server.py`, `ReversePushWizardDialog.jsx`

---

### Edit 1: api.js — getPushForm with optional categoryIds

**File:** `frontend/src/services/api.js`
**Current (line 949-951):**
```javascript
function getPushForm(childId) {
  return client.get(`/proxy/v2/franchise/push-form/${childId}`);
}
```

**New:**
```javascript
// CR-047 — optional category_ids for preview
function getPushForm(childId, { categoryIds } = {}) {
  const params = {};
  if (Array.isArray(categoryIds) && categoryIds.length > 0) {
    params.category_ids = categoryIds.join(",");
  }
  return client.get(`/proxy/v2/franchise/push-form/${childId}`, { params });
}
```

**Verification:** curl with `?category_ids=8381,8395` should return `category_selection_preview`.

---

### Edit 2: api.js — pushBundle with category_ids

**File:** `frontend/src/services/api.js`
**Current (line 954-956):**
```javascript
function pushBundle(childId) {
  return client.post(`/proxy/v2/franchise/push/${childId}`, { push_food_bundle: true }, { timeout: 100000 });
}
```

**New:**
```javascript
// CR-047 — mandatory category_ids for category-scoped push
function pushBundle(childId, { categoryIds } = {}) {
  const body = { push_food_bundle: true };
  if (Array.isArray(categoryIds) && categoryIds.length > 0) {
    body.category_ids = categoryIds;
  }
  return client.post(`/proxy/v2/franchise/push/${childId}`, body, { timeout: 100000 });
}
```

**Verification:** POST body includes `category_ids` array.

---

### Edit 3: useHierarchyManagement.js — executePush with categoryIds

**File:** `frontend/src/hooks/useHierarchyManagement.js`
**Current (line 108):**
```javascript
const executePush = useCallback(async (childId) => {
```

**New:**
```javascript
const executePush = useCallback(async (childId, { categoryIds } = {}) => {
```

**And line 112:**
```javascript
const resp = await api.pushBundle(childId, { categoryIds });
```

**Verification:** executePush passes categoryIds through to API.

---

### Edit 4: StoreManagement.jsx — CategoryPushDialog

**Major change**: Replace the inline `handlePush(childId)` (which directly calls `api.pushBundle`) with a dialog-based flow.

**New component: `CategoryPushDialog`** (inline in StoreManagement.jsx)

Props: `{ open, onClose, childId, childName, onPushComplete }`

**Behavior:**
1. On open: calls `api.getPushForm(childId)` (no category_ids) to get baseline
2. Extracts `source_entities.categories[]` and `child_existing.category_names[]`
3. Pre-selects categories where `source_cat.name ∈ child_existing.category_names` (case-insensitive, trimmed)
4. Shows category checklist with checkboxes (Select All / Deselect All)
5. When selection changes: optionally fetch preview via `api.getPushForm(childId, {categoryIds})` — show `category_selection_preview.resolved_counts`
6. Push button: enabled only when ≥1 category selected
7. On push: calls `api.pushBundle(childId, {categoryIds})` → shows results → closes

**Push button label:** "Push {N} Categories" (with count)

**For create-and-push flow:** After create, show same category selection before pushing (or push full bundle for first-time stores — owner decision needed).

---

### Edit 5: StoreManagement.jsx — Wire handlePush to open dialog

**Current:**
```javascript
const handlePush = async (childId) => {
  setPushing(childId);
  try {
    await api.pushBundle(childId);
    ...
  }
};
```

**New:**
```javascript
const [pushDialogTarget, setPushDialogTarget] = useState(null);

const handlePush = (childId) => {
  const child = children.find(c => c.id === childId);
  setPushDialogTarget(child || { id: childId, name: `Store #${childId}` });
};
```

The actual push execution moves into `CategoryPushDialog.onPushComplete`.

---

### Verification Matrix

| # | Edit | File | How to Verify | Automated? |
|---|------|------|---------------|:---:|
| 1 | getPushForm accepts categoryIds | api.js | curl push-form with category_ids query | NO |
| 2 | pushBundle accepts categoryIds | api.js | curl push with category_ids body | NO |
| 3 | executePush passes categoryIds | hook | Trace via React DevTools or browser test | NO |
| 4 | Push button opens dialog | StoreManagement | Browser: click Push → dialog appears | NO |
| 5 | Categories pre-selected | StoreManagement | Browser: previously-pushed cats are checked | NO |
| 6 | Push disabled without selection | StoreManagement | Browser: uncheck all → button disabled | NO |
| 7 | Preview shows resolved counts | StoreManagement | Browser: check cats → counts update | NO |
| 8 | Push executes with category_ids | StoreManagement | Browser: push → check Network tab body | NO |
| 9 | Push results display | StoreManagement | Browser: results shown in dialog | NO |
| 10 | Create-and-push flow | StoreManagement | Browser: create store → category selection | NO |

### Open Questions for Owner
1. **Create-and-push flow:** Should new stores also require category selection before first push, or should the create wizard auto-push full bundle? (Current plan: also require category selection since "without selecting categories it's not possible")
2. **Preview fetch:** Should the preview auto-fetch on category change (adds API call per toggle), or should there be a "Preview" button? (Current plan: auto-fetch with 500ms debounce)

### Post-Code Registry Checklist
- [ ] registry.json: CR-047 → status: IMPLEMENTED
- [ ] L3: row updated
- [ ] L7: StoreManagement.jsx, api.js, useHierarchyManagement.js listed
- [ ] Code markers: // CR-047 in every modified file
- [ ] Dashboard drift check: PASS
