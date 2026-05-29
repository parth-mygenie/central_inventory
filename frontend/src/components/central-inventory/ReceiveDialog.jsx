import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

const RESOLUTION_TYPES = [
  { value: "damaged", label: "Damaged" },
  { value: "return_to_source", label: "Return to Source" },
  { value: "other", label: "Other" },
];

/**
 * ReceiveDialog — Full receive + partial receive toggle with line-level form.
 */
export default function ReceiveDialog({ open, onOpenChange, transfer, onSubmit, submitting = false }) {
  const lines = transfer?.lines || transfer?.items || [];
  const [isPartial, setIsPartial] = useState(false);
  const [lineData, setLineData] = useState(() =>
    lines.map((l) => {
      // P16: Use dispatched display total from meta_json.dispatch as truth source
      const dispatchedQty = l.dispatchedDisplayTotal ?? l.quantity ?? 0;
      return {
        line_id: l.id,
        dispatched: dispatchedQty,
        accepted_qty: dispatchedQty,
        rejected_qty: 0,
        resolution_type: "",
        reason: "",
        stock_title: l.stock_title,
        unit: l.unit,
        lineStatus: l.lineStatus,
      };
    }).filter((ld) => ld.dispatched > 0) // Skip lines with 0 dispatched (on_hold, cancelled)
  );

  const updateLine = (idx, field, value) => {
    setLineData((prev) => {
      const next = [...prev];
      const line = { ...next[idx] };
      if (field === "accepted_qty") {
        const accepted = Math.min(Math.max(0, Number(value) || 0), line.dispatched);
        line.accepted_qty = accepted;
        line.rejected_qty = Math.round((line.dispatched - accepted) * 100) / 100;
      } else {
        line[field] = value;
      }
      next[idx] = line;
      return next;
    });
  };

  const hasRejected = lineData.some((l) => l.rejected_qty > 0);
  const isValid = !isPartial || lineData.every((l) =>
    l.rejected_qty === 0 || (l.resolution_type && l.reason.trim().length >= 10)
  );

  const handleSubmit = () => {
    if (submitting) return;
    if (!isPartial) {
      onSubmit({});
    } else {
      const firstRejected = lineData.find((l) => l.rejected_qty > 0);
      onSubmit({
        resolution_type: firstRejected?.resolution_type || "damaged",
        resolution_meta: { reason: firstRejected?.reason || "Partial receive" },
        received_lines: lineData.map((l) => ({
          line_id: l.line_id,
          accepted_qty: l.accepted_qty,
          rejected_qty: l.rejected_qty,
        })),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="receive-dialog" className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Receive Transfer #{transfer?.id}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="text-xs text-muted-foreground">
            {lines.length} item{lines.length !== 1 ? "s" : ""} in this transfer
          </div>

          {/* Line items summary */}
          <div className="border rounded-md divide-y">
            {lines.map((line, idx) => (
              <div key={idx} className="p-2.5 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium">{lineData[idx]?.stock_title || line.stock_title || "Item"}</span>
                  <span className="text-xs text-muted-foreground">
                    {lineData[idx]?.dispatched ?? line.quantity} {lineData[idx]?.unit || line.unit}
                    {line.dispatchedDisplayTotal != null && line.dispatchedDisplayTotal !== line.quantity && (
                      <span className="text-[10px] text-indigo-600 ml-1">(dispatched)</span>
                    )}
                  </span>
                </div>
                {isPartial && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px]">Accepted</Label>
                      <Input
                        data-testid={`partial-accepted-${idx}`}
                        type="number"
                        min={0}
                        max={lineData[idx]?.dispatched}
                        step="any"
                        value={lineData[idx]?.accepted_qty ?? ""}
                        onChange={(e) => updateLine(idx, "accepted_qty", e.target.value)}
                        className="h-7 text-xs"
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <Label className="text-[10px]">Rejected</Label>
                      <Input
                        data-testid={`partial-rejected-${idx}`}
                        type="number"
                        value={lineData[idx]?.rejected_qty ?? 0}
                        className="h-7 text-xs bg-muted"
                        readOnly
                      />
                    </div>
                    {(lineData[idx]?.rejected_qty > 0) && (
                      <>
                        <div className="col-span-2">
                          <Label className="text-[10px]">Resolution Type *</Label>
                          <Select
                            value={lineData[idx]?.resolution_type}
                            onValueChange={(v) => updateLine(idx, "resolution_type", v)}
                            disabled={submitting}
                          >
                            <SelectTrigger data-testid={`partial-resolution-${idx}`} className="h-7 text-xs">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              {RESOLUTION_TYPES.map((t) => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2">
                          <Label className="text-[10px]">Reason * (min 10 chars)</Label>
                          <Textarea
                            data-testid={`partial-reason-${idx}`}
                            value={lineData[idx]?.reason}
                            onChange={(e) => updateLine(idx, "reason", e.target.value)}
                            placeholder="Reason for rejection..."
                            rows={2}
                            maxLength={500}
                            className="text-xs"
                            disabled={submitting}
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Partial toggle */}
          <div className="flex items-center gap-2">
            <Switch
              data-testid="partial-receive-toggle"
              checked={isPartial}
              onCheckedChange={setIsPartial}
              disabled={submitting}
            />
            <Label className="text-xs">Partial Receive</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting} data-testid="receive-dialog-cancel">Cancel</Button>
          <Button
            data-testid="receive-dialog-submit"
            onClick={handleSubmit}
            disabled={submitting || !isValid}
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            {isPartial ? "Submit Partial Receive" : "Receive All"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
