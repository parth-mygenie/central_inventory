import { useState, useEffect, useCallback, useMemo } from "react";
import { useLoginContext } from "@/hooks/useLoginContext";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/StateDisplays";
import ConfirmActionDialog from "./ConfirmActionDialog";
import { Building2, Plus, Search, Loader2, ShieldX, Trash2, Save, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

function formatRelativeTime(dateStr) {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}yr ago`;
}

function formatCurrency(n) {
  if (n == null || isNaN(n)) return "₹0";
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

/** Compute vendor intelligence from purchaseData */
function computeVendorIntel(vendorName, vendorId, purchaseData) {
  const records = purchaseData.filter(
    (r) => (vendorName && r.Vendor_Name === vendorName) || (vendorId && r.vendor_id === vendorId)
  );
  if (records.length === 0) return { count: 0, totalSpend: 0, avgOrder: 0, lastPurchase: null, monthlyData: [], recentPurchases: [] };

  const sorted = [...records].sort((a, b) => new Date(b.Purchase_Date) - new Date(a.Purchase_Date));
  const totalSpend = records.reduce((s, r) => s + (Number(r.Amount) || 0), 0);
  const avgOrder = totalSpend / records.length;

  // Monthly aggregation (last 6 months)
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleString("en-IN", { month: "short" }), total: 0, isCurrent: i === 0 });
  }
  records.forEach((r) => {
    const pd = new Date(r.Purchase_Date);
    const key = `${pd.getFullYear()}-${String(pd.getMonth() + 1).padStart(2, "0")}`;
    const m = months.find((x) => x.key === key);
    if (m) m.total += Number(r.Amount) || 0;
  });

  return {
    count: records.length,
    totalSpend,
    avgOrder,
    lastPurchase: sorted[0]?.Purchase_Date || null,
    monthlyData: months,
    recentPurchases: sorted.slice(0, 5),
  };
}

function VendorIntelligence({ vendorName, vendorId, purchaseData }) {
  const intel = useMemo(() => computeVendorIntel(vendorName, vendorId, purchaseData), [vendorName, vendorId, purchaseData]);

  if (intel.count === 0) {
    return (
      <div data-testid="vendor-intel-empty" className="text-center py-6 text-xs text-muted-foreground">
        No purchase history for this vendor yet.
      </div>
    );
  }

  return (
    <div data-testid="vendor-intelligence" className="space-y-4">
      {/* KPI Row */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="py-3 px-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Last Purchase</p>
            <p className="text-sm font-semibold mt-0.5" data-testid="vendor-kpi-last-purchase">{formatRelativeTime(intel.lastPurchase)}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="py-3 px-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Purchases</p>
            <p className="text-sm font-semibold mt-0.5" data-testid="vendor-kpi-total-purchases">{intel.count}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="py-3 px-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Avg Order Value</p>
            <p className="text-sm font-semibold mt-0.5" data-testid="vendor-kpi-avg-order">{formatCurrency(intel.avgOrder)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Bar Chart */}
      {intel.monthlyData.some((m) => m.total > 0) && (
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs font-medium">Monthly Purchase Volume</CardTitle>
          </CardHeader>
          <CardContent className="py-0 px-3 pb-3">
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={intel.monthlyData} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatCurrency(v)} labelStyle={{ fontSize: 11 }} />
                <Bar dataKey="total" radius={[3, 3, 0, 0]}>
                  {intel.monthlyData.map((m, i) => (
                    <Cell key={i} fill={m.isCurrent ? "#f59e0b" : "#6366f1"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent Purchases Table */}
      <Card>
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-xs font-medium">Recent Purchases</CardTitle>
        </CardHeader>
        <CardContent className="py-0 px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] px-3">Date</TableHead>
                <TableHead className="text-[10px] px-3">Item</TableHead>
                <TableHead className="text-[10px] px-3 text-right">Qty</TableHead>
                <TableHead className="text-[10px] px-3 text-right">Rate</TableHead>
                <TableHead className="text-[10px] px-3 text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {intel.recentPurchases.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs px-3">{r.Purchase_Date}</TableCell>
                  <TableCell className="text-xs px-3">{r.Ingredient_Name}</TableCell>
                  <TableCell className="text-xs px-3 text-right">{r.Quantity}</TableCell>
                  <TableCell className="text-xs px-3 text-right font-mono">{formatCurrency(r.unit_price)}</TableCell>
                  <TableCell className="text-xs px-3 text-right font-mono">{formatCurrency(r.Amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function VendorForm({ vendor, onSave, onCancel, onDelete, canEdit }) {
  const isNew = !vendor;
  const [form, setForm] = useState({
    vendor_name: "", contact_person_name: "", contact_number: "", email: "", address: "", gst_no: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setError(null);
    if (vendor) {
      setForm({
        vendor_name: vendor.vendor_name || "",
        contact_person_name: vendor.contact_person_name || "",
        contact_number: vendor.contact_number || "",
        email: vendor.email || "",
        address: vendor.address || "",
        gst_no: vendor.gst_no || "",
      });
    } else {
      setForm({ vendor_name: "", contact_person_name: "", contact_number: "", email: "", address: "", gst_no: "" });
    }
  }, [vendor]);

  const update = (field, value) => setForm((p) => ({ ...p, [field]: value }));
  const isValid = form.vendor_name.trim().length > 0;

  const handleSave = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSave(form, vendor);
      if (isNew) toast({ title: "Vendor created successfully" });
      else toast({ title: "Vendor updated" });
    } catch (err) {
      const code = err?.response?.data?.errors?.[0]?.code || "";
      const msg = code === "duplicate" ? "A vendor with this name already exists." : (err?.response?.data?.message || "Failed to save");
      setError(msg);
      toast({ title: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div data-testid="vendor-form" className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{isNew ? "New Vendor" : "Edit Vendor"}</h3>
        {isNew && onCancel && (
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onCancel} data-testid="vendor-form-cancel">
            <X className="h-3 w-3 mr-1" /> Cancel
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label className="text-xs">Vendor Name *</Label>
          <Input data-testid="vendor-name-input" value={form.vendor_name} onChange={(e) => update("vendor_name", e.target.value)} placeholder="ABC Foods Pvt Ltd" className="h-8 text-xs" disabled={submitting} />
        </div>
        <div>
          <Label className="text-xs">Contact Person</Label>
          <Input data-testid="vendor-contact-input" value={form.contact_person_name} onChange={(e) => update("contact_person_name", e.target.value)} placeholder="Name" className="h-8 text-xs" disabled={submitting} />
        </div>
        <div>
          <Label className="text-xs">Phone</Label>
          <Input data-testid="vendor-phone-input" value={form.contact_number} onChange={(e) => update("contact_number", e.target.value)} placeholder="9876543210" className="h-8 text-xs" disabled={submitting} />
        </div>
        <div>
          <Label className="text-xs">Email</Label>
          <Input data-testid="vendor-email-input" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="vendor@example.com" className="h-8 text-xs" disabled={submitting} />
        </div>
        <div>
          <Label className="text-xs">GST Number</Label>
          <Input data-testid="vendor-gst-input" value={form.gst_no} onChange={(e) => update("gst_no", e.target.value)} placeholder="29AAAAA0000A1Z5" className="h-8 text-xs" disabled={submitting} />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Address</Label>
          <Textarea data-testid="vendor-address-input" value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="Full address" rows={2} className="text-xs" disabled={submitting} />
        </div>
      </div>
      {error && <p className="text-xs text-destructive" data-testid="vendor-form-error">{error}</p>}
      <div className="flex items-center justify-between pt-1">
        <div>
          {!isNew && canEdit && onDelete && (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => onDelete(vendor)} data-testid="vendor-delete-btn">
              <Trash2 className="h-3 w-3 mr-1" /> Delete
            </Button>
          )}
        </div>
        <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSave} disabled={!isValid || submitting} data-testid="vendor-form-submit">
          {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          {isNew ? "Create Vendor" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

export default function VendorManagement() {
  const { restaurantType, isTopLevel, restaurantId } = useLoginContext();
  const isCentral = restaurantType === "central";
  const canEdit = isTopLevel;
  const canCreate = isTopLevel || isCentral;

  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [blocked, setBlocked] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedVendorId, setSelectedVendorId] = useState(null);
  const [isAddMode, setIsAddMode] = useState(false);
  const [purchaseData, setPurchaseData] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    setError(null);
    setBlocked(false);
    try {
      const resp = await api.getVendors();
      const data = resp.data?.data || resp.data || [];
      const list = Array.isArray(data) ? data : [];
      setVendors(list);
      // Auto-select first vendor if none selected
      if (!selectedVendorId && list.length > 0 && !isAddMode) {
        setSelectedVendorId(list[0].id);
      }
    } catch (err) {
      const code = err?.response?.data?.errors?.[0]?.code || err?.response?.data?.error_code || "";
      if (code === "VENDOR_PURCHASE_NOT_ALLOWED") setBlocked(true);
      else setError(err?.response?.data?.message || "Failed to load vendors");
    } finally {
      setLoading(false);
    }
  }, [selectedVendorId, isAddMode]);

  const fetchPurchaseData = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const fromDate = oneYearAgo.toISOString().split("T")[0];
      const toDate = new Date().toISOString().split("T")[0];
      const resp = await api.getVendorItemList(restaurantId, { fromDate, toDate });
      setPurchaseData(resp.data || []);
    } catch (e) {
      console.warn("[VendorManagement] Failed to load purchase data:", e);
    }
  }, [restaurantId]);

  useEffect(() => { fetchVendors(); }, [fetchVendors]);
  useEffect(() => { fetchPurchaseData(); }, [fetchPurchaseData]);

  const selectedVendor = useMemo(() => vendors.find((v) => v.id === selectedVendorId) || null, [vendors, selectedVendorId]);

  // Compute active/inactive status based on REAL purchase data
  const vendorStatus = useMemo(() => {
    const map = {};
    vendors.forEach((v) => {
      const records = purchaseData.filter(
        (r) => r.Vendor_Name === v.vendor_name || r.vendor_id === v.id
      );
      const sorted = records.sort((a, b) => new Date(b.Purchase_Date) - new Date(a.Purchase_Date));
      const lastPurchase = sorted[0]?.Purchase_Date || null;
      const daysSince = lastPurchase ? Math.floor((Date.now() - new Date(lastPurchase).getTime()) / (1000 * 60 * 60 * 24)) : null;
      map[v.id] = {
        isActive: daysSince !== null && daysSince <= 60,
        daysSince,
        lastPurchase,
        hasHistory: records.length > 0,
      };
    });
    return map;
  }, [vendors, purchaseData]);

  const filtered = useMemo(() => {
    if (!search.trim()) return vendors;
    const q = search.toLowerCase();
    return vendors.filter((v) =>
      (v.vendor_name || "").toLowerCase().includes(q) ||
      (v.contact_number || "").includes(q) ||
      (v.email || "").toLowerCase().includes(q)
    );
  }, [vendors, search]);

  const handleSelectVendor = (id) => { setSelectedVendorId(id); setIsAddMode(false); };
  const handleAddMode = () => { setIsAddMode(true); setSelectedVendorId(null); };

  const handleSave = async (formData, existingVendor) => {
    if (existingVendor) {
      await api.updateVendor(existingVendor.id, formData);
      await fetchVendors();
    } else {
      const resp = await api.addVendor(formData);
      const newId = resp.data?.data?.id || resp.data?.id;
      await fetchVendors();
      if (newId) { setSelectedVendorId(newId); setIsAddMode(false); }
      else setIsAddMode(false);
    }
    fetchPurchaseData();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await api.deleteVendor(deleteConfirm.id);
      setDeleteConfirm(null);
      if (selectedVendorId === deleteConfirm.id) {
        const remaining = vendors.filter((v) => v.id !== deleteConfirm.id);
        setSelectedVendorId(remaining.length > 0 ? remaining[0].id : null);
      }
      fetchVendors();
      toast({ title: "Vendor deleted" });
    } catch (err) {
      toast({ title: err?.response?.data?.message || "Failed to delete vendor", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  if (blocked) {
    return (
      <div data-testid="vendor-management-blocked" className="flex flex-col items-center justify-center py-16 text-center">
        <ShieldX className="h-10 w-10 text-muted-foreground mb-3" />
        <h2 className="text-sm font-semibold mb-1">Direct Vendor Procurement Disabled</h2>
        <p className="text-xs text-muted-foreground max-w-sm">
          Stock is received from your parent store via inventory transfers. Contact your Central Store manager to enable direct vendor purchasing.
        </p>
      </div>
    );
  }

  if (loading) return <LoadingState lines={8} />;
  if (error) return <ErrorState message={error} onRetry={fetchVendors} />;

  // Zero vendors — full-width empty state
  if (vendors.length === 0 && !isAddMode) {
    return (
      <div data-testid="vendor-management-empty" className="flex flex-col items-center justify-center py-16 text-center">
        <Building2 className="h-10 w-10 text-muted-foreground mb-3" />
        <h2 className="text-sm font-semibold mb-1">No vendors yet</h2>
        <p className="text-xs text-muted-foreground max-w-sm mb-4">Add your first supplier to start recording stock purchases.</p>
        {canCreate && (
          <Button size="sm" className="h-8 text-xs gap-1" onClick={handleAddMode} data-testid="add-first-vendor-btn">
            <Plus className="h-3 w-3" /> Add Vendor
          </Button>
        )}
      </div>
    );
  }

  return (
    <div data-testid="vendor-management" className="h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2"><Building2 className="h-5 w-5" /> Vendors</h1>
          <p className="text-xs text-muted-foreground">Manage supplier master data for procurement</p>
        </div>
      </div>

      {/* Master-Detail Layout */}
      <div className="flex gap-4" style={{ minHeight: "calc(100vh - 180px)" }}>
        {/* LEFT PANEL — Vendor List (35%) */}
        <div className="w-[35%] flex flex-col" data-testid="vendor-list-panel">
          <div className="flex items-center gap-2 mb-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input data-testid="vendor-search" placeholder="Search vendors..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-7 h-8 text-xs" />
            </div>
            {canCreate && (
              <Button size="sm" className="h-8 text-xs gap-1 whitespace-nowrap" onClick={handleAddMode} data-testid="add-vendor-btn">
                <Plus className="h-3 w-3" /> Add
              </Button>
            )}
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-1 pr-2">
              {filtered.map((v) => {
                const status = vendorStatus[v.id];
                const isSelected = !isAddMode && selectedVendorId === v.id;
                return (
                  <div
                    key={v.id}
                    data-testid={`vendor-card-${v.id}`}
                    className={`p-2.5 rounded-md cursor-pointer transition-colors border ${
                      isSelected ? "border-l-4 border-l-primary bg-primary/5 border-primary/20" : "border-transparent hover:bg-muted/50"
                    }`}
                    onClick={() => handleSelectVendor(v.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold truncate">{v.vendor_name}</span>
                      {status?.hasHistory ? (
                        status.isActive ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                            Inactive {status.daysSince != null ? `${status.daysSince}d` : ""}
                          </span>
                        )
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 border border-slate-200">New</span>
                      )}
                    </div>
                    {v.contact_number && <p className="text-[10px] text-muted-foreground mt-0.5">{v.contact_number}</p>}
                  </div>
                );
              })}
              {filtered.length === 0 && search.trim() && (
                <p className="text-xs text-muted-foreground text-center py-4">No vendors match &ldquo;{search}&rdquo;</p>
              )}
            </div>
          </ScrollArea>
          <p className="text-[10px] text-muted-foreground mt-2">{filtered.length} of {vendors.length} vendors</p>
        </div>

        {/* RIGHT PANEL — Detail (65%) */}
        <div className="w-[65%] flex flex-col" data-testid="vendor-detail-panel">
          {isAddMode ? (
            <Card>
              <CardContent className="p-4">
                <VendorForm vendor={null} onSave={handleSave} onCancel={() => setIsAddMode(false)} canEdit={true} />
              </CardContent>
            </Card>
          ) : selectedVendor ? (
            <ScrollArea className="flex-1">
              <div className="space-y-4 pr-2">
                <Card>
                  <CardContent className="p-4">
                    <VendorForm
                      vendor={selectedVendor}
                      onSave={handleSave}
                      onDelete={(v) => setDeleteConfirm(v)}
                      canEdit={canEdit}
                    />
                  </CardContent>
                </Card>
                <VendorIntelligence
                  vendorName={selectedVendor.vendor_name}
                  vendorId={selectedVendor.id}
                  purchaseData={purchaseData}
                />
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center" data-testid="vendor-detail-empty">
              <Building2 className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">Select a vendor or add a new one</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <ConfirmActionDialog
          open={!!deleteConfirm}
          onOpenChange={(v) => !v && setDeleteConfirm(null)}
          title={`Delete "${deleteConfirm.vendor_name}"?`}
          description="This vendor will be permanently removed. Stock purchase records linked to this vendor will remain."
          confirmLabel="Delete Vendor"
          onConfirm={handleDeleteConfirm}
          submitting={deleting}
        />
      )}
    </div>
  );
}
