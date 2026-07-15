import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLoginContext } from "@/hooks/useLoginContext";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingState, ErrorState } from "@/components/common/StateDisplays";
import ConfirmActionDialog from "./ConfirmActionDialog";
import { ArrowLeft, Loader2, Send, Check, X, Trash2, Package, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const STATUS_COLORS = {
  draft: "bg-slate-100 text-slate-700",
  approved: "bg-blue-50 text-blue-700",
  sent: "bg-indigo-50 text-indigo-700",
  partially_received: "bg-amber-50 text-amber-700",
  received: "bg-emerald-50 text-emerald-700",
  closed: "bg-slate-50 text-slate-600",
  cancelled: "bg-red-50 text-red-600",
};

function formatCurrency(n) {
  if (n == null || isNaN(n)) return "\u20B90";
  return `\u20B9${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function StatusTimeline({ status }) {
  const steps = ["draft", "sent", "received", "closed"];
  const cancelledIdx = status === "cancelled" ? -1 : null;
  const currentIdx = steps.indexOf(status === "partially_received" ? "received" : status === "approved" ? "draft" : status);

  return (
    <div className="flex items-center gap-1 mb-4" data-testid="po-status-timeline">
      {steps.map((s, i) => {
        const isActive = i <= currentIdx;
        const isCancelled = status === "cancelled";
        return (
          <div key={s} className="flex items-center gap-1">
            <div className={`px-2 py-0.5 rounded text-[10px] font-medium ${
              isCancelled ? "bg-red-50 text-red-600" :
              isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>{s.replace(/_/g, " ")}</div>
            {i < steps.length - 1 && <div className={`w-6 h-0.5 ${isActive && !isCancelled ? "bg-primary" : "bg-muted"}`} />}
          </div>
        );
      })}
      {status === "cancelled" && <Badge variant="destructive" className="text-[10px] ml-2">Cancelled</Badge>}
    </div>
  );
}

