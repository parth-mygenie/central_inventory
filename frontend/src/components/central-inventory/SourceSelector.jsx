import { useState, useEffect } from "react";
import api from "@/services/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Loader2, ShieldAlert } from "lucide-react";

/**
 * SourceSelector — segment_id + filter_bucket picker.
 *
 * Calls source-options to get available segments/buckets for an item.
 * - If source-options succeeds: shows segment picker (preferred) + optional bucket picker
 * - If source-options returns UNAUTHORIZED (403): shows bucket-only fallback
 *   (child cannot call source-options on parent segments — documented POS API constraint)
 *
 * Bucket payload uses canonical shape:
 *   { mode: "filter_bucket", bucket: "<name>", batch_state: "null", expiry_state: "null" }
 */

const BUCKET_OPTIONS = [
  { value: "without_batch_and_expiry", label: "Without Batch & Expiry" },
  { value: "with_batch_and_expiry", label: "With Batch & Expiry" },
  { value: "without_batch_only", label: "Without Batch Only" },
  { value: "without_expiry_only", label: "Without Expiry Only" },
];

export default function SourceSelector({ fromRestaurantId, inventoryMasterId, value, onChange, disabled }) {
  const [mode, setMode] = useState("segment_id");
  const [segments, setSegments] = useState([]);
  const [filters, setFilters] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    if (!fromRestaurantId || !inventoryMasterId) {
      setSegments([]); setFilters(null); setUnauthorized(false); setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setUnauthorized(false);
    setFilters(null);
    setSegments([]);

    api.getSourceOptions({ restaurantId: fromRestaurantId, inventoryMasterId })
      .then((resp) => {
        if (cancelled) return;
        const data = resp.data?.data || resp.data;
        setSegments(data?.segments || []);
        setFilters(data?.filters || null);
        setMode("segment_id");
      })
      .catch((err) => {
        if (cancelled) return;
        const status = err?.response?.status;
        if (status === 403 || status === 401) {
          setUnauthorized(true);
          setMode("filter_bucket");
        } else {
          setError("Failed to load source options");
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fromRestaurantId, inventoryMasterId]);

  if (loading) {
    return (
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground" data-testid="source-selector-loading">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading source options...
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center gap-1 text-[10px] text-destructive" data-testid="source-selector-error">
        <AlertCircle className="h-3 w-3" /> {error}
      </div>
    );
  }
  if (!fromRestaurantId || !inventoryMasterId) return null;

  const switchMode = (newMode) => {
    setMode(newMode);
    onChange(null);
  };

  return (
    <div className="space-y-1.5" data-testid="source-selector">
      {/* Mode toggle — hidden when unauthorized (bucket-only fallback) */}
      {!unauthorized && (
        <div className="flex gap-1">
          <button
            type="button"
            className={`text-[10px] px-2 py-0.5 rounded ${mode === "segment_id" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            onClick={() => switchMode("segment_id")}
            disabled={disabled}
            data-testid="source-mode-segment"
          >
            Segment
          </button>
          <button
            type="button"
            className={`text-[10px] px-2 py-0.5 rounded ${mode === "filter_bucket" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            onClick={() => switchMode("filter_bucket")}
            disabled={disabled}
            data-testid="source-mode-bucket"
          >
            Bucket
          </button>
        </div>
      )}

      {/* Unauthorized fallback message */}
      {unauthorized && (
        <div className="flex items-start gap-1.5 text-[10px] text-amber-700 bg-amber-50 rounded p-1.5" data-testid="source-selector-fallback-warning">
          <ShieldAlert className="h-3 w-3 flex-shrink-0 mt-0.5" />
          <span>Segment selection unavailable for cross-store requests. Select a stock bucket below.</span>
        </div>
      )}

      {mode === "segment_id" ? (
        segments.length === 0 ? (
          <p className="text-[10px] text-amber-600" data-testid="no-segments-warning">No stock segments available for this item</p>
        ) : (
          <>
          <Select
            value={value?.segment_id ? String(value.segment_id) : ""}
            onValueChange={(v) => onChange({ mode: "segment_id", segment_id: Number(v) })}
            disabled={disabled}
          >
            <SelectTrigger data-testid="source-segment-select" className="h-7 text-xs">
              <SelectValue placeholder="Select segment" />
            </SelectTrigger>
            <SelectContent>
              {segments.map((seg) => {
                const daysLeft = seg.expiry_date ? Math.ceil((new Date(seg.expiry_date + "T23:59:59") - new Date()) / (1000 * 60 * 60 * 24)) : null;
                const isExpired = daysLeft !== null && daysLeft < 0;
                const isNearExpiry = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;
                return (
                <SelectItem key={seg.segment_id} value={String(seg.segment_id)} disabled={isExpired}>
                  {seg.batch || `Seg #${seg.segment_id}`} — {seg.display_qty ?? seg.cal_quantity} avail
                  {seg.expiry_date ? ` (exp: ${seg.expiry_date})` : ""}
                  {isExpired ? " [EXPIRED]" : isNearExpiry ? ` [${daysLeft}d left - FEFO]` : ""}
                </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {value?.segment_id && (() => {
            const sel = segments.find(s => s.segment_id === value.segment_id);
            if (sel) {
              const avail = sel.display_qty ?? sel.cal_quantity ?? 0;
              return (
                <p className="text-[10px] text-muted-foreground mt-0.5" data-testid="source-segment-avail">
                  Available: <span className="font-semibold">{avail}</span> in this segment
                </p>
              );
            }
            return null;
          })()}
          </>
        )
      ) : (
        <div className="space-y-1">
          {!unauthorized && (
            <p className="text-[10px] text-amber-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Bucket mode may fail if selected bucket has no stock. Use Segment mode for reliability.
            </p>
          )}
          <Select
            value={value?.bucket || ""}
            onValueChange={(v) => onChange({
              mode: "filter_bucket",
              bucket: v,
              batch_state: "null",
              expiry_state: "null",
            })}
            disabled={disabled}
          >
            <SelectTrigger data-testid="source-bucket-select" className="h-7 text-xs">
              <SelectValue placeholder="Select stock bucket" />
            </SelectTrigger>
            <SelectContent>
              {BUCKET_OPTIONS.map((opt) => {
                const f = filters?.[opt.value];
                const hasData = f != null;
                const count = f?.count;
                const qty = f?.display_qty;
                return (
                  <SelectItem key={opt.value} value={opt.value} data-testid={`bucket-option-${opt.value}`}>
                    <span className="flex items-center gap-1">
                      {opt.label}
                      {hasData && count > 0 && (
                        <span className="text-muted-foreground text-[10px]">
                          ({count} seg, {qty} avail)
                        </span>
                      )}
                      {hasData && count === 0 && (
                        <span className="text-destructive text-[10px]">(empty)</span>
                      )}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
