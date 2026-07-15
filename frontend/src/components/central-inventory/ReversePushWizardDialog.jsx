import React, { useState, useEffect } from "react";
import useHierarchyManagement from "@/hooks/useHierarchyManagement";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState } from "@/components/common/StateDisplays";
import { mapRestaurantTypeShort } from "@/lib/terminology";
import { ArrowDownToLine, AlertCircle, Loader2, Check, Wrench, Info } from "lucide-react";

// CR-045 — Reverse Push Wizard (master pulls catalogue upward from a legacy outlet).
// Endpoints: GET/POST /proxy/v2/franchise/reverse-push[-form]/from/{childId}

// Human-facing copy for the 8 module labels. `inventory_master` is intentionally
// suppressed — we always surface "Ingredients" instead (owner directive 2026-02-15).
const MODULE_LABELS = {
  categories: "Categories",
  stock_item_categories: "Stock Item Categories",
  addons: "Addons",
  sub_recipes: "Sub-recipes",
  ingredients: "Ingredients",
  stock_items: "Stock Items",
  foods: "Foods",
  recipes: "Recipes",
};

// GET preview form returns these 6-7 modules. POST result adds stock_item_categories
// and stock_items (seeded implicitly with ingredients).
const PREVIEW_MODULES = ["categories", "foods", "addons", "ingredients", "sub_recipes", "recipes"];