export default function PurchaseOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { restaurantId } = useLoginContext();

  const [po, setPO] = useState(null);
  const [stockMap, setStockMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showReceive, setShowReceive] = useState(false);
  const [receiveLines, setReceiveLines] = useState([]);
  const [receiveDate, setReceiveDate] = useState(new Date().toISOString().split("T")[0]);
  const [receivePayment, setReceivePayment] = useState("Cash");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [receiving, setReceiving] = useState(false);
  // CR-040 — G-016 invoice duplicate pre-check
  const [invoiceCheck, setInvoiceCheck] = useState(null); // null | {available, existing_po_reference_code} | {error: string}
  const [invoiceChecking, setInvoiceChecking] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [resp, stockResp] = await Promise.all([api.getPODetail(id), api.getStockInventory()]);
      const data = resp.data?.data || resp.data;
      setPO(data);
      // Build stock map for context columns
      const stocks = stockResp.data?.current_stocks || [];
      const sMap = {};
      stocks.forEach((s) => { sMap[s.id] = s; sMap[s.stock_title] = s; });
      setStockMap(sMap);
      // Init receive lines
      if (data?.lines) {
        setReceiveLines(data.lines.map((l) => ({
          line_id: l.id,
          inventory_master_id: l.inventory_master_id,
          stock_title: l.stock_title || l.ingredient_name || `Item ${l.inventory_master_id}`,
          ordered_qty: Number(l.ordered_qty) || 0,
          ordered_unit: l.ordered_unit || l.unit,
          expected_rate: Number(l.expected_rate) || 0,
          received_qty: "",
          actual_rate: "",
          batch: "",
          expiry_date: "",
          skip: false,
        })));
      }
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load PO detail");
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  // CR-040 — G-016: debounced invoice-number duplicate pre-check.
  // Warn-only (non-blocking). Fires when both vendor_id and invoice_number are set.
  useEffect(() => {
    const trimmed = (invoiceNumber || "").trim();
    if (!trimmed || !po?.vendor_id) {
      setInvoiceCheck(null);
      return undefined;
    }
    setInvoiceChecking(true);
    const timer = setTimeout(async () => {
      try {
        const resp = await api.checkInvoiceNumber(po.vendor_id, trimmed);
        const body = resp.data || {};
        if (body.status === false) {
          setInvoiceCheck({ error: body.message || "Could not verify invoice number" });
        } else {
          setInvoiceCheck(body.data || { available: true });
        }
      } catch (e) {
        setInvoiceCheck({ error: e?.response?.data?.message || "Invoice check failed" });
      } finally {
        setInvoiceChecking(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [invoiceNumber, po?.vendor_id]);

  const handleAction = async (action) => {
    setActionLoading(action);
    try {
      if (action === "approve") await api.approvePO(id);
      else if (action === "send") await api.sendPO(id);
      else if (action === "close") await api.closePO(id);
      else if (action === "delete") { await api.deletePO(id); navigate("/purchase/orders"); return; }
      toast({ title: `PO ${action}d successfully` });
      fetchDetail();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.response?.data?.errors?.[0]?.message || `Failed to ${action}`;
      toast({ title: msg, variant: "destructive" });
    } finally { setActionLoading(null); }
  };

  const handleCancel = async () => {
    setActionLoading("cancel");
    try {
      await api.cancelPO(id, cancelReason);
      setCancelDialogOpen(false);
      toast({ title: "PO cancelled" });
      fetchDetail();
    } catch (e) {
      toast({ title: e?.response?.data?.message || "Cancel failed", variant: "destructive" });
    } finally { setActionLoading(null); }
  };

  const updateReceiveLine = (idx, field, value) => {
    setReceiveLines((prev) => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const handleReceive = async () => {
    const activeLines = receiveLines.filter((l) => !l.skip && Number(l.received_qty) > 0);
    if (activeLines.length === 0) { toast({ title: "Enter quantities for at least one line", variant: "destructive" }); return; }
    setReceiving(true);
    try {
      const payload = {
        purchase_date: receiveDate,
        payment_type: receivePayment,
        receive_lines: activeLines.map((l) => ({
          line_id: l.line_id,
          received_qty: Number(l.received_qty),
          actual_rate: Number(l.actual_rate) || l.expected_rate,
          batch: l.batch || undefined,
          expiry_date: l.expiry_date || undefined,
        })),
      };
      await api.receivePO(id, payload);
      toast({ title: "Goods received successfully" });
      setShowReceive(false);
      fetchDetail();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.response?.data?.errors?.[0]?.message || "Receive failed";
      toast({ title: msg, variant: "destructive" });
    } finally { setReceiving(false); }
  };

  if (loading) return <LoadingState lines={8} />;
  if (error) return <ErrorState message={error} onRetry={fetchDetail} />;
  if (!po) return <ErrorState message="PO not found" />;

  const status = po.status;
  const canApprove = status === "draft";
  const canSend = status === "draft" || status === "approved";
  const canReceive = status === "sent" || status === "partially_received";
  const canCancel = status !== "closed" && status !== "cancelled";
  const canDelete = status === "draft";
  const canClose = status === "received" || status === "partially_received";

  return (
    <div data-testid="purchase-order-detail">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" className="h-7" onClick={() => navigate("/purchase/orders")} data-testid="po-detail-back">
          <ArrowLeft className="h-3.5 w-3.5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold font-mono">{po.reference_code || `PO-${po.id}`}</h1>
          <p className="text-xs text-muted-foreground">{po.vendor_name || "Unknown Vendor"}</p>
        </div>
        <Badge variant="outline" className={`text-xs px-2 py-0.5 ${STATUS_COLORS[status] || ""}`}>
          {(status || "").replace(/_/g, " ")}
        </Badge>
      </div>

      <StatusTimeline status={status} />

      {!showReceive ? (
        <>
          {/* PO Details */}
          {/* BUG-044: Payment + Total hidden for pre-receive statuses */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className={`grid ${["received","closed","partially_received"].includes(status) ? "grid-cols-4" : "grid-cols-2"} gap-4 text-xs`}>
                <div><span className="text-muted-foreground block">Vendor</span><span className="font-medium">{po.vendor_name || "\u2014"}</span></div>
                <div><span className="text-muted-foreground block">Expected Delivery</span><span className="font-medium">{po.expected_delivery_date || "Not set"}</span></div>
                {["received","closed","partially_received"].includes(status) && (
                  <>
                    <div><span className="text-muted-foreground block">Payment</span><span className="font-medium">{po.payment_type || "\u2014"}</span></div>
                    <div><span className="text-muted-foreground block">Total</span><span className="font-semibold text-sm">{formatCurrency(po.tot_amount)}</span></div>
                  </>
                )}
              </div>
              {po.notes && <p className="text-xs text-muted-foreground mt-2 border-t pt-2">{po.notes}</p>}
              {po.cancel_reason && (
                <div className="mt-2 border-t pt-2 flex items-start gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500 mt-0.5" />
                  <p className="text-xs text-red-600">Cancelled: {po.cancel_reason}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Lines */}
          <Card className="mb-4">
            <CardHeader className="py-2 px-4">
              <CardTitle className="text-sm">Order Lines</CardTitle>
            </CardHeader>
            <CardContent className="py-0 px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px]">Item</TableHead>
                    <TableHead className="text-[10px] text-right">Ordered</TableHead>
                    <TableHead className="text-[10px]">Unit</TableHead>
                    {/* BUG-044: Rate/Total only visible for received/closed statuses */}
                    {["received","closed","partially_received"].includes(status) && <TableHead className="text-[10px] text-right">Rate</TableHead>}
                    {["received","closed","partially_received"].includes(status) && <TableHead className="text-[10px] text-right">Total</TableHead>}
                    <TableHead className="text-[10px] text-right">Your Stock</TableHead>
                    <TableHead className="text-[10px] text-right">Days</TableHead>
                    <TableHead className="text-[10px] text-right">After Recv</TableHead>
                    <TableHead className="text-[10px] text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(po.lines || []).map((line, idx) => {
                    const stock = stockMap[line.inventory_master_id] || stockMap[line.stock_title] || stockMap[line.ingredient_name];
                    const curQty = stock ? Number(stock.cal_quantity) || 0 : null;
                    const afterQty = curQty !== null ? curQty + Number(line.ordered_qty || 0) : null;
                    return (
                    <TableRow key={line.id || idx} data-testid={`po-detail-line-${idx}`}>
                      <TableCell className="text-xs font-medium">
                        {line.stock_title || line.ingredient_name || `Item #${line.inventory_master_id}`}
                        {curQty === 0 && <span className="text-[9px] text-red-600 ml-1">OOS</span>}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{line.ordered_qty}</TableCell>
                      <TableCell className="text-xs">{line.ordered_unit || line.unit}</TableCell>
                      {/* BUG-044: Rate/Total cells conditional */}
                      {["received","closed","partially_received"].includes(status) && <TableCell className="text-xs text-right font-mono">{formatCurrency(line.expected_rate)}</TableCell>}
                      {["received","closed","partially_received"].includes(status) && <TableCell className="text-xs text-right font-mono">{formatCurrency(Number(line.ordered_qty) * Number(line.expected_rate))}</TableCell>}
                      <TableCell className={`text-xs text-right tabular-nums ${curQty === 0 ? "text-red-600 font-semibold" : stock?.is_low_stock ? "text-amber-600" : "text-muted-foreground"}`}>
                        {curQty !== null ? `${curQty} ${stock?.unit || ""}` : "\u2014"}
                      </TableCell>
                      <TableCell className={`text-xs text-right tabular-nums ${curQty === 0 ? "text-red-600" : "text-muted-foreground"}`}>
                        {curQty === 0 ? "0d" : "\u2014"}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums text-emerald-600 font-medium">
                        {afterQty !== null ? `${afterQty.toFixed(1)} ${stock?.unit || ""}` : "\u2014"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-[9px] px-1 py-0">{line.line_status || "open"}</Badge>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* GRN History */}
          {po.receipts && po.receipts.length > 0 && (
            <Card className="mb-4">
              <CardHeader className="py-2 px-4">
                <CardTitle className="text-sm">Receiving History (GRN)</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {po.receipts.map((grn, idx) => (
                  <div key={idx} className="border rounded p-3 text-xs" data-testid={`grn-${idx}`}>
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">GRN #{idx + 1} \u2014 {grn.purchase_date || grn.created_at}</span>
                      {grn.variance_flagged && (
                        <Badge variant="destructive" className="text-[9px]">Variance Flagged</Badge>
                      )}
                    </div>
                    {(grn.lines || grn.receive_lines || []).map((rl, ri) => (
                      <div key={ri} className="flex justify-between border-t pt-1 mt-1">
                        <span>{rl.stock_title || rl.ingredient_name || `Line ${rl.line_id}`}</span>
                        <span className="tabular-nums">{rl.received_qty} @ {formatCurrency(rl.actual_rate)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {canApprove && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleAction("approve")} disabled={!!actionLoading} data-testid="po-approve-btn">
                {actionLoading === "approve" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Approve
              </Button>
            )}
            {canSend && (
              <Button size="sm" className="h-7 text-xs gap-1" onClick={() => handleAction("send")} disabled={!!actionLoading} data-testid="po-send-btn">
                {actionLoading === "send" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Send to Vendor
              </Button>
            )}
            {canReceive && (
              <Button size="sm" className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowReceive(true)} data-testid="po-receive-btn">
                <Package className="h-3 w-3" /> Receive Goods
              </Button>
            )}
            {canClose && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleAction("close")} disabled={!!actionLoading} data-testid="po-close-btn">
                {actionLoading === "close" ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />} Close PO
              </Button>
            )}
            <div className="flex-1" />
            {canCancel && (
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-destructive" onClick={() => setCancelDialogOpen(true)} disabled={!!actionLoading} data-testid="po-cancel-btn">
                <X className="h-3 w-3" /> Cancel
              </Button>
            )}
            {canDelete && (
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-destructive" onClick={() => handleAction("delete")} disabled={!!actionLoading} data-testid="po-delete-btn">
                {actionLoading === "delete" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />} Delete
              </Button>
            )}
          </div>
        </>
      ) : (
        /* Receive Form */
        <div data-testid="po-receive-form">
          <Card className="mb-4">
            <CardHeader className="py-2 px-4">
              <CardTitle className="text-sm flex items-center gap-2"><Package className="h-4 w-4" /> Receive Goods</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <Label className="text-xs">Invoice Date</Label>
                  <Input type="date" value={receiveDate} onChange={(e) => setReceiveDate(e.target.value)} className="h-8 text-xs" data-testid="receive-date" />
                </div>
                <div>
                  <Label className="text-xs">Vendor Invoice #</Label>
                  <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="h-8 text-xs" placeholder="INV-001" data-testid="receive-invoice-number" />
                  {/* CR-040 — G-016 invoice duplicate pre-check (non-blocking warning) */}
                  {invoiceChecking && (
                    <p className="text-[10px] text-muted-foreground mt-1" data-testid="invoice-check-loading">Checking…</p>
                  )}
                  {!invoiceChecking && invoiceCheck && invoiceCheck.available === false && (
                    <p
                      data-testid="invoice-duplicate-warning"
                      className="mt-1 text-[10px] flex items-start gap-1 text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1"
                    >
                      <AlertTriangle className="h-3 w-3 mt-[1px] flex-shrink-0" />
                      <span>Invoice already recorded against {invoiceCheck.existing_po_reference_code || `PO #${invoiceCheck.existing_purchase_order_id || invoiceCheck.existing_purchase_id || "?"}`}. You can still submit if this is intentional.</span>
                    </p>
                  )}
                  {!invoiceChecking && invoiceCheck && invoiceCheck.available === true && (
                    <p className="mt-1 text-[10px] text-emerald-700" data-testid="invoice-available">Invoice number available.</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs">Payment Type</Label>
                  <Select value={receivePayment} onValueChange={setReceivePayment}>
                    <SelectTrigger className="h-8 text-xs" data-testid="receive-payment"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Credit">Credit</SelectItem>
                      <SelectItem value="Online">Online</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Card-per-line layout */}
              <div className="space-y-3">
                {receiveLines.map((rl, idx) => {
                  const variance = rl.actual_rate && rl.expected_rate ? ((Number(rl.actual_rate) - rl.expected_rate) / rl.expected_rate * 100) : null;
                  const flagged = variance !== null && Math.abs(variance) > 10;
                  const invoiceTotal = Number(rl.received_qty || 0) * Number(rl.actual_rate || rl.expected_rate || 0);
                  const poLineTotal = rl.ordered_qty * rl.expected_rate;
                  const stock = stockMap[rl.stock_title] || stockMap[rl.inventory_master_id];
                  const currentQty = stock ? Number(stock.cal_quantity) || 0 : null;
                  const afterQty = currentQty !== null && rl.received_qty ? currentQty + Number(rl.received_qty) : null;

                  if (rl.skip) {
                    return (
                      <Card key={rl.line_id} className="opacity-60 border-dashed" data-testid={`receive-line-${idx}`}>
                        <CardContent className="p-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Checkbox checked={rl.skip} onCheckedChange={() => updateReceiveLine(idx, "skip", !rl.skip)} data-testid={`receive-skip-${idx}`} />
                            <span className="text-xs font-medium">{rl.stock_title}</span>
                            <span className="text-[10px] text-muted-foreground">PO: {rl.ordered_qty} {rl.ordered_unit} @ {formatCurrency(rl.expected_rate)}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">Skipped \u2014 will remain open on PO</span>
                        </CardContent>
                      </Card>
                    );
                  }

                  return (
                    <Card key={rl.line_id} className={flagged ? "border-red-200" : ""} data-testid={`receive-line-${idx}`}>
                      <CardContent className="p-3">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Checkbox checked={rl.skip} onCheckedChange={() => updateReceiveLine(idx, "skip", !rl.skip)} data-testid={`receive-skip-${idx}`} />
                            <span className="text-xs font-semibold">{rl.stock_title}</span>
                            <span className="text-[10px] text-muted-foreground">PO: {rl.ordered_qty} {rl.ordered_unit} @ {formatCurrency(rl.expected_rate)} = {formatCurrency(poLineTotal)}</span>
                          </div>
                          {currentQty === 0 && <Badge variant="destructive" className="text-[8px]">OUT OF STOCK</Badge>}
                          {flagged && <Badge variant="destructive" className="text-[8px]">VARIANCE FLAGGED</Badge>}
                        </div>
                        {/* Input row */}
                        <div className="grid grid-cols-4 gap-2 mb-2">
                          <div>
                            <Label className="text-[10px]">Invoice Qty</Label>
                            <Input type="number" value={rl.received_qty} onChange={(e) => updateReceiveLine(idx, "received_qty", e.target.value)} className="h-7 text-xs" data-testid={`receive-qty-${idx}`} />
                          </div>
                          <div>
                            <Label className="text-[10px]">Rate</Label>
                            <Input type="number" value={rl.actual_rate} onChange={(e) => updateReceiveLine(idx, "actual_rate", e.target.value)} className="h-7 text-xs" placeholder={String(rl.expected_rate)} data-testid={`receive-rate-${idx}`} />
                          </div>
                          <div>
                            <Label className="text-[10px]">Batch</Label>
                            <Input value={rl.batch} onChange={(e) => updateReceiveLine(idx, "batch", e.target.value)} className="h-7 text-xs" placeholder="Batch" data-testid={`receive-batch-${idx}`} />
                          </div>
                          <div>
                            <Label className="text-[10px]">Expiry</Label>
                            <Input type="date" value={rl.expiry_date} onChange={(e) => updateReceiveLine(idx, "expiry_date", e.target.value)} className="h-7 text-xs" data-testid={`receive-expiry-${idx}`} />
                          </div>
                        </div>
                        {/* Invoice total */}
                        {rl.received_qty && (
                          <p className="text-[10px] text-muted-foreground mb-2">Invoice Total: <span className="font-mono font-medium">{formatCurrency(invoiceTotal)}</span> (PO: {formatCurrency(poLineTotal)})</p>
                        )}
                        {/* Intelligence strip: Variance | Stock Impact */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-slate-50 rounded p-2 border border-slate-200">
                            <p className="text-[9px] text-muted-foreground uppercase">Rate Variance</p>
                            {variance !== null ? (
                              <p className={`text-xs font-semibold ${flagged ? "text-red-600" : Math.abs(variance) <= 5 ? "text-emerald-600" : "text-amber-600"}`}>
                                {variance > 0 ? "+" : ""}{variance.toFixed(1)}% {flagged ? "\u26A0 Exceeds threshold" : variance <= 5 ? "\u2713 OK" : "Warning"}
                              </p>
                            ) : <p className="text-xs text-muted-foreground">\u2014</p>}
                          </div>
                          <div className="bg-slate-50 rounded p-2 border border-slate-200">
                            <p className="text-[9px] text-muted-foreground uppercase">Stock Impact</p>
                            {afterQty !== null ? (
                              <p className="text-xs font-semibold text-emerald-600">{currentQty} \u2192 {afterQty.toFixed(1)} {stock?.unit || ""} {currentQty === 0 ? "(restores)" : ""}</p>
                            ) : <p className="text-xs text-muted-foreground">\u2014</p>}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Summary */}
              {(() => {
                const active = receiveLines.filter((l) => !l.skip && Number(l.received_qty) > 0);
                const skipped = receiveLines.filter((l) => l.skip);
                const invoiceTotal = active.reduce((s, l) => s + Number(l.received_qty || 0) * Number(l.actual_rate || l.expected_rate || 0), 0);
                const flagCount = active.filter((l) => {
                  const v = l.actual_rate && l.expected_rate ? Math.abs((Number(l.actual_rate) - l.expected_rate) / l.expected_rate * 100) : 0;
                  return v > 10;
                }).length;
                return (
                  <div className="mt-4 p-3 bg-slate-50 rounded-lg border text-xs" data-testid="receive-summary">
                    <div className="flex gap-4">
                      <span>{active.length} matched</span>
                      <span>{skipped.length} skipped</span>
                      <span className="font-mono font-medium">{formatCurrency(invoiceTotal)} invoice total</span>
                      {flagCount > 0 && <span className="text-red-600 font-semibold">{flagCount} variance flag{flagCount > 1 ? "s" : ""}</span>}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">FEFO: New batches enter after existing segments in expiry queue</p>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="ghost" size="sm" onClick={() => setShowReceive(false)} data-testid="receive-cancel">
              <ArrowLeft className="h-3 w-3 mr-1" /> Back
            </Button>
            <Button size="sm" className="h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleReceive} disabled={receiving} data-testid="receive-confirm">
              {receiving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
              Confirm &amp; Receive
            </Button>
          </div>
        </div>
      )}

      {/* Cancel Dialog */}
      <ConfirmActionDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title="Cancel Purchase Order?"
        description="This action cannot be undone. The PO will be permanently cancelled."
        confirmLabel="Cancel PO"
        onConfirm={handleCancel}
        submitting={actionLoading === "cancel"}
      />
    </div>
  );
}
