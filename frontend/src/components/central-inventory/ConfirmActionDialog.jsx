import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

/**
 * Reusable confirmation dialog for Approve and Dispatch actions.
 */
export default function ConfirmActionDialog({
  open, onOpenChange, title, description, confirmLabel = "Confirm",
  confirmVariant = "default", onConfirm, submitting = false,
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="confirm-action-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting} data-testid="confirm-dialog-cancel">Cancel</AlertDialogCancel>
          <AlertDialogAction
            data-testid="confirm-dialog-confirm"
            disabled={submitting}
            onClick={(e) => { e.preventDefault(); onConfirm(); }}
            className={confirmVariant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
