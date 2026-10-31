# CR-051 — Gate 3: Implementation Plan

> **ID:** CR-051
> **Gate:** 3 — Implementation Plan
> **Role:** PLANNING
> **Date:** 2026-10-19
> **Items covered:** CR-051 (Purchase Report Screen) + A2 (invoice_number column)
> **Q1 resolved:** Invoice # store-only — no duplicate-check warning (invoice can repeat across vendors)
> **Feeds:** IMPLEMENTATION agent (Gate 4 GO needed first)

---

## Stage Dispatch

`Implementation Plan` — Steps 3–5 only.

---

## Step 0 — Code Reality (re-confirmed this session)

```bash
ls frontend/src/components/central-inventory/PurchaseReport.jsx   # → NOT FOUND ✓
grep -n "getVendorItemListFull\|exportInventoryMaster" frontend/src/services/api.js  # → 0 hits ✓
grep -n "purchase-report\|scr-purchase-report" frontend/src/lib/screenVisibility.js  # → 0 hits ✓
grep -n "PurchaseReport" frontend/src/App.js  # → 0 hits ✓
```

**Code Reality: NONE.** All 4 targets are absent. Clean slate.

---

## Step 1 — Conflict Pre-Check (re-confirmed)

| File | Last item | Status | Conflict? |
|------|-----------|:------:|:---------:|
| `api.js` | CR-047 addPurchase (IMPLEMENTED) | DONE | NONE |
| `App.js` | CR-026 production routes | DONE | NONE |
| `screenVisibility.js` | CR-027 restructure | DONE | NONE — owner-approved |
| `PurchaseReport.jsx` | — NEW — | — | NONE |

---

## Step 3 — Gate 3: Implementation Plan

### Execution Order

```
1. api.js        — new functions + exports (no existing code touched)
2. screenVisibility.js  — 2 additive lines (FROZEN, owner-approved)
3. App.js        — 1 import + 1 route
4. PurchaseReport.jsx   — new file (depends on 1–3)
```

---

### Edit 1 — `api.js`: Add `getVendorItemListFull` + `exportInventoryMaster`

**File:** `frontend/src/services/api.js`
**After line:** 1100 (blank line after `getVendorItemList = _cached(...)`)
**Action:** Insert block (+17 lines)

```javascript

// ── CR-051 — Purchase Report API ─────────────────────────────────

function _getVendorItemListFull(restaurantId, { fromDate, toDate, vendorId, paymentType } = {}) {
  const params = new URLSearchParams();
  params.set("restaurant_ids[]", restaurantId);
  if (fromDate) params.set("from_date", fromDate);
  if (toDate)   params.set("to_date", toDate);
  if (vendorId) params.set("vendor_id", String(vendorId));
  if (paymentType && paymentType !== "all") params.set("payment_type", paymentType);
  // Returns full response — data[], total_amount, summary, by_restaurant
  return client.get(`/proxy/v2/inventory/vendor-item-list?${params.toString()}`);
}
const getVendorItemListFull = _cached("getVendorItemListFull", TTL.SHORT, _getVendorItemListFull);

function exportInventoryMaster() {
  return client.get("/proxy/v2/inventory/export-inventory-master");
}
```

**Verify:**
```bash
grep -n "getVendorItemListFull\|exportInventoryMaster" frontend/src/services/api.js
# → 2 hits for each (decl + export after Edit 2)
```

**Risk:** LOW. Existing `_getVendorItemList` (line 1090) is untouched.
`getVendorItemList` (line 1099) is untouched. VendorManagement unaffected.

---

### Edit 2 — `api.js`: Export new functions

**File:** `frontend/src/services/api.js`
**After line:** 1309 (after `getVendorItemList,`)
**Action:** Insert 3 lines

```javascript
  // CR-051 — Purchase Report
  getVendorItemListFull,
  exportInventoryMaster,
```

**Verify:**
```bash
grep -n "getVendorItemListFull\|exportInventoryMaster" frontend/src/services/api.js
# expect: declaration (~line 1103), cached (~1113), export (~1311), export (~1312)
```

---

### Edit 3 — `screenVisibility.js`: SCREEN_VISIBILITY entry

**File:** `frontend/src/lib/screenVisibility.js`
**After line:** 48 (after `"scr-wastage-report"` entry, before closing `};` at line 49)
**Action:** Insert 1 line

```javascript
  "scr-purchase-report":     { master: FULL,  central: FULL,    franchise: FULL  },   // CR-051
```

