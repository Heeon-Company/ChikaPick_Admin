import type { MembershipCategory } from "./membership-management.ts";

export type MembershipInviteStatus = "active" | "redeemed" | "revoked";
export type MembershipInviteStatusFilter = MembershipInviteStatus | "all";

export interface AdminMembershipInvite {
  accountEmail: string | null;
  hasBusinessLicense: boolean;
  id: string;
  issuedAt: string;
  issuerEmail: string | null;
  partnerCategory: MembershipCategory;
  partnerDeleted: boolean;
  partnerId: string;
  partnerName: string;
  redeemedAt: string | null;
  status: MembershipInviteStatus;
}

export interface AdminMembershipInvitePayload {
  items: AdminMembershipInvite[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface AdminMembershipInviteFilters {
  query: string;
  status: MembershipInviteStatusFilter;
}

export interface AdminMembershipInviteIssueInput {
  businessLicense: File | null;
  category: MembershipCategory;
  name: string;
}

export const defaultAdminMembershipInviteFilters: AdminMembershipInviteFilters = {
  query: "",
  status: "all",
};

export function membershipInviteStatusLabel(status: MembershipInviteStatus) {
  if (status === "redeemed") return "가입 완료";
  if (status === "revoked") return "폐기";
  return "가입 대기";
}

const businessLicenseTypes = ["application/pdf", "image/jpeg", "image/png"];

export function validateMembershipInviteIssue(input: AdminMembershipInviteIssueInput) {
  if (!input.name.trim()) return "업체명을 입력해 주세요.";
  if (!input.businessLicense) return "사업자등록증 사본을 첨부해 주세요.";
  if (!businessLicenseTypes.includes(input.businessLicense.type)) {
    return "사업자등록증은 PDF, JPG, PNG 파일만 첨부할 수 있습니다.";
  }
  if (input.businessLicense.size > 10 * 1024 * 1024) {
    return "사업자등록증은 10MB 이하만 첨부할 수 있습니다.";
  }
  return null;
}

// A code can be issued again only while nobody has signed up with it.
export function canReissueMembershipInvite(invite: AdminMembershipInvite) {
  return invite.status !== "redeemed" && !invite.partnerDeleted;
}
