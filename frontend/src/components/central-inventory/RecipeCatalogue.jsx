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
import { Switch } from "@/components/ui/switch";
import { friendlyCatalogError } from "@/lib/apiErrors"; // CR-043 — G-028/G-029
import { Search, Plus, Trash2, Loader2, BookOpen, ChevronDown, ChevronRight, X, IndianRupee, Info, Factory } from "lucide-react";

/**
 * RecipeCatalogue — CR-032 master-detail BOM editor
 * Embedded as tab in ProductCatalogue or standalone.
 */
export default function RecipeCatalogue({ embedded }) {
  const [recipes, setRecipes] = useState([]);
  const [subRecipes, setSubRecipes] = useState([]);
  const [inventoryMaster, setInventoryMaster] = useState([]);
  const [foods, setFoods] = useState([]);
  const [stockMap, setStockMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [isAddMode, setIsAddMode] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [rResp, srResp, imResp, fResp, siResp] = await Promise.allSettled([
        api.getRecipeList(), api.getSubRecipeList(), api.getInventoryMaster(),
        api.getFoodsList(), api.getStockInventory({ includeSegments: true }),
      ]);
      setRecipes(rResp.status === "fulfilled" ? (rResp.value.data || []) : []);
      setSubRecipes(srResp.status === "fulfilled" ? (srResp.value.data || []) : []);
      const master = imResp.status === "fulfilled" ? (imResp.value.data?.data || imResp.value.data || []) : [];
      setInventoryMaster(Array.isArray(master) ? master : []);
      setFoods(fResp.status === "fulfilled" ? (fResp.value.data || []) : []);
      const stocks = siResp.status === "fulfilled" ? (siResp.value.data?.current_stocks || []) : [];
      const map = {}; stocks.forEach(s => { map[s.id] = s; }); setStockMap(map);
    } catch (e) { setError(e?.message || "Failed to load"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Sub-recipe detection map: inventory_id → subRecipe
  const subRecipeMap = useMemo(() => {
    const map = {};
    subRecipes.forEach(sr => { if (sr.inventory_id) map[sr.inventory_id] = sr; });
    return map;
  }, [subRecipes]);

  const filtered = useMemo(() => {
    if (!search.trim()) return recipes;
    const q = search.toLowerCase();
    return recipes.filter(r => (r.name || r.food_name || "").toLowerCase().includes(q));
  }, [recipes, search]);

  const selectedRecipe = useMemo(() => recipes.find(r => r.id === selectedId || r.recipe_id === selectedId), [recipes, selectedId]);

  if (loading) return <LoadingState lines={4} />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div data-testid="recipe-catalogue" className={embedded ? "" : "space-y-4"}>
      {!embedded && (
        <div className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /><h1 className="text-lg font-bold">Recipes</h1></div>
      )}
      <div className="flex gap-4" style={{ minHeight: "450px" }}>
        {/* Left Panel */}
        <div className="w-[35%] shrink-0 space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search recipes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs" data-testid="search-recipes" />
          </div>
          <Button size="sm" className="w-full h-8 text-xs gap-1" onClick={() => { setIsAddMode(true); setSelectedId(null); }} data-testid="add-recipe-btn">
            <Plus className="h-3.5 w-3.5" /> Add Recipe
          </Button>
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
            {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No recipes found</p>}
            {filtered.map(r => {
              const rid = r.id || r.recipe_id;
              const isSelected = !isAddMode && String(rid) === String(selectedId);
              const ingCount = r.ingredients?.length || 0;
              const subCount = r.ingredients?.filter(i => !!subRecipeMap[i.ingredient_id]).length || 0;
              return (
                <div key={rid} data-testid={`recipe-card-${rid}`}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? "border-primary bg-accent/30 shadow-sm" : "border-border hover:border-primary/40"}`}
                  onClick={() => { setSelectedId(rid); setIsAddMode(false); }}>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold truncate flex-1">{r.name || r.food_name}</p>
                    {/* CR-044 — manufactured badge */}
                    {r.is_manufactured && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-50 text-amber-700 border-amber-200" data-testid={`recipe-manufactured-badge-${rid}`}>Manufactured</Badge>
                    )}
                    {/* CR-043 — pushed lock badge */}
                    {r.is_pushed_managed && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 bg-slate-100 text-slate-600 border-slate-300" data-testid={`pushed-lock-recipe-${rid}`}>Pushed</Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{ingCount - subCount} ingredients, {subCount} sub-recipe{subCount !== 1 ? "s" : ""}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 min-w-0">
          {!selectedRecipe && !isAddMode && (
            <div className="flex items-center justify-center h-full"><p className="text-sm text-muted-foreground">Select a recipe or add a new one</p></div>
          )}
          {(selectedRecipe || isAddMode) && (
            <RecipeDetail
              recipe={isAddMode ? null : selectedRecipe}
              foods={foods}
              inventoryMaster={inventoryMaster}
              subRecipeMap={subRecipeMap}
              stockMap={stockMap}
              onSaved={() => { load(); }}
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

function RecipeDetail({ recipe, foods, inventoryMaster, subRecipeMap, stockMap, onSaved, onDeleted, onCancel, isAddMode }) {
  const [name, setName] = useState("");
  const [foodId, setFoodId] = useState("");
  const [prepTime, setPrepTime] = useState("0");
  const [serves, setServes] = useState("1");
  const [outputQty, setOutputQty] = useState("1");
  const [outputUnit, setOutputUnit] = useState("piece");
  const [ingredients, setIngredients] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expandedSub, setExpandedSub] = useState({});
  const [detailData, setDetailData] = useState(null);
  // CR-044 — G-030 manufactured recipe (create-only in v1; update endpoint support unverified).
  const [isManufactured, setIsManufactured] = useState(false);
  const [mfgOutputQty, setMfgOutputQty] = useState("1");
  const [mfgOutputUnit, setMfgOutputUnit] = useState("batch");
  const [mfgConsumptionUnit, setMfgConsumptionUnit] = useState("piece");
  const [mfgConversionFactor, setMfgConversionFactor] = useState("10");
  const [lastMfgResult, setLastMfgResult] = useState(null); // {manufactured_sub_recipe_id, fg_inventory_master_id}

  useEffect(() => {
    if (recipe) {
      const rid = recipe.id || recipe.recipe_id;
      api.getRecipeDetail(rid).then(resp => {
        const d = resp.data;
        setDetailData(d);
        setName(d?.name || d?.food_name || recipe.name || "");
        setFoodId(String(d?.food_id || ""));
        setPrepTime(String(d?.preparation_time || d?.prepration_time || "0"));
        setServes(String(d?.serve_people || "1"));
        setOutputQty(String(d?.qty || "1"));
        setOutputUnit(d?.unit || "piece");
        // CR-044 — hydrate manufactured toggle from detail if present
        if (d?.is_manufactured) {
          setIsManufactured(true);
          const m = d.manufacturing || {};
          setMfgOutputQty(String(m.output_qty ?? d.qty ?? "1"));
          setMfgOutputUnit(m.output_unit || "batch");
          setMfgConsumptionUnit(m.consumption_unit || "piece");
          setMfgConversionFactor(String(m.converion_factor ?? "1"));
        } else {
          setIsManufactured(false);
        }
        setIngredients(
          (d?.ingredients || []).map(i => ({
            ingredient_id: String(i.ingredient_id),
            ingredient_qty: String(i.ingredient_qty),
            ingredient_unit: i.ingredient_unit || "",
            ingredient_name: i.ingredient_name || "",
          }))
        );
      }).catch(() => {});
    } else {
      setName(""); setFoodId(""); setPrepTime("0"); setServes("1"); setOutputQty("1"); setOutputUnit("piece");
      setIngredients([{ ingredient_id: "", ingredient_qty: "", ingredient_unit: "" }]);
      setDetailData(null);
    }
  }, [recipe]);

  // Split ingredients into sub-recipes vs direct
  const { subRecipeIngredients, directIngredients } = useMemo(() => {
    const subs = [], directs = [];
    ingredients.forEach((ing, idx) => {
      if (subRecipeMap[ing.ingredient_id]) subs.push({ ...ing, idx });
      else directs.push({ ...ing, idx });
    });
    return { subRecipeIngredients: subs, directIngredients: directs };
  }, [ingredients, subRecipeMap]);

  // Cost breakdown
  const costBreakdown = useMemo(() => {
    let subCost = 0, directCost = 0;
    ingredients.forEach(ing => {
      if (!ing.ingredient_id || !Number(ing.ingredient_qty)) return;
      const stock = stockMap[ing.ingredient_id];
      const unitCost = stock?.segments_preview?.[0]?.unit_cost || 0;
      const cost = Number(ing.ingredient_qty) * unitCost;
      if (subRecipeMap[ing.ingredient_id]) subCost += cost;
      else directCost += cost;
    });
    return { subCost, directCost, total: subCost + directCost };
  }, [ingredients, stockMap, subRecipeMap]);

  const resolveIngName = (id) => {
    const m = inventoryMaster.find(i => String(i.id) === String(id));
    return m?.stock_title || stockMap[id]?.stock_title || null;
  };

  const addIngredient = () => setIngredients([...ingredients, { ingredient_id: "", ingredient_qty: "", ingredient_unit: "" }]);
  const removeIngredient = (idx) => setIngredients(ingredients.filter((_, i) => i !== idx));
  const updateIngredient = (idx, field, value) => {
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
    if (!foodId) {
      toast({ title: "Please select a linked food item first", variant: "destructive" });
      return;
    }
    // CR-044 — validate manufacturing fields when toggle is ON
    if (isManufactured) {
      if (!Number(mfgOutputQty) || !mfgOutputUnit.trim() || !mfgConsumptionUnit.trim() || !Number(mfgConversionFactor)) {
        toast({ title: "Batch manufactured recipes need output qty/unit, consumption unit and conversion factor.", variant: "destructive" });
        return;
      }
    }
    setSaving(true);
    try {
      const validIngredients = ingredients
        .filter(i => i.ingredient_id && Number(i.ingredient_qty) > 0)
        .map(i => ({ id: Number(i.ingredient_id), qty: Number(i.ingredient_qty), unit: i.ingredient_unit }));

      const payload = {
        name: Number(foodId),
        food_name: name,
        food_id: Number(foodId),
        preparation_time: Number(prepTime),
        serves_people: Number(serves),
        serve_time: 0,
        qty: Number(outputQty),
        unit: outputUnit,
        ingredients: validIngredients,
      };
      // CR-044 — G-030 manufactured payload (API typo: converion_factor kept intentionally).
      if (isManufactured) {
        payload.is_manufactured = true;
        payload.manufacturing = {
          output_qty: Number(mfgOutputQty),
          output_unit: mfgOutputUnit.trim(),
          consumption_unit: mfgConsumptionUnit.trim(),
          converion_factor: Number(mfgConversionFactor),
        };
      }
      const resp = recipe
        ? await api.updateRecipe(recipe.id || recipe.recipe_id, payload)
        : await api.createRecipe(payload);
      const body = resp?.data || {};
      // CR-044 — surface auto-linked sub-recipe + FG inventory item ids
      if (isManufactured && (body.manufactured_sub_recipe_id || body.fg_inventory_master_id)) {
        setLastMfgResult({
          sub_recipe_id: body.manufactured_sub_recipe_id,
          fg_inventory_master_id: body.fg_inventory_master_id,
          recipe_id: body.recipe_id || body.id,
        });
      }
      toast({ title: recipe ? "Recipe updated" : (isManufactured ? "Manufactured recipe created" : "Recipe created") });
      onSaved();
    } catch (e) {
      // CR-043 — friendly mapping for pushed/policy 403s
      const friendly = friendlyCatalogError(e);
      toast({ title: friendly || e?.response?.data?.message || "Failed to save", variant: "destructive" });
    }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteRecipe(recipe.id || recipe.recipe_id);
      toast({ title: "Recipe deleted" });
      onDeleted();
    } catch (e) {
      const friendly = friendlyCatalogError(e); // CR-043
      toast({ title: friendly || e?.response?.data?.message || "Failed to delete", variant: "destructive" });
    }
    finally { setDeleting(false); setDeleteConfirm(false); }
  };

  return (
    <div className="space-y-4">
      {/* Form */}
      <Card>
        <CardContent className="py-4 px-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold">{isAddMode ? "New Recipe" : name || "Edit"}</h2>
            <div className="flex gap-2">
              {isAddMode && <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onCancel}>Cancel</Button>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-2">
            <div><Label className="text-[10px] text-muted-foreground">Linked Food</Label>
              {/* BUG-046 — add food selection dropdown in add mode */}
              {isAddMode ? (
                <Select value={foodId} onValueChange={(v) => { setFoodId(v); const f = foods.find(f => String(f.id) === v); setName(f?.name || f?.food_name || ""); }} data-testid="recipe-food-select">
                  <SelectTrigger className="h-8 text-xs" data-testid="recipe-food-trigger"><SelectValue placeholder="Select food..." /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {foods.map(f => <SelectItem key={f.id} value={String(f.id)}>{f.name || f.food_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <p className="h-8 text-xs flex items-center font-medium" data-testid="recipe-food-name">{name || "—"}</p>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label className="text-[10px] text-muted-foreground">Prep Time</Label><Input type="number" value={prepTime} onChange={e => setPrepTime(e.target.value)} className="h-8 text-xs" /></div>
              <div><Label className="text-[10px] text-muted-foreground">Output</Label><Input type="number" value={outputQty} onChange={e => setOutputQty(e.target.value)} className="h-8 text-xs" /></div>
              <div><Label className="text-[10px] text-muted-foreground">Unit</Label><Input value={outputUnit} onChange={e => setOutputUnit(e.target.value)} className="h-8 text-xs" /></div>
            </div>
          </div>
          {/* CR-044 — G-030 batch-manufactured toggle & fields */}
          <div className="mt-3 pt-3 border-t border-dashed">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Factory className="h-3.5 w-3.5 text-amber-600" />
                <Label className="text-xs font-medium">Batch manufactured recipe</Label>
                {isManufactured && <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200">ON</Badge>}
              </div>
              <Switch
                checked={isManufactured}
                onCheckedChange={(v) => { setIsManufactured(!!v); if (v) setLastMfgResult(null); }}
                data-testid="recipe-manufactured-toggle"
                disabled={!!recipe}
              />
            </div>
            {isManufactured && (
              <div className="grid grid-cols-4 gap-2" data-testid="recipe-mfg-fields">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Output Qty</Label>
                  <Input type="number" min="0" value={mfgOutputQty} onChange={e => setMfgOutputQty(e.target.value)} className="h-8 text-xs" data-testid="mfg-output-qty" />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Output Unit</Label>
                  <Input value={mfgOutputUnit} onChange={e => setMfgOutputUnit(e.target.value)} className="h-8 text-xs" placeholder="batch" data-testid="mfg-output-unit" />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Consumption Unit</Label>
                  <Input value={mfgConsumptionUnit} onChange={e => setMfgConsumptionUnit(e.target.value)} className="h-8 text-xs" placeholder="piece" data-testid="mfg-consumption-unit" />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Conversion Factor</Label>
                  <Input type="number" min="0" value={mfgConversionFactor} onChange={e => setMfgConversionFactor(e.target.value)} className="h-8 text-xs" data-testid="mfg-conversion-factor" />
                </div>
                <p className="col-span-4 text-[10px] text-muted-foreground pt-1">
                  Producing {Number(mfgOutputQty) || "?"} {mfgOutputUnit || "?"} yields {Number(mfgConversionFactor) || "?"} {mfgConsumptionUnit || "?"} of finished goods.
                </p>
                {!!recipe && (
                  <p className="col-span-4 text-[10px] text-amber-700">Manufactured toggle can only be set on new recipes (v1).</p>
                )}
              </div>
            )}
            {lastMfgResult && (
              <div className="mt-2 flex items-start gap-1.5 p-2 rounded border border-emerald-200 bg-emerald-50 text-emerald-800 text-[10px]" data-testid="mfg-result-panel">
                <Info className="h-3 w-3 mt-0.5 shrink-0" />
                <span>
                  Manufactured recipe wired up.
                  {lastMfgResult.sub_recipe_id != null && <> Sub-recipe #{lastMfgResult.sub_recipe_id}.</>}
                  {lastMfgResult.fg_inventory_master_id != null && <> FG stock item #{lastMfgResult.fg_inventory_master_id}.</>}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* BOM — Sub-Recipes (purple) */}
      {subRecipeIngredients.length > 0 && (
        <Card className="border-l-[3px] border-l-purple-400">
          <CardContent className="py-3 px-5">
            <h3 className="text-[10px] font-bold text-purple-700 uppercase tracking-wider mb-2">Sub-Recipes</h3>
            {subRecipeIngredients.map(ing => {
              const sr = subRecipeMap[ing.ingredient_id];
              const isOpen = expandedSub[ing.ingredient_id];
              return (
                <div key={ing.idx} className="mb-2">
                  <div className="flex items-center gap-2 p-2 rounded bg-purple-50/50 cursor-pointer" onClick={() => setExpandedSub(p => ({ ...p, [ing.ingredient_id]: !p[ing.ingredient_id] }))}>
                    {isOpen ? <ChevronDown className="h-3 w-3 text-purple-500" /> : <ChevronRight className="h-3 w-3 text-purple-500" />}
                    <span className="text-xs font-semibold text-purple-800">{sr?.name || resolveIngName(ing.ingredient_id) || `Item #${ing.ingredient_id}`}</span>
                    <span className="text-[10px] text-purple-500 ml-auto">{ing.ingredient_qty} {ing.ingredient_unit}</span>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={(e) => { e.stopPropagation(); removeIngredient(ing.idx); }}><X className="h-3 w-3" /></Button>
                  </div>
                  {isOpen && sr?.ingredients && (
                    <div className="ml-6 mt-1 space-y-0.5">
                      {sr.ingredients.map((ci, cidx) => (
                        <div key={cidx} className="flex items-center gap-2 text-[10px] text-purple-600 py-0.5 pl-2 border-l-2 border-purple-200">
                          <span>{ci.ingredient_name || resolveIngName(ci.ingredient_id) || `Item #${ci.ingredient_id}`}</span>
                          <span className="ml-auto tabular-nums">{ci.ingredient_qty} {ci.ingredient_unit}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* BOM — Direct Ingredients (green) */}
      <Card className="border-l-[3px] border-l-emerald-400">
        <CardContent className="py-3 px-5">
          <h3 className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-2">Direct Ingredients</h3>
          <div className="space-y-2">
            {directIngredients.map(ing => (
              <div key={ing.idx} className="flex items-end gap-2" data-testid={`recipe-ing-${ing.idx}`}>
                <div className="flex-1">
                  <Select value={ing.ingredient_id ? String(ing.ingredient_id) : ""} onValueChange={v => updateIngredient(ing.idx, "ingredient_id", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select ingredient">{ing.ingredient_name || resolveIngName(ing.ingredient_id) || "Select"}</SelectValue></SelectTrigger>
                    <SelectContent className="max-h-48">{inventoryMaster.filter(m => !ingredients.some((other, j) => j !== ing.idx && String(other.ingredient_id) === String(m.id))).map(m => <SelectItem key={m.id} value={String(m.id)}>{m.stock_title} ({m.unit})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="w-20"><Input type="number" value={ing.ingredient_qty} onChange={e => updateIngredient(ing.idx, "ingredient_qty", e.target.value)} className="h-8 text-xs" /></div>
                <div className="w-16"><Input value={ing.ingredient_unit || "—"} className="h-8 text-xs bg-muted" readOnly /></div>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => removeIngredient(ing.idx)}><X className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
            {directIngredients.length === 0 && ingredients.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">No ingredients added yet.</p>
            )}
          </div>
          <Button variant="outline" size="sm" className="mt-2 text-xs gap-1" onClick={addIngredient} data-testid="recipe-add-ingredient">
            <Plus className="h-3 w-3" /> Add Ingredient
          </Button>
        </CardContent>
      </Card>

      {/* Cost Breakdown */}
      {costBreakdown.total > 0 && (
        <Card className="border-l-[3px] border-l-blue-400">
          <CardContent className="py-3 px-5">
            <h3 className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-2">Cost Breakdown</h3>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div><span className="text-[10px] text-muted-foreground block">Sub-Recipe Cost</span><span className="font-bold tabular-nums">₹{costBreakdown.subCost.toFixed(2)}</span></div>
              <div><span className="text-[10px] text-muted-foreground block">Direct Ingredients</span><span className="font-bold tabular-nums">₹{costBreakdown.directCost.toFixed(2)}</span></div>
              <div><span className="text-[10px] text-muted-foreground block">Total</span><span className="font-bold tabular-nums text-blue-700">₹{costBreakdown.total.toFixed(2)}/{outputUnit}</span></div>
            </div>
          </CardContent>
        </Card>
      )}

      <Button onClick={handleSave} disabled={saving || !name.trim() || !foodId} className="w-full h-9 text-xs" data-testid="save-recipe-btn">
        {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
        {isAddMode ? "Create Recipe" : "Save Changes"}
      </Button>

      {deleteConfirm && (
        <ConfirmActionDialog open={deleteConfirm} onOpenChange={v => !v && setDeleteConfirm(false)}
          title={`Delete "${name}"?`}
          description="This will remove the recipe. The food item will remain but won't have a recipe linked."
          confirmLabel="Delete Recipe" onConfirm={handleDelete} submitting={deleting} />
      )}
    </div>
  );
}
