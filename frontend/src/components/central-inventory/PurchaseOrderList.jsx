import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLoginContext } from "@/hooks/useLoginContext";
import api from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/StateDisplays";
import { ShoppingCart, Plus, Search, ShieldX } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "approved", label: "Approved" },
  { value: "sent", label: "Sent" },
  { value: "partially_received", label: "Partial" },
  { value: "received", label: "Received" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_COLORS = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  approved: "bg-blue-50 text-blue-700 border-blue-200",
  sent: "bg-indigo-50 text-indigo-700 border-indigo-200",
  partially_received: "bg-amber-50 text-amber-700 border-amber-200",
  received: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed: "bg-slate-50 text-slate-600 border-slate-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
};

function formatCurrency(n) {
  if (n == null || isNaN(n)) return "\u20B90";
  return `\u20B9${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export default function PurchaseOrderList() {
  const navigate = useNavigate();
  const { isTopLevel, restaurantType } = useLoginContext();
  const isFranchise = restaurantType === "franchise";

  const [pos, setPOs] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [blocked, setBlocked] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null); setBlocked(false);
    try {
      const params = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (vendorFilter !== "all") params.vendorId = vendorFilter;
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      const [poResp, vendorResp] = await Promise.all([api.listPOs(params), api.getVendors()]);
      const poData = poResp.data?.data || poResp.data || [];
      setPOs(Array.isArray(poData) ? poData : []);
      const vData = vendorResp.data?.data || vendorResp.data || [];
      setVendors(Array.isArray(vData) ? vData : []);
    } catch (err) {
      const code = err?.response?.data?.errors?.[0]?.code || err?.response?.data?.code || "";
      if (code === "VENDOR_PURCHASE_NOT_ALLOWED") setBlocked(true);
      else setError(err?.response?.data?.message || "Failed to load purchase orders");
    } finally { setLoading(false); }
  }, [statusFilter, vendorFilter, fromDate, toDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const statusCounts = useMemo(() => {
    const counts = {};
    pos.forEach((po) => { counts[po.status] = (counts[po.status] || 0) + 1; });
    return counts;
  }, [pos]);

  const kpis = useMemo(() => {
    const awaiting = pos.filter((p) => p.status === "sent" || p.status === "approved").length;
    const partial = pos.filter((p) => p.status === "partially_received").length;
    const monthTotal = pos.filter((p) => {
      const d = new Date(p.created_at);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((s, p) => s + (Number(p.tot_amount) || 0), 0);
    return { total: pos.length, awaiting, partial, monthTotal };
  }, [pos]);

  const filtered = useMemo(() => {
    if (!search.trim()) return pos;
    const q = search.toLowerCase();
    return pos.filter((po) =>
      (po.reference_code || "").toLowerCase().includes(q) ||
      (po.vendor_name || "").toLowerCase().includes(q)
    );
  }, [pos, search]);

  if (blocked) {
    return (
      <div data-testid="po-list-blocked" className="flex flex-col items-center justify-center py-16 text-center">
        <ShieldX className="h-10 w-10 text-muted-foreground mb-3" />
        <h2 className="text-sm font-semibold mb-1">Purchase Orders Not Available</h2>
        <p className="text-xs text-muted-foreground max-w-sm">
          Your store does not have vendor purchase access. Stock is received from your parent store via inventory transfers.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="purchase-order-list">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2"><ShoppingCart className="h-5 w-5" /> Purchase Orders</h1>
          <p className="text-xs text-muted-foreground">Manage vendor purchase orders and goods receiving</p>
        </div>
        <Button size="sm" className="h-8 text-xs gap-1" onClick={() => navigate("/purchase/orders/new")} data-testid="create-po-btn">
          <Plus className="h-3 w-3" /> Create PO
        </Button>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 mb-3 flex-wrap">
        {STATUS_TABS.map((tab) => {
          const count = tab.value === "all" ? pos.length : (statusCounts[tab.value] || 0);
          const isActive = statusFilter === tab.value;
          return (
            <button
              key={tab.value}
              data-testid={`po-tab-${tab.value}`}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                isActive ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"
              }`}
              onClick={() => setStatusFilter(tab.value)}
            >
              {tab.label} {count > 0 && <span className="ml-1 font-semibold">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Select value={vendorFilter} onValueChange={setVendorFilter}>
          <SelectTrigger className="h-8 text-xs w-44" data-testid="po-vendor-filter"><SelectValue placeholder="All Vendors" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vendors</SelectItem>
            {vendors.map((v) => <SelectItem key={v.id} value={String(v.id)}>{v.vendor_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-8 text-xs w-36" data-testid="po-from-date" />
        <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-8 text-xs w-36" data-testid="po-to-date" />
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input data-testid="po-search" placeholder="Search PO#..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-7 h-8 text-xs" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-3 mb-3">
        <Card className="bg-slate-50 border-slate-200"><CardContent className="py-3 px-3">
          <p className="text-2xl font-bold" data-testid="kpi-total-pos">{kpis.total}</p>
          <p className="text-[10px] text-muted-foreground">Total POs</p>
        </CardContent></Card>
        <Card className="bg-blue-50 border-blue-200"><CardContent className="py-3 px-3">
          <p className="text-2xl font-bold text-blue-700" data-testid="kpi-awaiting">{kpis.awaiting}</p>
          <p className="text-[10px] text-blue-600">Awaiting Delivery</p>
        </CardContent></Card>
        <Card className="bg-amber-50 border-amber-200"><CardContent className="py-3 px-3">
          <p className="text-2xl font-bold text-amber-700" data-testid="kpi-partial">{kpis.partial}</p>
          <p className="text-[10px] text-amber-600">Partially Received</p>
        </CardContent></Card>
        <Card><CardContent className="py-3 px-3">
          <p className="text-2xl font-bold" data-testid="kpi-month-value">{formatCurrency(kpis.monthTotal)}</p>
          <p className="text-[10px] text-muted-foreground">Total Value (month)</p>
        </CardContent></Card>
      </div>

      {/* Table */}
      {loading ? <LoadingState lines={5} /> : error ? <ErrorState message={error} onRetry={fetchData} /> : filtered.length === 0 ? (
        <EmptyState title={pos.length === 0 ? "No purchase orders yet" : "No matching POs"} description={pos.length === 0 ? "Create your first purchase order to get started." : "Try different filters."} />
      ) : (
        <Card>
          <CardContent className="py-0 px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px]">PO #</TableHead>
                  <TableHead className="text-[10px]">Vendor</TableHead>
                  {/* BUG-038: Items column removed — no item count in PO list API */}
                  {/* BUG-044: Total + Payment hidden for pre-receive status filters */}
                  {!["draft","approved","sent"].includes(statusFilter) && <TableHead className="text-[10px] text-right">Total</TableHead>}
                  <TableHead className="text-[10px]">Expected</TableHead>
                  <TableHead className="text-[10px] text-center">Status</TableHead>
                  {!["draft","approved","sent"].includes(statusFilter) && <TableHead className="text-[10px]">Payment</TableHead>}
                  <TableHead className="text-[10px]">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((po) => {
                  const isPreReceive = ["draft","approved","sent"].includes(po.status);
                  return (
                  <TableRow
                    key={po.id}
                    data-testid={`po-row-${po.id}`}
                    className="cursor-pointer hover:bg-muted/30"
                    onClick={() => navigate(`/purchase/orders/${po.id}`)}
                  >
                    <TableCell className="text-xs font-medium font-mono">{po.reference_code || `PO-${po.id}`}</TableCell>
                    <TableCell className="text-xs">{po.vendor_name || "\u2014"}</TableCell>
                    {!["draft","approved","sent"].includes(statusFilter) && <TableCell className="text-xs text-right font-mono">{isPreReceive ? "\u2014" : formatCurrency(po.tot_amount)}</TableCell>}
                    <TableCell className="text-xs text-muted-foreground">{po.expected_delivery_date || "\u2014"}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[po.status] || ""}`}>
                        {(po.status || "").replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    {!["draft","approved","sent"].includes(statusFilter) && <TableCell className="text-xs text-muted-foreground">{isPreReceive ? "\u2014" : (po.payment_type || "\u2014")}</TableCell>}
                    <TableCell className="text-xs text-muted-foreground">{po.created_at ? new Date(po.created_at).toLocaleDateString("en-IN") : "\u2014"}</TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      <p className="text-[10px] text-muted-foreground mt-2">{filtered.length} purchase orders</p>
    </div>
  );
}
