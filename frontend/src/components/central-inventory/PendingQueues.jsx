import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useLoginContext } from "@/hooks/useLoginContext";
import api from "@/services/api";
import { mapRestaurantType } from "@/lib/terminology";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  LoadingState,
  ErrorState,
  EmptyState,
  BlockedAction,
} from "@/components/common/StateDisplays";
import { StatusBadge, StoreTypeBadge } from "@/components/common/Badges";
import { CheckCircle2, Inbox, SendHorizonal, Lock } from "lucide-react";

/**
 * SCR-05 Pending Queues
 *
 * Three tabs: Approval Pending, Receive Pending, My Requests.
 * All action buttons disabled — write API blocked.
 * Approval tab hidden for Outlet users.
 */
export default function PendingQueues() {
  const navigate = useNavigate();
  const { restaurantType, canDo, isBottomLevel } = useLoginContext();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(() =>
    canDo("approve") ? "approval" : "receive"
  );

  const fetchQueues = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await api.getPendingQueues();
      const d = resp.data?.data || resp.data;
      setData(d);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load queues");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueues();
  }, [fetchQueues]);

  const approvalPending = data?.approval_pending || [];
  const receivePending = data?.receive_pending || [];
  const myRequests = data?.my_requests || [];

  const renderTransferRow = (item, idx, showActions = false) => {
    const id = item.id || item.transfer_id;
    return (
      <TableRow
        key={id || idx}
        data-testid={`queue-item-${id || idx}`}
        className="cursor-pointer hover:bg-accent/50"
        onClick={() => id && navigate(`/transfer/${id}`)}
      >
        <TableCell className="text-xs font-mono">{id || "-"}</TableCell>
        <TableCell className="text-xs">{item.from_restaurant_name || mapRestaurantType(item.from_restaurant_type) || "-"}</TableCell>
        <TableCell className="text-xs">{item.to_restaurant_name || mapRestaurantType(item.to_restaurant_type) || "-"}</TableCell>
        <TableCell><StatusBadge status={item.status} /></TableCell>
        <TableCell className="text-xs text-muted-foreground">{item.created_at || "-"}</TableCell>
        <TableCell>
          {showActions ? (
            <div className="flex items-center gap-1">
              <Button
                data-testid={`action-disabled-${id}`}
                variant="outline"
                size="sm"
                disabled
                className="h-6 text-[10px] opacity-50"
              >
                <Lock className="h-2.5 w-2.5 mr-1" />
                Action blocked
              </Button>
            </div>
          ) : (
            <span className="text-[10px] text-muted-foreground">View only</span>
          )}
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div data-testid="pending-queues">
      <h1 className="text-lg font-bold mb-4">Pending Queues</h1>

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

          {/* Write API blocked notice */}
          <div className="mb-3">
            <BlockedAction label="Write API pending / blocked in Phase 1 limited slice. All action buttons are disabled." />
          </div>

          {/* Approval tab */}
          {canDo("approve") && (
            <TabsContent value="approval">
              {approvalPending.length === 0 ? (
                <EmptyState title="No pending approvals" />
              ) : (
                <Card>
                  <CardContent className="py-0 px-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[10px]">Transfer ID</TableHead>
                          <TableHead className="text-[10px]">From</TableHead>
                          <TableHead className="text-[10px]">To</TableHead>
                          <TableHead className="text-[10px]">Status</TableHead>
                          <TableHead className="text-[10px]">Created</TableHead>
                          <TableHead className="text-[10px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {approvalPending.map((item, idx) => renderTransferRow(item, idx, true))}
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
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px]">Transfer ID</TableHead>
                        <TableHead className="text-[10px]">From</TableHead>
                        <TableHead className="text-[10px]">To</TableHead>
                        <TableHead className="text-[10px]">Status</TableHead>
                        <TableHead className="text-[10px]">Created</TableHead>
                        <TableHead className="text-[10px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
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
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px]">Transfer ID</TableHead>
                        <TableHead className="text-[10px]">From</TableHead>
                        <TableHead className="text-[10px]">To</TableHead>
                        <TableHead className="text-[10px]">Status</TableHead>
                        <TableHead className="text-[10px]">Created</TableHead>
                        <TableHead className="text-[10px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
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
