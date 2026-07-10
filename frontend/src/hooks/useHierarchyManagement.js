import { useState, useCallback } from "react";
import api from "@/services/api";

/**
 * P23 — useHierarchyManagement hook
 * Manages hierarchy list, create, push, and history state.
 */
export default function useHierarchyManagement() {
  // List state
  const [children, setChildren] = useState([]);
  const [listMeta, setListMeta] = useState(null);
  const [parentInfo, setParentInfo] = useState(null);
  const [allowedChildTypes, setAllowedChildTypes] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState(null);

  // Create metadata
  const [createMeta, setCreateMeta] = useState(null);

  // Push state
  const [pushForm, setPushForm] = useState(null);
  const [pushResults, setPushResults] = useState(null);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushError, setPushError] = useState(null);

  // History state
  const [history, setHistory] = useState([]);
  const [historyMeta, setHistoryMeta] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Nested franchises for master push tree
  const [nestedFranchises, setNestedFranchises] = useState([]);

  const fetchList = useCallback(async ({ childType, limit, page } = {}) => {
    setListLoading(true);
    setListError(null);
    try {
      const resp = await api.getHierarchyList({ childType, limit: limit || 50, page });
      const d = resp.data?.data || resp.data;
      setChildren(d.children || []);
      setParentInfo(d.parent || null);
      setAllowedChildTypes(d.allowed_child_types || []);
      setListMeta(resp.data?.meta || null);
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || "Failed to load hierarchy";
      setListError(msg);
      setChildren([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  // Fetch nested franchises (for master push targets)
  const fetchNestedFranchises = useCallback(async (centralChildren) => {
    if (!centralChildren?.length) { setNestedFranchises([]); return; }
    try {
      // Use hierarchy-summary to discover all franchises in tree
      const resp = await api.getHierarchySummary({ storeType: "franchise" });
      const data = resp.data?.data || resp.data;
      const stores = data?.stores || [];
      // These are franchises visible to the actor — includes nested ones
      const centralIds = new Set(centralChildren.map(c => c.id));
      const directChildIds = new Set(); // will be filled from children list
      setNestedFranchises(stores.map(s => ({
        id: s.restaurant_id,
        name: s.restaurant_name,
        restaurantTypeFlag: s.restaurant_type || "franchise",
      })));
    } catch {
      setNestedFranchises([]);
    }
  }, []);

  const fetchCreateMeta = useCallback(async () => {
    try {
      const resp = await api.getCreateMetadata();
      setCreateMeta(resp.data?.data || resp.data);
    } catch { setCreateMeta(null); }
  }, []);

  const createChild = useCallback(async (payload) => {
    const resp = await api.createHierarchyChild(payload);
    return resp.data;
  }, []);

  const fetchPushForm = useCallback(async (childId) => {
    setPushLoading(true);
    setPushError(null);
    setPushResults(null);
    try {
      const resp = await api.getPushForm(childId);
      setPushForm(resp.data?.data || resp.data);
    } catch (err) {
      setPushError(err?.response?.data?.message || "Failed to load push preview");
      setPushForm(null);
    } finally {
      setPushLoading(false);
    }
  }, []);

  const executePush = useCallback(async (childId) => {
    setPushLoading(true);
    setPushError(null);
    try {
      const resp = await api.pushBundle(childId);
      const d = resp.data?.data || resp.data;
      setPushResults(d.results || d);
      return d;
    } catch (err) {
      const data = err?.response?.data;
      setPushError(data?.message || "Push failed");
      throw err;
    } finally {
      setPushLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async ({ limit, page } = {}) => {
    setHistoryLoading(true);
    try {
      const resp = await api.getHierarchyHistory({ limit: limit || 25, page });
      const d = resp.data?.data || resp.data;
      setHistory(d.logs || []);
      setHistoryMeta(resp.data?.meta || null);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const resetPush = useCallback(() => {
    setPushForm(null);
    setPushResults(null);
    setPushError(null);
  }, []);

  return {
    children, listMeta, parentInfo, allowedChildTypes, listLoading, listError, fetchList,
    nestedFranchises, fetchNestedFranchises,
    createMeta, fetchCreateMeta, createChild,
    pushForm, pushResults, pushLoading, pushError, fetchPushForm, executePush, resetPush,
    history, historyMeta, historyLoading, fetchHistory,
  };
}
