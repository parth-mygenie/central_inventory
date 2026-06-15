import { useState, useEffect, useRef } from "react";
import { useLoginContext } from "@/hooks/useLoginContext";
import api from "@/services/api";

/**
 * Shared restaurant ID → { name, type } resolver.
 * Merges hierarchy-summary (franchise + central) + self from login context.
 * Consumers: OperationsHub, PendingQueues, TransferDetail, HistoryLedger
 */
export function useRestaurantMap() {
  const { restaurantId, user, restaurantType } = useLoginContext();
  const [restaurantMap, setRestaurantMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    (async () => {
      try {
        const [franchiseResp, centralResp] = await Promise.allSettled([
          api.getHierarchySummary({ storeType: "franchise" }),
          api.getHierarchySummary({ storeType: "central" }),
        ]);

        const map = {};

        // Add self (logged-in store — not present in hierarchy-summary)
        if (restaurantId) {
          map[String(restaurantId)] = {
            name: user?.restaurant_name || "My Store",
            type: restaurantType || "master",
          };
        }

        // Merge franchise stores
        if (franchiseResp.status === "fulfilled") {
          const data = franchiseResp.value?.data?.data || franchiseResp.value?.data;
          const stores = data?.stores || [];
          stores.forEach((s) => {
            map[String(s.restaurant_id)] = {
              name: s.restaurant_name,
              type: s.restaurant_type,
            };
          });
        }

        // Merge central stores
        if (centralResp.status === "fulfilled") {
          const data = centralResp.value?.data?.data || centralResp.value?.data;
          const stores = data?.stores || [];
          stores.forEach((s) => {
            map[String(s.restaurant_id)] = {
              name: s.restaurant_name,
              type: s.restaurant_type,
            };
          });
        }

        setRestaurantMap(map);
      } catch (e) {
        console.warn("[useRestaurantMap] Failed:", e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [restaurantId, user, restaurantType]);

  return { restaurantMap, loading, error };
}
