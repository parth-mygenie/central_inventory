# CR-030 — Artifact 1: Intake (Inward Screens Audit)

> **Date:** 2026-06-13
> **Scope:** Vendor Management, Raw Material Master, Purchase

---

## Screen 1: Vendor Management (`/vendor-management`)

### What's Working ✅
- CRUD operations: Add, Edit, Delete vendors functional
- Search filter by name/phone/email
- Role-gating: `canEdit` (master only), `canCreate` (master + central)
- Blocked state for stores without vendor purchase permission (`VENDOR_PURCHASE_NOT_ALLOWED`)
- Confirmation dialog before delete
- Loading/Error/Empty states
- Vendor count display ("Showing 4 of 4 vendors")
- Active/Inactive detection based on `created_at > 60 days`
- data-testid on all interactive elements

### Issues Found ⚠️
| # | Issue | Severity | Root Cause |
|---|-------|----------|------------|
| I-1 | **"Inactive" logic uses `created_at` not `last_purchase_date`** — a vendor created yesterday but never used shows "Active", while an old but heavily-used vendor shows "Inactive" | MEDIUM | **UNBLOCKED** — `vendor-item-list` API provides `Purchase_Date` per vendor. G-017 CLOSED. |
| I-2 | **No "Avg Order Value" intelligence** per Phase 7 Freeze C-6 spec | MEDIUM | **UNBLOCKED** — `vendor-item-list` returns `Amount` per purchase. Aggregate to compute avg. G-017 CLOSED. |
| I-3 | **Delete error uses `alert()` instead of toast** (line 74) | LOW | Code style issue. Should use `toast({ variant: "destructive" })` like other screens. |
| I-4 | **No pagination** — all vendors loaded at once (`to_list(1000)` in cache) | LOW | Acceptable at current scale (<100 vendors). |

### Missing vs Phase 7 Freeze (C-6)
- ✅ "Last purchase date" — **UNBLOCKED** (vendor-item-list API, G-017 CLOSED)
- ✅ "Avg order value" — **UNBLOCKED** (vendor-item-list API, G-017 CLOSED)
- ✅ "Inactive vendor detection" — implemented (upgrade from `created_at` to real `Purchase_Date`)

---

## Screen 2: Raw Material Master (`/raw-materials`)

### What's Working ✅
- Ingredients tab: full list from `getStockInventory()` with category, quantity, unit, min alert, status
- Categories tab: CRUD via `useCatalogueCrud` hook
- Search filter
- Low stock detection with red highlight + "Low" badge
- Recipe cross-reference count ("Recipes" column)
- Vendor column populated from stock data
- Add/Edit ingredient dialogs with rename warning
- data-testid on all elements

### Issues Found ⚠️
| # | Issue | Severity | Root Cause |
|---|-------|----------|------------|
| I-5 | **Items with 0 qty and 0 min_qty_alert show "OK"** — technically correct but operationally misleading. An item with 0 stock should at minimum show "Empty" or similar | LOW | Business logic choice. `is_low_stock` is set by POS API based on `min_qty_alert`. If alert is 0, everything is "OK" even at 0 stock. |
| I-6 | **No "Pushed to X stores" status column** per Phase 7 Freeze C-7 spec ("Pushed to X stores" status, unmapped item highlight) | MEDIUM | Missing implementation. Needs `getHierarchyList()` or franchise push data to compute. |
| I-7 | **Add Ingredient error handling is empty `catch {}`** (line 217) — silent failure on create | MEDIUM | Code quality. User gets no feedback if add fails. |
| I-8 | **Edit dialog doesn't show category** — user can't change ingredient category after creation | LOW | API limitation or intentional. `updateStockItem` may not support category change. |

### Missing vs Phase 7 Freeze (C-7)
- ❌ "Pushed to X stores" status — not implemented
- ❌ "Unmapped item highlight" — not implemented
- ✅ "Used in X recipes" cross-ref — implemented (Recipes column)

---

## Screen 3: Purchase (`/purchase`)

### What's Working ✅
- 3-mode tab interface (Upload Invoice / Manual Entry)
- Manual Entry: vendor select, purchase date, multi-line items
- Item selector from `getInventoryMaster()` with auto-fill unit
- Batch label and expiry date per line
- Commercial fields toggle (unit price, total amount, payment type)
- Current stock context per line ("Current: X → Y after")
- Confirm/Review step with summary
- Post-submit confirmation via `PostSubmitConfirmation`
- Upload Invoice tab with OCR "Coming Soon" notice (G-014)
- Excel upload zone with G-015 notice
- Download Template button (disabled/non-functional — expected)
- Role-gating: blocked state for non-vendor-purchase stores
- data-testid on all elements

### Issues Found ⚠️
| # | Issue | Severity | Root Cause |
|---|-------|----------|------------|
| I-9 | **Sequential submission** — each line item submitted individually in a loop (line 118). If item 3 of 5 fails, items 1-2 are committed but 4-5 are skipped. No rollback. | HIGH | Architecture. POS API is per-item (`/add-stock/{id}`). Could show partial success more clearly. |
| I-10 | **No "price comparison" intelligence** per Phase 7 Freeze C-3 spec | LOW | Blocked on historical purchase data (G-017 adjacent). |
| I-11 | **No "duplicate detection"** per Phase 7 Freeze C-3 spec | LOW | Blocked on G-016 (Invoice storage). |
| I-12 | **Upload Invoice file input accepts file but does nothing** — clicking file input selects a file but no processing happens | LOW | Expected — G-014 (Invoice OCR) not available. But UX could be improved to disable the input entirely or show "processing not available" after file selection. |
| I-13 | **Excel upload file input same issue** — accepts file but no processing | LOW | Expected — G-015 blocker. Same UX concern. |

### Missing vs Phase 7 Freeze (C-3)
- ❌ AI/OCR extraction — blocked on G-014
- ❌ Excel parsing — blocked on G-015
- ❌ Item matching (auto-match invoice items to inventory) — blocked on G-014
- ❌ Price comparison — blocked on G-017
- ❌ Duplicate detection — blocked on G-016
- ✅ Manual entry with multi-line — implemented
- ✅ Review-approve flow — implemented
- ✅ Vendor context card — implemented
- ✅ Stock projection per line — implemented
- ✅ Post-submit confirmation — implemented

---

## Summary: Prioritized Fix List

| Priority | ID | Screen | Issue | Effort |
|----------|-----|--------|-------|--------|
| HIGH | I-9 | Purchase | Sequential submission partial failure UX | 2h |
| HIGH | I-1/2 | Vendors | **UNBLOCKED** — Vendor intelligence (last purchase, avg order, inactive detection) via `vendor-item-list` API | 4h |
| HIGH | I-10 | Purchase | **UNBLOCKED** — Price comparison across vendors via `vendor-item-list` | 3h |
| MEDIUM | I-6 | Raw Materials | Missing "Pushed to X stores" column | 4h |
| MEDIUM | I-7 | Raw Materials | Silent failure on add ingredient | 15min |
| LOW | I-3 | Vendors | `alert()` → `toast()` for delete error | 5min |
| LOW | I-5 | Raw Materials | 0-stock items show "OK" (cosmetic) | 30min |
| LOW | I-8 | Raw Materials | Can't edit category after creation | 1h (if API supports) |
| LOW | I-12/13 | Purchase | File inputs accept files with no processing feedback | 30min |
| BLOCKED | I-11 | Purchase | Duplicate invoice detection | G-016 |
