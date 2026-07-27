import assert from "node:assert/strict";
import test from "node:test";

import {
  parseAdminAccountSetupLink,
  validateAdminSetupPassword,
} from "./admin-account-setup.ts";

test("admin setup password requires length, a digit, and a supported symbol", () => {
  assert.equal(validateAdminSetupPassword("StrongPass1!"), true);
  assert.equal(validateAdminSetupPassword("NoNumber!!!!"), false);
  assert.equal(validateAdminSetupPassword("NoSymbol123"), false);
  assert.equal(validateAdminSetupPassword("Short1!"), false);
  assert.equal(validateAdminSetupPassword(`${"a".repeat(71)}1!`), false);
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
