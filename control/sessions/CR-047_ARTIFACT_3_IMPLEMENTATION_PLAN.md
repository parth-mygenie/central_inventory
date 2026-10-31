# CR-047 — Gate 3: Implementation Plan

> **ID:** CR-047
> **Artifact:** 3 — Implementation Plan
> **Role:** PLANNING
> **Date:** 2026-10-18
> **Depends on Gate 2:** `control/sessions/CR-047_ARTIFACT_2_IMPACT_ANALYSIS.md`
> **Code Reality:** PARTIAL
> **Scope:** 2 files changed, 0 files server-side, CR-039 Upload Invoice tab PRESERVED

---

## Stage Dispatch

Owner confirmed: **Both Impact Analysis (Gate 2) + Implementation Plan (Gate 3)** in same session.
Gate 2 is complete. This document is Gate 3.

---

## Execution Sequence

Execute edits in this exact order:

```
E1 → api.js:  Add addPurchase() function  (line 793)
E2 → api.js:  Annotate addStockPurchase as deprecated  (line 790)
E3 → api.js:  Export addPurchase  (line 1239)
E4 → AddStockPurchaseForm.jsx:  Replace imports
E5 → AddStockPurchaseForm.jsx:  Replace state + utility functions
E6 → AddStockPurchaseForm.jsx:  Replace handleSubmit
E7 → AddStockPurchaseForm.jsx:  Replace Manual Entry tab JSX
E8 → AddStockPurchaseForm.jsx:  Update confirm/success screens
```

E1–E3 are independent of E4–E8. E4–E8 must run in sequence.

---

## Edit E1 — api.js: Add addPurchase()

**File:** `frontend/src/services/api.js`
**Location:** Insert after line 792 (blank line after `addStockPurchase`)

**INSERT after line 792:**
```javascript

// CR-047 — single-call batch purchase (replaces deprecated per-item add-stock loop)
function addPurchase(payload) {
  return client.post("/proxy/v2/inventory/add-purchase", payload)
    .then(r => { _invalidateStockCaches(); return r; });
}
```

**Verification E1:** `grep -n "addPurchase" frontend/src/services/api.js` → must show line ≈793 (declaration) and ≈1240 (export).

---

## Edit E2 — api.js: Annotate addStockPurchase as deprecated

**File:** `frontend/src/services/api.js`
**Location:** Line 788–791

**CURRENT (line 788–791):**
```javascript
// ── P19 Add Stock (Procurement) ──────────────────────────────────

function addStockPurchase(inventoryMasterId, payload) {
  return client.post(`/proxy/v2/inventory/add-stock/${inventoryMasterId}`, payload).then(r => { _invalidateStockCaches(); return r; });
}
```

**NEW:**
```javascript
// ── P19 Add Stock (Procurement) ──────────────────────────────────
// CR-047 — addStockPurchase DEPRECATED: replaced by addPurchase() for multi-item batch calls.
// Kept until CR-047 ships and is verified. Do not call from new code.
function addStockPurchase(inventoryMasterId, payload) {
  return client.post(`/proxy/v2/inventory/add-stock/${inventoryMasterId}`, payload).then(r => { _invalidateStockCaches(); return r; });
}
```

**Verification E2:** Comment only — no behaviour change. Visual confirmation sufficient.

---

## Edit E3 — api.js: Export addPurchase

**File:** `frontend/src/services/api.js`
**Location:** Line 1239 (currently `addStockPurchase,`)

**CURRENT:**
```javascript
  addStockPurchase,
```

**NEW (add line after):**
```javascript
  addStockPurchase,
  addPurchase,           // CR-047
```

**Verification E3:** `grep -n "addPurchase," frontend/src/services/api.js` → 1 hit at ~line 1240.

---

## Edit E4 — AddStockPurchaseForm.jsx: Replace imports

**File:** `frontend/src/components/central-inventory/AddStockPurchaseForm.jsx`
**Location:** Lines 1–16 (current imports block)

**CURRENT lines 1–16:**
```javascript
import { useState, useEffect, useCallback, useMemo } from "react";
import { useLoginContext } from "@/hooks/useLoginContext";
import { useWriteAction } from "@/hooks/useWriteAction";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingState, ErrorState } from "@/components/common/StateDisplays";
import PostSubmitConfirmation from "@/components/common/PostSubmitConfirmation";
import { toast } from "@/hooks/use-toast";
import { PackagePlus, Loader2, Plus, Trash2, ChevronDown, ChevronUp, ShieldX, CheckCircle2, Upload, FileSpreadsheet, AlertTriangle, Info, Download, ArrowRight } from "lucide-react";
import { useNavigate, Navigate } from "react-router-dom";
```

**NEW:**
```javascript
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLoginContext } from "@/hooks/useLoginContext";
import api from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { LoadingState, ErrorState } from "@/components/common/StateDisplays";
import { toast } from "@/hooks/use-toast";
import {
  PackagePlus, Loader2, Plus, Trash2, ShieldX, CheckCircle2,
  Upload, FileSpreadsheet, AlertTriangle, Info, Download, ArrowRight,
  TriangleAlert, Check
} from "lucide-react";
import { useNavigate, Navigate } from "react-router-dom";
```

**Key additions:** `useRef`, `Popover/PopoverContent/PopoverTrigger`, `Command*`, `TriangleAlert`, `Check`.
**Removed:** `useWriteAction` (not used in new submit path), `CardHeader/CardTitle/Label` (not used), `ChevronDown/ChevronUp` (not used).

