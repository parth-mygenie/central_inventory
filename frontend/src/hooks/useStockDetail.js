import { useState, useCallback, useRef } from "react";
import api from "@/services/api";

/**
 * P24: Fetches FEFO stock detail for a single inventory item.
 * Returns: summary, segments, reconciliation, consumptionSummary, consumptionLines
 */
export function useStockDetail(inventoryMasterId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fetchIdRef = useRef(0);

  const fetch = useCallback(
    async ({ consumptionFrom, consumptionTo, consumptionLimit } = {}) => {
      if (!inventoryMasterId) return;
      const id = ++fetchIdRef.current;
      setLoading(true);
      setError(null);
      try {
        const resp = await api.getStockDetail(inventoryMasterId, {
          consumptionFrom,
          consumptionTo,
          consumptionLimit,
        });
        if (id !== fetchIdRef.current) return;
        setData(resp.data);
      } catch (err) {
        if (id !== fetchIdRef.current) return;
        const msg =
          err?.response?.status === 404
            ? "Item not found or not accessible"
            : err?.response?.data?.message || "Failed to load stock detail";
        setError(msg);
      } finally {
        if (id === fetchIdRef.current) setLoading(false);
      }
    },
    [inventoryMasterId]
  );

  return {
    summary: data?.summary || null,
    segments: data?.segments || [],
    reconciliation: data?.quantity_reconciliation || null,
    consumptionSummary: data?.consumption_summary || null,
    consumptionLines: data?.consumption_lines || [],
    loading,
    error,
    fetch,
  };
}
