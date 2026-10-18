import { cn } from "@/lib/utils";

/**
 * Sprint B: Fulfillment verdict badge.
 * "Can fulfill" / "Partial — 2 of 3 items" / "Can't fulfill"
 * Used in: PendingQueues approval cards, TransferDetail.
 */
export default function FulfillmentVerdict({ canFulfill, partialCount, totalCount, className }) {
  if (canFulfill === true || (partialCount != null && partialCount === totalCount)) {
    return (
      <span
        data-testid="verdict-can-fulfill"
        className={cn("text-[10px] font-semibold px-2 py-0.5 rounded bg-muted text-foreground", className)}
      >
        Can fulfill
      </span>
    );
  }

  if (partialCount != null && partialCount > 0 && partialCount < totalCount) {
    return (
      <span
        data-testid="verdict-partial"
        className={cn(
          "text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200",
          className,
        )}
      >
        Partial — {partialCount} of {totalCount} items
      </span>
    );
  }

  return (
    <span
      data-testid="verdict-cannot-fulfill"
      className={cn(
        "text-[10px] font-semibold px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200",
        className,
      )}
    >
      Can't fulfill
    </span>
  );
}
