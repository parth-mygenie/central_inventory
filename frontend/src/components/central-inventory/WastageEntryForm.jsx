import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLoginContext } from "@/hooks/useLoginContext";
import { useWriteAction } from "@/hooks/useWriteAction";
import { useWastageReasons } from "@/hooks/useWastageReasons";
import api from "@/services/api";
import { validateQuantityForUnit } from "@/lib/formatters";
import SourceSelector from "./SourceSelector";
import ConfirmActionDialog from "./ConfirmActionDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingState, PermissionDenied } from "@/components/common/StateDisplays";
import { ArrowLeft, Loader2, Trash, AlertTriangle, Info } from "lucide-react";

export default function WastageEntryForm() {
  const navigate = useNavigate();
  const { restaurantId, canDo } = useLoginContext();
  const { submitting, execute } = useWriteAction();
  const { reasons: wastageReasons, loading: reasonsLoading, usingFallback } = useWastageReasons();

  const [items, setItems] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const [selectedItem, setSelectedItem] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [sourceSelector, setSourceSelector] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingData(true);
    api.getInventoryMaster()
      .then((resp) => {
        if (cancelled) return;
        const inv = resp.data?.data || resp.data || [];
        setItems(Array.isArray(inv) ? inv : []);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingData(false); });
    return () => { cancelled = true; };
  }, []);

  if (!canDo("record-wastage")) return <PermissionDenied />;
  if (loadingData || reasonsLoading) return <LoadingState lines={4} />;

  const itemObj = items.find((i) => String(i.id) === String(selectedItem));
  const unit = itemObj?.unit || "";
  const qtyErr = quantity ? validateQuantityForUnit(quantity, unit) : null;
  const selectedReasonObj = wastageReasons.find((r) => r.value === reason);
  const finalReason = reason === "other" ? otherReason.trim() : (selectedReasonObj?.label || "");

  const isValid =
    selectedItem &&
    Number(quantity) > 0 &&
    !qtyErr &&
    reason &&
    (reason !== "other" || otherReason.trim().length > 0) &&
    sourceSelector;

  const handleSubmit = () => {
    if (!isValid) return;

    execute(
      () => api.recordWastage({
        sourceInventoryMasterId: Number(selectedItem),
        quantity: Number(quantity),
        unit,
        sourceSelector,
        reason: finalReason,
        restaurantId: restaurantId,
      }),
      {
        successMsg: `Wastage recorded — ${itemObj?.stock_title} ${quantity} ${unit}`,
        onSuccess: () => navigate("/"),
      }
    );

    setShowConfirm(false);
  };

  const handleItemChange = (val) => {
    setSelectedItem(val);
    setSourceSelector(null);
    setQuantity("");
  };

  return (
    <div data-testid="wastage-entry-form">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors"
        data-testid="wastage-back-button"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>
      <div className="flex items-center gap-2 mb-4">
        <Trash className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-bold" data-testid="wastage-form-title">Record Wastage</h1>
      </div>

      <Card className="mb-4">
        <CardHeader className="py-2.5 px-4">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Item Details</CardTitle>
        </CardHeader>
        <CardContent className="py-0 px-4 pb-4 space-y-3">
          <div>
            <Label className="text-xs">Item *</Label>
            <Select value={selectedItem ? String(selectedItem) : ""} onValueChange={handleItemChange} disabled={submitting}>
              <SelectTrigger data-testid="wastage-item-select">
                <SelectValue placeholder="Select item" />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {item.stock_title} ({item.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sprint C: Stock context + anomaly detection */}
          {itemObj && (
            <div className="bg-muted/30 border border-border/50 rounded-lg p-3 space-y-2" data-testid="wastage-stock-context">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div><span className="text-[10px] text-muted-foreground block">Current Stock</span><span className="font-semibold tabular-nums">{itemObj.display_qty ?? "—"} {itemObj.unit}</span></div>
                {quantity && Number(quantity) > 0 && (
                  <div><span className="text-[10px] text-muted-foreground block">After Wastage</span><span className="font-semibold tabular-nums text-amber-600">{(Number(itemObj.display_qty || 0) - Number(quantity)).toFixed(2)} {itemObj.unit}</span></div>
                )}
                <div><span className="text-[10px] text-muted-foreground block">Category</span><span>{itemObj.category_name || "—"}</span></div>
                <div><span className="text-[10px] text-muted-foreground block">Min Threshold</span><span className="tabular-nums">{itemObj.min_qty_alert ?? "—"}</span></div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Quantity *</Label>
              <Input
                data-testid="wastage-quantity-input"
                type="number"
                min="0"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="h-8 text-xs"
                disabled={submitting}
                placeholder="Enter quantity"
              />
              {qtyErr && <p className="text-[10px] text-destructive mt-0.5">{qtyErr}</p>}
            </div>
            <div>
              <Label className="text-xs">Unit</Label>
              <Input value={unit || "—"} className="h-8 text-xs bg-muted" readOnly data-testid="wastage-unit-display" />
            </div>
          </div>

          {selectedItem && (
            <div>
              <Label className="text-xs">Source Segment *</Label>
              <SourceSelector
                fromRestaurantId={restaurantId}
                inventoryMasterId={Number(selectedItem)}
                value={sourceSelector}
                onChange={setSourceSelector}
                disabled={submitting}
              />
            </div>
          )}

          <div>
            <Label className="text-xs">
              Reason *
              {usingFallback && (
                <span className="ml-1 text-[10px] text-amber-600 font-normal">(defaults)</span>
              )}
            </Label>
            <Select value={reason} onValueChange={setReason} disabled={submitting}>
              <SelectTrigger data-testid="wastage-reason-select">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {wastageReasons.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {reason === "other" && (
            <div>
              <Label className="text-xs">Specify Reason *</Label>
              <Textarea
                data-testid="wastage-other-reason-input"
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                placeholder="Enter reason for wastage"
                className="text-xs min-h-[60px]"
                disabled={submitting}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Undo guidance */}
      <div className="flex items-start gap-2 text-[10px] text-muted-foreground bg-muted/30 border border-border/50 rounded-lg p-2.5 mb-3" data-testid="wastage-undo-guidance">
        <Info className="h-3 w-3 mt-0.5 shrink-0" />
        <span>Wastage records are permanent. If you enter wrong data, contact your Central Store manager to create a stock adjustment to correct the quantity.</span>
      </div>

      <Button
        data-testid="wastage-submit-button"
        onClick={() => setShowConfirm(true)}
        disabled={!isValid || submitting}
        className="w-full"
      >
        {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Record Wastage
      </Button>

      <ConfirmActionDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="Confirm Wastage"
        description={`Record wastage of ${quantity} ${unit} ${itemObj?.stock_title || "item"}. Reason: ${finalReason}`}
        confirmLabel="Record Wastage"
        confirmVariant="destructive"
        onConfirm={handleSubmit}
        submitting={submitting}
      />
    </div>
  );
}
