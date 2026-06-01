import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLoginContext } from "@/hooks/useLoginContext";
import { useRestaurantMap } from "@/hooks/useRestaurantMap";
import api from "@/services/api";
import { mapRestaurantType, TYPE_LABELS } from "@/lib/terminology";
import { formatTimestamp, formatItemsCount, formatRelativeTime, formatPO } from "@/lib/formatters";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FulfillmentVerdict from "@/components/common/FulfillmentVerdict";
import StoreHealthStrip from "@/components/common/StoreHealthStrip";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "@/components/common/StateDisplays";
import { StatusBadge } from "@/components/common/Badges";
import { CheckCircle2, Inbox, SendHorizonal, Truck, RefreshCw, Clock, AlertTriangle } from "lucide-react";

function AgeBadge({ createdAt }) {
  if (!createdAt) return null;
  const ms = Date.now() - new Date(createdAt).getTime();
  const hours = ms / (1000 * 60 * 60);
  const days = Math.floor(hours / 24);
  if (days >= 3)
    return <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200" data-testid="age-stale">{days} days ago</span>;
  if (hours >= 24)
    return <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200" data-testid="age-aging">{Math.floor(hours)}h ago</span>;
  return <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground" data-testid="age-fresh">{Math.floor(hours)}h ago</span>;
}

/**
 * SCR-05 Pending Queues — Sprint B Intelligence Upgrade
 *
 * Approval tab: card-based inbox with item-level visibility,
 * fulfillment verdict, age badges, store health strip, quick actions.
 */
