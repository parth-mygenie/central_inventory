import { useState, useEffect, useCallback, useRef } from "react";
import api from "@/services/api";

/**
 * P20: Fetches stock inventory for logged-in store (self-store only).
 * No hierarchy — default endpoint only.
 *
 * @param {Object} options
 * @param {number} options.staleAfterMs - Stale threshold in ms (default: 5 min)
 * @returns {{ stocks, loading, error, refresh, lastFetched, isStale, totalItems, lowStockItems, lowStockCount, categoryCounts }}
 */
export function useStockInventory({ staleAfterMs = 5 * 60 * 1000 } = {}) {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  const fetchIdRef = useRef(0);

  const fetchInventory = useCallback(async () => {
    const id = ++fetchIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const resp = await api.getStockInventory();
      if (id !== fetchIdRef.current) return;
      const data = resp.data;
      setStocks(data.current_stocks || []);
      setLastFetched(Date.now());
    } catch (err) {
      if (id !== fetchIdRef.current) return;
      setError(err?.response?.data?.message || "Failed to load stock inventory");
    } finally {
      if (id === fetchIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const isStale = lastFetched ? (Date.now() - lastFetched > staleAfterMs) : false;

  const lowStockItems = stocks.filter((s) => s.is_low_stock);

  const categoryCounts = {};
  for (const s of stocks) {
    const cat = s.category_name || "Uncategorized";
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  }

  return {
    stocks,
    loading,
    error,
    refresh: fetchInventory,
    lastFetched,
    isStale,
    totalItems: stocks.length,
    lowStockItems,
    lowStockCount: lowStockItems.length,
    categoryCounts,
  };
}
