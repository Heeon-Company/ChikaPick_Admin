export interface ServiceExpansionAreaRequest {
  id: string;
  requesterEmail: string;
  sido: string;
  sigungu: string;
  requestedAt: string;
}

export interface ServiceExpansionRegionSummary {
  rank: number;
  sido: string;
  sigungu: string;
  requestCount: number;
}

export interface ServiceExpansionOverviewPayload {
  metrics: {
    area: {
      totalRequests: number;
      recent30DayRequests: number;
      regionCount: number;
      topRegion: {
        sido: string;
        sigungu: string;
        requestCount: number;
      } | null;
    };
    clinic: {
      totalRequests: number;
      recent30DayRequests: number;
      clinicCount: number;
      topRequestCount: number;
    };
  };
  items: ServiceExpansionAreaRequest[];
  regionSummary: ServiceExpansionRegionSummary[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export function formatServiceExpansionDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const parts = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}.${part("month")}.${part("day")} ${part("hour")}:${part("minute")}`;
}

export function serviceExpansionPageNumbers(currentPage: number, totalPages: number) {
  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) =>
    start + index,
  );
}
