export type ClinicPartnershipRequestStatus =
  | "pending"
  | "contacting"
  | "completed"
  | "on_hold";

export interface ClinicPartnershipRequester {
  id: string;
  userId: string;
  fullName: string | null;
  email: string | null;
  createdAt: string;
}

export interface ClinicPartnershipRequestItem {
  placeProvider: string;
  externalPlaceId: string;
  clinicName: string;
  address: string | null;
  district: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  placeUrl: string | null;
  status: ClinicPartnershipRequestStatus;
  adminNote: string | null;
  statusUpdatedAt: string | null;
  statusUpdatedBy: string | null;
  requestCount: number;
  firstRequestedAt: string;
  lastRequestedAt: string;
  requesters: ClinicPartnershipRequester[];
}

export interface ClinicPartnershipRequestPayload {
  metrics: {
    pending: number;
    contacting: number;
    completed: number;
    onHold: number;
  };
  items: ClinicPartnershipRequestItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface ClinicPartnershipRequestFilters {
  query: string;
  status: ClinicPartnershipRequestStatus | "all";
}

export const defaultClinicPartnershipRequestFilters: ClinicPartnershipRequestFilters = {
  query: "",
  status: "all",
};

export const clinicPartnershipRequestStatusOptions: Array<{
  label: string;
  value: ClinicPartnershipRequestStatus | "all";
}> = [
  { value: "all", label: "전체" },
  { value: "pending", label: "접수" },
  { value: "contacting", label: "연락 중" },
  { value: "completed", label: "입점 완료" },
  { value: "on_hold", label: "보류" },
];

export function clinicPartnershipRequestStatusLabel(status: string) {
  return (
    {
      pending: "접수",
      contacting: "연락 중",
      completed: "입점 완료",
      on_hold: "보류",
    }[status] ?? status
  );
}

export function clinicPartnershipProviderLabel(provider: string) {
  return (
    {
      hira: "HIRA",
      kakao_local: "Kakao",
    }[provider] ?? provider
  );
}

export function formatClinicPartnershipRequestDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(date);
}

export function safeClinicPartnershipUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function clinicPartnershipRequestPageNumbers(
  currentPage: number,
  totalPages: number,
) {
  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) =>
    start + index,
  );
}