**Verify:**
```bash
grep -n "scr-purchase-report" frontend/src/lib/screenVisibility.js  # → 2 hits (SCREEN_VISIBILITY + NAV_SECTIONS)
```

**Risk:** LOW. Additive. `getScreenAccess("scr-purchase-report", type)` now returns FULL for all roles.

---

### Edit 4 — `screenVisibility.js`: NAV_SECTIONS entry

**File:** `frontend/src/lib/screenVisibility.js`
**After line:** 115 (after `wastage-report` item, before `],` closing reports items array at line 116)
**Action:** Insert 1 line

```javascript
      { id: "purchase-report", screen: "scr-purchase-report", label: "Purchase Report", path: "/reports/purchase", icon: "ShoppingCart" },  // CR-051
```

**Verify:** Login → sidebar → Reports section shows 3 items: Consumption Report / Wastage Report / Purchase Report.

**Risk:** LOW. Additive. Reports section now has 3 items.

---

### Edit 5 — `App.js`: Import

**File:** `frontend/src/App.js`
**After line:** 24 (after `import DailyConsumptionReport`)
**Action:** Insert 1 line

```javascript
import PurchaseReport from "@/components/central-inventory/PurchaseReport";     // CR-051
```

---

### Edit 6 — `App.js`: Route

**File:** `frontend/src/App.js`
**After line:** 99 (after `<Route path="/wastage/report" .../>`)
**Action:** Insert 1 line

```javascript
        <Route path="/reports/purchase" element={<PurchaseReport />} />           {/* CR-051 */}
```

**Verify:**
```bash
grep -n "PurchaseReport\|reports/purchase" frontend/src/App.js  # → 2 hits
```

---

### Edit 7 — `PurchaseReport.jsx`: New file

**File:** `frontend/src/components/central-inventory/PurchaseReport.jsx`
**Action:** CREATE new file

**Complete specification (implement exactly as described):**

#### 7a — Imports + constants

```javascript
import { useState, useEffect, useMemo } from "react";
import { useLoginContext } from "@/hooks/useLoginContext";
import api from "@/services/api";
import { mapRestaurantType } from "@/lib/terminology";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/common/StateDisplays";
import { Download, ChevronDown, ChevronRight, FileText } from "lucide-react";

const PAYMENT_PILLS = ["all", "Cash", "Card", "UPI", "Bank Transfer", "Others"];

function todayStr() { return new Date().toISOString().split("T")[0]; }
function last30dStr() {
  const d = new Date(); d.setDate(d.getDate() - 30);
  return d.toISOString().split("T")[0];
}
```

#### 7b — State

```javascript
export default function PurchaseReport() {
  const { restaurantId, restaurantType } = useLoginContext();
  const isMultiStore = restaurantType === "master" || restaurantType === "central";

  const [fromDate, setFromDate]     = useState(last30dStr);
  const [toDate, setToDate]         = useState(todayStr);
  const [vendorFilter, setVendorFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [searchText, setSearchText] = useState("");

  const [rows, setRows]             = useState([]);
  const [totalAmount, setTotalAmount] = useState("0");
  const [summary, setSummary]       = useState({});
  const [byRestaurant, setByRestaurant] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [exporting, setExporting]   = useState(false);
  const [storeOpen, setStoreOpen]   = useState(false);
```

#### 7c — Fetch effect

Re-fetch when `fromDate`, `toDate`, `vendorFilter`, or `paymentFilter` changes.
Use a 400ms debounce identical to DailyConsumptionReport pattern:

```javascript
  useEffect(() => {
    if (!restaurantId) return;
    const t = setTimeout(() => {
      setLoading(true); setError("");
      api.getVendorItemListFull(restaurantId, {
        fromDate,
        toDate,
        ...(vendorFilter && { vendorId: vendorFilter }),
        paymentType: paymentFilter,
      }).then(resp => {
        const d = resp.data || {};
        setRows(d.data || []);
        setTotalAmount(d.total_amount ?? "0");
        setSummary(d.summary || {});
        setByRestaurant(d.by_restaurant || []);
      }).catch(() => setError("Failed to load purchase report."))
        .finally(() => setLoading(false));
    }, 400);
    return () => clearTimeout(t);
  }, [restaurantId, fromDate, toDate, vendorFilter, paymentFilter]);
```

#### 7d — Client-side filter (ingredient search)

```javascript
  const displayRows = useMemo(() =>
    !searchText ? rows : rows.filter(r =>
      (r.Ingredient_Name || "").toLowerCase().includes(searchText.toLowerCase())
    ), [rows, searchText]);
```

