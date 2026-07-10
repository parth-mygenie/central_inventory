import { useState, useEffect, useCallback } from "react";
import api from "@/services/api";
import { WASTAGE_REASONS } from "@/lib/reasonCategories";

/**
 * P25: Fetches store's configured wastage reasons from API.
 * Falls back to hardcoded WASTAGE_REASONS on error.
 */
export function useWastageReasons() {
  const [reasons, setReasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await api.getWastageReasons();
      const apiReasons = resp.data || [];
      if (apiReasons.length > 0) {
        const mapped = apiReasons.map((r) => ({
          value: String(r.id),
          label: r.reason,
          apiId: r.id,
        }));
        mapped.push({ value: "other", label: "Other" });
        setReasons(mapped);
        setUsingFallback(false);
      } else {
        setReasons(WASTAGE_REASONS);
        setUsingFallback(true);
      }
    } catch {
      setReasons(WASTAGE_REASONS);
      setUsingFallback(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { reasons, loading, usingFallback, refresh: fetch };
}
