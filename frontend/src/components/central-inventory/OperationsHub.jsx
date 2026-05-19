import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useLoginContext } from "@/hooks/useLoginContext";
import api from "@/services/api";
import ContextSelector from "./ContextSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Inbox,
  SendHorizonal,
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  Network,
  Loader2,
} from "lucide-react";
import { LoadingState, ErrorState, EmptyState, BlockedAction } from "@/components/common/StateDisplays";

/**
 * SCR-01 Operations Hub Shell
 *
 * Main dashboard. Shows pending counts + navigation shortcuts.
 * KPI cards show "KPI pending backend/owner definition" per RPT-003: D.
 */
export default function OperationsHub() {
  const navigate = useNavigate();
  const { restaurantType, isTopLevel, isMiddleLevel, isBottomLevel, canDo, restaurantId } = useLoginContext();

  const [queues, setQueues] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeStoreId, setActiveStoreId] = useState(null);

  const fetchQueues = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await api.getPendingQueues();
      const data = resp.data?.data || resp.data;
      setQueues(data);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load pending queues");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueues();
  }, [fetchQueues]);

  const approvalCount = queues?.approval_pending?.length || 0;
  const receiveCount = queues?.receive_pending?.length || 0;
  const myRequestsCount = queues?.my_requests?.length || 0;

  return (
    <div data-testid="operations-hub">
      <ContextSelector
        activeStoreId={activeStoreId}
        onStoreChange={setActiveStoreId}
      />

      <h1 className="text-lg font-bold mb-4" data-testid="operations-hub-title">
        Operations Hub
      </h1>

      {/* Pending counts cards */}
      {loading ? (
        <LoadingState lines={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchQueues} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {/* Approval pending — parent roles only */}
            {canDo("approve") && (
              <Card
                data-testid="card-approval-pending"
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate("/queues")}
              >
                <CardContent className="py-4 px-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold">{approvalCount}</p>
                    <p className="text-xs text-muted-foreground">Pending Approvals</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Receive pending */}
            <Card
              data-testid="card-receive-pending"
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate("/queues")}
            >
              <CardContent className="py-4 px-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                  <Inbox className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold">{receiveCount}</p>
                  <p className="text-xs text-muted-foreground">Pending Receives</p>
                </div>
              </CardContent>
            </Card>

            {/* My requests — hide for Central (they don't request) */}
            {!isTopLevel && (
              <Card
                data-testid="card-my-requests"
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate("/queues")}
              >
                <CardContent className="py-4 px-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                    <SendHorizonal className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold">{myRequestsCount}</p>
                    <p className="text-xs text-muted-foreground">My Requests</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            <Card
              data-testid="quick-action-hierarchy"
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate("/hierarchy")}
            >
              <CardContent className="py-3 px-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Network className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">View Hierarchy</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>

            <Card
              data-testid="quick-action-queues"
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate("/queues")}
            >
              <CardContent className="py-3 px-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Pending Queues</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </div>

          {/* KPI placeholder — RPT-003: D (owner to specify) */}
          <Card data-testid="kpi-placeholder" className="border-dashed">
            <CardContent className="py-6 px-4 flex flex-col items-center text-center">
              <AlertTriangle className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium text-muted-foreground">KPI Dashboard</p>
              <p className="text-xs text-muted-foreground/70 mt-1 max-w-md">
                KPI pending backend/owner definition (RPT-003: D). KPI cards will be added when the owner specifies the exact metrics.
              </p>
            </CardContent>
          </Card>

          {/* Blocked write actions notice */}
          <div className="mt-4 flex flex-wrap gap-2">
            {canDo("dispatch") && (
              <Button data-testid="action-dispatch-disabled" variant="outline" size="sm" disabled className="opacity-50">
                Dispatch Stock
                <span className="ml-1.5 text-[9px]">(write API blocked)</span>
              </Button>
            )}
            {canDo("request-stock") && (
              <Button data-testid="action-request-disabled" variant="outline" size="sm" disabled className="opacity-50">
                Request Stock
                <span className="ml-1.5 text-[9px]">(write API blocked)</span>
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
