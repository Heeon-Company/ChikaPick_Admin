export type DentalpediaPostCategory =
  | "oral-care"
  | "implant"
  | "general-care"
  | "cosmetic"
  | "orthodontics";
export type DentalpediaPostType = "single" | "carousel";
export type DentalpediaPostStatus = "draft" | "published";

export interface AdminDentalpediaPost {
  id: string;
  title: string;
  category: DentalpediaPostCategory | null;
  categoryLabel: string;
  cardSummary: string;
  tags: string[];
  searchKeywords: string[];
  postType: DentalpediaPostType;
  imagePaths: string[];
  imageUrls: string[];
  bodyText: string;
  status: DentalpediaPostStatus;
  isVisible: boolean;
  isRecommended: boolean;
  isHero: boolean;
  homeVisible: boolean;
  homeOrder: number;
  publishAt: string | null;
  endAt: string | null;
  relatedContentIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminDentalpediaPostInput {
  title: string;
  category: DentalpediaPostCategory | null;
  cardSummary: string;
  tags: string[];
  searchKeywords: string[];
  postType: DentalpediaPostType;
  imagePaths: string[];
  bodyText: string;
  status: DentalpediaPostStatus;
  isVisible: boolean;
  isRecommended: boolean;
  isHero: boolean;
  homeVisible: boolean;
  homeOrder: number;
  publishAt: string | null;
  endAt: string | null;
  relatedContentIds: string[];
}

export function validateDentalpediaPost(
  input: AdminDentalpediaPostInput,
  forPublication: boolean,
) {
  if (!input.title.trim()) return "게시물 제목을 입력해 주세요.";
  if (input.title.trim().length > 120) {
    return "게시물 제목은 120자 이하로 입력해 주세요.";
  }
  if (input.cardSummary.trim().length > 200) {
    return "카드 요약은 200자 이하로 입력해 주세요.";
  }
  if (input.bodyText.trim().length > 5000) {
    return "본문은 5,000자 이하로 입력해 주세요.";
  }
  if (input.tags.length > 10) return "태그는 최대 10개까지 등록할 수 있습니다.";
  if (input.searchKeywords.length > 20) {
    return "검색 키워드는 최대 20개까지 등록할 수 있습니다.";
  }
  if (input.imagePaths.length > 10) {
    return "게시물 이미지는 최대 10장까지 등록할 수 있습니다.";
  }
  if (input.postType === "single" && input.imagePaths.length > 1) {
    return "단일 이미지 게시물에는 이미지 1장만 등록할 수 있습니다.";
  }
  if (!Number.isInteger(input.homeOrder) || input.homeOrder < 1) {
    return "홈 노출 순서를 확인해 주세요.";
  }
  if (
    input.publishAt &&
    input.endAt &&
    new Date(input.endAt).getTime() <= new Date(input.publishAt).getTime()
  ) {
    return "게시 종료일은 게시일시 이후로 설정해 주세요.";
  }
  if (input.relatedContentIds.length > 10) {
    return "관련 콘텐츠는 최대 10개까지 선택할 수 있습니다.";
  }
  if (!forPublication) return null;
  if (!input.category) return "카테고리를 선택해 주세요.";
  if (input.imagePaths.length === 0) return "게시물 이미지를 등록해 주세요.";
  if (!input.bodyText.trim()) return "본문/설명을 입력해 주세요.";
  if (!input.publishAt) return "발행일을 확인해 주세요.";
  return null;
}
