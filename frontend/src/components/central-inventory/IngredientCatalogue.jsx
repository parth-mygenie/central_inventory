import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useLoginContext } from "@/hooks/useLoginContext";
import { useCatalogueCrud } from "@/hooks/useCatalogueCrud";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Search, Plus, Pencil, Trash2, Loader2, Beaker, FolderOpen, AlertTriangle, ChevronDown, ChevronRight, Save, X } from "lucide-react";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/StateDisplays";
import { toast } from "@/hooks/use-toast";

function formatCurrency(n) {
  if (n == null || isNaN(n)) return "\u20B90";
  return `\u20B9${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function StatusBadge({ item }) {
  const qty = Number(item.cal_quantity) || 0;
  if (item.is_low_stock) return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Low</Badge>;
  if (qty === 0) return <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-slate-500 border-slate-200 bg-slate-50">Empty</Badge>;
  return <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-700 border-emerald-200 bg-emerald-50">OK</Badge>;
}

function getItemStatus(item) {
  if (item.is_low_stock) return "low";
  if ((Number(item.cal_quantity) || 0) === 0) return "empty";
  return "ok";
}

/** Intelligence panel for expanded ingredient row */
function IngredientIntelligence({ item, purchaseData, childStoreCount }) {
  const intel = useMemo(() => {
    const records = purchaseData.filter((r) => r.Ingredient_Name === item.stock_title || r.ingredient_id === item.id);
    if (records.length === 0) return null;

    // Avg purchase rate
    const totalAmt = records.reduce((s, r) => s + (Number(r.Amount) || 0), 0);
    const totalQty = records.reduce((s, r) => s + (Number(r.stock_quantity_raw) || 0), 0);
    const avgRate = totalQty > 0 ? totalAmt / totalQty : 0;

    // Consumption rate — estimate from purchase data frequency
    const sortedByDate = [...records].sort((a, b) => new Date(a.Purchase_Date) - new Date(b.Purchase_Date));
    let dailyConsumption = 0;
    if (sortedByDate.length >= 2) {
      const firstDate = new Date(sortedByDate[0].Purchase_Date);
      const lastDate = new Date(sortedByDate[sortedByDate.length - 1].Purchase_Date);
      const days = Math.max(1, (lastDate - firstDate) / (1000 * 60 * 60 * 24));
      dailyConsumption = totalQty / days;
    }

    // Days of stock
    const currentQty = Number(item.cal_quantity) || 0;
    const daysOfStock = dailyConsumption > 0 ? Math.floor(currentQty / dailyConsumption) : null;

    // Vendor price comparison
    const byVendor = {};
    records.forEach((r) => {
      const vn = r.Vendor_Name || "Unknown";
      if (!byVendor[vn]) byVendor[vn] = { totalAmt: 0, totalQty: 0 };
      byVendor[vn].totalAmt += Number(r.Amount) || 0;
      byVendor[vn].totalQty += Number(r.stock_quantity_raw) || 0;
    });
    const vendorRates = Object.entries(byVendor)
      .map(([name, d]) => ({ name, rate: d.totalQty > 0 ? d.totalAmt / d.totalQty : 0 }))
      .filter((v) => v.rate > 0)
      .sort((a, b) => a.rate - b.rate);

    const maxRate = vendorRates.length > 0 ? vendorRates[vendorRates.length - 1].rate : 1;

    return { avgRate, dailyConsumption, daysOfStock, vendorRates, maxRate };
  }, [item, purchaseData]);

  if (!intel) {
    return <p className="text-xs text-muted-foreground py-3">No purchase history for this ingredient.</p>;
  }

  return (
    <div className="space-y-3">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-50 rounded p-2 border border-slate-200">
          <p className="text-[9px] text-muted-foreground uppercase">Avg Rate</p>
          <p className="text-xs font-semibold" data-testid="ing-kpi-avg-rate">{formatCurrency(intel.avgRate)}/{item.unit || "unit"}</p>
        </div>
        <div className="bg-slate-50 rounded p-2 border border-slate-200">
          <p className="text-[9px] text-muted-foreground uppercase">Consumption</p>
          <p className="text-xs font-semibold" data-testid="ing-kpi-consumption">
            {intel.dailyConsumption > 0 ? `${intel.dailyConsumption.toFixed(1)} ${item.unit || ""}/day` : "\u2014"}
          </p>
        </div>
        <div className="bg-slate-50 rounded p-2 border border-slate-200">
          <p className="text-[9px] text-muted-foreground uppercase">Days of Stock</p>
          <p className={`text-xs font-semibold ${intel.daysOfStock !== null && intel.daysOfStock < 7 ? "text-red-600" : intel.daysOfStock !== null && intel.daysOfStock < 30 ? "text-amber-600" : "text-emerald-600"}`} data-testid="ing-kpi-dos">
            {intel.daysOfStock !== null ? `${intel.daysOfStock}d` : "\u2014"}
          </p>
        </div>
      </div>

      {/* Vendor Price Comparison */}
      {intel.vendorRates.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase mb-1.5">Vendor Price Comparison</p>
          <div className="space-y-1.5">
            {intel.vendorRates.map((v, i) => {
              const pct = (v.rate / intel.maxRate) * 100;
              const color = i === 0 ? "bg-emerald-500" : i === intel.vendorRates.length - 1 ? "bg-red-400" : "bg-amber-400";
              return (
                <div key={v.name} className="flex items-center gap-2" data-testid={`vendor-rate-${i}`}>
                  <span className="text-[10px] w-28 truncate text-right">{v.name}</span>
                  <span className="text-[10px] font-mono w-16 text-right">{formatCurrency(v.rate)}/{item.unit}</span>
                  <div className="flex-1 h-3 bg-slate-100 rounded overflow-hidden">
                    <div className={`h-full ${color} rounded`} style={{ width: `${pct}%` }} />
                  </div>
                  {i === 0 && <span className="text-[9px] text-emerald-600 font-semibold">{"\u2713"} best</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pushed to stores */}
      {childStoreCount > 0 && (
        <p className="text-[10px] text-blue-600">
          <span className="px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200">Pushed to {childStoreCount} stores</span>
        </p>
      )}
    </div>
  );
}

/** Inline edit form for expanded row */
function InlineEditForm({ item, categories, onSave, onCancel }) {
  const [form, setForm] = useState({
    stock_title: item.stock_title || "",
    category_id: String(item.category_id || ""),
    unit: item.unit || "kg",
    min_qty_alert: String(item.min_qty_alert || "0"),
    min_unit_alert: item.min_unit_alert || item.unit || "kg",
  });
  const [saving, setSaving] = useState(false);
  const [showRenameWarn, setShowRenameWarn] = useState(false);

  const nameChanged = form.stock_title.trim() !== (item.stock_title || "").trim();
  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (nameChanged && !showRenameWarn) { setShowRenameWarn(true); return; }
    setSaving(true);
    try {
      const payload = { unit: form.unit, min_qty_alert: Number(form.min_qty_alert), min_unit_alert: form.min_unit_alert };
      if (nameChanged) payload.stock_title = form.stock_title.trim();
      if (form.category_id && form.category_id !== String(item.category_id)) payload.category_id = Number(form.category_id);
      await api.updateStockItem(item.id, payload);
      toast({ title: "Ingredient updated" });
      onSave();
    } catch (e) {
      toast({ title: e?.response?.data?.message || "Update failed", variant: "destructive" });
    } finally { setSaving(false); setShowRenameWarn(false); }
  };

  return (
    <div className="space-y-2" data-testid="ing-edit-form">
      <div>
        <Label className="text-[10px]">Name</Label>
        <Input value={form.stock_title} onChange={(e) => { update("stock_title", e.target.value); setShowRenameWarn(false); }} className="h-7 text-xs" data-testid="edit-ing-name" />
      </div>
      {showRenameWarn && (
        <div className="flex items-start gap-1.5 p-2 rounded border border-amber-200 bg-amber-50 text-amber-800 text-[10px]" data-testid="rename-warning">
          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
          <span>Renaming may affect recipes and reports. Click Save again to confirm.</span>
        </div>
      )}
      <div>
        <Label className="text-[10px]">Category</Label>
        <Select value={form.category_id} onValueChange={(v) => update("category_id", v)}>
          <SelectTrigger className="h-7 text-xs" data-testid="edit-ing-cat"><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.category_name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px]">Unit</Label>
          <Select value={form.unit} onValueChange={(v) => update("unit", v)}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="kg">kg</SelectItem><SelectItem value="ltr">ltr</SelectItem><SelectItem value="pcs">pcs</SelectItem><SelectItem value="pkt">pkt</SelectItem></SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px]">Min Alert</Label>
          <div className="flex gap-1">
            <Input type="number" value={form.min_qty_alert} onChange={(e) => update("min_qty_alert", e.target.value)} className="h-7 text-xs flex-1" data-testid="edit-ing-min-alert" />
            <Select value={form.min_unit_alert} onValueChange={(v) => update("min_unit_alert", v)}>
              <SelectTrigger className="h-7 text-xs w-16"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="kg">kg</SelectItem><SelectItem value="gm">gm</SelectItem><SelectItem value="ltr">ltr</SelectItem><SelectItem value="ml">ml</SelectItem><SelectItem value="pcs">pcs</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button size="sm" className="h-6 text-[10px] gap-1" onClick={handleSave} disabled={saving} data-testid="save-ing-btn">
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          {showRenameWarn ? "Confirm & Save" : "Save"}
        </Button>
        <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={onCancel} data-testid="cancel-ing-edit"><X className="h-3 w-3 mr-0.5" />Cancel</Button>
      </div>
    </div>
  );
}

/** Inline add form shown at top of table */
function InlineAddForm({ categories, onSaved, onCancel }) {
  const [title, setTitle] = useState("");
  const [catId, setCatId] = useState("");
  const [unit, setUnit] = useState("kg");
  const [minAlert, setMinAlert] = useState("");
  const [minUnitAlert, setMinUnitAlert] = useState("gm");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim() || !catId) return;
    setSaving(true);
    try {
      await api.addInventoryItem([{ category_id: Number(catId), stock_title: title, unit, small_unit: unit === "kg" ? "gm" : unit === "ltr" ? "ml" : "", minimun_stock_alert: Number(minAlert) || 0, min_unit_alert: minUnitAlert }]);
      toast({ title: "Ingredient added" });
      setTitle(""); setCatId(""); setMinAlert("");
      onSaved();
    } catch (err) {
      toast({ title: err?.response?.data?.message || "Failed to add ingredient", variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Card className="mb-3 border-primary/30 bg-primary/5" data-testid="add-ingredient-inline">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Plus className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold">New Ingredient</span>
        </div>
        <div className="grid grid-cols-5 gap-2 items-end">
          <div>
            <Label className="text-[10px]">Name *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-7 text-xs" placeholder="Ingredient name" data-testid="add-ing-title" />
          </div>
          <div>
            <Label className="text-[10px]">Category *</Label>
            <Select value={catId} onValueChange={setCatId}>
              <SelectTrigger className="h-7 text-xs" data-testid="add-ing-cat"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.category_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px]">Unit</Label>
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="kg">kg</SelectItem><SelectItem value="ltr">ltr</SelectItem><SelectItem value="pcs">pcs</SelectItem></SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px]">Min Alert</Label>
            <div className="flex gap-1">
              <Input type="number" value={minAlert} onChange={(e) => setMinAlert(e.target.value)} className="h-7 text-xs flex-1" data-testid="add-ing-min" />
              <Select value={minUnitAlert} onValueChange={setMinUnitAlert}>
                <SelectTrigger className="h-7 text-xs w-14"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="gm">gm</SelectItem><SelectItem value="kg">kg</SelectItem><SelectItem value="ml">ml</SelectItem><SelectItem value="ltr">ltr</SelectItem><SelectItem value="pcs">pcs</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-1">
            <Button size="sm" className="h-7 text-[10px]" onClick={save} disabled={saving || !title.trim() || !catId} data-testid="save-add-ing-btn">
              {saving && <Loader2 className="h-3 w-3 mr-0.5 animate-spin" />}Add
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={onCancel}>Cancel</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function IngredientsTab() {
  const { isTopLevel, restaurantId } = useLoginContext();
  const [ingredients, setIngredients] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [recipeMap, setRecipeMap] = useState({});
  const [childStoreCount, setChildStoreCount] = useState(0);
  const [purchaseData, setPurchaseData] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [addMode, setAddMode] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const fetches = [
        api.getStockInventory(),
        api.getStockItemCategories(),
        api.getRecipeList(),
      ];
      if (isTopLevel) fetches.push(api.getHierarchyList({ limit: 100 }));
      const results = await Promise.all(fetches);
      const [invResp, catResp, recResp] = results;
      setIngredients(invResp.data?.current_stocks || []);
      setCategories(catResp.data || []);
      const recipes = recResp.data || [];
      const rMap = {};
      recipes.forEach((r) => {
        (r.ingredients || []).forEach((ing) => {
          const key = (ing.stock_title || ing.ingredient_name || "").toLowerCase();
          if (key) rMap[key] = (rMap[key] || 0) + 1;
        });
      });
      setRecipeMap(rMap);
      if (isTopLevel && results[3]) {
        const children = results[3].data?.data?.children || results[3].data?.children || [];
        setChildStoreCount(children.length);
      }
    } catch (e) { setError(e?.message || "Failed to load"); }
    finally { setLoading(false); }
  }, [isTopLevel]);

  const loadPurchaseData = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const resp = await api.getVendorItemList(restaurantId, { fromDate: oneYearAgo.toISOString().split("T")[0], toDate: new Date().toISOString().split("T")[0] });
      setPurchaseData(resp.data || []);
    } catch (e) { console.warn("[IngredientCatalogue] purchase data:", e); }
  }, [restaurantId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadPurchaseData(); }, [loadPurchaseData]);

  const uniqueCategories = useMemo(() => {
    const cats = [...new Set(ingredients.map((i) => i.category_name).filter(Boolean))];
    return cats.sort();
  }, [ingredients]);

  const filtered = useMemo(() => {
    return ingredients.filter((i) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!(i.stock_title || "").toLowerCase().includes(q) && !(i.category_name || "").toLowerCase().includes(q)) return false;
      }
      if (categoryFilter !== "all" && i.category_name !== categoryFilter) return false;
      if (statusFilter !== "all" && getItemStatus(i) !== statusFilter) return false;
      return true;
    });
  }, [ingredients, search, categoryFilter, statusFilter]);

  const toggleExpand = (id) => setExpandedId((prev) => (prev === id ? null : id));

  if (loading) return <LoadingState lines={4} />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <>
      {/* Filters */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input data-testid="search-ingredients" placeholder="Search ingredients..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-8 text-xs w-40" data-testid="filter-category"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {uniqueCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 text-xs w-28" data-testid="filter-status"><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="ok">OK</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="empty">Empty</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" className="h-8 text-xs" onClick={() => setAddMode(true)} data-testid="add-ingredient-btn"><Plus className="h-3.5 w-3.5 mr-1" />Add Item</Button>
      </div>

      {/* Inline Add Form */}
      {addMode && <InlineAddForm categories={categories} onSaved={() => { setAddMode(false); load(); loadPurchaseData(); }} onCancel={() => setAddMode(false)} />}

      {/* Table */}
      {filtered.length === 0 ? <EmptyState title={ingredients.length === 0 ? "No ingredients" : "No matches"} /> : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] w-8"></TableHead>
                <TableHead className="text-[10px]">Name</TableHead>
                <TableHead className="text-[10px]">Category</TableHead>
                <TableHead className="text-[10px] text-right">Qty</TableHead>
                <TableHead className="text-[10px]">Unit</TableHead>
                <TableHead className="text-[10px] text-right">Min Alert</TableHead>
                <TableHead className="text-[10px] text-center">Status</TableHead>
                <TableHead className="text-[10px] text-center">Recipes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => {
                const isExpanded = expandedId === item.id;
                return (
                  <React.Fragment key={item.id}>
                    <TableRow data-testid={`ing-row-${item.id}`} className={`cursor-pointer ${item.is_low_stock ? "bg-red-50/40" : ""} ${isExpanded ? "bg-muted/30" : "hover:bg-muted/20"}`} onClick={() => toggleExpand(item.id)}>
                      <TableCell className="py-2 pl-3 pr-0">
                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                      </TableCell>
                      <TableCell className="py-2 text-xs font-medium">{item.stock_title}</TableCell>
                      <TableCell className="py-2 text-xs text-muted-foreground">{item.category_name || "\u2014"}</TableCell>
                      <TableCell className="py-2 text-xs text-right tabular-nums font-mono">{item.display_qty} {item.display_unit}</TableCell>
                      <TableCell className="py-2 text-xs text-muted-foreground">{item.unit}</TableCell>
                      <TableCell className="py-2 text-xs text-right tabular-nums text-muted-foreground">{item.min_qty_alert} {item.min_unit_alert}</TableCell>
                      <TableCell className="py-2 text-center"><StatusBadge item={item} /></TableCell>
                      <TableCell className="py-2 text-center text-xs tabular-nums" data-testid={`recipe-count-${item.id}`}>
                        {recipeMap[(item.stock_title || "").toLowerCase()] || 0}
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <tr data-testid={`ing-expanded-${item.id}`}>
                        <td colSpan={8} className="p-0">
                          <div className="bg-muted/10 p-4 border-t" onClick={(e) => e.stopPropagation()}>
                            <div className="grid grid-cols-2 gap-6">
                              <InlineEditForm item={item} categories={categories} onSave={() => { setExpandedId(null); load(); }} onCancel={() => setExpandedId(null)} />
                              <IngredientIntelligence item={item} purchaseData={purchaseData} childStoreCount={isTopLevel ? childStoreCount : 0} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      <p className="text-[10px] text-muted-foreground mt-2">Showing {filtered.length} of {ingredients.length} ingredients</p>
    </>
  );
}

function CategoriesTab() {
  const crud = useCatalogueCrud({
    fetchFn: api.getStockItemCategories,
    createFn: (p) => api.createStockItemCategory(p),
    updateFn: (id, p) => api.updateStockItemCategory(id, p),
    deleteFn: (id) => api.deleteStockItemCategory(id),
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCat, setEditCat] = useState(null);
  const [name, setName] = useState("");

  useEffect(() => { crud.load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => { setEditCat(null); setName(""); setDialogOpen(true); };
  const openEdit = (c) => { setEditCat(c); setName(c.category_name); setDialogOpen(true); };
  const save = async () => {
    const ok = editCat ? await crud.update(editCat.id, { category_name: name }, "Category updated") : await crud.create({ category_name: name }, "Category created");
    if (ok) setDialogOpen(false);
  };

  if (crud.loading) return <LoadingState lines={3} />;
  if (crud.error) return <ErrorState message={crud.error} onRetry={crud.load} />;

  return (
    <>
      <div className="flex justify-end mb-3"><Button size="sm" onClick={openCreate} data-testid="add-category-btn"><Plus className="h-4 w-4 mr-1" />Add Category</Button></div>
      {crud.items.length === 0 ? <EmptyState title="No categories" icon={FolderOpen} /> : (
        <div className="border rounded-lg overflow-hidden">
          <Table><TableHeader><TableRow><TableHead className="text-xs">Name</TableHead><TableHead className="text-xs w-32">Actions</TableHead></TableRow></TableHeader>
            <TableBody>{crud.items.map(c => (
              <TableRow key={c.id} data-testid={`cat-row-${c.id}`}>
                <TableCell className="py-2 text-sm">{c.category_name}</TableCell>
                <TableCell className="py-2 flex gap-1">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(c)} data-testid={`edit-cat-${c.id}`}><Pencil className="h-3.5 w-3.5" /></Button>
                  <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" data-testid={`del-cat-${c.id}`}><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                    <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete &ldquo;{c.category_name}&rdquo;?</AlertDialogTitle><AlertDialogDescription>This may affect linked ingredients.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => crud.remove(c.id, "Category deleted")}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                </TableCell>
              </TableRow>
            ))}</TableBody></Table>
        </div>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle>{editCat ? "Edit" : "Add"} Category</DialogTitle></DialogHeader>
          <div><Label className="text-xs">Category Name *</Label><Input value={name} onChange={e => setName(e.target.value)} className="h-8 text-sm" data-testid="cat-name-input" /></div>
          <DialogFooter><Button onClick={save} disabled={crud.submitting || !name.trim()} size="sm" data-testid="save-cat-btn">{crud.submitting && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function IngredientCatalogue() {
  const { canAccess } = useLoginContext();
  const hasAccess = canAccess("scr-catalogue");

  return (
    <div data-testid="ingredient-catalogue">
      {!hasAccess ? <EmptyState title="Access denied" /> : (
        <>
          <div className="flex items-center gap-2 mb-4">
            <Beaker className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold">Raw Material Master</h1>
          </div>
          <Tabs defaultValue="ingredients">
            <TabsList className="mb-4">
              <TabsTrigger value="ingredients" data-testid="tab-ingredients">Ingredients</TabsTrigger>
              <TabsTrigger value="categories" data-testid="tab-categories">Categories</TabsTrigger>
            </TabsList>
            <TabsContent value="ingredients"><IngredientsTab /></TabsContent>
            <TabsContent value="categories"><CategoriesTab /></TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
