import { CheckCircle2, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPO } from "@/lib/formatters";

/**
 * Sprint B: Reusable post-submit success card for all write actions.
 * Shows: PO number, item count, summary, and "View Transfer" link.
 */
export default function PostSubmitConfirmation({
  transferId,
  itemCount = 0,
  summary = "",
  destinationName = "",
  onViewTransfer,
  onDismiss,
}) {
  return (
    <Card
      data-testid="post-submit-confirmation"
      className="border-l-[3px] border-l-emerald-500 mb-4"
    >
      <CardContent className="py-3 px-4 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Request submitted successfully</p>
          <p className="text-xs text-muted-foreground">
            {formatPO(transferId)} — {itemCount} item{itemCount !== 1 ? "s" : ""}
            {summary && ` · ${summary}`}
          </p>
          {destinationName && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Sent to {destinationName} for approval
            </p>
          )}
        </div>
        {onViewTransfer && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs shrink-0"
            onClick={onViewTransfer}
            data-testid="view-transfer-btn"
          >
            View Transfer <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
