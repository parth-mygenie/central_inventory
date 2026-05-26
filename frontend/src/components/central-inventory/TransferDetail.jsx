import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLoginContext } from "@/hooks/useLoginContext";
import { useWriteAction } from "@/hooks/useWriteAction";
import api from "@/services/api";
import { mapRestaurantType, getStatusConfig } from "@/lib/terminology";
import { formatTimestamp } from "@/lib/formatters";
import { getAvailableActions } from "@/lib/transferActions";
import StatusTimeline from "./StatusTimeline";
import ConfirmActionDialog from "./ConfirmActionDialog";
import ReasonDialog, { REPORT_ISSUE_TYPES } from "./ReasonDialog";
import ReceiveDialog from "./ReceiveDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/StateDisplays";
import { StoreTypeBadge, StatusBadge } from "@/components/common/Badges";
import { ArrowLeft, Package, FileWarning, Loader2 } from "lucide-react";

export default function TransferDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { restaurantType, restaurantId } = useLoginContext();
  const { submitting, execute } = useWriteAction();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dialog state
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [reasonDialog, setReasonDialog] = useState(null);
  const [receiveOpen, setReceiveOpen] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await api.getTransferDetails(id);
      setData(resp.data?.data || resp.data);
    } catch (err) {
      const status = err?.response?.status;
      setError(status === 404 || status === 500 ? "Transfer not found" : err?.response?.data?.message || "Failed to load transfer details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  // Action handlers
  const handleApprove = () => {
    setConfirmDialog({
      title: `Approve Transfer #${data.id || id}?`,
      description: `This will approve the transfer from ${data.from_restaurant?.restaurant_name || "source"} to ${data.to_restaurant?.restaurant_name || "destination"} (${(data.lines || data.items || []).length} items).`,
      confirmLabel: "Approve",
      onConfirm: () => execute(() => api.approveTransfer(data.id || id), {
        successMsg: `Transfer #${data.id || id} approved`,
        onSuccess: () => { setConfirmDialog(null); fetchDetail(); },
      }),
    });
  };

  const handleDispatch = () => {
    setConfirmDialog({
      title: `Dispatch Transfer #${data.id || id}?`,
      description: `This will dispatch stock from ${data.from_restaurant?.restaurant_name || "source"} to ${data.to_restaurant?.restaurant_name || "destination"}.`,
      confirmLabel: "Dispatch",
      onConfirm: () => execute(() => api.dispatchTransfer(data.id || id), {
        successMsg: `Transfer #${data.id || id} dispatched`,
        onSuccess: () => { setConfirmDialog(null); fetchDetail(); },
      }),
    });
  };

  const handleReject = () => {
    setReasonDialog({
      title: `Reject Transfer #${data.id || id}`,
      actionLabel: "Reject Transfer",
      actionVariant: "destructive",
      description: "This transfer will be rejected. Please provide a reason.",
      onSubmit: (payload) => execute(() => api.rejectTransfer(data.id || id, payload), {
        successMsg: `Transfer #${data.id || id} rejected`,
        onSuccess: () => { setReasonDialog(null); fetchDetail(); },
      }),
    });
  };

  const handleCancel = () => {
    setReasonDialog({
      title: `Cancel Transfer #${data.id || id}`,
      actionLabel: "Cancel Transfer",
      actionVariant: "destructive",
      description: "This transfer will be cancelled and stock will be restored.",
      onSubmit: (payload) => execute(() => api.cancelTransfer(data.id || id, payload), {
        successMsg: `Transfer #${data.id || id} cancelled — stock restored`,
        onSuccess: () => { setReasonDialog(null); fetchDetail(); },
      }),
    });
  };

  const handleReportIssue = () => {
    setReasonDialog({
      title: `Report Issue — Transfer #${data.id || id}`,
      actionLabel: "Report Issue",
      actionVariant: "default",
      description: "Report an issue with this dispatched transfer (e.g., damage, wrong items).",
      resolutionTypes: REPORT_ISSUE_TYPES,
      onSubmit: (payload) => execute(() => api.rejectTransfer(data.id || id, payload), {
        successMsg: `Issue reported for Transfer #${data.id || id}`,
        onSuccess: () => { setReasonDialog(null); fetchDetail(); },
      }),
    });
  };

  const handleReceive = () => setReceiveOpen(true);

  const handleReceiveSubmit = (payload) => {
    const isPartial = payload.received_lines && payload.received_lines.length > 0;
    execute(() => api.receiveTransfer(data.id || id, payload), {
      successMsg: isPartial ? `Transfer #${data.id || id} partially received` : `Transfer #${data.id || id} received`,
      onSuccess: () => { setReceiveOpen(false); fetchDetail(); },
    });
  };

  const actionHandlers = {
    approve: handleApprove, reject: handleReject, dispatch: handleDispatch,
    receive: handleReceive, cancel: handleCancel, "report-issue": handleReportIssue,
    edit: () => {},
  };

  if (loading) return <LoadingState lines={6} />;
  if (error) return <ErrorState message={error} onRetry={fetchDetail} />;
  if (!data) return <EmptyState title="No transfer data" />;

  const lines = data.lines || data.items || [];
  const fromName = data.from_restaurant?.restaurant_name || data.from_restaurant_name || "—";
  const fromType = data.from_restaurant?.restaurant_type || data.from_restaurant_type;
  const toName = data.to_restaurant?.restaurant_name || data.to_restaurant_name || "—";
  const toType = data.to_restaurant?.restaurant_type || data.to_restaurant_type;
  const hasLineResolution = lines.some((l) => l.accepted_qty != null || l.rejected_qty != null);
  const hasResolution = data.resolution_type || data.resolution_meta;
  const resolutionReason = data.resolution_meta?.reason;
  const receiveTotals = data.resolution_meta?.receive_totals;

  const actions = getAvailableActions(data.status, data.type, restaurantType, restaurantId, data.from_restaurant_id, data.to_restaurant_id);

  return (
    <div data-testid="transfer-detail">
      <button data-testid="transfer-back-button" onClick={() => navigate(-1)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold">Transfer #{data.id || id}</h1>
          <StatusBadge status={data.status} />
        </div>
        {data.type && (
          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded">
            {data.type === "dispatch" ? "Direct Dispatch" : "Request-based"}
          </span>
        )}
      </div>

      <StatusTimeline transfer={data} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">From</p>
            <div className="flex items-center gap-2">
              <span data-testid="transfer-from-name" className="text-sm font-semibold">{fromName}</span>
              {fromType && <StoreTypeBadge backendType={fromType} />}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">To</p>
            <div className="flex items-center gap-2">
              <span data-testid="transfer-to-name" className="text-sm font-semibold">{toName}</span>
              {toType && <StoreTypeBadge backendType={toType} />}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-4">
        <CardContent className="py-3 px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><p className="text-[10px] text-muted-foreground">Transfer ID</p><p className="text-xs font-mono font-medium">{data.id || id}</p></div>
            <div><p className="text-[10px] text-muted-foreground">Status</p><StatusBadge status={data.status} /></div>
            <div><p className="text-[10px] text-muted-foreground">Created</p><p className="text-xs">{formatTimestamp(data.created_at)}</p></div>
            <div><p className="text-[10px] text-muted-foreground">Updated</p><p className="text-xs">{formatTimestamp(data.updated_at)}</p></div>
          </div>
        </CardContent>
      </Card>

      {hasResolution && (
        <Card className="mb-4 border-amber-200" data-testid="resolution-card">
          <CardHeader className="py-2.5 px-4">
            <CardTitle className="text-xs text-amber-700 font-medium uppercase tracking-wider flex items-center gap-1.5">
              <FileWarning className="h-3.5 w-3.5" /> Resolution Details
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-4">
            {data.resolution_type && (
              <div className="mb-2"><span className="text-[10px] text-muted-foreground">Type: </span><span className="text-xs font-medium capitalize">{data.resolution_type.replace(/_/g, " ")}</span></div>
            )}
            {resolutionReason && (
              <div className="mb-2"><span className="text-[10px] text-muted-foreground">Reason: </span><span className="text-xs">{resolutionReason}</span></div>
            )}
            {receiveTotals && (
              <div className="flex gap-4 flex-wrap mt-2 text-xs">
                {receiveTotals.accepted_qty != null && <div><span className="text-[10px] text-muted-foreground block">Accepted</span><span className="font-medium text-emerald-700">{receiveTotals.accepted_qty}</span></div>}
                {receiveTotals.rejected_qty != null && <div><span className="text-[10px] text-muted-foreground block">Rejected</span><span className="font-medium text-rose-700">{receiveTotals.rejected_qty}</span></div>}
                {receiveTotals.damaged_qty != null && <div><span className="text-[10px] text-muted-foreground block">Damaged</span><span className="font-medium text-amber-700">{receiveTotals.damaged_qty}</span></div>}
                {receiveTotals.returned_qty != null && <div><span className="text-[10px] text-muted-foreground block">Returned</span><span className="font-medium text-blue-700">{receiveTotals.returned_qty}</span></div>}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="mb-4">
        <CardHeader className="py-2.5 px-4">
          <CardTitle className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5" /> Line Items
          </CardTitle>
        </CardHeader>
        <CardContent className="py-0 px-0">
          {lines.length === 0 ? <EmptyState title="No line items" /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px]">Item</TableHead>
                  <TableHead className="text-[10px] text-right">Qty</TableHead>
                  <TableHead className="text-[10px]">Unit</TableHead>
                  {hasLineResolution && (
                    <>
                      <TableHead className="text-[10px] text-right">Accepted</TableHead>
                      <TableHead className="text-[10px] text-right">Rejected</TableHead>
                      <TableHead className="text-[10px]">Resolution</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, idx) => (
                  <TableRow key={idx} data-testid={`transfer-line-${idx}`}>
                    <TableCell className="text-xs font-medium">{line.stock_title || line.inventory_master?.stock_title || "—"}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{line.quantity ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{line.unit || "—"}</TableCell>
                    {hasLineResolution && (
                      <>
                        <TableCell className="text-xs text-right tabular-nums">{line.accepted_qty != null ? <span className="text-emerald-700">{line.accepted_qty}</span> : <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums">{line.rejected_qty != null ? <span className="text-rose-700">{line.rejected_qty}</span> : <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell className="text-xs">{line.resolution_type ? <span className="capitalize text-amber-700">{line.resolution_type.replace(/_/g, " ")}</span> : <span className="text-muted-foreground">—</span>}</TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Write-enabled action buttons (Slice 4) */}
      {actions.length > 0 && (
        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Actions</p>
            <div className="flex flex-wrap gap-2">
              {actions.map((action) => (
                <Button
                  key={action.id}
                  data-testid={`action-${action.id}`}
                  variant={action.variant === "destructive" ? "destructive" : action.variant === "outline" ? "outline" : "default"}
                  size="sm"
                  disabled={submitting}
                  onClick={() => actionHandlers[action.id]?.()}
                  className="h-7 text-[11px]"
                >
                  {submitting && <Loader2 className="h-2.5 w-2.5 mr-1 animate-spin" />}
                  {action.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      {confirmDialog && (
        <ConfirmActionDialog
          open={!!confirmDialog}
          onOpenChange={(v) => !v && setConfirmDialog(null)}
          title={confirmDialog.title}
          description={confirmDialog.description}
          confirmLabel={confirmDialog.confirmLabel}
          onConfirm={confirmDialog.onConfirm}
          submitting={submitting}
        />
      )}
      {reasonDialog && (
        <ReasonDialog
          open={!!reasonDialog}
          onOpenChange={(v) => !v && setReasonDialog(null)}
          title={reasonDialog.title}
          actionLabel={reasonDialog.actionLabel}
          actionVariant={reasonDialog.actionVariant}
          description={reasonDialog.description}
          resolutionTypes={reasonDialog.resolutionTypes}
          onSubmit={reasonDialog.onSubmit}
          submitting={submitting}
        />
      )}
      <ReceiveDialog
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        transfer={data}
        onSubmit={handleReceiveSubmit}
        submitting={submitting}
      />
    </div>
  );
}
