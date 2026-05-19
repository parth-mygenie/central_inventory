import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLoginContext } from "@/hooks/useLoginContext";
import api from "@/services/api";
import { mapRestaurantType, getStatusConfig } from "@/lib/terminology";
import { formatTimestamp } from "@/lib/formatters";
import { getAvailableActions } from "@/lib/transferActions";
import StatusTimeline from "./StatusTimeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "@/components/common/StateDisplays";
import { StoreTypeBadge, StatusBadge } from "@/components/common/Badges";
import {
  ArrowLeft,
  Lock,
  Package,
  FileWarning,
} from "lucide-react";

/**
 * SCR-09 Transfer Detail — Slice 2
 *
 * Enhancements:
 * - Status timeline (Item 2)
 * - Line-level accept/reject display (Item 3)
 * - Formatted timestamps (Item 4)
 * - Resolution reason display (Item 5)
 * - Contextual action buttons by role + status (Item 7)
 */
export default function TransferDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { restaurantType, restaurantId } = useLoginContext();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await api.getTransferDetails(id);
      const d = resp.data?.data || resp.data;
      setData(d);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404 || status === 500) {
        setError("Transfer not found");
      } else {
        setError(err?.response?.data?.message || "Failed to load transfer details");
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  if (loading) return <LoadingState lines={6} />;
  if (error) return <ErrorState message={error} onRetry={fetchDetail} />;
  if (!data) return <EmptyState title="No transfer data" />;

  const lines = data.lines || data.items || [];
  const fromName = data.from_restaurant?.restaurant_name || data.from_restaurant_name || "—";
  const fromType = data.from_restaurant?.restaurant_type || data.from_restaurant_type;
  const toName = data.to_restaurant?.restaurant_name || data.to_restaurant_name || "—";
  const toType = data.to_restaurant?.restaurant_type || data.to_restaurant_type;

  // Determine if line-level accept/reject data exists
  const hasLineResolution = lines.some(
    (l) => l.accepted_qty != null || l.rejected_qty != null
  );

  // Resolution data
  const hasResolution = data.resolution_type || data.resolution_meta;
  const resolutionReason = data.resolution_meta?.reason;
  const receiveTotals = data.resolution_meta?.receive_totals;

  // Contextual actions (Item 7)
  const actions = getAvailableActions(
    data.status,
    data.type,
    restaurantType,
    restaurantId,
    data.from_restaurant_id,
    data.to_restaurant_id
  );

  return (
    <div data-testid="transfer-detail">
      {/* Back button */}
      <button
        data-testid="transfer-back-button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </button>

      {/* Header */}
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

      {/* Status Timeline (Item 2) */}
      <StatusTimeline transfer={data} />

      {/* Transfer info cards */}
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

      {/* Metadata (Item 4 — formatted timestamps) */}
      <Card className="mb-4">
        <CardContent className="py-3 px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <p className="text-[10px] text-muted-foreground">Transfer ID</p>
              <p className="text-xs font-mono font-medium">{data.id || id}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Status</p>
              <StatusBadge status={data.status} />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Created</p>
              <p className="text-xs">{formatTimestamp(data.created_at)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Updated</p>
              <p className="text-xs">{formatTimestamp(data.updated_at)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resolution Details (Item 5) */}
      {hasResolution && (
        <Card className="mb-4 border-amber-200" data-testid="resolution-card">
          <CardHeader className="py-2.5 px-4">
            <CardTitle className="text-xs text-amber-700 font-medium uppercase tracking-wider flex items-center gap-1.5">
              <FileWarning className="h-3.5 w-3.5" />
              Resolution Details
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-4">
            {data.resolution_type && (
              <div className="mb-2">
                <span className="text-[10px] text-muted-foreground">Type: </span>
                <span className="text-xs font-medium capitalize">
                  {data.resolution_type.replace(/_/g, " ")}
                </span>
              </div>
            )}
            {resolutionReason && (
              <div className="mb-2">
                <span className="text-[10px] text-muted-foreground">Reason: </span>
                <span className="text-xs">{resolutionReason}</span>
              </div>
            )}
            {receiveTotals && (
              <div className="flex gap-4 flex-wrap mt-2 text-xs">
                {receiveTotals.accepted_qty != null && (
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Accepted</span>
                    <span className="font-medium text-emerald-700">{receiveTotals.accepted_qty}</span>
                  </div>
                )}
                {receiveTotals.rejected_qty != null && (
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Rejected</span>
                    <span className="font-medium text-rose-700">{receiveTotals.rejected_qty}</span>
                  </div>
                )}
                {receiveTotals.damaged_qty != null && (
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Damaged</span>
                    <span className="font-medium text-amber-700">{receiveTotals.damaged_qty}</span>
                  </div>
                )}
                {receiveTotals.returned_qty != null && (
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Returned</span>
                    <span className="font-medium text-blue-700">{receiveTotals.returned_qty}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Line Items (Item 3 — line-level accept/reject) */}
      <Card className="mb-4">
        <CardHeader className="py-2.5 px-4">
          <CardTitle className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5" />
            Line Items
          </CardTitle>
        </CardHeader>
        <CardContent className="py-0 px-0">
          {lines.length === 0 ? (
            <EmptyState title="No line items" />
          ) : (
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
                    <TableCell className="text-xs font-medium">
                      {line.stock_title || line.inventory_master?.stock_title || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{line.quantity ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{line.unit || "—"}</TableCell>
                    {hasLineResolution && (
                      <>
                        <TableCell className="text-xs text-right tabular-nums">
                          {line.accepted_qty != null ? (
                            <span className="text-emerald-700">{line.accepted_qty}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-right tabular-nums">
                          {line.rejected_qty != null ? (
                            <span className="text-rose-700">{line.rejected_qty}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {line.resolution_type ? (
                            <span className="capitalize text-amber-700">
                              {line.resolution_type.replace(/_/g, " ")}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Contextual Action Buttons (Item 7) */}
      {actions.length > 0 && (
        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Actions</p>
            <div className="flex flex-wrap gap-2">
              {actions.map((action) => (
                <Button
                  key={action.id}
                  data-testid={`action-${action.id}-disabled`}
                  variant={action.variant === "destructive" ? "outline" : "outline"}
                  size="sm"
                  disabled
                  className="opacity-60 h-7 text-[10px]"
                >
                  <Lock className="h-2.5 w-2.5 mr-1" />
                  {action.label}
                  <span className="ml-1 text-[8px] opacity-70">(Write API blocked)</span>
                </Button>
              ))}
            </div>
            <p className="text-[9px] text-amber-600 mt-2">
              Write API pending / blocked in Phase 1 limited slice.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
