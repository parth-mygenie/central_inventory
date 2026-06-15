import { useState, useEffect, useCallback, useRef } from "react";
import api from "@/services/api";
import { useLoginContext } from "@/hooks/useLoginContext";

/**
 * P20: Fetches stock inventory for logged-in store.
 * Phase 2 (CR-016): Hierarchy toggle for Master/Central users.
 * When showHierarchy=true, fetches with ?include_hierarchy=true
 * to get hierarchy_summary + hierarchy_context.
 */
export function useStockInventory({ staleAfterMs = 5 * 60 * 1000, initialStockType = "all" } = {}) {
  const { isTopLevel, isMiddleLevel } = useLoginContext();
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  const [showHierarchy, setShowHierarchy] = useState(false);
  const [hierarchySummary, setHierarchySummary] = useState(null);
  const [hierarchyContext, setHierarchyContext] = useState(null);
  const fetchIdRef = useRef(0);

  const canToggleHierarchy = isTopLevel || isMiddleLevel;

  const fetchInventory = useCallback(async () => {
    const id = ++fetchIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const resp = await api.getStockInventory(
        showHierarchy && canToggleHierarchy ? { includeHierarchy: true } : undefined
      );
      if (id !== fetchIdRef.current) return;
      const data = resp.data;
      setStocks(data.current_stocks || []);
      setHierarchySummary(data.hierarchy_summary || null);
      setHierarchyContext(data.hierarchy_context || null);
      setLastFetched(Date.now());
    } catch (err) {
      if (id !== fetchIdRef.current) return;
      setError(err?.response?.data?.message || "Failed to load stock inventory");
    } finally {
      if (id === fetchIdRef.current) setLoading(false);
    }
  }, [showHierarchy, canToggleHierarchy]);

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

  // CR-029: Stock type split (FG vs Raw Materials)
  const [stockType, setStockType] = useState(initialStockType); // "all" | "fg" | "raw"
  const fgCount = stocks.filter((s) => s.type === "SubRecipe" || s.is_sub_recipe === true).length;
  const rawCount = stocks.filter((s) => s.type === "inventory" && !s.is_sub_recipe).length;
  const filteredStocks = stockType === "fg"
    ? stocks.filter((s) => s.type === "SubRecipe" || s.is_sub_recipe === true)
    : stockType === "raw"
    ? stocks.filter((s) => s.type === "inventory" && !s.is_sub_recipe)
    : stocks;

  return {
    stocks,
    filteredStocks,
    loading,
    error,
    refresh: fetchInventory,
    lastFetched,
    isStale,
    totalItems: stocks.length,
    lowStockItems,
    lowStockCount: lowStockItems.length,
    categoryCounts,
    // CR-016: Hierarchy toggle
    canToggleHierarchy,
    showHierarchy,
    setShowHierarchy,
    hierarchySummary,
    hierarchyContext,
    // CR-029: Stock type split
    stockType,
    setStockType,
    fgCount,
    rawCount,
  };
}
