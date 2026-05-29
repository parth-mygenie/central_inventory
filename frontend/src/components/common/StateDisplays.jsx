import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, RefreshCw, ShieldOff, Database, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Loading skeleton for cards */
export function LoadingState({ lines = 3 }) {
  return (
    <div data-testid="loading-state" className="space-y-3 p-4">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

/** Empty state */
export function EmptyState({ title = "No data", description, icon: Icon = Database }) {
  return (
    <div data-testid="empty-state" className="flex flex-col items-center justify-center py-12 text-center">
      <Icon className="h-10 w-10 text-muted-foreground/40 mb-3" />
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      {description && <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs">{description}</p>}
    </div>
  );
}

/** Error state with retry */
export function ErrorState({ message = "Something went wrong", onRetry }) {
  return (
    <div data-testid="error-state" className="flex flex-col items-center justify-center py-12 text-center">
      <AlertCircle className="h-10 w-10 text-destructive/60 mb-3" />
      <p className="text-sm font-medium text-destructive">{message}</p>
      {onRetry && (
        <Button
          data-testid="retry-button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={onRetry}
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Retry
        </Button>
      )}
    </div>
  );
}

/** Permission denied */
export function PermissionDenied() {
  return (
    <div data-testid="permission-denied" className="flex flex-col items-center justify-center py-12 text-center">
      <ShieldOff className="h-10 w-10 text-muted-foreground/40 mb-3" />
      <p className="text-sm font-medium text-muted-foreground">Access Denied</p>
      <p className="text-xs text-muted-foreground/70 mt-1">You do not have permission to view this screen.</p>
    </div>
  );
}

/** Blocked / coming soon action */
export function BlockedAction({ label = "Action blocked" }) {
  return (
    <div
      data-testid="blocked-action"
      className="flex items-center gap-1.5 text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200"
    >
      <Lock className="h-3 w-3" />
      {label}
    </div>
  );
}

/** API unavailable badge */
export function ApiUnavailable({ apiName }) {
  return (
    <div
      data-testid="api-unavailable"
      className="flex items-center gap-1.5 text-[10px] text-rose-600 bg-rose-50 px-2 py-1 rounded border border-rose-200"
    >
      <AlertCircle className="h-3 w-3" />
      {apiName ? `${apiName} API unavailable` : "API unavailable"}
    </div>
  );
}