**Verification E4:** Component compiles — `tail -5 /var/log/supervisor/frontend.out.log` shows "Compiled".

---

## Edit E5 — AddStockPurchaseForm.jsx: Replace state + utility functions

**File:** `frontend/src/components/central-inventory/AddStockPurchaseForm.jsx`
**Location:** Lines 18–133 (component open → end of `useMemo` validLines)

**REPLACE lines 18–133 with:**

```javascript
// CR-047 — Spreadsheet UX + add-purchase API + Split Payment
export default function AddStockPurchaseForm() {
  const { restaurantType, isTopLevel } = useLoginContext();
  const navigate = useNavigate();

  // ── Remote data ────────────────────────────────────────────────
  const [inventoryItems, setInventoryItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [ownStock, setOwnStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [poRequired, setPORequired] = useState(false);
  const [error, setError] = useState(null);

  // ── Shared header fields ───────────────────────────────────────
  const [vendorId, setVendorId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [fare, setFare] = useState(0);

  // ── Spreadsheet rows ───────────────────────────────────────────
  const [rows, setRows] = useState([emptyRow()]);

  // ── Payment legs ───────────────────────────────────────────────
  const [legs, setLegs] = useState([{ mode: "Cash", amount: "", ref: "" }]);

  // ── View state ─────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [confirmMode, setConfirmMode] = useState(false);
  const [successResult, setSuccessResult] = useState(null);

  // ── CR-039 Excel import state (PRESERVED) ──────────────────────
  const [excelParsing, setExcelParsing] = useState(false);
  const [excelRows, setExcelRows] = useState([]);
  const [excelError, setExcelError] = useState(null);

  function emptyRow() {
    return {
      key: Math.random().toString(36).slice(2),
      itemId: "", title: "", unit: "",
      qty: "", rate: "", amount: "",
      batch: "", expiry: ""
    };
  }

  // ── Auto-batch: {ABBREV}-{DDMONYY}-{HHMM} ────────────────────
  // Format ensures uniqueness across days AND same-day purchases at different times.
  // Same-minute counter appended for multiple rows added in the same minute.
  function autoBatch(title, rowIdx, currentRows) {
    if (!title) return "";
    const abbrev = title.slice(0, 3).toUpperCase().replace(/\s/g, "");
    const now = new Date();
    const dd  = String(now.getDate()).padStart(2, "0");
    const mon = now.toLocaleString("en", { month: "short" }).toUpperCase();
    const yy  = String(now.getFullYear()).slice(2);
    const hh  = String(now.getHours()).padStart(2, "0");
    const mm  = String(now.getMinutes()).padStart(2, "0");
    const base = `${abbrev}-${dd}${mon}${yy}-${hh}${mm}`;
    const prev = (currentRows || rows).slice(0, rowIdx).filter(r => r.batch?.startsWith(base)).length;
    return prev > 0 ? `${base}-${prev + 1}` : base;
  }

  // ── Row total ─────────────────────────────────────────────────
  function computeRowTotal(qty, rate) {
    const q = Number(qty), r = Number(rate);
    return !isNaN(q) && !isNaN(r) && q > 0 && r > 0 ? q * r : 0;
  }

  // ── Grand total (items only, excl. fare — matches label) ──────
  const grandTotal = useMemo(
    () => rows.reduce((s, r) => s + computeRowTotal(r.qty, r.rate), 0),
    [rows]
  );

  // ── Full payable = items + fare (used in API tot_amount + balance check) ──
  const fullPayableTotal = grandTotal + (Number(fare) || 0);

  // ── Valid rows for review/submit ──────────────────────────────
  const validRows = useMemo(
    () => rows.filter(r => r.itemId && Number(r.qty) > 0 && r.batch.trim()),
    [rows]
  );

  // ── Duplicate item detection ─────────────────────────────────
  const itemIdCount = useMemo(() => {
    const m = {};
    rows.forEach(r => { if (r.itemId) m[r.itemId] = (m[r.itemId] || 0) + 1; });
    return m;
  }, [rows]);

  // ── fetchData (unchanged logic) ───────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true); setError(null); setBlocked(false); setPORequired(false);
    try {
      const [invR, vendR, stockR, settR] = await Promise.allSettled([
        api.getInventoryMaster(),
        api.getVendors(),
        api.getStockInventory(),
        api.getOperationalSettings(),
      ]);
      if (invR.status === "fulfilled") {
        const d = invR.value.data?.data || invR.value.data || [];
        setInventoryItems(Array.isArray(d) ? d : []);
      }
      if (vendR.status === "fulfilled") {
        const d = vendR.value.data?.data || vendR.value.data || [];
        setVendors(Array.isArray(d) ? d : []);
      } else {
        const code = vendR.reason?.response?.data?.errors?.[0]?.code || "";
        if (code === "VENDOR_PURCHASE_NOT_ALLOWED") setBlocked(true);
      }
      if (stockR.status === "fulfilled") {
        setOwnStock(stockR.value.data?.current_stocks || []);
      }
      if (settR.status === "fulfilled") {
        const d = settR.value.data?.data || settR.value.data || {};
        const s = d.stored_settings || d.settings || d;
        if (s.require_po_for_purchase === true) setPORequired(true);
      }
    } catch { setError("Failed to load form data"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Row mutations ─────────────────────────────────────────────
  function updateRow(idx, field, value) {
    setRows(prev => {
      const next = [...prev];
      const row = { ...next[idx], [field]: value };
      if (field === "itemId") {
        const item = inventoryItems.find(i => String(i.id) === String(value));
        row.unit = item?.unit || item?.display_unit || "";
        row.title = item?.stock_title || "";
        if (Number(row.qty) > 0 && !row.batch) {
          row.batch = autoBatch(row.title, idx, next);
        }
      }
      if (field === "qty" || field === "rate") {
        const amt = computeRowTotal(
          field === "qty" ? value : row.qty,
          field === "rate" ? value : row.rate
        );
        row.amount = amt > 0 ? amt.toFixed(2) : "";
        if (field === "qty" && Number(value) > 0 && row.title && !row.batch) {
          row.batch = autoBatch(row.title, idx, next);
        }
      }
      next[idx] = row;
      return next;
    });
  }

  function addRow() { setRows(prev => [...prev, emptyRow()]); }
  function removeRow(idx) { setRows(prev => prev.filter((_, i) => i !== idx)); }

  // ── Payment leg mutations ─────────────────────────────────────
  function updateLeg(idx, field, value) {
    setLegs(prev => { const n=[...prev]; n[idx]={...n[idx],[field]:value}; return n; });
  }
  function addLeg() { setLegs(prev => [...prev, { mode: "", amount: "", ref: "" }]); }
  function removeLeg(idx) { setLegs(prev => prev.filter((_, i) => i !== idx)); }

  // ── Split payment balance ─────────────────────────────────────
  const splitEntered = legs.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const splitBalanced = Math.abs(splitEntered - fullPayableTotal) < 0.01;
  const isSplit = legs.length > 1;

  // ── Form validity ─────────────────────────────────────────────
  const selectedVendor = vendors.find(v => String(v.id) === String(vendorId));
  const isFormValid = validRows.length > 0 && vendorId && (!isSplit || splitBalanced);

  // ── Reset ─────────────────────────────────────────────────────
  function resetForm() {
    setRows([emptyRow()]); setVendorId(""); setFare(0);
    setPurchaseDate(new Date().toISOString().split("T")[0]);
    setLegs([{ mode: "Cash", amount: "", ref: "" }]);
    setConfirmMode(false); setSuccessResult(null);
  }
```

