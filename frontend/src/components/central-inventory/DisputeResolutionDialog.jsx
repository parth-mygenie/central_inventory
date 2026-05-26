import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

/**
 * DisputeResolutionDialog — P16 Phase 3
 *
 * Central/sender resolves a receive_dispute_pending transfer.
 * Accept: finalizes receive with rejection applied.
 * Reject: reverts transfer to dispatched for franchise to re-receive.
 */
export default function DisputeResolutionDialog({ open, onOpenChange, transfer, onSubmit, submitting = false }) {
  const [accept, setAccept] = useState(true);
  const [note, setNote] = useState("");

  const disputeMeta = transfer?.resolution_meta?.receive_dispute;
  const disputeLines = disputeMeta?.received_lines || [];

  const isValid = note.trim().length >= 3;

  const handleSubmit = () => {
    if (submitting || !isValid) return;
    onSubmit({ accept, note: note.trim() });
  };

  const handleOpenChange = (v) => {
    if (!v) { setAccept(true); setNote(""); }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent data-testid="dispute-resolution-dialog" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Resolve Dispute — Transfer #{transfer?.id}</DialogTitle>
          <DialogDescription>
            The receiver flagged a discrepancy. Review and accept or reject the dispute.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Dispute details */}
          {disputeLines.length > 0 && (
            <div className="border rounded-md p-3 bg-muted/30 space-y-1.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Dispute Details</p>
              {disputeLines.map((dl, idx) => (
                <div key={idx} className="flex justify-between text-xs">
                  <span>Line #{dl.line_id}</span>
                  <span>
                    <span className="text-emerald-700">Accepted: {dl.accepted_qty}</span>
                    {dl.rejected_qty > 0 && (
                      <span className="text-rose-700 ml-2">Rejected: {dl.rejected_qty}</span>
                    )}
                  </span>
                </div>
              ))}
              {disputeMeta?.submitted_at && (
                <p className="text-[10px] text-muted-foreground">
                  Submitted: {new Date(disputeMeta.submitted_at).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Accept / Reject toggle */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer flex-1 transition-colors ${accept ? "border-emerald-300 bg-emerald-50" : "border-border"}`} onClick={() => setAccept(true)}>
              <CheckCircle2 className={`h-4 w-4 ${accept ? "text-emerald-600" : "text-muted-foreground"}`} />
              <div>
                <p className="text-xs font-medium">Accept</p>
                <p className="text-[10px] text-muted-foreground">Finalize receive</p>
              </div>
            </div>
            <div className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer flex-1 transition-colors ${!accept ? "border-rose-300 bg-rose-50" : "border-border"}`} onClick={() => setAccept(false)}>
              <XCircle className={`h-4 w-4 ${!accept ? "text-rose-600" : "text-muted-foreground"}`} />
              <div>
                <p className="text-xs font-medium">Reject</p>
                <p className="text-[10px] text-muted-foreground">Re-receive needed</p>
              </div>
            </div>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label htmlFor="dispute-note" className="text-xs">
              Note * <span className="text-muted-foreground">(min 3 chars)</span>
            </Label>
            <Textarea
              data-testid="dispute-note-input"
              id="dispute-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={accept ? "Confirm damage and accept..." : "Explain rejection reason..."}
              maxLength={500}
              rows={2}
              disabled={submitting}
            />
          </div>

          {!accept && (
            <p className="text-[10px] text-amber-600">
              Rejecting will revert this transfer to "Dispatched". The receiver will need to re-submit the receive.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={submitting} data-testid="dispute-cancel-btn">
            Cancel
          </Button>
          <Button
            data-testid="dispute-submit-btn"
            variant={accept ? "default" : "destructive"}
            onClick={handleSubmit}
            disabled={submitting || !isValid}
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            {accept ? "Accept Dispute" : "Reject Dispute"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