#### 7e — Vendor list (unique, from fetched data)

```javascript
  const vendors = useMemo(() => {
    const seen = new Map();
    rows.forEach(r => { if (r.vendor_id && r.Vendor_Name) seen.set(r.vendor_id, r.Vendor_Name); });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [rows]);
```

#### 7f — Export handler

```javascript
  const handleExport = async () => {
    setExporting(true);
    try {
      const resp = await api.exportInventoryMaster();
      const url = resp.data?.download_url || resp.data?.data?.download_url;
      if (url) window.open(url, "_blank");
    } catch { /* silent */ }
    finally { setExporting(false); }
  };
```

#### 7g — Layout (JSX)

```
[Page wrapper: data-testid="purchase-report-page"]

  [Header row — flex, wrapping]
    <FileText icon /> "Purchase Report"
    <input type="date" data-testid="pr-from-date" value={fromDate} onChange setFromDate />
    <span>–</span>
    <input type="date" data-testid="pr-to-date" value={toDate} onChange setToDate />
    <select data-testid="pr-vendor-filter" value={vendorFilter} onChange setVendorFilter>
      <option value="">All Vendors</option>
      {vendors.map(v => <option value={v.id}>{v.name}</option>)}
    </select>
    <Input placeholder="Search ingredient…" data-testid="pr-search" value={searchText} onChange setSearchText />
    [Payment pills] — "all" | "Cash" | "Card" | "UPI" | "Bank Transfer" | "Others"
      data-testid="pr-pill-{pill.toLowerCase().replace(' ','-')}"
    <Button onClick handleExport disabled={exporting} data-testid="pr-export">
      <Download /> {exporting ? "Exporting…" : "Export Excel"}
    </Button>

  [Summary bar — data-testid="pr-summary-bar"]
    Total: ₹{Number(totalAmount).toLocaleString("en-IN")}
    · {summary.total_records ?? displayRows.length} purchases
    · {summary.scope_store_count ?? 1} store{summary.scope_store_count !== 1 ? "s" : ""}

  [By-store accordion — only when isMultiStore && byRestaurant.length > 0]
    data-testid="pr-store-accordion"
    Toggle button: "By Store ({byRestaurant.length})" → expands list of
      { restaurant_name: "X", line_count: N, restaurant_type_flag }
    Display: mapRestaurantType(flag) label for each store

  [Error state — when error]
    data-testid="pr-error"

  [Loading state — when loading && rows.length === 0]
    <LoadingState lines={3} />

  [Empty state — when !loading && displayRows.length === 0]
    data-testid="pr-empty"
    "No purchases found for the selected filters."

  [Table — data-testid="pr-table", when displayRows.length > 0]
    Columns (thead):
      Purchase Date | {isMultiStore && "Store"} | Ingredient | Vendor
      | Qty | Unit Price | Amount | Payment | Invoice # | Txn ID

    Rows (tbody):
      data-testid="pr-row-{r.ID}"
      r.Purchase_Date                                          ← date cell
      {isMultiStore && r.Restaurant_Name}                      ← store cell
      r.Ingredient_Name                                        ← ingredient
      r.Vendor_Name                                            ← vendor
      r.Quantity                                               ← display string "2 kg"
      {r.unit_price > 0 ? "₹" + r.unit_price : "—"}           ← unit price
      {"₹" + Number(r.line_total).toLocaleString("en-IN")}     ← amount (numeric)
      r.Payment_Type || "—"                                    ← payment type
      r.invoice_number || "—"                                  ← A2: Invoice # column
      r.transaction_id || "—"                                  ← txn ID

  [Footer note]
    "Showing {displayRows.length} of {rows.length} records"
    (only when searchText active and displayRows.length < rows.length)
```

**Note on `invoice_number` (A2):**
- `vendor-item-list` returns `invoice_number` per row (confirmed G-039, backend live)
- Display as-is. No duplicate detection (Q1: store only — invoice can repeat across vendors)
- Column header: "Invoice #"
- Value: `r.invoice_number || "—"`

**Note on `unit_price`:**
- API returns 0 for items with no unit price set. Display `"—"` not `"₹0"`.

**Note on `line_total` vs `Amount`:**
- Always use `r.line_total` (numeric) for display calculation. `r.Amount` is a string.

**Note on `by_restaurant[].total_amount`:**
- DO NOT display totals from by_restaurant — the field returns 0 even when line_total > 0 (confirmed probe).
- Show only `line_count` from by_restaurant. Grand total from top-level `total_amount`.

