import assert from "node:assert/strict";
import test from "node:test";

import {
  adminAccountSetupCompletionMessage,
  parseAdminAccountSetupLink,
  validateAdminSetupPassword,
} from "./admin-account-setup.ts";

test("admin setup password requires 8-16 characters, a digit, and a supported symbol", () => {
  assert.equal(validateAdminSetupPassword(`${"a".repeat(6)}1!`), true);
  assert.equal(validateAdminSetupPassword(`${"a".repeat(14)}1!`), true);
  assert.equal(validateAdminSetupPassword("NoNumber!!!!"), false);
  assert.equal(validateAdminSetupPassword("NoSymbol123"), false);
  assert.equal(validateAdminSetupPassword("Short1!"), false);
  assert.equal(validateAdminSetupPassword(`${"a".repeat(15)}1!`), false);
});

test("admin invitation links accept only the matching explicit flow and OTP type", () => {
  assert.deepEqual(
    parseAdminAccountSetupLink(
      "?token_hash=secret-hash&type=email&flow=invitation",
    ),
    { flow: "invitation", tokenHash: "secret-hash", type: "email" },
  );
  assert.deepEqual(
    parseAdminAccountSetupLink(
      "?token_hash=recovery-hash&type=recovery&flow=recovery",
    ),
    { flow: "recovery", tokenHash: "recovery-hash", type: "recovery" },
  );
  assert.equal(
    parseAdminAccountSetupLink(
      "?token_hash=secret-hash&type=recovery&flow=invitation",
    ),
    null,
  );
  assert.equal(parseAdminAccountSetupLink("?flow=invitation"), null);
});

test("completed setup directs invitation and recovery recipients to sign in", () => {
  assert.equal(
    adminAccountSetupCompletionMessage("invitation"),
    "어드민 계정이 성공적으로 생성되었습니다.",
  );
  assert.equal(
    adminAccountSetupCompletionMessage("recovery"),
    "비밀번호가 성공적으로 변경되었습니다.",
  );
});
