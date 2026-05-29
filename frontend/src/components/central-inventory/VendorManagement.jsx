import { useState, useEffect, useCallback } from "react";
import { useLoginContext } from "@/hooks/useLoginContext";
import api from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/StateDisplays";
import VendorFormDialog from "./VendorFormDialog";
import ConfirmActionDialog from "./ConfirmActionDialog";
import { Building2, Plus, Search, Pencil, Trash2, RefreshCw, Loader2, ShieldX } from "lucide-react";

export default function VendorManagement() {
  const { restaurantType, isTopLevel } = useLoginContext();
  const isCentral = restaurantType === "central";
  const canEdit = isTopLevel; // Only master can update/delete
  const canCreate = isTopLevel || isCentral; // Master + central can create

  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [blocked, setBlocked] = useState(false);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    setError(null);
    setBlocked(false);
    try {
      const resp = await api.getVendors();
      const data = resp.data?.data || resp.data || [];
      setVendors(Array.isArray(data) ? data : []);
    } catch (err) {
      const code = err?.response?.data?.errors?.[0]?.code || err?.response?.data?.error_code || "";
      if (code === "VENDOR_PURCHASE_NOT_ALLOWED") {
        setBlocked(true);
      } else {
        setError(err?.response?.data?.message || "Failed to load vendors");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVendors(); }, [fetchVendors]);

  const handleCreate = () => { setEditingVendor(null); setFormOpen(true); };
  const handleEdit = (vendor) => { setEditingVendor(vendor); setFormOpen(true); };

  const handleFormSubmit = async (payload) => {
    if (editingVendor) {
      await api.updateVendor(editingVendor.id, payload);
    } else {
      await api.addVendor(payload);
    }
    setFormOpen(false);
    setEditingVendor(null);
    fetchVendors();
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await api.deleteVendor(deleteConfirm.id);
      setDeleteConfirm(null);
      fetchVendors();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to delete vendor");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = vendors.filter((v) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (v.vendor_name || "").toLowerCase().includes(q) ||
      (v.contact_number || "").includes(q) ||
      (v.email || "").toLowerCase().includes(q);
  });

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

  return (
    <div data-testid="vendor-management">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2"><Building2 className="h-5 w-5" /> Vendors</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Manage supplier master data for procurement</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={fetchVendors} disabled={loading} className="h-7 text-xs gap-1" data-testid="refresh-vendors-btn">
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          {canCreate && (
            <Button size="sm" onClick={handleCreate} className="h-7 text-xs gap-1" data-testid="add-vendor-btn">
              <Plus className="h-3 w-3" /> Add Vendor
            </Button>
          )}
        </div>
      </div>

      {loading ? <LoadingState lines={5} /> : error ? <ErrorState message={error} onRetry={fetchVendors} /> : (
        <>
          {vendors.length > 0 && (
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input data-testid="vendor-search" placeholder="Search vendors..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 w-64 text-xs" />
            </div>
          )}

          {filtered.length === 0 ? (
            <EmptyState
              title={vendors.length === 0 ? "No vendors yet" : "No vendors match your search"}
              description={vendors.length === 0 ? "Add your first supplier to start recording stock purchases." : "Try a different search term."}
            />
          ) : (
            <Card>
              <CardContent className="py-0 px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px]">Name</TableHead>
                      <TableHead className="text-[10px]">Contact Person</TableHead>
                      <TableHead className="text-[10px]">Phone</TableHead>
                      <TableHead className="text-[10px]">Email</TableHead>
                      <TableHead className="text-[10px]">GST</TableHead>
                      {canEdit && <TableHead className="text-[10px]">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((v) => (
                      <TableRow key={v.id} data-testid={`vendor-row-${v.id}`}>
                        <TableCell className="text-xs font-medium">{v.vendor_name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{v.contact_person_name || "—"}</TableCell>
                        <TableCell className="text-xs">{v.contact_number || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{v.email || "—"}</TableCell>
                        <TableCell className="text-xs font-mono">{v.gst_no || "—"}</TableCell>
                        {canEdit && (
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleEdit(v)} data-testid={`edit-vendor-${v.id}`}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => setDeleteConfirm(v)} data-testid={`delete-vendor-${v.id}`}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
          <p className="text-[10px] text-muted-foreground mt-2">Showing {filtered.length} of {vendors.length} vendors</p>
        </>
      )}

      <VendorFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        vendor={editingVendor}
        onSubmit={handleFormSubmit}
      />

      {deleteConfirm && (
        <ConfirmActionDialog
          open={!!deleteConfirm}
          onOpenChange={(v) => !v && setDeleteConfirm(null)}
          title={`Delete "${deleteConfirm.vendor_name}"?`}
          description="This vendor will be permanently removed. Stock purchase records linked to this vendor will remain."
          confirmLabel="Delete Vendor"
          onConfirm={handleDelete}
          submitting={deleting}
        />
      )}
    </div>
  );
}
