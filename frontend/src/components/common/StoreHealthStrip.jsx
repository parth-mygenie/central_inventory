import { cn } from "@/lib/utils";

/**
 * Sprint B: Compact store health display.
 * Shows: "X out · Y low · Z adequate" in a single line.
 * Used in: PendingQueues approval cards, DirectDispatchForm, TransferDetail.
 */
export default function StoreHealthStrip({
  storeName,
  outCount = 0,
  lowCount = 0,
  adequateCount = 0,
  totalItems = 0,
  urgent = false,
  className,
}) {
  return (
    <div
      data-testid="store-health-strip"
      className={cn(
        "flex items-center gap-2 px-3 py-2 text-xs flex-wrap",
        urgent ? "bg-red-50" : "bg-muted/30",
        className,
      )}
    >
      {storeName && (
        <span className="text-muted-foreground font-medium shrink-0">{storeName} health:</span>
      )}
      {outCount > 0 && (
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          <strong className={outCount >= 2 ? "text-red-600" : ""}>{outCount} out</strong>
        </span>
      )}
      {lowCount > 0 && (
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          {lowCount} low
        </span>
      )}
      <span className="text-muted-foreground">{adequateCount} adequate</span>
      {totalItems > 0 && (
        <span className="text-muted-foreground ml-auto text-[10px]">{totalItems} items total</span>
      )}
    </div>
  );
}
