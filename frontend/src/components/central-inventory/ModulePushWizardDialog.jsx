import React, { useState, useEffect } from "react";
import api from "@/services/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState } from "@/components/common/StateDisplays";
import { mapRestaurantTypeShort } from "@/lib/terminology";
import {
  Layers, AlertCircle, Loader2, Check, Info, Search,
  ChevronDown, ChevronRight, Upload,
} from "lucide-react";

// CR-MODPUSH — Forward Push by Module wizard.
// Endpoints: GET /proxy/v2/franchise/push-form/{childId}
//            POST /proxy/v2/franchise/push/{childId}

// 6 core modules — owner decision Q2 (exclude stock_item_categories, stock_items, roles)
const PUSH_PREVIEW_MODULES = [
  "categories", "foods", "addons", "ingredients", "sub_recipes", "recipes",
];

const MODULE_LABELS = {
  categories: "Categories",
  foods: "Products",
  addons: "Addons",
  ingredients: "Ingredients",
  sub_recipes: "Sub-Recipes",
  recipes: "Recipes",
  // Results may include auto-seeded modules not in the checkbox list
  stock_item_categories: "Stock Categories",
  stock_items: "Stock Items",
};

function StatusChip({ status }) {
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
      data-testid={`modpush-status-${status || "unknown"}`}
    >
      {s.label}
    </span>
  );
}

