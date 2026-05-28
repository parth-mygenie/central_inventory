import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Package, AlertCircle } from "lucide-react";
import api from "@/services/api";

/**
 * ApproveWaveDialog — P16 partial approve with per-line segment picker.
 *
 * Central user picks qty + segment per line. Lines not included → on_hold.
 * Requires source-options per item to populate segment picker.
 */
export default function ApproveWaveDialog({ open, onOpenChange, transfer, onSubmit, submitting = false }) {
  const lines = (transfer?.lines || []).filter(
    (l) => l.lineStatus === "requested" || l.lineStatus === "on_hold"
        || l.lineStatus === "partially_approved"
        || (l.lineStatus === "approved" && (l.holdDisplayQty ?? 0) > 0)
  );
  const fromId = transfer?.from_restaurant_id;

  const [lineApprovals, setLineApprovals] = useState([]);
  const [segmentsMap, setSegmentsMap] = useState({});
  const [loadingSegments, setLoadingSegments] = useState({});
  const [defaultPolicy, setDefaultPolicy] = useState("hold");

  // Initialize line approval state
  useEffect(() => {
    if (!open) return;
    setLineApprovals(
      lines.map((l) => {
        // Use remainingApprovableQty as the available-to-approve ceiling.
        // Falls back to holdDisplayQty, then full requested qty for first-time lines.
        const approvableQty = l.remainingApprovableQty ?? l.holdDisplayQty ?? l.requestedDisplayQty ?? l.quantity ?? 0;
        return {
          line_id: l.id,
          stock_title: l.stock_title,
          unit: l.unit || l.display_unit,
          requestedQty: l.requestedDisplayQty ?? l.quantity ?? 0,
          holdQty: approvableQty,
          currentApproved: l.approvedDisplayQty ?? 0,
          approvedQty: 0,
          segmentId: null,
          segmentQty: 0,
          include: false,
          masterId: l.source_inventory_master_id,
          lineStatus: l.lineStatus,
        };
      })
    );
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch segments for a given inventory master ID
  const fetchSegments = useCallback(async (masterId) => {
    if (!masterId || !fromId || segmentsMap[masterId]) return;
    setLoadingSegments((p) => ({ ...p, [masterId]: true }));
    try {
      const resp = await api.getSourceOptions({ inventoryMasterId: masterId, restaurantId: fromId });
      const data = resp.data?.data || resp.data;
      setSegmentsMap((p) => ({ ...p, [masterId]: data?.segments || [] }));
    } catch {
      setSegmentsMap((p) => ({ ...p, [masterId]: [] }));
    } finally {
      setLoadingSegments((p) => ({ ...p, [masterId]: false }));
    }
  }, [fromId, segmentsMap]);

  // Load segments when line is included
  const toggleLine = (idx) => {
    setLineApprovals((prev) => {
      const next = [...prev];
      const la = { ...next[idx] };
      la.include = !la.include;
      if (la.include && la.masterId) fetchSegments(la.masterId);
      if (!la.include) { la.approvedQty = 0; la.segmentId = null; la.segmentQty = 0; }
      next[idx] = la;
      return next;
    });
  };

  const updateLine = (idx, field, value) => {
    setLineApprovals((prev) => {
      const next = [...prev];
      const la = { ...next[idx] };
      if (field === "approvedQty") {
        la.approvedQty = Math.min(Math.max(0, Number(value) || 0), la.holdQty);
        la.segmentQty = la.approvedQty;
      } else if (field === "segmentId") {
        la.segmentId = Number(value);
      } else {
        la[field] = value;
      }
      next[idx] = la;
      return next;
    });
  };

  const includedLines = lineApprovals.filter((la) => la.include && la.approvedQty > 0 && la.segmentId);
  const isValid = includedLines.length > 0;

  const handleSubmit = () => {
    if (submitting || !isValid) return;
    const approvalLines = includedLines.map((la) => ({
      line_id: la.line_id,
      approved_qty: la.approvedQty,
      segments: [{ segment_id: la.segmentId, quantity: la.approvedQty }],
      remainder_policy: defaultPolicy,
    }));
    onSubmit({ approvalLines, defaultRemainderPolicy: defaultPolicy });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="approve-wave-dialog" className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Partial Approve — Transfer #{transfer?.id}</DialogTitle>
          <DialogDescription>Select lines to approve with segment allocation. Unselected lines will be placed on hold.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Remainder policy */}
          <div className="flex items-center gap-2">
            <Label className="text-xs whitespace-nowrap">Remainder policy:</Label>
            <Select value={defaultPolicy} onValueChange={setDefaultPolicy} disabled={submitting}>
              <SelectTrigger data-testid="remainder-policy-select" className="h-7 text-xs w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hold">Hold</SelectItem>
                <SelectItem value="cancel">Cancel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Per-line approval */}
          <div className="border rounded-md divide-y">
            {lineApprovals.map((la, idx) => {
              const segments = segmentsMap[la.masterId] || [];
              const isLoading = loadingSegments[la.masterId];
              return (
                <div key={la.line_id} className="p-2.5 space-y-2" data-testid={`approve-line-${idx}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={la.include}
                        onChange={() => toggleLine(idx)}
                        disabled={submitting || la.holdQty <= 0}
                        className="rounded"
                        data-testid={`approve-line-check-${idx}`}
                      />
                      <span className="text-xs font-medium flex items-center gap-1">
                        <Package className="h-3 w-3 text-muted-foreground" />
                        {la.stock_title}
                      </span>
                      {la.currentApproved > 0 && (
                        <span className="text-[9px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                          {la.currentApproved} already approved
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {la.holdQty > 0 ? `${la.holdQty} ${la.unit} remaining` : "Fully approved"}
                    </span>
                  </div>

                  {la.include && (
                    <div className="pl-5 space-y-2">
                      {/* Qty input */}
                      <div className="flex items-center gap-2">
                        <Label className="text-[10px] w-16">Approve qty</Label>
                        <Input
                          data-testid={`approve-qty-${idx}`}
                          type="number"
                          min={0}
                          max={la.holdQty}
                          step="any"
                          value={la.approvedQty || ""}
                          onChange={(e) => updateLine(idx, "approvedQty", e.target.value)}
                          className="h-7 text-xs w-24"
                          disabled={submitting}
                        />
                        <span className="text-[10px] text-muted-foreground">{la.unit}</span>
                      </div>

                      {/* Segment picker */}
                      <div>
                        <Label className="text-[10px]">Source segment</Label>
                        {isLoading ? (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" /> Loading segments...
                          </div>
                        ) : segments.length === 0 ? (
                          <div className="flex items-center gap-1 text-[10px] text-amber-600">
                            <AlertCircle className="h-3 w-3" /> No segments available
                          </div>
                        ) : (
                          <Select
                            value={la.segmentId ? String(la.segmentId) : ""}
                            onValueChange={(v) => updateLine(idx, "segmentId", v)}
                            disabled={submitting}
                          >
                            <SelectTrigger data-testid={`approve-segment-${idx}`} className="h-7 text-xs">
                              <SelectValue placeholder="Select segment" />
                            </SelectTrigger>
                            <SelectContent>
                              {segments.map((seg) => (
                                <SelectItem key={seg.segment_id} value={String(seg.segment_id)}>
                                  {seg.batch || `Seg #${seg.segment_id}`} — {seg.display_qty ?? seg.cal_quantity} avail
                                  {seg.expiry_date ? ` (exp: ${seg.expiry_date})` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!isValid && lineApprovals.some((la) => la.include) && (
            <p className="text-[10px] text-amber-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Each included line needs qty &gt; 0 and a selected segment
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting} data-testid="approve-wave-cancel">Cancel</Button>
          <Button
            data-testid="approve-wave-submit"
            onClick={handleSubmit}
            disabled={submitting || !isValid}
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Approve {includedLines.length} line{includedLines.length !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
