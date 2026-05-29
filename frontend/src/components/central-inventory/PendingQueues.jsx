import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useLoginContext } from "@/hooks/useLoginContext";
import api from "@/services/api";
import { mapRestaurantType, TYPE_LABELS } from "@/lib/terminology";
import { formatTimestamp, formatItemsCount } from "@/lib/formatters";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  LoadingState,
  ErrorState,
  EmptyState,
  BlockedAction,
} from "@/components/common/StateDisplays";
import { StatusBadge } from "@/components/common/Badges";
import { CheckCircle2, Inbox, SendHorizonal, Truck, Lock, RefreshCw } from "lucide-react";

/**
 * SCR-05 Pending Queues — Slice 2
 *
 * Enhancements:
 * - Ready to Dispatch tab (Item 1) — filters from transfer history
 * - Items count column (Item 8)
 * - Formatted timestamps (Item 4)
 * - Contextual actions hidden for irrelevant roles
 */
export default function PendingQueues() {
  const navigate = useNavigate();
  const { restaurantType, canDo, restaurantId } = useLoginContext();

  const [data, setData] = useState(null);
  const [readyToDispatch, setReadyToDispatch] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(() =>
    canDo("approve") ? "approval" : "receive"
  );

  const fetchQueues = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch pending queues
      const resp = await api.getPendingQueues();
      const d = resp.data?.data || resp.data;
      setData(d);

      // Fetch transfer history to find "approved" transfers for Ready to Dispatch
      if (canDo("dispatch")) {
        try {
          const histResp = await api.getTransferHistory();
          const histData = histResp.data?.data || histResp.data;
          const histItems = Array.isArray(histData) ? histData : [];
          // Filter for approved transfers where current user is the source (can dispatch)
          // P16: Include partially_approved (has approved qty ready for dispatch)
          // and partially_received (has follow-up dispatch waves possible)
          const dispatchReady = histItems.filter(
            (t) => ["approved", "partially_approved", "partially_received"].includes(t.status) &&
                   String(t.from_restaurant_id) === String(restaurantId)
          );
          setReadyToDispatch(dispatchReady);
        } catch {
          setReadyToDispatch([]);
        }
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load queues");
    } finally {
      setLoading(false);
    }
  }, [canDo, restaurantId]);

  useEffect(() => {
    fetchQueues();
  }, [fetchQueues]);

  const approvalPending = data?.approval_pending || [];
  const receivePending = data?.receive_pending || [];
  const myRequests = data?.my_requests || [];

  const renderTransferRow = (item, idx, showActions = false) => {
    const id = item.id || item.transfer_id;
    const itemsCount = item.items_count ?? item.lines?.length ?? null;
    return (
      <TableRow
        key={id || idx}
        data-testid={`queue-item-${id || idx}`}
        className="cursor-pointer hover:bg-accent/50"
        onClick={() => id && navigate(`/transfer/${id}`)}
      >
        <TableCell className="text-xs font-mono">{id || "—"}</TableCell>
        <TableCell className="text-xs">{item.from_restaurant_name || mapRestaurantType(item.from_restaurant_type) || "—"}</TableCell>
        <TableCell className="text-xs">{item.to_restaurant_name || mapRestaurantType(item.to_restaurant_type) || "—"}</TableCell>
        <TableCell><StatusBadge status={item.status} /></TableCell>
        <TableCell className="text-xs tabular-nums">{formatItemsCount(itemsCount)}</TableCell>
        <TableCell className="text-xs text-muted-foreground">{formatTimestamp(item.created_at)}</TableCell>
        <TableCell>
          {item.type === "modification_request" ? (
            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium" data-testid={`type-badge-${id}`}>Modification</span>
          ) : (
            <span className="text-[10px] text-muted-foreground">View details</span>
          )}
        </TableCell>
      </TableRow>
    );
  };

  const tableHeaders = (
    <TableHeader>
      <TableRow>
        <TableHead className="text-[10px]">Transfer ID</TableHead>
        <TableHead className="text-[10px]">From</TableHead>
        <TableHead className="text-[10px]">To</TableHead>
        <TableHead className="text-[10px]">Status</TableHead>
        <TableHead className="text-[10px]">Items</TableHead>
        <TableHead className="text-[10px]">Created</TableHead>
        <TableHead className="text-[10px]">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );

  return (
    <div data-testid="pending-queues">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold">Pending Queues</h1>
        <Button
          data-testid="refresh-queues-btn"
          variant="ghost"
          size="sm"
          onClick={fetchQueues}
          disabled={loading}
          className="h-7 text-xs gap-1"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {loading ? (
        <LoadingState lines={5} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchQueues} />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList data-testid="queue-tabs" className="mb-3">
            {canDo("approve") && (
              <TabsTrigger data-testid="tab-approval" value="approval" className="gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Approvals
                {approvalPending.length > 0 && (
                  <span className="ml-1 bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded-full">
                    {approvalPending.length}
                  </span>
                )}
              </TabsTrigger>
            )}
            {/* Ready to Dispatch tab (Item 1) — only for dispatch-capable roles */}
            {canDo("dispatch") && (
              <TabsTrigger data-testid="tab-ready-to-dispatch" value="readyToDispatch" className="gap-1.5">
                <Truck className="h-3.5 w-3.5" />
                Ready to Dispatch
                {readyToDispatch.length > 0 && (
                  <span className="ml-1 bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded-full">
                    {readyToDispatch.length}
                  </span>
                )}
              </TabsTrigger>
            )}
            <TabsTrigger data-testid="tab-receive" value="receive" className="gap-1.5">
              <Inbox className="h-3.5 w-3.5" />
              Receives
              {receivePending.length > 0 && (
                <span className="ml-1 bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded-full">
                  {receivePending.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger data-testid="tab-my-requests" value="myrequests" className="gap-1.5">
              <SendHorizonal className="h-3.5 w-3.5" />
              My Requests
              {myRequests.length > 0 && (
                <span className="ml-1 bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded-full">
                  {myRequests.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Approval tab */}
          {canDo("approve") && (
            <TabsContent value="approval">
              {approvalPending.length === 0 ? (
                <EmptyState title="No pending approvals" />
              ) : (
                <Card>
                  <CardContent className="py-0 px-0">
                    <Table>
                      {tableHeaders}
                      <TableBody>
                        {approvalPending.map((item, idx) => renderTransferRow(item, idx, true))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}

          {/* Ready to Dispatch tab (Item 1) */}
          {canDo("dispatch") && (
            <TabsContent value="readyToDispatch">
              {readyToDispatch.length === 0 ? (
                <EmptyState title="No transfers ready to dispatch" description="Approved transfers awaiting dispatch will appear here" />
              ) : (
                <Card>
                  <CardContent className="py-0 px-0">
                    <Table>
                      {tableHeaders}
                      <TableBody>
                        {readyToDispatch.map((item, idx) => renderTransferRow(item, idx, true))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}

          {/* Receive tab */}
          <TabsContent value="receive">
            {receivePending.length === 0 ? (
              <EmptyState title="No pending receives" />
            ) : (
              <Card>
                <CardContent className="py-0 px-0">
                  <Table>
                    {tableHeaders}
                    <TableBody>
                      {receivePending.map((item, idx) => renderTransferRow(item, idx, true))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* My Requests tab */}
          <TabsContent value="myrequests">
            {myRequests.length === 0 ? (
              <EmptyState title="No requests" description="You haven't made any stock requests" />
            ) : (
              <Card>
                <CardContent className="py-0 px-0">
                  <Table>
                    {tableHeaders}
                    <TableBody>
                      {myRequests.map((item, idx) => renderTransferRow(item, idx, false))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
