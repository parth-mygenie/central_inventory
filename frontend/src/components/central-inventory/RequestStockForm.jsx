import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLoginContext } from "@/hooks/useLoginContext";
import { useWriteAction } from "@/hooks/useWriteAction";
import api from "@/services/api";
import { mapRestaurantType } from "@/lib/terminology";
import { validateQuantityForUnit } from "@/lib/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingState, PermissionDenied } from "@/components/common/StateDisplays";
import { ArrowLeft, Plus, Trash2, Loader2, SendHorizonal, AlertCircle, Store, Info, AlertTriangle } from "lucide-react";

/**
 * Request Stock Form — canonical 3-step flow (P12/P14 contract).
 *
 * Step 1: POST /request-sources       → pick source store
 * Step 2: POST /request-catalog       → browse source store's items
 * Step 3: POST /request               → submit (no source_selector)
 *
 * Selector ownership per P14:
 *   - Requester owns: source store, SKU (source_inventory_master_id), quantity
 *   - Sender (central) owns: batch/segment/FEFO allocation via edit + dispatch
 *   - source_selector omitted on request; dispatch uses auto-FEFO or line selector
 *
 * Availability (available_display_qty) is informational only — do NOT block submit when 0.
 * SourceSelector is NOT shown here; central uses source-options on dispatch/edit UI.
 */

const RELATION_LABELS = {
  direct_parent: "Direct Parent",
  upstream_master: "Upstream Central",
  sibling_central: "Sibling",
};

