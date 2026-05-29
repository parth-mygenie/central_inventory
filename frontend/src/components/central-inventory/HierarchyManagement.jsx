import { useState, useEffect, useMemo } from "react";
import { useLoginContext } from "@/hooks/useLoginContext";
import useHierarchyManagement from "@/hooks/useHierarchyManagement";
import { LoadingState, EmptyState, ErrorState } from "@/components/common/StateDisplays";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mapRestaurantTypeShort } from "@/lib/terminology";
import {
  GitBranch, Plus, Upload, Eye, Check, AlertCircle, Loader2,
  ChevronDown, ChevronRight, ChevronLeft, Clock, Store,
  Package, Beaker, UtensilsCrossed, BookOpen, Link2, X, Wrench,
} from "lucide-react";
import { format } from "date-fns";

/* ── Type Badge ───────────────────────────────────────────────── */

const TYPE_COLORS = {
  central: "bg-sky-100 text-sky-800 border-sky-200",
  franchise: "bg-orange-100 text-orange-800 border-orange-200",
  master: "bg-violet-100 text-violet-800 border-violet-200",
};

function TypeBadge({ type }) {
  const label = mapRestaurantTypeShort(type);
  return (
    <Badge variant="outline" className={`text-[10px] font-normal border ${TYPE_COLORS[type] || ""}`}>
      {label}
    </Badge>
  );
}

/* ── Create Dialog ────────────────────────────────────────────── */