**Verification E5:** Component compiles. `useMemo`, `useRef` present in import.

---

## Edit E6 — AddStockPurchaseForm.jsx: Replace handleSubmit

**File:** `frontend/src/components/central-inventory/AddStockPurchaseForm.jsx`
**Location:** Lines 134–168 (current handleSubmit)

**REPLACE lines 134–168 with:**

```javascript
  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!isFormValid || submitting) return;
    setSubmitting(true);
    try {
      // Build payload per add-purchase API contract (field names are case-sensitive)
      const isSplitPayment = legs.length > 1;
      const payload = {
        vendor_id:     Number(vendorId),
        purchase_date: purchaseDate,
        payment_type:  isSplitPayment ? "partial" : (legs[0]?.mode || "Cash"),
        tot_amount:    parseFloat(fullPayableTotal.toFixed(2)),  // items + fare
        item_total:    parseFloat(grandTotal.toFixed(2)),        // items only
        tot_fair:      Number(fare) || 0,
        tot_tax:       0,
        ...(isSplitPayment && {
          partial_payments: legs
            .filter(l => l.mode && Number(l.amount) > 0)
            .map(l => ({
              payment_mode:   l.mode,
              amount:         Number(l.amount),
              ...(l.ref && { transaction_id: l.ref }),
            })),
        }),
        purchase_items: validRows.map(r => ({
          Ingredient:   Number(r.itemId),   // capital I — API contract
          Unit:         r.unit,             // capital U — API contract
          quantity:     Number(r.qty),
          rate:         Number(r.rate) || 0,
          Amount:       Number(r.amount) || 0, // capital A — API contract
          batch:        r.batch.trim(),
          ...(r.expiry && { expiry_date: r.expiry }),
        })),
      };

      const resp = await api.addPurchase(payload);
      const txnId = resp.data?.transaction_id || resp.data?.purchase_details?.transaction_id || "";
      const count = resp.data?.added_items?.length || validRows.length;

      setSuccessResult({ count, transactionId: txnId, vendor: selectedVendor?.vendor_name || "" });
      setConfirmMode(false);
    } catch (err) {
      const code = err?.response?.data?.errors?.[0]?.code || "";
      if (code === "DIRECT_PURCHASE_REQUIRES_PO") { setPORequired(true); return; }
      toast({ title: err?.response?.data?.message || "Purchase failed. Please retry.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };
```

**Verification E6:** Check Network tab on submit — exactly 1 POST to `/api/proxy/v2/inventory/add-purchase`.

---

## Edit E7 — AddStockPurchaseForm.jsx: Replace Manual Entry tab JSX

**File:** `frontend/src/components/central-inventory/AddStockPurchaseForm.jsx`
**Location:** Replace the entire Manual Entry tab content inside `<TabsContent value="manual">` (current lines ~386–537)

This is the largest edit — the full spreadsheet UI. The Upload Invoice tab (lines 261–383) is **PRESERVED UNCHANGED**.

