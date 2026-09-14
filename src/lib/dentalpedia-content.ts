export type DentalpediaContentType = "video" | "post" | "article";
export type DentalpediaDisplayStatus =
  | "published"
  | "scheduled"
  | "draft"
  | "archived";
export type DentalpediaContentSelection = {
  type: DentalpediaContentType;
  id?: string;
};
export type DentalpediaContentFilters = {
  type: "all" | DentalpediaContentType;
  status: "all" | DentalpediaDisplayStatus;
  category: string;
  search: string;
  page: number;
};
export type AdminDentalpediaContent = {
  id: string;
  type: DentalpediaContentType;
  title: string;
  category: string | null;
  categoryLabel: string;
  thumbnailUrl: string | null;
  status: "draft" | "published" | "archived";
  displayStatus: DentalpediaDisplayStatus;
  visibilityNote: string | null;
  isRecommended: boolean;
  homeVisible: boolean;
  publishAt: string | null;
  updatedAt: string;
};
export type AdminDentalpediaContentPayload = {
  items: AdminDentalpediaContent[];
  total: number;
  page: number;
  pageSize: number;
};

export const dentalpediaTypeLabels = {
  video: "영상",
  post: "게시물",
  article: "칼럼",
} as const;
export const dentalpediaStatusLabels = {
  published: "게시 중",
  scheduled: "예약",
  draft: "임시저장",
  archived: "보관",
} as const;

export function dentalpediaContentQuery(filters: DentalpediaContentFilters) {
  const params = new URLSearchParams({
    type: filters.type,
    status: filters.status,
    page: String(filters.page),
  });
  if (filters.category) params.set("category", filters.category);
  if (filters.search.trim()) params.set("search", filters.search.trim());
  return params.toString();
}

export function dentalpediaContentDate(value: string | null) {
  if (!value || !Number.isFinite(new Date(value).getTime())) return "-";
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date(value))
    .replaceAll("-", ".");
}

// A content correction must retain the original publication date.
export function dentalpediaImmediatePublishAt(
  existing: string | null,
  now = new Date(),
) {
  return existing && new Date(existing).getTime() <= now.getTime()
    ? existing
    : now.toISOString();
}
