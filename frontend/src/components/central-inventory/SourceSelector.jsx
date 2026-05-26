import { useState, useEffect } from "react";
import api from "@/services/api";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";

/**
 * SourceSelector — Configurable segment_id + filter_bucket picker.
 * Default mode: segment_id (100% E2E pass rate).
 * filter_bucket mode available with warning (Q-S4-002: B).
 */
export default function SourceSelector({ fromRestaurantId, inventoryMasterId, value, onChange, disabled }) {
  const [mode, setMode] = useState("segment_id");
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!fromRestaurantId || !inventoryMasterId) { setSegments([]); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.getSourceOptions({ restaurantId: fromRestaurantId, inventoryMasterId })
      .then((resp) => {
        if (cancelled) return;
        const segs = resp.data?.data?.segments || resp.data?.segments || [];
        setSegments(segs);
      })
      .catch(() => { if (!cancelled) setError("Failed to load source options"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fromRestaurantId, inventoryMasterId]);

  if (loading) return <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Loading sources...</div>;
  if (error) return <div className="flex items-center gap-1 text-[10px] text-destructive"><AlertCircle className="h-3 w-3" /> {error}</div>;
  if (!fromRestaurantId || !inventoryMasterId) return null;

  return (
    <div className="space-y-1.5" data-testid="source-selector">
      {/* Mode toggle */}
      <div className="flex gap-1">
        <button
          type="button"
          className={`text-[10px] px-2 py-0.5 rounded ${mode === "segment_id" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          onClick={() => { setMode("segment_id"); onChange(null); }}
          disabled={disabled}
          data-testid="source-mode-segment"
        >
          Segment
        </button>
        <button
          type="button"
          className={`text-[10px] px-2 py-0.5 rounded ${mode === "filter_bucket" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          onClick={() => { setMode("filter_bucket"); onChange(null); }}
          disabled={disabled}
          data-testid="source-mode-bucket"
        >
          Bucket
        </button>
      </div>

      {mode === "segment_id" ? (
        segments.length === 0 ? (
          <p className="text-[10px] text-amber-600">No stock segments available for this item</p>
        ) : (
          <Select
            value={value?.segment_id ? String(value.segment_id) : ""}
            onValueChange={(v) => onChange({ mode: "segment_id", segment_id: Number(v) })}
            disabled={disabled}
          >
            <SelectTrigger data-testid="source-segment-select" className="h-7 text-xs">
              <SelectValue placeholder="Select segment" />
            </SelectTrigger>
            <SelectContent>
              {segments.map((seg) => (
                <SelectItem key={seg.segment_id} value={String(seg.segment_id)}>
                  {seg.batch || `Seg #${seg.segment_id}`} — {seg.cal_quantity} available
                  {seg.expiry_date ? ` (exp: ${seg.expiry_date})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      ) : (
        <div className="space-y-1">
          <p className="text-[10px] text-amber-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Bucket mode may not work with batched stock. Use Segment mode for reliability.
          </p>
          <Select
            value={value?.filter_bucket || ""}
            onValueChange={(v) => onChange({ mode: "filter_bucket", filter_bucket: v })}
            disabled={disabled}
          >
            <SelectTrigger data-testid="source-bucket-select" className="h-7 text-xs">
              <SelectValue placeholder="Select bucket" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="without_batch_and_expiry">Without Batch & Expiry</SelectItem>
              <SelectItem value="with_batch_and_expiry">With Batch & Expiry</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
