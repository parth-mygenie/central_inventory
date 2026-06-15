import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLoginContext } from "@/hooks/useLoginContext";
import { useProductionRun } from "@/hooks/useProductionRun";
import { normalizeToDisplayUnit } from "@/lib/formatters"; // BUG-036
import api from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Factory,
  ShieldX,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCcw,
  Eye,
  Package,
  Truck,
  BarChart3,
  IndianRupee,
  Search,
} from "lucide-react";
import { LoadingState, ErrorState } from "@/components/common/StateDisplays";

/**
 * P28 Production Run Form — Phase 3 Intelligence + Phase 2c Cost Estimation
 */
export default function ProductionRunForm() {
  const navigate = useNavigate();
  const { isTopLevel, isMiddleLevel } = useLoginContext();
  const {
    subRecipes, stockMap, productionEnabled, allowNegativeStock,
    consumptionMap, hierarchyStores,
    ingredientSegments, fetchIngredientSegments,
    loading, error, refresh,
  } = useProductionRun();

  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [multiplier, setMultiplier] = useState("");
  const [batchLabel, setBatchLabel] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [result, setResult] = useState(null);
  const [recipeSearch, setRecipeSearch] = useState("");

  // P3-3: Sort sub-recipes by demand (lowest FG stock first)
  const sortedRecipes = useMemo(() => {
    return [...subRecipes].sort((a, b) => {
      const stockA = Number(stockMap[a.inventory_id]?.cal_quantity) || 0;
      const stockB = Number(stockMap[b.inventory_id]?.cal_quantity) || 0;
      return stockA - stockB;
    });
  }, [subRecipes, stockMap]);

  const filteredRecipes = useMemo(() => {
    if (!recipeSearch.trim()) return sortedRecipes;
    const q = recipeSearch.toLowerCase();
    return sortedRecipes.filter(sr => sr.name?.toLowerCase().includes(q));
  }, [sortedRecipes, recipeSearch]);

  const selectedRecipe = useMemo(
    () => subRecipes.find((r) => String(r.recipe_id) === String(selectedRecipeId)),
    [subRecipes, selectedRecipeId]
  );

  const baseQty = selectedRecipe?.qty || 0;
  const unit = selectedRecipe?.unit || "piece";
  const mult = Number(multiplier) || 0;
  const totalQty = baseQty * mult;

  // Phase 2c: Fetch ingredient segments when recipe is selected
  useEffect(() => {
    if (selectedRecipe?.ingredients) {
      const ids = selectedRecipe.ingredients.map((ing) => ing.ingredient_id).filter(Boolean);
      if (ids.length > 0) fetchIngredientSegments(ids);
    }
  }, [selectedRecipe, fetchIngredientSegments]);

  // Ingredient rows with P3-4 health + Phase 2c cost
  const ingredientRows = useMemo(() => {
    if (!selectedRecipe?.ingredients) return [];
    return selectedRecipe.ingredients.map((ing) => {
      const needed = (Number(ing.ingredient_qty) || 0) * mult;
      const stock = stockMap[ing.ingredient_id];
      const available = stock ? Number(stock.cal_quantity) || 0 : 0;
      const displayAvailable = stock ? `${stock.display_qty} ${stock.display_unit}` : "—";
      const sufficient = available >= needed || needed === 0;
      const minQty = Number(stock?.min_qty_alert) || 0;
      const healthPct = minQty > 0 ? Math.min(100, Math.round((available / minQty) * 100)) : (available > 0 ? 100 : 0);

      // Phase 2c: FEFO cost estimation from segment data
      const segments = ingredientSegments[ing.ingredient_id] || [];
      let estimatedCost = null;
      if (segments.length > 0 && needed > 0) {
        let remaining = needed;
        let cost = 0;
        for (const seg of segments) {
          if (remaining <= 0) break;
          const segQty = Number(seg.cal_quantity) || 0;
          const segCost = Number(seg.unit_cost) || 0;
          const alloc = Math.min(remaining, segQty);
          cost += alloc * segCost;
          remaining -= alloc;
        }
        estimatedCost = cost;
      }

      return {
        id: ing.ingredient_id,
        name: ing.ingredient_name || `Item #${ing.ingredient_id}`,
        unit: ing.ingredient_unit || "",
        needed,
        available,
        displayAvailable,
        sufficient,
        healthPct,
        estimatedCost,
        hasSegments: segments.length > 0,
      };
    });
  }, [selectedRecipe, mult, stockMap, ingredientSegments]);

  const insufficientCount = ingredientRows.filter((r) => !r.sufficient && r.needed > 0).length;
  const hasInsufficient = insufficientCount > 0;
  const canSubmit =
    selectedRecipe && mult > 0 && batchLabel.trim() && expiryDate &&
    !submitting && !(hasInsufficient && !allowNegativeStock);

  // Phase 2c: Total estimated cost
  const totalEstimatedCost = useMemo(() => {
    const costs = ingredientRows.filter((r) => r.estimatedCost != null).map((r) => r.estimatedCost);
    if (costs.length === 0) return null;
    return costs.reduce((sum, c) => sum + c, 0);
  }, [ingredientRows]);

  const estimatedUnitCost = totalEstimatedCost != null && totalQty > 0
    ? totalEstimatedCost / totalQty
    : null;

  // P3-5: Coverage estimate
  const coverageEstimate = useMemo(() => {
    if (!selectedRecipe || totalQty <= 0) return null;
    const fgId = selectedRecipe.inventory_id;
    // BUG-036: consumptionMap now stores { dailyQty, unit } objects
    const cEntry = consumptionMap[fgId];
    if (!cEntry || !cEntry.dailyQty || cEntry.dailyQty <= 0) return null;
    const currentStock = Number(stockMap[fgId]?.cal_quantity) || 0;
    // Normalize consumption to cal_quantity scale for consistent division
    const dailyInCalScale = normalizeToDisplayUnit(cEntry.dailyQty, cEntry.unit, "gm");
    const coverageDays = Math.round((currentStock + totalQty) / dailyInCalScale);
    const outletCount = hierarchyStores.length || 0;
    return { coverageDays, dailyConsumption: Math.round(dailyInCalScale), currentStock, outletCount };
  }, [selectedRecipe, totalQty, consumptionMap, stockMap, hierarchyStores]);

  const handleRecipeSelect = (id) => {
    setSelectedRecipeId(id);
    setResult(null);
    setSubmitError(null);
    const recipe = subRecipes.find((r) => String(r.recipe_id) === String(id));
    if (recipe) {
      const short = recipe.name?.split(" ").slice(0, 2).join("-").toUpperCase().replace(/[^A-Z0-9-]/g, "") || "BATCH";
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      setBatchLabel(`${short}-${date}-001`);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const resp = await api.runProduction({
        subRecipeId: selectedRecipe.recipe_id,
        quantity: totalQty,
        unit,
        batch: batchLabel.trim(),
        expiryDate,
      });
      setResult(resp.data?.data || resp.data);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.response?.data?.errors?.[0]?.message || e.message || "Production run failed";
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedRecipeId("");
    setMultiplier("");
    setBatchLabel("");
    setExpiryDate("");
    setResult(null);
    setSubmitError(null);
    refresh();
  };

  // ── Role gate ──
  if (!isTopLevel && !isMiddleLevel) {
    return (
      <div data-testid="production-role-blocked" className="flex flex-col items-center justify-center py-16 text-center">
        <ShieldX className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">Production Not Available</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Production runs are only available for Central and Master stores.</p>
      </div>
    );
  }

  if (loading) return <LoadingState lines={4} />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;

  if (!productionEnabled) {
    return (
      <div data-testid="production-blocked" className="flex flex-col items-center justify-center py-16 text-center">
        <ShieldX className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">Production Not Enabled</p>
        <p className="text-xs text-muted-foreground/70 mt-1 max-w-sm">
          Contact your administrator to enable production in Operational Settings.
        </p>
      </div>
    );
  }

  // ── Post-production confirmation with NBA ──
  if (result) {
    return (
      <PostProductionConfirmation
        result={result}
        selectedRecipe={selectedRecipe}
        totalQty={totalQty}
        unit={unit}
        hierarchyStores={hierarchyStores}
        stockMap={stockMap}
        onReset={handleReset}
        navigate={navigate}
      />
    );
  }

  // ── Master-Detail Production Run Form ──
  return (
    <div data-testid="production-run-form" className="py-4 px-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Factory className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold">Run Production</h1>
          <p className="text-xs text-muted-foreground">Select a sub-recipe, specify batch details, and execute.</p>
        </div>
      </div>

      <div className="flex gap-0 border rounded-lg overflow-hidden" style={{ minHeight: "550px" }}>
        {/* ═══ LEFT PANEL — Recipe List (30%) ═══ */}
        <div className="w-[280px] shrink-0 border-r bg-background p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Sub-Recipes <span className="font-normal">({sortedRecipes.length})</span>
            </span>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input data-testid="recipe-search" placeholder="Search..." value={recipeSearch} onChange={e => setRecipeSearch(e.target.value)} className="pl-8 h-8 text-xs" />
          </div>
          <div data-testid="sub-recipe-selector" className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
            {filteredRecipes.length === 0 && (
              <p className="text-xs text-muted-foreground py-4 text-center">No sub-recipes found</p>
            )}
            {filteredRecipes.map((sr) => {
              const fgStock = Number(stockMap[sr.inventory_id]?.cal_quantity) || 0;
              const isLow = stockMap[sr.inventory_id]?.is_low_stock;
              const isSelected = String(sr.recipe_id) === String(selectedRecipeId);
              return (
                <div
                  key={sr.recipe_id}
                  data-testid={`recipe-option-${sr.recipe_id}`}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected ? "border-primary bg-accent/30 shadow-sm" : "border-border hover:border-primary/40"
                  } ${fgStock <= 0 ? "border-l-[3px] border-l-red-400" : isLow ? "border-l-[3px] border-l-amber-400" : ""}`}
                  onClick={() => handleRecipeSelect(String(sr.recipe_id))}
                >
                  <p className="text-sm font-semibold truncate">{sr.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{sr.qty} {sr.unit}/batch · {sr.ingredients?.length || 0} ing</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      fgStock <= 0 ? "bg-red-100 text-red-700" : isLow ? "bg-amber-100 text-amber-700" : "bg-emerald-50 text-emerald-700"
                    }`}>{fgStock <= 0 ? "No stock" : isLow ? "Low" : "OK"}</span>
                    <span className={`text-base font-bold tabular-nums font-mono ${
                      fgStock <= 0 ? "text-red-600" : isLow ? "text-amber-600" : "text-emerald-600"
                    }`}>{fgStock}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ RIGHT PANEL — Form + BOM + Confirm (70%) ═══ */}
        <div className="flex-1 p-5 overflow-y-auto bg-muted/20">
          {!selectedRecipe ? (
            <div className="flex flex-col items-center justify-center h-full text-center" data-testid="production-empty-state">
              <Factory className="h-10 w-10 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">Select a sub-recipe to start a production run</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">Recipes sorted by demand — lowest FG stock first</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Recipe header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold">{selectedRecipe.name}</h2>
                  <p className="text-xs text-muted-foreground">{selectedRecipe.qty} {unit} per batch · {selectedRecipe.ingredients?.length || 0} ingredients</p>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold tabular-nums font-mono ${
                    (Number(stockMap[selectedRecipe.inventory_id]?.cal_quantity) || 0) <= 0 ? "text-red-600"
                    : stockMap[selectedRecipe.inventory_id]?.is_low_stock ? "text-amber-600" : "text-emerald-600"
                  }`}>{Number(stockMap[selectedRecipe.inventory_id]?.cal_quantity) || 0}</p>
                  <p className="text-[9px] text-muted-foreground uppercase">FG Stock</p>
                </div>
              </div>

              {/* Batch Details */}
              <Card>
                <CardContent className="py-4 px-4 space-y-3">
                  <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Batch Details</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="multiplier" className="text-xs font-medium">Batches (multiplier)</Label>
                      <Input data-testid="production-multiplier" id="multiplier" type="number" min="1" step="1" placeholder="e.g. 30" value={multiplier} onChange={(e) => setMultiplier(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Total Output</Label>
                      <div data-testid="production-total-qty" className="h-9 px-3 flex items-center rounded-md border bg-muted text-sm font-mono tabular-nums">
                        {mult > 0 ? `${totalQty} ${unit}` : "—"}
                      </div>
                      {mult > 0 && <p className="text-[10px] text-muted-foreground">{baseQty} {unit} × {mult} batches</p>}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="batch-label" className="text-xs font-medium">Batch Label</Label>
                      <Input data-testid="production-batch-label" id="batch-label" placeholder="e.g. ELACHI-20260613-001" value={batchLabel} onChange={(e) => setBatchLabel(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="expiry-date" className="text-xs font-medium">Expiry Date</Label>
                      <Input data-testid="production-expiry-date" id="expiry-date" type="date" min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)} value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Coverage estimate */}
              {coverageEstimate && (
                <div data-testid="coverage-estimate" className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <BarChart3 className="h-5 w-5 text-blue-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      {totalQty} {selectedRecipe?.name} covers <strong>~{coverageEstimate.coverageDays} days</strong>
                      {coverageEstimate.outletCount > 0 ? ` across ${coverageEstimate.outletCount} stores` : ""}
                    </p>
                    <p className="text-[10px] text-blue-700/70">
                      Based on avg daily consumption of {coverageEstimate.dailyConsumption} {unit}/day. Current FG stock: {coverageEstimate.currentStock} {unit}.
                    </p>
                  </div>
                </div>
              )}

              {/* Ingredient BOM table */}
              {mult > 0 && ingredientRows.length > 0 && (
                <div data-testid="pre-production-preview" className="space-y-2">
                  <Card>
                    <CardContent className="py-0 px-0">
                      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-4 pt-3 pb-2">Ingredient Requirements</h3>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b text-muted-foreground">
                            <th className="text-left py-2 px-3 font-medium">Ingredient</th>
                            <th className="text-center py-2 px-3 font-medium">Health</th>
                            <th className="text-right py-2 px-3 font-medium">Required</th>
                            <th className="text-right py-2 px-3 font-medium">Available</th>
                            <th className="text-right py-2 px-3 font-medium">Est. Cost</th>
                            <th className="text-center py-2 px-3 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ingredientRows.map((row) => (
                            <tr
                              key={row.id}
                              data-testid={row.sufficient ? `ingredient-sufficient-${row.id}` : `ingredient-insufficient-${row.id}`}
                              className={`border-b last:border-0 ${!row.sufficient && row.needed > 0 ? allowNegativeStock ? "bg-amber-50/50" : "bg-red-50/50" : ""}`}
                            >
                              <td className="py-2 px-3 font-medium">{row.name}</td>
                              <td className="py-2 px-3">
                                <div data-testid={`ingredient-health-strip-${row.id}`} className="flex items-center gap-1.5 justify-center">
                                  <div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${row.healthPct > 50 ? "bg-emerald-500" : row.healthPct > 20 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${row.healthPct}%` }} />
                                  </div>
                                  <span className={`text-[9px] tabular-nums ${row.healthPct > 50 ? "text-emerald-600" : row.healthPct > 20 ? "text-amber-600" : "text-red-600"}`}>{row.healthPct}%</span>
                                </div>
                              </td>
                              <td className="py-2 px-3 text-right tabular-nums">{row.needed.toFixed(1)} {row.unit}</td>
                              <td className="py-2 px-3 text-right tabular-nums">{row.displayAvailable}</td>
                              <td className="py-2 px-3 text-right tabular-nums font-mono">
                                {row.estimatedCost != null ? `₹${row.estimatedCost.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : <span className="text-muted-foreground">—</span>}
                              </td>
                              <td className="py-2 px-3 text-center">
                                {row.needed === 0 ? <span className="text-muted-foreground">—</span> : row.sufficient ? <CheckCircle2 className="h-4 w-4 text-emerald-600 inline" /> : <XCircle className={`h-4 w-4 inline ${allowNegativeStock ? "text-amber-500" : "text-red-500"}`} />}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>

                  {/* Cost summary */}
                  {totalEstimatedCost != null && (
                    <div data-testid="estimated-cost-summary" className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                      <div className="flex items-center gap-2">
                        <IndianRupee className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">Estimated Material Cost</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold font-mono tabular-nums">₹{totalEstimatedCost.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        {estimatedUnitCost != null && <span className="text-[10px] text-muted-foreground ml-2">(₹{estimatedUnitCost.toFixed(2)}/{unit})</span>}
                      </div>
                    </div>
                  )}

                  {hasInsufficient && !allowNegativeStock && (
                    <div data-testid="negative-stock-blocked" className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                      <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>Cannot proceed — negative stock is not allowed and {insufficientCount} ingredient{insufficientCount > 1 ? "s are" : " is"} insufficient.</span>
                    </div>
                  )}
                  {hasInsufficient && allowNegativeStock && (
                    <div data-testid="negative-stock-warning" className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>Warning: {insufficientCount} ingredient{insufficientCount > 1 ? "s have" : " has"} insufficient stock. Production will result in negative inventory.</span>
                    </div>
                  )}
                </div>
              )}

              {submitError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                  <XCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{submitError}</span>
                </div>
              )}

              {/* Confirmation card */}
              {mult > 0 && batchLabel.trim() && (
                <Card className="border-l-[3px] border-l-emerald-500" data-testid="production-confirmation-card">
                  <CardContent className="py-4 px-5">
                    <h3 className="text-xs font-bold text-emerald-700 mb-3">Review Before Running</h3>
                    <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                      <div><span className="text-[10px] text-muted-foreground block">Recipe</span><span className="font-semibold">{selectedRecipe.name}</span></div>
                      <div><span className="text-[10px] text-muted-foreground block">Quantity</span><span className="font-semibold tabular-nums">{totalQty} {unit} ({mult} batch{mult > 1 ? "es" : ""})</span></div>
                      <div><span className="text-[10px] text-muted-foreground block">Batch</span><span className="font-semibold font-mono">{batchLabel}</span></div>
                      <div><span className="text-[10px] text-muted-foreground block">Expiry</span><span className="font-semibold">{expiryDate || "Not set"}</span></div>
                      <div><span className="text-[10px] text-muted-foreground block">Est. Cost</span><span className="font-semibold tabular-nums">{totalEstimatedCost != null ? `₹${totalEstimatedCost.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}{estimatedUnitCost != null ? ` (₹${estimatedUnitCost.toFixed(2)}/${unit})` : ""}</span></div>
                      <div><span className="text-[10px] text-muted-foreground block">Insufficient</span><span className={`font-semibold ${hasInsufficient ? "text-amber-600" : "text-emerald-600"}`}>{hasInsufficient ? `${insufficientCount} ingredient${insufficientCount > 1 ? "s" : ""}` : "None"}</span></div>
                    </div>
                    {coverageEstimate && (
                      <p className="text-[10px] text-muted-foreground mb-3">
                        {totalQty} {selectedRecipe?.name} covers ~{coverageEstimate.coverageDays} days{coverageEstimate.outletCount > 0 ? ` across ${coverageEstimate.outletCount} stores` : ""} <span className="text-gray-400">(based on last 30d avg)</span>
                      </p>
                    )}
                    <div className="flex items-center justify-end">
                      <Button
                        data-testid="confirm-run-production-btn"
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-xs gap-1.5"
                        disabled={!canSubmit}
                        onClick={handleSubmit}
                      >
                        {submitting ? (
                          <><RotateCcw className="h-3.5 w-3.5 animate-spin" /> Running...</>
                        ) : (
                          <><CheckCircle2 className="h-3.5 w-3.5" /> Confirm &amp; Run Production</>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── P3-6: Post-production confirmation with next-best-action ──────

function PostProductionConfirmation({ result, selectedRecipe, totalQty, unit, hierarchyStores, stockMap, onReset, navigate }) {
  const fgId = selectedRecipe?.inventory_id;
  const nbaStores = useMemo(() => {
    if (!fgId || !hierarchyStores.length) return [];
    return hierarchyStores
      .map((store) => {
        const storeStock = store.stock_items?.find((s) => s.id === fgId || s.inventory_master_id === fgId);
        const qty = Number(storeStock?.cal_quantity || storeStock?.display_qty || 0);
        return {
          id: store.restaurant_id || store.id,
          name: store.restaurant_name || store.name || `Store #${store.restaurant_id || store.id}`,
          fgStock: qty,
        };
      })
      .sort((a, b) => a.fgStock - b.fgStock)
      .slice(0, 3);
  }, [fgId, hierarchyStores]);

  return (
    <div data-testid="post-production-confirmation" className="max-w-lg mx-auto py-8">
      <Card className="border-l-[3px] border-l-emerald-500">
        <CardContent className="py-6 px-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold">Production Run Complete</p>
              <p className="text-xs text-muted-foreground" data-testid="production-run-id">
                {result.reference_code || `Run #${result.production_run_id}`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Quantity Produced</p>
              <p className="font-semibold tabular-nums">{result.quantity_added || totalQty} {unit}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Unit Cost</p>
              <p className="font-semibold tabular-nums" data-testid="production-unit-cost">
                {result.unit_cost != null ? `₹${Number(result.unit_cost).toFixed(2)}` : "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Total Cost</p>
              <p className="font-semibold tabular-nums" data-testid="production-total-cost">
                {result.total_cost != null ? `₹${Number(result.total_cost).toFixed(2)}` : "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Recipe</p>
              <p className="font-semibold truncate">{selectedRecipe?.name || "—"}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {result.production_run_id && (
              <Button data-testid="view-audit-btn" variant="outline" size="sm" onClick={() => navigate(`/production/${result.production_run_id}`)}>
                <Eye className="h-3.5 w-3.5 mr-1.5" />View Audit
              </Button>
            )}
            <Button data-testid="view-in-stock-btn" variant="outline" size="sm" onClick={() => navigate("/inventory")}>
              <Package className="h-3.5 w-3.5 mr-1.5" />View in Stock
            </Button>
            <Button data-testid="run-another-btn" variant="default" size="sm" onClick={onReset}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />Run Another
            </Button>
          </div>

          {/* P3-6: Next-best-action — dispatch suggestions */}
          {nbaStores.length > 0 && (
            <div data-testid="post-production-nba" className="space-y-2 pt-3 border-t border-border">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Suggested Next Action</p>
              {nbaStores.map((store, idx) => (
                <div
                  key={store.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    idx === 0
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-muted/30 border-border"
                  }`}
                >
                  <Truck className={`h-4 w-4 shrink-0 ${idx === 0 ? "text-emerald-600" : "text-muted-foreground"}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold ${idx === 0 ? "text-emerald-700" : ""}`}>
                      Dispatch to {store.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{store.fgStock} in stock</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`text-[10px] h-7 ${idx === 0 ? "border-emerald-300 text-emerald-700 hover:bg-emerald-100" : ""}`}
                    onClick={() => navigate(`/dispatch/new?to=${store.id}`)}
                  >
                    Dispatch
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
