import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLoginContext } from "@/hooks/useLoginContext";
import { useWriteAction } from "@/hooks/useWriteAction";
import api from "@/services/api";
import { validateQuantityForUnit } from "@/lib/formatters";
import { ADJUSTMENT_REASONS } from "@/lib/reasonCategories";
import SourceSelector from "./SourceSelector";
import ConfirmActionDialog from "./ConfirmActionDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingState, PermissionDenied } from "@/components/common/StateDisplays";
import { ArrowLeft, Loader2, Scale } from "lucide-react";

export default function StockAdjustmentForm() {
  const navigate = useNavigate();
  const { restaurantId, canDo } = useLoginContext();
  const { submitting, execute } = useWriteAction();

  const [items, setItems] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const [adjustType, setAdjustType] = useState("");
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

  if (!canDo("adjust-stock")) return <PermissionDenied />;
  if (loadingData) return <LoadingState lines={4} />;

  const itemObj = items.find((i) => String(i.id) === String(selectedItem));
  const unit = itemObj?.unit || "";
  const qtyErr = quantity ? validateQuantityForUnit(quantity, unit) : null;
  const finalReason = reason === "other" ? otherReason.trim() : ADJUSTMENT_REASONS.find((r) => r.value === reason)?.label || "";

  const isValid =
    adjustType &&
    selectedItem &&
    Number(quantity) > 0 &&
    !qtyErr &&
    reason &&
    (reason !== "other" || otherReason.trim().length > 0) &&
    (adjustType === "increase" || sourceSelector);

  const handleSubmit = () => {
    if (!isValid) return;
    const payload = {
      sourceInventoryMasterId: Number(selectedItem),
      quantity: Number(quantity),
      unit,
      reason: finalReason,
      restaurantId: restaurantId,
    };

    const apiCall = adjustType === "increase"
      ? () => api.adjustStockIncrease(payload)
      : () => api.adjustStockDecrease({ ...payload, sourceSelector });

    const sign = adjustType === "increase" ? "+" : "-";
    const verb = adjustType === "increase" ? "increased" : "decreased";

    execute(apiCall, {
      successMsg: `Stock ${verb} — ${itemObj?.stock_title} ${sign}${quantity} ${unit}`,
      onSuccess: () => navigate("/"),
    });

    setShowConfirm(false);
  };

  const handleItemChange = (val) => {
    setSelectedItem(val);
    setSourceSelector(null);
    setQuantity("");
  };

  const handleTypeChange = (val) => {
    setAdjustType(val);
    setSourceSelector(null);
  };

  return (
    <div data-testid="stock-adjustment-form">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors"
        data-testid="adjustment-back-button"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>
      <div className="flex items-center gap-2 mb-4">
        <Scale className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-bold" data-testid="adjustment-form-title">Stock Adjustment</h1>
      </div>

      <Card className="mb-4">
        <CardHeader className="py-2.5 px-4">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Adjustment Type</CardTitle>
        </CardHeader>
        <CardContent className="py-0 px-4 pb-4">
          <div className="flex gap-2" data-testid="adjustment-type-toggle">
            <Button
              type="button"
              variant={adjustType === "increase" ? "default" : "outline"}
              size="sm"
              onClick={() => handleTypeChange("increase")}
              disabled={submitting}
              data-testid="adjustment-type-increase"
              className="flex-1"
            >
              Increase
            </Button>
            <Button
              type="button"
              variant={adjustType === "decrease" ? "default" : "outline"}
              size="sm"
              onClick={() => handleTypeChange("decrease")}
              disabled={submitting}
              data-testid="adjustment-type-decrease"
              className="flex-1"
            >
              Decrease
            </Button>
          </div>
          {!adjustType && <p className="text-[10px] text-muted-foreground mt-1.5">Select adjustment type to continue</p>}
        </CardContent>
      </Card>

      {adjustType && (
        <Card className="mb-4">
          <CardHeader className="py-2.5 px-4">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Item Details</CardTitle>
          </CardHeader>
          <CardContent className="py-0 px-4 pb-4 space-y-3">
            <div>
              <Label className="text-xs">Item *</Label>
              <Select value={selectedItem ? String(selectedItem) : ""} onValueChange={handleItemChange} disabled={submitting}>
                <SelectTrigger data-testid="adjustment-item-select">
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

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Quantity *</Label>
                <Input
                  data-testid="adjustment-quantity-input"
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
                <Input value={unit || "—"} className="h-8 text-xs bg-muted" readOnly data-testid="adjustment-unit-display" />
              </div>
            </div>

            {adjustType === "decrease" && selectedItem && (
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
              <Label className="text-xs">Reason *</Label>
              <Select value={reason} onValueChange={setReason} disabled={submitting}>
                <SelectTrigger data-testid="adjustment-reason-select">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {ADJUSTMENT_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {reason === "other" && (
              <div>
                <Label className="text-xs">Specify Reason *</Label>
                <Textarea
                  data-testid="adjustment-other-reason-input"
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                  placeholder="Enter reason for adjustment"
                  className="text-xs min-h-[60px]"
                  disabled={submitting}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {adjustType && (
        <Button
          data-testid="adjustment-submit-button"
          onClick={() => setShowConfirm(true)}
          disabled={!isValid || submitting}
          className="w-full"
        >
          {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {adjustType === "increase" ? "Increase Stock" : "Decrease Stock"}
        </Button>
      )}

      <ConfirmActionDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title={`Confirm Stock ${adjustType === "increase" ? "Increase" : "Decrease"}`}
        description={`${adjustType === "increase" ? "Increase" : "Decrease"} ${itemObj?.stock_title || "item"} by ${quantity} ${unit}. Reason: ${finalReason}`}
        confirmLabel={adjustType === "increase" ? "Increase Stock" : "Decrease Stock"}
        onConfirm={handleSubmit}
        submitting={submitting}
      />
    </div>
  );
}
