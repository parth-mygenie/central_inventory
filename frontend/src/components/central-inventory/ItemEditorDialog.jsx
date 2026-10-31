import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Package } from "lucide-react";
import api from "@/services/api";

/**
 * ItemEditorDialog — P17 shared dialog for Amend and Modification flows.
 *
 * Loads catalog from the source store (via request-catalog),
 * lets the user pick items and quantities, then calls onSubmit(items[]).
 */
export default function ItemEditorDialog({
  open, onOpenChange, transfer, title, description,
  submitLabel = "Submit", onSubmit, submitting = false,
}) {
  const fromId = transfer?.from_restaurant_id;
  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [rows, setRows] = useState([]);

  // Load catalog when dialog opens
  const fetchCatalog = useCallback(async () => {
    if (!fromId) return;
    setCatalogLoading(true);
    try {
      const resp = await api.requestCatalog(fromId);
      const data = resp.data?.data || resp.data;
      const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      setCatalog(items);
    } catch {
      setCatalog([]);
    } finally {
      setCatalogLoading(false);
    }
  }, [fromId]);

  useEffect(() => {
    if (open) {
      fetchCatalog();
      // Seed from existing lines if available
      const lines = transfer?.lines || [];
      if (lines.length > 0) {
        setRows(lines.map((l) => ({
          key: Math.random().toString(36).slice(2),
          masterId: l.source_inventory_master_id || null,
          stockTitle: l.stock_title || "",
          quantity: l.quantity ?? l.requestedDisplayQty ?? "",
          unit: l.unit || l.display_unit || "",
        })));
      } else {
        setRows([{ key: Math.random().toString(36).slice(2), masterId: null, stockTitle: "", quantity: "", unit: "" }]);
      }
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const addRow = () => {
    setRows((prev) => [...prev, { key: Math.random().toString(36).slice(2), masterId: null, stockTitle: "", quantity: "", unit: "" }]);
  };

  const removeRow = (idx) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateRow = (idx, field, value) => {
    setRows((prev) => {
      const next = [...prev];
      const row = { ...next[idx] };
      if (field === "masterId") {
        const catItem = catalog.find((c) => String(c.source_inventory_master_id) === String(value));
        row.masterId = Number(value);
        row.stockTitle = catItem?.stock_title || "";
        row.unit = catItem?.unit || catItem?.display_unit || "";
      } else {
        row[field] = value;
      }
      next[idx] = row;
      return next;
    });
  };

  const validRows = rows.filter((r) => r.masterId && Number(r.quantity) > 0);
  const isValid = validRows.length > 0;

  const handleSubmit = () => {
    if (submitting || !isValid) return;
    const items = validRows.map((r) => ({
      source_inventory_master_id: r.masterId,
      stock_title: r.stockTitle,
      quantity: Number(r.quantity),
      unit: r.unit,
    }));
    onSubmit(items);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="item-editor-dialog" className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-3 py-2">
          {catalogLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-4 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading catalog...
            </div>
          ) : (
            <>
              <div className="border rounded-md divide-y">
                {rows.map((row, idx) => (
                  <div key={row.key} className="p-2.5 space-y-2" data-testid={`item-row-${idx}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                        <Package className="h-3 w-3" /> Item {idx + 1}
                      </span>
                      {rows.length > 1 && (
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => removeRow(idx)}
                          disabled={submitting}
                          className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                          data-testid={`remove-item-${idx}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <Label className="text-[10px]">Item</Label>
                        <Select
                          value={row.masterId ? String(row.masterId) : ""}
                          onValueChange={(v) => updateRow(idx, "masterId", v)}
                          disabled={submitting}
                        >
                          <SelectTrigger data-testid={`item-select-${idx}`} className="h-7 text-xs">
                            <SelectValue placeholder="Select item" />
                          </SelectTrigger>
                          <SelectContent>
                            {catalog.map((c) => (
                              <SelectItem key={c.source_inventory_master_id} value={String(c.source_inventory_master_id)}>
                                {c.stock_title} ({c.unit || c.display_unit})
                                {c.available_display_qty != null ? ` — ${c.available_display_qty} avail` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[10px]">Quantity</Label>
                        <Input
                          data-testid={`item-qty-${idx}`}
                          type="number"
                          min={0}
                          step="any"
                          value={row.quantity}
                          onChange={(e) => updateRow(idx, "quantity", e.target.value)}
                          className="h-7 text-xs"
                          disabled={submitting}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Unit</Label>
                        <Input
                          value={row.unit}
                          className="h-7 text-xs bg-muted"
                          readOnly
                          tabIndex={-1}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                variant="ghost" size="sm"
                onClick={addRow}
                disabled={submitting}
                className="h-7 text-xs gap-1 w-full"
                data-testid="add-item-btn"
              >
                <Plus className="h-3 w-3" /> Add Item
              </Button>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting} data-testid="item-editor-cancel">
            Cancel
          </Button>
          <Button
            data-testid="item-editor-submit"
            onClick={handleSubmit}
            disabled={submitting || !isValid}
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
