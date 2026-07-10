import { useState, useCallback } from "react";
import api from "@/services/api";
import { format } from "date-fns";

/**
 * P22 — useConsumptionReport hook
 *
 * Manages state for daily consumption report: filters, fetch, normalization.
 * Quantities are strings with embedded units ("250 ml") — displayed as-is.
 */
export default function useConsumptionReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReport = useCallback(async ({ fromDate, toDate, restaurantIds, includeHierarchy } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await api.getDailyConsumptionReport({
        fromDate: fromDate ? format(new Date(fromDate), "yyyy-MM-dd") : undefined,
        toDate: toDate ? format(new Date(toDate), "yyyy-MM-dd") : undefined,
        restaurantIds: restaurantIds?.length ? restaurantIds : undefined,
        includeHierarchy,
      });
      setData(resp.data);
    } catch (err) {
      const errData = err?.response?.data;
      if (err?.response?.status === 403) {
        const scopeErr = errData?.errors?.find?.(e => e.code === "invalid_scope");
        setError(scopeErr?.message || "Access denied — stores outside your scope.");
      } else {
        setError(errData?.message || err.message || "Failed to load consumption report");
      }
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const summary = data?.stock_summary || [];
  const details = data?.stock_details || [];
  const byRestaurant = data?.by_restaurant || [];
  const scope = data?.hierarchy_scope || [];
  const appliedIds = data?.applied_restaurant_ids || [];
  const dateRange = data?.date_range || [];

  return { data, summary, details, byRestaurant, scope, appliedIds, dateRange, loading, error, fetchReport };
}
