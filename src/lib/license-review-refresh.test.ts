import assert from "node:assert/strict";
import test from "node:test";

import {
  licenseReviewRefreshIntervalMs,
  shouldRefreshLicenseReview,
} from "./license-review-refresh.ts";

test("license review refreshes only while its authenticated tab is visible", () => {
  assert.equal(licenseReviewRefreshIntervalMs, 60_000);
  assert.equal(
    shouldRefreshLicenseReview({
      activeTab: "license-review",
      hasLoadedConsole: true,
      hasSession: true,
      visibilityState: "visible",
    }),
    true,
  );
  assert.equal(
    shouldRefreshLicenseReview({
      activeTab: "dashboard",
      hasLoadedConsole: true,
      hasSession: true,
      visibilityState: "visible",
    }),
    false,
  );
  assert.equal(
    shouldRefreshLicenseReview({
      activeTab: "license-review",
      hasLoadedConsole: true,
      hasSession: true,
      visibilityState: "hidden",
    }),
    false,
  );
});