function StatusChip({ status }) {
  // G-031 BUG-FIX — add not_seeded status for fresh/empty masters
  const map = {
    synced:     { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Synced" },
    partial:    { cls: "bg-amber-50 text-amber-700 border-amber-200", label: "Partial" },
    stale:      { cls: "bg-red-50 text-red-700 border-red-200", label: "Stale" },
    not_seeded: { cls: "bg-blue-50 text-blue-700 border-blue-200", label: "Ready to Seed" },
  };
  const s = map[status] || map.stale;
  return (
    <span
      className={`text-[10px] px-2 py-0.5 rounded border ${s.cls}`}
      data-testid={`reverse-status-${status || "unknown"}`}
    >
      {s.label}
    </span>
  );
}

export default function ReversePushWizardDialog({ open, onClose, target }) {
  const {
    reverseForm, reverseResults, reverseLoading, reverseError,
    fetchReverseForm, executeReverse, resetReverse,
  } = useHierarchyManagement();

  const [step, setStep] = useState("preview"); // preview | confirm | pushing | results
  const [selectedModules, setSelectedModules] = useState([]); // empty = push everything
  const [enforceChildLock, setEnforceChildLock] = useState(false);

  useEffect(() => {
    if (open && target) {
      resetReverse();
      setStep("preview");
      setSelectedModules([]);
      setEnforceChildLock(false);
      fetchReverseForm(target.id);
    }
  }, [open, target]);

  useEffect(() => {
    if (reverseResults) setStep("results");
  }, [reverseResults]);

  const sourceName = reverseForm?.source?.name || target?.name || "Outlet";
  const targetName = reverseForm?.target?.name || "Central Store";
  const summary = reverseForm?.push_summary || {};
  const breakdown = summary.breakdown || {};

  const handleExecute = async () => {
    setStep("pushing");
    try {
      await executeReverse(target.id, {
        enforceChildLock,
        modules: selectedModules.length > 0 ? selectedModules : undefined,
      });
    } catch {
      // error surfaced via reverseError; UI stays on pushing step then renders error
      setStep("preview");
    }
  };

  const toggleModule = (mod) => {
    setSelectedModules((prev) => (prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]));
  };

  const renderPreview = () => (
    <div className="space-y-3" data-testid="reverse-push-preview">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-accent/30 rounded-md p-2">
          <p className="text-muted-foreground text-[10px] uppercase">From (Outlet)</p>
          <p className="font-medium">{sourceName}</p>
          <Badge variant="outline" className="text-[10px]">
            {mapRestaurantTypeShort(reverseForm?.source?.restaurant_type_flag)}
          </Badge>
        </div>
        <div className="bg-accent/30 rounded-md p-2">
          <p className="text-muted-foreground text-[10px] uppercase">To (Central Store)</p>
          <p className="font-medium">{targetName}</p>
          <Badge variant="outline" className="text-[10px]">
            {mapRestaurantTypeShort(reverseForm?.target?.restaurant_type_flag)}
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <StatusChip status={summary.status} />
        <span className="text-xs text-muted-foreground">
          {summary.total_source ?? 0} at outlet · {summary.total_child_matched ?? 0} already at central ·{" "}
          <strong>{summary.total_behind ?? 0} to pull</strong>
        </span>
      </div>

      <div>
        <p className="text-xs font-medium mb-1.5">
          Modules to pull <span className="text-muted-foreground font-normal">(leave all unchecked to pull everything)</span>
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {PREVIEW_MODULES.map((mod) => {
            const bd = breakdown[mod] || { source: 0, child_matched: 0 };
            const behind = Math.max(0, (bd.source || 0) - (bd.child_matched || 0));
            const isSelected = selectedModules.includes(mod);
            return (
              <label
                key={mod}
                className="flex items-center gap-2 text-xs bg-accent/20 rounded px-2 py-1.5 cursor-pointer hover:bg-accent/40"
                data-testid={`reverse-module-${mod}`}
              >
                <Checkbox checked={isSelected} onCheckedChange={() => toggleModule(mod)} />
                <span className="flex-1">{MODULE_LABELS[mod]}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{bd.source || 0}</span>
                {behind > 0 && (
                  <span className="font-mono text-[10px] text-amber-700">+{behind}</span>
                )}
              </label>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
          <Info className="h-3 w-3" /> Stock Item Categories and Stock Items are seeded automatically with Ingredients.
        </p>
      </div>

      <label
        className="flex items-start gap-2 text-xs cursor-pointer"
        data-testid="reverse-enforce-lock-checkbox"
      >
        <Checkbox
          checked={enforceChildLock}
          onCheckedChange={(v) => setEnforceChildLock(!!v)}
          className="mt-0.5"
        />
        <span>
          <span className="font-medium">Enforce child lock</span>
          <span className="block text-[10px] text-muted-foreground">
            Marks pulled records as parent-managed so the outlet cannot edit them going forward.
          </span>
        </span>
      </label>

      <DialogFooter>
        <Button variant="outline" size="sm" onClick={onClose} data-testid="reverse-cancel-btn">
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => setStep("confirm")}
          disabled={!reverseForm}
          data-testid="reverse-next-btn"
        >
          Review & Pull
        </Button>
      </DialogFooter>
    </div>
  );

  const renderConfirm = () => (
    <div className="space-y-3" data-testid="reverse-push-confirm">
      <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-800">
        <p className="font-medium flex items-center gap-1">
          <AlertCircle className="h-3.5 w-3.5" /> Confirm Pull
        </p>
        <p className="mt-1">
          This will pull catalogue data from <strong>{sourceName}</strong> into <strong>{targetName}</strong>. Same-name records at the central are updated; new records are inserted.
        </p>
        {enforceChildLock && (
          <p className="mt-1">
            <strong>Enforce child lock is ON</strong> — pulled records become read-only at {sourceName}.
          </p>
        )}
        {selectedModules.length > 0 ? (
          <p className="mt-1">Modules: {selectedModules.map((m) => MODULE_LABELS[m]).join(", ")}.</p>
        ) : (
          <p className="mt-1">Modules: pulling everything.</p>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" size="sm" onClick={() => setStep("preview")} data-testid="reverse-back-btn">
          Back
        </Button>
        <Button size="sm" onClick={handleExecute} data-testid="reverse-confirm-btn">
          Pull Now
        </Button>
      </DialogFooter>
    </div>
  );

  const renderPushing = () => (
    <div className="flex flex-col items-center py-8 gap-3" data-testid="reverse-loading">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Pulling catalogue from {sourceName}…</p>
    </div>
  );

  const renderResults = () => {
    if (!reverseResults) return null;
    const modules = {};
    const diagnostics = reverseResults._diagnostics || {};
    for (const [k, v] of Object.entries(reverseResults)) {
      if (k.startsWith("_")) continue;
      if (typeof v === "object" && v !== null && "inserted" in v) modules[k] = v;
    }
    const total = { inserted: 0, updated: 0, failed: 0 };
    Object.values(modules).forEach((m) => {
      total.inserted += m.inserted || 0;
      total.updated += m.updated || 0;
      total.failed += m.failed || 0;
    });
    return (
      <div className="space-y-3" data-testid="reverse-push-results">
        <div className="flex items-center gap-2 text-emerald-600">
          <Check className="h-5 w-5" />
          <span className="text-sm font-medium">
            Pull complete — {targetName} updated from {sourceName}
          </span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Module</TableHead>
              <TableHead className="text-xs text-right">Inserted</TableHead>
              <TableHead className="text-xs text-right">Updated</TableHead>
              <TableHead className="text-xs text-right">Failed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(modules).map(([k, v]) => (
              <TableRow key={k} data-testid={`reverse-result-row-${k}`}>
                <TableCell className="text-xs">{MODULE_LABELS[k] || k}</TableCell>
                <TableCell className="text-xs text-right font-mono">{v.inserted || 0}</TableCell>
                <TableCell className="text-xs text-right font-mono">{v.updated || 0}</TableCell>
                <TableCell
                  className={`text-xs text-right font-mono ${
                    v.failed > 0 ? "text-destructive font-semibold" : ""
                  }`}
                >
                  {v.failed || 0}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="font-semibold">
              <TableCell className="text-xs">Total</TableCell>
              <TableCell className="text-xs text-right font-mono">{total.inserted}</TableCell>
              <TableCell className="text-xs text-right font-mono">{total.updated}</TableCell>
              <TableCell
                className={`text-xs text-right font-mono ${
                  total.failed > 0 ? "text-destructive" : ""
                }`}
              >
                {total.failed}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        {diagnostics.link_repair &&
          Object.values(diagnostics.link_repair).some((n) => n > 0) && (
            <details className="bg-accent/30 rounded-md p-2 text-[10px]">
              <summary className="font-medium flex items-center gap-1 cursor-pointer">
                <Wrench className="h-3 w-3" /> Link repairs
              </summary>
              {Object.entries(diagnostics.link_repair).map(([k, v]) => (
                <p key={k} className="text-muted-foreground pl-4">
                  {k.replace(/_/g, " ")}: {v}
                </p>
              ))}
            </details>
          )}
        <DialogFooter>
          <Button size="sm" onClick={onClose} data-testid="reverse-done-btn">
            Done
          </Button>
        </DialogFooter>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg" data-testid="reverse-push-wizard-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ArrowDownToLine className="h-4 w-4" />
            {step === "results" ? "Pull Complete" : `Pull from ${sourceName}`}
          </DialogTitle>
        </DialogHeader>

        {reverseLoading && step === "preview" && !reverseForm && <LoadingState lines={3} />}

        {reverseError && step !== "results" && (
          <div
            className="flex items-center gap-2 text-destructive text-sm py-2"
            data-testid="reverse-error"
          >
            <AlertCircle className="h-4 w-4" /> {reverseError}
          </div>
        )}

        {step === "preview" && reverseForm && !reverseLoading && renderPreview()}
        {step === "confirm" && renderConfirm()}
        {step === "pushing" && !reverseResults && renderPushing()}
        {step === "results" && renderResults()}
      </DialogContent>
    </Dialog>
  );
}
