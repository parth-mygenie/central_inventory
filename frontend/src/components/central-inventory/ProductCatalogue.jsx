import { useState, useMemo, useEffect, useCallback } from "react";
import { useLoginContext } from "@/hooks/useLoginContext";
import api from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Search, Plus, Pencil, Trash2, Loader2, UtensilsCrossed } from "lucide-react";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/StateDisplays";

export default function ProductCatalogue() {
  const { canAccess } = useLoginContext();
  const hasAccess = canAccess("scr-catalogue");

  return (
    <div data-testid="product-catalogue">
      {!hasAccess ? <EmptyState title="Access denied" /> : (
        <>
          <div className="flex items-center gap-2 mb-4">
            <UtensilsCrossed className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold">Products</h1>
          </div>
          <Tabs defaultValue="foods">
            <TabsList className="mb-4">
              <TabsTrigger value="foods" data-testid="tab-foods">Foods</TabsTrigger>
              <TabsTrigger value="categories" data-testid="tab-food-categories">Categories</TabsTrigger>
              <TabsTrigger value="addons" data-testid="tab-addons">Addons</TabsTrigger>
            </TabsList>
            <TabsContent value="foods"><FoodsTab /></TabsContent>
            <TabsContent value="categories"><FoodCategoriesTab /></TabsContent>
            <TabsContent value="addons"><AddonsTab /></TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function FoodsTab() {
  const [foods, setFoods] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editFood, setEditFood] = useState(null);
  const [recipeMap, setRecipeMap] = useState({});

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [fResp, cResp, rResp] = await Promise.all([api.getFoodsList(), api.getFoodCategories(), api.getRecipeList()]);
      setFoods(fResp.data || []); setCategories(cResp.data || []);
      // B6: Build food_name → has_recipe map from actual recipe data
      const map = {};
      (rResp.data || []).forEach(r => {
        if (r.food_name) map[r.food_name.toLowerCase()] = true;
      });
      setRecipeMap(map);
    } catch (e) { setError(e?.message || "Failed"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return foods;
    const q = search.toLowerCase();
    return foods.filter(f => f.name?.toLowerCase().includes(q) || f.category?.name?.toLowerCase().includes(q));
  }, [foods, search]);

  const handleDelete = async (id) => {
    try { await api.deleteFood(id); toast({ title: "Food deleted" }); load(); }
    catch (e) { toast({ title: e?.response?.data?.message || "Delete failed", variant: "destructive" }); }
  };

  if (loading) return <LoadingState lines={4} />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input data-testid="search-foods" placeholder="Search foods..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        <Button size="sm" onClick={() => { setEditFood(null); setDialogOpen(true); }} data-testid="add-food-btn"><Plus className="h-4 w-4 mr-1" />Add Food</Button>
      </div>
      {filtered.length === 0 ? <EmptyState title="No foods" /> : (
        <div className="border rounded-lg overflow-hidden">
          <Table><TableHeader><TableRow>
            <TableHead className="text-xs">Name</TableHead><TableHead className="text-xs">Category</TableHead>
            <TableHead className="text-xs text-right">Price</TableHead><TableHead className="text-xs text-center">Status</TableHead>
            <TableHead className="text-xs text-center">Has Recipe</TableHead>
            <TableHead className="text-xs w-24">Actions</TableHead>
          </TableRow></TableHeader>
            <TableBody>{filtered.map(f => (
              <TableRow key={f.id} data-testid={`food-row-${f.id}`}>
                <TableCell className="py-2 text-sm font-medium">{f.name}</TableCell>
                <TableCell className="py-2 text-xs text-muted-foreground">{f.category?.name || "—"}</TableCell>
                <TableCell className="py-2 text-sm text-right tabular-nums">{f.price}</TableCell>
                <TableCell className="py-2 text-center"><Badge variant={f.status === 1 ? "outline" : "secondary"} className="text-[10px] px-1.5 py-0">{f.status === 1 ? "Active" : "Inactive"}</Badge></TableCell>
                <TableCell className="py-2 text-center"><Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${recipeMap[(f.name || "").toLowerCase()] ? "text-emerald-700 border-emerald-200 bg-emerald-50" : ""}`}>{recipeMap[(f.name || "").toLowerCase()] ? "Yes" : "—"}</Badge></TableCell>
                <TableCell className="py-2 flex gap-1">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditFood(f); setDialogOpen(true); }} data-testid={`edit-food-${f.id}`}><Pencil className="h-3.5 w-3.5" /></Button>
                  <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" data-testid={`del-food-${f.id}`}><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                    <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete "{f.name}"?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(f.id)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                </TableCell>
              </TableRow>
            ))}</TableBody></Table>
        </div>
      )}
      <FoodFormDialog open={dialogOpen} onOpenChange={setDialogOpen} food={editFood} categories={categories} onSaved={load} />
    </>
  );
}

function FoodFormDialog({ open, onOpenChange, food, categories, onSaved }) {
  const [name, setName] = useState("");
  const [catId, setCatId] = useState("");
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (food) { setName(food.name || ""); setCatId(String(food.category?.id || "")); setPrice(String(food.price || "")); setDesc(food.description || ""); }
    else { setName(""); setCatId(""); setPrice(""); setDesc(""); }
  }, [food, open]);

  const save = async () => {
    if (!name.trim() || !price) return;
    setSaving(true);
    try {
      const payload = { name, category_id: Number(catId), price: Number(price), description: desc };
      if (food) await api.updateFood(food.id, payload);
      else await api.addFood(payload);
      toast({ title: food ? "Food updated" : "Food added" });
      onOpenChange(false); onSaved();
    } catch (e) {
      const d = e?.response?.data;
      const msg = d?.errors ? (Array.isArray(d.errors) ? d.errors.map(x => x.message).join(", ") : Object.values(d.errors).flat().join(", ")) : (d?.message || "Failed");
      toast({ title: msg, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{food ? "Edit" : "Add"} Food</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">Name *</Label><Input value={name} onChange={e => setName(e.target.value)} className="h-8 text-sm" data-testid="food-name" /></div>
          <div><Label className="text-xs">Category</Label>
            <Select value={catId} onValueChange={setCatId}><SelectTrigger className="h-8 text-sm" data-testid="food-cat"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label className="text-xs">Price *</Label><Input type="number" value={price} onChange={e => setPrice(e.target.value)} className="h-8 text-sm" data-testid="food-price" /></div>
          <div><Label className="text-xs">Description</Label><Input value={desc} onChange={e => setDesc(e.target.value)} className="h-8 text-sm" data-testid="food-desc" /></div>
        </div>
        <DialogFooter><Button onClick={save} disabled={saving || !name.trim() || !price} size="sm" data-testid="save-food-btn">{saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FoodCategoriesTab() {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCat, setEditCat] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const r = await api.getFoodCategories(); setCats(r.data || []); }
    catch (e) { setError(e?.message || "Failed"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    try { await api.deleteFoodCategory(id); toast({ title: "Category deleted" }); load(); }
    catch (e) { toast({ title: e?.response?.data?.message || e?.response?.data?.error || "Delete failed", variant: "destructive" }); }
  };

  if (loading) return <LoadingState lines={3} />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <>
      <div className="flex justify-end mb-3">
        <Button size="sm" onClick={() => { setEditCat(null); setDialogOpen(true); }} data-testid="add-food-cat-btn"><Plus className="h-4 w-4 mr-1" />Add Category</Button>
      </div>
      {cats.length === 0 ? <EmptyState title="No food categories" /> : (
        <div className="border rounded-lg overflow-hidden">
          <Table><TableHeader><TableRow>
            <TableHead className="text-xs">Name</TableHead><TableHead className="text-xs">Tax</TableHead>
            <TableHead className="text-xs text-center">Status</TableHead><TableHead className="text-xs w-24">Actions</TableHead>
          </TableRow></TableHeader>
            <TableBody>{cats.map(c => (
              <TableRow key={c.id} data-testid={`fcat-row-${c.id}`}>
                <TableCell className="py-2 text-sm font-medium">{c.name}</TableCell>
                <TableCell className="py-2 text-xs text-muted-foreground">{c.tax_type} {c.gst_percent ? `${c.gst_percent}%` : ""}</TableCell>
                <TableCell className="py-2 text-center"><Badge variant={c.status === 1 ? "outline" : "secondary"} className="text-[10px]">{c.status === 1 ? "Active" : "Inactive"}</Badge></TableCell>
                <TableCell className="py-2 flex gap-1">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditCat(c); setDialogOpen(true); }} data-testid={`edit-fcat-${c.id}`}><Pencil className="h-3.5 w-3.5" /></Button>
                  <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" data-testid={`del-fcat-${c.id}`}><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                    <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete "{c.name}"?</AlertDialogTitle><AlertDialogDescription>This may affect linked food items.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(c.id)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                </TableCell>
              </TableRow>))}</TableBody></Table>
        </div>
      )}
      <FoodCategoryFormDialog open={dialogOpen} onOpenChange={setDialogOpen} category={editCat} onSaved={load} />
    </>
  );
}

function FoodCategoryFormDialog({ open, onOpenChange, category, onSaved }) {
  const [name, setName] = useState("");
  const [catType, setCatType] = useState("food");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (category) { setName(category.name || ""); setCatType(category.cat_type || "food"); }
    else { setName(""); setCatType("food"); }
  }, [category, open]);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (category) await api.updateFoodCategory(category.id, { name, cat_type: catType });
      else await api.createFoodCategory({ name, cat_type: catType });
      toast({ title: category ? "Category updated" : "Category created" });
      onOpenChange(false); onSaved();
    } catch (e) {
      const d = e?.response?.data;
      const msg = d?.error || (d?.errors ? Object.values(d.errors).flat().join(", ") : "") || d?.message || "Failed";
      toast({ title: msg, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader><DialogTitle>{category ? "Edit" : "Add"} Food Category</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">Category Name *</Label><Input value={name} onChange={e => setName(e.target.value)} className="h-8 text-sm" data-testid="fcat-name-input" /></div>
        </div>
        <DialogFooter><Button onClick={save} disabled={saving || !name.trim()} size="sm" data-testid="save-fcat-btn">{saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddonsTab() {
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAddon, setEditAddon] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const r = await api.getAddonList(); setAddons(r.data || []); }
    catch (e) { setError(e?.message || "Failed"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    try { await api.deleteAddon(id); toast({ title: "Addon deleted" }); load(); }
    catch (e) { toast({ title: e?.response?.data?.message || "Delete failed", variant: "destructive" }); }
  };

  if (loading) return <LoadingState lines={3} />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <>
      <div className="flex justify-end mb-3">
        <Button size="sm" onClick={() => { setEditAddon(null); setDialogOpen(true); }} data-testid="add-addon-btn"><Plus className="h-4 w-4 mr-1" />Add Addon</Button>
      </div>
      {addons.length === 0 ? <EmptyState title="No addons" /> : (
        <div className="border rounded-lg overflow-hidden">
          <Table><TableHeader><TableRow>
            <TableHead className="text-xs">Name</TableHead><TableHead className="text-xs text-right">Price</TableHead>
            <TableHead className="text-xs text-center">Status</TableHead><TableHead className="text-xs w-24">Actions</TableHead>
          </TableRow></TableHeader>
            <TableBody>{addons.map(a => (
              <TableRow key={a.id} data-testid={`addon-row-${a.id}`}>
                <TableCell className="py-2 text-sm font-medium">{a.name}</TableCell>
                <TableCell className="py-2 text-sm text-right tabular-nums">{a.price}</TableCell>
                <TableCell className="py-2 text-center"><Badge variant={a.status === 1 ? "outline" : "secondary"} className="text-[10px]">{a.status === 1 ? "Active" : "Inactive"}</Badge></TableCell>
                <TableCell className="py-2 flex gap-1">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditAddon(a); setDialogOpen(true); }} data-testid={`edit-addon-${a.id}`}><Pencil className="h-3.5 w-3.5" /></Button>
                  <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" data-testid={`del-addon-${a.id}`}><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                    <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete "{a.name}"?</AlertDialogTitle><AlertDialogDescription>This will also remove any linked addon recipes.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(a.id)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                </TableCell>
              </TableRow>))}</TableBody></Table>
        </div>
      )}
      <AddonFormDialog open={dialogOpen} onOpenChange={setDialogOpen} addon={editAddon} onSaved={load} />
    </>
  );
}

function AddonFormDialog({ open, onOpenChange, addon, onSaved }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (addon) { setName(addon.name || ""); setPrice(String(addon.price || "")); }
    else { setName(""); setPrice(""); }
  }, [addon, open]);

  const save = async () => {
    if (!name.trim() || !price) return;
    setSaving(true);
    try {
      if (addon) await api.updateAddon(addon.id, { name, price: Number(price) });
      else await api.createAddon({ name, price: Number(price) });
      toast({ title: addon ? "Addon updated" : "Addon created" });
      onOpenChange(false); onSaved();
    } catch (e) {
      const d = e?.response?.data;
      const msg = d?.errors ? (Array.isArray(d.errors) ? d.errors.map(x => x.message).join(", ") : Object.values(d.errors).flat().join(", ")) : (d?.message || "Failed");
      toast({ title: msg, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader><DialogTitle>{addon ? "Edit" : "Add"} Addon</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">Name *</Label><Input value={name} onChange={e => setName(e.target.value)} className="h-8 text-sm" data-testid="addon-name-input" /></div>
          <div><Label className="text-xs">Price *</Label><Input type="number" min="0" step="any" value={price} onChange={e => setPrice(e.target.value)} className="h-8 text-sm" data-testid="addon-price-input" /></div>
        </div>
        <DialogFooter><Button onClick={save} disabled={saving || !name.trim() || !price} size="sm" data-testid="save-addon-btn">{saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
