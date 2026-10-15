import { Badge } from "@/components/ui/badge";
import { mapRestaurantType, getStoreTypeBadge, getStatusConfig } from "@/lib/terminology";

/** Store type badge with business label */
export function StoreTypeBadge({ backendType, className = "" }) {
  const style = getStoreTypeBadge(backendType);
  const label = mapRestaurantType(backendType);

  return (
    <Badge
      data-testid={`store-type-badge-${backendType}`}
      variant="outline"
      className={`text-[10px] font-medium px-2 py-0.5 ${style.bg} ${style.text} ${style.border} ${className}`}
    >
      {label}
    </Badge>
  );
}

/** Transfer status badge */
export function StatusBadge({ status, className = "" }) {
  const config = getStatusConfig(status);

  return (
    <span
      data-testid={`status-badge-${status}`}
      className={`inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full ${config.color} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
