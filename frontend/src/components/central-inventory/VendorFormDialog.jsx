import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

export default function VendorFormDialog({ open, onOpenChange, vendor, onSubmit }) {
  const isEdit = !!vendor;
  const [form, setForm] = useState({ vendor_name: "", contact_person_name: "", contact_number: "", email: "", address: "", gst_no: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setForm(vendor ? {
        vendor_name: vendor.vendor_name || "",
        contact_person_name: vendor.contact_person_name || "",
        contact_number: vendor.contact_number || "",
        email: vendor.email || "",
        address: vendor.address || "",
        gst_no: vendor.gst_no || "",
      } : { vendor_name: "", contact_person_name: "", contact_number: "", email: "", address: "", gst_no: "" });
    }
  }, [open, vendor]);

  const update = (field, value) => setForm((p) => ({ ...p, [field]: value }));
  const isValid = form.vendor_name.trim().length > 0;

  const handleSubmit = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(form);
    } catch (err) {
      const code = err?.response?.data?.errors?.[0]?.code || "";
      setError(code === "duplicate" ? "A vendor with this name already exists." : err?.response?.data?.message || "Failed to save vendor");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="vendor-form-dialog" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Vendor" : "Add Vendor"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs">Vendor Name *</Label>
            <Input data-testid="vendor-name-input" value={form.vendor_name} onChange={(e) => update("vendor_name", e.target.value)} placeholder="ABC Foods Pvt Ltd" className="h-8 text-xs" disabled={submitting} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Contact Person</Label>
              <Input data-testid="vendor-contact-input" value={form.contact_person_name} onChange={(e) => update("contact_person_name", e.target.value)} placeholder="Name" className="h-8 text-xs" disabled={submitting} />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input data-testid="vendor-phone-input" value={form.contact_number} onChange={(e) => update("contact_number", e.target.value)} placeholder="9876543210" className="h-8 text-xs" disabled={submitting} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Email</Label>
              <Input data-testid="vendor-email-input" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="vendor@example.com" className="h-8 text-xs" disabled={submitting} />
            </div>
            <div>
              <Label className="text-xs">GST Number</Label>
              <Input data-testid="vendor-gst-input" value={form.gst_no} onChange={(e) => update("gst_no", e.target.value)} placeholder="29AAAAA0000A1Z5" className="h-8 text-xs" disabled={submitting} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Address</Label>
            <Textarea data-testid="vendor-address-input" value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="Full address" rows={2} className="text-xs" disabled={submitting} />
          </div>
          {error && <p className="text-xs text-destructive" data-testid="vendor-form-error">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button data-testid="vendor-form-submit" onClick={handleSubmit} disabled={!isValid || submitting}>
            {submitting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            {isEdit ? "Save Changes" : "Add Vendor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
