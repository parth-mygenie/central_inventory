import { cn } from "@/lib/utils";

/**
 * Sprint A: Reusable stock health strip.
 * Displays: Total items, Low stock, Expiring, Expired, Pending out/in
 * Used in: OperationsHub, StockInventorySummary, TransferDetail, DirectDispatchForm
 */
export default function StockIntelligenceBar({
  total = 0,
  low = 0,
  expiring = 0,
  expired = 0,
  pendingOut = 0,
  pendingIn = 0,
  compact = false,
  className,
}) {
  const metrics = [
    { label: "Total Items", value: total, color: "" },
    { label: "Low Stock", value: low, color: low > 0 ? "text-red-600" : "" },
    { label: "Expiring", value: expiring, color: expiring > 0 ? "text-amber-600" : "" },
    { label: "Expired", value: expired, color: expired > 0 ? "text-red-600" : "" },
    { label: "Pending Out", value: pendingOut, color: pendingOut > 0 ? "text-red-500" : "" },
    { label: "Pending In", value: pendingIn, color: pendingIn > 0 ? "text-emerald-600" : "" },
  ].filter((m) => !compact || m.value > 0 || m.label === "Total Items");

  return (
    <div
      data-testid="stock-intelligence-bar"
      className={cn(
        "grid gap-3 text-center border rounded-lg p-3 bg-card",
        compact ? "grid-cols-3 sm:grid-cols-6" : "grid-cols-3 sm:grid-cols-6",
        className,
      )}
    >
      {metrics.map((m) => (
        <div key={m.label} data-testid={`sib-${m.label.toLowerCase().replace(/\s+/g, "-")}`}>
          <p className={cn("text-lg font-bold tabular-nums", m.color)}>
            {m.value}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
            {m.label}
          </p>
        </div>
      ))}
    </div>
  );
}
