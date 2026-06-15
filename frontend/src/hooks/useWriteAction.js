import { useState, useCallback, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { mapApiErrorMessage } from "@/lib/terminology";

/**
 * Central Inventory — useWriteAction hook
 * Manages submitting state, API call, toast feedback, and refresh.
 */
export function useWriteAction() {
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const execute = useCallback(async (apiCall, { successMsg, onSuccess, onError } = {}) => {
    if (submittingRef.current) return null;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const resp = await apiCall();
      if (successMsg) {
        toast({ title: successMsg, variant: "default" });
      }
      if (onSuccess) await onSuccess(resp);
      return resp;
    } catch (err) {
      const status = err?.response?.status;
      const apiMsg = err?.response?.data?.message || err?.response?.data?.error || "";
      let userMsg;
      if (!err.response && err.code === "ECONNABORTED") {
        userMsg = "Request timed out — the action may have been processed. Check transfer status before retrying.";
      } else if (!err.response) {
        userMsg = "Network error — check transfer status before retrying";
      } else if (status === 403) {
        userMsg = apiMsg
          ? `Permission denied: ${mapApiErrorMessage(apiMsg)}`
          : "Permission denied — you cannot perform this action";
      } else if (status === 404) {
        userMsg = "Transfer not found";
      } else {
        userMsg = mapApiErrorMessage(apiMsg) || "Something went wrong. Please try again.";
      }
      toast({ title: userMsg, variant: "destructive" });
      if (onError) onError(err);
      return null;
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, []);

  return { submitting, execute };
}
