import type { EmailOtpType } from "@supabase/supabase-js";

import type { AdminAccountSetupFlow } from "./admin-api.ts";

export const adminPasswordRequirementMessage =
  "비밀번호는 10~72자이며 숫자와 특수문자를 각각 하나 이상 포함해야 합니다.";

const supportedSymbolPattern = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/;

export function validateAdminSetupPassword(password: string) {
  return (
    password.length >= 10 &&
    password.length <= 72 &&
    /\d/.test(password) &&
    supportedSymbolPattern.test(password)
  );
}

export function parseAdminAccountSetupLink(search: string) {
  const params = new URLSearchParams(search);
  const flow = params.get("flow");
  const type = params.get("type");
  const tokenHash = params.get("token_hash");
  if (
    (flow !== "invitation" && flow !== "recovery") ||
    (type !== "email" && type !== "recovery") ||
    !tokenHash ||
    (flow === "invitation" && type !== "email") ||
    (flow === "recovery" && type !== "recovery")
  ) {
    return null;
  }
  return {
    flow: flow as AdminAccountSetupFlow,
    tokenHash,
    type: type as EmailOtpType,
  };
}
