import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useLoginContext } from "@/hooks/useLoginContext";
import api from "@/services/api";
import { mapRestaurantType } from "@/lib/terminology";
import { formatTimestamp } from "@/lib/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "@/components/common/StateDisplays";
import { StoreTypeBadge, StatusBadge } from "@/components/common/Badges";
import {
  Package,
  AlertTriangle,
  ArrowLeftRight,
  ChevronRight,
} from "lucide-react";

/**
 * SCR-03 Store Detail — Slice 2
 *
 * Enhancement:
 * - Formatted timestamps in transactions (Item 4)
 */
export default function StoreDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { restaurantType: userType, canDo, restaurantId } = useLoginContext();

  const navState = location.state || {};

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStock, setSelectedStock] = useState(null);

  const storeId = id || restaurantId;

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { storeRestaurantId: Number(storeId) };
      if (selectedStock) {
        params.selectedStockTitle = selectedStock.stock_title;
        params.selectedUnitId = selectedStock.unit_id;
      }
      const resp = await api.getHierarchyDetail(params);
      const d = resp.data?.data || resp.data;
      setData(d);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load store detail");
    } finally {
      setLoading(false);
    }
  }, [storeId, selectedStock]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  if (loading) return <LoadingState lines={6} />;
  if (error) return <ErrorState message={error} onRetry={fetchDetail} />;
  if (!data) return <EmptyState title="No store data" />;

  const storeName = data.store_restaurant_name || navState.storeName || `Store #${storeId}`;
  const storeType = data.restaurant_type || navState.storeType;
  const stockSummary = data.child_stock_summary || [];
  const childBatches = data.child_stock_batches || [];
  const transactions = data.transactions || [];
  const childStores = data.restaurants || [];

  return (
    <div data-testid="store-detail">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold">{storeName}</h1>
          <StoreTypeBadge backendType={storeType} />
        </div>
        <div className="flex gap-2">
          {canDo("dispatch") && (
            <Button
              data-testid="action-dispatch-disabled"
              variant="outline"
              size="sm"
              disabled
              className="opacity-50"
            >
              Dispatch Stock
              <span className="ml-1 text-[9px]">(blocked)</span>
            </Button>
          )}
          {canDo("request-stock") && (
            <Button
              data-testid="action-request-disabled"
              variant="outline"
              size="sm"
              disabled
              className="opacity-50"
            >
              Request Stock
              <span className="ml-1 text-[9px]">(blocked)</span>
            </Button>
          )}
        </div>
      </div>

      {/* Child stores navigation */}
      {childStores.length > 0 && (
        <Card className="mb-4">
          <CardHeader className="py-2.5 px-4">
            <CardTitle className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Child Stores
            </CardTitle>
          </CardHeader>
          <CardContent className="py-0 px-4 pb-3">
            <div className="flex flex-wrap gap-2">
              {childStores.map((cs) => (
                <button
                  key={cs.restaurant_id || cs.id}
                  data-testid={`child-store-${cs.restaurant_id || cs.id}`}
                  className="flex items-center gap-1.5 text-xs border rounded-md px-2.5 py-1.5 hover:bg-accent transition-colors"
                  onClick={() =>
                    navigate(`/store/${cs.restaurant_id || cs.id}`, {
                      state: {
                        storeName: cs.restaurant_name || cs.name,
                        storeType: cs.restaurant_type || cs.type,
                      },
                    })
                  }
                >
                  {cs.restaurant_name || cs.name}
                  <StoreTypeBadge backendType={cs.restaurant_type || cs.type} />
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stock summary */}
      <Card className="mb-4">
        <CardHeader className="py-2.5 px-4">
          <CardTitle className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5" />
            Stock Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="py-0 px-0">
          {stockSummary.length === 0 ? (
            <EmptyState title="No stock items" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px]">Item</TableHead>
                  <TableHead className="text-[10px]">Unit</TableHead>
                  <TableHead className="text-[10px] text-right">Qty</TableHead>
                  <TableHead className="text-[10px] text-right">Display</TableHead>
                  <TableHead className="text-[10px] text-center">Low Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockSummary.map((item, idx) => (
                  <TableRow
                    key={idx}
                    data-testid={`stock-row-${idx}`}
                    className={`cursor-pointer hover:bg-accent/50 ${item.is_low_stock ? "bg-amber-50/50" : ""}`}
                    onClick={() =>
                      setSelectedStock({
                        stock_title: item.stock_title,
                        unit_id: item.unit_id,
                      })
                    }
                  >
                    <TableCell className="text-xs font-medium">{item.stock_title}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.unit}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{item.cal_quantity}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{item.display_qty ?? item.cal_quantity}</TableCell>
                    <TableCell className="text-center">
                      {item.is_low_stock && (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mx-auto" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Batch drilldown */}
      {selectedStock && (
        <Card className="mb-4">
          <CardHeader className="py-2.5 px-4 flex-row items-center justify-between">
            <CardTitle className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Batches — {selectedStock.stock_title}
            </CardTitle>
            <button
              className="text-[10px] text-muted-foreground hover:text-foreground"
              onClick={() => setSelectedStock(null)}
            >
              Clear
            </button>
          </CardHeader>
          <CardContent className="py-0 px-0">
            {childBatches.length === 0 ? (
              <EmptyState title="No batch data" description="Batch detail may require a re-fetch" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px]">Batch</TableHead>
                    <TableHead className="text-[10px]">Expiry</TableHead>
                    <TableHead className="text-[10px] text-right">Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {childBatches.map((batch, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-xs">{batch.batch || "—"}</TableCell>
                      <TableCell className="text-xs">{batch.expiry_date || "—"}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{batch.cal_quantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Transactions (Item 4 — formatted timestamps) */}
      <Card>
        <CardHeader className="py-2.5 px-4">
          <CardTitle className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1.5">
            <ArrowLeftRight className="h-3.5 w-3.5" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent className="py-0 px-0">
          {transactions.length === 0 ? (
            <EmptyState title="No transactions today" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px]">ID</TableHead>
                  <TableHead className="text-[10px]">From</TableHead>
                  <TableHead className="text-[10px]">To</TableHead>
                  <TableHead className="text-[10px]">Item</TableHead>
                  <TableHead className="text-[10px] text-right">Qty</TableHead>
                  <TableHead className="text-[10px]">Status</TableHead>
                  <TableHead className="text-[10px]">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((txn, idx) => (
                  <TableRow
                    key={idx}
                    data-testid={`txn-row-${idx}`}
                    className="cursor-pointer hover:bg-accent/50"
                    onClick={() => txn.transfer_id && navigate(`/transfer/${txn.transfer_id}`)}
                  >
                    <TableCell className="text-xs font-mono">{txn.transfer_id || "—"}</TableCell>
                    <TableCell className="text-xs">{mapRestaurantType(txn.from_restaurant_type)}: {txn.from_restaurant_name || "—"}</TableCell>
                    <TableCell className="text-xs">{mapRestaurantType(txn.to_restaurant_type)}: {txn.to_restaurant_name || "—"}</TableCell>
                    <TableCell className="text-xs">{txn.stock_title || "—"}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{txn.quantity ?? "—"}</TableCell>
                    <TableCell>
                      <StatusBadge status={txn.status} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatTimestamp(txn.date)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
