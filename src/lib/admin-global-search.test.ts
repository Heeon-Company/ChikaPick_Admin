import assert from "node:assert/strict";
import test from "node:test";
import {
  canSearchAdminRecords,
  isAdminSearchEmail,
  matchAdminMenuTabs,
} from "./admin-global-search.ts";
import { primaryTabs } from "./admin-tabs.ts";

test("menu matching ignores spaces and case", () => {
  assert.deepEqual(
    matchAdminMenuTabs(primaryTabs, "파트너치과").map((tab) => tab.id),
    ["partner-clinics"],
  );
  assert.deepEqual(
    matchAdminMenuTabs(primaryTabs, " 계정 조회 ").map((tab) => tab.id),
    ["chikapick-accounts", "partner-accounts"],
  );
  assert.deepEqual(matchAdminMenuTabs([{ label: "FAQ 관리" }], "faq"), [{ label: "FAQ 관리" }]);
});

test("menu matching returns nothing for blank input", () => {
  assert.deepEqual(matchAdminMenuTabs(primaryTabs, "   "), []);
});

test("menu matching only uses the tabs it is given", () => {
  const visible = primaryTabs.filter((tab) => tab.id !== "sales-performance");
  assert.deepEqual(matchAdminMenuTabs(visible, "영업 성과"), []);
});

test("email detection accepts trimmed addresses only", () => {
  assert.equal(isAdminSearchEmail(" doctor@example.com "), true);
  assert.equal(isAdminSearchEmail("doctor@example"), false);
  assert.equal(isAdminSearchEmail("치과 doctor@example.com"), false);
});

test("record search waits for two characters", () => {
  assert.equal(canSearchAdminRecords("치"), false);
  assert.equal(canSearchAdminRecords(" 치과 "), true);
});
