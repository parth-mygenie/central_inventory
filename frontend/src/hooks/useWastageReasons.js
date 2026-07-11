import { useState, useEffect, useCallback } from "react";
import api from "@/services/api";
import { WASTAGE_REASONS } from "@/lib/reasonCategories";

/**
 * P25: Fetches store's configured wastage reasons from API.
 * Falls back to hardcoded WASTAGE_REASONS on error.
 * CR-038 — exposes canEdit from API for add-reason inline.
 */
export function useWastageReasons() {
  const [reasons, setReasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [canEdit, setCanEdit] = useState(false); // CR-038

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await api.getWastageReasons();
      const body = resp.data || {};
      // CR-038: /wastage-reasons/list returns {reasons:[], is_master, can_edit}
      // The api.js method now normalizes both list and legacy paths.
      const apiReasons = Array.isArray(body) ? body : (body.reasons || []);
      const edit = body.can_edit === true; // CR-038
      setCanEdit(edit);
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

  return { reasons, loading, usingFallback, canEdit, refresh: fetch };
}