export default function RequestStockForm() {
  const navigate = useNavigate();
  const { canDo } = useLoginContext();
  const { submitting, execute } = useWriteAction();

  // Step 1: Sources
  const [sources, setSources] = useState([]);
  const [selectedSourceId, setSelectedSourceId] = useState(null);
  const [loadingSources, setLoadingSources] = useState(true);
  const [sourcesError, setSourcesError] = useState(null);

  // Step 2: Catalog from selected source
  const [catalog, setCatalog] = useState([]);
  const [catalogSource, setCatalogSource] = useState(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalogError, setCatalogError] = useState(null);

  // Step 3: Item rows
  const [rows, setRows] = useState([emptyRow()]);

  // IG-004: Own stock for intelligent PO context
  const [ownStock, setOwnStock] = useState([]);
  useEffect(() => {
    api.getStockInventory()
      .then(r => setOwnStock(r.data?.current_stocks || []))
      .catch(() => {});
  }, []);

  // Load request-sources on mount
  useEffect(() => {
    let cancelled = false;
    setLoadingSources(true);
    setSourcesError(null);
    api.requestSources()
      .then((resp) => {
        if (cancelled) return;
        const data = resp.data?.data || resp.data;
        const list = data?.sources || [];
        setSources(list);
        const def = list.find((s) => s.is_direct_parent) || list[0];
        if (def) setSelectedSourceId(def.restaurant_id);
      })
      .catch((err) => {
        if (cancelled) return;
        setSourcesError(err?.response?.data?.message || "Failed to load request sources");
      })
      .finally(() => { if (!cancelled) setLoadingSources(false); });
    return () => { cancelled = true; };
  }, []);

  // Load catalog when source changes
  useEffect(() => {
    if (!selectedSourceId) {
      setCatalog([]);
      setCatalogSource(null);
      return;
    }
    let cancelled = false;
    setLoadingCatalog(true);
    setCatalogError(null);
    setCatalog([]);
    setCatalogSource(null);
    setRows([emptyRow()]);

    api.requestCatalog(selectedSourceId)
      .then((resp) => {
        if (cancelled) return;
        const data = resp.data?.data || resp.data;
        setCatalog(data?.items || []);
        setCatalogSource(data?.source_restaurant || null);
      })
      .catch((err) => {
        if (cancelled) return;
        setCatalogError(err?.response?.data?.message || "Failed to load catalog");
      })
      .finally(() => { if (!cancelled) setLoadingCatalog(false); });
    return () => { cancelled = true; };
  }, [selectedSourceId]);

  if (!canDo("request-stock")) return <PermissionDenied />;
  if (loadingSources) return <LoadingState lines={4} />;

  if (sourcesError) {
    return (
      <div data-testid="request-stock-form">
        <BackButton navigate={navigate} />
        <Card><CardContent className="py-6 text-center">
          <AlertCircle className="h-5 w-5 text-destructive mx-auto mb-2" />
          <p className="text-sm text-destructive" data-testid="sources-error">{sourcesError}</p>
        </CardContent></Card>
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <div data-testid="request-stock-form">
        <BackButton navigate={navigate} />
        <Card><CardContent className="py-6 text-center text-muted-foreground text-sm" data-testid="no-sources">
          No sources available for stock requests.
        </CardContent></Card>
      </div>
    );
  }

  const selectedSource = sources.find((s) => s.restaurant_id === selectedSourceId);
  const canSubmitToSelected = selectedSource?.can_submit_request !== false;
  const catalogCanSubmit = catalogSource?.can_submit_request !== false;
  const submitAllowed = canSubmitToSelected && catalogCanSubmit;

  const addRow = () => setRows((r) => [...r, emptyRow()]);
  const removeRow = (idx) => setRows((r) => r.filter((_, i) => i !== idx));
  const updateRow = (idx, field, value) => {
    setRows((r) => {
      const next = [...r];
      next[idx] = { ...next[idx], [field]: value };
      if (field === "itemId") {
        const item = catalog.find((i) => String(i.source_inventory_master_id) === String(value));
        next[idx].unit = item?.unit || item?.display_unit || "";
        next[idx].unitId = item?.unit_id || null;
      }
      return next;
    });
  };

  const handleSubmit = () => {
    if (rows.length === 0 || !selectedSourceId) return;
    const isDefaultParent = selectedSource?.is_direct_parent;

    // Canonical request payload per P12: no source_selector
    // Sender (central) allocates at dispatch via auto-FEFO or edit + segment_id
    const payloadItems = rows.map((r) => {
      const item = catalog.find((i) => String(i.source_inventory_master_id) === String(r.itemId));
      return {
        source_inventory_master_id: Number(r.itemId),
        stock_title: item?.stock_title || "",
        quantity: Number(r.quantity),
        unit: item?.unit || r.unit,
      };
    });

    execute(
      () => api.requestStock({
        items: payloadItems,
        fromRestaurantId: isDefaultParent ? undefined : selectedSourceId,
      }),
      {
        successMsg: "Stock request submitted",
        onSuccess: (resp) => {
          const d = resp?.data?.data || resp?.data;
          const newId = d?.transfer_id || d?.id;
          navigate(newId ? `/transfer/${newId}` : "/queues");
        },
      }
    );
  };

  // Validation: item selected + quantity > 0 + valid format. No selector required.
  const allValid = rows.length > 0 && submitAllowed && rows.every(
    (r) => r.itemId && Number(r.quantity) > 0 && !validateQuantityForUnit(r.quantity, r.unit)
  );

  return (
    <div data-testid="request-stock-form">
      <BackButton navigate={navigate} />
      <div className="flex items-center gap-2 mb-4">
        <SendHorizonal className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-bold">Request Stock</h1>
      </div>

      {/* Step 1: Source Picker */}
      <SourcePicker
        sources={sources}
        selectedSourceId={selectedSourceId}
        onSourceChange={setSelectedSourceId}
        canSubmitToSelected={canSubmitToSelected}
        disabled={submitting}
      />

      {/* IG-004: Low stock suggestions for Intelligent PO */}
      {ownStock.length > 0 && catalog.length > 0 && (
        (() => {
          const lowItems = ownStock.filter(s => s.is_low_stock);
          if (lowItems.length === 0) return null;
          return (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4" data-testid="low-stock-suggestions">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="text-xs font-semibold text-amber-800">{lowItems.length} item{lowItems.length > 1 ? "s" : ""} below minimum — consider requesting</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {lowItems.slice(0, 5).map(item => (
                  <Badge key={item.id} variant="outline" className="text-[10px] bg-amber-100 text-amber-800 border-amber-300" data-testid={`suggest-${item.id}`}>
                    {item.stock_title}: {item.display_qty} {item.display_unit} (min: {item.min_qty_alert})
                  </Badge>
                ))}
              </div>
            </div>
          );
        })()
      )}

      {/* Step 2 + 3: Catalog + Items */}
      {loadingCatalog ? (
        <LoadingState lines={3} />
      ) : catalogError ? (
        <Card className="mb-4"><CardContent className="py-4 text-center">
          <p className="text-sm text-destructive" data-testid="catalog-error">{catalogError}</p>
        </CardContent></Card>
      ) : catalog.length === 0 && selectedSourceId ? (
        <Card className="mb-4"><CardContent className="py-4 text-center text-muted-foreground text-sm" data-testid="no-catalog-items">
          No items available at the selected source store.
        </CardContent></Card>
      ) : catalog.length > 0 ? (
        <>
          <ItemsCard
            rows={rows}
            catalog={catalog}
            addRow={addRow}
            removeRow={removeRow}
            updateRow={updateRow}
            submitting={submitting}
          />
          <Button data-testid="request-submit" onClick={handleSubmit} disabled={!allValid || submitting} className="w-full">
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Submit Request
          </Button>
        </>
      ) : null}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────

