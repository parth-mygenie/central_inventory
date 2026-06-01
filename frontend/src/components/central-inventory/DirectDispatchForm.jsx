import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLoginContext } from "@/hooks/useLoginContext";
import { useWriteAction } from "@/hooks/useWriteAction";
import api from "@/services/api";
import { mapRestaurantType } from "@/lib/terminology";
import { validateQuantityForUnit } from "@/lib/formatters";
import SourceSelector from "./SourceSelector";
import StoreHealthStrip from "@/components/common/StoreHealthStrip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LoadingState, PermissionDenied } from "@/components/common/StateDisplays";
import { ArrowLeft, Plus, Trash2, Loader2, Truck, AlertTriangle, Package } from "lucide-react";

export default function DirectDispatchForm() {
  const navigate = useNavigate();
  const { restaurantId, restaurantType, canDo } = useLoginContext();
  const { submitting, execute } = useWriteAction();

  const [destinations, setDestinations] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedDest, setSelectedDest] = useState("");
  const [rows, setRows] = useState([{ itemId: "", quantity: "", unit: "", sourceSelector: null }]);
  const [loadingData, setLoadingData] = useState(true);

  // C2: Destination store stock + own stock for "What This Store Needs"
  const [destStock, setDestStock] = useState([]);
  const [ownStock, setOwnStock] = useState([]);
  const [destLoading, setDestLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingData(true);
    // Fetch both store types since POS requires store_type as mandatory
    Promise.all([
      api.getHierarchySummary({ storeType: "central" }),
      api.getHierarchySummary({ storeType: "franchise" }),
      api.getInventoryMaster(),
    ])
      .then(([centralResp, franchiseResp, invResp]) => {
        if (cancelled) return;
        const centralStores = centralResp.data?.data?.stores || [];
        const franchiseStores = franchiseResp.data?.data?.stores || [];
        setDestinations([...centralStores, ...franchiseStores]);
        const inv = invResp.data?.data || invResp.data || [];
        setItems(Array.isArray(inv) ? inv : []);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingData(false); });
    return () => { cancelled = true; };
  }, []);

  // C2: Fetch destination store stock + own stock when dest changes
  useEffect(() => {
    if (!selectedDest) { setDestStock([]); return; }
    let cancelled = false;
    setDestLoading(true);
    Promise.allSettled([
      api.getHierarchyDetail({ storeRestaurantId: Number(selectedDest) }),
      api.getStockInventory(),
    ]).then(([detailResp, stockResp]) => {
      if (cancelled) return;
      if (detailResp.status === "fulfilled") {
        const data = detailResp.value?.data?.data || detailResp.value?.data;
        setDestStock(data?.child_stock_summary || []);
      }
      if (stockResp.status === "fulfilled") {
        setOwnStock(stockResp.value?.data?.current_stocks || []);
      }
    }).finally(() => { if (!cancelled) setDestLoading(false); });
    return () => { cancelled = true; };
  }, [selectedDest]);

  // C2: Compute "What This Store Needs" — items where dest stock < min threshold
  const storeNeeds = useMemo(() => {
    if (!destStock.length) return [];
    return destStock
      .map((item) => {
        const qty = parseFloat(item.display_quantity) || 0;
        const minQty = parseFloat(item.min_qty_alert) || 0;
        const gap = minQty > 0 ? Math.max(0, minQty - qty) : 0;
        const ownItem = ownStock.find(s => (s.stock_title || "").toLowerCase() === (item.stock_title || "").toLowerCase());
        return {
          ...item,
          currentQty: qty,
          minQty,
          gap,
          ownQty: ownItem?.display_qty ?? 0,
          ownUnit: ownItem?.display_unit || item.unit || "",
        };
      })
      .filter((item) => item.gap > 0 || item.currentQty === 0)
      .sort((a, b) => b.gap - a.gap);
  }, [destStock, ownStock]);

  if (!canDo("dispatch")) return <PermissionDenied />;
  if (loadingData) return <LoadingState lines={4} />;

  const addRow = () => setRows((r) => [...r, { itemId: "", quantity: "", unit: "", sourceSelector: null }]);
  const removeRow = (idx) => setRows((r) => r.filter((_, i) => i !== idx));
  const updateRow = (idx, field, value) => {
    setRows((r) => {
      const next = [...r];
      next[idx] = { ...next[idx], [field]: value };
      if (field === "itemId") {
        const item = items.find((i) => String(i.id) === String(value));
        next[idx].unit = item?.unit || "";
        next[idx].sourceSelector = null;
      }
      return next;
    });
  };

  const handleSubmit = () => {
    if (!selectedDest || rows.length === 0) return;
    const payloadItems = rows.map((r) => {
      const item = items.find((i) => String(i.id) === String(r.itemId));
      return {
        source_inventory_master_id: Number(r.itemId),
        quantity: Number(r.quantity),
        unit: item?.unit || r.unit,
        source_selector: r.sourceSelector,
      };
    });

    execute(
      () => api.initiateTransfer({ fromRestaurantId: restaurantId, toRestaurantId: Number(selectedDest), items: payloadItems }),
      {
        successMsg: "Dispatch created",
        onSuccess: (resp) => {
          const newId = resp?.data?.data?.transfer_id || resp?.data?.data?.id || resp?.data?.transfer_id;
          navigate(newId ? `/transfer/${newId}` : "/queues");
        },
      }
    );
  };

  const allValid = selectedDest && rows.length > 0 && rows.every(
    (r) => r.itemId && Number(r.quantity) > 0 && r.sourceSelector && !validateQuantityForUnit(r.quantity, r.unit)
  );

  return (
    <div data-testid="direct-dispatch-form">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>
      <div className="flex items-center gap-2 mb-4">
        <Truck className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-bold">Direct Dispatch</h1>
      </div>

      <Card className="mb-4">
        <CardContent className="py-3 px-4 space-y-3">
          <div>
            <Label className="text-xs">Destination Store *</Label>
            <Select value={selectedDest} onValueChange={setSelectedDest} disabled={submitting}>
              <SelectTrigger data-testid="dispatch-dest-select">
                <SelectValue placeholder="Select destination" />
              </SelectTrigger>
              <SelectContent>
                {destinations.map((d) => (
                  <SelectItem key={d.restaurant_id} value={String(d.restaurant_id)}>
                    {d.restaurant_name} ({mapRestaurantType(d.restaurant_type)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* IG-005: Destination health strip */}
          {selectedDest && (() => {
            const dest = destinations.find(d => String(d.restaurant_id) === String(selectedDest));
            return dest ? (
              <StoreHealthStrip
                storeName={dest.restaurant_name}
                outCount={dest.out_of_stock_count || 0}
                lowCount={dest.low_stock_count || 0}
                adequateCount={dest.adequate_count || 0}
                totalItems={dest.total_items || 0}
                urgent={(dest.out_of_stock_count || 0) >= 2}
                className="rounded-lg border border-border/50 mt-2"
              />
            ) : null;
          })()}
        </CardContent>
      </Card>

      {/* C2: What This Store Needs — auto-detect from destination stock gaps */}
      {selectedDest && !destLoading && storeNeeds.length > 0 && (
        <Card className="mb-4 border-l-[3px] border-l-amber-500" data-testid="store-needs-section">
          <CardHeader className="py-2.5 px-4">
            <CardTitle className="text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              What This Store Needs ({storeNeeds.length} item{storeNeeds.length !== 1 ? "s" : ""})
            </CardTitle>
          </CardHeader>
          <CardContent className="py-0 px-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px]">Item</TableHead>
                    <TableHead className="text-[10px] text-right">Their Stock</TableHead>
                    <TableHead className="text-[10px] text-right">Min Threshold</TableHead>
                    <TableHead className="text-[10px] text-right">Gap</TableHead>
                    <TableHead className="text-[10px] text-right">Your Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {storeNeeds.map((item, idx) => {
                    const isOut = item.currentQty === 0;
                    return (
                      <TableRow key={idx} data-testid={`needs-row-${idx}`} className={isOut ? "bg-red-50/30" : ""}>
                        <TableCell className="text-xs font-medium">
                          {item.stock_title} <span className="text-muted-foreground">{item.unit}</span>
                          {isOut && <Badge variant="destructive" className="ml-1.5 text-[8px] px-1 py-0">OUT</Badge>}
                        </TableCell>
                        <TableCell className={`text-xs text-right tabular-nums ${isOut ? "text-red-600 font-semibold" : "text-amber-600"}`}>
                          {item.currentQty} {item.unit}
                        </TableCell>
                        <TableCell className="text-xs text-right tabular-nums text-muted-foreground">{item.minQty} {item.unit}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums font-semibold text-amber-700">{item.gap > 0 ? item.gap : "—"} {item.gap > 0 ? item.unit : ""}</TableCell>
                        <TableCell className={`text-xs text-right tabular-nums ${item.ownQty === 0 ? "text-red-600" : ""}`}>{item.ownQty} {item.ownUnit}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <p className="text-[10px] text-muted-foreground px-4 py-2 border-t border-border/50">
              Items below minimum threshold at the destination store. Consider dispatching these items.
            </p>
          </CardContent>
        </Card>
      )}
      {selectedDest && destLoading && (
        <Card className="mb-4">
          <CardContent className="py-4 px-4 text-center">
            <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Analyzing destination stock...</p>
          </CardContent>
        </Card>
      )}

      <Card className="mb-4">
        <CardHeader className="py-2.5 px-4"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Items</CardTitle></CardHeader>
        <CardContent className="py-0 px-4 space-y-3 pb-4">
          {rows.map((row, idx) => {
            const selectedItem = items.find((i) => String(i.id) === String(row.itemId));
            const qtyErr = row.quantity && validateQuantityForUnit(row.quantity, row.unit);
            return (
              <div key={`row-${idx}-${row.itemId || 'empty'}`} className="border rounded-md p-3 space-y-2" data-testid={`dispatch-item-row-${idx}`}>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground">Item {idx + 1}</span>
                  {rows.length > 1 && (
                    <button type="button" onClick={() => removeRow(idx)} className="text-destructive hover:text-destructive/80" disabled={submitting}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <Select value={row.itemId ? String(row.itemId) : ""} onValueChange={(v) => updateRow(idx, "itemId", v)} disabled={submitting}>
                  <SelectTrigger data-testid={`dispatch-item-select-${idx}`} className="text-xs">
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
                      data-testid={`dispatch-qty-${idx}`}
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
                {row.itemId && (
                  <div>
                    <Label className="text-[10px]">Source *</Label>
                    <SourceSelector
                      fromRestaurantId={restaurantId}
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
          <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={submitting} data-testid="dispatch-add-item" className="text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
          </Button>
        </CardContent>
      </Card>

      <Button data-testid="dispatch-submit" onClick={handleSubmit} disabled={!allValid || submitting} className="w-full">
        {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Create Dispatch
      </Button>
    </div>
  );
}
