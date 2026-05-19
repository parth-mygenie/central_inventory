import { useLoginContext } from "@/hooks/useLoginContext";
import { mapRestaurantType } from "@/lib/terminology";
import { getStoreTypeBadge } from "@/lib/terminology";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Lock, ChevronDown } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import api from "@/services/api";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/StateDisplays";
import { StoreTypeBadge } from "@/components/common/Badges";

/**
 * SCR-00 Context Selector
 *
 * Shows current user's hierarchy level and active store context.
 * Central/Master users get a store picker.
 * Outlet users are locked to self.
 */
export default function ContextSelector({ activeStoreId, onStoreChange }) {
  const { user, restaurantType, restaurantId, userLevelLabel, isTopLevel, isMiddleLevel, isBottomLevel } = useLoginContext();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);

  const canSwitch = isTopLevel || isMiddleLevel;
  const currentStoreId = activeStoreId || restaurantId;

  const fetchStores = useCallback(async () => {
    if (!canSwitch) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch hierarchy detail for current store to get child restaurants
      const resp = await api.getHierarchyDetail({ storeRestaurantId: restaurantId });
      const data = resp.data?.data || resp.data;
      const childStores = data?.restaurants || [];
      setStores(childStores);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load stores");
    } finally {
      setLoading(false);
    }
  }, [canSwitch, restaurantId]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const selectedStore = stores.find(
    (s) => String(s.restaurant_id || s.id) === String(currentStoreId)
  );

  const storeName = selectedStore?.restaurant_name || user?.restaurant_name || user?.name || "My Store";

  return (
    <Card data-testid="context-selector" className="mb-4">
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Left: current context */}
          <div className="flex items-center gap-3">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span
                  data-testid="context-store-name"
                  className="text-sm font-semibold"
                >
                  {storeName}
                </span>
                <StoreTypeBadge backendType={restaurantType} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Logged in as {userLevelLabel}
                {isBottomLevel && " — locked to own store"}
              </p>
            </div>
          </div>

          {/* Right: store picker (parent roles) or locked indicator */}
          {canSwitch ? (
            <div className="relative">
              <button
                data-testid="context-store-picker"
                onClick={() => setOpen(!open)}
                className="flex items-center gap-1.5 text-xs border rounded-md px-3 py-1.5 hover:bg-accent transition-colors"
              >
                Navigate to store
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
              </button>
              {open && (
                <div className="absolute right-0 mt-1 z-50 bg-card border rounded-md shadow-lg py-1 min-w-[200px] max-h-60 overflow-y-auto">
                  {loading ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">Loading stores...</div>
                  ) : error ? (
                    <div className="px-3 py-2 text-xs text-destructive">{error}</div>
                  ) : stores.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">No child stores found</div>
                  ) : (
                    stores.map((store) => (
                      <button
                        key={store.restaurant_id || store.id}
                        data-testid={`store-option-${store.restaurant_id || store.id}`}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors flex items-center justify-between gap-2"
                        onClick={() => {
                          onStoreChange?.(store.restaurant_id || store.id);
                          setOpen(false);
                        }}
                      >
                        <span className="truncate">{store.restaurant_name || store.name}</span>
                        <StoreTypeBadge backendType={store.restaurant_type || store.type} />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted px-2.5 py-1.5 rounded-md">
              <Lock className="h-3 w-3" />
              Context locked
            </div>
          )}
        </div>

        {/* Read-only mode notice */}
        <div className="mt-2 text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200 inline-block">
          Phase 1 Limited Slice — Read-only mode. Write operations pending backend resolution.
        </div>
      </CardContent>
    </Card>
  );
}
