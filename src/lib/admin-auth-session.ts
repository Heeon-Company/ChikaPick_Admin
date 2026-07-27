type AccessTokenSession = {
  access_token?: string | null;
} | null;

type AdminSessionErrorLike = {
  code?: unknown;
  status?: unknown;
  statusCode?: unknown;
};

export function shouldAutoLoadAdminConsole(
  lastLoadedAccessToken: string | null,
  nextSession: AccessTokenSession,
) {
  const nextAccessToken = nextSession?.access_token ?? null;
  return Boolean(nextAccessToken && nextAccessToken !== lastLoadedAccessToken);
}

export function isAdminConsoleReady({
  authorizedUserId,
  hasLoadedConsole,
  sessionUserId,
}: {
  authorizedUserId: string | null;
  hasLoadedConsole: boolean;
  sessionUserId: string;
}) {
  return hasLoadedConsole && authorizedUserId === sessionUserId;
}

export function adminSessionRejectionMessage(error: unknown) {
  if (!error || typeof error !== "object") return null;

  const candidate = error as AdminSessionErrorLike;
  const code = typeof candidate.code === "string" ? candidate.code : null;
  const status =
    typeof candidate.status === "number"
      ? candidate.status
      : typeof candidate.statusCode === "number"
        ? candidate.statusCode
        : null;

  if (code === "ADMIN_ACCOUNT_LOCKED" || status === 423) {
    return "잠긴 어드민 계정입니다. 최고 관리자에게 잠금 해제를 요청해 주세요.";
  }
  if (code === "ADMIN_REQUIRED" || status === 403) {
    return "관리자 계정 설정이 완료되지 않았습니다. 최신 초대 메일에서 비밀번호 설정 완료까지 진행해 주세요.";
  }
  if (status === 401) {
    return "관리자 세션이 만료되었습니다. 다시 로그인해 주세요.";
  }

  return null;
}
