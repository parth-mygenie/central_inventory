import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useLoginContext } from "@/hooks/useLoginContext";
import api from "@/services/api";
import { mapRestaurantType } from "@/lib/terminology";
import { formatTimestamp } from "@/lib/formatters";
import DateRangePicker from "@/components/common/DateRangePicker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState, EmptyState, ErrorState } from "@/components/common/StateDisplays";
import { StoreTypeBadge } from "@/components/common/Badges";
import { ArrowLeft, FileText } from "lucide-react";
import { format } from "date-fns";

/**
 * WastageReport — Read-only wastage report scoped by role hierarchy.
 * Central: all stores. Master: own + children. Outlet: own only.
 * Implementation Plan MH-4, Section 11.3.
 */
export default function WastageReport() {
  const navigate = useNavigate();
  const { restaurantId, restaurantType, isTopLevel, isMiddleLevel } = useLoginContext();

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState(null);

  // Build role-scoped restaurant_ids
  const getRestaurantIds = useCallback(() => {
    if (isTopLevel) {
      // Central: all stores — pass own ID; API returns multi-restaurant scope
      return [restaurantId];
    } else if (isMiddleLevel) {
      // Master: own + children — pass own ID; API scopes to hierarchy
      return [restaurantId];
    } else {
      // Outlet: own only
      return [restaurantId];
    }
  }, [restaurantId, isTopLevel, isMiddleLevel]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        restaurantIds: getRestaurantIds(),
      };
      if (dateRange?.from) params.fromDate = format(dateRange.from, "yyyy-MM-dd");
      if (dateRange?.to) params.toDate = format(dateRange.to, "yyyy-MM-dd");

      const resp = await api.getWastageReport(params);
      const data = resp.data?.data || resp.data || [];
      setEntries(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load wastage report");
    } finally {
      setLoading(false);
    }
  }, [getRestaurantIds, dateRange]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return (
    <div data-testid="wastage-report">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors"
        data-testid="wastage-report-back-button"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold" data-testid="wastage-report-title">Wastage Report</h1>
        </div>
        <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
      </div>

      {loading ? (
        <LoadingState lines={5} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchReport} />
      ) : entries.length === 0 ? (
        <EmptyState
          title="No wastage entries found"
          description={dateRange?.from ? "Try adjusting the date range or check back later." : "No wastage has been recorded yet."}
          icon={FileText}
        />
      ) : (
        <Card>
          <CardHeader className="py-2.5 px-4">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
              {entries.length} {entries.length === 1 ? "entry" : "entries"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px]">Date</TableHead>
                    <TableHead className="text-[10px]">Store</TableHead>
                    <TableHead className="text-[10px]">Item</TableHead>
                    <TableHead className="text-[10px] text-right">Quantity</TableHead>
                    <TableHead className="text-[10px]">Unit</TableHead>
                    <TableHead className="text-[10px]">Reason</TableHead>
                    <TableHead className="text-[10px]">Recorded By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry, idx) => (
                    <TableRow key={entry.wastage_id || entry.id || idx} data-testid={`wastage-report-row-${idx}`}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {formatTimestamp(entry.waste_date || entry.created_at || entry.date || entry.timestamp)}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1.5">
                          <span>{entry.restaurant_name || entry.store_name || "—"}</span>
                          {(entry.restaurant_type || entry.store_type) && (
                            <StoreTypeBadge backendType={entry.restaurant_type || entry.store_type} />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {entry.stock_title || entry.item_name || entry.item || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono">
                        {entry.wastage_quantity ?? entry.quantity ?? entry.cal_quantity ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {entry.unit || "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {entry.waste_reason || entry.reason || entry.wastage_reason || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {entry.recorded_by || entry.user_name || entry.user_id || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