**REPLACE the `<TabsContent value="manual">...</TabsContent>` block with:**

```jsx
        {/* ── Manual Entry Tab ────────────────────────────── */}
        {/* CR-047 — spreadsheet UX + add-purchase + split payment */}
        <TabsContent value="manual">

          {/* ── Header strip: Vendor | Date | Fare || Payment ── */}
          <Card className="mb-2">
            <CardContent className="py-2.5 px-3">
              <div className="flex gap-2 items-start">

                {/* Vendor */}
                <div style={{flex:"1.2",minWidth:0}}>
                  <p className="text-[10px] font-medium text-muted-foreground mb-1">Vendor <span className="text-red-500">*</span></p>
                  <Select value={vendorId} onValueChange={setVendorId}>
                    <SelectTrigger data-testid="vendor-select" className="h-8 text-xs">
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map(v => (
                        <SelectItem key={v.id} value={String(v.id)}>{v.vendor_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Purchase Date */}
                <div style={{flex:"1.0",minWidth:0}}>
                  <p className="text-[10px] font-medium text-muted-foreground mb-1">Purchase Date</p>
                  <Input data-testid="purchase-date" type="date" value={purchaseDate}
                    onChange={e => setPurchaseDate(e.target.value)} className="h-8 text-xs" />
                </div>

                {/* Fare */}
                <div style={{flex:"0.55",minWidth:0}}>
                  <p className="text-[10px] font-medium text-muted-foreground mb-1">Fare</p>
                  <Input type="number" value={fare} min={0} step="0.01"
                    onChange={e => setFare(e.target.value)} className="h-8 text-xs"
                    style={{MozAppearance:"textfield"}} />
                </div>

                {/* Divider */}
                <div className="w-px bg-border self-stretch mx-0.5 flex-shrink-0" />

                {/* Payment */}
                <div style={{flex:"1.8",minWidth:0}}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-medium text-muted-foreground">Payment</p>
                    {legs.length < 4 && (
                      <button onClick={addLeg}
                        className="text-[10px] text-muted-foreground border border-dashed border-border rounded px-1.5 py-0.5 hover:border-primary hover:text-primary">
                        + Split
                      </button>
                    )}
                  </div>
                  <PaymentLegs
                    legs={legs} fullPayableTotal={fullPayableTotal}
                    splitEntered={splitEntered} splitBalanced={splitBalanced}
                    onUpdateLeg={updateLeg} onRemoveLeg={removeLeg} />
                </div>

              </div>

              {/* Vendor context */}
              {selectedVendor && (
                <div className="flex items-center gap-1.5 mt-2 px-2 py-1 bg-muted/30 rounded text-[10px] text-muted-foreground" data-testid="vendor-context">
                  <Info className="h-2.5 w-2.5 shrink-0" />
                  <span>Vendor: <strong>{selectedVendor.vendor_name}</strong> · Contact: {selectedVendor.contact_person_name || "—"} · Phone: {selectedVendor.contact_number || "—"}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Spreadsheet table ──────────────────────────── */}
          <Card className="mb-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 pt-2.5 pb-0 border-b border-muted/50 pb-2">
              Items — Tab / Enter to navigate rows
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{tableLayout:"fixed"}}>
                <colgroup>
                  <col style={{width:28}} />
                  <col style={{width:"22%"}} />
                  <col style={{width:70}} />
                  <col style={{width:50}} />
                  <col style={{width:80}} />
                  <col style={{width:80}} />
                  <col style={{width:110}} />
                  <col style={{width:108}} />
                  <col style={{width:28}} />
                </colgroup>
                <thead className="bg-muted/30">
                  <tr>
                    {["#","Item *","Qty *","Unit","Unit Price","Amount","Batch *","Expiry",""].map((h,i)=>(
                      <th key={i} className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-left px-2 py-1.5 border-b border-border">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <SpreadsheetRow
                      key={row.key}
                      idx={idx} row={row}
                      inventoryItems={inventoryItems}
                      ownStock={ownStock}
                      itemIdCount={itemIdCount}
                      isLast={idx === rows.length - 1}
                      canDelete={rows.length > 1}
                      onUpdate={(field, value) => updateRow(idx, field, value)}
                      onDelete={() => removeRow(idx)}
                      onTabFromLast={() => addRow()}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-3 py-2">
              <button onClick={addRow} data-testid="add-line-btn"
                className="w-full py-1.5 border border-dashed border-border rounded text-[11px] text-muted-foreground hover:border-primary hover:text-primary flex items-center justify-center gap-1">
                <Plus className="h-3 w-3" /> Add Another Item
              </button>
            </div>
            {/* Grand total bar */}
            <div className="mx-3 mb-3 flex items-center justify-between px-3 py-1.5 bg-green-50 border border-green-200 rounded-md">
              <span className="text-[11px] font-medium text-green-700">Grand Total (excl. fare)</span>
              <span className="text-sm font-bold text-green-700 tabular-nums">₹ {grandTotal.toLocaleString("en-IN", {minimumFractionDigits:2})}</span>
            </div>
          </Card>

          {/* ── Action bar ─────────────────────────────────── */}
          <div className="flex gap-2 items-center">
            <Button variant="outline" size="sm" onClick={resetForm} disabled={submitting}>Reset</Button>
            <Button data-testid="review-purchase-btn" size="sm"
              onClick={() => setConfirmMode(true)} disabled={!isFormValid || submitting}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              Review &amp; Confirm ({validRows.length} item{validRows.length !== 1 ? "s" : ""})
            </Button>
            {isSplit && !splitBalanced && (
              <span className="text-[10.5px] text-amber-600 flex items-center gap-1">
                <TriangleAlert className="h-3 w-3" />
                ₹{splitEntered.toFixed(2)} of ₹{fullPayableTotal.toFixed(2)} entered
              </span>
            )}
          </div>

        </TabsContent>
```

