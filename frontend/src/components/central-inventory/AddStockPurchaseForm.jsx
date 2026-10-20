// CR-047 — Add Stock: Spreadsheet UX + add-purchase API + Split Payment
import { useState, useEffect, useCallback, useMemo, useRef } from "react"; // BUG-059
import { useLoginContext } from "@/hooks/useLoginContext";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

// ── Payment modes (CR-047) ────────────────────────────────────────
const PAYMENT_MODES = ["Cash", "Card", "UPI", "Bank Transfer", "Others"];

// ── Main component ────────────────────────────────────────────────
export default function AddStockPurchaseForm() {
  const { restaurantType, isTopLevel } = useLoginContext();
  const navigate = useNavigate();

  // Remote data
  const [inventoryItems, setInventoryItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [ownStock, setOwnStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [poRequired, setPORequired] = useState(false);
  const [error, setError] = useState(null);

  // Header fields
  const [vendorId, setVendorId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [fare, setFare] = useState(0);
  const [invoiceNumber, setInvoiceNumber] = useState("");   // BUG-055

  // Spreadsheet rows
  const [rows, setRows] = useState([emptyRow()]);

  // Payment legs
  const [legs, setLegs] = useState([{ mode: "Cash", amount: "", ref: "" }]);

  // View state
  const [submitting, setSubmitting] = useState(false);
  const [confirmMode, setConfirmMode] = useState(false);
  const [successResult, setSuccessResult] = useState(null);

  // CR-039 excel import state (PRESERVED)
  const [excelParsing, setExcelParsing] = useState(false);
  const [excelRows, setExcelRows] = useState([]);
  const [excelError, setExcelError] = useState(null);

  function emptyRow() {
    return { key: Math.random().toString(36).slice(2), itemId: "", title: "", unit: "", qty: "", rate: "", amount: "", batch: "", expiry: "" };
  }

  // Auto-batch: {ABBREV}-{DDMONYY}-{HHMM} — unique across days + same-day purchases at different times
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

  function computeRowTotal(qty, rate) {
    const q = Number(qty), r = Number(rate);
    return !isNaN(q) && !isNaN(r) && q > 0 && r > 0 ? q * r : 0;
  }

  // Grand total: items only (label says "excl. fare")
  const grandTotal = useMemo(
    () => rows.reduce((s, r) => s + computeRowTotal(r.qty, r.rate), 0),
    [rows]
  );

  // Full payable = items + fare → used in API tot_amount + payment balance
  const fullPayableTotal = grandTotal + (Number(fare) || 0);

  // Valid rows for review/submit (expiry is optional)
  const validRows = useMemo(
    () => rows.filter(r => r.itemId && Number(r.qty) > 0 && r.batch.trim()),
    [rows]
  );

  // Duplicate item detection
  const itemIdCount = useMemo(() => {
    const m = {};
    rows.forEach(r => { if (r.itemId) m[r.itemId] = (m[r.itemId] || 0) + 1; });
    return m;
  }, [rows]);
  // BUG-051 — gate: true when any item appears in more than one row
  const hasDuplicates = useMemo(
    () => Object.values(itemIdCount).some(c => c > 1),
    [itemIdCount]
  );

  // fetchData — unchanged logic from original
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
      if (stockR.status === "fulfilled") setOwnStock(stockR.value.data?.current_stocks || []);
      if (settR.status === "fulfilled") {
        const d = settR.value.data?.data || settR.value.data || {};
        const s = d.stored_settings || d.settings || d;
        if (s.require_po_for_purchase === true) setPORequired(true);
      }
    } catch { setError("Failed to load form data"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Row mutations
  function updateRow(idx, field, value) {
    setRows(prev => {
      const next = [...prev];
      const row = { ...next[idx], [field]: value };
      if (field === "itemId") {
        const item = inventoryItems.find(i => String(i.id) === String(value));
        row.unit = item?.unit || item?.display_unit || "";
        row.title = item?.stock_title || "";
        if (Number(row.qty) > 0 && !row.batch) row.batch = autoBatch(row.title, idx, next);
      }
      if (field === "qty" || field === "rate") {
        const q = field === "qty" ? value : row.qty;
        const r = field === "rate" ? value : row.rate;
        const amt = computeRowTotal(q, r);
        row.amount = amt > 0 ? amt.toFixed(2) : "";
        if (field === "qty" && Number(value) > 0 && row.title && !row.batch)
          row.batch = autoBatch(row.title, idx, next);
      }
      next[idx] = row;
      return next;
    });
  }

  function addRow() { setRows(prev => [...prev, emptyRow()]); }
  function removeRow(idx) { setRows(prev => prev.filter((_, i) => i !== idx)); }

  // Payment leg mutations
  function updateLeg(idx, field, value) {
    setLegs(prev => { const n = [...prev]; n[idx] = { ...n[idx], [field]: value }; return n; });
  }
  function addLeg() { setLegs(prev => [...prev, { mode: "", amount: "", ref: "" }]); }
  function removeLeg(idx) { setLegs(prev => prev.filter((_, i) => i !== idx)); }

  // Split payment state
  const splitEntered = legs.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const splitBalanced = Math.abs(splitEntered - fullPayableTotal) < 0.01;
  const isSplit = legs.length > 1;

  const selectedVendor = vendors.find(v => String(v.id) === String(vendorId));
  const isFormValid = validRows.length > 0 && vendorId && !hasDuplicates && (!isSplit || splitBalanced); // BUG-051

  // BUG-052 — auto-fill single payment amount from fullPayableTotal.
  // Fires when total changes (items/fare updated) or when switching single↔split.
  // Only updates when exactly 1 leg is active; split balance is managed by the user.
  useEffect(() => {
    if (legs.length === 1 && fullPayableTotal > 0) {
      setLegs(prev => [{ ...prev[0], amount: fullPayableTotal.toFixed(2) }]);
    }
  }, [fullPayableTotal, legs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  function resetForm() {
    setRows([emptyRow()]); setVendorId(""); setFare(0); setInvoiceNumber("");  // BUG-055
    setPurchaseDate(new Date().toISOString().split("T")[0]);
    setLegs([{ mode: "Cash", amount: "", ref: "" }]);
    setConfirmMode(false); setSuccessResult(null);
  }

  // CR-047 — handleSubmit: single addPurchase call (replaces per-item loop)
  const handleSubmit = async () => {
    if (!isFormValid || submitting) return;
    setSubmitting(true);
    try {
      const payload = {
        vendor_id:     Number(vendorId),
        purchase_date: purchaseDate,
        payment_type:  isSplit ? "partial" : (legs[0]?.mode || "Cash"),
        tot_amount:    parseFloat(fullPayableTotal.toFixed(2)),
        item_total:    parseFloat(grandTotal.toFixed(2)),
        tot_fair:      Number(fare) || 0,
        tot_tax:       0,
        ...(invoiceNumber.trim() && { invoice_number: invoiceNumber.trim() }),  // BUG-055
        ...(isSplit && {
          partial_payments: legs
            .filter(l => l.mode && Number(l.amount) > 0)
            .map(l => ({
              payment_mode: l.mode,
              amount: Number(l.amount),
              ...(l.ref && { transaction_id: l.ref }),
            })),
        }),
        purchase_items: validRows.map(r => ({
          Ingredient: Number(r.itemId),  // capital I — API contract
          Unit:       r.unit,            // capital U — API contract
          quantity:   Number(r.qty),
          rate:       Number(r.rate) || 0,
          Amount:     Number(r.amount) || 0, // capital A — API contract
          batch:      r.batch.trim(),
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

  // ── Early returns ─────────────────────────────────────────────
  if (blocked) {
    return (
      <div data-testid="procurement-blocked" className="flex flex-col items-center justify-center py-16 text-center">
        <ShieldX className="h-10 w-10 text-muted-foreground mb-3" />
        <h2 className="text-sm font-semibold mb-1">Direct Vendor Procurement Disabled</h2>
        <p className="text-xs text-muted-foreground max-w-sm">
          Stock is received from your parent store via inventory transfers. Contact your Central Store manager to enable direct vendor purchasing.
        </p>
      </div>
    );
  }

  if (poRequired) return <Navigate to="/purchase/orders" replace />;
  if (loading) return <div className="p-4"><LoadingState lines={5} /></div>;
  if (error) return <div className="p-4"><ErrorState message={error} onRetry={fetchData} /></div>;

  // ── Success screen (CR-047 — shows transactionId) ─────────────
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
            <div className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1.5 text-[11px] font-semibold text-green-700" data-testid="transaction-id">
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

  // ── Confirm screen (CR-047 — per-line prices + split payment breakdown) ──
  if (confirmMode && isFormValid) {
    return (
      <div data-testid="procurement-confirm">
        <h1 className="text-sm font-bold flex items-center gap-2 mb-3">
          <CheckCircle2 className="h-4 w-4" /> Confirm Stock Purchase
        </h1>
        <div className="rounded-lg border bg-card mb-3">
          <div className="px-4 py-2.5 border-b bg-muted/30">
            {/* BUG-058: flex-wrap so Fare + Invoice # appear naturally when present */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Vendor</p>
                <p className="font-medium">{selectedVendor?.vendor_name || vendorId}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Date</p>
                <p className="font-medium">{purchaseDate}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Payment</p>
                <p className="font-medium text-[11px]">
                  {isSplit
                    ? legs.filter(l => l.mode && Number(l.amount) > 0).map(l => `${l.mode}: ₹${Number(l.amount).toFixed(2)}`).join(" + ")
                    : (legs[0]?.mode || "—")}
                </p>
              </div>
              {Number(fare) > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Fare</p>
                  <p className="font-medium">₹{Number(fare).toFixed(2)}</p>
                </div>
              )}
              {invoiceNumber.trim() && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Invoice #</p>
                  <p className="font-medium font-mono text-[11px]">{invoiceNumber.trim()}</p>
                </div>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/30">
                <tr>
                  {["Item", "Qty", "Unit", "Rate", "Amount", "Batch", "Expiry"].map(h => (
                    <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-3 py-1.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {validRows.map(r => (
                  <tr key={r.key} className="border-t">
                    <td className="px-3 py-2 font-medium">{r.title}</td>
                    <td className="px-3 py-2 tabular-nums">{r.qty}</td>
                    <td className="px-3 py-2">{r.unit}</td>
                    <td className="px-3 py-2 tabular-nums">{r.rate ? `₹${Number(r.rate).toFixed(2)}` : "—"}</td>
                    <td className="px-3 py-2 tabular-nums font-medium">{r.amount ? `₹${Number(r.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}</td>
                    <td className="px-3 py-2"><Badge variant="secondary" className="text-[10px]">{r.batch}</Badge></td>
                    <td className="px-3 py-2 text-muted-foreground">{r.expiry || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* BUG-058: items subtotal + fare breakdown — shown only when fare > 0 */}
          {Number(fare) > 0 && (
            <div className="border-t">
              <div className="px-4 py-1.5 flex justify-between text-xs text-muted-foreground">
                <span>Items subtotal</span>
                <span className="tabular-nums">₹ {grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="px-4 py-1.5 flex justify-between text-xs text-muted-foreground border-t border-border/30">
                <span>Fare</span>
                <span className="tabular-nums">₹ {Number(fare).toFixed(2)}</span>
              </div>
            </div>
          )}
          <div className="px-4 py-2.5 border-t bg-green-50 flex justify-between items-center">
            <span className="text-[11px] font-medium text-green-700">Grand Total</span>
            <span className="text-sm font-bold text-green-700 tabular-nums">
              ₹ {fullPayableTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
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

  // ── Main form ─────────────────────────────────────────────────
  return (
    <div data-testid="add-stock-purchase-form">
      <h1 className="text-sm font-bold flex items-center gap-2 mb-3">
        <PackagePlus className="h-4 w-4" /> Procurement — Add Stock
      </h1>

      <Tabs defaultValue="manual">
        <TabsList className="mb-3" data-testid="procurement-tabs">
          <TabsTrigger value="upload" data-testid="tab-upload-invoice">Upload Invoice</TabsTrigger>
          <TabsTrigger value="manual" data-testid="tab-manual-entry">Manual Entry</TabsTrigger>
        </TabsList>

        {/* ── Upload Invoice Tab — CR-039 PRESERVED UNCHANGED ────── */}
        <TabsContent value="upload">
          <Card className="mb-4">
            <CardHeader className="py-2.5 px-4">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Step 1 — Upload Invoice</CardTitle>
            </CardHeader>
            <CardContent className="py-4 px-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center bg-muted/20 mb-4" data-testid="invoice-upload-zone">
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-semibold">Drop invoice here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG — max 10MB</p>
                <p className="text-[10px] text-muted-foreground mt-1">Supports printed invoices and handwritten bills</p>
                <Input type="file" accept="image/*,.pdf" className="mt-3 max-w-xs mx-auto h-8 text-xs" data-testid="invoice-file-input" />
              </div>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800" data-testid="ocr-pending-notice">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold">AI Invoice Extraction — Coming Soon</p>
                  <p className="text-[10px] mt-0.5">Automatic item matching, price comparison, and duplicate detection require backend setup (G-014). Use Manual Entry tab for now.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Excel Upload — CR-039 G-015 wired */}
          <Card className="mb-4">
            <CardHeader className="py-2.5 px-4">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Or Import Excel / CSV</CardTitle>
            </CardHeader>
            <CardContent className="py-4 px-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center bg-muted/20" data-testid="excel-upload-zone">
                  <FileSpreadsheet className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs font-semibold">Drop Excel/CSV here</p>
                  <p className="text-[10px] text-muted-foreground mt-1">.xlsx, .xls, .csv — max 5MB</p>
                  <Input
                    type="file" accept=".xlsx,.xls,.csv"
                    className="mt-2 max-w-[200px] mx-auto h-7 text-xs"
                    data-testid="excel-file-input"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 5 * 1024 * 1024) { toast({ title: "File too large (max 5MB)", variant: "destructive" }); return; }
                      try {
                        setExcelParsing(true); setExcelError(null); setExcelRows([]);
                        const resp = await api.parsePOImport(file);
                        const body = resp.data?.data || resp.data || {};
                        const r = body.items || body.rows || body.lines || [];
                        if (r.length === 0) setExcelError("No items parsed from the file.");
                        else setExcelRows(r);
                      } catch (err) {
                        setExcelError(err?.response?.data?.message || "Failed to parse file");
                      } finally { setExcelParsing(false); }
                    }}
                  />
                  {excelParsing && <p className="text-[10px] text-muted-foreground mt-2"><Loader2 className="h-3 w-3 inline animate-spin mr-1" />Parsing…</p>}
                </div>
                <div className="border border-border rounded-lg p-6 text-center">
                  <p className="text-xs font-semibold mb-1">Need a template?</p>
                  <p className="text-[10px] text-muted-foreground mb-3">Download format with items pre-filled</p>
                  <Button variant="outline" size="sm" className="text-xs" data-testid="download-template-btn"
                    onClick={async () => {
                      try {
                        const resp = await api.getPOImportTemplate();
                        const url = URL.createObjectURL(resp.data);
                        const a = document.createElement("a"); a.href = url; a.download = "po_import_template.xlsx"; a.click();
                        URL.revokeObjectURL(url);
                      } catch (err) {
                        toast({ title: err?.response?.data?.message || "Failed to download template", variant: "destructive" });
                      }
                    }}>
                    <Download className="h-3 w-3 mr-1" /> Download Template
                  </Button>
                </div>
              </div>
              {/* CR-039 — parsed rows preview */}
              {excelError && (
                <div className="flex items-start gap-2 p-2 mt-3 rounded bg-destructive/10 text-destructive text-[10px]">
                  <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                  <span>{excelError}</span>
                </div>
              )}
              {excelRows.length > 0 && (
                <div className="mt-3" data-testid="excel-preview">
                  <p className="text-[10px] font-semibold text-muted-foreground mb-1">{excelRows.length} items parsed</p>
                  <div className="border rounded max-h-40 overflow-auto text-[10px]">
                    <table className="w-full">
                      <thead className="bg-muted/50 sticky top-0"><tr>
                        {Object.keys(excelRows[0]).slice(0, 5).map((k) => <th key={k} className="px-2 py-1 text-left font-medium">{k}</th>)}
                      </tr></thead>
                      <tbody>
                        {excelRows.slice(0, 20).map((row, i) => (
                          <tr key={i} className="border-t">{Object.values(row).slice(0, 5).map((v, j) => <td key={j} className="px-2 py-0.5">{String(v ?? "")}</td>)}</tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Button size="sm" className="mt-2 h-7 text-[10px] gap-1" data-testid="excel-continue-po"
                    onClick={() => navigate("/purchase/orders/new", { state: { importedLines: excelRows } })}>
                    Continue to PO Create <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Manual Entry Tab — CR-047 spreadsheet UX ─────────── */}
        <TabsContent value="manual">

          {/* Header strip: Vendor | Date | Fare || Payment */}
          <Card className="mb-2">
            <CardContent className="py-2.5 px-3">
              <div className="flex gap-2 items-start">

                {/* Vendor */}
                <div style={{ flex: "1.2", minWidth: 0 }}>
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
                  {vendors.length === 0 && <p className="text-[9px] text-amber-600 mt-0.5">No vendors. Add one in Vendor Management.</p>}
                </div>

                {/* Purchase Date */}
                <div style={{ flex: "1.0", minWidth: 0 }}>
                  <p className="text-[10px] font-medium text-muted-foreground mb-1">Purchase Date</p>
                  <Input data-testid="purchase-date" type="date" value={purchaseDate}
                    onChange={e => setPurchaseDate(e.target.value)} className="h-8 text-xs" />
                </div>

                {/* Invoice # — BUG-055 */}
                <div style={{ flex: "0.9", minWidth: 0 }}>
                  <p className="text-[10px] font-medium text-muted-foreground mb-1">Invoice #</p>
                  <Input data-testid="invoice-number-input" placeholder="e.g. INV-001"
                    value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)}
                    className="h-8 text-xs" />
                </div>

                {/* Fare */}
                <div style={{ flex: "0.55", minWidth: 0 }}>
                  <p className="text-[10px] font-medium text-muted-foreground mb-1">Fare</p>
                  <Input type="number" value={fare} min={0} step="0.01"
                    onChange={e => setFare(e.target.value)} className="h-8 text-xs"
                    style={{ MozAppearance: "textfield" }} />
                </div>

                {/* Divider */}
                <div className="w-px bg-border self-stretch mx-0.5 flex-shrink-0" />

                {/* Payment */}
                <div style={{ flex: "1.8", minWidth: 0 }}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-medium text-muted-foreground">Payment</p>
                    {legs.length < 4 && (
                      <button onClick={addLeg} data-testid="add-leg-btn"
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

              {/* Vendor context strip */}
              {selectedVendor && (
                <div className="flex items-center gap-1.5 mt-2 px-2 py-1 bg-muted/30 rounded text-[10px] text-muted-foreground" data-testid="vendor-context">
                  <Info className="h-2.5 w-2.5 shrink-0" />
                  <span>Vendor: <strong>{selectedVendor.vendor_name}</strong> · Contact: {selectedVendor.contact_person_name || "—"} · Phone: {selectedVendor.contact_number || "—"}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Spreadsheet table */}
          <Card className="mb-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 pt-2.5 pb-2 border-b border-muted/50">
              Items — Tab / Enter to navigate rows
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: 28 }} />
                  <col style={{ width: "22%" }} />
                  <col style={{ width: 70 }} />
                  <col style={{ width: 50 }} />
                  <col style={{ width: 80 }} />
                  <col style={{ width: 80 }} />
                  <col style={{ width: 110 }} />
                  <col style={{ width: 108 }} />
                  <col style={{ width: 28 }} />
                </colgroup>
                <thead className="bg-muted/30">
                  <tr>
                    {["#", "Item *", "Qty *", "Unit", "Unit Price", "Amount", "Batch *", "Expiry", ""].map((h, i) => (
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
                      onTabFromLast={addRow}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-3 py-2">
              <button onClick={addRow} data-testid="add-line-btn"
                className="w-full py-1.5 border border-dashed border-border rounded text-[11px] text-muted-foreground hover:border-primary hover:text-primary flex items-center justify-center gap-1 transition-colors">
                <Plus className="h-3 w-3" /> Add Another Item
              </button>
            </div>
            {/* Grand total bar */}
            <div className="mx-3 mb-3 flex items-center justify-between px-3 py-1.5 bg-green-50 border border-green-200 rounded-md">
              <span className="text-[11px] font-medium text-green-700">Grand Total (excl. fare)</span>
              <span className="text-sm font-bold text-green-700 tabular-nums">
                ₹ {grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </Card>

          {/* Action bar */}
          <div className="flex gap-2 items-center flex-wrap">
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
            {hasDuplicates && ( // BUG-051
              <span className="text-[10.5px] text-red-500 flex items-center gap-1" data-testid="duplicate-items-warning">
                <TriangleAlert className="h-3 w-3" />
                Remove duplicate items before confirming
              </span>
            )}
          </div>

        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── SpreadsheetRow ───────────────────────────────────────────────
// CR-047 — table row: item combobox (Popover+Command portal), auto-batch, in-place amount
function SpreadsheetRow({ idx, row, inventoryItems, ownStock, itemIdCount, isLast, canDelete, onUpdate, onDelete, onTabFromLast }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const justFocused = useRef(false); // BUG-059: guard against keyup firing on focus-transfer from batch Enter

  const isDuplicate = row.itemId && (itemIdCount[row.itemId] || 0) > 1;

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
  const amount = computeAmount(row.qty, row.rate);

  function computeAmount(qty, rate) {
    const q = Number(qty), r = Number(rate);
    return !isNaN(q) && !isNaN(r) && q > 0 && r > 0 ? q * r : 0;
  }

  function handleKeyDown(field, e) {
    const order = ["qty", "rate", "batch", "expiry"];
    if (e.key === "Tab" || e.key === "Enter") {
      const ci = order.indexOf(field);
      if (ci < order.length - 1) {
        e.preventDefault();
        document.getElementById(`${order[ci + 1]}-${idx}`)?.focus();
      } else if (!e.shiftKey) {
        e.preventDefault();
        if (isLast && row.itemId && Number(row.qty) > 0 && row.batch) {
          onTabFromLast();
          // BUG-057: after addRow re-renders, focus + open item search of new row
          setTimeout(() => {
            const btn = document.querySelector(`[data-testid="item-select-${idx + 1}"]`);
            if (btn) { btn.focus(); btn.click(); }
          }, 50);
        } else {
          // BUG-057: focus + open item search of next row directly
          const btn = document.querySelector(`[data-testid="item-select-${idx + 1}"]`);
          if (btn) { btn.focus(); btn.click(); }
        }
      }
    }
  }

  const td = "px-1 py-0.5 border-b border-muted/50 align-middle";

  return (
    <tr className="hover:bg-muted/10" data-testid={`purchase-line-${idx}`}>
      <td className={td + " text-center text-[10px] text-muted-foreground font-medium"}>{idx + 1}</td>

      {/* Item combobox — Popover portal solves overflow:hidden clipping */}
      <td className={td}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button data-testid={`item-select-${idx}`}
              className={`w-full h-[28px] text-left text-xs px-2 rounded border truncate flex items-center justify-between gap-1 transition-colors
                ${isDuplicate ? "border-amber-300 bg-amber-50 text-amber-800" : "border-border bg-background hover:border-muted-foreground/40"}`}>
              <span className="truncate text-xs">{row.title || <span className="text-muted-foreground">Search item…</span>}</span>
              {isDuplicate && <TriangleAlert className="h-3 w-3 text-amber-500 flex-shrink-0" title="Item already in another row" />}
            </button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-[300px]" align="start" side="bottom">
            <Command>
              <CommandInput placeholder="Search items…" value={search} onValueChange={setSearch} className="h-8 text-xs" />
              <CommandList className="max-h-[220px]">
                <CommandEmpty className="text-xs py-4 text-center text-muted-foreground">No items found</CommandEmpty>
                {Object.entries(grouped).map(([cat, items]) => (
                  <CommandGroup key={cat} heading={<span className="text-[10px] uppercase tracking-wide">{cat}</span>}>
                    {items.map(item => {
                      const isInOtherRow = itemIdCount[String(item.id)] > 0 && row.itemId !== String(item.id);
                      return (
                        <CommandItem key={item.id} value={item.stock_title}
                          onSelect={() => {
                            onUpdate("itemId", String(item.id));
                            setSearch(""); setOpen(false);
                            setTimeout(() => document.getElementById(`qty-${idx}`)?.focus(), 50);
                          }}
                          className="text-xs cursor-pointer">
                          <Check className={`h-3 w-3 mr-1.5 flex-shrink-0 ${row.itemId === String(item.id) ? "opacity-100 text-primary" : "opacity-0"}`} />
                          <span className="flex-1">{item.stock_title}</span>
                          <span className="text-[10px] text-muted-foreground ml-1">{item.unit}</span>
                          {isInOtherRow && <span className="text-[9px] text-amber-500 ml-1">↑ in form</span>}
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
          <p className="text-[9px] text-muted-foreground mt-0.5 truncate px-1">
            Stock: {stock.display_qty} {stock.display_unit}
          </p>
        )}
      </td>

      {/* Qty */}
      <td className={td}>
        <Input id={`qty-${idx}`} data-testid={`qty-input-${idx}`}
          type="number" min={0} step="any" value={row.qty} placeholder="0"
          onChange={e => onUpdate("qty", e.target.value)}
          onKeyDown={e => handleKeyDown("qty", e)}
          className="h-[28px] text-xs" style={{ MozAppearance: "textfield" }} />
      </td>

      {/* Unit */}
      <td className={td}>
        <div className="h-[28px] flex items-center justify-center text-[11px] text-muted-foreground bg-muted/30 rounded border border-border px-1">
          {row.unit || "—"}
        </div>
      </td>

      {/* Rate */}
      <td className={td}>
        <Input id={`rate-${idx}`} data-testid={`rate-input-${idx}`}
          type="number" min={0} step="0.01" value={row.rate} placeholder="0.00"
          onChange={e => onUpdate("rate", e.target.value)}
          onKeyDown={e => handleKeyDown("rate", e)}
          className="h-[28px] text-xs" style={{ MozAppearance: "textfield" }} />
      </td>

      {/* Amount (auto-computed, read-only) */}
      <td className={td}>
        <Input type="number" value={amount > 0 ? amount.toFixed(2) : ""} readOnly tabIndex={-1}
          placeholder="0.00"
          className={`h-[28px] text-xs tabular-nums ${amount > 0 ? "bg-green-50 border-green-200 text-green-700" : ""}`}
          style={{ MozAppearance: "textfield" }} />
      </td>

      {/* Batch */}
      <td className={td}>
        <Input id={`batch-${idx}`} data-testid={`batch-input-${idx}`}
          value={row.batch} placeholder="AUTO"
          onChange={e => onUpdate("batch", e.target.value)}
          onKeyDown={e => handleKeyDown("batch", e)}
          className={`h-[28px] text-xs ${row.batch ? "bg-green-50 border-green-200 text-green-700" : ""}`} />
      </td>

      {/* Expiry — optional (no * in header) */}
      <td className={td}>
        <Input id={`expiry-${idx}`} data-testid={`expiry-input-${idx}`}
          type="date" value={row.expiry} autoComplete="off"
          onChange={e => onUpdate("expiry", e.target.value)}
          onFocus={() => { justFocused.current = true; }}
          onKeyUp={e => { // BUG-059: skip the keyup that fires when focus arrives via batch Enter
            if (justFocused.current) { justFocused.current = false; return; }
            handleKeyDown("expiry", e);
          }}
          className="h-[28px] text-xs" />
      </td>

      {/* Delete */}
      <td className={td}>
        {canDelete && (
          <button onClick={onDelete}
            className="h-[22px] w-[22px] flex items-center justify-center rounded text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors">
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </td>
    </tr>
  );
}

// ── PaymentLegs ──────────────────────────────────────────────────
// CR-047 — single / split payment. Ref sub-row for UPI + Bank Transfer.
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
              {/* Main leg row */}
              <div className="flex items-center gap-1">
                <select value={leg.mode} onChange={e => onUpdateLeg(i, "mode", e.target.value)}
                  className="h-[28px] text-xs border border-border rounded px-1 flex-shrink-0 bg-background"
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
                    className="h-[18px] w-[18px] flex items-center justify-center text-muted-foreground hover:text-red-500 flex-shrink-0 transition-colors">
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
              {/* Ref sub-row — UPI / Bank Transfer only */}
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