export default function PendingQueues() {
  const navigate = useNavigate();
  const { restaurantType, canDo, restaurantId } = useLoginContext();
  const { restaurantMap } = useRestaurantMap();

  const [data, setData] = useState(null);
  const [readyToDispatch, setReadyToDispatch] = useState([]);
  const [transferDetails, setTransferDetails] = useState({});
  const [ownStock, setOwnStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState("oldest");
  const [activeTab, setActiveTab] = useState(() =>
    canDo("approve") ? "approval" : "receive"
  );

  const fetchQueues = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [qResp, stockResp] = await Promise.allSettled([
        api.getPendingQueues(),
        api.getStockInventory(),
      ]);

      const d = qResp.status === "fulfilled" ? (qResp.value.data?.data || qResp.value.data) : {};
      setData(d);

      if (stockResp.status === "fulfilled") {
        setOwnStock(stockResp.value.data?.current_stocks || []);
      }

      // Fetch details for approval items (to get line items)
      const approvals = d?.approval_pending || [];
      if (approvals.length > 0) {
        const detailResults = await Promise.allSettled(
          approvals.slice(0, 10).map((t) => api.getTransferDetails(t.id || t.transfer_id))
        );
        const details = {};
        detailResults.forEach((r, i) => {
          if (r.status === "fulfilled") {
            const td = r.value?.data?.data || r.value?.data;
            const tid = approvals[i]?.id || approvals[i]?.transfer_id;
            if (tid) details[tid] = td;
          }
        });
        setTransferDetails(details);
      }

      // Ready to dispatch
      if (canDo("dispatch")) {
        try {
          const histResp = await api.getTransferHistory();
          const histData = histResp.data?.data || histResp.data;
          const histItems = Array.isArray(histData) ? histData : [];
          const dispatchReady = histItems.filter(
            (t) => ["approved", "partially_approved", "partially_received"].includes(t.status) &&
                   String(t.from_restaurant_id) === String(restaurantId)
          );
          setReadyToDispatch(dispatchReady);
        } catch { setReadyToDispatch([]); }
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load queues");
    } finally {
      setLoading(false);
    }
  }, [canDo, restaurantId]);

  useEffect(() => { fetchQueues(); }, [fetchQueues]);

  const approvalPending = data?.approval_pending || [];
  const receivePending = data?.receive_pending || [];
  const myRequests = data?.my_requests || [];

  // Sort approvals
  const sortedApprovals = useMemo(() => {
    const items = [...approvalPending];
    if (sortBy === "oldest") {
      items.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else {
      items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return items;
  }, [approvalPending, sortBy]);

  // Render approval card
  const renderApprovalCard = (item) => {
    const id = item.id || item.transfer_id;
    const detail = transferDetails[id];
    const lines = detail?.lines || [];
    const createdAt = item.created_at;
    const ms = createdAt ? Date.now() - new Date(createdAt).getTime() : 0;
    const hours = ms / (1000 * 60 * 60);
    const isStale = hours >= 72;
    const isAging = hours >= 24;
    const fromName = restaurantMap[String(item.from_restaurant_id)]?.name || item.from_restaurant_name || mapRestaurantType(item.from_restaurant_type) || "—";
    const toName = restaurantMap[String(item.to_restaurant_id)]?.name || item.to_restaurant_name || mapRestaurantType(item.to_restaurant_type) || "—";

    // Fulfillment check
    let fulfillableCount = 0;
    lines.forEach((l) => {
      const qty = l.requestedDisplayQty ?? l.quantity ?? 0;
      const myItem = ownStock.find((s) => s.stock_title === l.stock_title);
      if (myItem && myItem.display_qty >= qty) fulfillableCount++;
    });

    return (
      <Card
        key={id}
        data-testid={`approval-card-${id}`}
        className={`mb-3 cursor-pointer hover:shadow-md transition-shadow overflow-hidden ${
          isStale ? "border-l-[3px] border-l-red-500" : isAging ? "border-l-[3px] border-l-amber-500" : ""
        }`}
        onClick={() => navigate(`/transfer/${id}`)}
      >
        {/* Card Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold" data-testid={`po-${id}`}>{formatPO(id)}</span>
            <div>
              <p className="text-xs">{fromName} → {toName}</p>
              <p className="text-[10px] text-muted-foreground">
                {restaurantMap[String(item.from_restaurant_id)]?.name || mapRestaurantType(item.from_restaurant_type)} requesting from you
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lines.length > 0 && (
              <FulfillmentVerdict
                partialCount={fulfillableCount}
                totalCount={lines.length}
              />
            )}
            <AgeBadge createdAt={createdAt} />
          </div>
        </div>

        {/* Item-level table */}
        {lines.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/30">
                  <th className="text-left px-4 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase">Item Requested</th>
                  <th className="text-left px-4 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase">Qty Requested</th>
                  <th className="text-left px-4 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase">Your Stock</th>
                  <th className="text-left px-4 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase">After Approval</th>
                </tr>
              </thead>
              <tbody>
                {lines.slice(0, 5).map((l, i) => {
                  const qty = l.requestedDisplayQty ?? l.quantity ?? 0;
                  const myItem = ownStock.find((s) => s.stock_title === l.stock_title);
                  const myQty = myItem?.display_qty ?? 0;
                  const afterQty = myQty - qty;
                  const insufficient = afterQty < 0;
                  return (
                    <tr key={l.id || i} className="border-t border-border/30">
                      <td className="px-4 py-2">
                        <span className="font-medium">{l.stock_title}</span>
                        <span className="text-muted-foreground ml-1">{l.unit}</span>
                      </td>
                      <td className="px-4 py-2 tabular-nums font-mono">{qty} {l.unit}</td>
                      <td className="px-4 py-2">
                        <span className={`tabular-nums ${myQty === 0 ? "text-red-600 font-semibold" : insufficient ? "text-amber-600" : "text-muted-foreground"}`}>
                          {myQty} {myItem?.display_unit || l.unit}
                        </span>
                      </td>
                      <td className={`px-4 py-2 tabular-nums font-mono ${insufficient ? "text-red-600" : "text-muted-foreground"}`}>
                        {Math.round(afterQty * 100) / 100} {l.unit}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Card Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-muted/20 border-t border-border/30">
          <span className="text-[10px] text-muted-foreground">
            {lines.length} item{lines.length !== 1 ? "s" : ""} · Requested by {fromName}
          </span>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => navigate(`/transfer/${id}`)}>
              View Details
            </Button>
            <Button variant="default" size="sm" className="h-7 text-[10px]" onClick={() => navigate(`/transfer/${id}`)}>
              Approve
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  // Simple table row for non-approval tabs
  const renderSimpleCard = (item, idx) => {
    const id = item.id || item.transfer_id;
    return (
      <Card
        key={id || idx}
        data-testid={`queue-card-${id || idx}`}
        className="mb-2 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => id && navigate(`/transfer/${id}`)}
      >
        <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-mono text-xs font-semibold shrink-0">{formatPO(id)}</span>
            <div className="min-w-0">
              <p className="text-xs truncate">
                {restaurantMap[String(item.from_restaurant_id)]?.name || item.from_restaurant_name || "—"} → {restaurantMap[String(item.to_restaurant_id)]?.name || item.to_restaurant_name || "—"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {formatRelativeTime(item.created_at)} · {formatItemsCount(item.items_count)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={item.status} />
            {item.type === "modification_request" && (
              <Badge className="text-[9px] bg-amber-100 text-amber-700 border-amber-200">Modification</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div data-testid="pending-queues">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold">Pending Queues</h1>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">Updated just now</span>
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
                  <span className="ml-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                    {approvalPending.length}
                  </span>
                )}
              </TabsTrigger>
            )}
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

          {/* ═══ APPROVAL TAB — Card-based inbox ═══ */}
          {canDo("approve") && (
            <TabsContent value="approval">
              {approvalPending.length === 0 ? (
                <EmptyState title="No pending approvals" description="All approval requests have been handled." />
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-muted-foreground">
                      {sortedApprovals.length} transfer{sortedApprovals.length !== 1 ? "s" : ""} awaiting approval
                    </span>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-36 h-7 text-[10px]" data-testid="sort-approvals">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="oldest">Oldest first</SelectItem>
                        <SelectItem value="newest">Newest first</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {sortedApprovals.map(renderApprovalCard)}
                </>
              )}
            </TabsContent>
          )}

          {/* ═══ Ready to Dispatch ═══ */}
          {canDo("dispatch") && (
            <TabsContent value="readyToDispatch">
              {readyToDispatch.length === 0 ? (
                <EmptyState title="No transfers ready to dispatch" description="Approved transfers awaiting dispatch will appear here" />
              ) : (
                readyToDispatch.map((item, idx) => renderSimpleCard(item, idx))
              )}
            </TabsContent>
          )}

          {/* ═══ Receive ═══ */}
          <TabsContent value="receive">
            {receivePending.length === 0 ? (
              <EmptyState title="No pending receives" />
            ) : (
              receivePending.map((item, idx) => renderSimpleCard(item, idx))
            )}
          </TabsContent>

          {/* ═══ My Requests ═══ */}
          <TabsContent value="myrequests">
            {myRequests.length === 0 ? (
              <EmptyState title="No requests" description="You haven't made any stock requests" />
            ) : (
              myRequests.map((item, idx) => renderSimpleCard(item, idx))
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
