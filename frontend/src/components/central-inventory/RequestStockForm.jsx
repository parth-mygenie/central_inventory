import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLoginContext } from "@/hooks/useLoginContext";
import { useWriteAction } from "@/hooks/useWriteAction";
import api from "@/services/api";
import { mapRestaurantType } from "@/lib/terminology";
import { validateQuantityForUnit } from "@/lib/formatters";
import SourceSelector from "./SourceSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingState, PermissionDenied } from "@/components/common/StateDisplays";
import { ArrowLeft, Plus, Trash2, Loader2, SendHorizonal } from "lucide-react";

export default function RequestStockForm() {
  const navigate = useNavigate();
  const { restaurantId, restaurantType, canDo, user } = useLoginContext();
  const { submitting, execute } = useWriteAction();

  const [items, setItems] = useState([]);
  const [parentStore, setParentStore] = useState(null);
  const [rows, setRows] = useState([{ itemId: "", quantity: "", unit: "", unitId: null, sourceSelector: null }]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoadingData(true);
    Promise.all([api.getHierarchySummary(), api.getInventoryMaster()])
      .then(([hierResp, invResp]) => {
        if (cancelled) return;
        const inv = invResp.data?.data || invResp.data || [];
        setItems(Array.isArray(inv) ? inv : []);
        // Derive parent from hierarchy summary
        // For Master (central): parent is Central (master) = first store with type "master"
        // For Outlet (franchise): parent is their Master (central)
        const stores = hierResp.data?.data?.stores || [];
        // Simple heuristic: the parent is the first master-type store for central, or first central-type for franchise
        if (restaurantType === "central") {
          // Master store's parent = Central Store. In our hierarchy, Central = restaurant_id 1
          setParentStore({ restaurant_id: 1, restaurant_name: "My Genie", restaurant_type: "master" });
        } else if (restaurantType === "franchise") {
          // Outlet's parent = the Master Store that owns it
          const masterStore = stores.find((s) => s.restaurant_type === "central");
          if (masterStore) setParentStore(masterStore);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingData(false); });
    return () => { cancelled = true; };
  }, [restaurantType]);

  if (!canDo("request-stock")) return <PermissionDenied />;
  if (loadingData) return <LoadingState lines={4} />;

  const addRow = () => setRows((r) => [...r, { itemId: "", quantity: "", unit: "", unitId: null, sourceSelector: null }]);
  const removeRow = (idx) => setRows((r) => r.filter((_, i) => i !== idx));
  const updateRow = (idx, field, value) => {
    setRows((r) => {
      const next = [...r];
      next[idx] = { ...next[idx], [field]: value };
      if (field === "itemId") {
        const item = items.find((i) => String(i.id) === String(value));
        next[idx].unit = item?.unit || "";
        next[idx].unitId = item?.unit_id || null;
        next[idx].sourceSelector = null;
      }
      return next;
    });
  };

  const handleSubmit = () => {
    if (rows.length === 0) return;
    const payloadItems = rows.map((r) => {
      const item = items.find((i) => String(i.id) === String(r.itemId));
      return {
        stock_title: item?.stock_title || "",
        unit_id: item?.unit_id || r.unitId,
        quantity: Number(r.quantity),
        unit: item?.unit || r.unit,
        source_selector: r.sourceSelector,
      };
    });

    execute(
      () => api.requestStock({ items: payloadItems }),
      {
        successMsg: "Stock request submitted",
        onSuccess: (resp) => {
          const newId = resp?.data?.data?.transfer_id || resp?.data?.data?.id || resp?.data?.transfer_id;
          navigate(newId ? `/transfer/${newId}` : "/queues");
        },
      }
    );
  };

  const parentRestaurantId = parentStore?.restaurant_id;
  const allValid = rows.length > 0 && rows.every(
    (r) => r.itemId && Number(r.quantity) > 0 && r.sourceSelector && !validateQuantityForUnit(r.quantity, r.unit)
  );

  return (
    <div data-testid="request-stock-form">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>
      <div className="flex items-center gap-2 mb-4">
        <SendHorizonal className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-bold">Request Stock</h1>
      </div>

      <Card className="mb-4">
        <CardContent className="py-3 px-4">
          <div>
            <Label className="text-xs text-muted-foreground">Requesting From</Label>
            <p className="text-sm font-semibold">
              {parentStore ? `${parentStore.restaurant_name} (${mapRestaurantType(parentStore.restaurant_type)})` : "Parent Store"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader className="py-2.5 px-4"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Items</CardTitle></CardHeader>
        <CardContent className="py-0 px-4 space-y-3 pb-4">
          {rows.map((row, idx) => {
            const qtyErr = row.quantity && validateQuantityForUnit(row.quantity, row.unit);
            return (
              <div key={idx} className="border rounded-md p-3 space-y-2" data-testid={`request-item-row-${idx}`}>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground">Item {idx + 1}</span>
                  {rows.length > 1 && (
                    <button type="button" onClick={() => removeRow(idx)} className="text-destructive hover:text-destructive/80" disabled={submitting}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <Select value={row.itemId ? String(row.itemId) : ""} onValueChange={(v) => updateRow(idx, "itemId", v)} disabled={submitting}>
                  <SelectTrigger data-testid={`request-item-select-${idx}`} className="text-xs">
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>{item.stock_title} ({item.unit})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">Quantity *</Label>
                    <Input
                      data-testid={`request-qty-${idx}`}
                      type="number" min="0" step="any"
                      value={row.quantity}
                      onChange={(e) => updateRow(idx, "quantity", e.target.value)}
                      className="h-7 text-xs"
                      disabled={submitting}
                    />
                    {qtyErr && <p className="text-[10px] text-destructive mt-0.5">{qtyErr}</p>}
                  </div>
                  <div>
                    <Label className="text-[10px]">Unit</Label>
                    <Input value={row.unit || "—"} className="h-7 text-xs bg-muted" readOnly />
                  </div>
                </div>
                {row.itemId && parentRestaurantId && (
                  <div>
                    <Label className="text-[10px]">Source *</Label>
                    <SourceSelector
                      fromRestaurantId={parentRestaurantId}
                      inventoryMasterId={Number(row.itemId)}
                      value={row.sourceSelector}
                      onChange={(v) => updateRow(idx, "sourceSelector", v)}
                      disabled={submitting}
                    />
                  </div>
                )}
              </div>
            );
          })}
          <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={submitting} data-testid="request-add-item" className="text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
          </Button>
        </CardContent>
      </Card>

      <Button data-testid="request-submit" onClick={handleSubmit} disabled={!allValid || submitting} className="w-full">
        {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Submit Request
      </Button>
    </div>
  );
}
