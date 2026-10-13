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
    // The dashboard's pending counts come from the same console payload.
    (activeTab === "license-review" || activeTab === "dashboard") &&
    hasLoadedConsole &&
    hasSession &&
    visibilityState === "visible"
  );
}
