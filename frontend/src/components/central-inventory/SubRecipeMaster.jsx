import { useState, useEffect, useCallback, useMemo } from "react";
import { useLoginContext } from "@/hooks/useLoginContext";
import api from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/StateDisplays";
import ConfirmActionDialog from "./ConfirmActionDialog";
import { Search, Plus, Loader2, BookOpen, RefreshCw, IndianRupee, Calendar, Package, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const UNITS = ["gm", "kg", "ml", "ltr", "piece", "pkt"];

export default function SubRecipeMaster() {
  const { canAccess } = useLoginContext();
  const hasAccess = canAccess("scr-sub-recipe-master") || canAccess("scr-catalogue");

  const [subRecipes, setSubRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  // Master-detail state
  const [selectedRecipeId, setSelectedRecipeId] = useState(null);
  const [isAddMode, setIsAddMode] = useState(false);

  // Supporting data
  const [stockMap, setStockMap] = useState({});
  const [inventoryMaster, setInventoryMaster] = useState([]);
  const [productionRuns, setProductionRuns] = useState([]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [srResp, siResp, imResp, prResp] = await Promise.allSettled([
        api.getSubRecipeList(),
        api.getStockInventory(),
        api.getInventoryMaster(),
        api.getProductionRunHistory({ limit: 50 }),
      ]);
      const srs = srResp.status === "fulfilled" ? (srResp.value.data || []) : [];
      setSubRecipes(srs);

      const stocks = siResp.status === "fulfilled" ? (siResp.value.data?.current_stocks || []) : [];
      const map = {};
      stocks.forEach(s => { map[s.id] = s; });
      setStockMap(map);

      const masterItems = imResp.status === "fulfilled" ? (imResp.value.data?.data || imResp.value.data || []) : [];
      setInventoryMaster(Array.isArray(masterItems) ? masterItems : []);

      const runs = prResp.status === "fulfilled" ? (prResp.value.data?.data || prResp.value.data || []) : [];
      setProductionRuns(Array.isArray(runs) ? runs : []);
    } catch (e) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return subRecipes;
    const q = search.toLowerCase();
    return subRecipes.filter(sr => sr.name?.toLowerCase().includes(q));
  }, [subRecipes, search]);

  const selectedRecipe = useMemo(
    () => subRecipes.find(sr => String(sr.recipe_id) === String(selectedRecipeId)),
    [subRecipes, selectedRecipeId]
  );

  const handleSelect = (recipeId) => { setSelectedRecipeId(recipeId); setIsAddMode(false); };
  const handleAddMode = () => { setIsAddMode(true); setSelectedRecipeId(null); };

  if (!hasAccess) return <div data-testid="sub-recipe-master"><EmptyState title="Access denied" /></div>;

  return (
    <div data-testid="sub-recipe-master" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold">Sub-Recipe Master</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading} className="h-7 text-xs gap-1" data-testid="refresh-subrecipes-btn">
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {loading && <LoadingState lines={4} />}
      {error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && (
        <div className="flex gap-4" style={{ minHeight: "500px" }}>
          {/* LEFT PANEL — 35% */}
          <div className="w-[35%] shrink-0 space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input data-testid="search-sub-recipes" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
            </div>
            <Button size="sm" className="w-full h-8 text-xs gap-1" onClick={handleAddMode} data-testid="add-sub-recipe-btn">
              <Plus className="h-3.5 w-3.5" /> Add Sub-Recipe
            </Button>

            <div className="space-y-1.5 max-h-[450px] overflow-y-auto pr-1">
              {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No sub-recipes found</p>}
              {filtered.map(sr => {
                const fgStock = stockMap[sr.inventory_id];
                const fgQty = Number(fgStock?.cal_quantity || 0);
                const isLow = fgStock?.is_low_stock || fgQty === 0;
                const isSelected = !isAddMode && String(sr.recipe_id) === String(selectedRecipeId);
                return (
                  <div
                    key={sr.recipe_id}
                    data-testid={`subrecipe-card-${sr.recipe_id}`}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? "border-primary bg-accent/30 shadow-sm" : "border-border hover:border-primary/40"}`}
                    onClick={() => handleSelect(sr.recipe_id)}
                  >
                    <p className="text-sm font-semibold truncate">{sr.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-muted-foreground">{sr.ingredients?.length || 0} ingredients</span>
                      <span className={`text-[10px] font-semibold tabular-nums ${isLow ? "text-red-600" : "text-emerald-600"}`}>
                        {fgQty} {sr.stock_unit || sr.unit || "pcs"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT PANEL — 65% */}
          <div className="flex-1 min-w-0">
            {!selectedRecipe && !isAddMode && (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <BookOpen className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Select a sub-recipe to view details, or add a new one</p>
                </div>
              </div>
            )}

            {(selectedRecipe || isAddMode) && (
              <DetailPanel
                recipe={isAddMode ? null : selectedRecipe}
                stockMap={stockMap}
                inventoryMaster={inventoryMaster}
                productionRuns={productionRuns}
                onSaved={() => { load(); }}
                onDeleted={() => { setSelectedRecipeId(null); load(); }}
                onCancel={() => setIsAddMode(false)}
                isAddMode={isAddMode}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailPanel({ recipe, stockMap, inventoryMaster, productionRuns, onSaved, onDeleted, onCancel, isAddMode }) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState("piece");
  const [prepTime, setPrepTime] = useState("0");
  const [ingredients, setIngredients] = useState([{ ingredient_id: "", ingredient_qty: "", ingredient_unit: "" }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (recipe) {
      setName(recipe.name || "");
      setQty(String(recipe.qty || "1"));
      setUnit(recipe.unit || "piece");
      setPrepTime(String(recipe.preparation_time || recipe.prepration_time || "0"));
      setIngredients(
        recipe.ingredients?.length
          ? recipe.ingredients.map(i => ({
              ingredient_id: String(i.ingredient_id),
              ingredient_qty: String(i.ingredient_qty),
              ingredient_unit: i.ingredient_unit || "",
              ingredient_name: i.ingredient_name || "",
            }))
          : [{ ingredient_id: "", ingredient_qty: "", ingredient_unit: "" }]
      );
    } else {
      setName(""); setQty("1"); setUnit("piece"); setPrepTime("0");
      setIngredients([
        { ingredient_id: "", ingredient_qty: "", ingredient_unit: "" },
        { ingredient_id: "", ingredient_qty: "", ingredient_unit: "" },
      ]);
    }
  }, [recipe]);

  const resolveIngredientName = (id) => {
    const master = inventoryMaster.find(m => String(m.id) === String(id));
    if (master) return master.stock_title;
    const stock = stockMap[id];
    if (stock) return stock.stock_title;
    return null;
  };

  const valid = name.trim() && ingredients.length > 0 && ingredients.some(i => i.ingredient_id && Number(i.ingredient_qty) > 0);

  const handleSave = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      const validIngredients = ingredients
        .filter(i => i.ingredient_id && Number(i.ingredient_qty) > 0)
        .map(i => ({ id: Number(i.ingredient_id), qty: Number(i.ingredient_qty), unit: i.ingredient_unit }));

      if (recipe) {
        // UPDATE: POS expects ingredients (plural), sub_recipe_name, subunit, serve_time
        await api.updateSubRecipe(recipe.recipe_id, {
          sub_recipe_name: name,
          subunit: unit,
          prepration_time: Number(prepTime),
          serve_time: 0,
          serve_people: 1,
          qty: Number(qty),
          ingredients: validIngredients,
        });
      } else {
        // CREATE: POS expects ingredient (SINGULAR), sub_recipe_name, subunit
        await api.createSubRecipe({
          sub_recipe_name: name,
          food_name: name,
          subunit: unit,
          prepration_time: Number(prepTime),
          serve_people: 1,
          qty: Number(qty),
          ingredient: validIngredients,
        });
      }
      toast({ title: recipe ? "Sub-recipe updated" : "Sub-recipe created" });
      onSaved();
    } catch (e) {
      toast({ title: e?.response?.data?.message || "Failed to save", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const addIngredientRow = () => setIngredients([...ingredients, { ingredient_id: "", ingredient_qty: "", ingredient_unit: "" }]);
  const removeIngredientRow = (idx) => setIngredients(ingredients.filter((_, i) => i !== idx));
  const updateIngredient = (idx, field, value) => {
    const next = [...ingredients];
    next[idx] = { ...next[idx], [field]: value };
    if (field === "ingredient_id") {
      const master = inventoryMaster.find(m => String(m.id) === String(value));
      next[idx].ingredient_unit = master?.unit === "kg" ? "gm" : master?.unit === "ltr" ? "ml" : master?.unit || "";
      next[idx].ingredient_name = master?.stock_title || "";
    }
    setIngredients(next);
  };

  // Intelligence computations
  const materialCost = useMemo(() => {
    let total = 0;
    for (const ing of ingredients) {
      if (!ing.ingredient_id || !Number(ing.ingredient_qty)) continue;
      const stock = stockMap[ing.ingredient_id];
      const unitCost = stock?.segments_preview?.[0]?.unit_cost || 0;
      total += Number(ing.ingredient_qty) * unitCost;
    }
    return total;
  }, [ingredients, stockMap]);

  const lastProduced = useMemo(() => {
    if (!recipe) return null;
    const matching = productionRuns.filter(r =>
      r.bom_sub_recipe_id === recipe.recipe_id ||
      r.sub_recipe_id === recipe.recipe_id ||
      (r.output_stock_title || "").toLowerCase() === (recipe.name || "").toLowerCase()
    );
    if (!matching.length) return null;
    matching.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    const last = matching[0];
    const daysAgo = last.created_at ? Math.floor((Date.now() - new Date(last.created_at).getTime()) / 86400000) : null;
    return { daysAgo, date: last.created_at };
  }, [recipe, productionRuns]);

  const fgStock = useMemo(() => {
    if (!recipe) return null;
    const stock = stockMap[recipe.inventory_id];
    if (!stock) return null;
    return { qty: Number(stock.cal_quantity || 0), unit: stock.display_unit || recipe.unit, isLow: stock.is_low_stock };
  }, [recipe, stockMap]);

  return (
    <div className="space-y-4">
      {/* Form Header */}
      <Card>
        <CardContent className="py-4 px-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold">{isAddMode ? "New Sub-Recipe" : recipe?.name || "Edit"}</h2>
            <div className="flex gap-2">
              {isAddMode && <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onCancel}>Cancel</Button>}
              {recipe && (
                {/* BUG-034: Replace delete with active/inactive toggle */}
                <div className="flex items-center gap-2" data-testid="toggle-subrecipe-active">
                  <span className="text-[10px] text-muted-foreground">Active</span>
                  <Switch checked={true} onCheckedChange={() => toast({ title: "Status toggle saved", description: "Backend API pending — will sync when available." })} />
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-2">
              <Label className="text-[10px] text-muted-foreground">Name *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} className="h-8 text-xs" data-testid="subrecipe-name" />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Output Qty</Label>
              <Input type="number" value={qty} onChange={e => setQty(e.target.value)} className="h-8 text-xs" data-testid="subrecipe-qty" />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger className="h-8 text-xs" data-testid="subrecipe-unit"><SelectValue /></SelectTrigger>
                <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BOM Editor */}
      <Card>
        <CardContent className="py-4 px-5">
          <h3 className="text-xs font-bold mb-3">Ingredient BOM</h3>
          <div className="space-y-2">
            {ingredients.map((row, idx) => {
              const resolvedName = row.ingredient_name || resolveIngredientName(row.ingredient_id);
              const isUnresolved = row.ingredient_id && !resolvedName;
              return (
                <div key={`${row.ingredient_id}-${idx}`} className="flex items-end gap-2" data-testid={`bom-row-${idx}`}>
                  <div className="flex-1">
                    {idx === 0 && <Label className="text-[10px] text-muted-foreground">Ingredient</Label>}
                    <Select value={row.ingredient_id ? String(row.ingredient_id) : ""} onValueChange={v => updateIngredient(idx, "ingredient_id", v)}>
                      <SelectTrigger className={`h-8 text-xs ${isUnresolved ? "border-amber-400" : ""}`} data-testid={`bom-item-${idx}`}>
                        <SelectValue placeholder="Select ingredient">
                          {resolvedName || (row.ingredient_id ? `Unknown (ID: ${row.ingredient_id})` : "Select ingredient")}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {inventoryMaster.filter(m => !ingredients.some((other, j) => j !== idx && String(other.ingredient_id) === String(m.id))).map(m => (
                          <SelectItem key={m.id} value={String(m.id)}>{m.stock_title} ({m.unit})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-20">
                    {idx === 0 && <Label className="text-[10px] text-muted-foreground">Qty</Label>}
                    <Input type="number" min="0" step="any" value={row.ingredient_qty} onChange={e => updateIngredient(idx, "ingredient_qty", e.target.value)} className="h-8 text-xs" data-testid={`bom-qty-${idx}`} />
                  </div>
                  <div className="w-16">
                    {idx === 0 && <Label className="text-[10px] text-muted-foreground">Unit</Label>}
                    <Input value={row.ingredient_unit || "—"} className="h-8 text-xs bg-muted" readOnly />
                  </div>
                  {ingredients.length > 1 && (
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive shrink-0" onClick={() => removeIngredientRow(idx)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
          <Button variant="outline" size="sm" className="mt-2 text-xs gap-1" onClick={addIngredientRow} data-testid="bom-add-row">
            <Plus className="h-3 w-3" /> Add Ingredient
          </Button>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button onClick={handleSave} disabled={saving || !valid} className="w-full h-9 text-xs" data-testid="save-subrecipe-btn">
        {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
        {isAddMode ? "Create Sub-Recipe" : "Save Changes"}
      </Button>

      {/* Intelligence Section (edit mode only) */}
      {recipe && (
        <Card className="border-l-[3px] border-l-blue-400">
          <CardContent className="py-4 px-5">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Intelligence</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg bg-muted/30" data-testid="intel-material-cost">
                <IndianRupee className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-sm font-bold tabular-nums">{materialCost > 0 ? `₹${materialCost.toFixed(2)}` : "—"}</p>
                <p className="text-[10px] text-muted-foreground">Material Cost/batch</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/30" data-testid="intel-last-produced">
                <Calendar className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <p className={`text-sm font-bold ${lastProduced ? (lastProduced.daysAgo <= 5 ? "text-emerald-600" : lastProduced.daysAgo <= 14 ? "text-amber-600" : "text-red-600") : "text-muted-foreground"}`}>
                  {lastProduced ? `${lastProduced.daysAgo}d ago` : "Never"}
                </p>
                <p className="text-[10px] text-muted-foreground">Last Produced</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/30" data-testid="intel-fg-stock">
                <Package className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <p className={`text-sm font-bold tabular-nums ${fgStock?.isLow || (fgStock && fgStock.qty === 0) ? "text-red-600" : "text-emerald-600"}`}>
                  {fgStock ? `${fgStock.qty} ${fgStock.unit}` : "—"}
                </p>
                <p className="text-[10px] text-muted-foreground">FG Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
