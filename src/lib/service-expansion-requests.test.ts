import assert from "node:assert/strict";
import test from "node:test";

import {
  formatServiceExpansionDate,
  serviceExpansionPageNumbers,
} from "./service-expansion-requests.ts";

test("service expansion dates use the compact Korea-time table format", () => {
  assert.equal(
    formatServiceExpansionDate("2026-08-28T05:32:00.000Z"),
    "2026.08.28 14:32",
  );
  assert.equal(formatServiceExpansionDate("invalid"), "—");
});

test("service expansion pagination keeps a compact five-page window", () => {
  assert.deepEqual(serviceExpansionPageNumbers(1, 8), [1, 2, 3, 4, 5]);
  assert.deepEqual(serviceExpansionPageNumbers(7, 8), [4, 5, 6, 7, 8]);
});
