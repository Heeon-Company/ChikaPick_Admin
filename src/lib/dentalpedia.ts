export type DentalpediaArticleCategory =
  | "treatment-guide"
  | "oral-care"
  | "cost-guide"
  | "dental-news";
export type DentalpediaArticleStatus = "draft" | "published";

export interface AdminDentalpediaArticle {
  id: string;
  slug: string;
  title: string;
  category: DentalpediaArticleCategory;
  categoryLabel: string;
  tags: string[];
  homeSummary: string;
  coverImageUrl: string | null;
  coverImagePath: string | null;
  coverImageAlt: string;
  bodyMarkdown: string | null;
  bodyImagePaths: string[];
  status: DentalpediaArticleStatus;
  homeVisible: boolean;
  isRecommended: boolean;
  homeOrder: number;
  publishAt: string | null;
  authorLabel: string;
  reviewedAt: string | null;
  disclaimerEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminDentalpediaArticleInput {
  slug: string;
  title: string;
  category: DentalpediaArticleCategory;
  tags: string[];
  homeSummary: string;
  coverImagePath: string | null;
  coverImageAlt: string;
  bodyMarkdown: string;
  bodyImagePaths: string[];
  status: DentalpediaArticleStatus;
  homeVisible: boolean;
  isRecommended: boolean;
  homeOrder: number;
  publishAt: string | null;
  authorLabel: string;
  reviewedAt: string | null;
  disclaimerEnabled: boolean;
}

export interface AdminDentalpediaUpload {
  bucket: string;
  path: string;
  token: string;
  publicUrl: string;
}

export function dentalpediaImageError(file: File | null) {
  if (!file) return null;
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return "이미지는 JPG, PNG, WEBP 형식만 등록할 수 있습니다.";
  }
  if (file.size <= 0 || file.size > 10 * 1024 * 1024) {
    return "이미지는 10MB 이하만 등록할 수 있습니다.";
  }
  return null;
}

export function validateDentalpediaArticle(
  input: AdminDentalpediaArticleInput,
  forPublication: boolean,
) {
  if (!input.title.trim()) return "칼럼 제목을 입력해 주세요.";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug.trim())) {
    return "페이지 주소는 영문 소문자, 숫자, 하이픈으로 입력해 주세요.";
  }
  if (!Number.isInteger(input.homeOrder) || input.homeOrder < 1) {
    return "홈 노출 순서를 확인해 주세요.";
  }
  if (input.tags.length > 10) return "태그는 최대 10개까지 등록할 수 있습니다.";
  if (!forPublication) return null;
  if (!input.coverImagePath) return "대표 이미지를 등록해 주세요.";
  if (!input.homeSummary.trim()) return "홈 카드 요약을 입력해 주세요.";
  if (!input.bodyMarkdown.trim()) return "본문 내용을 입력해 주세요.";
  if (!input.publishAt) return "발행일을 입력해 주세요.";
  return null;
}

export function toDateTimeLocalValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function formatDentalpediaDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(date)
    .replaceAll(". ", ".")
    .replace(/\.$/, "");
}
