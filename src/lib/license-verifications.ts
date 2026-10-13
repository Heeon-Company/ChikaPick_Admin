import type {
  LicenseVerificationFilter,
  LicenseVerificationRequest,
} from "./admin-api.ts";

export type { LicenseVerificationFilter };

export type LicenseVerificationStatus =
  | "approved"
  | "pending"
  | "rejected"
  | "not_submitted";

export function licenseVerificationStatus(
  request: LicenseVerificationRequest,
): LicenseVerificationStatus {
  if (request.licenseVerified) return "approved";
  if (request.latestSubmission?.status === "pending_review") return "pending";
  if (request.latestSubmission?.status === "rejected") return "rejected";
  return "not_submitted";
}

export function licenseVerificationStatusLabel(
  status: LicenseVerificationStatus,
) {
  if (status === "approved") return "인증 완료";
  if (status === "pending") return "승인 요청";
  if (status === "rejected") return "재요청 필요";
  return "미요청";
}

export function licenseRequestTimeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: "Asia/Seoul",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}.${parts.month}.${parts.day} ${parts.hour}:${parts.minute}`;
}

export function licenseMembershipRoleLabel(role: "owner" | "doctor") {
  return role === "owner" ? "원장" : "치과의사";
}

export function normalizeLicenseRejectionReason(value: string) {
  const reason = value.trim();
  return reason || null;
}
