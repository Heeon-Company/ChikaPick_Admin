import { useEffect, useRef } from "react";

export const autoRefreshIntervalMs = 60_000;
// Returning to the window fires both focus and visibilitychange.
const duplicateTriggerWindowMs = 2_000;

/**
 * Re-runs `refresh` every minute and whenever the admin comes back to the
 * window, so lists fed by outside activity (signups, requests, reports) stay
 * current while a tab is left open. Hidden windows are skipped.
 */
export function useAutoRefresh(refresh: () => void, enabled = true) {
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;
    let lastRunAt = 0;
    const run = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastRunAt < duplicateTriggerWindowMs) return;
      lastRunAt = now;
      refreshRef.current();
    };
    const intervalId = window.setInterval(run, autoRefreshIntervalMs);
    document.addEventListener("visibilitychange", run);
    window.addEventListener("focus", run);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", run);
      window.removeEventListener("focus", run);
    };
  }, [enabled]);
}

/**
 * Tabs that swap their list for a full-page detail keep the list state
 * mounted; reload it when the detail closes so the list is not stale.
 */
export function useRefreshOnDetailClose(
  selectedId: string | null,
  refresh: () => void,
) {
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  const previousIdRef = useRef(selectedId);
  useEffect(() => {
    const wasOpen = previousIdRef.current !== null;
    previousIdRef.current = selectedId;
    if (!wasOpen || selectedId !== null) return;
    const timeoutId = window.setTimeout(() => refreshRef.current(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [selectedId]);
}