---

## Step 4 — Verification Matrix

| # | Edit | Check | Automated? |
|---|------|-------|:----------:|
| V1 | Edit 1 | `grep -n "getVendorItemListFull" api.js` → ≥2 hits | YES |
| V2 | Edit 2 | `grep -n "exportInventoryMaster" api.js` → ≥2 hits | YES |
| V3 | Edit 2 | `grep "getVendorItemList," api.js` → still exists (unchanged) | YES |
| V4 | Edit 3 | `grep "scr-purchase-report" screenVisibility.js` → 2 hits | YES |
| V5 | Edit 4 | `grep "purchase-report" screenVisibility.js` → 2 hits (SCREEN_VISIBILITY + NAV) | YES |
| V6 | Edit 5+6 | `grep "PurchaseReport" App.js` → 2 hits | YES |
| V7 | Edit 7 | Page loads at `/reports/purchase` without crash | Browser |
| V8 | — | "Purchase Report" in sidebar → Reports section | Browser |
| V9 | — | All 3 role types see sidebar item | Browser |
| V10 | — | Table populates with data (RID 828, makkhan row) | Browser |
| V11 | — | Summary bar shows total_amount + record count | Browser |
| V12 | — | Vendor filter narrows rows | Browser |
| V13 | — | Ingredient search narrows rows | Browser |
| V14 | — | Payment pill "Cash" narrows rows | Browser |
| V15 | — | Store column + accordion visible for master accounts | Browser |
| V16 | — | Export Excel opens download URL in new tab | Browser |
| V17 | A2 | Invoice # column present in table header | Browser |
| V18 | A2 | Row shows invoice_number value (or "—") | Browser |
| V19 | Regression | VendorManagement vendor purchase data still loads | Browser |
| V20 | Regression | Wastage Report / Consumption Report still load | Browser |
| V21 | Regression | `getVendorItemList` export still present in api.js | YES |
| V22 | Compile | `webpack compiled` with 0 new errors | YES |

---

## Step 5 — Post-Code Registry Checklist

```
□ 1. registry.json: CR-051 → status: IMPLEMENTED, artifact_refs Gate 5 path set
□ 2. L3_CR_REGISTRY.md: CR-051 row → IMPLEMENTED
□ 3. L7_FILE_OWNERSHIP.md: 4 files listed (api.js, screenVisibility.js, App.js, PurchaseReport.jsx)
□ 4. Code markers: // CR-051 in all 4 modified files
     grep -rn "// CR-051" frontend/src/ → ≥4 hits
□ 5. Dashboard drift: node control/gen_dashboard_data.js --check → PASS
```

---

## Scope Lock

**Files WILL change:**
1. `frontend/src/services/api.js` — +17 lines new functions, +3 lines export
2. `frontend/src/lib/screenVisibility.js` — +2 lines (FROZEN — owner approved for CR-051 only)
3. `frontend/src/App.js` — +2 lines (import + route)
4. `frontend/src/components/central-inventory/PurchaseReport.jsx` — NEW FILE

**Files will NOT touch:**
- `VendorManagement.jsx` — existing `getVendorItemList` call untouched
- `backend/server.py` — proxy-only, no new endpoints needed
- Any other frozen file beyond the approved `screenVisibility.js` edits
- `AddStockPurchaseForm.jsx` — BUG-055 (A1) is a separate item

---

## Open Questions

**None.** All decisions confirmed:
- `screenVisibility.js` edit: owner-approved ✅
- New function (not modify existing): design decision ✅
- Invoice # column (A2): included ✅
- Invoice # duplicate check (Q1): NO — store only ✅
- Export scope: "just build it" ✅
- Role visibility: all roles ✅
- `by_restaurant` totals: use `line_count` only, not `total_amount` ✅

---

## Gate 3 Summary

| Field | Value |
|-------|-------|
| Edits | 7 (6 file modifications + 1 new file) |
| Files WILL change | 4 |
| Lines added | ~17 (api.js) + 2 (screenVisibility.js) + 2 (App.js) + ~120 (PurchaseReport.jsx) |
| Risk | LOW overall — no existing logic modified, api.js additions only |
| A2 invoice # | INCLUDED — column in table, no duplicate check |
| Verification checks | 22 (7 grep, 15 browser) |
| Blocker | Gate 4 GO needed from owner before IMPLEMENTATION starts |

**→ Gate 3 COMPLETE. Awaiting owner Gate 4 GO.**
