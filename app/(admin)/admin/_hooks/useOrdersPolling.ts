"use client";

import { useEffect, useRef } from "react";

interface UseOrdersPollingOptions {
  /**
   * Whether polling is currently active (e.g. not when detail view is open).
   */
  active: boolean;
  /**
   * Callback invoked on each poll tick. Should be wrapped in useCallback.
   */
  onPoll: () => void;
  /**
   * Interval in ms (default 30000).
   */
  intervalMs?: number;
  /**
   * Also poll on window focus (default true).
   */
  pollOnFocus?: boolean;
}

/**
 * Polls the orders list on a fixed interval, pausing when the document
 * is not visible (e.g. user switched tabs). Respects active flag so
 * polling stops when the detail panel is open.
 *
 * Usage in PedidosSection:
 *   useOrdersPolling({ active: !selectedOrder, onPoll: () => loadOrders({ silent: true }) });
 */
export function useOrdersPolling({
  active,
  onPoll,
  intervalMs = 30000,
  pollOnFocus = true,
}: UseOrdersPollingOptions) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function clear() {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    if (active) {
      // Start polling only when document is visible
      if (document.visibilityState === "visible") {
        intervalRef.current = setInterval(onPoll, intervalMs);
      }
    } else {
      clear();
    }

    // Listen for visibility changes to pause/resume
    const handleVisibility = () => {
      clear();
      if (active && document.visibilityState === "visible") {
        intervalRef.current = setInterval(onPoll, intervalMs);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Listen for window focus to refresh immediately
    const handleFocus = () => {
      if (active && pollOnFocus) {
        onPoll();
      }
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      clear();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
    };
  }, [active, onPoll, intervalMs, pollOnFocus]);
}