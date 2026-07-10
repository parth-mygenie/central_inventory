import { useLoginContext } from "@/hooks/useLoginContext";
import { mapRestaurantType } from "@/lib/terminology";
import { getStoreTypeBadge } from "@/lib/terminology";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogOut, Store, Shield } from "lucide-react";

export default function AppHeader() {
  const { user, restaurantType, restaurantTypeUnknown, userLevelLabel, logout, isAuthenticated } =
    useLoginContext();

  if (!isAuthenticated) return null;

  const badgeStyle = getStoreTypeBadge(restaurantType);
  const storeName = user?.restaurant_name || user?.name || "My Store";

  return (
    <header
      data-testid="app-header"
      className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0"
    >
      <div className="flex items-center gap-3">
        <Store className="h-5 w-5 text-muted-foreground" />
        <span className="font-semibold text-sm tracking-tight" data-testid="header-store-name">
          {storeName}
        </span>
        <Badge
          data-testid="header-user-level-badge"
          variant="outline"
          className={`text-[10px] px-2 py-0.5 ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
        >
          {userLevelLabel}
        </Badge>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-xs text-muted-foreground hidden sm:block" data-testid="header-user-email">
          {user?.email || ""}
        </div>
        {restaurantTypeUnknown && (
          <div className="flex items-center gap-1 text-[10px] text-rose-600 bg-rose-50 px-2 py-1 rounded-md border border-rose-200">
            <Shield className="h-3 w-3" />
            Store type unavailable — please contact admin
          </div>
        )}
        <Button
          data-testid="logout-button"
          variant="ghost"
          size="sm"
          onClick={logout}
          className="h-8 text-xs"
        >
          <LogOut className="h-3.5 w-3.5 mr-1" />
          Logout
        </Button>
      </div>
    </header>
  );
}
