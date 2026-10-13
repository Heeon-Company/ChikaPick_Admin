export const licenseReviewRefreshIntervalMs = 60_000;

export function shouldRefreshLicenseReview({
  activeTab,
  hasLoadedConsole,
  hasSession,
  visibilityState,
}: {
  activeTab: string;
  hasLoadedConsole: boolean;
  hasSession: boolean;
  visibilityState: DocumentVisibilityState;
}) {
  return (
    // The dashboard's pending counts come from the console payload. The
    // license review tab refreshes its own page of the directory.
    activeTab === "dashboard" &&
    hasLoadedConsole &&
    hasSession &&
    visibilityState === "visible"
  );
}
