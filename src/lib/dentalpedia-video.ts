export type DentalpediaVideoCategory =
  | "implant"
  | "orthodontics"
  | "cavity"
  | "root-canal"
  | "children"
  | "other";
export type DentalpediaVideoStatus = "draft" | "published";
export type DentalpediaVideoHomeCategory =
  | "treatment-guide"
  | "oral-care"
  | "cost-guide"
  | "dental-news";
export type DentalpediaVideoSourceType = "upload" | "youtube";

export interface AdminDentalpediaVideo {
  id: string;
  title: string;
  category: DentalpediaVideoCategory | null;
  categoryLabel: string;
  description: string;
  tags: string[];
  thumbnailImageUrl: string | null;
  thumbnailImagePath: string | null;
  thumbnailImageAlt: string;
  homeCategory: DentalpediaVideoHomeCategory | null;
  homeCategoryLabel: string;
  homeTitle: string;
  homeVisible: boolean;
  isRecommended: boolean;
  homeOrder: number;
  videoUrl: string | null;
  videoFileUrl: string | null;
  playbackUrl: string | null;
  sourceType: DentalpediaVideoSourceType;
  videoFilePath: string | null;
  videoFileName: string | null;
  videoContentType: string | null;
  videoSizeBytes: number | null;
  youtubeVideoId: string | null;
  status: DentalpediaVideoStatus;
  isVisible: boolean;
  publishAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminDentalpediaVideoInput {
  title: string;
  category: DentalpediaVideoCategory | null;
  description: string;
  tags: string[];
  thumbnailImagePath: string | null;
  thumbnailImageAlt: string;
  homeCategory: DentalpediaVideoHomeCategory | null;
  homeTitle: string;
  homeVisible: boolean;
  isRecommended: boolean;
  homeOrder: number;
  videoUrl: string | null;
  videoFilePath: string | null;
  videoFileName: string | null;
  videoContentType: string | null;
  videoSizeBytes: number | null;
  status: DentalpediaVideoStatus;
  isVisible: boolean;
  publishAt: string | null;
}

export function validateDentalpediaVideo(
  input: AdminDentalpediaVideoInput,
  forPublication: boolean,
) {
  if (!input.title.trim()) return "영상 제목을 입력해 주세요.";
  if (input.title.trim().length > 120) {
    return "영상 제목은 120자 이하로 입력해 주세요.";
  }
  if (input.homeTitle.trim().length > 120) {
    return "썸네일 제목은 120자 이하로 입력해 주세요.";
  }
  if (!Number.isInteger(input.homeOrder) || input.homeOrder < 1) {
    return "홈 노출 순서를 확인해 주세요.";
  }
  if (input.description.trim().length > 200) {
    return "간단한 설명은 200자 이하로 입력해 주세요.";
  }
  if (input.tags.length > 10) return "태그는 최대 10개까지 등록할 수 있습니다.";
  if (input.videoUrl && !isSupportedYoutubeUrl(input.videoUrl)) {
    return "올바른 YouTube 영상 URL을 입력해 주세요.";
  }
  const hasVideoPath = Boolean(input.videoFilePath);
  const hasCompleteVideoMetadata = Boolean(
    input.videoFileName &&
      input.videoContentType &&
      input.videoSizeBytes &&
      input.videoSizeBytes > 0,
  );
  if (hasVideoPath !== hasCompleteVideoMetadata) {
    return "영상 파일 정보를 확인해 주세요.";
  }
  if (!forPublication) return null;
  if (!input.thumbnailImagePath) return "썸네일 이미지를 등록해 주세요.";
  if (!input.homeCategory) return "썸네일 카테고리를 선택해 주세요.";
  if (!input.homeTitle.trim()) return "썸네일 제목을 입력해 주세요.";
  if (!input.videoUrl && !input.videoFilePath) {
    return "영상 파일을 업로드하거나 영상 URL을 입력해 주세요.";
  }
  if (!input.category) return "카테고리를 선택해 주세요.";
  if (!input.description.trim()) return "간단한 설명을 입력해 주세요.";
  if (!input.publishAt) return "발행일을 확인해 주세요.";
  return null;
}

export function dentalpediaVideoFileError(file: File | null) {
  if (!file) return null;
  if (!["video/mp4", "video/webm"].includes(file.type)) {
    return "영상은 MP4 또는 WebM 형식만 등록할 수 있습니다.";
  }
  if (file.size <= 0 || file.size > 50 * 1024 * 1024) {
    return "영상은 50MB 이하만 등록할 수 있습니다.";
  }
  return null;
}

export function isSupportedYoutubeUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const segments = url.pathname.split("/").filter(Boolean);
  let id: string | null = null;
  if (host === "youtu.be") {
    id = segments[0] ?? null;
  } else if (host === "youtube.com" || host === "m.youtube.com") {
    id = url.pathname === "/watch"
      ? url.searchParams.get("v")
      : ["shorts", "embed", "live"].includes(segments[0] ?? "")
        ? segments[1] ?? null
        : null;
  } else if (host === "youtube-nocookie.com" && segments[0] === "embed") {
    id = segments[1] ?? null;
  }
  return /^[A-Za-z0-9_-]{11}$/.test(id ?? "");
}
