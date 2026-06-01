import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLoginContext } from "@/hooks/useLoginContext";
import { useRestaurantMap } from "@/hooks/useRestaurantMap";
import { useWriteAction } from "@/hooks/useWriteAction";
import api from "@/services/api";
import { mapRestaurantType, getStatusConfig, getLineStatusConfig, TYPE_LABELS } from "@/lib/terminology";
import { formatTimestamp, formatPO, formatRelativeTime } from "@/lib/formatters";
import { getAvailableActions } from "@/lib/transferActions";
import StatusTimeline from "./StatusTimeline";
import ConfirmActionDialog from "./ConfirmActionDialog";
import ReasonDialog, { REPORT_ISSUE_TYPES } from "./ReasonDialog";
import ReceiveDialog from "./ReceiveDialog";
import ApproveWaveDialog from "./ApproveWaveDialog";
import DisputeResolutionDialog from "./DisputeResolutionDialog";
import ItemEditorDialog from "./ItemEditorDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/StateDisplays";
import { StoreTypeBadge, StatusBadge } from "@/components/common/Badges";
import { ArrowLeft, Package, FileWarning, Loader2, Clock, ShieldCheck, BarChart3, RefreshCw, Link2, GitBranch } from "lucide-react";

/** Line-level status badge (P16) */
function LineStatusBadge({ status }) {
  const config = getLineStatusConfig(status);
  return (
    <span
      data-testid={`line-status-${status}`}
      className={`inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full ${config.color}`}
    >
      <span className={`h-1 w-1 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

/** Qty breakdown for P16 lines */
function LineQtyBreakdown({ line }) {
  if (!line.hasApprovalMeta) return null;
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[9px]" data-testid="line-qty-breakdown">
      {line.requestedDisplayQty != null && (
        <span><span className="text-muted-foreground">Req:</span> <span className="font-medium">{line.requestedDisplayQty}</span></span>
      )}
      {line.approvedDisplayQty != null && line.approvedDisplayQty > 0 && (
        <span><span className="text-muted-foreground">Appr:</span> <span className="font-medium text-blue-700">{line.approvedDisplayQty}</span></span>
      )}
      {line.holdDisplayQty != null && line.holdDisplayQty > 0 && (
        <span><span className="text-muted-foreground">Hold:</span> <span className="font-medium text-yellow-700">{line.holdDisplayQty}</span></span>
      )}
      {line.cancelledDisplayQty != null && line.cancelledDisplayQty > 0 && (
        <span><span className="text-muted-foreground">Cancelled:</span> <span className="font-medium text-red-700">{line.cancelledDisplayQty}</span></span>
      )}
      {line.dispatchedDisplayTotal != null && line.dispatchedDisplayTotal > 0 && (
        <span><span className="text-muted-foreground">Dispatched:</span> <span className="font-medium text-indigo-700">{line.dispatchedDisplayTotal}</span></span>
      )}
    </div>
  );
}

export default function TransferDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { restaurantType, restaurantId, isTopLevel } = useLoginContext();
  const { restaurantMap } = useRestaurantMap();
  const { submitting, execute } = useWriteAction();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [linkedMods, setLinkedMods] = useState([]);

  // C1: Requester store snapshot + approval impact state
  const [requesterStock, setRequesterStock] = useState([]);
  const [ownStock, setOwnStock] = useState([]);
  const [snapshotLoading, setSnapshotLoading] = useState(false);

  // Dialog state
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [reasonDialog, setReasonDialog] = useState(null);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [approveWaveOpen, setApproveWaveOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [amendOpen, setAmendOpen] = useState(false);
  const [modificationOpen, setModificationOpen] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await api.getTransferDetails(id);
      const transfer = resp.data?.data || resp.data;
      setData(transfer);
      // Fetch linked modification requests (children of this transfer)
      if (transfer && !transfer.isModificationRequest) {
        try {
          const histResp = await api.getTransferHistory();
          const histItems = histResp.data?.data || histResp.data || [];
          const children = (Array.isArray(histItems) ? histItems : []).filter(
            (t) => t.type === "modification_request" && String(t.parent_transfer_id) === String(id)
          );
          setLinkedMods(children);
        } catch { setLinkedMods([]); }
      } else {
        setLinkedMods([]);
      }
    } catch (err) {
      const status = err?.response?.status;
      setError(status === 404 || status === 500 ? "Transfer not found" : err?.response?.data?.message || "Failed to load transfer details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  // C1: Fetch requester store snapshot + own stock for approval impact
  useEffect(() => {
    if (!data || !isTopLevel) return;
    if (!["requested", "approved", "partially_approved"].includes(data.status)) return;
    let cancelled = false;
    (async () => {
      setSnapshotLoading(true);
      try {
        const [reqResp, ownResp] = await Promise.allSettled([
          api.getHierarchyDetail({ storeRestaurantId: data.to_restaurant_id }),
          api.getStockInventory(),
        ]);
        if (cancelled) return;
        if (reqResp.status === "fulfilled") {
          const rd = reqResp.value?.data?.data || reqResp.value?.data;
          setRequesterStock(rd?.child_stock_summary || []);
        }
        if (ownResp.status === "fulfilled") {
          setOwnStock(ownResp.value?.data?.current_stocks || []);
        }
      } catch (e) {
        console.warn("[transfer-detail] Snapshot fetch failed:", e);
      } finally {
        if (!cancelled) setSnapshotLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [data, isTopLevel]);

  // ── Action handlers ────────────────────────────────────────────
  const handleApprove = () => {
    setConfirmDialog({
      title: `Approve All — Transfer #${data.id || id}?`,
      description: `This will fully approve all items. Use "Partial Approve" for selective approval.`,
      confirmLabel: "Approve All",
      onConfirm: () => execute(() => api.approveTransfer(data.id || id), {
        successMsg: `Transfer #${data.id || id} approved`,
        onSuccess: () => { setConfirmDialog(null); fetchDetail(); },
      }),
    });
  };

  const handlePartialApprove = () => setApproveWaveOpen(true);

  const handlePartialApproveSubmit = ({ approvalLines, defaultRemainderPolicy }) => {
    execute(() => api.approveTransferPartial(data.id || id, { approvalLines, defaultRemainderPolicy }), {
      successMsg: `Partial approve submitted for Transfer #${data.id || id}`,
      onSuccess: () => { setApproveWaveOpen(false); fetchDetail(); },
    });
  };

  const handleCancelRemainder = () => {
    // P16: Collect IDs of lines with outstanding hold to cancel
    const holdLineIds = lines
      .filter((l) => (l.holdDisplayQty ?? 0) > 0 || l.lineStatus === "on_hold")
      .map((l) => l.id)
      .filter(Boolean);
    setConfirmDialog({
      title: `Cancel Remainder — Transfer #${data.id || id}?`,
      description: `This will cancel all held lines (${holdLineIds.length} line${holdLineIds.length !== 1 ? "s" : ""}) and transition the transfer to "Approved" for dispatch.`,
      confirmLabel: "Cancel Remainder",
      onConfirm: () => execute(() => api.cancelRemainder(data.id || id, holdLineIds), {
        successMsg: `Remainder cancelled for Transfer #${data.id || id}`,
        onSuccess: () => { setConfirmDialog(null); fetchDetail(); },
      }),
    });
  };

  const handleDispatch = () => {
    setConfirmDialog({
      title: `Dispatch Transfer #${data.id || id}?`,
      description: `This will dispatch approved stock. On-hold or cancelled lines will be skipped.`,
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

  const handleResolveDispute = () => setDisputeOpen(true);

  const handleDisputeSubmit = ({ accept, note }) => {
    execute(() => api.resolveDispute(data.id || id, { accept, note }), {
      successMsg: accept
        ? `Dispute accepted for Transfer #${data.id || id}`
        : `Dispute rejected — Transfer #${data.id || id} reverted to dispatched`,
      onSuccess: () => { setDisputeOpen(false); fetchDetail(); },
    });
  };

  // P17: Amend — franchise replaces lines in-place
  const handleAmend = () => setAmendOpen(true);
  const handleAmendSubmit = (items) => {
    execute(() => api.amendRequest(data.id || id, items), {
      successMsg: `Request #${data.id || id} amended`,
      onSuccess: () => { setAmendOpen(false); fetchDetail(); },
    });
  };

  // P17: Withdraw — terminal, irreversible
  const handleWithdraw = () => {
    setConfirmDialog({
      title: `Withdraw Request #${data.id || id}?`,
      description: "This will permanently withdraw this request. This action cannot be undone — the request will be removed from the approval queue.",
      confirmLabel: "Withdraw Request",
      variant: "destructive",
      onConfirm: () => execute(() => api.withdrawRequest(data.id || id), {
        successMsg: `Request #${data.id || id} withdrawn`,
        onSuccess: () => { setConfirmDialog(null); fetchDetail(); },
      }),
    });
  };

  // P17: Modification — creates child transfer
  const handleModification = () => setModificationOpen(true);
  const handleModificationSubmit = (items) => {
    execute(() => api.requestModification(data.id || id, items), {
      successMsg: `Modification request created for Transfer #${data.id || id}`,
      onSuccess: (resp) => {
        setModificationOpen(false);
        const childId = resp?.data?.data?.transfer_id || resp?.data?.transfer_id;
        if (childId) navigate(`/transfer/${childId}`);
        else fetchDetail();
      },
    });
  };

  const actionHandlers = {
    approve: handleApprove,
    "partial-approve": handlePartialApprove,
    "cancel-remainder": handleCancelRemainder,
    reject: handleReject,
    dispatch: handleDispatch,
    receive: handleReceive,
    cancel: handleCancel,
    "report-issue": handleReportIssue,
    "resolve-dispute": handleResolveDispute,
    amend: handleAmend,
    withdraw: handleWithdraw,
    modification: handleModification,
  };

  if (loading) return <LoadingState lines={6} />;
  if (error) return <ErrorState message={error} onRetry={fetchDetail} />;
  if (!data) return <EmptyState title="No transfer data" />;

  const lines = data.lines || data.items || [];
  const fromName = restaurantMap[String(data.from_restaurant_id)]?.name || data.from_restaurant?.restaurant_name || data.from_restaurant_name || "—";
  const fromType = data.from_restaurant?.restaurant_type || data.from_restaurant_type || restaurantMap[String(data.from_restaurant_id)]?.type;
  const toName = restaurantMap[String(data.to_restaurant_id)]?.name || data.to_restaurant?.restaurant_name || data.to_restaurant_name || "—";
  const toType = data.to_restaurant?.restaurant_type || data.to_restaurant_type || restaurantMap[String(data.to_restaurant_id)]?.type;

  const hasLineResolution = lines.some((l) => l.accepted_qty != null || l.rejected_qty != null);
  const hasP16Meta = lines.some((l) => l.hasApprovalMeta);
  const hasResolution = data.resolution_type || data.resolution_meta;
  const resolutionReason = data.resolution_meta?.reason;
  const receiveTotals = data.resolution_meta?.receive_totals;
  const disputeMeta = data.resolution_meta?.receive_dispute;
  const disputeRejected = data.resolution_meta?.receive_dispute_rejected;
  const isDispute = data.status === "receive_dispute_pending";

  // P16: Compute hold/dispatch state for action matrix
  const hasOutstandingHold = lines.some((l) =>
    (l.holdDisplayQty ?? 0) > 0 || l.lineStatus === "on_hold"
  );
  const hasApprovedUndispatched = lines.some((l) =>
    (l.approvedDisplayQty ?? 0) > 0 && (l.dispatchedDisplayTotal ?? 0) < (l.approvedDisplayQty ?? 0)
  );

  const actions = getAvailableActions(
    data.status, data.type, restaurantType, restaurantId,
    data.from_restaurant_id, data.to_restaurant_id,
    { hasOutstandingHold, hasApprovedUndispatched }
  );

  return (
    <div data-testid="transfer-detail">
      <button data-testid="transfer-back-button" onClick={() => navigate(-1)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold">{formatPO(data.id || id)}</h1>
          <StatusBadge status={data.status} />
          {data.created_at && (
            <span className="text-xs text-muted-foreground">Created {formatRelativeTime(data.created_at)}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            data-testid="refresh-transfer-btn"
            variant="ghost"
            size="sm"
            onClick={fetchDetail}
            disabled={loading}
            className="h-7 text-xs gap-1"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          {data.type && (
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded">
              {TYPE_LABELS[data.type] || data.type}
            </span>
          )}
        </div>
      </div>

      {/* P17: Parent transfer link for modification_request */}
      {data.parentTransferId && (
        <div data-testid="parent-transfer-link" className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link2 className="h-3 w-3" />
          <span>Modification of</span>
          <button
            onClick={() => navigate(`/transfer/${data.parentTransferId}`)}
            className="font-mono font-medium text-blue-600 hover:underline"
          >
            Transfer #{data.parentTransferId}
          </button>
        </div>
      )}

      <StatusTimeline transfer={data} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
              From {String(data.from_restaurant_id) === String(restaurantId) ? "(Source — You)" : ""}
            </p>
            <div className="flex items-center gap-2">
              <span data-testid="transfer-from-name" className="text-sm font-semibold">{fromName}</span>
              {fromType && <StoreTypeBadge backendType={fromType} />}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
              To {String(data.to_restaurant_id) !== String(restaurantId) ? "(Requester)" : "(You)"}
            </p>
            <div className="flex items-center gap-2">
              <span data-testid="transfer-to-name" className="text-sm font-semibold">{toName}</span>
              {toType && <StoreTypeBadge backendType={toType} />}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* C1: Requester Store Snapshot + Approval Impact (Central only, requested/approved status) */}
      {isTopLevel && ["requested", "approved", "partially_approved"].includes(data.status) && snapshotLoading && requesterStock.length === 0 && (
        <Card className="mb-4">
          <CardContent className="py-6 px-4 text-center">
            <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Loading requester store snapshot...</p>
          </CardContent>
        </Card>
      )}
      {isTopLevel && ["requested", "approved", "partially_approved"].includes(data.status) && requesterStock.length > 0 && (
        <>
          {/* REQUESTER STORE SNAPSHOT */}
          <Card className="mb-4 border-l-[3px] border-l-blue-500" data-testid="requester-snapshot">
            <CardHeader className="py-2.5 px-4">
              <CardTitle className="text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 text-blue-700">
                <BarChart3 className="h-3.5 w-3.5" />
                Requester Store Snapshot — {toName}
              </CardTitle>
            </CardHeader>
            <CardContent className="py-0 px-0">
              {/* Summary stat cards */}
              {(() => {
                const outCount = requesterStock.filter(i => (parseFloat(i.display_quantity) || 0) === 0).length;
                const lowCount = requesterStock.filter(i => i.is_low_stock && (parseFloat(i.display_quantity) || 0) > 0).length;
                const adequateCount = requesterStock.filter(i => !i.is_low_stock && (parseFloat(i.display_quantity) || 0) > 0).length;
                const requestedTitles = new Set(lines.map(l => (l.stock_title || "").toLowerCase()));
                const outNotRequested = requesterStock.filter(i => (parseFloat(i.display_quantity) || 0) === 0 && !requestedTitles.has((i.stock_title || "").toLowerCase())).length;
                return (
                  <>
                    <div className="grid grid-cols-4 gap-2 px-4 py-3 border-b border-border/50">
                      <div className="text-center">
                        <p className="text-lg font-bold text-red-600 tabular-nums">{outCount}</p>
                        <p className="text-[9px] text-muted-foreground uppercase">Out of Stock</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-amber-600 tabular-nums">{lowCount}</p>
                        <p className="text-[9px] text-muted-foreground uppercase">Low Stock</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-emerald-600 tabular-nums">{adequateCount}</p>
                        <p className="text-[9px] text-muted-foreground uppercase">Adequate</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold tabular-nums">{requesterStock.length}</p>
                        <p className="text-[9px] text-muted-foreground uppercase">Total Items</p>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-[10px]">Item</TableHead>
                            <TableHead className="text-[10px] text-right">Stock Level</TableHead>
                            <TableHead className="text-[10px] text-right">Min Threshold</TableHead>
                            <TableHead className="text-[10px]">Status</TableHead>
                            <TableHead className="text-[10px]">In This Request?</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {requesterStock.map((item, idx) => {
                            const qty = parseFloat(item.display_quantity) || 0;
                            const minQty = parseFloat(item.min_qty_alert) || 0;
                            const isOut = qty === 0;
                            const isLow = item.is_low_stock && qty > 0;
                            const matchedLine = lines.find(l => (l.stock_title || "").toLowerCase() === (item.stock_title || "").toLowerCase());
                            return (
                              <TableRow key={idx} data-testid={`snapshot-row-${idx}`} className={isOut ? "bg-red-50/30" : isLow ? "bg-amber-50/30" : ""}>
                                <TableCell className="text-xs font-medium">
                                  {item.stock_title} <span className="text-muted-foreground">{item.unit}</span>
                                </TableCell>
                                <TableCell className={`text-xs text-right tabular-nums ${isOut ? "text-red-600 font-semibold" : isLow ? "text-amber-600" : ""}`}>
                                  {qty} {item.unit}
                                </TableCell>
                                <TableCell className="text-xs text-right tabular-nums text-muted-foreground">{minQty} {item.unit}</TableCell>
                                <TableCell>
                                  {isOut ? (
                                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">OUT</span>
                                  ) : isLow ? (
                                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">LOW</span>
                                  ) : (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">OK</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {matchedLine ? (
                                    <span className="text-blue-700 font-medium">Yes — {matchedLine.requestedDisplayQty ?? matchedLine.quantity} {matchedLine.unit}</span>
                                  ) : (
                                    <span className="text-muted-foreground">Not requested</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    {outNotRequested > 0 && (
                      <p className="text-[10px] text-muted-foreground px-4 py-2 border-t border-border/50">
                        {outNotRequested} out-of-stock item{outNotRequested > 1 ? "s" : ""} not included in this request
                      </p>
                    )}
                  </>
                );
              })()}
            </CardContent>
          </Card>

          {/* APPROVAL IMPACT ON YOUR STOCK */}
          <Card className="mb-4 border-l-[3px] border-l-amber-500" data-testid="approval-impact">
            <CardHeader className="py-2.5 px-4">
              <CardTitle className="text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 text-amber-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                Approval Impact on Your Stock
              </CardTitle>
            </CardHeader>
            <CardContent className="py-0 px-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px]">Item</TableHead>
                      <TableHead className="text-[10px] text-right">Requested</TableHead>
                      <TableHead className="text-[10px] text-right">Your Stock</TableHead>
                      <TableHead className="text-[10px] text-right">After Approval</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line, idx) => {
                      const requested = line.requestedDisplayQty ?? line.quantity ?? 0;
                      const myItem = ownStock.find(s => (s.stock_title || "").toLowerCase() === (line.stock_title || "").toLowerCase());
                      const myQty = myItem?.display_qty ?? 0;
                      const afterQty = Math.round((myQty - requested) * 10000) / 10000;
                      const isNegative = afterQty < 0;
                      return (
                        <TableRow key={idx} data-testid={`impact-row-${idx}`}>
                          <TableCell className="text-xs font-medium">{line.stock_title} <span className="text-muted-foreground">{line.unit}</span></TableCell>
                          <TableCell className="text-xs text-right tabular-nums font-mono">{requested} {line.unit}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{myQty} {myItem?.display_unit || line.unit}</TableCell>
                          <TableCell className={`text-xs text-right tabular-nums font-mono font-semibold ${isNegative ? "text-red-600" : "text-muted-foreground"}`}>
                            {afterQty} {line.unit}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <p className="text-[10px] text-amber-700 px-4 py-2 border-t border-border/50">
                Approving will reduce your stock as shown above
              </p>
            </CardContent>
          </Card>
        </>
      )}
      {/* Transfer metadata */}
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

      {/* Resolution / Dispute info */}
      {(hasResolution || isDispute) && (
        <Card className={`mb-4 ${isDispute ? "border-orange-300" : "border-amber-200"}`} data-testid="resolution-card">
          <CardHeader className="py-2.5 px-4">
            <CardTitle className={`text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 ${isDispute ? "text-orange-700" : "text-amber-700"}`}>
              <FileWarning className="h-3.5 w-3.5" />
              {isDispute ? "Receive Dispute Pending" : "Resolution Details"}
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-4 space-y-2">
            {data.resolution_type && !isDispute && (
              <div><span className="text-[10px] text-muted-foreground">Type: </span><span className="text-xs font-medium capitalize">{data.resolution_type.replace(/_/g, " ")}</span></div>
            )}
            {resolutionReason && (
              <div><span className="text-[10px] text-muted-foreground">Reason: </span><span className="text-xs">{resolutionReason}</span></div>
            )}
            {/* Dispute details */}
            {disputeMeta && (
              <div className="text-xs space-y-1 border-t pt-2 mt-1">
                <p className="text-[10px] text-muted-foreground font-medium">Dispute submitted {disputeMeta.submitted_at && `at ${new Date(disputeMeta.submitted_at).toLocaleString()}`}</p>
                {disputeMeta.received_lines?.map((dl, i) => (
                  <div key={i} className="flex gap-3">
                    <span>Line #{dl.line_id}</span>
                    <span className="text-emerald-700">Accepted: {dl.accepted_qty}</span>
                    {dl.rejected_qty > 0 && <span className="text-rose-700">Rejected: {dl.rejected_qty}</span>}
                  </div>
                ))}
              </div>
            )}
            {/* Previous dispute rejection note */}
            {disputeRejected && (
              <div className="text-xs border-t pt-2 mt-1">
                <p className="text-[10px] text-amber-700 font-medium">Previous dispute was rejected</p>
                <p className="text-muted-foreground">{disputeRejected.note}</p>
              </div>
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

      {/* Line Items */}
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
                  {hasP16Meta && <TableHead className="text-[10px]">Line Status</TableHead>}
                  <TableHead className="text-[10px] text-right">Qty</TableHead>
                  <TableHead className="text-[10px]">Unit</TableHead>
                  {hasP16Meta && <TableHead className="text-[10px]">Breakdown</TableHead>}
                  {hasLineResolution && (
                    <>
                      <TableHead className="text-[10px] text-right">Accepted</TableHead>
                      <TableHead className="text-[10px] text-right">Rejected</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, idx) => (
                  <TableRow
                    key={line.id || `line-${idx}`}
                    data-testid={`transfer-line-${idx}`}
                    className={
                      line.lineStatus === "cancelled_remainder" ? "opacity-50 line-through" :
                      line.lineStatus === "on_hold" ? "bg-yellow-50/40" :
                      line.lineStatus === "partially_approved" ? "bg-sky-50/30" : ""
                    }
                  >
                    <TableCell className="text-xs font-medium">{line.stock_title || "—"}</TableCell>
                    {hasP16Meta && (
                      <TableCell><LineStatusBadge status={line.lineStatus} /></TableCell>
                    )}
                    <TableCell className="text-xs text-right tabular-nums">{line.quantity ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{line.unit || "—"}</TableCell>
                    {hasP16Meta && (
                      <TableCell><LineQtyBreakdown line={line} /></TableCell>
                    )}
                    {hasLineResolution && (
                      <>
                        <TableCell className="text-xs text-right tabular-nums">{line.accepted_qty != null ? <span className="text-emerald-700">{line.accepted_qty}</span> : <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums">{line.rejected_qty != null ? <span className="text-rose-700">{line.rejected_qty}</span> : <span className="text-muted-foreground">—</span>}</TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Approval Waves audit (P16) */}
      {hasP16Meta && lines.some((l) => l.approvalWaves?.length > 0) && (
        <Card className="mb-4" data-testid="approval-waves-card">
          <CardHeader className="py-2.5 px-4">
            <CardTitle className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" /> Approval Waves
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-4">
            {lines.filter((l) => l.approvalWaves?.length > 0).map((line, lIdx) => (
              <div key={lIdx} className="mb-2 last:mb-0">
                <p className="text-[10px] font-medium text-muted-foreground mb-1">{line.stock_title}</p>
                <div className="space-y-1">
                  {line.approvalWaves.map((wave, wIdx) => (
                    <div key={wIdx} className="flex items-center gap-2 text-[10px] pl-2 border-l-2 border-blue-200">
                      <span className="font-medium text-blue-700">Wave {wIdx + 1}</span>
                      <span>{wave.approved_display_qty} {line.unit}</span>
                      <span className="text-muted-foreground">{wave.at ? new Date(wave.at).toLocaleString() : ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* P17: Linked Modification Requests (parent view) */}
      {linkedMods.length > 0 && (
        <Card className="mb-4" data-testid="linked-modifications-card">
          <CardHeader className="py-2.5 px-4">
            <CardTitle className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1.5">
              <GitBranch className="h-3.5 w-3.5" />
              Modification Requests
              <span className="ml-1 bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">{linkedMods.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="py-0 px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px]">ID</TableHead>
                  <TableHead className="text-[10px]">Status</TableHead>
                  <TableHead className="text-[10px]">Created</TableHead>
                  <TableHead className="text-[10px]">Items</TableHead>
                  <TableHead className="text-[10px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linkedMods.map((mod) => (
                  <TableRow
                    key={mod.id}
                    data-testid={`linked-mod-${mod.id}`}
                    className="cursor-pointer hover:bg-accent/50"
                    onClick={() => navigate(`/transfer/${mod.id}`)}
                  >
                    <TableCell className="text-xs font-mono font-medium">#{mod.id}</TableCell>
                    <TableCell><StatusBadge status={mod.status} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatTimestamp(mod.created_at)}</TableCell>
                    <TableCell className="text-xs tabular-nums">{mod.items_count ?? "—"}</TableCell>
                    <TableCell>
                      <span className="text-[10px] text-blue-600 hover:underline">View</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Action buttons */}
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
      <ApproveWaveDialog
        open={approveWaveOpen}
        onOpenChange={setApproveWaveOpen}
        transfer={data}
        onSubmit={handlePartialApproveSubmit}
        submitting={submitting}
      />
      <DisputeResolutionDialog
        open={disputeOpen}
        onOpenChange={setDisputeOpen}
        transfer={data}
        onSubmit={handleDisputeSubmit}
        submitting={submitting}
      />
      <ItemEditorDialog
        open={amendOpen}
        onOpenChange={setAmendOpen}
        transfer={data}
        title={`Amend Request #${data?.id || id}`}
        description="Replace all items in this request. Existing lines will be removed."
        submitLabel="Amend Request"
        onSubmit={handleAmendSubmit}
        submitting={submitting}
      />
      <ItemEditorDialog
        open={modificationOpen}
        onOpenChange={setModificationOpen}
        transfer={data}
        title={`Request Modification — Transfer #${data?.id || id}`}
        description="Request additional or changed quantities. A new modification request will be created for central approval."
        submitLabel="Submit Modification"
        onSubmit={handleModificationSubmit}
        submitting={submitting}
      />
    </div>
  );
}
