# CR-032 — Store Management UX Freeze

> **Date:** 2026-06-13
> **Status:** FROZEN — Owner approved
> **Scope:** Store Management screen (`/store-management`)
> **Pattern:** Full-width expandable rows (Pattern B — like Raw Material Master)

---

## Layout: Full-Width Table + Expandable Row Detail + Inline Add

### Structure
```
┌──────────────────────────────────────────────────────────────────────┐
│ Store Management                                                     │
│                                                                      │
│ [All 5] [Master 3] [Outlet 2]   [Search...]         [+ Create Store]│
│                                                                      │
│ ┌── INLINE ADD FORM (visible when + clicked) ────────────────────┐  │
│ │ New Store                                                       │  │
│ │ Name: [          ] Type: [Master ▾] Email: [          ]        │  │
│ │ Phone: [         ] Password: [     ] Address: [         ]      │  │
│ │ [Cancel] [Create Store]                                        │  │
│ └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│ ┌── STORE TABLE ─────────────────────────────────────────────────┐  │
│ │ Name              │Type   │Email         │Push Status│OOS│Low│OK│  │
│ │ CK Alpha          │Master │mgr@cka..    │Stale 54  🔴│10 │ 0│ 1│  │
│ │ ▼ EXPANDED ────────────────────────────────────────────────── │  │
│ │ │ STORE INFO              │ STOCK HEALTH                      │  │
│ │ │ Email: mgr@cka..        │ ┌──────┐ ┌──────┐ ┌──────┐      │  │
│ │ │ Phone: —                │ │OOS:10│ │Low: 0│ │OK:  1│      │  │
│ │ │ Created: 12 Jun 2026    │ └──RED─┘ └──────┘ └─GRN──┘      │  │
│ │ │ Address: —              │                                   │  │
│ │ │ [Edit]                  │ OUT OF STOCK ITEMS                │  │
│ │ │                         │ Almonds 0kg, Cashew 0kg...       │  │
│ │ │ [Push Now] 54 behind    │                                   │  │
│ │ │                         │ PUSH HISTORY                      │  │
│ │ │                         │ 12 Jun — 47 items — Success      │  │
│ │ └─────────────────────────┴───────────────────────────────── │  │
│ │ CK Beta           │Master │mgr@ckb..    │Stale 57  🔴│11 │ 0│ 0│  │
│ │ Cost Test Outlet   │Outlet │mgr@cost..   │Stale 53  🔴│ 8 │ 2│ 1│  │
│ │ Outlet Direct One  │Outlet │mgr@out..    │Stale 54  🔴│ 9 │ 1│ 1│  │
│ │ test 1             │Master │—            │Stale 57  🔴│ — │ —│ —│  │
│ └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Table Columns

| Column | Source | Display |
|--------|--------|---------|
| Name | `name` from hierarchy list | Bold text |
| Type | `restaurantTypeFlag` | Badge: "Master" (orange) / "Outlet" (blue) |
| Email | `email` or `vendor.email` | Text, "—" if empty |
| Push Status | Computed from push form data | "Stale — 54 behind" (red) / "Synced" (green) / "—" |
| Out of Stock | Count from `getHierarchyDetail()` | Red number if > 0 |
| Low Stock | Count from hierarchy detail | Amber number if > 0 |
| Adequate | Count from hierarchy detail | Green number |
| Actions | Inline | Push Now button (if stale) |

---

## Filters & Controls

| Control | Behavior |
|---------|----------|
| Type filter pills | "All (5)" / "Master (3)" / "Outlet (2)" — filter table |
| Search | Filter by store name or email |
| "+ Create Store" button | Shows inline add form above table |

---

## Inline Add Form (above table)

Shown when "+ Create Store" clicked. Green left border card.

| Field | Type | Required | Notes |
|-------|------|:--------:|-------|
| Store Name | text | YES | Placeholder: "e.g. Downtown Branch" |
| Store Type | dropdown | YES | "Master Store" / "Outlet" |
| Email | email | YES | Manager login email |
| Phone | text | NO | |
| Password | password | YES | Manager login password |
| Address | textarea | NO | |

**Buttons:** Cancel (outline, hides form) + Create Store (green primary)
**On success:** Toast "Store created". New store appears in table. Form hides.
**Note below form:** "This will create a new child store under your hierarchy."

---

## Expanded Row Detail (on click)

### Left Half: Store Info

| Field | Source |
|-------|--------|
| Email | `email` |
| Phone | `phone` |
| Created | `createdAt` |
| Address | `address` |
| **Edit button** | Opens inline edit of name/email/phone/address (if API supports) |
| **Push Now button** | Prominent, with "54 items behind" count. Calls `pushBundle(childId)`. |

### Right Half: Stock Health + Push History

#### Stock Health KPIs (3 cards)

| KPI | Source | Color |
|-----|--------|-------|
| Out of Stock | Items with `cal_quantity = 0` from hierarchy detail | Red |
| Low Stock | Items with `is_low_stock = true` | Amber |
| Adequate | Remaining items | Green |

#### Out of Stock Items (mini list)
Show names of items with 0 stock: "Almonds 0 kg, Cashew 0 kg, Carrot 0 kg..."
Max 5 items, then "+ X more"

#### Push History (mini table)

| Column | Source |
|--------|--------|
| Date | From `getHierarchyHistory()` |
| Items Pushed | Count |
| Status | Success / Failed |

Last 3 pushes shown.

---

## API Calls

| Call | When | Cache TTL |
|------|------|:---------:|
| `getHierarchyList({ limit: 25 })` | Page load | LONG (60s) |
| `getHierarchyDetail({ storeRestaurantId })` | On row expand (per store health) | MEDIUM (45s) |
| `getPushForm(childId)` | On row expand (push status) | MEDIUM (45s) |
| `getHierarchyHistory()` | On row expand (push history) | SHORT (30s) |
| `createHierarchyChild(payload)` | On create | No cache (write) |
| `pushBundle(childId)` | On Push Now click | No cache (write), invalidates list |

---

## What the Summary Tab Becomes

The current "Summary" tab (HierarchySummary) shows a table with Sent/Received/Txns/Out of Stock/Low/Adequate per store. 

**This data is now integrated into the main table columns** (OOS, Low, Adequate counts visible for every store). The separate Summary tab is **no longer needed** — the expandable row gives deeper detail per store.

**Decision:** Remove the Summary/Manage tabs. Single unified view replaces both.

---

## What This Replaces

| Before (current) | After (frozen) |
|-------------------|----------------|
| 2 tabs: Summary + Manage | Single unified view (no tabs) |
| Summary = separate health table | Health columns in main table |
| Manage = flat list with Push buttons | Expandable rows with full detail |
| Create Store = popup dialog | Inline form above table |
| No per-store stock health | Expanded row shows OOS items + KPIs |
| No push history per store | Expanded row shows last 3 pushes |

---

## Known Issues (not code fixes)

| Issue | Resolution |
|-------|-----------|
| O-1: "test 1" store visible | Preprod data cleanup (BUG-014) — not a code fix |
| O-2: Alpha Outlet One missing metadata | Data issue — store exists but child-of-child returns incomplete data. Show "—" gracefully. |

---

## Mock References

| Mock | Description |
|------|-------------|
| `store_mgmt_expandable` | Table with expanded row showing store info + stock health |
| `store_add_pattern_b` | Inline add form above table |

---

*This document is FROZEN. Implementation proceeds against this spec. Changes require owner re-approval.*
