import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLoginContext } from "@/hooks/useLoginContext";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/StateDisplays";
import { ShoppingCart, ArrowLeft, Loader2, Check, ShieldX, ArrowRight, AlertTriangle, Package, Search, Info, UserPlus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { normalizeToDisplayUnit, smartConsumptionDisplay } from "@/lib/formatters"; // BUG-036

function formatCurrency(n) {
  if (n == null || isNaN(n)) return "\u20B90";
  return `\u20B9${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

/** Helper: check if an inventory item is a sub-recipe */
function isSubRecipeItem(item) {
  return item.is_sub_recipe === true || (item.category_name || "").toLowerCase() === "sub recipe" || !!item.subrecipe_id;
}

/** BUG-030: Helper: parse "5 gm" or "1.2 kg" → { value, unit } */
function parseQtyString(str) {
  if (!str) return { value: 0, unit: "" };
  const parts = String(str).trim().split(/\s+/);
  return { value: parseFloat(parts[0]) || 0, unit: parts[1] || "" };
}

/** Compute cheapest vendor for an item from purchase data */
function getCheapestVendor(itemName, itemId, purchaseData, vendors) {
  const byVendor = {};
  purchaseData.forEach((r) => {
    if ((r.Ingredient_Name === itemName || r.ingredient_id === itemId) && Number(r.stock_quantity_raw) > 0) {
      const vid = r.vendor_id;
      if (!byVendor[vid]) byVendor[vid] = { totalAmt: 0, totalQty: 0, vendorName: r.Vendor_Name || "" };
      byVendor[vid].totalAmt += Number(r.Amount) || 0;
      byVendor[vid].totalQty += Number(r.stock_quantity_raw) || 0;
    }
  });
  const rates = Object.entries(byVendor).map(([vid, d]) => ({
    vendorId: vid,
    vendorName: d.vendorName || vendors.find((v) => String(v.id) === vid)?.vendor_name || `Vendor ${vid}`,
    rate: d.totalQty > 0 ? d.totalAmt / d.totalQty : Infinity,
  })).filter((v) => v.rate < Infinity).sort((a, b) => a.rate - b.rate);
  return rates;
}

export default function PurchaseOrderCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { restaurantId } = useLoginContext();

  const [vendors, setVendors] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [purchaseData, setPurchaseData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [blocked, setBlocked] = useState(false);

  // Mode: vendor | item
  const [mode, setMode] = useState(searchParams.get("mode") || "vendor");

  // By Vendor state
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [vendorLines, setVendorLines] = useState([]);

  // By Item Need state
  const [needLines, setNeedLines] = useState([]);

  // Shared
  const [expectedDate, setExpectedDate] = useState("");
  const [paymentType, setPaymentType] = useState("Cash");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState("select"); // select | items | review
  const [vendorSearch, setVendorSearch] = useState(""); // search for By Vendor items
  const [needSearch, setNeedSearch] = useState(""); // BUG-030: search for By Item Need
  const [consumptionMap, setConsumptionMap] = useState({}); // BUG-030: real consumption data

  // Filter sub-recipes from inventory
  const rawMaterialItems = useMemo(() => inventoryItems.filter((i) => !isSubRecipeItem(i)), [inventoryItems]);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [vResp, iResp] = await Promise.all([api.getVendors(), api.getStockInventory()]);
      const vData = vResp.data?.data || vResp.data || [];
      setVendors(Array.isArray(vData) ? vData : []);
      setInventoryItems(iResp.data?.current_stocks || []);
      if (restaurantId) {
        const oneYearAgo = new Date(); oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const pResp = await api.getVendorItemList(restaurantId, { fromDate: oneYearAgo.toISOString().split("T")[0], toDate: new Date().toISOString().split("T")[0] });
        setPurchaseData(pResp.data || []);
      }
    } catch (err) {
      const code = err?.response?.data?.errors?.[0]?.code || err?.response?.data?.code || "";
      if (code === "VENDOR_PURCHASE_NOT_ALLOWED") setBlocked(true);
      else setError(err?.message || "Failed to load data");
    } finally { setLoading(false); }
  }, [restaurantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // BUG-030: Fetch real consumption data from daily-consumption-report
  useEffect(() => {
    const loadConsumption = async () => {
      try {
        const toDate = new Date();
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 14);
        const resp = await api.getDailyConsumptionReport({
          fromDate: fromDate.toISOString().split("T")[0],
          toDate: toDate.toISOString().split("T")[0],
        });
        const details = resp.data?.stock_details || [];
        const days = 14;
        const cMap = {};
        const nameMap = {};
        details.forEach((d) => {
          const ingId = d.ingredient_id;
          const ingName = (d.ingredient_name || "").toLowerCase().trim();
          const parsed = parseQtyString(d.quantity_deducted);
          if (ingId) { if (!cMap[ingId]) cMap[ingId] = { totalQty: 0, unit: parsed.unit }; cMap[ingId].totalQty += parsed.value; }
          if (ingName) { if (!nameMap[ingName]) nameMap[ingName] = { totalQty: 0, unit: parsed.unit }; nameMap[ingName].totalQty += parsed.value; }
        });
        const result = {};
        Object.entries(cMap).forEach(([id, data]) => { result[id] = { dailyQty: data.totalQty / days, unit: data.unit }; });
        Object.entries(nameMap).forEach(([name, data]) => { result[`name:${name}`] = { dailyQty: data.totalQty / days, unit: data.unit }; });
        setConsumptionMap(result);
      } catch (e) { console.warn("[PO] consumption data:", e); }
    };
    loadConsumption();
  }, []);

  // ── By Vendor Mode ──
  const selectedVendor = useMemo(() => vendors.find((v) => String(v.id) === selectedVendorId), [vendors, selectedVendorId]);

  const handleSelectVendor = (vendorId) => {
    setSelectedVendorId(vendorId);
    const vendorObj = vendors.find((v) => String(v.id) === vendorId);
    const vendorName = vendorObj?.vendor_name || "";

    const newLines = rawMaterialItems.map((item) => {
      // This vendor's records for this item
      const records = purchaseData.filter((r) => (r.vendor_id === Number(vendorId) || r.Vendor_Name === vendorName) && (r.ingredient_id === item.id || r.Ingredient_Name === item.stock_title) && Number(r.stock_quantity_raw) > 0);
      const totalAmt = records.reduce((s, r) => s + (Number(r.Amount) || 0), 0);
      const totalQty = records.reduce((s, r) => s + (Number(r.stock_quantity_raw) || 0), 0);
      const avgRate = totalQty > 0 ? totalAmt / totalQty : 0;
      const lastRecord = records.sort((a, b) => new Date(b.Purchase_Date) - new Date(a.Purchase_Date))[0];
      const lastRate = lastRecord ? Number(lastRecord.Amount) / Math.max(1, Number(lastRecord.stock_quantity_raw)) : 0;

      // Cheapest vendor for this item across ALL vendors
      const allVendorRates = getCheapestVendor(item.stock_title, item.id, purchaseData, vendors);
      const cheapest = allVendorRates[0];
      const isCheapest = cheapest && String(cheapest.vendorId) === vendorId;

      // Daily consumption estimate
      const allItemRecords = purchaseData.filter((r) => (r.Ingredient_Name === item.stock_title || r.ingredient_id === item.id) && Number(r.stock_quantity_raw) > 0);
      const sortedDates = allItemRecords.map((r) => new Date(r.Purchase_Date)).sort((a, b) => a - b);
      const totalPurchased = allItemRecords.reduce((s, r) => s + (Number(r.stock_quantity_raw) || 0), 0);
      // BUG-030: Use real consumption from daily-consumption-report, display_qty for stock
      // BUG-036: Normalize consumption unit (gm→kg) before calculations
      const cData = consumptionMap[item.id] || consumptionMap[`name:${(item.stock_title || "").toLowerCase().trim()}`];
      const rawDaily = cData ? cData.dailyQty : 0;
      const dailyConsumption = rawDaily > 0 ? normalizeToDisplayUnit(rawDaily, cData?.unit || "", item.unit || "") : 0;

      const currentQty = Number(item.display_qty) || 0; // BUG-030: display_qty not cal_quantity
      const daysOfCover = dailyConsumption > 0 ? Math.floor(currentQty / dailyConsumption) : null;
      const isLow = item.is_low_stock || currentQty === 0;

      // Frequency (purchases in last 30d)
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const freq = records.filter((r) => new Date(r.Purchase_Date) >= thirtyDaysAgo).length;

      // Suggested qty: target 30 days of cover
      const TARGET_DAYS = 30;
      let suggestedQty = "";
      if (dailyConsumption > 0) {
        const needed = Math.max(0, Math.ceil((TARGET_DAYS * dailyConsumption) - currentQty));
        suggestedQty = needed > 0 ? String(needed) : "";
      }

      // Urgency score for sorting
      const urgency = currentQty === 0 ? 0 : isLow ? 1 : daysOfCover !== null && daysOfCover < 14 ? 2 : daysOfCover !== null ? 3 + daysOfCover : 999;

      return {
        inventory_master_id: item.id, stock_title: item.stock_title, unit: item.unit,
        current_qty: currentQty, ordered_qty: isLow ? (suggestedQty || "10") : suggestedQty,
        ordered_unit: item.unit, expected_rate: avgRate > 0 ? avgRate.toFixed(2) : "",
        checked: isLow || (daysOfCover !== null && daysOfCover < 14),
        lastRate, avgRate, dailyConsumption, daysOfCover, freq, urgency,
        cheapestVendorName: cheapest?.vendorName || null,
        cheapestRate: cheapest?.rate || 0,
        isCheapest,
      };
    }).sort((a, b) => a.urgency - b.urgency);

    setVendorLines(newLines);
    setStep("items");
  };

  const toggleVendorLine = (idx) => setVendorLines((p) => p.map((l, i) => i === idx ? { ...l, checked: !l.checked } : l));
  const updateVendorLine = (idx, f, v) => setVendorLines((p) => p.map((l, i) => i === idx ? { ...l, [f]: v } : l));
  const checkedVendorLines = useMemo(() => vendorLines.filter((l) => l.checked && Number(l.ordered_qty) > 0), [vendorLines]);
  const vendorTotal = useMemo(() => checkedVendorLines.reduce((s, l) => s + Number(l.ordered_qty) * Number(l.expected_rate), 0), [checkedVendorLines]);

  // ── By Item Need Mode ──
  const initNeedLines = useCallback(() => {
    if (!rawMaterialItems.length) return;
    const lines = rawMaterialItems.map((item) => {
      const qty = Number(item.display_qty) || 0; // BUG-030: display_qty not cal_quantity
      const isLow = item.is_low_stock;
      const isEmpty = qty === 0;
      const vendorRates = getCheapestVendor(item.stock_title, item.id, purchaseData, vendors);
      const cheapest = vendorRates[0];
      // BUG-030: Use real consumption from daily-consumption-report
      // BUG-036: Normalize consumption unit (gm→kg) before calculations
      const cData = consumptionMap[item.id] || consumptionMap[`name:${(item.stock_title || "").toLowerCase().trim()}`];
      const rawDaily = cData ? cData.dailyQty : 0;
      const dailyConsumption = rawDaily > 0 ? normalizeToDisplayUnit(rawDaily, cData?.unit || "", item.unit || "") : 0;
      const daysOfCover = dailyConsumption > 0 ? Math.floor(qty / dailyConsumption) : null;
      // Urgency score (lower = more urgent)
      const urgency = isEmpty ? 0 : isLow ? 1 : daysOfCover !== null && daysOfCover < 14 ? 2 : daysOfCover !== null ? 3 + daysOfCover : 999;

      // Suggested qty: target 30 days of cover
      const TARGET_DAYS = 30;
      let suggestedQty = "";
      if (dailyConsumption > 0) {
        const needed = Math.max(0, Math.ceil((TARGET_DAYS * dailyConsumption) - qty));
        suggestedQty = needed > 0 ? String(needed) : "";
      }
      const shouldCheck = isEmpty || isLow || (daysOfCover !== null && daysOfCover < 14);

      // Other vendors (besides cheapest)
      const otherVendors = vendorRates.slice(1, 3);

      return {
        inventory_master_id: item.id, stock_title: item.stock_title, unit: item.unit,
        current_qty: qty, daily: dailyConsumption, dailyRaw: rawDaily, dailyUnit: cData?.unit || "", daysOfCover, isLow, isEmpty, urgency,
        selectedVendorId: cheapest ? String(cheapest.vendorId) : "",
        vendorOptions: vendorRates,
        otherVendors,
        ordered_qty: shouldCheck ? (suggestedQty || "10") : suggestedQty,
        expected_rate: cheapest ? cheapest.rate.toFixed(2) : "",
        checked: shouldCheck,
      };
    }).sort((a, b) => a.urgency - b.urgency);
    setNeedLines(lines);
  }, [rawMaterialItems, purchaseData, vendors, consumptionMap]);

  useEffect(() => { if (mode === "item" && needLines.length === 0) initNeedLines(); }, [mode, needLines.length, initNeedLines]);

  const toggleNeedLine = (idx) => setNeedLines((p) => p.map((l, i) => i === idx ? { ...l, checked: !l.checked } : l));
  const updateNeedLine = (idx, f, v) => {
    setNeedLines((p) => p.map((l, i) => {
      if (i !== idx) return l;
      const updated = { ...l, [f]: v };
      // If vendor changed, update rate
      if (f === "selectedVendorId") {
        const vr = l.vendorOptions.find((o) => String(o.vendorId) === v);
        if (vr) updated.expected_rate = vr.rate.toFixed(2);
      }
      return updated;
    }));
  };

  const checkedNeedLines = useMemo(() => needLines.filter((l) => l.checked && Number(l.ordered_qty) > 0 && l.selectedVendorId), [needLines]);

  // Auto-group by vendor for multi-PO with savings calc
  const poGroups = useMemo(() => {
    const groups = {};
    checkedNeedLines.forEach((l) => {
      const vid = l.selectedVendorId;
      if (!groups[vid]) {
        const v = vendors.find((v) => String(v.id) === vid);
        groups[vid] = { vendorId: vid, vendorName: v?.vendor_name || `Vendor ${vid}`, items: [], total: 0, altTotal: 0 };
      }
      const lineTotal = Number(l.ordered_qty) * Number(l.expected_rate || 0);
      // Compute what this would cost from the most expensive vendor
      const mostExpensive = l.vendorOptions.length > 1 ? l.vendorOptions[l.vendorOptions.length - 1] : null;
      const altCost = mostExpensive ? Number(l.ordered_qty) * mostExpensive.rate : lineTotal;
      groups[vid].items.push({ ...l, lineTotal });
      groups[vid].total += lineTotal;
      groups[vid].altTotal += altCost;
    });
    return Object.values(groups);
  }, [checkedNeedLines, vendors]);

  const needTotal = useMemo(() => poGroups.reduce((s, g) => s + g.total, 0), [poGroups]);

  // KPIs for By Item Need
  const needKPIs = useMemo(() => {
    const oos = rawMaterialItems.filter((i) => (Number(i.display_qty) || 0) === 0).length; // BUG-030
    const low = rawMaterialItems.filter((i) => i.is_low_stock && (Number(i.display_qty) || 0) > 0).length; // BUG-030
    return { oos, low, total: rawMaterialItems.length };
  }, [rawMaterialItems]);

  // ── Submit ──
  const handleSubmitVendor = async () => {
    if (checkedVendorLines.length === 0) return;
    setSubmitting(true);
    try {
      const payload = {
        vendor_id: Number(selectedVendorId),
        expected_delivery_date: expectedDate || undefined,
        notes: notes || undefined,
        payment_type: paymentType,
        tot_tax: 0,
        lines: checkedVendorLines.map((l) => ({
          inventory_master_id: l.inventory_master_id,
          ordered_qty: Number(l.ordered_qty),
          ordered_unit: l.ordered_unit,
          expected_rate: 0, // BUG-030: always send 0 to API
        })),
      };
      const resp = await api.createPO(payload);
      const poId = resp.data?.data?.id || resp.data?.id;
      toast({ title: `PO created: ${resp.data?.data?.reference_code || "Draft"}` });
      navigate(poId ? `/purchase/orders/${poId}` : "/purchase/orders");
    } catch (err) {
      toast({ title: err?.response?.data?.message || "Failed to create PO", variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  const handleSubmitNeed = async () => {
    if (poGroups.length === 0) return;
    setSubmitting(true);
    let created = 0;
    try {
      for (const group of poGroups) {
        const payload = {
          vendor_id: Number(group.vendorId),
          expected_delivery_date: expectedDate || undefined,
          notes: notes || undefined,
          payment_type: paymentType,
          tot_tax: 0,
          lines: group.items.map((l) => ({
            inventory_master_id: l.inventory_master_id,
            ordered_qty: Number(l.ordered_qty),
            ordered_unit: l.unit,
            expected_rate: 0, // BUG-030: always send 0 to API
          })),
        };
        await api.createPO(payload);
        created++;
      }
      toast({ title: `${created} PO${created > 1 ? "s" : ""} created as drafts` });
      navigate("/purchase/orders");
    } catch (err) {
      if (created > 0) toast({ title: `${created} of ${poGroups.length} POs created. Remaining failed.`, variant: "destructive" });
      else toast({ title: err?.response?.data?.message || "Failed to create POs", variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  if (blocked) {
    return (
      <div data-testid="po-create-blocked" className="flex flex-col items-center justify-center py-16 text-center">
        <ShieldX className="h-10 w-10 text-muted-foreground mb-3" />
        <h2 className="text-sm font-semibold mb-1">Purchase Not Available</h2>
        <p className="text-xs text-muted-foreground max-w-sm">Your store does not have vendor purchase access.</p>
      </div>
    );
  }
  if (loading) return <LoadingState lines={6} />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div data-testid="purchase-order-create">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" className="h-7" onClick={() => step === "select" ? navigate("/purchase/orders") : setStep("select")} data-testid="po-create-back">
          <ArrowLeft className="h-3.5 w-3.5" />
        </Button>
        <div>
          <h1 className="text-lg font-bold">New Purchase Order</h1>
          <p className="text-xs text-muted-foreground">
            {step === "select" ? "Choose how to build your order" : step === "items" ? "Select items and quantities" : "Review and submit"}
          </p>
        </div>
      </div>

      {/* Mode Tabs (always visible on select step) */}
      {step === "select" && (
        <div className="flex gap-2 mb-4" data-testid="po-mode-tabs">
          <button
            className={`px-4 py-2 rounded-lg text-xs font-medium border transition-colors ${mode === "vendor" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"}`}
            onClick={() => { setMode("vendor"); setStep("select"); }}
            data-testid="po-mode-vendor"
          >
            By Vendor
          </button>
          <button
            className={`px-4 py-2 rounded-lg text-xs font-medium border transition-colors ${mode === "item" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"}`}
            onClick={() => { setMode("item"); setStep("select"); initNeedLines(); }}
            data-testid="po-mode-item"
          >
            By Item Need
          </button>
        </div>
      )}

      {/* ═══════════════ BY VENDOR MODE ═══════════════ */}
      {mode === "vendor" && step === "select" && (
        <div className="space-y-3" data-testid="po-vendor-select">
          <p className="text-sm font-medium mb-2">Select Vendor</p>
          {vendors.length === 0 ? <EmptyState title="No vendors" description="Add vendors first." /> : (
            <div className="grid grid-cols-3 gap-3">
              {vendors.map((v) => {
                const records = purchaseData.filter((r) => r.Vendor_Name === v.vendor_name || r.vendor_id === v.id);
                const totalSpend = records.reduce((s, r) => s + (Number(r.Amount) || 0), 0);
                const sorted = [...records].sort((a, b) => new Date(b.Purchase_Date) - new Date(a.Purchase_Date));
                const last = sorted[0];
                const lastDaysAgo = last ? Math.floor((Date.now() - new Date(last.Purchase_Date).getTime()) / (1000*60*60*24)) : null;
                const isActive = lastDaysAgo !== null && lastDaysAgo <= 60;
                // Orders in last 30d
                const now = new Date();
                const thirtyAgo = new Date(now.getTime() - 30*24*60*60*1000);
                const recentRecords = records.filter((r) => new Date(r.Purchase_Date) >= thirtyAgo);
                const distinctDates = [...new Set(recentRecords.map((r) => r.Purchase_Date))];
                const avgOrder = distinctDates.length > 0 ? totalSpend / distinctDates.length : 0;
                const distinctItems = [...new Set(records.map((r) => r.Ingredient_Name))];
                // Cheapest for X items
                let cheapestCount = 0;
                const allItems = [...new Set(purchaseData.map((r) => r.Ingredient_Name))];
                allItems.forEach((itemName) => {
                  const rates = getCheapestVendor(itemName, null, purchaseData, vendors);
                  if (rates.length > 0 && String(rates[0].vendorId) === String(v.id)) cheapestCount++;
                });
                return (
                  <Card key={v.id} data-testid={`po-vendor-card-${v.id}`} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => handleSelectVendor(String(v.id))}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">{v.vendor_name}</p>
                        {records.length > 0 ? (
                          isActive ? <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span>
                          : <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">Inactive {lastDaysAgo}d</span>
                        ) : <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 border border-slate-200">New</span>}
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-2 text-[10px] text-muted-foreground">
                        <span>Last: {last ? (lastDaysAgo === 0 ? "Today" : lastDaysAgo === 1 ? "Yesterday" : `${lastDaysAgo}d ago`) : "Never"}</span>
                        <span>{distinctDates.length} orders/30d</span>
                        <span>Avg: {formatCurrency(avgOrder)}</span>
                        <span>{distinctItems.length} items &middot; {formatCurrency(totalSpend)}</span>
                      </div>
                      {cheapestCount > 0 && (
                        <div className="mt-1.5">
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium" data-testid={`vendor-cheapest-${v.id}`}>Cheapest for {cheapestCount} items</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {mode === "vendor" && step === "items" && (
        <div className="space-y-4" data-testid="po-vendor-items">
          <Card>
            <CardHeader className="py-2 px-4"><CardTitle className="text-sm flex items-center gap-2"><ShoppingCart className="h-4 w-4" />PO for {selectedVendor?.vendor_name}</CardTitle></CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-4 gap-3">
                <div><Label className="text-xs">Expected Delivery</Label><Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className="h-8 text-xs" data-testid="po-expected-date" /></div>
                <div><Label className="text-xs">Payment</Label>
                  <Select value={paymentType} onValueChange={setPaymentType}><SelectTrigger className="h-8 text-xs" data-testid="po-payment-type"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Cash">Cash</SelectItem><SelectItem value="Credit">Credit</SelectItem><SelectItem value="Online">Online</SelectItem></SelectContent></Select></div>
                <div className="col-span-2"><Label className="text-xs">Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} className="h-8 text-xs" placeholder="Optional" data-testid="po-notes" /></div>
              </div>
            </CardContent>
          </Card>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input data-testid="po-vendor-search" placeholder="Search items..." value={vendorSearch} onChange={(e) => setVendorSearch(e.target.value)} className="pl-8 h-8 text-xs" />
          </div>

          <Card><CardContent className="py-0 px-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-[10px] w-10"></TableHead>
                <TableHead className="text-[10px]">Item</TableHead>
                <TableHead className="text-[10px] text-right">Last Rate</TableHead>
                <TableHead className="text-[10px] text-right">Avg Rate</TableHead>
                <TableHead className="text-[10px]">Cheapest</TableHead>
                <TableHead className="text-[10px] text-right">Stock</TableHead>
                <TableHead className="text-[10px] text-right">DoC</TableHead>
                <TableHead className="text-[10px] text-right">Qty</TableHead>
                <TableHead className="text-[10px] text-right">Expected Rate</TableHead>
                <TableHead className="text-[10px] text-right">Total</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {vendorLines.filter((l) => !vendorSearch.trim() || (l.stock_title || "").toLowerCase().includes(vendorSearch.toLowerCase())).map((l, idx) => {
                  const realIdx = vendorLines.indexOf(l);
                  const t = Number(l.ordered_qty || 0) * Number(l.expected_rate || 0);
                  return (
                    <TableRow key={l.inventory_master_id} data-testid={`po-vline-${l.inventory_master_id}`} className={l.checked ? "bg-primary/5" : ""}>
                      <TableCell className="py-1.5"><Checkbox checked={l.checked} onCheckedChange={() => toggleVendorLine(realIdx)} /></TableCell>
                      <TableCell className="py-1.5 text-xs">
                        <span className="font-medium">{l.stock_title}</span>
                        {l.current_qty === 0 && <Badge variant="destructive" className="text-[8px] px-1 py-0 ml-1">OOS</Badge>}
                        {l.current_qty > 0 && l.daysOfCover !== null && l.daysOfCover < 7 && <span className="text-[8px] text-red-600 ml-1">Low</span>}
                        {l.current_qty > 0 && l.daysOfCover !== null && l.daysOfCover >= 7 && l.daysOfCover < 14 && <span className="text-[8px] text-amber-600 ml-1">Moderate</span>}
                      </TableCell>
                      <TableCell className="py-1.5 text-xs text-right font-mono text-muted-foreground">{l.lastRate > 0 ? formatCurrency(l.lastRate) : "\u2014"}</TableCell>
                      <TableCell className="py-1.5 text-xs text-right font-mono text-muted-foreground">{l.avgRate > 0 ? formatCurrency(l.avgRate) : "\u2014"}</TableCell>
                      <TableCell className="py-1.5 text-[10px]">
                        {l.isCheapest ? <span className="text-emerald-600">{"\u2713"} This vendor</span> :
                         l.cheapestVendorName ? <span className="text-amber-600">{l.cheapestVendorName} {formatCurrency(l.cheapestRate)}</span> :
                         <span className="text-muted-foreground">{"\u2014"}</span>}
                      </TableCell>
                      <TableCell className="py-1.5 text-xs text-right tabular-nums">{l.current_qty} {l.unit}</TableCell>
                      <TableCell className="py-1.5 text-xs text-right">
                        <span className={`tabular-nums ${l.daysOfCover !== null && l.daysOfCover < 7 ? "text-red-600 font-semibold" : l.daysOfCover !== null && l.daysOfCover < 14 ? "text-amber-600" : "text-muted-foreground"}`}>
                          {l.daysOfCover !== null ? `${l.daysOfCover}d` : "\u2014"}
                        </span>
                      </TableCell>
                      <TableCell className="py-1.5"><Input type="number" value={l.ordered_qty} onChange={(e) => updateVendorLine(realIdx, "ordered_qty", e.target.value)} className="h-7 text-xs w-16 ml-auto text-right" disabled={!l.checked} /></TableCell>
                      <TableCell className="py-1.5 text-xs text-right font-mono text-muted-foreground">{l.expected_rate ? formatCurrency(Number(l.expected_rate)) : "\u20B90"}</TableCell>
                      <TableCell className="py-1.5 text-xs text-right font-mono">{l.checked && t > 0 ? formatCurrency(t) : "\u2014"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent></Card>

          {/* TIP banner: items cheaper from another vendor */}
          {(() => {
            const cheaperElsewhere = checkedVendorLines.filter((l) => l.checked && !l.isCheapest && l.cheapestVendorName && l.avgRate > 0);
            if (cheaperElsewhere.length === 0) return null;
            const names = [...new Set(cheaperElsewhere.map((l) => l.cheapestVendorName))];
            return (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200" data-testid="po-tip-banner">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-800">
                  <span className="font-semibold">TIP:</span> {cheaperElsewhere.map((l) => l.stock_title).join(", ")} {cheaperElsewhere.length === 1 ? "is" : "are"} cheaper from {names.join(" / ")}. Consider splitting your order.
                </div>
              </div>
            );
          })()}

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{checkedVendorLines.length} items</p>
            <div className="flex items-center gap-3">
              <p className="text-sm font-semibold" data-testid="po-vendor-total">Total: {formatCurrency(vendorTotal)}</p>
              <Button size="sm" className="h-8 text-xs gap-1" onClick={() => setStep("review")} disabled={checkedVendorLines.length === 0} data-testid="po-vendor-review">Review <ArrowRight className="h-3 w-3" /></Button>
            </div>
          </div>
        </div>
      )}

      {mode === "vendor" && step === "review" && (
        <div className="space-y-4" data-testid="po-vendor-review-step">
          <Card><CardHeader className="py-2 px-4"><CardTitle className="text-sm">Order Summary</CardTitle></CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-4 gap-4 text-xs mb-4">
                <div><span className="text-muted-foreground">Vendor:</span> <span className="font-medium">{selectedVendor?.vendor_name}</span></div>
                <div><span className="text-muted-foreground">Payment:</span> <span className="font-medium">{paymentType}</span></div>
                <div><span className="text-muted-foreground">Delivery:</span> <span className="font-medium">{expectedDate || "Not set"}</span></div>
                <div><span className="text-muted-foreground">Items:</span> <span className="font-medium">{checkedVendorLines.length}</span></div>
              </div>
              <Table><TableHeader><TableRow>
                <TableHead className="text-[10px]">Item</TableHead><TableHead className="text-[10px] text-right">Qty</TableHead><TableHead className="text-[10px]">Unit</TableHead><TableHead className="text-[10px] text-right">Rate</TableHead><TableHead className="text-[10px] text-right">Total</TableHead>
              </TableRow></TableHeader><TableBody>
                {checkedVendorLines.map((l) => (
                  <TableRow key={l.inventory_master_id}><TableCell className="text-xs font-medium">{l.stock_title}</TableCell><TableCell className="text-xs text-right tabular-nums">{l.ordered_qty}</TableCell><TableCell className="text-xs">{l.ordered_unit}</TableCell><TableCell className="text-xs text-right font-mono">{formatCurrency(Number(l.expected_rate))}</TableCell><TableCell className="text-xs text-right font-mono">{formatCurrency(Number(l.ordered_qty) * Number(l.expected_rate))}</TableCell></TableRow>
                ))}
              </TableBody></Table>
              <div className="flex justify-end pt-3 border-t mt-3"><p className="text-sm font-bold">Total: {formatCurrency(vendorTotal)}</p></div>
            </CardContent>
          </Card>
          <div className="flex justify-between">
            <Button variant="ghost" size="sm" onClick={() => setStep("items")}><ArrowLeft className="h-3 w-3 mr-1" />Back</Button>
            <Button size="sm" className="h-8 text-xs gap-1" onClick={handleSubmitVendor} disabled={submitting} data-testid="po-vendor-submit">
              {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}Create PO
            </Button>
          </div>
        </div>
      )}

      {/* ═══════════════ BY ITEM NEED MODE ═══════════════ */}
      {mode === "item" && step === "select" && (
        <div className="space-y-4" data-testid="po-item-need">
          {/* KPI cards */}
          <div className="grid grid-cols-4 gap-3">
            <Card className="bg-red-50 border-red-200"><CardContent className="py-3 px-3">
              <p className="text-[10px] text-red-600 uppercase">Out of Stock</p><p className="text-lg font-bold text-red-700" data-testid="kpi-oos">{needKPIs.oos}</p>
            </CardContent></Card>
            <Card className="bg-amber-50 border-amber-200"><CardContent className="py-3 px-3">
              <p className="text-[10px] text-amber-600 uppercase">Low Stock</p><p className="text-lg font-bold text-amber-700" data-testid="kpi-low">{needKPIs.low}</p>
            </CardContent></Card>
            <Card className="bg-blue-50 border-blue-200"><CardContent className="py-3 px-3">
              <p className="text-[10px] text-blue-600 uppercase">Below 14d Cover</p><p className="text-lg font-bold text-blue-700" data-testid="kpi-below-reorder">{needLines.filter((l) => l.daysOfCover !== null && l.daysOfCover < 14 && !l.isEmpty && !l.isLow).length}</p>
            </CardContent></Card>
            <Card><CardContent className="py-3 px-3">
              <p className="text-[10px] text-muted-foreground uppercase">Total Items</p><p className="text-lg font-bold" data-testid="kpi-total">{needKPIs.total}</p>
            </CardContent></Card>
          </div>

          <p className="text-xs font-medium text-muted-foreground">Items sorted by urgency (lowest cover first). Select items to purchase.</p>

          {/* BUG-030: Search for item-need mode */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input data-testid="po-need-search" placeholder="Search items..." value={needSearch} onChange={(e) => setNeedSearch(e.target.value)} className="pl-8 h-8 text-xs" />
          </div>

          <Card><CardContent className="py-0 px-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-[10px] w-8"></TableHead>
                <TableHead className="text-[10px]">Item</TableHead>
                <TableHead className="text-[10px] text-right">Stock</TableHead>
                <TableHead className="text-[10px] text-right">Daily Consumption</TableHead>
                <TableHead className="text-[10px] text-right">
                  <TooltipProvider><Tooltip><TooltipTrigger asChild>
                    <span className="flex items-center justify-end gap-0.5">Days Will Last <Info className="h-2.5 w-2.5 text-muted-foreground" /></span>
                  </TooltipTrigger><TooltipContent className="max-w-xs"><p className="text-xs">Current Stock ÷ Avg Daily Consumption (estimated from purchase history over the last year)</p></TooltipContent></Tooltip></TooltipProvider>
                </TableHead>
                <TableHead className="text-[10px]">Best Vendor</TableHead>
                <TableHead className="text-[10px] text-right">Expected Rate</TableHead>
                <TableHead className="text-[10px]">Other Vendors</TableHead>
                <TableHead className="text-[10px] text-right">Qty</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {needLines.filter((l) => !needSearch.trim() || l.stock_title.toLowerCase().includes(needSearch.toLowerCase())).map((l, idx) => (
                  <TableRow key={l.inventory_master_id} data-testid={`po-need-${l.inventory_master_id}`} className={l.checked ? "bg-primary/5" : ""}>
                    <TableCell className="py-1.5"><Checkbox checked={l.checked} onCheckedChange={() => toggleNeedLine(idx)} /></TableCell>
                    <TableCell className="py-1.5 text-xs">
                      <span className="font-medium">{l.stock_title}</span>
                      {l.isEmpty && <><br/><span className="text-[9px] text-red-600 font-semibold">OUT OF STOCK</span></>}
                      {l.isLow && !l.isEmpty && <><br/><span className="text-[9px] text-amber-600">LOW {l.daysOfCover !== null ? `\u2014 ${l.daysOfCover}d` : ""}</span></>}
                      {!l.isLow && !l.isEmpty && l.daysOfCover !== null && l.daysOfCover < 14 && <><br/><span className="text-[9px] text-blue-600">{l.daysOfCover}d left</span></>}
                    </TableCell>
                    <TableCell className="py-1.5 text-xs text-right tabular-nums">{l.current_qty} {l.unit}</TableCell>
                    <TableCell className="py-1.5 text-xs text-right tabular-nums text-muted-foreground">{l.daily > 0 ? (smartConsumptionDisplay(l.dailyRaw, l.dailyUnit, l.unit)?.text || `${l.daily.toFixed(3)} ${l.unit}/d`) : "\u2014"}</TableCell>
                    <TableCell className="py-1.5 text-xs text-right">
                      <span className={`tabular-nums ${l.daysOfCover !== null && l.daysOfCover < 7 ? "text-red-600 font-semibold" : l.daysOfCover !== null && l.daysOfCover < 14 ? "text-amber-600" : "text-muted-foreground"}`}>
                        {l.daysOfCover !== null ? `${l.daysOfCover}d` : "\u2014"}
                      </span>
                    </TableCell>
                    <TableCell className="py-1.5">
                      {l.vendorOptions.length > 0 ? (
                        <Select value={l.selectedVendorId} onValueChange={(v) => updateNeedLine(idx, "selectedVendorId", v)}>
                          <SelectTrigger className="h-7 text-[10px] w-36"><SelectValue placeholder="Vendor" /></SelectTrigger>
                          <SelectContent>{l.vendorOptions.map((vo) => (
                            <SelectItem key={vo.vendorId} value={String(vo.vendorId)}>{vo.vendorName} {formatCurrency(vo.rate)}</SelectItem>
                          ))}</SelectContent>
                        </Select>
                      ) : (
                        <Select value={l.selectedVendorId} onValueChange={(v) => updateNeedLine(idx, "selectedVendorId", v)}>
                          <SelectTrigger className="h-7 text-[10px] w-36">
                            <SelectValue placeholder={<span className="flex items-center gap-1 text-muted-foreground"><UserPlus className="h-3 w-3" />Pick vendor</span>} />
                          </SelectTrigger>
                          <SelectContent>{vendors.map((v) => (
                            <SelectItem key={v.id} value={String(v.id)}>{v.vendor_name}</SelectItem>
                          ))}</SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="py-1.5 text-xs text-right font-mono text-muted-foreground">{l.expected_rate ? formatCurrency(Number(l.expected_rate)) : "\u20B90"}</TableCell>
                    <TableCell className="py-1.5 text-[10px] text-muted-foreground">
                      {(l.otherVendors || []).map((ov, i) => (
                        <span key={i}>{ov.vendorName} {formatCurrency(ov.rate)}{i < (l.otherVendors || []).length - 1 ? ", " : ""}</span>
                      ))}
                      {(!l.otherVendors || l.otherVendors.length === 0) && "\u2014"}
                    </TableCell>
                    <TableCell className="py-1.5"><Input type="number" value={l.ordered_qty} onChange={(e) => updateNeedLine(idx, "ordered_qty", e.target.value)} className="h-7 text-[10px] w-16 ml-auto text-right" disabled={!l.checked} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>

          {/* Auto-group preview */}
          {poGroups.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">Auto-grouped by vendor ({checkedNeedLines.length} items \u2192 {poGroups.length} PO{poGroups.length > 1 ? "s" : ""})</p>
              <div className="grid grid-cols-2 gap-3">
                {poGroups.map((g, gi) => (
                  <Card key={g.vendorId} data-testid={`po-group-${gi}`} className="border-primary/20">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold flex items-center gap-1"><Package className="h-3 w-3" />PO #{gi + 1} \u2014 {g.vendorName}</span>
                        <span className="text-xs font-mono font-medium">{formatCurrency(g.total)}</span>
                      </div>
                      {g.items.map((item) => (
                        <div key={item.inventory_master_id} className="flex justify-between text-[10px] text-muted-foreground">
                          <span>{item.stock_title}</span>
                          <span className="tabular-nums">{item.ordered_qty} {item.unit} @ {formatCurrency(Number(item.expected_rate))}</span>
                        </div>
                      ))}
                      {g.altTotal > g.total && (
                        <div className="mt-2 pt-1.5 border-t text-[10px] text-emerald-700 font-medium" data-testid={`po-group-savings-${gi}`}>
                          Savings: {formatCurrency(g.altTotal - g.total)} ({Math.round((1 - g.total / g.altTotal) * 100)}%) vs most expensive option
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Order details + submit */}
          <Card><CardContent className="p-4">
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">Expected Delivery</Label><Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className="h-8 text-xs" data-testid="po-need-date" /></div>
              <div><Label className="text-xs">Payment</Label>
                <Select value={paymentType} onValueChange={setPaymentType}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Cash">Cash</SelectItem><SelectItem value="Credit">Credit</SelectItem><SelectItem value="Online">Online</SelectItem></SelectContent></Select></div>
              <div><Label className="text-xs">Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} className="h-8 text-xs" placeholder="Optional" /></div>
            </div>
          </CardContent></Card>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{checkedNeedLines.length} items \u2192 {poGroups.length} PO{poGroups.length > 1 ? "s" : ""}</p>
            <div className="flex items-center gap-3">
              <p className="text-sm font-semibold" data-testid="po-need-total">Total: {formatCurrency(needTotal)}</p>
              <Button size="sm" className="h-8 text-xs gap-1" onClick={handleSubmitNeed} disabled={submitting || poGroups.length === 0} data-testid="po-need-submit">
                {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                Create {poGroups.length} PO{poGroups.length > 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