---

## Edit E7b — New sub-components (add below main component, same file)

Add these two sub-components at the **bottom of the file**, after the closing `}` of `AddStockPurchaseForm`:

### SpreadsheetRow

```jsx
// CR-047 — Spreadsheet row with item combobox, auto-batch, in-place amount update
function SpreadsheetRow({ idx, row, inventoryItems, ownStock, itemIdCount, isLast, canDelete, onUpdate, onDelete, onTabFromLast }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const isDuplicate = row.itemId && (itemIdCount[row.itemId] || 0) > 1;
  const usedInRows = Object.fromEntries(
    Object.entries(itemIdCount).map(([id, count]) => [id, count])
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return inventoryItems.filter(i => !q || i.stock_title.toLowerCase().includes(q));
  }, [inventoryItems, search]);

  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach(i => {
      const cat = i.category_id?.name || "Other";
      (g[cat] = g[cat] || []).push(i);
    });
    return g;
  }, [filtered]);

  const stock = ownStock.find(s => s.stock_title === row.title);
  const amount = row.qty && row.rate ? (Number(row.qty) * Number(row.rate)) : 0;

  function handleKeyDown(field, e) {
    const order = ["qty", "rate", "batch", "expiry"];
    if (e.key === "Tab" || e.key === "Enter") {
      const ci = order.indexOf(field);
      if (ci < order.length - 1) {
        e.preventDefault();
        document.getElementById(`${order[ci + 1]}-${idx}`)?.focus();
      } else if (!e.shiftKey) {
        e.preventDefault();
        if (isLast && row.itemId && Number(row.qty) > 0 && row.batch) onTabFromLast();
        else document.getElementById(`qty-${idx + 1}`)?.focus();
      }
    }
  }

  const tdClass = "px-1 py-0.5 border-b border-muted/50 align-middle";

  return (
    <tr className="hover:bg-muted/10" data-testid={`purchase-line-${idx}`}>
      <td className={tdClass + " text-center text-[10px] text-muted-foreground"}>{idx + 1}</td>

      {/* Item combobox */}
      <td className={tdClass}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              data-testid={`item-select-${idx}`}
              className={`w-full h-[28px] text-left text-xs px-2 rounded border truncate
                ${isDuplicate ? "border-amber-300 bg-amber-50 text-amber-800" : "border-border bg-background"}
                flex items-center justify-between gap-1`}
            >
              <span className="truncate">{row.title || <span className="text-muted-foreground">Search item…</span>}</span>
              {isDuplicate && <TriangleAlert className="h-3 w-3 text-amber-500 flex-shrink-0" />}
            </button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-[300px]" align="start" side="bottom">
            <Command>
              <CommandInput placeholder="Search…" value={search} onValueChange={setSearch} className="h-8 text-xs" />
              <CommandList className="max-h-[220px]">
                <CommandEmpty className="text-xs py-4 text-center text-muted-foreground">No items found</CommandEmpty>
                {Object.entries(grouped).map(([cat, items]) => (
                  <CommandGroup key={cat} heading={<span className="text-[10px]">{cat}</span>}>
                    {items.map(item => {
                      const alreadyInRow = Object.entries(itemIdCount).find(
                        ([id]) => String(id) === String(item.id)
                      );
                      return (
                        <CommandItem
                          key={item.id}
                          value={item.stock_title}
                          onSelect={() => {
                            onUpdate("itemId", String(item.id));
                            setSearch(""); setOpen(false);
                            setTimeout(() => document.getElementById(`qty-${idx}`)?.focus(), 50);
                          }}
                          className="text-xs cursor-pointer"
                        >
                          <Check className={`h-3 w-3 mr-1.5 ${row.itemId === String(item.id) ? "opacity-100" : "opacity-0"}`} />
                          <span className="flex-1">{item.stock_title}</span>
                          <span className="text-[10px] text-muted-foreground ml-1">{item.unit}</span>
                          {alreadyInRow && alreadyInRow[1] > 0 && row.itemId !== String(item.id) && (
                            <span className="text-[9px] text-amber-600 ml-1">↑ in form</span>
                          )}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {stock && (
          <p className="text-[9px] text-muted-foreground mt-0.5 truncate">
            Stock: {stock.display_qty} {stock.display_unit}
          </p>
        )}
      </td>

      {/* Qty */}
      <td className={tdClass}>
        <Input id={`qty-${idx}`} data-testid={`qty-input-${idx}`}
          type="number" min={0} step="any" value={row.qty} placeholder="0"
          onChange={e => onUpdate("qty", e.target.value)}
          onKeyDown={e => handleKeyDown("qty", e)}
          className="h-[28px] text-xs"
          style={{MozAppearance:"textfield"}} />
      </td>

      {/* Unit */}
      <td className={tdClass}>
        <div className="h-[28px] flex items-center justify-center text-[11px] text-muted-foreground bg-muted/30 rounded border border-border">{row.unit || "—"}</div>
      </td>

      {/* Rate */}
      <td className={tdClass}>
        <Input id={`rate-${idx}`} data-testid={`rate-input-${idx}`}
          type="number" min={0} step="0.01" value={row.rate} placeholder="0.00"
          onChange={e => onUpdate("rate", e.target.value)}
          onKeyDown={e => handleKeyDown("rate", e)}
          className="h-[28px] text-xs"
          style={{MozAppearance:"textfield"}} />
      </td>

      {/* Amount (read-only, auto-computed) */}
      <td className={tdClass}>
        <Input type="number" value={amount > 0 ? amount.toFixed(2) : ""} readOnly tabIndex={-1}
          placeholder="0.00"
          className={`h-[28px] text-xs tabular-nums ${amount > 0 ? "bg-green-50 border-green-200 text-green-700" : ""}`}
          style={{MozAppearance:"textfield"}} />
      </td>

      {/* Batch */}
      <td className={tdClass}>
        <Input id={`batch-${idx}`} data-testid={`batch-input-${idx}`}
          value={row.batch} placeholder="AUTO"
          onChange={e => onUpdate("batch", e.target.value)}
          onKeyDown={e => handleKeyDown("batch", e)}
          className={`h-[28px] text-xs ${row.batch ? "bg-green-50 border-green-200 text-green-700" : ""}`} />
      </td>

      {/* Expiry (optional — no * in header) */}
      <td className={tdClass}>
        <Input id={`expiry-${idx}`} data-testid={`expiry-input-${idx}`}
          type="date" value={row.expiry} autoComplete="off"
          onChange={e => onUpdate("expiry", e.target.value)}
          onKeyDown={e => handleKeyDown("expiry", e)}
          className="h-[28px] text-xs" />
      </td>

      {/* Delete */}
      <td className={tdClass}>
        {canDelete && (
          <button onClick={onDelete} className="h-[22px] w-[22px] flex items-center justify-center rounded text-muted-foreground hover:bg-red-50 hover:text-red-500">
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </td>
    </tr>
  );
}
```

