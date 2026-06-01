import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLoginContext } from "@/hooks/useLoginContext";
import { useStockIntelligence } from "@/hooks/useStockIntelligence";
import { useRestaurantMap } from "@/hooks/useRestaurantMap";
import api from "@/services/api";
import { formatRelativeTime, formatPO } from "@/lib/formatters";
import { mapRestaurantType } from "@/lib/terminology";
import StockIntelligenceBar from "@/components/common/StockIntelligenceBar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Package,
  Truck,
  Send,
  Minus,
  RefreshCw,
} from "lucide-react";
import { LoadingState, ErrorState } from "@/components/common/StateDisplays";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function AgeBadge({ createdAt }) {
  if (!createdAt) return null;
  const ms = Date.now() - new Date(createdAt).getTime();
  const hours = ms / (1000 * 60 * 60);
  const days = Math.floor(hours / 24);
  if (days >= 3) return <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">{days} days ago</span>;
  if (hours >= 24) return <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">{Math.floor(hours)}h ago</span>;
  return <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">{Math.floor(hours)}h ago</span>;
}

/**
 * SCR-01 Operations Hub — Sprint A Intelligence Upgrade
 *
 * Sections:
 * 1. Greeting + role context
 * 2. Next Best Actions (prioritized banners)
 * 3. Priority KPI cards
 * 4. Your Stock Health strip
 * 5. Store Health Grid (Central only — across hierarchy)
 * 6. Quick Actions (role-gated)
 * 7. Today's Activity feed
 * 8. Your Latest Request (Outlet/Master only)
 */
