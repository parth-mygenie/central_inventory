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
import { PackagePlus, Loader2, Plus, Trash2, ChevronDown, ChevronUp, ShieldX, CheckCircle2, Upload, FileSpreadsheet, AlertTriangle, Info, Download } from "lucide-react";

export default function AddStockPurchaseForm() {
  const { restaurantType, isTopLevel } = useLoginContext();
  const { submitting, execute } = useWriteAction();

  const [inventoryItems, setInventoryItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [ownStock, setOwnStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState(null);
  const [showCommercial, setShowCommercial] = useState(false);
  const [confirmMode, setConfirmMode] = useState(false);
  const [successResult, setSuccessResult] = useState(null);

  // Multi-line items
  const [lines, setLines] = useState([createEmptyLine()]);

  // Shared fields
  const [vendorId, setVendorId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentType, setPaymentType] = useState("");

  function createEmptyLine() {
    return { key: Math.random().toString(36).slice(2), itemId: "", quantity: "", unit: "", stockTitle: "", batch: "", expiryDate: "", price: "", amount: "" };
  }

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setBlocked(false);
    try {
      const [invResp, vendorResp, stockResp] = await Promise.allSettled([
        api.getInventoryMaster(),
        api.getVendors(),
        api.getStockInventory(),
      ]);

      if (invResp.status === "fulfilled") {
        const invData = invResp.value.data?.data || invResp.value.data || [];
        setInventoryItems(Array.isArray(invData) ? invData : []);
      }

      if (vendorResp.status === "fulfilled") {
        const vData = vendorResp.value.data?.data || vendorResp.value.data || [];
        setVendors(Array.isArray(vData) ? vData : []);
      } else {
        const code = vendorResp.reason?.response?.data?.errors?.[0]?.code || "";
        if (code === "VENDOR_PURCHASE_NOT_ALLOWED") setBlocked(true);
      }

      if (stockResp.status === "fulfilled") {
        setOwnStock(stockResp.value.data?.current_stocks || []);
      }
    } catch {
      setError("Failed to load form data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateLine = (idx, field, value) => {
    setLines((prev) => {
      const next = [...prev];
      const row = { ...next[idx] };
      if (field === "itemId") {
        const item = inventoryItems.find((i) => String(i.id) === String(value));
        row.itemId = value;
        row.unit = item?.unit || item?.display_unit || "";
        row.stockTitle = item?.stock_title || "";
      } else {
        row[field] = value;
      }
      next[idx] = row;
      return next;
    });
  };

  const addLine = () => setLines((prev) => [...prev, createEmptyLine()]);
  const removeLine = (idx) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const validLines = lines.filter((l) => l.itemId && Number(l.quantity) > 0);
  const isValid = validLines.length > 0 && vendorId;

  const selectedVendor = vendors.find((v) => String(v.id) === String(vendorId));

  const resetForm = () => {
    setLines([createEmptyLine()]);
    setVendorId("");
    setPurchaseDate(new Date().toISOString().split("T")[0]);
    setPaymentType("");
    setShowCommercial(false);
    setConfirmMode(false);
    setSuccessResult(null);
  };

  const handleSubmit = async () => {
    if (!isValid || submitting) return;
    let successCount = 0;

    for (const line of validLines) {
      const payload = {
        quantity: Number(line.quantity),
        unit: line.unit,
        vendor_id: Number(vendorId),
      };
      if (line.batch.trim()) payload.batch = line.batch.trim();
      if (line.expiryDate) payload.expiry_date = line.expiryDate;
      if (purchaseDate) payload.purchase_date = purchaseDate;
      if (paymentType) payload.payment_type = paymentType;
      if (line.price) payload.price = Number(line.price);
      if (line.amount) payload.tot_amount = Number(line.amount);

      try {
        const resp = await execute(() => api.addStockPurchase(line.itemId, payload), { successMsg: null });
        if (resp) successCount++;
      } catch { /* handled by execute */ }
    }

    if (successCount > 0) {
      toast({ title: `${successCount} item${successCount > 1 ? "s" : ""} added to stock`, variant: "default" });
      setSuccessResult({ count: successCount, vendor: selectedVendor?.vendor_name || "" });
      setConfirmMode(false);
    }
  };

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

  if (loading) return <div className="p-4"><LoadingState lines={5} /></div>;
  if (error) return <div className="p-4"><ErrorState message={error} onRetry={fetchData} /></div>;

  // Success confirmation
  if (successResult) {
    return (
      <div data-testid="procurement-success">
        <h1 className="text-lg font-bold flex items-center gap-2 mb-4"><PackagePlus className="h-5 w-5" /> Procurement</h1>
        <PostSubmitConfirmation
          itemCount={successResult.count}
          summary={`Vendor: ${successResult.vendor}`}
          destinationName="your inventory"
          onDismiss={resetForm}
        />
        <Button onClick={resetForm} variant="outline" size="sm" data-testid="new-purchase-btn">New Purchase</Button>
      </div>
    );
  }

  // Confirmation view
  if (confirmMode && isValid) {
    return (
      <div data-testid="procurement-confirm">
        <h1 className="text-lg font-bold flex items-center gap-2 mb-4"><PackagePlus className="h-5 w-5" /> Confirm Stock Purchase</h1>
        <Card className="mb-4">
          <CardContent className="py-4 px-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-[10px] text-muted-foreground">Vendor</p><p className="text-xs font-medium">{selectedVendor?.vendor_name || vendorId}</p></div>
              <div><p className="text-[10px] text-muted-foreground">Purchase Date</p><p className="text-xs">{purchaseDate || "Today"}</p></div>
            </div>
            <div className="border-t pt-2 space-y-2">
              {validLines.map((line) => {
                const item = inventoryItems.find((i) => String(i.id) === String(line.itemId));
                const stock = ownStock.find((s) => s.stock_title === (item?.stock_title || line.stockTitle));
                return (
                  <div key={line.key} className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-medium">{item?.stock_title || line.stockTitle}</span>
                      {line.batch && <span className="text-muted-foreground ml-2">Batch: {line.batch}</span>}
                      {line.expiryDate && <span className="text-muted-foreground ml-2">Exp: {line.expiryDate}</span>}
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-medium">{line.quantity} {line.unit}</span>
                      {stock && (
                        <span className="text-[10px] text-muted-foreground ml-2">
                          (now: {stock.display_qty} → {(Number(stock.display_qty) + Number(line.quantity)).toFixed(2)} after)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground border-t pt-2">
              This will increase stock at your store. This is a vendor purchase — not a transfer receive.
            </p>
          </CardContent>
        </Card>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setConfirmMode(false)} disabled={submitting}>Back to Edit</Button>
          <Button data-testid="confirm-purchase-btn" onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Confirm & Add Stock
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="add-stock-purchase-form">
      <h1 className="text-lg font-bold flex items-center gap-2 mb-4"><PackagePlus className="h-5 w-5" /> Procurement — Add Stock</h1>
      <p className="text-xs text-muted-foreground mb-4">Purchase stock from vendors. Upload invoice or enter manually.</p>

      {/* 3-Mode Tab Interface */}
      <Tabs defaultValue="manual" className="mb-4">
        <TabsList className="mb-4" data-testid="procurement-tabs">
          <TabsTrigger value="upload" data-testid="tab-upload-invoice">Upload Invoice</TabsTrigger>
          <TabsTrigger value="manual" data-testid="tab-manual-entry">Manual Entry</TabsTrigger>
        </TabsList>

        {/* Upload Invoice Tab */}
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

          {/* Excel Upload */}
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
                  <Input type="file" accept=".xlsx,.xls,.csv" className="mt-2 max-w-[200px] mx-auto h-7 text-xs" data-testid="excel-file-input" />
                </div>
                <div className="border border-border rounded-lg p-6 text-center">
                  <p className="text-xs font-semibold mb-1">Need a template?</p>
                  <p className="text-[10px] text-muted-foreground mb-3">Download format with items pre-filled</p>
                  <Button variant="outline" size="sm" className="text-xs" data-testid="download-template-btn">
                    <Download className="h-3 w-3 mr-1" /> Download Template
                  </Button>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2 mt-3 rounded bg-muted/30 text-[10px] text-muted-foreground">
                <Info className="h-3 w-3 mt-0.5 shrink-0" />
                <span>Excel parsing requires backend setup (G-015). Template download will be available once configured.</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manual Entry Tab */}
        <TabsContent value="manual">
          {/* Vendor + Date */}
          <Card className="mb-4">
            <CardContent className="py-3 px-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Vendor *</Label>
                  <Select value={vendorId} onValueChange={setVendorId}>
                    <SelectTrigger data-testid="vendor-select" className="h-8 text-xs">
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map((v) => (
                        <SelectItem key={v.id} value={String(v.id)}>{v.vendor_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {vendors.length === 0 && <p className="text-[10px] text-amber-600 mt-1">No vendors found. Add one in Vendor Management first.</p>}
                </div>
                <div>
                  <Label className="text-xs">Purchase Date</Label>
                  <Input data-testid="purchase-date" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className="h-8 text-xs" />
                </div>
              </div>
              {/* Vendor context */}
              {selectedVendor && (
                <div className="flex items-center gap-2 mt-2 px-2 py-1.5 bg-muted/30 rounded text-[10px] text-muted-foreground" data-testid="vendor-context">
                  <Info className="h-3 w-3 shrink-0" />
                  <span>Vendor: <strong>{selectedVendor.vendor_name}</strong> · Contact: {selectedVendor.contact_person_name || "—"} · Phone: {selectedVendor.contact_number || "—"}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card className="mb-4">
            <CardHeader className="py-2.5 px-4">
              <CardTitle className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Items</CardTitle>
            </CardHeader>
            <CardContent className="py-0 px-4 pb-3">
              <div className="space-y-3">
                {lines.map((line, idx) => {
                  const itemObj = inventoryItems.find((i) => String(i.id) === String(line.itemId));
                  const stock = ownStock.find((s) => s.stock_title === (itemObj?.stock_title || line.stockTitle));
                  return (
                  <div key={line.key} className="border rounded-md p-3 space-y-2" data-testid={`purchase-line-${idx}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground font-medium">Item {idx + 1}</span>
                      {lines.length > 1 && (
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive" onClick={() => removeLine(idx)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <Label className="text-[10px]">Item *</Label>
                        <Select value={line.itemId ? String(line.itemId) : ""} onValueChange={(v) => updateLine(idx, "itemId", v)}>
                          <SelectTrigger data-testid={`item-select-${idx}`} className="h-7 text-xs">
                            <SelectValue placeholder="Select item" />
                          </SelectTrigger>
                          <SelectContent>
                            {inventoryItems.map((item) => (
                              <SelectItem key={item.id} value={String(item.id)}>
                                {item.stock_title} ({item.unit || item.display_unit})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[10px]">Qty *</Label>
                        <div className="flex gap-1">
                          <Input data-testid={`qty-input-${idx}`} type="number" min={0} step="any" value={line.quantity} onChange={(e) => updateLine(idx, "quantity", e.target.value)} className="h-7 text-xs" placeholder="0" />
                          <Input value={line.unit} readOnly className="h-7 text-xs bg-muted w-14" tabIndex={-1} />
                        </div>
                      </div>
                    </div>

                    {/* Current stock context */}
                    {stock && (
                      <div className="flex items-center gap-3 px-2 py-1 bg-muted/30 rounded text-[10px]" data-testid={`stock-context-${idx}`}>
                        <span className="text-muted-foreground">Current: <strong className="tabular-nums">{stock.display_qty} {stock.display_unit}</strong></span>
                        {line.quantity && Number(line.quantity) > 0 && (
                          <span className="text-muted-foreground">→ <strong className="tabular-nums text-emerald-600">{(Number(stock.display_qty) + Number(line.quantity)).toFixed(2)}</strong> after</span>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px]">Batch Label</Label>
                        <Input data-testid={`batch-input-${idx}`} value={line.batch} onChange={(e) => updateLine(idx, "batch", e.target.value)} placeholder="e.g. MAIDA-MAY-01" className="h-7 text-xs" />
                      </div>
                      <div>
                        <Label className="text-[10px]">Expiry Date</Label>
                        <Input data-testid={`expiry-input-${idx}`} type="date" value={line.expiryDate} onChange={(e) => updateLine(idx, "expiryDate", e.target.value)} className="h-7 text-xs" min={new Date(Date.now() + 86400000).toISOString().split("T")[0]} />
                      </div>
                    </div>
                    {showCommercial && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px]">Unit Price</Label>
                          <Input data-testid={`price-input-${idx}`} type="number" step="0.01" value={line.price} onChange={(e) => updateLine(idx, "price", e.target.value)} placeholder="0.00" className="h-7 text-xs" />
                        </div>
                        <div>
                          <Label className="text-[10px]">Total Amount</Label>
                          <Input data-testid={`amount-input-${idx}`} type="number" step="0.01" value={line.amount} onChange={(e) => updateLine(idx, "amount", e.target.value)} placeholder="0.00" className="h-7 text-xs" />
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
              <Button variant="ghost" size="sm" onClick={addLine} className="h-7 text-xs gap-1 w-full mt-2" data-testid="add-line-btn">
                <Plus className="h-3 w-3" /> Add Another Item
              </Button>
            </CardContent>
          </Card>

          {/* Commercial toggle */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Button variant="ghost" size="sm" onClick={() => setShowCommercial(!showCommercial)} className="h-7 text-xs gap-1">
              {showCommercial ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {showCommercial ? "Hide" : "Show"} Commercial Fields
            </Button>
            {showCommercial && (
              <Select value={paymentType} onValueChange={setPaymentType}>
                <SelectTrigger className="h-7 text-xs w-28"><SelectValue placeholder="Payment" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Credit">Credit</SelectItem>
                  <SelectItem value="Online">Online</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetForm} disabled={submitting}>Reset</Button>
            <Button data-testid="review-purchase-btn" onClick={() => setConfirmMode(true)} disabled={!isValid || submitting}>
              Review & Confirm ({validLines.length} item{validLines.length !== 1 ? "s" : ""})
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