// CR-MODPUSH — Module Push Wizard Dialog
export default function ModulePushWizardDialog({ open, onClose, target, onPushComplete }) {
  // Push-form data
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Wizard state: modules → categories → confirm → pushing → results
  const [step, setStep] = useState("modules");
  const [selectedModules, setSelectedModules] = useState([]);

  // Optional category filter (owner decision Q1)
  const [showCatFilter, setShowCatFilter] = useState(false);
  const [selectedCatIds, setSelectedCatIds] = useState(new Set());
  const [catSearch, setCatSearch] = useState("");

  // Push execution
  const [pushing, setPushing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [pushResults, setPushResults] = useState(null);
  const [pushError, setPushError] = useState(null);

  // Load push-form on open
  useEffect(() => {
    if (!open || !target) return;
    setLoading(true);
    setError(null);
    setFormData(null);
    setPushResults(null);
    setPushError(null);
    setStep("modules");
    setSelectedModules([]);
    setShowCatFilter(false);
    setSelectedCatIds(new Set());
    setCatSearch("");
    api.getPushForm(target.id).then((resp) => {
      setFormData(resp.data?.data || resp.data);
    }).catch((e) => {
      setError(e?.response?.data?.message || "Failed to load push preview");
    }).finally(() => setLoading(false));
  }, [open, target]);

  // Elapsed timer during push
  useEffect(() => {
    if (!pushing) { setElapsed(0); return; }
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [pushing]);

  const summary = formData?.push_summary || {};
  const breakdown = summary.breakdown || {};
  const parentInfo = formData?.parent || {};
  const childInfo = formData?.child || {};
  const sourceCategories = formData?.source_entities?.categories || [];
  const childCatNames = formData?.child_existing?.category_names || [];

  const toggleModule = (mod) => {
    setSelectedModules((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
    );
  };

  const toggleCategory = (id) => {
    setSelectedCatIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleExecute = async () => {
    setStep("pushing");
    setPushing(true);
    setPushError(null);
    try {
      const opts = {};
      if (selectedModules.length > 0) opts.modules = selectedModules;
      if (selectedCatIds.size > 0) opts.categoryIds = Array.from(selectedCatIds);
      const resp = await api.pushBundle(target.id, opts);
      const d = resp.data?.data || resp.data;
      setPushResults(d.results || d);
      setStep("results");
    } catch (e) {
      const data = e?.response?.data;
      if (data?.error_code === "PUSH_IN_PROGRESS") {
        setPushError("A push is already running for this outlet. Try again shortly.");
      } else {
        setPushError(data?.message || "Push failed");
      }
      setStep("modules");
    } finally {
      setPushing(false);
    }
  };

  const handleClose = () => {
    if (pushResults) onPushComplete?.(target.id);
    else onClose?.();
  };

  // ── Step: Modules ──────────────────────────────────────────────
  const renderModules = () => (
    <div className="space-y-3" data-testid="modpush-modules-step">
      {/* Direction cards */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-accent/30 rounded-md p-2">
          <p className="text-muted-foreground text-[10px] uppercase">From (Your Store)</p>
          <p className="font-medium">{parentInfo.name || "Central"}</p>
          <Badge variant="outline" className="text-[10px]">
            {mapRestaurantTypeShort(parentInfo.restaurant_type_flag)}
          </Badge>
        </div>
        <div className="bg-accent/30 rounded-md p-2">
          <p className="text-muted-foreground text-[10px] uppercase">To (Child Store)</p>
          <p className="font-medium">{childInfo.name || target?.name || "Outlet"}</p>
          <Badge variant="outline" className="text-[10px]">
            {mapRestaurantTypeShort(childInfo.restaurant_type_flag)}
          </Badge>
        </div>
      </div>

      {/* Summary strip */}
      <div className="flex items-center gap-2 flex-wrap">
        <StatusChip status={summary.status} />
        <span className="text-xs text-muted-foreground">
          {summary.total_source ?? 0} at source · {summary.total_child_matched ?? 0} at child ·{" "}
          <strong>{summary.total_behind ?? 0} to push</strong>
        </span>
      </div>

      {/* Module checkboxes */}
      <div>
        <p className="text-xs font-medium mb-1.5">
          Modules to push{" "}
          <span className="text-muted-foreground font-normal">(leave all unchecked to push everything)</span>
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {PUSH_PREVIEW_MODULES.map((mod) => {
            const bd = breakdown[mod] || { source: 0, child_matched: 0 };
            const behind = Math.max(0, (bd.source || 0) - (bd.child_matched || 0));
            const isSelected = selectedModules.includes(mod);
            return (
              <label
                key={mod}
                className="flex items-center gap-2 text-xs bg-accent/20 rounded px-2 py-1.5 cursor-pointer hover:bg-accent/40"
                data-testid={`modpush-module-${mod}`}
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

      {/* Optional category filter (owner decision Q1) */}
      {sourceCategories.length > 0 && (
        <div className="border rounded-lg">
          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-accent/20 transition-colors"
            onClick={() => setShowCatFilter((v) => !v)}
            data-testid="modpush-cat-filter-toggle"
          >
            {showCatFilter ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Narrow by categories
            <span className="text-muted-foreground font-normal ml-auto">
              {selectedCatIds.size > 0
                ? `${selectedCatIds.size} selected`
                : "optional — skip to push all"}
            </span>
          </button>
          {showCatFilter && (
            <CategoryFilterPanel
              categories={sourceCategories}
              childCatNames={childCatNames}
              selectedIds={selectedCatIds}
              onToggle={toggleCategory}
              search={catSearch}
              onSearchChange={setCatSearch}
            />
          )}
        </div>
      )}

      {pushError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-center gap-2" data-testid="modpush-error">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {pushError}
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" size="sm" onClick={handleClose} data-testid="modpush-cancel-btn">
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => setStep("confirm")}
          disabled={!formData}
          data-testid="modpush-review-btn"
        >
          Review & Push
        </Button>
      </DialogFooter>
    </div>
  );

  // ── Step: Confirm ──────────────────────────────────────────────
  const renderConfirm = () => (
    <div className="space-y-3" data-testid="modpush-confirm-step">
      <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-800">
        <p className="font-medium flex items-center gap-1">
          <AlertCircle className="h-3.5 w-3.5" /> Confirm Push
        </p>
        <p className="mt-1">
          This will push catalogue data from <strong>{parentInfo.name || "your store"}</strong> to{" "}
          <strong>{childInfo.name || target?.name || "outlet"}</strong>. Same-name records at the child are updated; new records are inserted.
        </p>
        {selectedModules.length > 0 ? (
          <p className="mt-1">Modules: {selectedModules.map((m) => MODULE_LABELS[m]).join(", ")}.</p>
        ) : (
          <p className="mt-1">Modules: pushing everything.</p>
        )}
        {selectedCatIds.size > 0 && (
          <p className="mt-1">
            Narrowed to {selectedCatIds.size} {selectedCatIds.size === 1 ? "category" : "categories"}.
          </p>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" size="sm" onClick={() => setStep("modules")} data-testid="modpush-back-btn">
          Back
        </Button>
        <Button size="sm" onClick={handleExecute} data-testid="modpush-confirm-btn" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
          <Upload className="h-3.5 w-3.5" /> Push Now
        </Button>
      </DialogFooter>
    </div>
  );

  // ── Step: Pushing ──────────────────────────────────────────────
  const renderPushing = () => {
    const messages = [
      { at: 0, text: `Pushing catalogue to ${childInfo.name || target?.name || "outlet"}…` },
      { at: 10, text: "Syncing categories and ingredients…" },
      { at: 20, text: "Processing recipes and foods…" },
      { at: 30, text: "Almost there — finalizing sync…" },
      { at: 45, text: "Still working — large catalogues take a moment…" },
    ];
    const msg = [...messages].reverse().find((m) => elapsed >= m.at)?.text || messages[0].text;
    return (
      <div className="flex flex-col items-center py-8 gap-4" data-testid="modpush-loading">
        <div className="h-16 w-16 rounded-full border-4 border-muted flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium">{msg}</p>
          <p className="text-xs text-muted-foreground">{elapsed}s elapsed</p>
        </div>
        {elapsed >= 15 && (
          <p className="text-[10px] text-muted-foreground text-center max-w-[280px]">
            This operation syncs up to 8 module types. Please don't close this dialog.
          </p>
        )}
      </div>
    );
  };

  // ── Step: Results ──────────────────────────────────────────────
  const renderResults = () => {
    if (!pushResults) return null;
    const modules = {};
    for (const [k, v] of Object.entries(pushResults)) {
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
      <div className="space-y-3" data-testid="modpush-results-step">
        <div className="flex items-center gap-2 text-emerald-600">
          <Check className="h-5 w-5" />
          <span className="text-sm font-medium">
            Push complete — {childInfo.name || target?.name || "outlet"} updated
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
              <TableRow key={k} data-testid={`modpush-result-row-${k}`}>
                <TableCell className="text-xs">{MODULE_LABELS[k] || k}</TableCell>
                <TableCell className="text-xs text-right font-mono">{v.inserted || 0}</TableCell>
                <TableCell className="text-xs text-right font-mono">{v.updated || 0}</TableCell>
                <TableCell className={`text-xs text-right font-mono ${v.failed > 0 ? "text-destructive font-semibold" : ""}`}>
                  {v.failed || 0}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="font-semibold">
              <TableCell className="text-xs">Total</TableCell>
              <TableCell className="text-xs text-right font-mono">{total.inserted}</TableCell>
              <TableCell className="text-xs text-right font-mono">{total.updated}</TableCell>
              <TableCell className={`text-xs text-right font-mono ${total.failed > 0 ? "text-destructive" : ""}`}>
                {total.failed}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        {selectedModules.length > 0 && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Info className="h-3 w-3" /> Pushed modules: {selectedModules.map((m) => MODULE_LABELS[m]).join(", ")}.
            {selectedCatIds.size > 0 && ` Narrowed to ${selectedCatIds.size} categories.`}
          </p>
        )}
        <DialogFooter>
          <Button size="sm" onClick={handleClose} data-testid="modpush-done-btn">
            Done
          </Button>
        </DialogFooter>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !pushing) handleClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col" data-testid="module-push-wizard-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4" />
            {step === "results" ? "Push Complete" : `Push by Module to ${target?.name || "Outlet"}`}
          </DialogTitle>
        </DialogHeader>

        {loading && <LoadingState lines={3} />}

        {error && !loading && (
          <div className="flex items-center gap-2 text-destructive text-sm py-2" data-testid="modpush-load-error">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}

        {step === "modules" && formData && !loading && renderModules()}
        {step === "confirm" && renderConfirm()}
        {step === "pushing" && !pushResults && renderPushing()}
        {step === "results" && renderResults()}
      </DialogContent>
    </Dialog>
  );
}

// ── Category Filter Panel (collapsible sub-component) ────────────
function CategoryFilterPanel({ categories, childCatNames, selectedIds, onToggle, search, onSearchChange }) {
  const childCatLower = new Set(childCatNames.map((n) => (n || "").trim().toLowerCase()));
  const filtered = search.trim()
    ? categories.filter((c) => (c.name || "").toLowerCase().includes(search.toLowerCase()))
    : categories;
  const pushed = filtered.filter((c) => childCatLower.has((c.name || "").trim().toLowerCase()));
  const notPushed = filtered.filter((c) => !childCatLower.has((c.name || "").trim().toLowerCase()));

  const selectAll = () => categories.forEach((c) => { if (!selectedIds.has(c.id)) onToggle(c.id); });
  const deselectAll = () => categories.forEach((c) => { if (selectedIds.has(c.id)) onToggle(c.id); });

  return (
    <div className="border-t px-3 pb-3 space-y-2" data-testid="modpush-cat-filter-panel">
      <div className="flex items-center gap-2 pt-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-7 h-7 text-xs"
            data-testid="modpush-cat-search"
          />
        </div>
        <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={selectAll}>All</Button>
        <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={deselectAll}>None</Button>
        <Badge variant="outline" className="text-[10px] px-2 py-0.5">{selectedIds.size} sel</Badge>
      </div>
      <div className="max-h-[180px] overflow-y-auto space-y-0.5">
        {pushed.length > 0 && (
          <>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider px-1 pt-1">Previously Pushed</p>
            {pushed.map((cat) => (
              <CatRow key={cat.id} cat={cat} selected={selectedIds.has(cat.id)} onToggle={() => onToggle(cat.id)} badge="synced" />
            ))}
          </>
        )}
        {notPushed.length > 0 && (
          <>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider px-1 pt-1.5">Not Yet Pushed</p>
            {notPushed.map((cat) => (
              <CatRow key={cat.id} cat={cat} selected={selectedIds.has(cat.id)} onToggle={() => onToggle(cat.id)} badge="new" />
            ))}
          </>
        )}
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3">No categories found</p>
        )}
      </div>
    </div>
  );
}

function CatRow({ cat, selected, onToggle, badge }) {
  const badgeCls = badge === "synced"
    ? "bg-blue-50 text-blue-500 border-blue-200"
    : "bg-slate-50 text-slate-400 border-slate-200";
  return (
    <label
      className={`flex items-center gap-2.5 px-2.5 py-1 rounded-md cursor-pointer transition-colors text-xs
        ${selected ? "bg-emerald-50 border border-emerald-200" : "hover:bg-muted/40 border border-transparent"}`}
      data-testid={`modpush-cat-${cat.id}`}
    >
      <Checkbox checked={selected} onCheckedChange={onToggle} />
      <span className="flex-1 truncate">{cat.name}</span>
      <Badge variant="outline" className={`text-[8px] px-1 py-0 ${badgeCls}`}>{badge}</Badge>
    </label>
  );
}
