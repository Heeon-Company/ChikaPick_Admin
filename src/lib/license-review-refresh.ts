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
    activeTab === "license-review" &&
    hasLoadedConsole &&
    hasSession &&
    visibilityState === "visible"
  );
}
