import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConfirmActionDialog from "./ConfirmActionDialog";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/StateDisplays";
import { Search, Plus, Trash2, Loader2, BookOpen, X } from "lucide-react";

/**
 * AddonRecipeCatalogue — CR-032 master-detail BOM editor
 * Same pattern as RecipeCatalogue but linked to Addons instead of Foods.
 */
export default function AddonRecipeCatalogue({ embedded }) {
  const [recipes, setRecipes] = useState([]);
  const [addons, setAddons] = useState([]);
  const [orphanAddons, setOrphanAddons] = useState([]);
  const [inventoryMaster, setInventoryMaster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [isAddMode, setIsAddMode] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [arResp, aResp, oResp, imResp] = await Promise.allSettled([
        api.getAddonRecipes(), api.getAddonList(), api.getAddonsWithoutRecipe(), api.getInventoryMaster(),
      ]);
      setRecipes(arResp.status === "fulfilled" ? (arResp.value.data || []) : []);
      setAddons(aResp.status === "fulfilled" ? (aResp.value.data || []) : []);
      setOrphanAddons(oResp.status === "fulfilled" ? (oResp.value.data || []) : []);
      const master = imResp.status === "fulfilled" ? (imResp.value.data?.data || imResp.value.data || []) : [];
      setInventoryMaster(Array.isArray(master) ? master : []);
    } catch (e) { setError(e?.message || "Failed to load"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return recipes;
    const q = search.toLowerCase();
    return recipes.filter(r => (r.name || r.addon_name || "").toLowerCase().includes(q));
  }, [recipes, search]);

  const selectedRecipe = useMemo(() => recipes.find(r => r.id === selectedId || r.recipe_id === selectedId), [recipes, selectedId]);

  if (loading) return <LoadingState lines={4} />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div data-testid="addon-recipe-catalogue" className={embedded ? "" : "space-y-4"}>
      {!embedded && (
        <div className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /><h1 className="text-lg font-bold">Addon Recipes</h1></div>
      )}
      <div className="flex gap-4" style={{ minHeight: "400px" }}>
        {/* Left Panel */}
        <div className="w-[35%] shrink-0 space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search addon recipes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs" data-testid="search-addon-recipes" />
          </div>
          <Button size="sm" className="w-full h-8 text-xs gap-1" onClick={() => { setIsAddMode(true); setSelectedId(null); }} data-testid="add-addon-recipe-btn">
            <Plus className="h-3.5 w-3.5" /> Add Addon Recipe
          </Button>
          <div className="space-y-1.5 max-h-[350px] overflow-y-auto pr-1">
            {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No addon recipes found</p>}
            {filtered.map(r => {
              const rid = r.id || r.recipe_id;
              const isSelected = !isAddMode && String(rid) === String(selectedId);
              return (
                <div key={rid} data-testid={`addon-recipe-card-${rid}`}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? "border-primary bg-accent/30" : "border-border hover:border-primary/40"}`}
                  onClick={() => { setSelectedId(rid); setIsAddMode(false); }}>
                  <p className="text-sm font-semibold truncate">{r.name || r.addon_name}</p>
                  <p className="text-[10px] text-muted-foreground">{r.ingredients?.length || 0} ingredients</p>
                </div>
              );
            })}
          </div>
          {/* Orphan addons */}
          {orphanAddons.length > 0 && (
            <div className="mt-3 p-3 rounded-lg border border-amber-200 bg-amber-50/50">
              <p className="text-[10px] font-bold text-amber-700 mb-1">Addons without recipe ({orphanAddons.length})</p>
              <div className="space-y-0.5">
                {orphanAddons.slice(0, 5).map(a => (
                  <p key={a.id} className="text-[10px] text-amber-600">{a.name}</p>
                ))}
                {orphanAddons.length > 5 && <p className="text-[10px] text-amber-500">+{orphanAddons.length - 5} more</p>}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="flex-1 min-w-0">
          {!selectedRecipe && !isAddMode && (
            <div className="flex items-center justify-center h-full"><p className="text-sm text-muted-foreground">Select an addon recipe or add a new one</p></div>
          )}
          {(selectedRecipe || isAddMode) && (
            <AddonRecipeDetail
              recipe={isAddMode ? null : selectedRecipe}
              addons={addons}
              inventoryMaster={inventoryMaster}
              onSaved={load}
              onDeleted={() => { setSelectedId(null); load(); }}
              onCancel={() => setIsAddMode(false)}
              isAddMode={isAddMode}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function AddonRecipeDetail({ recipe, addons, inventoryMaster, onSaved, onDeleted, onCancel, isAddMode }) {
  const [name, setName] = useState("");
  const [addonId, setAddonId] = useState("");
  const [ingredients, setIngredients] = useState([{ ingredient_id: "", ingredient_qty: "", ingredient_unit: "" }]);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (recipe) {
      const rid = recipe.id || recipe.recipe_id;
      api.getAddonRecipeById(rid).then(resp => {
        const d = resp.data;
        setName(d?.name || d?.addon_name || recipe.name || "");
        setAddonId(String(d?.addon_id || ""));
        setIngredients((d?.ingredients || []).map(i => ({
          ingredient_id: String(i.ingredient_id), ingredient_qty: String(i.ingredient_qty), ingredient_unit: i.ingredient_unit || "", ingredient_name: i.ingredient_name || "",
        })));
      }).catch(() => {});
    } else {
      setName(""); setAddonId("");
      setIngredients([{ ingredient_id: "", ingredient_qty: "", ingredient_unit: "" }]);
    }
  }, [recipe]);

  const addRow = () => setIngredients([...ingredients, { ingredient_id: "", ingredient_qty: "", ingredient_unit: "" }]);
  const removeRow = (idx) => setIngredients(ingredients.filter((_, i) => i !== idx));
  const updateRow = (idx, field, value) => {
    const next = [...ingredients];
    next[idx] = { ...next[idx], [field]: value };
    if (field === "ingredient_id") {
      const m = inventoryMaster.find(i => String(i.id) === String(value));
      next[idx].ingredient_unit = m?.unit === "kg" ? "gm" : m?.unit === "ltr" ? "ml" : m?.unit || "";
      next[idx].ingredient_name = m?.stock_title || "";
    }
    setIngredients(next);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // BUG-047 — Added preparation_time/serves_people/serve_time + fixed ingredient keys (id/qty/unit)
      const payload = {
        name, addon_name: name, addon_id: addonId ? Number(addonId) : undefined,
        preparation_time: 0, serves_people: 1, serve_time: 0,
        ingredients: ingredients.filter(i => i.ingredient_id && Number(i.ingredient_qty) > 0).map(i => ({
          id: Number(i.ingredient_id), qty: Number(i.ingredient_qty), unit: i.ingredient_unit,
        })),
      };
      if (recipe) await api.updateAddonRecipe(recipe.id || recipe.recipe_id, payload);
      else await api.createAddonRecipe(payload);
      toast({ title: recipe ? "Addon recipe updated" : "Addon recipe created" });
      onSaved();
    } catch (e) { toast({ title: e?.response?.data?.message || "Failed to save", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteAddonRecipe(recipe.id || recipe.recipe_id);
      toast({ title: "Addon recipe deleted" }); onDeleted();
    } catch (e) { toast({ title: e?.response?.data?.message || "Failed to delete", variant: "destructive" }); }
    finally { setDeleting(false); setDeleteConfirm(false); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-4 px-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold">{isAddMode ? "New Addon Recipe" : name || "Edit"}</h2>
            <div className="flex gap-2">
              {isAddMode && <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onCancel}>Cancel</Button>}
              {recipe && <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive gap-1" onClick={() => setDeleteConfirm(true)} data-testid="delete-addon-recipe-btn"><Trash2 className="h-3 w-3" /> Delete</Button>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-[10px] text-muted-foreground">Linked Addon</Label>
              <Select value={addonId} onValueChange={(v) => { setAddonId(v); const a = addons.find(a => String(a.id) === v); if (a) setName(a.name || ""); }}>{/* BUG-047 — auto-fill name from addon */}
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select addon..." /></SelectTrigger>
                <SelectContent className="max-h-48">{addons.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-[10px] text-muted-foreground">Recipe Name</Label><Input value={name} onChange={e => setName(e.target.value)} className="h-8 text-xs" data-testid="addon-recipe-name" /></div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-[3px] border-l-emerald-400">
        <CardContent className="py-3 px-5">
          <h3 className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-2">Ingredients</h3>
          <div className="space-y-2">
            {ingredients.map((row, idx) => (
              <div key={idx} className="flex items-end gap-2" data-testid={`addon-ing-${idx}`}>
                <div className="flex-1">
                  <Select value={row.ingredient_id ? String(row.ingredient_id) : ""} onValueChange={v => updateRow(idx, "ingredient_id", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select ingredient">{row.ingredient_name || "Select"}</SelectValue></SelectTrigger>
                    <SelectContent className="max-h-48">{inventoryMaster.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.stock_title} ({m.unit})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="w-20"><Input type="number" value={row.ingredient_qty} onChange={e => updateRow(idx, "ingredient_qty", e.target.value)} className="h-8 text-xs" /></div>
                <div className="w-16"><Input value={row.ingredient_unit || "—"} className="h-8 text-xs bg-muted" readOnly /></div>
                {ingredients.length > 1 && <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => removeRow(idx)}><X className="h-3.5 w-3.5" /></Button>}
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" className="mt-2 text-xs gap-1" onClick={addRow} data-testid="addon-recipe-add-ingredient"><Plus className="h-3 w-3" /> Add Ingredient</Button>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving || !name.trim()} className="w-full h-9 text-xs" data-testid="save-addon-recipe-btn">
        {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
        {isAddMode ? "Create Addon Recipe" : "Save Changes"}
      </Button>

      {deleteConfirm && (
        <ConfirmActionDialog open={deleteConfirm} onOpenChange={v => !v && setDeleteConfirm(false)}
          title={`Delete "${name}"?`} description="This addon recipe will be permanently removed."
          confirmLabel="Delete" onConfirm={handleDelete} submitting={deleting} />
      )}
    </div>
  );
}