function CreateChildDialog({ open, onClose, allowedTypes, createMeta, onSubmit }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", address: "", childType: "" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (open) {
      const defaultType = allowedTypes.includes("central") ? "central" : allowedTypes[0] || "";
      setForm({ name: "", email: "", phone: "", password: "", address: "", childType: defaultType });
      setErrors({});
      setSuccess(null);
    }
  }, [open, allowedTypes]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setErrors({});
    try {
      const result = await onSubmit(form);
      setSuccess(result);
    } catch (err) {
      const data = err?.response?.data;
      if (data?.errors) setErrors(data.errors);
      else setErrors({ _general: [data?.message || err.message || "Create failed"] });
    } finally {
      setSubmitting(false);
    }
  };

  const entities = createMeta?.available_entities;
  const typeLabel = form.childType === "central" ? "Master Store" : "Outlet";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md" data-testid="create-child-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" />
            {success ? "Store Created" : `Create New ${typeLabel}`}
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="space-y-3 py-2" data-testid="create-success">
            <div className="flex items-center gap-2 text-emerald-600">
              <Check className="h-5 w-5" />
              <span className="text-sm font-medium">{success.message || "Created successfully"}</span>
            </div>
            <div className="bg-accent/50 rounded-md p-3 text-xs space-y-1">
              <p><span className="text-muted-foreground">Name:</span> {success.data?.child?.name}</p>
              <p><span className="text-muted-foreground">Type:</span> <TypeBadge type={success.data?.child?.restaurant_type_flag} /></p>
              <p><span className="text-muted-foreground">ID:</span> {success.data?.child?.id}</p>
            </div>
            <DialogFooter>
              <Button size="sm" onClick={onClose} data-testid="create-done-btn">Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3 py-1">
            {allowedTypes.length > 1 && (
              <div className="space-y-1">
                <Label className="text-xs">Store Type</Label>
                <Select value={form.childType} onValueChange={(v) => setForm({ ...form, childType: v })}>
                  <SelectTrigger className="h-8 text-xs" data-testid="child-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedTypes.includes("central") && <SelectItem value="central">Master Store</SelectItem>}
                    {allowedTypes.includes("franchise") && <SelectItem value="franchise">Outlet</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            )}
            {[
              { key: "name", label: "Store Name", placeholder: "e.g. Downtown Branch" },
              { key: "email", label: "Owner Email", placeholder: "owner@store.com", type: "email" },
              { key: "phone", label: "Phone", placeholder: "9999999999" },
              { key: "password", label: "Password", placeholder: "Minimum 8 characters", type: "password" },
              { key: "address", label: "Address", placeholder: "Full store address" },
            ].map((f) => (
              <div key={f.key} className="space-y-1">
                <Label className="text-xs">{f.label}</Label>
                <Input
                  data-testid={`create-${f.key}-input`}
                  type={f.type || "text"}
                  placeholder={f.placeholder}
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className={`h-8 text-xs ${errors[f.key] ? "border-destructive" : ""}`}
                />
                {errors[f.key] && <p className="text-[10px] text-destructive">{errors[f.key][0]}</p>}
              </div>
            ))}
            {errors._general && <p className="text-xs text-destructive">{errors._general[0]}</p>}
            {entities && (
              <div className="bg-accent/30 rounded-md p-2 text-[10px] text-muted-foreground">
                Parent has: {entities.categories} categories, {entities.foods} foods, {entities.ingredients} ingredients, {entities.recipes} recipes
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>Cancel</Button>
              <Button size="sm" onClick={handleSubmit} disabled={submitting} data-testid="create-submit-btn">
                {submitting ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Creating...</> : "Create Store"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ── Push Wizard Dialog ───────────────────────────────────────── */

const MODULE_ICONS = {
  categories: Store, foods: UtensilsCrossed, addons: Link2,
  ingredients: Beaker, recipes: BookOpen, sub_recipes: BookOpen,
  stock_items: Package, stock_item_categories: Store, roles: Store,
};

function PushWizardDialog({ open, onClose, target, pushForm, pushResults, pushLoading, pushError, onFetchForm, onExecute, onReset }) {
  const [step, setStep] = useState("preview");

  useEffect(() => {
    if (open && target) {
      onReset();
      setStep("preview");
      onFetchForm(target.id);
    }
  }, [open, target]);

  useEffect(() => {
    if (pushResults) setStep("results");
  }, [pushResults]);

  const sourceEntities = pushForm?.source_entities || {};
  const parentName = pushForm?.parent?.name || "Parent";
  const childName = pushForm?.child?.name || target?.name || "Child";

  const handlePush = async () => {
    setStep("pushing");
    try { await onExecute(target.id); } catch { /* error displayed via pushError */ }
  };

  const renderResults = () => {
    if (!pushResults) return null;
    const modules = {};
    const diagnostics = pushResults._diagnostics || {};
    for (const [k, v] of Object.entries(pushResults)) {
      if (k.startsWith("_")) continue;
      if (typeof v === "object" && v !== null && "inserted" in v) modules[k] = v;
    }
    const totalInserted = Object.values(modules).reduce((s, m) => s + (m.inserted || 0), 0);
    const totalUpdated = Object.values(modules).reduce((s, m) => s + (m.updated || 0), 0);
    const totalFailed = Object.values(modules).reduce((s, m) => s + (m.failed || 0), 0);
    return (
      <div className="space-y-3" data-testid="push-results">
        <div className="flex items-center gap-2 text-emerald-600">
          <Check className="h-5 w-5" />
          <span className="text-sm font-medium">Push completed to {childName}</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Module</TableHead>
              <TableHead className="text-xs text-right">Inserted</TableHead>
              <TableHead className="text-xs text-right">Updated</TableHead>
              <TableHead className="text-xs text-right">Failed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(modules).map(([k, v]) => {
              const Icon = MODULE_ICONS[k] || Package;
              return (
                <TableRow key={k}>
                  <TableCell className="text-xs flex items-center gap-1.5"><Icon className="h-3 w-3 text-muted-foreground" />{k}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{v.inserted || 0}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{v.updated || 0}</TableCell>
                  <TableCell className={`text-xs text-right font-mono ${v.failed > 0 ? "text-destructive font-semibold" : ""}`}>{v.failed || 0}</TableCell>
                </TableRow>
              );
            })}
            <TableRow className="font-semibold">
              <TableCell className="text-xs">Total</TableCell>
              <TableCell className="text-xs text-right font-mono">{totalInserted}</TableCell>
              <TableCell className="text-xs text-right font-mono">{totalUpdated}</TableCell>
              <TableCell className={`text-xs text-right font-mono ${totalFailed > 0 ? "text-destructive" : ""}`}>{totalFailed}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        {diagnostics.link_repair && (
          <div className="bg-accent/30 rounded-md p-2 text-[10px] space-y-0.5">
            <p className="font-medium flex items-center gap-1"><Wrench className="h-3 w-3" /> Link Repairs</p>
            {Object.entries(diagnostics.link_repair).map(([k, v]) => (
              <p key={k} className="text-muted-foreground pl-4">{k.replace(/_/g, " ")}: {v}</p>
            ))}
          </div>
        )}
        {diagnostics.warning_total > 0 && (
          <div className="flex items-center gap-1 text-xs text-amber-600">
            <AlertCircle className="h-3.5 w-3.5" /> {diagnostics.warning_total} warning(s)
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg" data-testid="push-wizard-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Upload className="h-4 w-4" />
            {step === "results" ? "Push Complete" : `Push Bundle to ${childName}`}
          </DialogTitle>
        </DialogHeader>

        {pushLoading && step === "preview" && <LoadingState lines={3} />}

        {pushError && (
          <div className="flex items-center gap-2 text-destructive text-sm py-2">
            <AlertCircle className="h-4 w-4" /> {pushError}
          </div>
        )}

        {step === "preview" && pushForm && !pushLoading && (
          <div className="space-y-3" data-testid="push-preview">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-accent/30 rounded-md p-2">
                <p className="text-muted-foreground text-[10px] uppercase">From</p>
                <p className="font-medium">{parentName}</p>
                <TypeBadge type={pushForm.parent?.restaurant_type_flag} />
              </div>
              <div className="bg-accent/30 rounded-md p-2">
                <p className="text-muted-foreground text-[10px] uppercase">To</p>
                <p className="font-medium">{childName}</p>
                <TypeBadge type={pushForm.child?.restaurant_type_flag} />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium mb-1.5">Source entities to push:</p>
              <div className="grid grid-cols-2 gap-1.5">
                {["categories", "foods", "addons", "ingredients", "sub_recipes", "recipes"].map((mod) => {
                  const items = sourceEntities[mod] || [];
                  const Icon = MODULE_ICONS[mod] || Package;
                  return (
                    <div key={mod} className="flex items-center gap-2 text-xs bg-accent/20 rounded px-2 py-1.5">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="flex-1 capitalize">{mod.replace(/_/g, " ")}</span>
                      <span className="font-mono font-semibold">{items.length}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
              <Button size="sm" onClick={() => setStep("confirm")} data-testid="push-next-btn">Push Now</Button>
            </DialogFooter>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-3" data-testid="push-confirm">
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-800">
              <p className="font-medium flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> Confirm Push</p>
              <p className="mt-1">This will sync all categories, foods, addons, ingredients, and recipes from <strong>{parentName}</strong> to <strong>{childName}</strong>.</p>
              <p className="mt-1">Existing items will be updated. New items will be created.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setStep("preview")}>Back</Button>
              <Button size="sm" onClick={handlePush} data-testid="push-confirm-btn">Confirm Push</Button>
            </DialogFooter>
          </div>
        )}

        {step === "pushing" && !pushResults && (
          <div className="flex flex-col items-center py-8 gap-3" data-testid="push-loading">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Pushing bundle to {childName}...</p>
          </div>
        )}

        {step === "results" && (
          <>
            {renderResults()}
            <DialogFooter>
              <Button size="sm" onClick={onClose} data-testid="push-done-btn">Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ── History Section ──────────────────────────────────────────── */

function PushHistorySection({ history, meta, loading, onFetch, children: childList }) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (open && history.length === 0 && !loading) onFetch({ limit: 25, page: 1 });
  }, [open]);

  const changePage = (p) => {
    setPage(p);
    onFetch({ limit: 25, page: p });
  };

  const childMap = useMemo(() => {
    const m = {};
    (childList || []).forEach((c) => { m[c.id] = c.name; });
    return m;
  }, [childList]);

  return (
    <Collapsible open={open} onOpenChange={setOpen} data-testid="push-history-section">
      <Card className="shadow-none border">
        <CollapsibleTrigger asChild>
          <CardHeader className="py-3 px-4 cursor-pointer hover:bg-accent/30 transition-colors">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Clock className="h-4 w-4" />
              Push History {meta?.total ? `(${meta.total})` : ""}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="p-0">
            {loading && <LoadingState lines={3} />}
            {!loading && history.length === 0 && (
              <EmptyState title="No push history" description="Bundle push operations will appear here." icon={Clock} />
            )}
            {!loading && history.length > 0 && (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Time</TableHead>
                      <TableHead className="text-xs">Target Store</TableHead>
                      <TableHead className="text-xs">Module</TableHead>
                      <TableHead className="text-xs">Action</TableHead>
                      <TableHead className="text-xs">Source → Target</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((log) => (
                      <TableRow key={log.id} data-testid={`history-row-${log.id}`}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {log.created_at ? format(new Date(log.created_at.replace(" ", "T")), "d MMM HH:mm") : "—"}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {childMap[log.child_restaurant_id] || `#${log.child_restaurant_id}`}
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="text-[10px] font-normal">{log.entity_type}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant={log.action === "inserted" ? "default" : "secondary"} className="text-[10px]">
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {log.source_entity_id} → {log.target_entity_id}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {meta && meta.last_page > 1 && (
                  <div className="flex items-center justify-between px-4 py-2 border-t">
                    <span className="text-[10px] text-muted-foreground">Page {page} of {meta.last_page}</span>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" className="h-6 px-2 text-[10px]" disabled={page <= 1} onClick={() => changePage(page - 1)}>
                        <ChevronLeft className="h-3 w-3" />
                      </Button>
                      <Button variant="outline" size="sm" className="h-6 px-2 text-[10px]" disabled={page >= meta.last_page} onClick={() => changePage(page + 1)}>
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

/* ── Main Component ───────────────────────────────────────────── */

export default function HierarchyManagement() {
  const { isTopLevel, isMiddleLevel } = useLoginContext();
  const isMaster = isTopLevel;

  const {
    children, listMeta, parentInfo, allowedChildTypes, listLoading, listError, fetchList,
    nestedFranchises, fetchNestedFranchises,
    createMeta, fetchCreateMeta, createChild,
    pushForm, pushResults, pushLoading, pushError, fetchPushForm, executePush, resetPush,
    history, historyMeta, historyLoading, fetchHistory,
  } = useHierarchyManagement();

  const [tab, setTab] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [pushTarget, setPushTarget] = useState(null);

  useEffect(() => { fetchList(); }, [fetchList]);

  // Fetch nested franchises for master tree when children load
  useEffect(() => {
    if (isMaster && children.length > 0) {
      const centrals = children.filter((c) => c.restaurantTypeFlag === "central");
      fetchNestedFranchises(centrals);
    }
  }, [isMaster, children, fetchNestedFranchises]);

  const handleOpenCreate = () => {
    fetchCreateMeta();
    setCreateOpen(true);
  };

  const handleCreate = async (form) => {
    const result = await createChild(form);
    fetchList(); // Refresh list
    return result;
  };

  const handleOpenPush = (child) => {
    setPushTarget(child);
  };

  const handleClosePush = () => {
    setPushTarget(null);
    resetPush();
  };

  // Group children by type
  const centrals = children.filter((c) => c.restaurantTypeFlag === "central");
  const franchises = children.filter((c) => c.restaurantTypeFlag === "franchise");

  // Build nested franchise map (franchise under which central)
  const nestedByParent = useMemo(() => {
    const map = {};
    nestedFranchises.forEach((f) => {
      // Check if this franchise is NOT a direct child
      const isDirect = franchises.some((dc) => dc.id === f.id);
      if (!isDirect) {
        // Find which central owns it — we need parent info
        // Since we don't have parent_restaurant_id from hierarchy-summary,
        // we'll just list them as "nested"
        if (!map._nested) map._nested = [];
        map._nested.push(f);
      }
    });
    return map;
  }, [nestedFranchises, franchises]);

  // All push targets for master
  const allPushTargets = useMemo(() => {
    if (!isMaster) return children;
    const directIds = new Set(children.map((c) => c.id));
    const nested = nestedFranchises.filter((f) => !directIds.has(f.id));
    return [...children, ...nested.map((f) => ({ ...f, isNested: true }))];
  }, [isMaster, children, nestedFranchises]);

  const filteredChildren = tab === "all" ? children
    : tab === "central" ? centrals
    : franchises;

  const renderChildRow = (child, isNested = false) => (
    <TableRow key={child.id} data-testid={`child-row-${child.id}`} className={isNested ? "bg-accent/10" : ""}>
      <TableCell className="text-xs font-medium">
        <div className="flex items-center gap-1.5">
          {isNested && <span className="text-muted-foreground text-[10px] pl-2">└</span>}
          {child.name}
        </div>
      </TableCell>
      <TableCell><TypeBadge type={child.restaurantTypeFlag} /></TableCell>
      <TableCell className="text-xs text-muted-foreground">{child.email || "—"}</TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {child.createdAt ? format(new Date(child.createdAt), "d MMM yyyy") : "—"}
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-2 text-[10px] gap-1"
            onClick={() => handleOpenPush(child)}
            data-testid={`push-btn-${child.id}`}
          >
            <Upload className="h-3 w-3" /> Push
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <div data-testid="hierarchy-management" className="space-y-4 p-4 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-foreground" />
          <h1 className="text-lg font-bold">Store Management</h1>
          {parentInfo && (
            <Badge variant="secondary" className="text-[10px]">
              {parentInfo.name}
            </Badge>
          )}
        </div>
        <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handleOpenCreate} data-testid="create-store-btn">
          <Plus className="h-3.5 w-3.5" /> Create Store
        </Button>
      </div>

      {/* Error */}
      {listError && <ErrorState message={listError} onRetry={fetchList} />}

      {/* Loading */}
      {listLoading && <LoadingState lines={4} />}

      {/* Children List */}
      {!listLoading && !listError && (
        <Card className="shadow-none border" data-testid="hierarchy-list">
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="h-7">
                  <TabsTrigger value="all" className="text-[10px] h-6 px-2" data-testid="tab-all">
                    All ({children.length})
                  </TabsTrigger>
                  {centrals.length > 0 && (
                    <TabsTrigger value="central" className="text-[10px] h-6 px-2" data-testid="tab-central">
                      Master Stores ({centrals.length})
                    </TabsTrigger>
                  )}
                  {(franchises.length > 0 || (isMaster && nestedFranchises.length > 0)) && (
                    <TabsTrigger value="franchise" className="text-[10px] h-6 px-2" data-testid="tab-franchise">
                      Outlets ({isMaster ? nestedFranchises.length + franchises.length : franchises.length})
                    </TabsTrigger>
                  )}
                </TabsList>
              </Tabs>
              {listMeta && (
                <span className="text-[10px] text-muted-foreground">
                  {listMeta.total} direct {listMeta.total === 1 ? "child" : "children"}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {children.length === 0 ? (
              <EmptyState title="No stores yet" description="Create your first store to get started." icon={Store} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Email</TableHead>
                    <TableHead className="text-xs">Created</TableHead>
                    <TableHead className="text-xs w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tab === "all" && (
                    <>
                      {centrals.map((c) => (
                        <>{renderChildRow(c)}</>
                      ))}
                      {franchises.map((c) => renderChildRow(c))}
                      {/* Show nested franchises for master */}
                      {isMaster && nestedByParent._nested?.map((f) => renderChildRow(f, true))}
                    </>
                  )}
                  {tab === "central" && centrals.map((c) => renderChildRow(c))}
                  {tab === "franchise" && (
                    <>
                      {franchises.map((c) => renderChildRow(c))}
                      {isMaster && nestedByParent._nested?.map((f) => renderChildRow(f, true))}
                    </>
                  )}
                  {filteredChildren.length === 0 && tab !== "all" && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">
                        No {tab === "central" ? "Master Stores" : "Outlets"} found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Push History */}
      {!listLoading && !listError && (
        <PushHistorySection
          history={history}
          meta={historyMeta}
          loading={historyLoading}
          onFetch={fetchHistory}
          children={allPushTargets}
        />
      )}

      {/* Create Dialog */}
      <CreateChildDialog
        open={createOpen}
        onClose={() => { setCreateOpen(false); }}
        allowedTypes={allowedChildTypes}
        createMeta={createMeta}
        onSubmit={handleCreate}
      />

      {/* Push Wizard */}
      <PushWizardDialog
        open={!!pushTarget}
        onClose={handleClosePush}
        target={pushTarget}
        pushForm={pushForm}
        pushResults={pushResults}
        pushLoading={pushLoading}
        pushError={pushError}
        onFetchForm={fetchPushForm}
        onExecute={executePush}
        onReset={resetPush}
      />
    </div>
  );
}
