/**
 * Central Inventory — Real-time Hook Placeholder
 *
 * Prepared for future WebSocket/polling integration.
 * Per Q-NOTIF-002: Polling Phase 1; WebSocket Phase 2.
 *
 * HANDOVER NOTE:
 * Required socket event names (not yet confirmed by backend):
 *   - inventory.transfer.status_changed
 *   - inventory.stock.low_alert
 *   - inventory.stock.updated
 *   - inventory.transfer.new_request
 *
 * DO NOT enable until backend event contract is confirmed.
 */

import { useEffect, useRef, useCallback } from "react";

export function useCentralInventoryRealtime({ enabled = false, onEvent } = {}) {
  const callbackRef = useRef(onEvent);
  callbackRef.current = onEvent;

  useEffect(() => {
    if (!enabled) return;

    // TODO: Connect to WebSocket or polling endpoint
    // when backend event contract is confirmed.
    // For now, this is a no-op placeholder.

    return () => {
      // Cleanup connection
    };
  }, [enabled]);

  const subscribe = useCallback(() => {
    // No-op until backend events are confirmed
  }, []);

  const unsubscribe = useCallback(() => {
    // No-op
  }, []);

  return {
    isConnected: false,
    subscribe,
    unsubscribe,
  };
}
