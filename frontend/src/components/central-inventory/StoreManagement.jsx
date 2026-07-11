import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useLoginContext } from "@/hooks/useLoginContext";
import useHierarchyManagement from "@/hooks/useHierarchyManagement";
import api from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/StateDisplays";
import { mapRestaurantType } from "@/lib/terminology";
import { Switch } from "@/components/ui/switch";
import {
  GitBranch, Search, Plus, ChevronDown, ChevronRight, RefreshCw, Loader2,
  Upload, Mail, Phone, MapPin, Calendar, Check, ArrowRight, ArrowLeft, Shield, Save,
} from "lucide-react";
import { friendlyCatalogError } from "@/lib/apiErrors"; // CR-043 — G-029

/**
 * Store Management — CR-032 unified view
 * Single view replacing old Summary + Manage tabs.
 * Expandable rows with stock health, push status, push history.
 */
export default function StoreManagement() {
  const { isTopLevel, isMiddleLevel, restaurantId } = useLoginContext();
  const {
    children, listLoading, listError, fetchList,
    createMeta, fetchCreateMeta, createChild,
    pushForm, pushLoading, fetchPushForm, executePush, resetPush,
    history, historyLoading, fetchHistory,
  } = useHierarchyManagement();

  // UI state
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedChildId, setExpandedChildId] = useState(null);
  const [pushStatusMap, setPushStatusMap] = useState({});
  const [childHealthMap, setChildHealthMap] = useState({});
  const [pushing, setPushing] = useState(null);

  // Create form state
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("central");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [creating, setCreating] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [createProgress, setCreateProgress] = useState("");

  useEffect(() => { fetchList(); }, [fetchList]);

  // Fetch push status for each child
  useEffect(() => {
    if (children.length === 0) return;
    Promise.allSettled(
      children.slice(0, 15).map(c => api.getPushForm(c.id))
    ).then(results => {
      const map = {};
      children.slice(0, 15).forEach((child, idx) => {
        if (results[idx].status === "fulfilled") {
          const data = results[idx].value?.data?.data || results[idx].value?.data;
          const summary = data?.push_summary;
          if (summary) {
            map[child.id] = { behind: summary.total_behind, status: summary.status === "synced" ? "synced" : "stale" };
          } else {
            const src = data?.source_entities || {};
            const existing = data?.child_existing || {};
            let totalSrc = 0, totalChild = 0;
            Object.values(src).forEach(items => { totalSrc += Array.isArray(items) ? items.length : 0; });
            Object.values(existing).forEach(items => { totalChild += Array.isArray(items) ? items.length : 0; });
            const behind = Math.max(0, totalSrc - totalChild);
            map[child.id] = { behind, status: behind > 0 ? "stale" : "synced" };
          }
        }
      });
      setPushStatusMap(prev => ({ ...prev, ...map }));
    });
  }, [children]);

  // Indirect outlets API wiring — single-call health via store_stock_health
  useEffect(() => {
    if (children.length === 0) return;
    api.getHierarchyDetail({ storeRestaurantId: restaurantId, includeStockHealthSummary: true })
      .then(resp => {
        const d = resp.data?.data || resp.data;
        const healthEntries = d?.store_stock_health || [];
        const map = {};
        healthEntries.forEach(h => {
          map[h.restaurant_id] = {
            oos: h.out_of_stock_rows || 0,
            low: h.low_stock_rows || 0,
            ok: h.ok_stock_rows || 0,
            total: h.stock_rows || 0,
            oosItems: [], oosMore: 0,
          };
        });
        setChildHealthMap(map);
      })
      .catch(() => {});
  }, [children, restaurantId]);

  // Indirect outlets API wiring — franchise/list now returns indirect outlets directly
  const displayChildren = children;

  // Filter
  const filtered = useMemo(() => {
    let list = displayChildren;
    if (typeFilter === "master") list = list.filter(c => c.restaurantTypeFlag === "central");
    else if (typeFilter === "outlet") list = list.filter(c => c.restaurantTypeFlag === "franchise");
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => (c.name || "").toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q));
    }
    return list;
  }, [displayChildren, typeFilter, search]);

  const masterCount = displayChildren.filter(c => c.restaurantTypeFlag === "central").length;
  const outletCount = displayChildren.filter(c => c.restaurantTypeFlag === "franchise").length;

  const handleCreateAndPush = async () => {
    if (!formName.trim() || !formEmail.trim() || !formPassword) return;
    setCreating(true);
    setCreateProgress("creating");
    try {
      const result = await createChild({
        name: formName, email: formEmail, phone: formPhone,
        password: formPassword, address: formAddress, childType: formType,
      });
      const newChildId = result?.data?.id || result?.id;
      if (newChildId) {
        setCreateProgress("pushing");
        try {
          await api.pushBundle(newChildId);
          toast({ title: "Store created and catalog pushed" });
        } catch {
          toast({ title: "Store created but push failed. Use Push button to retry.", variant: "destructive" });
        }
      } else {
        toast({ title: "Store created" });
      }
      setShowAddForm(false); setCreateStep(1);
      setFormName(""); setFormEmail(""); setFormPhone(""); setFormPassword(""); setFormAddress("");
      fetchList();
    } catch (e) {
      toast({ title: e?.response?.data?.message || "Failed to create store", variant: "destructive" });
    } finally { setCreating(false); setCreateProgress(""); }
  };

  const handleNext = () => {
    if (!formName.trim() || !formEmail.trim() || !formPassword) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    setCreateStep(2);
  };

  const handlePush = async (childId) => {
    setPushing(childId);
    try {
      await api.pushBundle(childId);
      toast({ title: "Push complete" });
      fetchList();
      // Refresh push status
      const resp = await api.getPushForm(childId);
      const data = resp?.data?.data || resp?.data;
      const summary = data?.push_summary;
      if (summary) {
        setPushStatusMap(prev => ({ ...prev, [childId]: { behind: summary.total_behind, status: summary.status === "synced" ? "synced" : "stale" } }));
      } else {
        const src = data?.source_entities || {};
        const existing = data?.child_existing || {};
        let totalSrc = 0, totalChild = 0;
        Object.values(src).forEach(items => { totalSrc += Array.isArray(items) ? items.length : 0; });
        Object.values(existing).forEach(items => { totalChild += Array.isArray(items) ? items.length : 0; });
        const behind = Math.max(0, totalSrc - totalChild);
        setPushStatusMap(prev => ({ ...prev, [childId]: { behind, status: behind > 0 ? "stale" : "synced" } }));
      }
    } catch (e) {
      toast({ title: e?.response?.data?.message || "Push failed", variant: "destructive" });
    } finally { setPushing(null); }
  };

  return (
    <div data-testid="store-management" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-lg font-bold">Store Management</h1>
            <p className="text-xs text-muted-foreground">{displayChildren.length} stores in hierarchy</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={fetchList} disabled={listLoading}>
            <RefreshCw className={`h-3 w-3 ${listLoading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" className="h-8 text-xs gap-1" onClick={() => { setShowAddForm(true); fetchCreateMeta(); }} data-testid="create-store-btn">
            <Plus className="h-3.5 w-3.5" /> Create Store
          </Button>
        </div>
      </div>

      {/* Type filter pills */}
      <div className="flex items-center gap-2">
        {[
          { value: "all", label: `All (${displayChildren.length})` },
          { value: "master", label: `Master (${masterCount})` },
          { value: "outlet", label: `Outlet (${outletCount})` },
        ].map(t => (
          <Badge
            key={t.value}
            variant={typeFilter === t.value ? "default" : "outline"}
            className="cursor-pointer text-xs px-3 py-1"
            onClick={() => setTypeFilter(t.value)}
            data-testid={`filter-${t.value}`}
          >
            {t.label}
          </Badge>
        ))}
        <div className="relative flex-1 ml-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search stores..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs" data-testid="search-stores" />
        </div>
      </div>

      {/* 2-Step Create & Push Wizard */}
      {showAddForm && (
        <Card className="border-l-[3px] border-l-emerald-500" data-testid="create-store-form">
          <CardContent className="py-4 px-5">
            {/* Step indicator */}
            <div className="flex items-center gap-3 mb-4" data-testid="create-store-steps">
              <div className={`flex items-center gap-1.5 text-xs font-medium ${createStep === 1 ? "text-emerald-700" : "text-muted-foreground"}`}>
                <span className={`inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold ${createStep === 1 ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-600"}`}>
                  {createStep > 1 ? <Check className="h-3 w-3" /> : "1"}
                </span>
                Store Details
              </div>
              <div className="h-px flex-1 bg-border" />
              <div className={`flex items-center gap-1.5 text-xs font-medium ${createStep === 2 ? "text-emerald-700" : "text-muted-foreground"}`}>
                <span className={`inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold ${createStep === 2 ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}>2</span>
                Review & Push
              </div>
            </div>

            {createStep === 1 && (
              <>
                <h3 className="text-xs font-bold text-emerald-700 mb-3">New Store — Step 1: Details</h3>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div><Label className="text-[10px] text-muted-foreground">Store Name *</Label><Input value={formName} onChange={e => setFormName(e.target.value)} className="h-8 text-xs" data-testid="create-store-name" placeholder="e.g. Downtown Branch" /></div>
                  <div><Label className="text-[10px] text-muted-foreground">Store Type *</Label>
                    <Select value={formType} onValueChange={setFormType}>
                      <SelectTrigger className="h-8 text-xs" data-testid="create-store-type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="central">{mapRestaurantType("central")}</SelectItem>
                        <SelectItem value="franchise">{mapRestaurantType("franchise")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-[10px] text-muted-foreground">Email *</Label><Input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} className="h-8 text-xs" data-testid="create-store-email" /></div>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div><Label className="text-[10px] text-muted-foreground">Phone</Label><Input value={formPhone} onChange={e => setFormPhone(e.target.value)} className="h-8 text-xs" /></div>
                  <div><Label className="text-[10px] text-muted-foreground">Password *</Label><Input type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)} className="h-8 text-xs" /></div>
                  <div><Label className="text-[10px] text-muted-foreground">Address</Label><Input value={formAddress} onChange={e => setFormAddress(e.target.value)} className="h-8 text-xs" /></div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => { setShowAddForm(false); setCreateStep(1); }}>Cancel</Button>
                  <Button size="sm" className="text-xs bg-emerald-600 hover:bg-emerald-700 gap-1" onClick={handleNext} data-testid="create-store-next">
                    Next <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </>
            )}

            {createStep === 2 && (
              <>
                <h3 className="text-xs font-bold text-emerald-700 mb-3">New Store — Step 2: Review & Push</h3>
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 mb-4">
                  <p className="text-xs font-semibold text-emerald-800">Creating: <span className="font-bold">{formName}</span> as {mapRestaurantType(formType)}</p>
                  <p className="text-[10px] text-emerald-600 mt-0.5">{formEmail}</p>
                </div>

                {/* Catalog count cards */}
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Catalog items to push</p>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[
                    { key: "categories", label: "Categories" },
                    { key: "ingredients", label: "Ingredients" },
                    { key: "foods", label: "Products" },
                    { key: "recipes", label: "Recipes" },
                  ].map(({ key, label }) => {
                    const entities = createMeta?.available_entities || {};
                    const count = typeof entities[key] === "number" ? entities[key] : (Array.isArray(entities[key]) ? entities[key].length : 0);
                    return (
                      <div key={key} className={`text-center p-2.5 rounded-lg border ${count === 0 ? "opacity-40 bg-muted/30" : "bg-card"}`} data-testid={`catalog-count-${key}`}>
                        <p className="text-lg font-bold tabular-nums">{count}</p>
                        <p className="text-[10px] text-muted-foreground">{label}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { key: "sub_recipes", label: "Sub-Recipes" },
                    { key: "addons", label: "Addons" },
                    { key: "roles", label: "Roles" },
                  ].map(({ key, label }) => {
                    const entities = createMeta?.available_entities || {};
                    const count = typeof entities[key] === "number" ? entities[key] : (Array.isArray(entities[key]) ? entities[key].length : 0);
                    return (
                      <div key={key} className={`text-center p-2.5 rounded-lg border ${count === 0 ? "opacity-40 bg-muted/30" : "bg-card"}`} data-testid={`catalog-count-${key}`}>
                        <p className="text-lg font-bold tabular-nums">{count}</p>
                        <p className="text-[10px] text-muted-foreground">{label}</p>
                      </div>
                    );
                  })}
                </div>

                {createProgress && (
                  <div className="flex items-center gap-2 text-xs text-emerald-700 mb-3">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {createProgress === "creating" ? "Creating store..." : "Pushing catalog..."}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => setCreateStep(1)} disabled={creating} data-testid="create-store-back">
                    <ArrowLeft className="h-3 w-3" /> Back
                  </Button>
                  <Button size="sm" className="text-xs bg-emerald-600 hover:bg-emerald-700 gap-1" onClick={handleCreateAndPush} disabled={creating} data-testid="submit-create-store">
                    {creating && <Loader2 className="h-3 w-3 animate-spin" />}
                    <Check className="h-3 w-3" /> Create & Push
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {listLoading && children.length === 0 && <LoadingState lines={5} />}
      {listError && <ErrorState message={listError} onRetry={fetchList} />}

      {!listLoading && children.length === 0 && !listError && (
        <EmptyState title="No child stores" description="Create your first child store to start managing your hierarchy." />
      )}

      {filtered.length > 0 && (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-6"></TableHead>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Email</TableHead>
                <TableHead className="text-xs text-center">Push Status</TableHead>
                <TableHead className="text-xs text-center text-red-600">OOS</TableHead>
                <TableHead className="text-xs text-center text-amber-600">Low</TableHead>
                <TableHead className="text-xs text-center text-emerald-600">OK</TableHead>
                <TableHead className="text-xs"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(child => {
                const isExpanded = expandedChildId === child.id;
                const ps = pushStatusMap[child.id];
                const health = childHealthMap[child.id];
                return (
                  <React.Fragment key={child.id}>
                    <TableRow
                      data-testid={`store-row-${child.id}`}
                      className={`cursor-pointer hover:bg-accent/30 transition-colors ${isExpanded ? "bg-accent/20" : ""}`}
                      onClick={() => setExpandedChildId(isExpanded ? null : child.id)}
                    >
                      <TableCell className="py-2.5 px-1.5">
                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                      </TableCell>
                      <TableCell className="py-2.5 font-semibold text-sm">
                        {child.isDirectChild === false && <span className="text-[9px] text-muted-foreground mr-1" data-testid={`nested-outlet-${child.id}`}>↳</span>}
                        {child.name}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${child.restaurantTypeFlag === "central" ? "text-orange-700 border-orange-200 bg-orange-50" : "text-blue-700 border-blue-200 bg-blue-50"}`}>
                          {mapRestaurantType(child.restaurantTypeFlag)}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-muted-foreground">{child.email || child.vendor?.email || "—"}</TableCell>
                      <TableCell className="py-2.5 text-center">
                        {ps ? (
                          ps.status === "stale" ? (
                            <span className="text-[10px] font-semibold text-amber-600" data-testid={`push-status-${child.id}`}>{ps.behind} items not pushed</span>
                          ) : (
                            <span className="text-[10px] text-emerald-600" data-testid={`push-status-${child.id}`}>Synced</span>
                          )
                        ) : <span className="text-[10px] text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="py-2.5 text-center">
                        <span className={`text-xs tabular-nums ${health?.oos > 0 ? "text-red-600 font-semibold" : "text-muted-foreground"}`}>{health?.oos ?? "—"}</span>
                      </TableCell>
                      <TableCell className="py-2.5 text-center">
                        <span className={`text-xs tabular-nums ${health?.low > 0 ? "text-amber-600 font-semibold" : "text-muted-foreground"}`}>{health?.low ?? "—"}</span>
                      </TableCell>
                      <TableCell className="py-2.5 text-center">
                        <span className="text-xs tabular-nums text-emerald-600">{health?.ok ?? "—"}</span>
                      </TableCell>
                      <TableCell className="py-2.5">
                        {ps && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-[10px] px-2 gap-1"
                            onClick={(e) => { e.stopPropagation(); handlePush(child.id); }}
                            disabled={pushing === child.id}
                            data-testid={`push-btn-${child.id}`}
                          >
                            {pushing === child.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                            Push
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow><TableCell colSpan={9} className="p-0">
                        <ExpandedStoreDetail child={child} pushStatus={ps} health={health} onPush={() => handlePush(child.id)} pushing={pushing === child.id} />
                      </TableCell></TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function ExpandedStoreDetail({ child, pushStatus, health, onPush, pushing }) {
  const [pushHistory, setPushHistory] = useState([]);
  const [histLoading, setHistLoading] = useState(true);

  useEffect(() => {
    setHistLoading(true);
    api.getHierarchyHistory().then(resp => {
      const data = resp.data?.data || resp.data;
      const items = Array.isArray(data) ? data : data?.history || [];
      // Filter to this child (approximation — show last 3 overall if we can't filter by child)
      setPushHistory(items.slice(0, 3));
    }).catch(() => {}).finally(() => setHistLoading(false));
  }, [child.id]);

  return (
    <div className="py-4 px-5 bg-muted/20 border-t border-border" data-testid={`store-detail-${child.id}`}>
      <div className="grid grid-cols-3 gap-5">
        {/* Left: Store Info */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Store Info</h4>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2"><Mail className="h-3 w-3 text-muted-foreground" /><span>{child.email || child.vendor?.email || "—"}</span></div>
            <div className="flex items-center gap-2"><Phone className="h-3 w-3 text-muted-foreground" /><span>{child.phone || child.vendor?.phone || "—"}</span></div>
            <div className="flex items-center gap-2"><Calendar className="h-3 w-3 text-muted-foreground" /><span>{child.createdAt ? new Date(child.createdAt).toLocaleDateString("en-IN") : "—"}</span></div>
            <div className="flex items-start gap-2"><MapPin className="h-3 w-3 text-muted-foreground mt-0.5" /><span className="text-muted-foreground">{child.address || "—"}</span></div>
          </div>
          {pushStatus && (
            <Button size="sm" className="mt-2 text-xs gap-1 w-full" onClick={onPush} disabled={pushing} data-testid={`push-now-${child.id}`}>
              {pushing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              {pushStatus.status === "stale" ? `Push Now — ${pushStatus.behind} items to push` : "Push Now"}
            </Button>
          )}
        </div>

        {/* Middle: Stock Health */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Stock Health</h4>
          {health ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 rounded-lg bg-red-50 border border-red-100">
                  <p className="text-lg font-bold text-red-600 tabular-nums">{health.oos}</p>
                  <p className="text-[9px] text-red-500">Out of Stock</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-amber-50 border border-amber-100">
                  <p className="text-lg font-bold text-amber-600 tabular-nums">{health.low}</p>
                  <p className="text-[9px] text-amber-500">Low Stock</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                  <p className="text-lg font-bold text-emerald-600 tabular-nums">{health.ok}</p>
                  <p className="text-[9px] text-emerald-500">Adequate</p>
                </div>
              </div>
              {health.oosItems.length > 0 && (
                <div className="text-[10px] text-red-600 mt-1">
                  {health.oosItems.join(", ")}{health.oosMore > 0 ? ` +${health.oosMore} more` : ""}
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Loading health data...</p>
          )}
        </div>

        {/* Right: Push History */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Push History</h4>
          {histLoading ? (
            <p className="text-xs text-muted-foreground">Loading...</p>
          ) : pushHistory.length === 0 ? (
            <p className="text-xs text-muted-foreground">No push history available</p>
          ) : (
            <div className="space-y-1.5">
              {pushHistory.map((h, idx) => (
                <div key={idx} className="flex items-center justify-between text-[10px] p-1.5 rounded bg-muted/30">
                  <span>{h.created_at ? new Date(h.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}</span>
                  <span className="text-muted-foreground">{h.items_count || h.entity_count || "—"} items</span>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-50 text-emerald-600 border-emerald-200">
                    {h.status || "Success"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* CR-043 — G-029 Catalogue Policy panel (master-only editing gated by policy_editable) */}
      <CatalogPolicyCard childId={child.id} childName={child.name} />
    </div>
  );
}

// CR-043 — G-029 Catalogue policy editor. Lazy-loads on mount; auto-hides when API says
// policy_editable=false (view stays read-only in that case).
const POLICY_TOGGLES = [
  { key: "allow_child_catalog_create", label: "Create catalogue items" },
  { key: "allow_child_catalog_update", label: "Edit catalogue items" },
  { key: "allow_child_catalog_delete", label: "Delete catalogue items" },
  { key: "allow_child_inventory_create", label: "Create inventory items" },
  { key: "allow_child_inventory_update", label: "Edit inventory items" },
  { key: "allow_child_inventory_delete", label: "Delete inventory items" },
];

function CatalogPolicyCard({ childId, childName }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [policyEditable, setPolicyEditable] = useState(false);
  const [policy, setPolicy] = useState({});
  const [initial, setInitial] = useState({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    api.getCatalogPolicy(childId)
      .then((resp) => {
        if (cancelled) return;
        const body = resp.data?.data || resp.data || {};
        setPolicyEditable(!!body.policy_editable);
        const resolved = body.resolved_policy || body.stored_policy || {};
        setPolicy(resolved);
        setInitial(resolved);
      })
      .catch((e) => { if (!cancelled) setError(e?.response?.data?.message || "Unable to load policy"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [childId]);

  const dirty = useMemo(() => POLICY_TOGGLES.some((t) => !!policy[t.key] !== !!initial[t.key]), [policy, initial]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {};
      POLICY_TOGGLES.forEach((t) => { payload[t.key] = !!policy[t.key]; });
      await api.updateCatalogPolicy(childId, payload);
      setInitial({ ...policy });
      toast({ title: `Catalogue policy updated for ${childName}` });
    } catch (e) {
      const friendly = friendlyCatalogError(e);
      toast({ title: friendly || e?.response?.data?.message || "Failed to update policy", variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (loading) return null;
  if (error) return (
    <div className="mt-4 text-[10px] text-muted-foreground" data-testid={`policy-card-error-${childId}`}>{error}</div>
  );

  return (
    <div className="mt-5 pt-4 border-t border-border" data-testid={`policy-card-${childId}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Shield className="h-3 w-3" /> Catalogue Policy — What {childName} can edit locally
        </h4>
        {policyEditable ? (
          <Button size="sm" className="h-7 text-[10px] gap-1" onClick={save} disabled={saving || !dirty} data-testid="policy-save-btn">
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Save
          </Button>
        ) : (
          <Badge variant="outline" className="text-[9px] bg-slate-100 text-slate-600">Read-only</Badge>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {POLICY_TOGGLES.map((t) => (
          <div key={t.key} className="flex items-center justify-between gap-2 p-2 rounded border border-border/60 bg-background/60">
            <span className="text-[11px] leading-tight">{t.label}</span>
            <Switch
              checked={!!policy[t.key]}
              onCheckedChange={(v) => setPolicy((p) => ({ ...p, [t.key]: !!v }))}
              disabled={!policyEditable || saving}
              data-testid={`policy-toggle-${t.key}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