### PaymentLegs

```jsx
// CR-047 — Payment legs: single / split. Ref sub-row for UPI + Bank Transfer.
const PAYMENT_MODES = ["Cash", "Card", "UPI", "Bank Transfer", "Others"];

function PaymentLegs({ legs, fullPayableTotal, splitEntered, splitBalanced, onUpdateLeg, onRemoveLeg }) {
  const anyRef = legs.some(l => l.mode === "UPI" || l.mode === "Bank Transfer");
  const twoUp = legs.length === 2 && !anyRef;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: twoUp ? "1fr 1fr" : "1fr", gap: 4 }}>
        {legs.map((leg, i) => {
          const needsRef = leg.mode === "UPI" || leg.mode === "Bank Transfer";
          return (
            <div key={i} data-testid={`pay-leg-${i}`}>
              {/* Main row */}
              <div className="flex items-center gap-1">
                <select
                  value={leg.mode} onChange={e => onUpdateLeg(i, "mode", e.target.value)}
                  className="h-[28px] text-xs border border-border rounded px-1 flex-shrink-0"
                  style={{ width: 90 }}>
                  <option value="">Mode</option>
                  {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <Input type="number" value={leg.amount} placeholder="₹ amount"
                  onChange={e => onUpdateLeg(i, "amount", e.target.value)}
                  className="h-[28px] text-xs flex-shrink-0"
                  style={{ width: 100, MozAppearance: "textfield" }} />
                {legs.length > 1 && (
                  <button onClick={() => onRemoveLeg(i)}
                    className="h-[18px] w-[18px] flex items-center justify-center text-muted-foreground hover:text-red-500 flex-shrink-0">
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
              {/* Ref sub-row — only for UPI / Bank Transfer */}
              {needsRef && (
                <div className="flex items-center gap-1 mt-0.5 pl-1">
                  <span className="text-[9px] text-muted-foreground flex-shrink-0">└</span>
                  <Input value={leg.ref} placeholder="Ref / Transaction ID (optional)"
                    onChange={e => onUpdateLeg(i, "ref", e.target.value)}
                    className="h-[24px] text-[11px]" style={{ maxWidth: 220 }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Balance indicator — only when split */}
      {legs.length > 1 && (
        <div className={`mt-1.5 flex items-center gap-1.5 text-[11px] px-2 py-1 rounded border
          ${splitBalanced ? "bg-green-50 border-green-200 text-green-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
          {splitBalanced
            ? <><Check className="h-3 w-3" /> ₹{splitEntered.toFixed(2)} / ₹{fullPayableTotal.toFixed(2)} — Balanced</>
            : <><TriangleAlert className="h-3 w-3" /> ₹{splitEntered.toFixed(2)} entered of ₹{fullPayableTotal.toFixed(2)}</>
          }
        </div>
      )}
    </div>
  );
}
```

---

## Edit E8 — AddStockPurchaseForm.jsx: Update confirm/success screens

**Location:** Lines 205–253 (confirm screen) and 190–203 (success screen)

**REPLACE success screen (lines 190–203):**

```jsx
  if (successResult) {
    return (
      <div data-testid="procurement-success">
        <h1 className="text-sm font-bold flex items-center gap-2 mb-4">
          <PackagePlus className="h-4 w-4" /> Procurement
        </h1>
        <div className="rounded-lg border bg-card p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <p className="text-sm font-semibold">{successResult.count} item{successResult.count > 1 ? "s" : ""} added to stock</p>
          <p className="text-xs text-muted-foreground">Vendor: {successResult.vendor}</p>
          {successResult.transactionId && (
            <div className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1 text-[11px] font-semibold text-green-700" data-testid="transaction-id">
              <CheckCircle2 className="h-3 w-3" /> {successResult.transactionId}
            </div>
          )}
          <div className="flex gap-2 justify-center pt-2">
            <Button variant="outline" size="sm" onClick={resetForm} data-testid="new-purchase-btn">New Purchase</Button>
          </div>
        </div>
      </div>
    );
  }
