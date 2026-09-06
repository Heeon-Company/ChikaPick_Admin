export type DentalpediaArticleCategory = string;
export type DentalpediaArticleStatus = "draft" | "published";

export interface AdminDentalpediaArticle {
  id: string;
  slug: string;
  title: string;
  category: DentalpediaArticleCategory;
  categoryLabel: string;
  tags: string[];
  searchKeywords: string[];
  homeSummary: string;
  coverImageUrl: string | null;
  coverImagePath: string | null;
  coverImageAlt: string;
  bodyMarkdown: string | null;
  bodyImagePaths: string[];
  status: DentalpediaArticleStatus;
  isVisible: boolean;
  homeVisible: boolean;
  isRecommended: boolean;
  isHero: boolean;
  homeOrder: number;
  publishAt: string | null;
  endAt: string | null;
  authorLabel: string;
  authoredAt: string | null;
  reviewedAt: string | null;
  reviewerLabel: string | null;
  disclaimerEnabled: boolean;
  relatedContentIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminDentalpediaArticleInput {
  slug: string;
  title: string;
  category: DentalpediaArticleCategory;
  tags: string[];
  searchKeywords: string[];
  homeSummary: string;
  coverImagePath: string | null;
  coverImageAlt: string;
  bodyMarkdown: string;
  bodyImagePaths: string[];
  status: DentalpediaArticleStatus;
  isVisible: boolean;
  homeVisible: boolean;
  isRecommended: boolean;
  isHero: boolean;
  homeOrder: number;
  publishAt: string | null;
  endAt: string | null;
  authorLabel: string;
  authoredAt: string | null;
  reviewedAt: string | null;
  reviewerLabel: string | null;
  disclaimerEnabled: boolean;
  relatedContentIds: string[];
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
  if (input.title.trim().length > 120) {
    return "칼럼 제목은 120자 이하로 입력해 주세요.";
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug.trim())) {
    return "페이지 주소는 영문 소문자, 숫자, 하이픈으로 입력해 주세요.";
  }
  if (!Number.isInteger(input.homeOrder) || input.homeOrder < 1) {
    return "홈 노출 순서를 확인해 주세요.";
  }
  if (input.tags.length > 10) return "태그는 최대 10개까지 등록할 수 있습니다.";
  if (input.searchKeywords.length > 20) {
    return "검색 키워드는 최대 20개까지 등록할 수 있습니다.";
  }
  if (input.homeSummary.trim().length > 200) {
    return "카드 요약은 200자 이하로 입력해 주세요.";
  }
  if (!input.authorLabel.trim()) return "작성자를 입력해 주세요.";
  if (input.authorLabel.trim().length > 40) {
    return "작성자는 40자 이하로 입력해 주세요.";
  }
  if ((input.reviewerLabel ?? "").trim().length > 40) {
    return "검수자는 40자 이하로 입력해 주세요.";
  }
  if (input.relatedContentIds.length > 10) {
    return "관련 콘텐츠는 최대 10개까지 선택할 수 있습니다.";
  }
  if (
    input.publishAt &&
    input.endAt &&
    new Date(input.endAt).getTime() <= new Date(input.publishAt).getTime()
  ) {
    return "게시 종료일은 게시일시 이후로 설정해 주세요.";
  }
  if (!forPublication) return null;
  if (!input.coverImagePath) return "대표 이미지를 등록해 주세요.";
  if (!input.bodyMarkdown.trim()) return "본문 내용을 입력해 주세요.";
  if (!input.publishAt) return "발행일을 입력해 주세요.";
  if (!input.authoredAt) return "작성/게시일을 입력해 주세요.";
  if (!input.reviewedAt) return "최종 검토일을 입력해 주세요.";
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
