export type AdminChikaTalkReportTargetType = "post" | "comment" | "user";
export type AdminChikaTalkReportStatus =
  | "unresolved"
  | "dismissed"
  | "content_removed"
  | "user_sanctioned";

export type AdminChikaTalkReportReason =
  | "advertising_promotion"
  | "abuse_defamation"
  | "personal_information"
  | "medical_misinformation"
  | "diagnosis_treatment_directive"
  | "medical_impersonation"
  | "other";

export interface AdminChikaTalkReportListItem {
  id: string;
  targetType: AdminChikaTalkReportTargetType;
  targetId: string;
  targetAuthorUserId: string | null;
  contentPreview: string;
  reason: AdminChikaTalkReportReason;
  status: AdminChikaTalkReportStatus;
  createdAt: string;
  resolvedAt: string | null;
  unresolvedTargetReportCount: number;
}

export interface AdminChikaTalkReportsPayload {
  items: AdminChikaTalkReportListItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface AdminChikaTalkModerationMetrics {
  unresolvedReports: number;
  oldestUnresolvedAgeSeconds: number;
  actionsLast30Days: number;
  openAppeals: number;
  activeSanctions: number;
}

export interface AdminChikaTalkModerationMetricsPayload {
  metrics: AdminChikaTalkModerationMetrics;
}

export interface AdminChikaTalkRelatedReport {
  id: string;
  reason: AdminChikaTalkReportReason;
  status: AdminChikaTalkReportStatus;
  reporterLabel: string;
  createdAt: string;
  resolvedAt: string | null;
}

export interface AdminChikaTalkModerationAction {
  id: string;
  action: string;
  reasonCode: string;
  createdAt: string;
}

export interface AdminChikaTalkReportDetailPayload {
  report: {
    id: string;
    targetType: AdminChikaTalkReportTargetType;
    targetId: string;
    targetAuthorUserId: string | null;
    reason: AdminChikaTalkReportReason;
    status: AdminChikaTalkReportStatus;
    snapshot: Record<string, unknown>;
    snapshotSha256: string | null;
    evidenceImageUrl: string | null;
    createdAt: string;
    resolvedAt: string | null;
  };
  current: Record<string, unknown> | null;
  author: { displayName: string } | null;
  contextPost: Record<string, unknown> | null;
  sanctions: Record<string, unknown> | null;
  actions: Array<
    AdminChikaTalkModerationAction & {
      adminUserId: string | null;
      priorState: Record<string, unknown>;
      newState: Record<string, unknown>;
    }
  >;
  relatedReports: AdminChikaTalkRelatedReport[];
  authorActions: Array<
    AdminChikaTalkModerationAction & { targetType: string }
  >;
}

const reasonLabels: Record<AdminChikaTalkReportReason, string> = {
  advertising_promotion: "광고 또는 홍보",
  abuse_defamation: "욕설 및 비방",
  personal_information: "개인정보 노출",
  medical_misinformation: "잘못된 의료정보",
  diagnosis_treatment_directive: "질환 단정·치료 지시",
  medical_impersonation: "의사 또는 의료인 사칭",
  other: "기타",
};

const statusLabels: Record<AdminChikaTalkReportStatus, string> = {
  unresolved: "미처리",
  dismissed: "문제없음 처리",
  content_removed: "콘텐츠 삭제",
  user_sanctioned: "사용자 제재",
};

const actionLabels: Record<string, string> = {
  dismiss_report: "문제없음 처리",
  hide_content: "콘텐츠 숨김",
  restore_content: "콘텐츠 복원",
  warn_user: "사용자 경고",
  suspend_writes: "작성 정지",
  suspend_access: "접근 정지",
  ban_user: "영구 이용 정지",
};

export const adminChikaTalkReasonOptions = [
  { label: "신고 사유 전체", value: "all" },
  ...Object.entries(reasonLabels).map(([value, label]) => ({ value, label })),
] as ReadonlyArray<{ label: string; value: "all" | AdminChikaTalkReportReason }>;

export function adminChikaTalkReasonLabel(reason: string) {
  return reasonLabels[reason as AdminChikaTalkReportReason] ?? reason;
}

export function adminChikaTalkReportStatusLabel(status: string) {
  return statusLabels[status as AdminChikaTalkReportStatus] ?? status;
}

export function adminChikaTalkTargetTypeLabel(targetType: string) {
  if (targetType === "post") return "게시글";
  if (targetType === "comment") return "댓글/답글";
  if (targetType === "user") return "사용자";
  return targetType;
}

export function adminChikaTalkActionLabel(action: string) {
  return actionLabels[action] ?? action;
}

export function formatAdminChikaTalkDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(/\. /g, ".")
    .replace(/\.$/, "");
}

export function formatAdminChikaTalkQueueAge(seconds: number) {
  if (seconds <= 0) return "없음";
  if (seconds < 60) return "1분 미만";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간`;
  return `${Math.floor(hours / 24)}일`;
}

export function adminChikaTalkRecordString(
  record: Record<string, unknown> | null,
  ...keys: string[]
) {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}
