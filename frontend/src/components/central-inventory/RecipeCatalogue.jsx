import { useState, useEffect, useCallback, useMemo } from "react";
import { useLoginContext } from "@/hooks/useLoginContext";
import api from "@/services/api";
import { toast } from "@/hooks/use-toast";
import IngredientComposer from "./IngredientComposer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Search, Plus, Pencil, Trash2, Loader2, BookOpen, ChefHat } from "lucide-react";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/StateDisplays";

export default function RecipeCatalogue() {
  const { canAccess } = useLoginContext();
  const hasAccess = canAccess("scr-catalogue");

  return (
    <div data-testid="recipe-catalogue">
      {!hasAccess ? <EmptyState title="Access denied" /> : (
        <>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold">Recipes</h1>
          </div>
          <Tabs defaultValue="recipes">
            <TabsList className="mb-4">
              <TabsTrigger value="recipes" data-testid="tab-recipes">Recipes</TabsTrigger>
              <TabsTrigger value="sub-recipes" data-testid="tab-sub-recipes">Sub-Recipes</TabsTrigger>
            </TabsList>
            <TabsContent value="recipes"><RecipesTab /></TabsContent>
            <TabsContent value="sub-recipes"><SubRecipesTab /></TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function RecipesTab() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecipe, setEditRecipe] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const r = await api.getRecipeList(); setRecipes(r.data || []); }
    catch (e) { setError(e?.message || "Failed"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return recipes;
    const q = search.toLowerCase();
    return recipes.filter(r => r.name?.toLowerCase().includes(q) || r.food_name?.toLowerCase().includes(q));
  }, [recipes, search]);

  const handleDelete = async (id) => {
    try { await api.deleteRecipe(id); toast({ title: "Recipe deleted" }); load(); }
    catch (e) { toast({ title: e?.response?.data?.message || "Delete failed", variant: "destructive" }); }
  };

  if (loading) return <LoadingState lines={4} />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input data-testid="search-recipes" placeholder="Search recipes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        <Button size="sm" onClick={() => { setEditRecipe(null); setDialogOpen(true); }} data-testid="add-recipe-btn"><Plus className="h-4 w-4 mr-1" />Add Recipe</Button>
      </div>
      {filtered.length === 0 ? <EmptyState title="No recipes" icon={ChefHat} /> : (
        <div className="border rounded-lg overflow-hidden">
          <Table><TableHeader><TableRow>
            <TableHead className="text-xs">Name</TableHead><TableHead className="text-xs">Food</TableHead>
            <TableHead className="text-xs">Category</TableHead><TableHead className="text-xs text-center">Ingredients</TableHead>
            <TableHead className="text-xs w-24">Actions</TableHead>
          </TableRow></TableHeader>
            <TableBody>{filtered.map(r => (
              <TableRow key={r.recipe_id} data-testid={`recipe-row-${r.recipe_id}`}>
                <TableCell className="py-2 text-sm font-medium">{r.name || r.food_name}</TableCell>
                <TableCell className="py-2 text-xs text-muted-foreground">{r.food_name}</TableCell>
                <TableCell className="py-2 text-xs text-muted-foreground">{r.category_name || "—"}</TableCell>
                <TableCell className="py-2 text-center">
                  <Badge variant="outline" className="text-[10px]">{r.ingredients?.length || 0}</Badge>
                </TableCell>
                <TableCell className="py-2 flex gap-1">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditRecipe(r); setDialogOpen(true); }} data-testid={`edit-recipe-${r.recipe_id}`}><Pencil className="h-3.5 w-3.5" /></Button>
                  <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" data-testid={`del-recipe-${r.recipe_id}`}><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                    <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete recipe?</AlertDialogTitle><AlertDialogDescription>This will remove the recipe and its ingredient composition.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(r.recipe_id)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                </TableCell>
              </TableRow>
            ))}</TableBody></Table>
        </div>
      )}
      <RecipeFormDialog open={dialogOpen} onOpenChange={setDialogOpen} recipe={editRecipe} onSaved={load} />
    </>
  );
}

