import { useState, useEffect, useCallback } from "react";
import { useLoginContext } from "@/hooks/useLoginContext";
import api from "@/services/api";
import { toast } from "@/hooks/use-toast";
import IngredientComposer from "./IngredientComposer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Loader2, Link2, AlertTriangle } from "lucide-react";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/StateDisplays";

export default function AddonRecipeCatalogue() {
  const { canAccess } = useLoginContext();
  const hasAccess = canAccess("scr-catalogue");

  // All hooks must be called unconditionally (React rules of hooks)
  const [recipes, setRecipes] = useState([]);
  const [orphans, setOrphans] = useState([]);
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecipe, setEditRecipe] = useState(null);

  const load = useCallback(async () => {
    if (!hasAccess) return;
    setLoading(true); setError(null);
    try {
      const [rResp, oResp, aResp] = await Promise.all([
        api.getAddonRecipes(), api.getAddonsWithoutRecipe(), api.getAddonList(),
      ]);
      setRecipes(rResp.data || []);
      setOrphans(oResp.data || []);
      setAddons(aResp.data || []);
    } catch (e) { setError(e?.message || "Failed"); }
    finally { setLoading(false); }
  }, [hasAccess]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    try { await api.deleteAddonRecipe(id); toast({ title: "Addon recipe deleted" }); load(); }
    catch (e) { toast({ title: e?.response?.data?.message || "Delete failed", variant: "destructive" }); }
  };

  if (!hasAccess) return <div data-testid="addon-recipe-catalogue"><EmptyState title="Access denied" /></div>;
  if (loading) return <div data-testid="addon-recipe-catalogue"><LoadingState lines={4} /></div>;
  if (error) return <div data-testid="addon-recipe-catalogue"><ErrorState message={error} onRetry={load} /></div>;

  return (
    <div data-testid="addon-recipe-catalogue">
      <div className="flex items-center gap-2 mb-4">
        <Link2 className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-bold">Addon Recipes</h1>
      </div>

      {orphans.length > 0 && (
        <div className="flex items-start gap-2 p-3 mb-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm" data-testid="orphan-banner">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">{orphans.length} addon{orphans.length > 1 ? "s" : ""} without recipe</p>
            <p className="text-xs mt-0.5 text-amber-700">{orphans.map(o => o.name).join(", ")}</p>
          </div>
        </div>
      )}

      <div className="flex justify-end mb-3">
        <Button size="sm" onClick={() => { setEditRecipe(null); setDialogOpen(true); }} data-testid="add-addon-recipe-btn"><Plus className="h-4 w-4 mr-1" />Create Recipe</Button>
      </div>

      {recipes.length === 0 ? <EmptyState title="No addon recipes" description="Map addons to ingredient recipes for cost tracking." /> : (
        <div className="border rounded-lg overflow-hidden">
          <Table><TableHeader><TableRow>
            <TableHead className="text-xs">Addon</TableHead><TableHead className="text-xs">Recipe Name</TableHead>
            <TableHead className="text-xs text-right">Price</TableHead><TableHead className="text-xs text-center">Ingredients</TableHead>
            <TableHead className="text-xs w-24">Actions</TableHead>
          </TableRow></TableHeader>
            <TableBody>{recipes.map(r => (
              <TableRow key={r.recipe_id} data-testid={`arec-row-${r.recipe_id}`}>
                <TableCell className="py-2 text-sm font-medium">{r.addon_name}</TableCell>
                <TableCell className="py-2 text-xs text-muted-foreground">{r.name}</TableCell>
                <TableCell className="py-2 text-sm text-right tabular-nums">{r.addon_price}</TableCell>
                <TableCell className="py-2 text-center"><Badge variant="outline" className="text-[10px]">{r.ingredients?.length || 0}</Badge></TableCell>
                <TableCell className="py-2 flex gap-1">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditRecipe(r); setDialogOpen(true); }} data-testid={`edit-arec-${r.recipe_id}`}><Pencil className="h-3.5 w-3.5" /></Button>
                  <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" data-testid={`del-arec-${r.recipe_id}`}><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                    <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete addon recipe?</AlertDialogTitle><AlertDialogDescription>This removes the ingredient mapping for this addon.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(r.recipe_id)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                </TableCell>
              </TableRow>
            ))}</TableBody></Table>
        </div>
      )}

      <AddonRecipeFormDialog open={dialogOpen} onOpenChange={setDialogOpen} recipe={editRecipe} addons={addons} orphans={orphans} onSaved={load} />
    </div>
  );
}

