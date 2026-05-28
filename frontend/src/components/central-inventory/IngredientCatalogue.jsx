import { useState, useMemo, useEffect, useCallback } from "react";
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
import { Search, Plus, Pencil, Trash2, Loader2, Beaker, FolderOpen, AlertTriangle } from "lucide-react";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/StateDisplays";
import { toast } from "@/hooks/use-toast";

export default function IngredientCatalogue() {
  const { canAccess } = useLoginContext();
  const hasAccess = canAccess("scr-catalogue");

  return (
    <div data-testid="ingredient-catalogue">
      {!hasAccess ? <EmptyState title="Access denied" /> : (
        <>
          <div className="flex items-center gap-2 mb-4">
            <Beaker className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold">Ingredients & Categories</h1>
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

function IngredientsTab() {
  const [ingredients, setIngredients] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [invResp, catResp] = await Promise.all([
        api.getStockInventory(), api.getStockItemCategories(),
      ]);
      setIngredients(invResp.data?.current_stocks || []);
      setCategories(catResp.data || []);
    } catch (e) { setError(e?.message || "Failed to load"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return ingredients;
    const q = search.toLowerCase();
    return ingredients.filter(i => i.stock_title?.toLowerCase().includes(q) || i.category_name?.toLowerCase().includes(q));
  }, [ingredients, search]);

  if (loading) return <LoadingState lines={4} />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input data-testid="search-ingredients" placeholder="Search ingredients..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)} data-testid="add-ingredient-btn"><Plus className="h-4 w-4 mr-1" />Add Item</Button>
      </div>
      {filtered.length === 0 ? <EmptyState title="No ingredients" /> : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="text-xs">Name</TableHead>
              <TableHead className="text-xs">Category</TableHead>
              <TableHead className="text-xs text-right">Quantity</TableHead>
              <TableHead className="text-xs text-right">Min Alert</TableHead>
              <TableHead className="text-xs text-center">Status</TableHead>
              <TableHead className="text-xs w-20">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map(item => (
                <TableRow key={item.id} data-testid={`ing-row-${item.id}`} className={item.is_low_stock ? "bg-red-50/40" : ""}>
                  <TableCell className="py-2 text-sm font-medium">{item.stock_title}</TableCell>
                  <TableCell className="py-2 text-xs text-muted-foreground">{item.category_name || "—"}</TableCell>
                  <TableCell className="py-2 text-sm text-right tabular-nums">{item.display_qty} {item.display_unit}</TableCell>
                  <TableCell className="py-2 text-xs text-right tabular-nums text-muted-foreground">{item.min_qty_alert} {item.min_unit_alert}</TableCell>
                  <TableCell className="py-2 text-center">
                    {item.is_low_stock ? <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Low</Badge> : <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-700 border-emerald-200 bg-emerald-50">OK</Badge>}
                  </TableCell>
                  <TableCell className="py-2">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditItem(item); setDialogOpen(true); }} data-testid={`edit-ing-${item.id}`}><Pencil className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <EditIngredientDialog open={dialogOpen} onOpenChange={setDialogOpen} item={editItem} onSaved={load} />
      <AddIngredientDialog open={addOpen} onOpenChange={setAddOpen} categories={categories} onSaved={load} />
    </>
  );
}

function EditIngredientDialog({ open, onOpenChange, item, onSaved }) {
  const [stockTitle, setStockTitle] = useState("");
  const [unit, setUnit] = useState("");
  const [minAlert, setMinAlert] = useState("");
  const [minUnit, setMinUnit] = useState("");
  const [saving, setSaving] = useState(false);
  const [showRenameWarn, setShowRenameWarn] = useState(false);

  useEffect(() => {
    if (item) {
      setStockTitle(item.stock_title || "");
      setUnit(item.unit || "");
      setMinAlert(String(item.min_qty_alert || ""));
      setMinUnit(item.min_unit_alert || "");
      setShowRenameWarn(false);
    }
  }, [item]);

  const nameChanged = item && stockTitle.trim() !== (item.stock_title || "").trim();

  const save = async () => {
    if (nameChanged && !showRenameWarn) {
      setShowRenameWarn(true);
      return;
    }
    setSaving(true);
    try {
      const payload = { unit, min_qty_alert: Number(minAlert), min_unit_alert: minUnit };
      if (nameChanged) payload.stock_title = stockTitle.trim();
      await api.updateStockItem(item.id, payload);
      toast({ title: "Ingredient updated" });
      onOpenChange(false); onSaved();
    } catch (e) {
      toast({ title: e?.response?.data?.message || "Update failed", variant: "destructive" });
    } finally { setSaving(false); setShowRenameWarn(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setShowRenameWarn(false); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Edit Ingredient</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Ingredient Name</Label>
            <Input value={stockTitle} onChange={e => { setStockTitle(e.target.value); setShowRenameWarn(false); }} className="h-8 text-sm" data-testid="edit-ing-name" />
          </div>
          {showRenameWarn && (
            <div className="flex items-start gap-2 p-2.5 rounded-md border border-amber-200 bg-amber-50 text-amber-800 text-[11px]" data-testid="rename-warning">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>This name may be used in recipes, transfers, and reports. Renaming may affect operational consistency. Click Save again to confirm.</span>
            </div>
          )}
          <div><Label className="text-xs">Unit</Label><Input value={unit} onChange={e => setUnit(e.target.value)} className="h-8 text-sm" data-testid="edit-ing-unit" /></div>
          <div><Label className="text-xs">Min Stock Alert</Label><Input type="number" value={minAlert} onChange={e => setMinAlert(e.target.value)} className="h-8 text-sm" data-testid="edit-ing-min-alert" /></div>
          <div><Label className="text-xs">Min Alert Unit</Label><Input value={minUnit} onChange={e => setMinUnit(e.target.value)} className="h-8 text-sm" data-testid="edit-ing-min-unit" /></div>
        </div>
        <DialogFooter><Button onClick={save} disabled={saving} size="sm" data-testid="save-ing-btn">{saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}{showRenameWarn ? "Confirm Rename & Save" : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddIngredientDialog({ open, onOpenChange, categories, onSaved }) {
  const [title, setTitle] = useState("");
  const [catId, setCatId] = useState("");
  const [unit, setUnit] = useState("kg");
  const [smallUnit, setSmallUnit] = useState("gm");
  const [minAlert, setMinAlert] = useState("");
  const [minUnitAlert, setMinUnitAlert] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim() || !catId) return;
    setSaving(true);
    try {
      await api.addInventoryItem([{ category_id: Number(catId), stock_title: title, unit, small_unit: smallUnit, minimun_stock_alert: Number(minAlert) || 0, min_unit_alert: minUnitAlert }]);
      onOpenChange(false); setTitle(""); setCatId(""); setMinAlert(""); onSaved();
    } catch { }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Add Ingredient</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">Name *</Label><Input value={title} onChange={e => setTitle(e.target.value)} className="h-8 text-sm" data-testid="add-ing-title" /></div>
          <div><Label className="text-xs">Category *</Label>
            <Select value={catId} onValueChange={setCatId}><SelectTrigger className="h-8 text-sm" data-testid="add-ing-cat"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.category_name}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Unit</Label><Select value={unit} onValueChange={v => { setUnit(v); setSmallUnit(v === "kg" ? "gm" : v === "ltr" ? "ml" : ""); }}><SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="kg">kg</SelectItem><SelectItem value="ltr">ltr</SelectItem><SelectItem value="pcs">pcs</SelectItem></SelectContent></Select></div>
            <div><Label className="text-xs">Small Unit</Label><Input value={smallUnit} onChange={e => setSmallUnit(e.target.value)} className="h-8 text-sm" /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Min Alert</Label><Input type="number" value={minAlert} onChange={e => setMinAlert(e.target.value)} className="h-8 text-sm" data-testid="add-ing-min" /></div>
            <div><Label className="text-xs">Alert Unit</Label><Input value={minUnitAlert} onChange={e => setMinUnitAlert(e.target.value)} className="h-8 text-sm" /></div>
          </div>
        </div>
        <DialogFooter><Button onClick={save} disabled={saving || !title.trim() || !catId} size="sm" data-testid="save-add-ing-btn">{saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}Add</Button></DialogFooter>
      </DialogContent>
    </Dialog>
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
                    <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete "{c.category_name}"?</AlertDialogTitle><AlertDialogDescription>This may affect linked ingredients.</AlertDialogDescription></AlertDialogHeader>
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