export default function OperationsHub() {
  const navigate = useNavigate();
  const {
    restaurantType, isTopLevel, isMiddleLevel, isBottomLevel,
    canDo, restaurantId, userLevelLabel, user,
  } = useLoginContext();

  const {
    totalItems, lowStockCount, lowStockItems,
    approvalPendingCount, receivePendingCount, myRequestsCount,
    staleApprovals, staleApprovalCount,
    readyToDispatchCount,
    todayActivity,
    loading, error, refresh, recentHistory,
  } = useStockIntelligence();

  const { restaurantMap } = useRestaurantMap();

  // Store health grid (Central only — fetch hierarchy detail per child)
  const [storeHealth, setStoreHealth] = useState([]);
  const [storeHealthLoading, setStoreHealthLoading] = useState(false);

  useEffect(() => {
    if (!isTopLevel) return;
    let cancelled = false;
    (async () => {
      setStoreHealthLoading(true);
      try {
        // A1 FIX: API returns `stores`, not `children`
        const resp = await api.getHierarchySummary({ storeType: "franchise" });
        const data = resp.data?.data || resp.data;
        const stores = data?.stores || [];
        if (!Array.isArray(stores) || stores.length === 0) {
          if (!cancelled) setStoreHealth([]);
          return;
        }

        // B1 FIX: Batch-call hierarchy-detail per store (max 6) to compute health
        const toFetch = stores.slice(0, 6);
        const detailResults = await Promise.allSettled(
          toFetch.map((s) =>
            api.getHierarchyDetail({ storeRestaurantId: s.restaurant_id })
          )
        );

        const enriched = toFetch.map((store, idx) => {
          const result = detailResults[idx];
          let outCount = 0, lowCount = 0, adequateCount = 0, totalItems = 0;
          if (result.status === "fulfilled") {
            const detail = result.value?.data?.data || result.value?.data;
            const items = detail?.child_stock_summary || [];
            totalItems = items.length;
            items.forEach((item) => {
              const qty = parseFloat(item.display_quantity) || 0;
              if (qty === 0) {
                outCount++;
              } else if (item.is_low_stock) {
                lowCount++;
              } else {
                adequateCount++;
              }
            });
          }
          return {
            ...store,
            id: store.restaurant_id,
            out_of_stock_count: outCount,
            low_stock_count: lowCount,
            adequate_count: adequateCount,
            total_items: totalItems,
          };
        });

        if (!cancelled) setStoreHealth(enriched);
      } catch (e) {
        console.warn("[hub] Failed to load store health:", e);
      } finally {
        if (!cancelled) setStoreHealthLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isTopLevel]);

  // Latest request (for Outlet/Master)
  const latestRequest = useMemo(() => {
    if (isTopLevel) return null;
    const myReqs = recentHistory.filter(
      (t) => t.type === "request" && String(t.to_restaurant_id) === String(restaurantId)
    );
    return myReqs.length > 0 ? myReqs[0] : null;
  }, [recentHistory, isTopLevel, restaurantId]);

  const storeName = user?.restaurant_name || userLevelLabel;

  return (
    <div data-testid="operations-hub">
      {/* Greeting */}
      <div className="mb-5">
        <h1 className="text-xl font-bold" data-testid="operations-hub-title">
          {getGreeting()}, {mapRestaurantType(restaurantType).replace(" Store", "")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isTopLevel
            ? "Here's what needs your attention across the hierarchy"
            : "Here's your store status and pending actions"}
        </p>
      </div>

      {error && !loading ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : (
        <>
          {/* ── Next Best Actions ─────────────────────────── */}
          {staleApprovalCount > 0 && canDo("approve") && (
            <div
              data-testid="nba-stale-approvals"
              className="flex items-center gap-3 p-3 mb-3 rounded-lg border-l-[3px] border-l-red-500 bg-red-50 border border-red-200 cursor-pointer hover:bg-red-100/60 transition-colors"
              onClick={() => navigate("/queues")}
            >
              <div className="h-9 w-9 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{staleApprovalCount} approval request{staleApprovalCount > 1 ? "s" : ""} stale (&gt;24 hours)</p>
                <p className="text-xs text-muted-foreground">
                  {staleApprovals[0] && `Oldest: ${formatRelativeTime(staleApprovals[0].created_at)}`}
                </p>
              </div>
              <Button variant="default" size="sm" className="shrink-0 text-xs">Review Approvals</Button>
            </div>
          )}

          {readyToDispatchCount > 0 && canDo("dispatch") && (
            <div
              data-testid="nba-ready-dispatch"
              className="flex items-center gap-3 p-3 mb-3 rounded-lg border-l-[3px] border-l-amber-500 bg-amber-50 border border-amber-200 cursor-pointer hover:bg-amber-100/60 transition-colors"
              onClick={() => navigate("/queues")}
            >
              <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <Truck className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{readyToDispatchCount} transfer{readyToDispatchCount > 1 ? "s" : ""} ready to dispatch</p>
                <p className="text-xs text-muted-foreground">Approved transfers awaiting your dispatch. Stock already committed.</p>
              </div>
              <Button variant="outline" size="sm" className="shrink-0 text-xs">Dispatch Now</Button>
            </div>
          )}

          {lowStockCount > 0 && !isTopLevel && (
            <div
              data-testid="nba-low-stock"
              className="flex items-center gap-3 p-3 mb-3 rounded-lg border-l-[3px] border-l-red-500 bg-red-50 border border-red-200 cursor-pointer hover:bg-red-100/60 transition-colors"
              onClick={() => navigate("/inventory")}
            >
              <div className="h-9 w-9 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                <Package className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{lowStockCount} item{lowStockCount > 1 ? "s" : ""} below minimum threshold</p>
                <p className="text-xs text-muted-foreground">
                  {lowStockItems[0] && `${lowStockItems[0].stock_title}: ${lowStockItems[0].display_qty} ${lowStockItems[0].display_unit}`}
                </p>
              </div>
              {canDo("request-stock") && (
                <Button variant="outline" size="sm" className="shrink-0 text-xs" onClick={(e) => { e.stopPropagation(); navigate("/request/new"); }}>Request Stock</Button>
              )}
            </div>
          )}

          {/* ── Priority KPI Cards ────────────────────────── */}
          {loading && <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground"><RefreshCw className="h-3 w-3 animate-spin" /> Loading intelligence data...</div>}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {canDo("approve") && (
              <Card
                data-testid="kpi-stale-approvals"
                className={`cursor-pointer hover:shadow-md transition-shadow ${staleApprovalCount > 0 ? "border-l-[3px] border-l-red-500" : ""}`}
                onClick={() => navigate("/queues")}
              >
                <CardContent className="py-3 px-4">
                  <p className={`text-2xl font-bold tabular-nums ${staleApprovalCount > 0 ? "text-red-600" : ""}`}>
                    {staleApprovalCount}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Stale Approvals</p>
                  {staleApprovals[0] && (
                    <p className="text-[10px] text-muted-foreground mt-1 pt-1 border-t border-border truncate">
                      Oldest: {formatRelativeTime(staleApprovals[0].created_at)}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {canDo("dispatch") && (
              <Card
                data-testid="kpi-ready-dispatch"
                className={`cursor-pointer hover:shadow-md transition-shadow ${readyToDispatchCount > 0 ? "border-l-[3px] border-l-amber-500" : ""}`}
                onClick={() => navigate("/queues")}
              >
                <CardContent className="py-3 px-4">
                  <p className={`text-2xl font-bold tabular-nums ${readyToDispatchCount > 0 ? "text-amber-600" : ""}`}>
                    {readyToDispatchCount}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Ready to Dispatch</p>
                  <p className="text-[10px] text-muted-foreground mt-1 pt-1 border-t border-border">
                    Stock committed, awaiting ship
                  </p>
                </CardContent>
              </Card>
            )}

            <Card
              data-testid="kpi-pending-receives"
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate("/queues")}
            >
              <CardContent className="py-3 px-4">
                <p className="text-2xl font-bold tabular-nums">{receivePendingCount}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Pending Receives</p>
                <p className="text-[10px] text-muted-foreground mt-1 pt-1 border-t border-border">
                  {receivePendingCount > 0 ? "Incoming shipments" : "No incoming shipments"}
                </p>
              </CardContent>
            </Card>

            <Card
              data-testid="kpi-low-stock"
              className={`cursor-pointer hover:shadow-md transition-shadow ${lowStockCount > 0 ? "border-l-[3px] border-l-red-500" : ""}`}
              onClick={() => navigate("/inventory")}
            >
              <CardContent className="py-3 px-4">
                <p className={`text-2xl font-bold tabular-nums ${lowStockCount > 0 ? "text-red-600" : ""}`}>
                  {lowStockCount}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Low Stock Items</p>
                {lowStockItems[0] && (
                  <p className="text-[10px] text-muted-foreground mt-1 pt-1 border-t border-border truncate">
                    {lowStockItems[0].stock_title}: {lowStockItems[0].display_qty} {lowStockItems[0].display_unit}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Your Stock Health ─────────────────────────── */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Your Stock Health</h2>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/inventory")}>
                View Inventory <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
            <StockIntelligenceBar
              total={totalItems}
              low={lowStockCount}
              pendingOut={0}
              pendingIn={receivePendingCount}
            />
          </div>

          {/* ── Store Health Grid (Central only) ──────────── */}
          {isTopLevel && storeHealthLoading && (
            <div className="mb-5">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Store Health Across Hierarchy</h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-4"><RefreshCw className="h-3 w-3 animate-spin" /> Computing store health...</div>
            </div>
          )}
          {isTopLevel && storeHealth.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Store Health Across Hierarchy</h2>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/hierarchy")}>
                  View Hierarchy <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {storeHealth.slice(0, 6).map((store) => {
                  const name = store.restaurant_name || `Store #${store.restaurant_id}`;
                  const storeType = store.restaurant_type || "";
                  const outCount = store.out_of_stock_count || 0;
                  const lowCount = store.low_stock_count || 0;
                  const adequateCount = store.adequate_count || 0;
                  const totalItems = store.total_items || 0;
                  const hasProblem = outCount >= 2;
                  return (
                    <Card
                      key={store.restaurant_id}
                      data-testid={`store-health-${store.restaurant_id}`}
                      className={`cursor-pointer hover:shadow-md transition-shadow ${hasProblem ? "border-l-[3px] border-l-red-500" : ""}`}
                      onClick={() => navigate(`/store/${store.restaurant_id}`)}
                    >
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-semibold truncate">{name}</span>
                          {outCount > 0 ? (
                            <Badge variant="destructive" className="text-[9px] px-1.5 py-0 shrink-0">{outCount} out of stock</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-emerald-700 border-emerald-200 bg-emerald-50 shrink-0">Healthy</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          {outCount > 0 && (
                            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />{outCount} out</span>
                          )}
                          {lowCount > 0 && (
                            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />{lowCount} low</span>
                          )}
                          {adequateCount > 0 && (
                            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{adequateCount} ok</span>
                          )}
                          <span className="text-muted-foreground text-xs">{totalItems > 0 ? `${totalItems} items` : mapRestaurantType(storeType)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Quick Actions (role-gated) ────────────────── */}
          <div className="mb-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {canDo("dispatch") && (
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/dispatch/new")}>
                  <CardContent className="py-3 px-4">
                    <p className="text-xs font-semibold" data-testid="qa-dispatch">Dispatch Stock</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Send stock to stores</p>
                  </CardContent>
                </Card>
              )}
              {canDo("add-stock-purchase") && (
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/procurement/new")}>
                  <CardContent className="py-3 px-4">
                    <p className="text-xs font-semibold" data-testid="qa-procure">Add Stock (Vendor)</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Procure from vendors</p>
                  </CardContent>
                </Card>
              )}
              {canDo("request-stock") && (
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/request/new")}>
                  <CardContent className="py-3 px-4">
                    <p className="text-xs font-semibold" data-testid="qa-request">Request Stock</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Request from parent store</p>
                  </CardContent>
                </Card>
              )}
              {canDo("adjust-stock") && (
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/adjustment/new")}>
                  <CardContent className="py-3 px-4">
                    <p className="text-xs font-semibold" data-testid="qa-adjust">Adjust Stock</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Correct quantities</p>
                  </CardContent>
                </Card>
              )}
              {canDo("record-wastage") && (
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/wastage/new")}>
                  <CardContent className="py-3 px-4">
                    <p className="text-xs font-semibold" data-testid="qa-wastage">Record Wastage</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Log spoiled/damaged stock</p>
                  </CardContent>
                </Card>
              )}
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/wastage/report")}>
                <CardContent className="py-3 px-4">
                  <p className="text-xs font-semibold" data-testid="qa-wastage-report">Wastage Report</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Analyze wastage trends</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ── Today's Activity Feed ─────────────────────── */}
          {todayActivity.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Today's Activity</h2>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/history")}>
                  View full history <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
              <Card>
                <CardContent className="py-2 px-4 divide-y divide-border">
                  {todayActivity.map((t, idx) => {
                    const isSender = String(t.from_restaurant_id) === String(restaurantId);
                    const isReceiver = String(t.to_restaurant_id) === String(restaurantId);
                    const isOut = isSender && ["dispatched", "approved", "received", "partially_received"].includes(t.status);
                    const isIn = isReceiver && ["received", "partially_received"].includes(t.status);
                    const counterparty = isSender
                      ? (restaurantMap[String(t.to_restaurant_id)]?.name || t.to_restaurant_name || `Store #${t.to_restaurant_id}`)
                      : (restaurantMap[String(t.from_restaurant_id)]?.name || t.from_restaurant_name || `Store #${t.from_restaurant_id}`);
                    const lines = t.lines || [];
                    const itemName = lines[0]?.stock_title || "Transfer";
                    const itemCount = lines.length;
                    const time = t.dispatched_at || t.received_at || t.created_at;

                    return (
                      <div
                        key={t.id || idx}
                        data-testid={`activity-${idx}`}
                        className="flex items-center gap-3 py-2 text-xs cursor-pointer hover:bg-accent/30 -mx-4 px-4 transition-colors"
                        onClick={() => navigate(`/transfer/${t.id}`)}
                      >
                        <span className="text-[10px] text-muted-foreground w-14 shrink-0 tabular-nums">
                          {time ? new Date(time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }) : "—"}
                        </span>
                        {isIn ? (
                          <Badge className="text-[9px] px-1.5 py-0 bg-emerald-100 text-emerald-700 border-emerald-200 shrink-0">
                            <ArrowDownLeft className="h-2.5 w-2.5 mr-0.5" />Received
                          </Badge>
                        ) : isOut ? (
                          <Badge className="text-[9px] px-1.5 py-0 bg-red-100 text-red-700 border-red-200 shrink-0">
                            <ArrowUpRight className="h-2.5 w-2.5 mr-0.5" />Dispatched
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0">{t.status}</Badge>
                        )}
                        <span className="font-semibold truncate">{itemName}</span>
                        {itemCount > 1 && <span className="text-muted-foreground">+{itemCount - 1}</span>}
                        <span className="text-muted-foreground truncate">{isIn ? "from" : "to"} {counterparty}</span>
                        <span className="ml-auto tabular-nums text-muted-foreground font-mono text-[10px]">{formatPO(t.id)}</span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Your Latest Request (Outlet/Master only) ──── */}
          {!isTopLevel && latestRequest && (
            <div className="mb-5">
              <Card
                data-testid="latest-request-card"
                className="border-l-[3px] border-l-amber-500 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/transfer/${latestRequest.id}`)}
              >
                <CardContent className="py-3 px-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Your Latest Request</p>
                    <p className="text-sm font-semibold mt-1">
                      {formatPO(latestRequest.id)} — {(latestRequest.lines || []).length} items
                    </p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      {latestRequest.status === "requested" ? "Awaiting Approval" : latestRequest.status} — {formatRelativeTime(latestRequest.created_at)}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs shrink-0">Track <ArrowRight className="h-3 w-3 ml-1" /></Button>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