function AddonRecipeFormDialog({ open, onOpenChange, recipe, addons, orphans, onSaved }) {
  const [addonId, setAddonId] = useState("");
  const [prepTime, setPrepTime] = useState("1");
  const [servesPeople, setServesPeople] = useState("1");
  const [unit, setUnit] = useState("piece");
  const [qty, setQty] = useState("1");
  const [ingredients, setIngredients] = useState([{ ingredient_id: "", ingredient_qty: "", ingredient_unit: "" }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (recipe) {
      setAddonId(String(recipe.addon_id)); setPrepTime(recipe.preparation_time || "1");
      setServesPeople(String(recipe.serve_people || "1")); setUnit(recipe.unit || "piece"); setQty(recipe.qty || "1");
      setIngredients(recipe.ingredients?.length ? recipe.ingredients.map(i => ({
        ingredient_id: String(i.ingredient_id), ingredient_qty: String(i.ingredient_qty), ingredient_unit: i.ingredient_unit || "",
      })) : [{ ingredient_id: "", ingredient_qty: "", ingredient_unit: "" }]);
    } else {
      setAddonId(""); setPrepTime("1"); setServesPeople("1"); setUnit("piece"); setQty("1");
      setIngredients([{ ingredient_id: "", ingredient_qty: "", ingredient_unit: "" }]);
    }
  }, [recipe, open]);

  const valid = addonId && prepTime && servesPeople && ingredients.length > 0 && ingredients.every(i => i.ingredient_id && Number(i.ingredient_qty) > 0);
  // For create, show orphan addons + all addons; for edit, show current addon
  const addonOptions = recipe ? addons : [...orphans, ...addons.filter(a => !orphans.find(o => o.id === a.id))];

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        addon_id: Number(addonId), preparation_time: Number(prepTime), serves_people: Number(servesPeople), unit, qty: Number(qty),
        ingredients: ingredients.map(i => ({ ingredient_id: Number(i.ingredient_id), ingredient_qty: Number(i.ingredient_qty), ingredient_unit: i.ingredient_unit })),
      };
      if (recipe) await api.updateAddonRecipe(recipe.recipe_id, payload);
      else await api.createAddonRecipe(payload);
      toast({ title: recipe ? "Addon recipe updated" : "Addon recipe created" });
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
        <DialogHeader><DialogTitle>{recipe ? "Edit" : "Create"} Addon Recipe</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">Addon *</Label>
            <Select value={addonId} onValueChange={setAddonId} disabled={!!recipe}>
              <SelectTrigger className="h-8 text-sm" data-testid="arec-addon-select"><SelectValue placeholder="Select addon" /></SelectTrigger>
              <SelectContent>{addonOptions.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name} ({a.price})</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label className="text-xs">Prep Time *</Label><Input type="number" value={prepTime} onChange={e => setPrepTime(e.target.value)} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Serves *</Label><Input type="number" value={servesPeople} onChange={e => setServesPeople(e.target.value)} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Unit</Label><Input value={unit} onChange={e => setUnit(e.target.value)} className="h-8 text-sm" /></div>
          </div>
          <IngredientComposer ingredients={ingredients} onChange={setIngredients} disabled={saving} />
        </div>
        <DialogFooter><Button onClick={save} disabled={saving || !valid} size="sm" data-testid="save-arec-btn">{saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
