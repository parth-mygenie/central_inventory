import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useLoginContext } from "@/hooks/useLoginContext";
import api from "@/services/api";
import ContextSelector from "./ContextSelector";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Inbox,
  SendHorizonal,
  Truck,
  ArrowRight,
  ClipboardList,
  Network,
} from "lucide-react";
import { LoadingState, ErrorState } from "@/components/common/StateDisplays";

/**
 * SCR-01 Operations Hub — Slice 2
 *
 * Enhancements:
 * - KPI placeholder removed (Item 12)
 * - Ready to Dispatch count card (Item 1)
 * - Context selector updates hub data in-place (Item 11)
 */
export default function OperationsHub() {
  const navigate = useNavigate();
  const { restaurantType, isTopLevel, canDo, restaurantId } = useLoginContext();

  const [queues, setQueues] = useState(null);
  const [readyToDispatchCount, setReadyToDispatchCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeStoreId, setActiveStoreId] = useState(null);
  const [activeStoreName, setActiveStoreName] = useState(null);

  const fetchQueues = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await api.getPendingQueues();
      const data = resp.data?.data || resp.data;

      // If a different store context is active, filter data for that store
      if (activeStoreId && String(activeStoreId) !== String(restaurantId)) {
        const aid = String(activeStoreId);
        const filtered = {
          approval_pending: (data.approval_pending || []).filter(
            (t) => String(t.from_restaurant_id) === aid || String(t.to_restaurant_id) === aid
          ),
          receive_pending: (data.receive_pending || []).filter(
            (t) => String(t.to_restaurant_id) === aid
          ),
          my_requests: (data.my_requests || []).filter(
            (t) => String(t.to_restaurant_id) === aid
          ),
        };
        setQueues(filtered);
      } else {
        setQueues(data);
      }

      // Fetch ready to dispatch count
      if (canDo("dispatch")) {
        try {
          const histResp = await api.getTransferHistory();
          const histData = histResp.data?.data || histResp.data;
          const histItems = Array.isArray(histData) ? histData : [];
          const sourceId = activeStoreId ? String(activeStoreId) : String(restaurantId);
          // P16: Include partially_approved and partially_received (follow-up dispatch waves)
          const dispatchReady = histItems.filter(
            (t) => ["approved", "partially_approved", "partially_received"].includes(t.status) &&
                   String(t.from_restaurant_id) === sourceId
          );
          setReadyToDispatchCount(dispatchReady.length);
        } catch {
          setReadyToDispatchCount(0);
        }
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load pending queues");
    } finally {
      setLoading(false);
    }
  }, [activeStoreId, restaurantId, canDo]);

  useEffect(() => {
    fetchQueues();
  }, [fetchQueues]);

  const handleStoreChange = (storeId, storeName) => {
    setActiveStoreId(storeId);
    setActiveStoreName(storeName || null);
  };

  const handleResetContext = () => {
    setActiveStoreId(null);
    setActiveStoreName(null);
  };

  const approvalCount = queues?.approval_pending?.length || 0;
  const receiveCount = queues?.receive_pending?.length || 0;
  const myRequestsCount = queues?.my_requests?.length || 0;
  const isViewingOther = activeStoreId && String(activeStoreId) !== String(restaurantId);

  return (
    <div data-testid="operations-hub">
      <ContextSelector
        activeStoreId={activeStoreId}
        activeStoreName={activeStoreName}
        onStoreChange={handleStoreChange}
        onReset={handleResetContext}
        isViewingOther={isViewingOther}
      />

      <h1 className="text-lg font-bold mb-4" data-testid="operations-hub-title">
        Operations Hub
      </h1>

      {loading ? (
        <LoadingState lines={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchQueues} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
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

            {/* Ready to Dispatch — dispatch-capable roles only (Item 1) */}
            {canDo("dispatch") && (
              <Card
                data-testid="card-ready-to-dispatch"
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate("/queues")}
              >
                <CardContent className="py-4 px-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                    <Truck className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold">{readyToDispatchCount}</p>
                    <p className="text-xs text-muted-foreground">Ready to Dispatch</p>
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

          {/* Quick actions — now ENABLED (Slice 4) */}
          <div className="flex flex-wrap gap-2">
            {canDo("dispatch") && (
              <Button data-testid="action-dispatch-stock" variant="default" size="sm" onClick={() => navigate("/dispatch/new")}>
                Dispatch Stock
              </Button>
            )}
            {canDo("request-stock") && (
              <Button data-testid="action-request-stock" variant="outline" size="sm" onClick={() => navigate("/request/new")}>
                Request Stock
              </Button>
            )}
            {canDo("adjust-stock") && (
              <Button data-testid="action-adjust-stock" variant="outline" size="sm" onClick={() => navigate("/adjustment/new")}>
                Adjust Stock
              </Button>
            )}
            {canDo("record-wastage") && (
              <Button data-testid="action-record-wastage" variant="outline" size="sm" onClick={() => navigate("/wastage/new")}>
                Record Wastage
              </Button>
            )}
            {canDo("record-wastage") && (
              <Button data-testid="action-wastage-report" variant="ghost" size="sm" onClick={() => navigate("/wastage/report")}>
                Wastage Report
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