function emptyRow() {
  return { itemId: "", quantity: "", unit: "", unitId: null };
}

function BackButton({ navigate }) {
  return (
    <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors" data-testid="request-back-btn">
      <ArrowLeft className="h-3.5 w-3.5" /> Back
    </button>
  );
}

function SourcePicker({ sources, selectedSourceId, onSourceChange, canSubmitToSelected, disabled }) {
  return (
    <Card className="mb-4">
      <CardHeader className="py-2.5 px-4">
        <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Request From</CardTitle>
      </CardHeader>
      <CardContent className="py-0 px-4 pb-3">
        <Select
          value={selectedSourceId ? String(selectedSourceId) : ""}
          onValueChange={(v) => onSourceChange(Number(v))}
          disabled={disabled}
        >
          <SelectTrigger data-testid="request-source-select" className="text-xs">
            <SelectValue placeholder="Select source store" />
          </SelectTrigger>
          <SelectContent>
            {sources.map((src) => (
              <SelectItem key={src.restaurant_id} value={String(src.restaurant_id)} data-testid={`source-option-${src.restaurant_id}`}>
                <span className="flex items-center gap-1.5">
                  <Store className="h-3 w-3 flex-shrink-0" />
                  {src.name} ({mapRestaurantType(src.restaurant_type)})
                  <span className="text-muted-foreground ml-1">
                    — {RELATION_LABELS[src.relation] || src.relation}
                  </span>
                  {!src.can_submit_request && (
                    <span className="text-destructive text-[10px] ml-1">(blocked)</span>
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {!canSubmitToSelected && selectedSourceId && (
          <div className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-700 bg-amber-50 rounded p-2" data-testid="cross-branch-warning">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <span>
              Cross-branch requests to this store are currently disabled.
              Contact your Central Store administrator to enable cross-branch transfers.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ItemsCard({ rows, catalog, addRow, removeRow, updateRow, submitting }) {
  return (
    <Card className="mb-4">
      <CardHeader className="py-2.5 px-4">
        <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Items</CardTitle>
      </CardHeader>
      <CardContent className="py-0 px-4 space-y-3 pb-4">
        {rows.map((row, idx) => (
          <ItemRow
            key={`item-${idx}-${row.itemId || 'empty'}`}
            idx={idx}
            row={row}
            catalog={catalog}
            totalRows={rows.length}
            removeRow={removeRow}
            updateRow={updateRow}
            submitting={submitting}
          />
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={submitting} data-testid="request-add-item" className="text-xs">
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
        </Button>
      </CardContent>
    </Card>
  );
}

function ItemRow({ idx, row, catalog, totalRows, removeRow, updateRow, submitting }) {
  const qtyErr = row.quantity && validateQuantityForUnit(row.quantity, row.unit);
  const selectedItem = catalog.find((i) => String(i.source_inventory_master_id) === String(row.itemId));

  return (
    <div className="border rounded-md p-3 space-y-2" data-testid={`request-item-row-${idx}`}>
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-muted-foreground">Item {idx + 1}</span>
        {totalRows > 1 && (
          <button type="button" onClick={() => removeRow(idx)} className="text-destructive hover:text-destructive/80" disabled={submitting} data-testid={`request-remove-item-${idx}`}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <Select
        value={row.itemId ? String(row.itemId) : ""}
        onValueChange={(v) => updateRow(idx, "itemId", v)}
        disabled={submitting}
      >
        <SelectTrigger data-testid={`request-item-select-${idx}`} className="text-xs">
          <SelectValue placeholder="Select item from source" />
        </SelectTrigger>
        <SelectContent>
          {catalog.map((item) => (
            <SelectItem key={item.source_inventory_master_id} value={String(item.source_inventory_master_id)}>
              {item.stock_title} ({item.unit || item.display_unit})
              {item.available_display_qty != null && (
                <span className="text-muted-foreground"> — {item.available_display_qty} avail</span>
              )}
            </SelectItem>
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
          {selectedItem?.available_display_qty != null && (
            <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1" data-testid={`request-avail-hint-${idx}`}>
              <Info className="h-3 w-3" />
              Source has ~{selectedItem.available_display_qty} {selectedItem.unit || selectedItem.display_unit} (indicative)
            </p>
          )}
        </div>
        <div>
          <Label className="text-[10px]">Unit</Label>
          <Input value={row.unit || "—"} className="h-7 text-xs bg-muted" readOnly data-testid={`request-unit-${idx}`} />
        </div>
      </div>
    </div>
  );
}
