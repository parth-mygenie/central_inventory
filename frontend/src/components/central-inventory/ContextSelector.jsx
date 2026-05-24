import { useLoginContext } from "@/hooks/useLoginContext";
import { mapRestaurantType } from "@/lib/terminology";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Lock, ChevronDown, RotateCcw, Eye } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import api from "@/services/api";
import { StoreTypeBadge } from "@/components/common/Badges";

/**
 * SCR-00 Context Selector — Slice 2
 *
 * Enhancements:
 * - In-place hub update instead of navigation (Item 11)
 * - "Viewing as" indicator when context differs from own store
 * - Reset button to return to own store
 */
export default function ContextSelector({ activeStoreId, activeStoreName, onStoreChange, onReset, isViewingOther }) {
  const { user, restaurantType, restaurantId, userLevelLabel, isTopLevel, isMiddleLevel, isBottomLevel } = useLoginContext();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);

  const canSwitch = isTopLevel || isMiddleLevel;

  const fetchStores = useCallback(async () => {
    if (!canSwitch || !restaurantId) return;
    setLoading(true);
    setError(null);
    try {
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

  const storeName = user?.restaurant_name || user?.name || "My Store";

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
            <div className="flex items-center gap-2">
              {/* Viewing As indicator (Item 11) */}
              {isViewingOther && activeStoreName && (
                <div className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-md px-2.5 py-1.5" data-testid="viewing-as-indicator">
                  <Eye className="h-3 w-3" />
                  <span>Viewing as <strong>{activeStoreName}</strong></span>
                  <button
                    data-testid="context-reset-button"
                    onClick={onReset}
                    className="ml-1 hover:bg-blue-100 rounded-full p-0.5 transition-colors"
                    title="Reset to own store"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                </div>
              )}

              <div className="relative">
                <button
                  data-testid="context-store-picker"
                  onClick={() => setOpen(!open)}
                  className="flex items-center gap-1.5 text-xs border rounded-md px-3 py-1.5 hover:bg-accent transition-colors"
                >
                  View as store
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
                      stores.map((store) => {
                        const sid = store.restaurant_id || store.id;
                        const sname = store.restaurant_name || store.name;
                        return (
                          <button
                            key={sid}
                            data-testid={`store-option-${sid}`}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors flex items-center justify-between gap-2"
                            onClick={() => {
                              onStoreChange?.(sid, sname);
                              setOpen(false);
                            }}
                          >
                            <span className="truncate">{sname}</span>
                            <StoreTypeBadge backendType={store.restaurant_type || store.type} />
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted px-2.5 py-1.5 rounded-md">
              <Lock className="h-3 w-3" />
              Context locked
            </div>
          )}
        </div>

      </CardContent>
    </Card>
  );
}
