import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLoginContext } from "@/hooks/useLoginContext";
import api from "@/services/api";
import { mapRestaurantType, getStatusConfig } from "@/lib/terminology";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "@/components/common/StateDisplays";
import { StoreTypeBadge, StatusBadge } from "@/components/common/Badges";
import {
  ArrowLeft,
  ArrowRight,
  Lock,
  Calendar,
  Hash,
  Truck,
  Package,
} from "lucide-react";

/**
 * SCR-09 Transfer Detail
 *
 * Read-only transfer detail: header + lines + timeline.
 * All action buttons disabled (dispatch, receive, cancel, etc.).
 */
export default function TransferDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { restaurantType, canDo } = useLoginContext();

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

  const statusConfig = getStatusConfig(data.status);
  const lines = data.lines || data.items || [];
  const fromName = data.from_restaurant?.restaurant_name || data.from_restaurant_name || "-";
  const fromType = data.from_restaurant?.restaurant_type || data.from_restaurant_type;
  const toName = data.to_restaurant?.restaurant_name || data.to_restaurant_name || "-";
  const toType = data.to_restaurant?.restaurant_type || data.to_restaurant_type;

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
            {data.type === "direct" ? "Direct Dispatch" : "Request-based"}
          </span>
        )}
      </div>

      {/* Transfer info cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {/* From */}
        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">From</p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{fromName}</span>
              {fromType && <StoreTypeBadge backendType={fromType} />}
            </div>
          </CardContent>
        </Card>

        {/* To */}
        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">To</p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{toName}</span>
              {toType && <StoreTypeBadge backendType={toType} />}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metadata */}
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
              <p className="text-xs">{data.created_at || "-"}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Updated</p>
              <p className="text-xs">{data.updated_at || "-"}</p>
            </div>
            {data.resolution_type && (
              <div>
                <p className="text-[10px] text-muted-foreground">Resolution</p>
                <p className="text-xs">{data.resolution_type}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Line items */}
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
                  <TableHead className="text-[10px]">Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, idx) => (
                  <TableRow key={idx} data-testid={`transfer-line-${idx}`}>
                    <TableCell className="text-xs font-medium">{line.stock_title || line.inventory_master?.stock_title || "-"}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{line.quantity ?? "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{line.unit || "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {line.source_selector
                        ? JSON.stringify(line.source_selector).substring(0, 40) + "..."
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Action buttons (all disabled for Phase 1) */}
      <Card>
        <CardContent className="py-3 px-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Actions</p>
          <div className="flex flex-wrap gap-2">
            {["Approve", "Dispatch", "Receive", "Cancel", "Reject", "Edit"].map((action) => (
              <Button
                key={action}
                data-testid={`action-${action.toLowerCase()}-disabled`}
                variant="outline"
                size="sm"
                disabled
                className="opacity-50 h-7 text-[10px]"
              >
                <Lock className="h-2.5 w-2.5 mr-1" />
                {action}
              </Button>
            ))}
          </div>
          <p className="text-[9px] text-amber-600 mt-2">
            Write API pending / blocked in Phase 1 limited slice.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
