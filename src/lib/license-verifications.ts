import type { LicenseVerificationRequest } from "./admin-api.ts";

export interface LicenseVerificationSummary {
  total: number;
  approved: number;
  pending: number;
  unrequested: number;
}

export type LicenseVerificationStatus =
  | "approved"
  | "pending"
  | "rejected"
  | "not_submitted";

export type LicenseVerificationFilter =
  | "all"
  | "pending"
  | "approved"
  | "needs_submission";

export function licenseVerificationStatus(
  request: LicenseVerificationRequest,
): LicenseVerificationStatus {
  if (request.licenseVerified) return "approved";
  if (request.latestSubmission?.status === "pending_review") return "pending";
  if (request.latestSubmission?.status === "rejected") return "rejected";
  return "not_submitted";
}

export function filterLicenseVerificationRequests(
  requests: LicenseVerificationRequest[],
  filter: LicenseVerificationFilter,
) {
  if (filter === "all") return requests;
  return requests.filter((request) => {
    const status = licenseVerificationStatus(request);
    if (filter === "needs_submission") {
      return status === "rejected" || status === "not_submitted";
    }
    return status === filter;
  });
}

export function licenseVerificationStatusLabel(
  status: LicenseVerificationStatus,
) {
  if (status === "approved") return "인증 완료";
  if (status === "pending") return "승인 요청";
  if (status === "rejected") return "재요청 필요";
  return "미요청";
}

export function summarizeLicenseVerifications(
  requests: LicenseVerificationRequest[],
): LicenseVerificationSummary {
  return requests.reduce<LicenseVerificationSummary>(
    (summary, request) => {
      summary.total += 1;
      const status = licenseVerificationStatus(request);
      if (status === "approved") summary.approved += 1;
      else if (status === "pending") summary.pending += 1;
      else summary.unrequested += 1;
      return summary;
    },
    { total: 0, approved: 0, pending: 0, unrequested: 0 },
  );
}

export function pendingLicenseVerificationRequests(
  requests: LicenseVerificationRequest[],
) {
  return requests.filter(
    (request) => licenseVerificationStatus(request) === "pending",
  );
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
