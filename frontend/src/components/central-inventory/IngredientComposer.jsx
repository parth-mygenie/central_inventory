import { useState, useEffect, useCallback } from "react";
import { useLoginContext } from "@/hooks/useLoginContext";
import api from "@/services/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

/**
 * Shared ingredient composition editor for recipes, sub-recipes, addon-recipes.
 * Each row: ingredient selector + qty + unit (auto from ingredient).
 */
export default function IngredientComposer({ ingredients, onChange, disabled }) {
  const [masterItems, setMasterItems] = useState([]);
  useEffect(() => {
    api.getInventoryMaster().then(r => {
      const items = r.data?.data || r.data || [];
      setMasterItems(Array.isArray(items) ? items : []);
    }).catch(() => {});
  }, []);

  const addRow = () => onChange([...ingredients, { ingredient_id: "", ingredient_qty: "", ingredient_unit: "" }]);
  const removeRow = (idx) => onChange(ingredients.filter((_, i) => i !== idx));
  const updateRow = (idx, field, value) => {
    const next = [...ingredients];
    next[idx] = { ...next[idx], [field]: value };
    if (field === "ingredient_id") {
      const item = masterItems.find(m => String(m.id) === String(value));
      next[idx].ingredient_unit = item?.unit === "kg" ? "gm" : item?.unit === "ltr" ? "ml" : item?.unit || "";
      next[idx].ingredient_name = item?.stock_title || "";
    }
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">Ingredients *</Label>
      {ingredients.map((row, idx) => (
        <div key={row.ingredient_id || `row-${idx}`} className="flex items-end gap-2" data-testid={`composer-row-${idx}`}>
          <div className="flex-1">
            {idx === 0 && <Label className="text-[10px] text-muted-foreground">Item</Label>}
            <Select value={row.ingredient_id ? String(row.ingredient_id) : ""} onValueChange={v => updateRow(idx, "ingredient_id", v)} disabled={disabled}>
              <SelectTrigger className="h-8 text-xs" data-testid={`composer-item-${idx}`}><SelectValue placeholder="Select ingredient" /></SelectTrigger>
              <SelectContent>{masterItems.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.stock_title} ({m.unit})</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="w-20">
            {idx === 0 && <Label className="text-[10px] text-muted-foreground">Qty</Label>}
            <Input type="number" min="0" step="any" value={row.ingredient_qty} onChange={e => updateRow(idx, "ingredient_qty", e.target.value)} className="h-8 text-xs" disabled={disabled} data-testid={`composer-qty-${idx}`} />
          </div>
          <div className="w-16">
            {idx === 0 && <Label className="text-[10px] text-muted-foreground">Unit</Label>}
            <Input value={row.ingredient_unit || "—"} className="h-8 text-xs bg-muted" readOnly />
          </div>
          {ingredients.length > 1 && (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive shrink-0" onClick={() => removeRow(idx)} disabled={disabled}><Trash2 className="h-3.5 w-3.5" /></Button>
          )}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={disabled} className="text-xs" data-testid="composer-add-row"><Plus className="h-3.5 w-3.5 mr-1" />Add Ingredient</Button>
    </div>
  );
}
