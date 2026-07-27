"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  completeAdminAccountSetup,
  fetchAdminAccountSetup,
  type AdminAccountSetupFlow,
  type AdminAccountSetupPayload,
} from "@/lib/admin-api";
import {
  adminAccountSetupCompletionMessage,
  adminPasswordRequirementMessage,
  parseAdminAccountSetupLink,
  validateAdminSetupPassword,
} from "@/lib/admin-account-setup";
import { signOutCurrentAdminSession } from "@/lib/browser-session";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type SetupStage =
  | "loading"
  | "confirm"
  | "verifying"
  | "password"
  | "submitting"
  | "success"
  | "locked"
  | "error";

export default function AdminAccountSetupPage() {
  const [stage, setStage] = useState<SetupStage>("loading");
  const [flow, setFlow] = useState<AdminAccountSetupFlow | null>(null);
  const [context, setContext] = useState<AdminAccountSetupPayload | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");

  const loadContext = useCallback(async (selectedFlow: AdminAccountSetupFlow) => {
    const supabase = createSupabaseBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error("이메일 링크를 다시 열어 본인 확인을 완료해 주세요.");
    }
    const payload = await fetchAdminAccountSetup(
      session.access_token,
      selectedFlow,
    );
    setContext(payload);
    if (payload.completed) {
      await signOutCurrentAdminSession(supabase);
      if (payload.accountStatus === "locked") {
        setMessage(
          "비밀번호는 변경되었지만 계정 잠금은 유지됩니다. 최고 관리자에게 잠금 해제를 요청해 주세요.",
        );
        setStage("locked");
        return;
      }
      setMessage(adminAccountSetupCompletionMessage(selectedFlow));
      setStage("success");
      return;
    }
    setStage("password");
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const parsed = parseAdminAccountSetupLink(window.location.search);
      const params = new URLSearchParams(window.location.search);
      const savedFlow = params.get("flow");
      if (parsed) {
        setFlow(parsed.flow);
        setStage("confirm");
        return;
      }
      if (savedFlow === "invitation" || savedFlow === "recovery") {
        setFlow(savedFlow);
        void loadContext(savedFlow).catch((error) => {
          setMessage(setupErrorMessage(error));
          setStage("error");
        });
        return;
      }
      setMessage(
        "올바르지 않은 링크입니다. 관리자에게 초대 또는 비밀번호 재설정 메일을 다시 요청해 주세요.",
      );
      setStage("error");
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadContext]);

  async function verifyLink() {
    const parsed = parseAdminAccountSetupLink(window.location.search);
    if (!parsed) {
      setMessage("올바르지 않거나 이미 제거된 확인 링크입니다.");
      setStage("error");
      return;
    }
    setStage("verifying");
    setMessage("");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: parsed.tokenHash,
      type: parsed.type,
    });
    window.history.replaceState(null, "", `/account/setup?flow=${parsed.flow}`);
    if (error) {
      setMessage(
        "만료되었거나 이미 사용된 링크입니다. 관리자에게 새 메일을 요청해 주세요.",
      );
      setStage("error");
      return;
    }
    try {
      await loadContext(parsed.flow);
    } catch (loadError) {
      setMessage(setupErrorMessage(loadError));
      setStage("error");
    }
  }

  async function submitPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!flow || !context) return;
    if (!validateAdminSetupPassword(password)) {
      setMessage(adminPasswordRequirementMessage);
      return;
    }
    if (password !== confirmation) {
      setMessage("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setStage("submitting");
    setMessage("");
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("본인 확인 세션이 만료되었습니다.");
      }
      const result = await completeAdminAccountSetup(session.access_token, {
        flow,
        password,
      });
      setPassword("");
      setConfirmation("");
      if (result.accountStatus === "locked") {
        await signOutCurrentAdminSession(supabase);
        setMessage(
          "비밀번호는 변경되었지만 계정 잠금은 유지됩니다. 최고 관리자에게 잠금 해제를 요청해 주세요.",
        );
        setStage("locked");
        return;
      }
      await signOutCurrentAdminSession(supabase);
      setMessage(adminAccountSetupCompletionMessage(flow));
      setStage("success");
    } catch (error) {
      setMessage(setupErrorMessage(error));
      setStage("password");
    }
  }

  const title =
    flow === "recovery" ? "비밀번호 재설정" : "관리자 계정 초대";

  return (
    <main className="admin-setup">
      <section className="admin-setup-card" aria-labelledby="setup-title">
        <div className="admin-login-brand" aria-label="치카픽 어드민">
          <span className="admin-login-brand-symbol">
            <Image src="/chikapick_logo.png" alt="" fill sizes="45px" priority />
          </span>
          <span className="admin-login-brand-text">
            <Image
              src="/chikapick_logo_text.svg"
              alt="치카픽"
              fill
              sizes="101px"
              priority
            />
          </span>
          <span className="admin-login-brand-label">어드민</span>
        </div>
        <h1 id="setup-title">{title}</h1>

        {stage === "loading" ? <p>계정 설정 정보를 확인하고 있습니다.</p> : null}

        {stage === "confirm" ? (
          <div className="admin-setup-confirm">
            <p>
              {flow === "invitation"
                ? "초대받은 이메일을 확인하고 관리자 계정 설정을 시작합니다."
                : "본인 확인 후 새 비밀번호를 설정합니다."}
            </p>
            <button type="button" onClick={() => void verifyLink()}>
              {flow === "invitation" ? "초대 수락" : "본인 확인"}
            </button>
          </div>
        ) : null}

        {stage === "verifying" ? <p>이메일 링크를 확인하고 있습니다.</p> : null}

        {(stage === "password" || stage === "submitting") && context ? (
          <form className="admin-setup-form" onSubmit={submitPassword}>
            <dl>
              <div>
                <dt>이메일</dt>
                <dd>{context.email}</dd>
              </div>
            </dl>
            <label>
              <span>새 비밀번호</span>
              <input
                required
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={16}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <label>
              <span>비밀번호 확인</span>
              <input
                required
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={16}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </label>
            <p className="admin-setup-help">{adminPasswordRequirementMessage}</p>
            {message ? <p className="admin-setup-error" role="alert">{message}</p> : null}
            <button type="submit" disabled={stage === "submitting"}>
              {stage === "submitting" ? "설정 중" : "비밀번호 설정 완료"}
            </button>
          </form>
        ) : null}

        {stage === "success" ? (
          <div className="admin-setup-result">
            <p>{message}</p>
            <Link href="/">치카픽 어드민 로그인</Link>
          </div>
        ) : null}

        {stage === "locked" ? (
          <div className="admin-setup-result">
            <p>{message}</p>
            <Link href="/">로그인 화면으로 이동</Link>
          </div>
        ) : null}

        {stage === "error" ? (
          <div className="admin-setup-result" role="alert">
            <p>{message}</p>
            <Link href="/">로그인 화면으로 이동</Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function setupErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "계정 설정을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}
