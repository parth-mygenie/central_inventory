import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const DEFAULT_RESOLUTION_TYPES = [
  { value: "return_to_source", label: "Return to Source" },
  { value: "damaged", label: "Damaged" },
  { value: "other", label: "Other" },
];

const REPORT_ISSUE_TYPES = [
  { value: "damaged", label: "Damaged in Transit" },
  { value: "wrong_items", label: "Wrong Items" },
  { value: "quantity_discrepancy", label: "Quantity Discrepancy" },
  { value: "other", label: "Other" },
];

/**
 * Reason input dialog for Reject, Cancel, and Report Issue actions.
 */
export default function ReasonDialog({
  open, onOpenChange, title, actionLabel = "Submit", actionVariant = "destructive",
  onSubmit, submitting = false, resolutionTypes, description,
}) {
  const [resolutionType, setResolutionType] = useState("");
  const [reason, setReason] = useState("");

  const types = resolutionTypes || DEFAULT_RESOLUTION_TYPES;
  const isValid = resolutionType && reason.trim().length >= 10;

  const handleSubmit = () => {
    if (!isValid || submitting) return;
    onSubmit({ resolution_type: resolutionType, resolution_meta: { reason: reason.trim() } });
  };

  const handleOpenChange = (v) => {
    if (!v) { setResolutionType(""); setReason(""); }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent data-testid="reason-dialog" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="resolution-type" className="text-xs">Resolution Type *</Label>
            <Select value={resolutionType} onValueChange={setResolutionType} disabled={submitting}>
              <SelectTrigger data-testid="resolution-type-select" id="resolution-type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {types.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reason" className="text-xs">Reason * <span className="text-muted-foreground">(min 10 characters)</span></Label>
            <Textarea
              data-testid="reason-input"
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please provide a detailed reason..."
              maxLength={500}
              rows={3}
              disabled={submitting}
            />
            <p className="text-[10px] text-muted-foreground text-right">{reason.length}/500</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={submitting} data-testid="reason-dialog-cancel">Cancel</Button>
          <Button
            data-testid="reason-dialog-submit"
            variant={actionVariant}
            onClick={handleSubmit}
            disabled={!isValid || submitting}
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { DEFAULT_RESOLUTION_TYPES, REPORT_ISSUE_TYPES };
