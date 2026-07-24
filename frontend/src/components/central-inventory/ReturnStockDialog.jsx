// CR-038 — G-006 Stock Return dialog.
// Rendered on TransferDetail when the viewer is the destination store of a
// received/partially_received transfer. Picks per-line qty subsets and calls
// api.initiateReturn(); maps 200-body error codes to friendly messages.

import { useMemo, useState } from "react";
import api from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RotateCcw } from "lucide-react";

const ERROR_MAP = {
  RETURN_NOT_FROM_DESTINATION: "Only the store that received this transfer can return items.",
  INVALID_TRANSFER_STATE_FOR_RETURN: "This transfer is not in a returnable state.",
};

function friendlyReturnError(body) {
  if (!body || typeof body !== "object") return null;
  const code = body.error_code || body.code;
  return code && ERROR_MAP[code] ? ERROR_MAP[code] : null;
}

export default function ReturnStockDialog({ transfer, lines, open, onClose, onSuccess }) {
  // Build initial per-line return qty rows from the accepted/received qty.
  const initialRows = useMemo(() => {
    return (lines || [])
      .filter((l) => (l.accepted_qty != null ? Number(l.accepted_qty) > 0 : Number(l.quantity || 0) > 0))
      .map((l) => ({
        line_id: l.id,
        stock_title: l.stock_title || `Line #${l.id}`,
        unit: l.unit || "",
        received_qty: Number(l.accepted_qty != null ? l.accepted_qty : l.quantity) || 0,
        return_qty: "",
      }));
  }, [lines]);

  const [rows, setRows] = useState(initialRows);
  const [submitting, setSubmitting] = useState(false);

  // Reset rows whenever the dialog opens with a fresh transfer.
  const dialogKey = `${transfer?.id || ""}-${open ? "open" : "closed"}`;

  // Sync when incoming lines change (e.g. transfer refetch).
  if (open && rows.length !== initialRows.length) {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setRows(initialRows);
  }

  const updateRow = (idx, val) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, return_qty: val } : r)));
  };

  const validRows = rows
    .map((r) => ({ ...r, num: Number(r.return_qty) }))
    .filter((r) => r.num > 0 && r.num <= r.received_qty);

  const submit = async () => {
    if (validRows.length === 0) {
      toast({ title: "Enter a return quantity on at least one line.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const resp = await api.initiateReturn({
        originalTransferId: transfer.id,
        lines: validRows.map((r) => ({ line_id: r.line_id, quantity: r.num })),
      });
      // 200-body error path
      const body = resp?.data || {};
      const friendly = friendlyReturnError(body);
      if (friendly || body.status === false) {
        toast({ title: friendly || body.message || "Return request failed", variant: "destructive" });
        return;
      }
      toast({ title: "Return initiated." });
      onSuccess && onSuccess(body);
      onClose && onClose();
    } catch (e) {
      const body = e?.response?.data;
      const friendly = friendlyReturnError(body);
      toast({ title: friendly || body?.message || "Return request failed", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !submitting) onClose && onClose(); }}>
      <DialogContent className="max-w-2xl" data-testid="return-dialog" key={dialogKey}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-amber-600" /> Return items to {transfer?.from_restaurant_name || "sender"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Send items back against transfer {transfer?.reference_code || `#${transfer?.id}`}. The sender will see a new return transfer on their side.
          </DialogDescription>
        </DialogHeader>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px]">Item</TableHead>
                <TableHead className="text-[10px] text-right">Received</TableHead>
                <TableHead className="text-[10px] text-right">Return Qty</TableHead>
                <TableHead className="text-[10px]">Unit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-xs text-muted-foreground text-center py-4">No returnable lines available.</TableCell></TableRow>
              )}
              {rows.map((r, idx) => {
                const num = Number(r.return_qty);
                const invalid = r.return_qty !== "" && (isNaN(num) || num < 0 || num > r.received_qty);
                return (
                  <TableRow key={r.line_id || idx}>
                    <TableCell className="text-xs font-medium">{r.stock_title}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums text-muted-foreground">{r.received_qty}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min="0"
                        max={r.received_qty}
                        step="any"
                        value={r.return_qty}
                        onChange={(e) => updateRow(idx, e.target.value)}
                        className={`h-7 text-xs text-right w-24 ml-auto ${invalid ? "border-destructive" : ""}`}
                        data-testid={`return-line-qty-${idx}`}
                      />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.unit}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={submitting || validRows.length === 0} data-testid="return-submit-btn">
            {submitting && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
            Submit return ({validRows.length} line{validRows.length === 1 ? "" : "s"})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