```

**REPLACE confirm screen (lines 205–253):**

```jsx
  if (confirmMode && isFormValid) {
    return (
      <div data-testid="procurement-confirm">
        <h1 className="text-sm font-bold flex items-center gap-2 mb-3">
          <CheckCircle2 className="h-4 w-4" /> Confirm Stock Purchase
        </h1>
        <div className="rounded-lg border bg-card mb-3">
          <div className="px-4 py-2.5 border-b bg-muted/30">
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div><p className="text-[10px] text-muted-foreground uppercase tracking-wide">Vendor</p><p className="font-medium">{selectedVendor?.vendor_name || vendorId}</p></div>
              <div><p className="text-[10px] text-muted-foreground uppercase tracking-wide">Date</p><p className="font-medium">{purchaseDate}</p></div>
              <div><p className="text-[10px] text-muted-foreground uppercase tracking-wide">Payment</p>
                <p className="font-medium text-[11px]">
                  {isSplit
                    ? legs.filter(l=>l.mode&&Number(l.amount)>0).map(l=>`${l.mode}: ₹${Number(l.amount).toFixed(2)}`).join(" + ")
                    : (legs[0]?.mode || "—")}
                </p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/30">
                <tr>{["Item","Qty","Unit","Rate","Amount","Batch","Expiry"].map(h=>(
                  <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-3 py-1.5">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {validRows.map(r => (
                  <tr key={r.key} className="border-t">
                    <td className="px-3 py-2 font-medium">{r.title}</td>
                    <td className="px-3 py-2 tabular-nums">{r.qty}</td>
                    <td className="px-3 py-2">{r.unit}</td>
                    <td className="px-3 py-2 tabular-nums">{r.rate ? `₹${Number(r.rate).toFixed(2)}` : "—"}</td>
                    <td className="px-3 py-2 tabular-nums font-medium">{r.amount ? `₹${Number(r.amount).toLocaleString("en-IN",{minimumFractionDigits:2})}` : "—"}</td>
                    <td className="px-3 py-2"><Badge variant="secondary" className="text-[10px]">{r.batch}</Badge></td>
                    <td className="px-3 py-2 text-muted-foreground">{r.expiry || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t bg-green-50 flex justify-between items-center">
            <span className="text-[11px] font-medium text-green-700">Grand Total</span>
            <span className="text-sm font-bold text-green-700 tabular-nums">₹ {fullPayableTotal.toLocaleString("en-IN",{minimumFractionDigits:2})}</span>
          </div>
        </div>
        <p className="text-[10.5px] text-muted-foreground mb-3">
          This will increase stock at your store. This is a vendor purchase — not a transfer receive.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setConfirmMode(false)} disabled={submitting}>Back to Edit</Button>
          <Button data-testid="confirm-purchase-btn" size="sm" onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Confirm &amp; Add Stock
          </Button>
        </div>
      </div>
    );
  }
```

**Verification E8:** Success screen shows `data-testid="transaction-id"`. Confirm screen shows all rows with batch badges.

---

## Scope Lock Declaration

**Files WILL change:**
1. `frontend/src/services/api.js` — E1, E2, E3 (add `addPurchase`, annotate deprecated, export)
2. `frontend/src/components/central-inventory/AddStockPurchaseForm.jsx` — E4–E8 (full Manual Entry rewrite + sub-components)

**Files will NOT touch:**
- `backend/server.py`
- `frontend/src/lib/terminology.js` (FROZEN)
- `frontend/src/lib/screenVisibility.js` (FROZEN)
- `frontend/src/components/central-inventory/PurchaseOrderCreate.jsx` (CR-048)
- `frontend/src/components/central-inventory/PurchaseOrderDetail.jsx` (CR-049)
- Lines 261–383 of `AddStockPurchaseForm.jsx` (CR-039 Upload Invoice tab — PRESERVED)

---

## Risk Register

| # | Risk | Mitigation |
|---|------|-----------|
| R1 | `Popover`/`Command` library not imported — build fails | E4 adds both; verify compile after E4 |
| R2 | `TriangleAlert` not in lucide-react installed version | Check: `grep -r "TriangleAlert" node_modules/lucide-react/dist/` — if missing substitute `AlertTriangle` |
| R3 | Payload field casing: `Ingredient`, `Unit`, `Amount` must be capital | Code review of E6 payload block — grep `purchase_items` |
| R4 | `addPurchase` not exported — runtime `is not a function` | `grep "addPurchase" api.js` → 3 hits (decl, export, import) |
| R5 | `autoBatch` called before `inventoryItems` is loaded (empty title) | Guard: `if (!title) return ""` — included in E5 |
| R6 | `SpreadsheetRow` and `PaymentLegs` defined after `export default` — valid in JS module | Confirm no hoisting issues; both are function declarations |
| R7 | CR-039 Upload Invoice tab accidentally removed in E7 | Scope-lock: E7 only replaces `<TabsContent value="manual">` content, not `<TabsContent value="upload">` |
| R8 | `useWriteAction` removed but still imported somewhere in file | E4 removes the import; search for remaining usage after E4 |

---

## Post-Code Registry Checklist

After IMPLEMENTATION agent completes all 8 edits:

```
☐ 1. registry.json: CR-047 → status: "IMPLEMENTED", artifact_refs[4] (Code-Gate) → MISSING (awaits Gate 4 owner GO)
☐ 2. control/L3_CR_REGISTRY.md: row for CR-047 → "Gate 5 (Code) — awaiting Gate 6 QA"
☐ 3. control/L7_FILE_OWNERSHIP.md: add AddStockPurchaseForm.jsx + api.js with modifier CR-047 + date
☐ 4. Code markers: verify // CR-047 comment in AddStockPurchaseForm.jsx and api.js
☐ 5. Dashboard drift: node control/gen_dashboard_data.js --check → exit 0
☐ 6. Compile check: tail -5 /var/log/supervisor/frontend.out.log → "Compiled" 0 new errors
```

---

## Verification Matrix (from Gate 2, with file references)

| # | Check | File | How |
|---|-------|------|-----|
| V1 | `addPurchase()` declared + exported | api.js | `grep -n "addPurchase" api.js` → 3 hits |
| V2 | Spreadsheet table renders | AddStockPurchaseForm.jsx | Browser: `<table>` visible in Manual Entry |
| V3 | Tab/Enter cell navigation | AddStockPurchaseForm.jsx | Browser: Tab from qty → rate → batch without mouse |
| V4 | Batch format `AME-18OCT26-HHMM` | AddStockPurchaseForm.jsx | Browser: select item + qty → batch input shows new format |
| V5 | Amount updates in-place, cursor stable | AddStockPurchaseForm.jsx | Browser: type `2`, `5` in qty → shows `25` |
| V6 | Combobox opens inline (Popover portal) | SpreadsheetRow | Browser: item cell → dropdown appears below cell, not bottom-left |
| V7 | Combobox keyboard navigation | SpreadsheetRow | Browser: ArrowDown in search → navigates list |
| V8 | `⚠ dup` / `↑ in form` for duplicate items | SpreadsheetRow | Browser: same item in rows 1+2 → amber border |
| V9 | Expiry optional — form submits without it | AddStockPurchaseForm.jsx | Browser: leave expiry blank, click Confirm → proceeds |
| V10 | Grand Total = items only; fare excluded | AddStockPurchaseForm.jsx | Browser: qty=10 rate=10 fare=50 → GT=₹100 not ₹150 |
| V11 | Payment modes: 5 options (not Cash/Credit/Online) | PaymentLegs | Browser: dropdown → Cash/Card/UPI/Bank Transfer/Others |
| V12 | UPI → ref sub-row below leg | PaymentLegs | Browser: select UPI → `└ Ref` input appears |
| V13 | 2 Cash legs side-by-side | PaymentLegs | Browser: add split, both Cash → same horizontal row |
| V14 | Balance check vs fullPayableTotal (items+fare) | PaymentLegs | Browser: items=₹100 fare=₹50 → balance target ₹150 |
| V15 | Single POST to /add-purchase | api.js + AddStockPurchaseForm.jsx | Network tab: 1 request on Confirm |
| V16 | Payload: `Ingredient` capital I, `Unit` capital U, `Amount` capital A | api.js E6 | Code review of purchase_items array |
| V17 | `tot_amount` = items+fare; `item_total` = items only | api.js E6 | Code review of payload top-level fields |
| V18 | `partial_payments[]` present only if split | api.js E6 | Network tab: single Cash → no partial_payments in body |
| V19 | Transaction ID shown on success screen | AddStockPurchaseForm.jsx | Browser: complete purchase → `PUR-828-...` visible |
| V20 | Upload Invoice tab unchanged | AddStockPurchaseForm.jsx | Browser: switch to Upload Invoice → OCR + Excel zone |
| V21 | `DIRECT_PURCHASE_REQUIRES_PO` still redirects | AddStockPurchaseForm.jsx | Code review: error handler in handleSubmit |
| V22 | `_invalidateStockCaches()` called after addPurchase | api.js E1 | Code review: `.then(r => { _invalidateStockCaches(); return r; })` |

---

## Gate 3 Summary

| Field | Value |
|-------|-------|
| Total edits | 8 (E1–E8) |
| Files changed | 2 |
| New functions | `addPurchase()`, `autoBatch()`, `SpreadsheetRow`, `PaymentLegs`, `handleSubmit` (rewritten) |
| New imports | `useRef`, `Popover*`, `Command*`, `TriangleAlert`, `Check` |
| Removed | `useWriteAction`, `CardHeader/CardTitle/Label`, inline payment card |
| Scope-locked preserved | CR-039 Upload Invoice tab (lines 261–383) |
| Verification checks | 22 |
| Owner decisions needed | NONE |

**→ Gate 3 COMPLETE. Awaiting Gate 4 (Owner GO) before IMPLEMENTATION agent begins.**
