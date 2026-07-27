import assert from "node:assert/strict";
import { test } from "node:test";

import {
  adminSessionRejectionMessage,
  isAdminConsoleReady,
  shouldAutoLoadAdminConsole,
} from "./admin-auth-session.ts";

test("shouldAutoLoadAdminConsole skips empty sessions", () => {
  assert.equal(shouldAutoLoadAdminConsole(null, null), false);
  assert.equal(shouldAutoLoadAdminConsole(null, { access_token: "" }), false);
});

test("shouldAutoLoadAdminConsole loads once for a new access token", () => {
  assert.equal(
    shouldAutoLoadAdminConsole(null, { access_token: "access-token-1" }),
    true,
  );
});

test("shouldAutoLoadAdminConsole skips repeated access tokens", () => {
  assert.equal(
    shouldAutoLoadAdminConsole("access-token-1", {
      access_token: "access-token-1",
    }),
    false,
  );
});

test("shouldAutoLoadAdminConsole reloads after token refresh", () => {
  assert.equal(
    shouldAutoLoadAdminConsole("access-token-1", {
      access_token: "access-token-2",
    }),
    true,
  );
});

test("adminSessionRejectionMessage explains incomplete invitation sessions", () => {
  assert.equal(
    adminSessionRejectionMessage({ code: "ADMIN_REQUIRED", statusCode: 403 }),
    "관리자 계정 설정이 완료되지 않았습니다. 최신 초대 메일에서 비밀번호 설정 완료까지 진행해 주세요.",
  );
  assert.equal(
    adminSessionRejectionMessage({ status: 403 }),
    "관리자 계정 설정이 완료되지 않았습니다. 최신 초대 메일에서 비밀번호 설정 완료까지 진행해 주세요.",
  );
});

test("isAdminConsoleReady requires authorization for the current session user", () => {
  assert.equal(
    isAdminConsoleReady({
      authorizedUserId: null,
      hasLoadedConsole: false,
      sessionUserId: "invitee-1",
    }),
    false,
  );
  assert.equal(
    isAdminConsoleReady({
      authorizedUserId: "admin-1",
      hasLoadedConsole: true,
      sessionUserId: "invitee-1",
    }),
    false,
  );
  assert.equal(
    isAdminConsoleReady({
      authorizedUserId: "admin-1",
      hasLoadedConsole: true,
      sessionUserId: "admin-1",
    }),
    true,
  );
});

test("adminSessionRejectionMessage handles locked and expired sessions", () => {
  assert.equal(
    adminSessionRejectionMessage({ code: "ADMIN_ACCOUNT_LOCKED", status: 423 }),
    "잠긴 어드민 계정입니다. 최고 관리자에게 잠금 해제를 요청해 주세요.",
  );
  assert.equal(
    adminSessionRejectionMessage({ statusCode: 401 }),
    "관리자 세션이 만료되었습니다. 다시 로그인해 주세요.",
  );
  assert.equal(adminSessionRejectionMessage({ status: 500 }), null);
  assert.equal(adminSessionRejectionMessage(new Error("network")), null);
});
