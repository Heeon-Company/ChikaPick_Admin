import assert from "node:assert/strict";
import test from "node:test";

import {
  adminAccountDirectoryRoleLabel,
  adminAccountDirectoryStatusLabel,
  adminAccountWithdrawalConfirmation,
  adminInviteDisplayName,
  canSwitchAdminAccountRole,
  formatAdminAccountDirectoryDate,
} from "./admin-accounts.ts";

test("admin invitations derive the initial display name from the email", () => {
  assert.equal(adminInviteDisplayName("  admin.user@example.com  "), "admin.user");
  assert.equal(adminInviteDisplayName(""), "");
});

test("admin account directory uses the Figma role and status labels", () => {
  assert.equal(adminAccountDirectoryRoleLabel("super_admin"), "최고 관리자");
  assert.equal(adminAccountDirectoryRoleLabel("sales"), "영업 담당자");
  assert.equal(adminAccountDirectoryRoleLabel("admin"), "운영 관리자");
  assert.equal(adminAccountDirectoryStatusLabel("active"), "활성");
  assert.equal(adminAccountDirectoryStatusLabel("invited"), "초대 대기");
  assert.equal(adminAccountDirectoryStatusLabel("invite_expired"), "초대 만료");
  assert.equal(adminAccountDirectoryStatusLabel("invite_failed"), "전송 실패");
  assert.equal(adminAccountDirectoryStatusLabel("locked"), "잠금");
  assert.equal(adminAccountDirectoryStatusLabel("suspended"), "비활성");
});

test("admin account directory dates render in Korea time", () => {
  assert.equal(
    formatAdminAccountDirectoryDate("2026-07-15T04:42:00.000Z", true),
    "2026.07.15 13:42",
  );
  assert.equal(
    formatAdminAccountDirectoryDate("2026-01-11T15:00:00.000Z"),
    "2026.01.12",
  );
  assert.equal(formatAdminAccountDirectoryDate(null, true), "-");
});

test("admin account withdrawal warns when the current account will be signed out", () => {
  assert.match(
    adminAccountWithdrawalConfirmation(true),
    /본인의 어드민 계정/,
  );
  assert.match(adminAccountWithdrawalConfirmation(true), /로그인 화면/);
  assert.doesNotMatch(
    adminAccountWithdrawalConfirmation(false),
    /로그인 화면/,
  );
});

test("only Super Admins can switch active non-super account roles", () => {
  const activeAccount = {
    kind: "account" as const,
    role: "admin" as const,
    status: "active",
    userId: "admin-1",
  };

  assert.equal(canSwitchAdminAccountRole(true, activeAccount), true);
  assert.equal(canSwitchAdminAccountRole(false, activeAccount), false);
  assert.equal(
    canSwitchAdminAccountRole(true, {
      ...activeAccount,
      role: "super_admin",
    }),
    false,
  );
  assert.equal(
    canSwitchAdminAccountRole(true, { ...activeAccount, status: "locked" }),
    false,
  );
  assert.equal(
    canSwitchAdminAccountRole(true, {
      ...activeAccount,
      kind: "invitation",
      userId: null,
    }),
    false,
  );
});
