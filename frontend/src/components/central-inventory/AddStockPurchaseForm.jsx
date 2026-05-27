import { useState, useEffect, useCallback } from "react";
import { useLoginContext } from "@/hooks/useLoginContext";
import { useWriteAction } from "@/hooks/useWriteAction";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingState, ErrorState } from "@/components/common/StateDisplays";
import { toast } from "@/hooks/use-toast";
import { PackagePlus, Loader2, Plus, Trash2, ChevronDown, ChevronUp, ShieldX, CheckCircle2, Upload } from "lucide-react";

export default function AddStockPurchaseForm() {
  const { restaurantType, isTopLevel } = useLoginContext();
  const { submitting, execute } = useWriteAction();

  const [inventoryItems, setInventoryItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState(null);
  const [showCommercial, setShowCommercial] = useState(false);
  const [confirmMode, setConfirmMode] = useState(false);

  // Multi-line items
  const [lines, setLines] = useState([createEmptyLine()]);

  // Shared fields
  const [vendorId, setVendorId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentType, setPaymentType] = useState("");
  const [billFile, setBillFile] = useState(null);

  function createEmptyLine() {
    return { key: Math.random().toString(36).slice(2), itemId: "", quantity: "", unit: "", stockTitle: "", batch: "", expiryDate: "", price: "", amount: "" };
  }

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setBlocked(false);
    try {
      const [invResp, vendorResp] = await Promise.allSettled([
        api.getInventoryMaster(),
        api.getVendors(),
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
        if (code === "VENDOR_PURCHASE_NOT_ALLOWED") {
          setBlocked(true);
        }
      }
    } catch (err) {
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

  const resetForm = () => {
    setLines([createEmptyLine()]);
    setVendorId("");
    setPurchaseDate(new Date().toISOString().split("T")[0]);
    setPaymentType("");
    setBillFile(null);
    setShowCommercial(false);
    setConfirmMode(false);
  };

  const handleSubmit = async () => {
    if (!isValid || submitting) return;

    // Submit each line as a separate add-stock call
    let successCount = 0;
    let lastResult = null;

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
        const resp = await execute(() => api.addStockPurchase(line.itemId, payload), {
          successMsg: null, // We'll show our own toast
        });
        if (resp) { successCount++; lastResult = resp.data || resp; }
      } catch { /* individual line errors handled by execute */ }
    }

    if (successCount > 0) {
      toast({
        title: `${successCount} item${successCount > 1 ? "s" : ""} added to stock`,
        variant: "default",
      });
      resetForm();
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

  // Confirmation view
  if (confirmMode && isValid) {
    const vendorObj = vendors.find((v) => String(v.id) === String(vendorId));
    return (
      <div data-testid="procurement-confirm">
        <h1 className="text-lg font-bold flex items-center gap-2 mb-4"><PackagePlus className="h-5 w-5" /> Confirm Stock Purchase</h1>
        <Card className="mb-4">
          <CardContent className="py-4 px-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-[10px] text-muted-foreground">Vendor</p><p className="text-xs font-medium">{vendorObj?.vendor_name || vendorId}</p></div>
              <div><p className="text-[10px] text-muted-foreground">Purchase Date</p><p className="text-xs">{purchaseDate || "Today"}</p></div>
            </div>
            <div className="border-t pt-2 space-y-2">
              {validLines.map((line, idx) => {
                const item = inventoryItems.find((i) => String(i.id) === String(line.itemId));
                return (
                  <div key={line.key} className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-medium">{item?.stock_title || line.stockTitle}</span>
                      {line.batch && <span className="text-muted-foreground ml-2">Batch: {line.batch}</span>}
                      {line.expiryDate && <span className="text-muted-foreground ml-2">Exp: {line.expiryDate}</span>}
                    </div>
                    <span className="font-mono font-medium">{line.quantity} {line.unit}</span>
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
      <h1 className="text-lg font-bold flex items-center gap-2 mb-4"><PackagePlus className="h-5 w-5" /> Add Stock (Vendor Purchase)</h1>

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
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card className="mb-4">
        <CardHeader className="py-2.5 px-4">
          <CardTitle className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Items</CardTitle>
        </CardHeader>
        <CardContent className="py-0 px-4 pb-3">
          <div className="space-y-3">
            {lines.map((line, idx) => (
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
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={addLine} className="h-7 text-xs gap-1 w-full mt-2" data-testid="add-line-btn">
            <Plus className="h-3 w-3" /> Add Another Item
          </Button>
        </CardContent>
      </Card>

      {/* Commercial + file upload toggle */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => setShowCommercial(!showCommercial)} className="h-7 text-xs gap-1">
          {showCommercial ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {showCommercial ? "Hide" : "Show"} Commercial Fields
        </Button>
        {showCommercial && (
          <div className="flex items-center gap-2">
            <Select value={paymentType} onValueChange={setPaymentType}>
              <SelectTrigger className="h-7 text-xs w-28"><SelectValue placeholder="Payment" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Credit">Credit</SelectItem>
                <SelectItem value="Online">Online</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Bill upload */}
      <Card className="mb-4">
        <CardContent className="py-3 px-4">
          <Label className="text-xs flex items-center gap-1.5 mb-2"><Upload className="h-3.5 w-3.5" /> Bill / Invoice (optional)</Label>
          <Input
            data-testid="bill-upload"
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => setBillFile(e.target.files?.[0] || null)}
            className="h-8 text-xs"
          />
          {billFile && <p className="text-[10px] text-muted-foreground mt-1">{billFile.name} ({(billFile.size / 1024).toFixed(1)} KB)</p>}
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={resetForm} disabled={submitting}>Reset</Button>
        <Button data-testid="review-purchase-btn" onClick={() => setConfirmMode(true)} disabled={!isValid || submitting}>
          Review & Confirm ({validLines.length} item{validLines.length !== 1 ? "s" : ""})
        </Button>
      </div>
    </div>
  );
}
