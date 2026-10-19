// CR-051 — Purchase Report Screen
import { useState, useEffect, useMemo } from "react";
import { useLoginContext } from "@/hooks/useLoginContext";
import api from "@/services/api";
import { mapRestaurantType } from "@/lib/terminology";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/common/StateDisplays";
import { Download, ChevronDown, ChevronRight, FileText } from "lucide-react";

const PAYMENT_PILLS = ["all", "Cash", "Card", "UPI", "Bank Transfer", "Others"];

function todayStr()  { return new Date().toISOString().split("T")[0]; }
function last30dStr() {
  const d = new Date(); d.setDate(d.getDate() - 30);
  return d.toISOString().split("T")[0];
}

export default function PurchaseReport() {
  const { restaurantId, restaurantType } = useLoginContext();
  const isMultiStore = restaurantType === "master" || restaurantType === "central";

  // ── Filters ────────────────────────────────────────────────────
  const [fromDate,      setFromDate]      = useState(last30dStr);
  const [toDate,        setToDate]        = useState(todayStr);
  const [vendorFilter,  setVendorFilter]  = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [searchText,    setSearchText]    = useState("");

  // ── Data ───────────────────────────────────────────────────────
  const [rows,        setRows]        = useState([]);
  const [totalAmount, setTotalAmount] = useState("0");
  const [summary,     setSummary]     = useState({});
  const [byRestaurant,setByRestaurant]= useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [exporting,   setExporting]   = useState(false);
  const [storeOpen,   setStoreOpen]   = useState(false);

  // ── Fetch (400ms debounce on filter changes) ───────────────────
  useEffect(() => {
    if (!restaurantId) return;
    const t = setTimeout(() => {
      setLoading(true); setError("");
      api.getVendorItemListFull(restaurantId, {
        fromDate,
        toDate,
        ...(vendorFilter && { vendorId: vendorFilter }),
        paymentType: paymentFilter,
      }).then(resp => {
        const d = resp.data || {};
        setRows(d.data || []);
        setTotalAmount(d.total_amount ?? "0");
        setSummary(d.summary || {});
        setByRestaurant(d.by_restaurant || []);
      }).catch(() => setError("Failed to load purchase report."))
        .finally(() => setLoading(false));
    }, 400);
    return () => clearTimeout(t);
  }, [restaurantId, fromDate, toDate, vendorFilter, paymentFilter]);

  // ── Client-side ingredient search ─────────────────────────────
  const displayRows = useMemo(() =>
    !searchText
      ? rows
      : rows.filter(r => (r.Ingredient_Name || "").toLowerCase().includes(searchText.toLowerCase())),
    [rows, searchText]);

  // ── Unique vendors from fetched data (for dropdown) ────────────
  const vendors = useMemo(() => {
    const seen = new Map();
    rows.forEach(r => { if (r.vendor_id && r.Vendor_Name) seen.set(r.vendor_id, r.Vendor_Name); });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [rows]);

  // ── Export ─────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const resp = await api.exportInventoryMaster();
      const url = resp.data?.download_url || resp.data?.data?.download_url;
      if (url) window.open(url, "_blank");
    } catch { /* silent */ }
    finally { setExporting(false); }
  };

  return (
    <div className="p-4 max-w-full" data-testid="purchase-report-page">

      {/* ── Header toolbar ── */}
      <div className="flex items-center gap-2 mb-3 border border-border rounded-lg px-3 py-2 bg-background flex-wrap">
        <FileText className="h-4 w-4 text-primary shrink-0" />
        <span className="font-bold text-sm shrink-0">Purchase Report</span>
        <div className="w-px h-4 bg-border shrink-0" />

        {/* Date range */}
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
          className="h-7 border border-input rounded px-2 text-xs bg-background focus:outline-none focus:border-primary"
          data-testid="pr-from-date" />
        <span className="text-xs text-muted-foreground">–</span>
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
          className="h-7 border border-input rounded px-2 text-xs bg-background focus:outline-none focus:border-primary"
          data-testid="pr-to-date" />

        <div className="w-px h-4 bg-border shrink-0" />

        {/* Vendor filter */}
        <select value={vendorFilter} onChange={e => setVendorFilter(e.target.value)}
          className="h-7 border border-input rounded px-2 text-xs bg-background focus:outline-none focus:border-primary"
          data-testid="pr-vendor-filter">
          <option value="">All Vendors</option>
          {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>

        {/* Ingredient search */}
        <Input placeholder="Search ingredient…" value={searchText}
          onChange={e => setSearchText(e.target.value)}
          className="h-7 text-xs w-36" data-testid="pr-search" />

        {/* Payment type pills */}
        <div className="flex gap-1 flex-wrap" data-testid="pr-payment-pills">
          {PAYMENT_PILLS.map(p => (
            <button key={p}
              className={`h-6 px-2.5 rounded-full text-[10px] border transition-colors font-medium
                ${paymentFilter === p
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background text-muted-foreground border-border hover:bg-muted"}`}
              onClick={() => setPaymentFilter(p)}
              data-testid={`pr-pill-${p.toLowerCase().replace(/\s+/g, "-")}`}>
              {p === "all" ? "ALL" : p}
            </button>
          ))}
        </div>

        {/* Export */}
        <Button size="sm" variant="outline" onClick={handleExport} disabled={exporting}
          className="h-7 text-xs ml-auto shrink-0" data-testid="pr-export">
          <Download className="h-3 w-3 mr-1.5" />
          {exporting ? "Exporting…" : "Export Excel"}
        </Button>
      </div>

      {/* ── Summary bar ── */}
      {!loading && rows.length > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 bg-background border border-border rounded-lg mb-3 text-xs flex-wrap"
          data-testid="pr-summary-bar">
          <span className="font-bold text-base text-foreground">
            ₹{Number(totalAmount).toLocaleString("en-IN")}
          </span>
          <span className="text-muted-foreground">Total</span>
          <span className="text-muted-foreground">·</span>
          <span className="font-semibold">{summary.total_records ?? displayRows.length}</span>
          <span className="text-muted-foreground">purchases</span>
          {isMultiStore && typeof summary.scope_store_count === "number" && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="font-semibold">{summary.scope_store_count}</span>
              <span className="text-muted-foreground">
                store{summary.scope_store_count !== 1 ? "s" : ""}
              </span>
            </>
          )}
        </div>
      )}

      {/* ── By-store accordion (master/central only) ── */}
      {isMultiStore && byRestaurant.length > 0 && (
        <div className="mb-3 border border-border rounded-lg overflow-hidden" data-testid="pr-store-accordion">
          <button onClick={() => setStoreOpen(o => !o)}
            className="w-full flex items-center gap-2 px-3 py-2 bg-muted/30 hover:bg-muted/50 text-xs font-medium select-none">
            {storeOpen
              ? <ChevronDown className="h-3 w-3 text-muted-foreground" />
              : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            By Store ({byRestaurant.length})
          </button>
          {storeOpen && (
            <div className="divide-y divide-border/30">
              {byRestaurant.map(s => (
                <div key={s.restaurant_id}
                  className="flex items-center justify-between px-4 py-1.5 text-xs">
                  <span className="font-medium">{s.restaurant_name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] py-0 px-1.5">
                      {mapRestaurantType(s.restaurant_type_flag)}
                    </Badge>
                    <span className="text-muted-foreground tabular-nums">
                      {s.line_count} purchase{s.line_count !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── States ── */}
      {error && (
        <div className="text-xs text-red-600 px-3 py-2 border border-red-200 bg-red-50 rounded-lg mb-3"
          data-testid="pr-error">{error}</div>
      )}
      {loading && rows.length === 0 && <LoadingState lines={3} />}
      {!loading && !error && displayRows.length === 0 && (
        <div className="text-center text-sm text-muted-foreground py-16 border border-border rounded-lg"
          data-testid="pr-empty">
          No purchases found for the selected filters.
        </div>
      )}

      {/* ── Table ── */}
      {displayRows.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs" data-testid="pr-table">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  {["Date", isMultiStore && "Store", "Ingredient", "Vendor",
                    "Qty", "Unit Price", "Amount", "Payment", "Invoice #", "Txn ID"]
                    .filter(Boolean).map(h => (
                      <th key={h}
                        className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {displayRows.map(r => (
                  <tr key={r.ID}
                    className="border-b border-border/20 hover:bg-muted/10 transition-colors"
                    data-testid={`pr-row-${r.ID}`}>
                    <td className="px-3 py-1.5 whitespace-nowrap tabular-nums text-muted-foreground">
                      {r.Purchase_Date}
                    </td>
                    {isMultiStore && (
                      <td className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">
                        {r.Restaurant_Name}
                      </td>
                    )}
                    <td className="px-3 py-1.5 font-medium">{r.Ingredient_Name}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{r.Vendor_Name}</td>
                    <td className="px-3 py-1.5 tabular-nums whitespace-nowrap">{r.Quantity}</td>
                    <td className="px-3 py-1.5 tabular-nums whitespace-nowrap text-muted-foreground">
                      {/* BUG-056 B1: unit_price is per-gram; compute per-display-unit via line_total/stock_quantity_raw */}
                      {r.stock_quantity_raw > 0 && r.line_total > 0
                        ? `₹${(r.line_total / r.stock_quantity_raw).toLocaleString("en-IN")}`
                        : "—"}
                    </td>
                    <td className="px-3 py-1.5 tabular-nums font-semibold whitespace-nowrap">
                      ₹{Number(r.line_total).toLocaleString("en-IN")}
                    </td>
                    <td className="px-3 py-1.5">
                      {/* BUG-056 B2: render partial_payments legs when present; fallback to Payment_Type badge */}
                      {r.Payment_Type === "partial" && r.partial_payments?.length > 0
                        ? <div className="flex flex-col gap-0.5">
                            {r.partial_payments.map((leg, i) => (
                              <span key={i} className="text-[10px] whitespace-nowrap">
                                {leg.payment_mode} ₹{Number(leg.amount).toLocaleString("en-IN")}
                              </span>
                            ))}
                          </div>
                        : r.Payment_Type
                          ? <Badge variant="outline" className="text-[9px] py-0 px-1.5 whitespace-nowrap">{r.Payment_Type}</Badge>
                          : <span className="text-muted-foreground">—</span>}
                    </td>
                    {/* CR-051 A2 — Invoice # column (store-only, no duplicate check) */}
                    <td className="px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
                      {r.invoice_number || "—"}
                    </td>
                    <td className="px-3 py-1.5 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                      {r.transaction_id || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {searchText && displayRows.length < rows.length && (
            <div className="px-3 py-1.5 text-[10px] text-muted-foreground border-t border-border/30 bg-muted/10">
              Showing {displayRows.length} of {rows.length} records
            </div>
          )}
        </div>
      )}
    </div>
  );
}
