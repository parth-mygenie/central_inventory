import { useState, useEffect, useCallback, useRef } from "react";
import api from "@/services/api";
import { useLoginContext } from "@/hooks/useLoginContext";

/**
 * Hook for Production Run functionality.
 * Loads sub-recipes, current stock, operational settings,
 * daily consumption (for coverage estimates), hierarchy detail (for post-production NBA),
 * and ingredient segment details (for Phase 2c cost estimation).
 */
export function useProductionRun() {
  const { restaurantId } = useLoginContext();
  const [subRecipes, setSubRecipes] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [settings, setSettings] = useState(null);
  const [consumption, setConsumption] = useState(null);
  const [hierarchyStores, setHierarchyStores] = useState([]);
  const [ingredientSegments, setIngredientSegments] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchedRef = useRef(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [srResp, stockResp, settResp, consResp, hierResp] = await Promise.allSettled([
        api.getSubRecipeList(),
        api.getStockInventory(),
        api.getOperationalSettings(restaurantId),
        api.getDailyConsumptionReport({ includeHierarchy: true }),
        api.getHierarchyDetail(restaurantId).catch(() => null),
      ]);

      if (srResp.status === "fulfilled") {
        setSubRecipes(srResp.value.data || []);
      }
      if (stockResp.status === "fulfilled") {
        setStocks(stockResp.value.data?.current_stocks || []);
      }
      if (settResp.status === "fulfilled") {
        const sd = settResp.value.data?.data || settResp.value.data;
        setSettings(sd?.resolved_settings || sd?.stored_settings || null);
      }
      if (consResp.status === "fulfilled") {
        setConsumption(consResp.value.data || null);
      }
      if (hierResp.status === "fulfilled" && hierResp.value) {
        const hd = hierResp.value.data?.data || hierResp.value.data;
        setHierarchyStores(hd?.children || hd?.stores || []);
      }
    } catch (e) {
      setError(e?.message || "Failed to load production data");
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchData();
    }
  }, [fetchData]);

  // Phase 2c: Fetch segment details for a list of ingredient IDs (for cost estimation)
  const fetchIngredientSegments = useCallback(async (ingredientIds) => {
    if (!ingredientIds || ingredientIds.length === 0) return;
    // Only fetch IDs we don't already have
    const toFetch = ingredientIds.filter((id) => !ingredientSegments[id]);
    if (toFetch.length === 0) return;

    const results = await Promise.allSettled(
      toFetch.map((id) => api.getStockDetail(id))
    );

    const newSegments = {};
    toFetch.forEach((id, idx) => {
      if (results[idx].status === "fulfilled") {
        const data = results[idx].value.data;
        // Sort segments by expiry ascending (FEFO order)
        const segs = (data?.segments || [])
          .filter((s) => Number(s.cal_quantity) > 0)
          .sort((a, b) => new Date(a.expiry_date || "9999") - new Date(b.expiry_date || "9999"));
        newSegments[id] = segs;
      }
    });

    if (Object.keys(newSegments).length > 0) {
      setIngredientSegments((prev) => ({ ...prev, ...newSegments }));
    }
  }, [ingredientSegments]);

  // Derived
  const productionEnabled = settings?.production_enabled ?? false;
  const allowNegativeStock = settings?.allow_negative_stock ?? true;

  // Build stock lookup: inventory_master_id → { display_qty, cal_quantity, ... }
  const stockMap = {};
  for (const s of stocks) {
    stockMap[s.id] = s;
  }

  // P3-5: Build consumption map for coverage estimates
  const consumptionMap = {};
  if (consumption) {
    const details = consumption.stock_details || consumption.stock_summary || [];
    const dateRange = consumption.date_range || [];
    const days = dateRange.length > 1
      ? Math.max(1, Math.round((new Date(dateRange[1]) - new Date(dateRange[0])) / 86400000))
      : 7;
    for (const item of details) {
      const id = item.inventory_master_id || item.id;
      const totalConsumed = Number(item.total_consumed || item.total_qty || 0);
      if (id && totalConsumed > 0) {
        consumptionMap[id] = totalConsumed / days;
      }
    }
  }

  return {
    subRecipes,
    stocks,
    stockMap,
    settings,
    consumption,
    consumptionMap,
    hierarchyStores,
    ingredientSegments,
    fetchIngredientSegments,
    productionEnabled,
    allowNegativeStock,
    loading,
    error,
    refresh: fetchData,
  };
}
