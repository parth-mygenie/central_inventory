import { useState, useCallback } from "react";
import api from "@/services/api";
import { toast } from "@/hooks/use-toast";

function extractError(err) {
  const d = err?.response?.data;
  if (d?.errors) {
    if (Array.isArray(d.errors)) return d.errors.map(e => e.message || e.code).join(", ");
    return Object.values(d.errors).flat().join(", ");
  }
  return d?.message || d?.Message || err.message || "Something went wrong";
}

/** Generic catalogue CRUD hook. fetchFn returns normalized array from api.js. */
export function useCatalogueCrud({ fetchFn, createFn, updateFn, deleteFn }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const resp = await fetchFn();
      setItems(resp.data || []);
    } catch (err) { setError(extractError(err)); }
    finally { setLoading(false); }
  }, [fetchFn]);

  const create = useCallback(async (payload, successMsg) => {
    setSubmitting(true);
    try {
      await createFn(payload);
      toast({ title: successMsg || "Created successfully" });
      await load();
      return true;
    } catch (err) { toast({ title: extractError(err), variant: "destructive" }); return false; }
    finally { setSubmitting(false); }
  }, [createFn, load]);

  const update = useCallback(async (id, payload, successMsg) => {
    setSubmitting(true);
    try {
      await updateFn(id, payload);
      toast({ title: successMsg || "Updated successfully" });
      await load();
      return true;
    } catch (err) { toast({ title: extractError(err), variant: "destructive" }); return false; }
    finally { setSubmitting(false); }
  }, [updateFn, load]);

  const remove = useCallback(async (id, successMsg) => {
    setSubmitting(true);
    try {
      await deleteFn(id);
      toast({ title: successMsg || "Deleted successfully" });
      await load();
      return true;
    } catch (err) { toast({ title: extractError(err), variant: "destructive" }); return false; }
    finally { setSubmitting(false); }
  }, [deleteFn, load]);

  return { items, loading, error, submitting, load, create, update, remove };
}