function RecipeFormDialog({ open, onOpenChange, recipe, onSaved }) {
  const [name, setName] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [servesPeople, setServesPeople] = useState("1");
  const [unit, setUnit] = useState("piece");
  const [qty, setQty] = useState("1");
  const [ingredients, setIngredients] = useState([{ ingredient_id: "", ingredient_qty: "", ingredient_unit: "" }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (recipe) {
      setName(recipe.name || recipe.food_name || "");
      setPrepTime(recipe.preparation_time || "");
      setServesPeople(String(recipe.serve_people || "1"));
      setUnit(recipe.unit || "piece");
      setQty(recipe.qty || "1");
      setIngredients(recipe.ingredients?.length ? recipe.ingredients.map(i => ({
        ingredient_id: String(i.ingredient_id), ingredient_qty: String(i.ingredient_qty), ingredient_unit: i.ingredient_unit || "",
      })) : [{ ingredient_id: "", ingredient_qty: "", ingredient_unit: "" }]);
    } else {
      setName(""); setPrepTime(""); setServesPeople("1"); setUnit("piece"); setQty("1");
      setIngredients([{ ingredient_id: "", ingredient_qty: "", ingredient_unit: "" }]);
    }
  }, [recipe, open]);

  const valid = name.trim() && prepTime && servesPeople && ingredients.length > 0 && ingredients.every(i => i.ingredient_id && Number(i.ingredient_qty) > 0);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        name, preparation_time: Number(prepTime), serves_people: Number(servesPeople), unit, qty: Number(qty),
        ingredients: ingredients.map(i => ({ ingredient_id: Number(i.ingredient_id), ingredient_qty: Number(i.ingredient_qty), ingredient_unit: i.ingredient_unit })),
      };
      if (recipe) await api.updateRecipe(recipe.recipe_id, payload);
      else await api.createRecipe(payload);
      toast({ title: recipe ? "Recipe updated" : "Recipe created" });
      onOpenChange(false); onSaved();
    } catch (e) {
      const d = e?.response?.data;
      const msg = d?.errors ? Object.values(d.errors).flat().join(", ") : (d?.message || "Failed");
      toast({ title: msg, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{recipe ? "Edit" : "Add"} Recipe</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">Name *</Label><Input value={name} onChange={e => setName(e.target.value)} className="h-8 text-sm" data-testid="recipe-name" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Prep Time (min) *</Label><Input type="number" value={prepTime} onChange={e => setPrepTime(e.target.value)} className="h-8 text-sm" data-testid="recipe-prep" /></div>
            <div><Label className="text-xs">Serves *</Label><Input type="number" value={servesPeople} onChange={e => setServesPeople(e.target.value)} className="h-8 text-sm" data-testid="recipe-serves" /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Unit</Label><Input value={unit} onChange={e => setUnit(e.target.value)} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Qty</Label><Input type="number" value={qty} onChange={e => setQty(e.target.value)} className="h-8 text-sm" /></div>
          </div>
          <IngredientComposer ingredients={ingredients} onChange={setIngredients} disabled={saving} />
        </div>
        <DialogFooter><Button onClick={save} disabled={saving || !valid} size="sm" data-testid="save-recipe-btn">{saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SubRecipesTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const r = await api.getSubRecipeList(); setItems(r.data || []); }
    catch (e) { setError(e?.message || "Failed"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingState lines={3} />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <>
      <div className="flex justify-end mb-3">
        <Button size="sm" onClick={() => { setEditItem(null); setDialogOpen(true); }} data-testid="add-sub-recipe-btn"><Plus className="h-4 w-4 mr-1" />Add Sub-Recipe</Button>
      </div>
      {items.length === 0 ? <EmptyState title="No sub-recipes" description="Sub-recipes are reusable prep items used as ingredients in other recipes." /> : (
        <div className="border rounded-lg overflow-hidden">
          <Table><TableHeader><TableRow>
            <TableHead className="text-xs">Name</TableHead><TableHead className="text-xs">Unit</TableHead>
            <TableHead className="text-xs text-center">Ingredients</TableHead><TableHead className="text-xs w-20">Actions</TableHead>
          </TableRow></TableHeader>
            <TableBody>{items.map(sr => (
              <TableRow key={sr.id || sr.recipe_id} data-testid={`subrecipe-row-${sr.id || sr.recipe_id}`}>
                <TableCell className="py-2 text-sm font-medium">{sr.name}</TableCell>
                <TableCell className="py-2 text-xs text-muted-foreground">{sr.unit || "—"}</TableCell>
                <TableCell className="py-2 text-center"><Badge variant="outline" className="text-[10px]">{sr.ingredients?.length || 0}</Badge></TableCell>
                <TableCell className="py-2">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditItem(sr); setDialogOpen(true); }} data-testid={`edit-subrecipe-${sr.id || sr.recipe_id}`}><Pencil className="h-3.5 w-3.5" /></Button>
                </TableCell>
              </TableRow>
            ))}</TableBody></Table>
        </div>
      )}
      <SubRecipeFormDialog open={dialogOpen} onOpenChange={setDialogOpen} subRecipe={editItem} onSaved={load} />
    </>
  );
}

function SubRecipeFormDialog({ open, onOpenChange, subRecipe, onSaved }) {
  const [name, setName] = useState("");
  const [prepTime, setPrepTime] = useState("1");
  const [servesPeople, setServesPeople] = useState("1");
  const [unit, setUnit] = useState("gm");
  const [qty, setQty] = useState("1");
  const [ingredients, setIngredients] = useState([{ ingredient_id: "", ingredient_qty: "", ingredient_unit: "" }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (subRecipe) {
      setName(subRecipe.name || ""); setPrepTime(subRecipe.prepration_time || subRecipe.preparation_time || "1");
      setServesPeople(String(subRecipe.serve_people || "1")); setUnit(subRecipe.unit || "gm"); setQty(subRecipe.qty || "1");
      setIngredients(subRecipe.ingredients?.length ? subRecipe.ingredients.map(i => ({
        ingredient_id: String(i.ingredient_id), ingredient_qty: String(i.ingredient_qty), ingredient_unit: i.ingredient_unit || "",
      })) : [{ ingredient_id: "", ingredient_qty: "", ingredient_unit: "" }]);
    } else {
      setName(""); setPrepTime("1"); setServesPeople("1"); setUnit("gm"); setQty("1");
      setIngredients([{ ingredient_id: "", ingredient_qty: "", ingredient_unit: "" }]);
    }
  }, [subRecipe, open]);

  // Frontend validation — backend has NO validation, goes straight to SQL
  const valid = name.trim() && prepTime && servesPeople && ingredients.length > 0 && ingredients.every(i => i.ingredient_id && Number(i.ingredient_qty) > 0);

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      const payload = {
        name, prepration_time: Number(prepTime), serve_people: Number(servesPeople), unit, qty: Number(qty),
        ingredients: ingredients.map(i => ({ ingredient_id: Number(i.ingredient_id), ingredient_qty: Number(i.ingredient_qty), ingredient_unit: i.ingredient_unit })),
      };
      if (subRecipe) await api.updateSubRecipe(subRecipe.id || subRecipe.recipe_id, payload);
      else await api.createSubRecipe(payload);
      toast({ title: subRecipe ? "Sub-recipe updated" : "Sub-recipe created" });
      onOpenChange(false); onSaved();
    } catch (e) {
      toast({ title: e?.response?.data?.message || "Failed to save sub-recipe", variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{subRecipe ? "Edit" : "Add"} Sub-Recipe</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">Name *</Label><Input value={name} onChange={e => setName(e.target.value)} className="h-8 text-sm" data-testid="subrecipe-name" /></div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label className="text-xs">Prep Time *</Label><Input type="number" value={prepTime} onChange={e => setPrepTime(e.target.value)} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Serves *</Label><Input type="number" value={servesPeople} onChange={e => setServesPeople(e.target.value)} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Unit</Label><Input value={unit} onChange={e => setUnit(e.target.value)} className="h-8 text-sm" /></div>
          </div>
          <IngredientComposer ingredients={ingredients} onChange={setIngredients} disabled={saving} />
        </div>
        <DialogFooter><Button onClick={save} disabled={saving || !valid} size="sm" data-testid="save-subrecipe-btn">{saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
