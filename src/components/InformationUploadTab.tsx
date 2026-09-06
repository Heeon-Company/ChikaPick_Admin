"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type {
  DragEvent,
  FormEvent,
  KeyboardEvent,
  ReactNode,
} from "react";

import { AdminSelect } from "@/components/AdminSelect";
import {
  ColumnCategoryManagementDialog,
  DentalpediaArticleEditor,
} from "@/components/DentalpediaArticleEditor";
import {
  DentalpediaInformationTypeTabs,
  DentalpediaWorkspaceHeading,
  type DentalpediaInformationType,
} from "@/components/DentalpediaEditorNavigation";
import { DentalpediaPostEditor } from "@/components/DentalpediaPostEditor";
import {
  createAdminDentalpediaVideo,
  fetchAdminDentalpediaVideo,
  fetchAdminDentalpediaCategories,
  fetchDentalpediaRelatedContentOptions,
  updateAdminDentalpediaVideo,
  uploadAdminDentalpediaImage,
  uploadAdminDentalpediaVideo,
} from "@/lib/admin-api";
import {
  dentalpediaImageError,
  toDateTimeLocalValue,
} from "@/lib/dentalpedia";
import {
  dentalpediaVideoFileError,
  isSupportedYoutubeUrl,
  validateDentalpediaVideo,
  type AdminDentalpediaVideo,
  type AdminDentalpediaVideoInput,
  type DentalpediaRelatedContentOption,
  type DentalpediaVideoCategory,
  type DentalpediaVideoExposurePriority,
  type DentalpediaVideoStatus,
} from "@/lib/dentalpedia-video";
import type { AdminDentalpediaCategory } from "@/lib/dentalpedia-category";

type InformationCategory = "" | DentalpediaVideoCategory;
type PreviewMode = "home" | "detail";
type PublishMode = "immediate" | "scheduled";

const videoDraftStorageKey = "chikapick.admin.dentalpedia.currentVideoId";

const exposurePriorities: ReadonlyArray<{
  label: string;
  value: DentalpediaVideoExposurePriority;
}> = [
  { value: "recommended", label: "추천" },
  { value: "standard", label: "기본" },
  { value: "latest", label: "최신" },
];

type ArticleEditorProps = {
  accessToken: string;
  categories: AdminDentalpediaCategory[];
  informationType: DentalpediaInformationType;
  onManageCategories: () => void;
  onInformationTypeChange: (type: DentalpediaInformationType) => void;
};

function ArticleEditor({
  accessToken,
  categories,
  informationType,
  onManageCategories,
  onInformationTypeChange,
}: ArticleEditorProps) {
  return (
    <DentalpediaArticleEditor
      accessToken={accessToken}
      categories={categories}
      informationType={informationType}
      onManageCategories={onManageCategories}
      onInformationTypeChange={onInformationTypeChange}
    />
  );
}

export function InformationUploadTab({ accessToken }: { accessToken: string }) {
  const [informationType, setInformationType] =
    useState<DentalpediaInformationType>("video");
  const [categories, setCategories] = useState<AdminDentalpediaCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<InformationCategory>("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [searchKeywords, setSearchKeywords] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailObjectUrl, setThumbnailObjectUrl] = useState<string | null>(
    null,
  );
  const [thumbnailImagePath, setThumbnailImagePath] = useState<string | null>(
    null,
  );
  const [thumbnailImageUrl, setThumbnailImageUrl] = useState<string | null>(
    null,
  );
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoFilePath, setVideoFilePath] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState<string | null>(null);
  const [videoContentType, setVideoContentType] = useState<string | null>(null);
  const [videoSizeBytes, setVideoSizeBytes] = useState<number | null>(null);
  const [url, setUrl] = useState("");
  const [duration, setDuration] = useState("");
  const [isVisible, setIsVisible] = useState(true);
  const [isRecommended, setIsRecommended] = useState(false);
  const [isHero, setIsHero] = useState(false);
  const [homeVisible, setHomeVisible] = useState(true);
  const [homeOrder, setHomeOrder] = useState("2");
  const [exposurePriority, setExposurePriority] =
    useState<DentalpediaVideoExposurePriority>("recommended");
  const [publishMode, setPublishMode] = useState<PublishMode>("immediate");
  const [publishAt, setPublishAt] = useState(() =>
    toDateTimeLocalValue(new Date()),
  );
  const [endAt, setEndAt] = useState("");
  const [relatedContentIds, setRelatedContentIds] = useState<string[]>([]);
  const [relatedOptions, setRelatedOptions] = useState<
    DentalpediaRelatedContentOption[]
  >([]);
  const [relatedDialogOpen, setRelatedDialogOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("home");
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "error" | "success";
  } | null>(null);
  const [publishToast, setPublishToast] = useState<{
    message: string;
    tone: "error" | "success";
  } | null>(null);

  useEffect(() => {
    if (!accessToken) {
      const timer = window.setTimeout(() => setCategoriesLoading(false), 0);
      return () => window.clearTimeout(timer);
    }
    let active = true;
    fetchAdminDentalpediaCategories(accessToken)
      .then((payload) => {
        if (active) setCategories(payload.categories);
      })
      .catch((error) => {
        if (active) {
          setFeedback({
            tone: "error",
            message:
              error instanceof Error
                ? error.message
                : "카테고리를 불러오지 못했습니다.",
          });
        }
      })
      .finally(() => {
        if (active) setCategoriesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [accessToken]);

  useEffect(() => {
    const savedId = window.localStorage.getItem(videoDraftStorageKey);
    if (!savedId || !accessToken) {
      const timer = window.setTimeout(() => setLoadingDraft(false), 0);
      return () => window.clearTimeout(timer);
    }
    let active = true;
    fetchAdminDentalpediaVideo(accessToken, savedId)
      .then(({ video }) => {
        if (active) applyVideo(video);
      })
      .catch(() => {
        window.localStorage.removeItem(videoDraftStorageKey);
      })
      .finally(() => {
        if (active) setLoadingDraft(false);
      });
    return () => {
      active = false;
    };
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    fetchDentalpediaRelatedContentOptions(accessToken)
      .then((options) => {
        if (active) setRelatedOptions(options);
      })
      .catch(() => {
        if (active) setRelatedOptions([]);
      });
    return () => {
      active = false;
    };
  }, [accessToken]);

  useEffect(
    () => () => {
      if (thumbnailObjectUrl) URL.revokeObjectURL(thumbnailObjectUrl);
    },
    [thumbnailObjectUrl],
  );

  useEffect(() => {
    if (!publishToast) return;
    const timer = window.setTimeout(() => setPublishToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [publishToast]);

  function applyVideo(video: AdminDentalpediaVideo) {
    setVideoId(video.id);
    setTitle(video.title);
    setCategory(video.category ?? "");
    setDescription(video.description);
    setTags(video.tags);
    setTagDraft("");
    setSearchKeywords((video.searchKeywords ?? []).join(", "));
    setThumbnailFile(null);
    setThumbnailObjectUrl(null);
    setThumbnailImagePath(video.thumbnailImagePath);
    setThumbnailImageUrl(video.thumbnailImageUrl);
    setVideoFile(null);
    setVideoFilePath(video.videoFilePath);
    setVideoFileName(video.videoFileName);
    setVideoContentType(video.videoContentType);
    setVideoSizeBytes(video.videoSizeBytes);
    setUrl(video.videoUrl ?? "");
    setDuration(formatDuration(video.videoDurationSeconds));
    setIsVisible(video.isVisible);
    setIsRecommended(video.isRecommended);
    setIsHero(video.isHero ?? false);
    setHomeVisible(video.homeVisible);
    setHomeOrder(String(video.homeOrder));
    setExposurePriority(video.exposurePriority ?? "recommended");
    setPublishMode(
      video.publishAt && new Date(video.publishAt).getTime() > Date.now()
        ? "scheduled"
        : "immediate",
    );
    setPublishAt(
      video.publishAt
        ? toDateTimeLocalValue(new Date(video.publishAt))
        : toDateTimeLocalValue(new Date()),
    );
    setEndAt(toDateInputValue(video.endAt));
    setRelatedContentIds(video.relatedContentIds ?? []);
  }

  function selectThumbnail(file: File | null) {
    const error = dentalpediaImageError(file);
    if (error) {
      setFeedback({ tone: "error", message: error });
      return;
    }
    setThumbnailFile(file);
    setThumbnailObjectUrl(file ? URL.createObjectURL(file) : null);
    setFeedback(null);
  }

  function removeThumbnail() {
    setThumbnailFile(null);
    setThumbnailObjectUrl(null);
    setThumbnailImagePath(null);
    setThumbnailImageUrl(null);
    setFeedback(null);
  }

  function selectVideo(file: File | null) {
    const error = dentalpediaVideoFileError(file);
    if (error) {
      setFeedback({ tone: "error", message: error });
      return;
    }
    setVideoFile(file);
    if (file) {
      setVideoFilePath(null);
      setVideoFileName(file.name);
      setVideoContentType(file.type);
      setVideoSizeBytes(file.size);
      setUrl("");
      readVideoDuration(file, (seconds) => setDuration(formatDuration(seconds)));
    }
    setFeedback(null);
  }

  function removeVideo() {
    setVideoFile(null);
    setVideoFilePath(null);
    setVideoFileName(null);
    setVideoContentType(null);
    setVideoSizeBytes(null);
    setDuration("");
  }

  function changeVideoUrl(nextUrl: string) {
    setUrl(nextUrl);
    if (isSupportedYoutubeUrl(nextUrl)) removeVideo();
  }

  function handleVideoDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    if (loadingDraft || saving) return;
    selectVideo(event.dataTransfer.files[0] ?? null);
  }

  function addTag() {
    const tag = tagDraft.trim().replace(/^#+/, "");
    if (!tag || tags.includes(tag)) return;
    if (tags.length >= 10) {
      setFeedback({ tone: "error", message: "태그는 최대 10개까지 등록할 수 있습니다." });
      return;
    }
    setTags((current) => [...current, tag]);
    setTagDraft("");
    setFeedback(null);
  }

  function handleTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addTag();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void saveVideo("published");
  }

  function videoInput(
    status: DentalpediaVideoStatus,
    imagePath: string | null,
    storedVideoPath: string | null,
  ): AdminDentalpediaVideoInput {
    const resolvedPublishAt =
      status === "published"
        ? publishMode === "scheduled"
          ? localDateTimeToIso(publishAt)
          : new Date().toISOString()
        : publishMode === "scheduled"
          ? localDateTimeToIso(publishAt)
          : null;
    return {
      category: category || null,
      description: description.trim(),
      endAt: dateToEndOfDayIso(endAt),
      exposurePriority,
      homeCategory: homeCategoryFor(category),
      homeOrder: Number(homeOrder),
      homeTitle: title.trim(),
      homeVisible,
      isHero,
      isRecommended,
      isVisible,
      publishAt: resolvedPublishAt,
      relatedContentIds: relatedContentIds.filter(
        (id) => id !== `video:${videoId}`,
      ),
      searchKeywords: commaSeparatedValues(searchKeywords, 20),
      status,
      tags,
      thumbnailImageAlt: title.trim() ? `${title.trim()} 썸네일` : "",
      thumbnailImagePath: imagePath,
      title: title.trim(),
      videoContentType: storedVideoPath ? videoContentType : null,
      videoDurationSeconds: parseDuration(duration),
      videoFileName: storedVideoPath ? videoFileName : null,
      videoFilePath: storedVideoPath,
      videoSizeBytes: storedVideoPath ? videoSizeBytes : null,
      videoUrl: url.trim() || null,
    };
  }

  async function saveVideo(status: DentalpediaVideoStatus) {
    if (saving || loadingDraft) return;
    if (status === "published") setPublishToast(null);
    const pendingImagePath =
      thumbnailImagePath ?? (thumbnailFile ? "pending-thumbnail" : null);
    const pendingVideoPath = videoFile ? "pending-video" : videoFilePath;
    const beforeUpload = videoInput(status, pendingImagePath, pendingVideoPath);
    const preUploadError = validateDentalpediaVideo(
      beforeUpload,
      status === "published",
    );
    if (preUploadError) {
      const outcome = { tone: "error" as const, message: preUploadError };
      setFeedback(outcome);
      if (status === "published") setPublishToast(outcome);
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      let imagePath = thumbnailImagePath;
      if (thumbnailFile) {
        const upload = await uploadAdminDentalpediaImage(
          accessToken,
          thumbnailFile,
        );
        imagePath = upload.path;
      }

      let storedVideoPath = videoFilePath;
      if (videoFile) {
        const upload = await uploadAdminDentalpediaVideo(
          accessToken,
          videoFile,
        );
        storedVideoPath = upload.path;
      }

      const input = videoInput(status, imagePath, storedVideoPath);
      const validationError = validateDentalpediaVideo(
        input,
        status === "published",
      );
      if (validationError) throw new Error(validationError);

      const result = videoId
        ? await updateAdminDentalpediaVideo(accessToken, videoId, input)
        : await createAdminDentalpediaVideo(accessToken, input);
      applyVideo(result.video);
      window.localStorage.setItem(videoDraftStorageKey, result.video.id);
      const outcome = {
        tone: "success",
        message:
          status === "published" && !isVisible
            ? "영상을 발행했지만 공개 상태가 꺼져 있어 앱에는 노출되지 않습니다."
            : result.message,
      } as const;
      setFeedback(outcome);
      if (status === "published") setPublishToast(outcome);
    } catch (error) {
      const outcome = {
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "영상을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      } as const;
      setFeedback(outcome);
      if (status === "published") setPublishToast(outcome);
    } finally {
      setSaving(false);
    }
  }

  function resetVideo() {
    window.localStorage.removeItem(videoDraftStorageKey);
    setVideoId(null);
    setTitle("");
    setCategory("");
    setDescription("");
    setTags([]);
    setTagDraft("");
    setSearchKeywords("");
    removeThumbnail();
    removeVideo();
    setUrl("");
    setIsVisible(true);
    setIsRecommended(false);
    setIsHero(false);
    setHomeVisible(true);
    setHomeOrder("2");
    setExposurePriority("recommended");
    setPublishMode("immediate");
    setPublishAt(toDateTimeLocalValue(new Date()));
    setEndAt("");
    setRelatedContentIds([]);
    setFeedback(null);
    setPublishToast(null);
  }

  const isVideo = informationType === "video";
  const isPost = informationType === "post";
  const previewThumbnailUrl = thumbnailObjectUrl ?? thumbnailImageUrl;
  const visibleThumbnailUrl = previewThumbnailUrl;
  const selectedVideoName = videoFile?.name ?? videoFileName;
  const selectedVideoSize = videoFile?.size ?? videoSizeBytes;
  const categoryLabel =
    categories.find((option) => option.code === category)?.displayName ??
    "카테고리";
  const urlState = url.trim()
    ? isSupportedYoutubeUrl(url)
      ? "valid"
      : "invalid"
    : "empty";
  const selectedRelatedOptions = useMemo(
    () =>
      relatedContentIds.map(
        (id) =>
          relatedOptions.find((option) => option.id === id) ?? {
            id,
            label: "선택한 관련 콘텐츠",
            type: id.startsWith("video:")
              ? "video"
              : id.startsWith("post:")
                ? "post"
                : "article",
          },
      ),
    [relatedContentIds, relatedOptions],
  );

  return (
    <section className="admin-information-upload" aria-label="치카피디아">
      <div
        className={`admin-information-upload-card${
          isVideo
            ? " admin-information-upload-card--video"
            : isPost
              ? " admin-information-upload-card--post"
              : " admin-information-upload-card--article"
        }`}
      >
        {isVideo ? (
          <form
            className="admin-information-video"
            id="information-upload-form"
            onSubmit={handleSubmit}
            role="tabpanel"
            aria-busy={loadingDraft || saving}
          >
            <div className="admin-information-video-layout">
              <div className="admin-information-video-editor">
                <DentalpediaWorkspaceHeading />
                <DentalpediaInformationTypeTabs
                  informationType={informationType}
                  onChange={setInformationType}
                />

                <section className="admin-information-video-type-note">
                  <strong>선택된 유형: 영상</strong>
                  <p>썸네일 + ▶ + 재생시간 형태로 사용자에게 노출됩니다.</p>
                </section>

                {feedback ? (
                  <p
                    className={`admin-information-upload-feedback is-${feedback.tone}`}
                    role={feedback.tone === "error" ? "alert" : "status"}
                  >
                    {feedback.message}
                  </p>
                ) : null}

                <EditorSection title="기본 정보">
                  <Field label="콘텐츠 제목" required>
                    <input
                      disabled={loadingDraft || saving}
                      maxLength={120}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="콘텐츠 제목을 입력하세요"
                      type="text"
                      value={title}
                    />
                  </Field>

                  <div className="admin-information-video-field">
                    <div className="admin-information-video-label-row">
                      <span>
                        <strong>카테고리</strong>
                        <b aria-hidden>*</b>
                      </span>
                      <button
                        disabled={categoriesLoading || saving}
                        onClick={() => setCategoryDialogOpen(true)}
                        type="button"
                      >
                        카테고리 관리
                      </button>
                    </div>
                    <div className="admin-information-video-category-chips">
                      {categories.filter((option) => option.isActive || option.code === category).map((option) => (
                        <button
                          aria-pressed={category === option.code}
                          className={category === option.code ? "is-active" : undefined}
                          disabled={categoriesLoading || loadingDraft || saving}
                          key={option.id}
                          onClick={() => setCategory(option.code)}
                          type="button"
                        >
                          {option.displayName}
                        </button>
                      ))}
                    </div>
                    <small>사용자 상단 필터와 연결됩니다.</small>
                  </div>

                  <Field label="카드 요약">
                    <textarea
                      disabled={loadingDraft || saving}
                      maxLength={200}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="홈이나 가로형 카드에서 사용할 짧은 설명을 입력하세요"
                      value={description}
                    />
                    <small>홈이나 가로형 칼럼 카드에서 사용할 짧은 설명입니다.</small>
                  </Field>

                  <div className="admin-information-video-field">
                    <strong>태그</strong>
                    {tags.length ? (
                      <div className="admin-information-video-tags">
                        {tags.map((tag) => (
                          <span key={tag}>
                            #{tag}
                            <button
                              aria-label={`${tag} 태그 삭제`}
                              disabled={loadingDraft || saving}
                              onClick={() =>
                                setTags((current) =>
                                  current.filter((item) => item !== tag),
                                )
                              }
                              type="button"
                            >
                              <Image
                                alt=""
                                aria-hidden
                                height={16}
                                src="/dentalpedia/article-delete.svg"
                                width={24}
                              />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <input
                      aria-label="새 태그"
                      disabled={loadingDraft || saving}
                      maxLength={30}
                      onChange={(event) => setTagDraft(event.target.value)}
                      onKeyDown={handleTagKeyDown}
                      placeholder="태그를 입력하세요 (엔터로 추가)"
                      type="text"
                      value={tagDraft}
                    />
                  </div>

                  <Field label="검색 키워드">
                    <input
                      disabled={loadingDraft || saving}
                      onChange={(event) => setSearchKeywords(event.target.value)}
                      placeholder="예) 임플란트 관리, 임플란트 오래 쓰는 법"
                      type="text"
                      value={searchKeywords}
                    />
                    <small>사용자 검색 시 제목 외 추가 검색어로 활용됩니다.</small>
                  </Field>
                </EditorSection>

                <EditorSection title="영상 콘텐츠">
                  <div className="admin-information-video-field">
                    <span className="admin-information-video-required-label">
                      <strong>대표 이미지 (썸네일)</strong>
                      <b aria-hidden>*</b>
                    </span>
                    <div className="admin-information-video-thumbnail-row">
                      <span className="admin-information-video-thumbnail-image">
                        {visibleThumbnailUrl ? (
                          <Image
                            alt={title.trim() ? `${title.trim()} 썸네일 미리보기` : "영상 썸네일 미리보기"}
                            fill
                            sizes="140px"
                            src={visibleThumbnailUrl}
                            unoptimized={Boolean(thumbnailObjectUrl ?? thumbnailImageUrl)}
                          />
                        ) : (
                          <PreviewImagePlaceholder />
                        )}
                      </span>
                      <div className="admin-information-video-thumbnail-controls">
                        <div>
                          <label>
                            이미지 변경
                            <input
                              accept="image/jpeg,image/png,image/webp"
                              aria-label="썸네일 이미지 변경"
                              disabled={loadingDraft || saving}
                              onChange={(event) => {
                                selectThumbnail(event.currentTarget.files?.[0] ?? null);
                                event.currentTarget.value = "";
                              }}
                              type="file"
                            />
                          </label>
                          <button
                            aria-label="썸네일 이미지 삭제"
                            disabled={loadingDraft || saving}
                            onClick={removeThumbnail}
                            type="button"
                          >
                            <Image alt="" aria-hidden height={18} src="/dentalpedia/article-delete.svg" width={24} />
                          </button>
                        </div>
                        <small>권장 사이즈: 1280 × 720px (16:9) · JPG, PNG, WEBP</small>
                      </div>
                    </div>
                  </div>

                  <div className="admin-information-video-field">
                    <strong>노출 영역별 미리보기</strong>
                    <div className="admin-information-video-crops">
                      <CropPreview
                        alt="홈 카드 4대3 크롭 미리보기"
                        label="홈 카드"
                        ratio="4 / 3"
                        src={visibleThumbnailUrl}
                        detail="4:3 비율 크롭"
                        unoptimized={Boolean(thumbnailObjectUrl ?? thumbnailImageUrl)}
                      />
                      <CropPreview
                        alt="Hero 카드 16대9 크롭 미리보기"
                        label="Hero 카드"
                        ratio="16 / 9"
                        src={visibleThumbnailUrl}
                        detail="16:9 비율 크롭"
                        unoptimized={Boolean(thumbnailObjectUrl ?? thumbnailImageUrl)}
                      />
                      <CropPreview
                        alt="기본 카드 1대1 크롭 미리보기"
                        label="기본 카드"
                        ratio="1 / 1"
                        src={visibleThumbnailUrl}
                        detail="1:1 비율 크롭"
                        unoptimized={Boolean(thumbnailObjectUrl ?? thumbnailImageUrl)}
                      />
                    </div>
                  </div>

                  <Field label="영상 URL">
                    <div className="admin-information-video-url-row">
                      <input
                        aria-invalid={urlState === "invalid"}
                        disabled={loadingDraft || saving}
                        onChange={(event) => changeVideoUrl(event.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        type="url"
                        value={url}
                      />
                      {urlState !== "empty" ? (
                        <span className={`is-${urlState}`}>
                          {urlState === "valid" ? "✓ 정상 연결" : "확인 필요"}
                        </span>
                      ) : null}
                    </div>
                    <small>YouTube 영상 URL 또는 아래의 영상 파일 중 하나를 등록해 주세요. (둘 중 하나 필수)</small>
                  </Field>

                  <div className="admin-information-video-field">
                    <strong>영상 파일 직접 업로드</strong>
                    <label
                      className={`admin-information-video-dropzone${selectedVideoName ? " has-file" : ""}`}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={handleVideoDrop}
                    >
                      <input
                        accept="video/mp4,video/webm"
                        aria-label="영상 파일 업로드"
                        disabled={loadingDraft || saving}
                        onChange={(event) => {
                          selectVideo(event.currentTarget.files?.[0] ?? null);
                          event.currentTarget.value = "";
                        }}
                        type="file"
                      />
                      <Image aria-hidden alt="" height={24} src="/Type=UploadCloud.svg" width={24} />
                      <span>
                        <strong>{selectedVideoName ?? "MP4/WebM 파일을 선택하거나 끌어놓으세요"}</strong>
                        <small>{selectedVideoSize ? formatFileSize(selectedVideoSize) : "최대 50MB"}</small>
                      </span>
                      {selectedVideoName ? (
                        <button
                          aria-label="업로드 영상 삭제"
                          disabled={loadingDraft || saving}
                          onClick={(event) => {
                            event.preventDefault();
                            removeVideo();
                          }}
                          type="button"
                        >
                          삭제
                        </button>
                      ) : null}
                    </label>
                  </div>

                  <Field label="재생시간">
                    <input
                      className="admin-information-video-duration"
                      disabled={loadingDraft || saving}
                      inputMode="numeric"
                      onChange={(event) => setDuration(event.target.value)}
                      placeholder="02:18"
                      type="text"
                      value={duration}
                    />
                    <small>영상 파일에서는 자동 입력되며 직접 수정할 수 있습니다. 사용자 카드에 ▶ 02:18 형태로 표시됩니다.</small>
                  </Field>
                </EditorSection>

                <EditorSection title="노출 설정">
                  <div className="admin-information-video-toggle-list">
                    <ToggleRow
                      checked={isVisible}
                      description="ON이면 치카피디아 콘텐츠 목록에 노출됩니다."
                      disabled={loadingDraft || saving}
                      label="치카피디아 노출"
                      onChange={() => setIsVisible((current) => !current)}
                    />
                    <ToggleRow
                      checked={isRecommended}
                      description="추천 콘텐츠로 강조 노출합니다."
                      disabled={loadingDraft || saving}
                      label="추천 콘텐츠"
                      onChange={() => setIsRecommended((current) => !current)}
                    />
                    <ToggleRow
                      checked={isHero}
                      description="치카피디아 상단 Hero 영역에 노출합니다."
                      disabled={loadingDraft || saving}
                      label="상단 대표 콘텐츠"
                      onChange={() => setIsHero((current) => !current)}
                    />
                    <div className="admin-information-video-home-exposure">
                      <ToggleRow
                        checked={homeVisible}
                        description="치카픽 홈 화면 치카피디아 영역에 노출합니다."
                        disabled={loadingDraft || saving}
                        label="홈 노출"
                        onChange={() => setHomeVisible((current) => !current)}
                      />
                      {homeVisible ? (
                        <label>
                          <span>홈 노출 순서</span>
                          <input
                            aria-label="홈 노출 순서"
                            disabled={loadingDraft || saving}
                            max={9999}
                            min={1}
                            onChange={(event) => setHomeOrder(event.target.value)}
                            type="number"
                            value={homeOrder}
                          />
                          <small>1순위는 대형 카드, 2~5순위는 일반 카드로 자동 배치됩니다.</small>
                        </label>
                      ) : null}
                    </div>
                    <div className="admin-information-video-priority-row">
                      <span><strong>노출 우선순위</strong><small>정렬 가중치를 설정합니다.</small></span>
                      <AdminSelect
                        className="admin-information-video-priority-select"
                        disabled={loadingDraft || saving}
                        label="노출 우선순위"
                        onChange={setExposurePriority}
                        options={exposurePriorities}
                        value={exposurePriority}
                      />
                    </div>
                  </div>
                </EditorSection>

                <EditorSection title="발행 설정">
                  <fieldset className="admin-information-video-radio-field">
                    <legend>공개 상태</legend>
                    <label><input checked={isVisible} disabled={loadingDraft || saving} name="video-visibility" onChange={() => setIsVisible(true)} type="radio" />공개</label>
                    <label><input checked={!isVisible} disabled={loadingDraft || saving} name="video-visibility" onChange={() => setIsVisible(false)} type="radio" />비공개</label>
                  </fieldset>
                  <fieldset className="admin-information-video-radio-field">
                    <legend>발행 방식</legend>
                    <label><input checked={publishMode === "immediate"} disabled={loadingDraft || saving} name="video-publish-mode" onChange={() => setPublishMode("immediate")} type="radio" />즉시 발행</label>
                    <label><input checked={publishMode === "scheduled"} disabled={loadingDraft || saving} name="video-publish-mode" onChange={() => setPublishMode("scheduled")} type="radio" />예약 발행</label>
                  </fieldset>
                  <div className="admin-information-video-date-grid">
                    <Field label="게시일시">
                      <input
                        disabled={loadingDraft || saving || publishMode === "immediate"}
                        onChange={(event) => setPublishAt(event.target.value)}
                        type="datetime-local"
                        value={publishAt}
                      />
                    </Field>
                    <Field label="게시 종료일 (선택)">
                      <input
                        disabled={loadingDraft || saving}
                        onChange={(event) => setEndAt(event.target.value)}
                        type="date"
                        value={endAt}
                      />
                      <small>이벤트성 콘텐츠의 경우 종료일을 설정할 수 있습니다.</small>
                    </Field>
                  </div>
                </EditorSection>

                <EditorSection title="관련 콘텐츠">
                  <div className="admin-information-video-related">
                    <button
                      disabled={loadingDraft || saving}
                      onClick={() => setRelatedDialogOpen(true)}
                      type="button"
                    >
                      + 콘텐츠 선택
                    </button>
                    {selectedRelatedOptions.length ? (
                      <ul>
                        {selectedRelatedOptions.map((option) => (
                          <li key={option.id}>
                            <span aria-hidden />
                            <strong>{option.label}</strong>
                            <button
                              aria-label={`${option.label} 관련 콘텐츠 삭제`}
                              onClick={() =>
                                setRelatedContentIds((current) =>
                                  current.filter((id) => id !== option.id),
                                )
                              }
                              type="button"
                            >
                              <Image alt="" aria-hidden height={18} src="/dentalpedia/article-delete.svg" width={24} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>선택된 관련 콘텐츠가 없습니다.</p>
                    )}
                    <small>같은 카테고리/태그 기반으로 자동 추천도 가능합니다.</small>
                  </div>
                </EditorSection>

                <footer className="admin-information-video-actions">
                  <button disabled={loadingDraft || saving} onClick={resetVideo} type="button">취소</button>
                  <div>
                    <button disabled={loadingDraft || saving} onClick={() => void saveVideo("draft")} type="button">{saving ? "저장 중..." : "임시저장"}</button>
                    <button disabled={loadingDraft || saving} type="submit">{saving ? "처리 중..." : "발행하기"}</button>
                  </div>
                </footer>
              </div>

              <VideoPreview
                categoryLabel={categoryLabel}
                description={description}
                duration={duration}
                isRecommended={isRecommended}
                previewMode={previewMode}
                saved={Boolean(videoId)}
                setPreviewMode={setPreviewMode}
                src={previewThumbnailUrl}
                title={title}
                unoptimized={Boolean(previewThumbnailUrl)}
              />
            </div>

            {publishToast ? (
              <div
                aria-atomic="true"
                className={`admin-information-video-toast is-${publishToast.tone}`}
                role={publishToast.tone === "error" ? "alert" : "status"}
              >
                {publishToast.message}
              </div>
            ) : null}

            {relatedDialogOpen ? (
              <RelatedContentDialog
                currentVideoId={videoId}
                onChange={setRelatedContentIds}
                onClose={() => setRelatedDialogOpen(false)}
                options={relatedOptions}
                selectedIds={relatedContentIds}
              />
            ) : null}
          </form>
        ) : isPost ? (
          <DentalpediaPostEditor
            accessToken={accessToken}
            categories={categories}
            informationType={informationType}
            onManageCategories={() => setCategoryDialogOpen(true)}
            onInformationTypeChange={setInformationType}
          />
        ) : (
          <ArticleEditor
            accessToken={accessToken}
            categories={categories}
            informationType={informationType}
            onManageCategories={() => setCategoryDialogOpen(true)}
            onInformationTypeChange={setInformationType}
          />
        )}
      </div>
      {categoryDialogOpen ? (
        <ColumnCategoryManagementDialog
          accessToken={accessToken}
          categories={categories}
          onCategoriesChange={setCategories}
          onClose={() => setCategoryDialogOpen(false)}
        />
      ) : null}
    </section>
  );
}

function EditorSection({ children, title }: { children: ReactNode; title: string }) {
  return <section className="admin-information-video-section"><h2>{title}</h2>{children}</section>;
}

function Field({ children, label, required = false }: { children: ReactNode; label: string; required?: boolean }) {
  return <label className="admin-information-video-field"><span className="admin-information-video-required-label"><strong>{label}</strong>{required ? <b aria-hidden>*</b> : null}</span>{children}</label>;
}

function CropPreview({ alt, detail, label, ratio, src, unoptimized }: { alt: string; detail: string; label: string; ratio: string; src: string | null; unoptimized: boolean }) {
  return <figure><div style={{ aspectRatio: ratio }}>{src ? <Image alt={alt} fill sizes="274px" src={src} unoptimized={unoptimized} /> : <PreviewImagePlaceholder />}</div><figcaption><strong>{label}</strong><small>{detail}</small></figcaption></figure>;
}

function ToggleRow({ checked, description, disabled, label, onChange }: { checked: boolean; description: string; disabled: boolean; label: string; onChange: () => void }) {
  return <div className="admin-information-video-toggle-row"><span><strong>{label}</strong><small>{description}</small></span><Switch checked={checked} disabled={disabled} label={label} onChange={onChange} /></div>;
}

function VideoPreview({ categoryLabel, description, duration, isRecommended, previewMode, saved, setPreviewMode, src, title, unoptimized }: { categoryLabel: string; description: string; duration: string; isRecommended: boolean; previewMode: PreviewMode; saved: boolean; setPreviewMode: (mode: PreviewMode) => void; src: string | null; title: string; unoptimized: boolean }) {
  const displayTitle = title.trim() || "콘텐츠 제목";
  const displayDescription = description.trim() || "카드 요약이 여기에 표시됩니다.";
  return <aside className="admin-information-video-preview" aria-label="실시간 미리보기">
    <header><span><Image alt="" aria-hidden height={24} src="/dentalpedia/article-preview.svg" width={24} /><strong>실시간 미리보기</strong></span><em>{saved ? "저장된 영상" : "미발행 미리보기"}</em></header>
    <div className="admin-information-video-preview-tabs" role="tablist"><button aria-selected={previewMode === "home"} className={previewMode === "home" ? "is-active" : undefined} onClick={() => setPreviewMode("home")} role="tab" type="button">홈 카드</button><button aria-selected={previewMode === "detail"} className={previewMode === "detail" ? "is-active" : undefined} onClick={() => setPreviewMode("detail")} role="tab" type="button">상세 페이지</button></div>
    <p className="admin-information-video-preview-status"><span aria-hidden />입력 내용이 실시간으로 자동 반영됩니다.</p>
    {previewMode === "home" ? <div className="admin-information-video-home-preview"><header><strong>치카픽 추천 칼럼</strong><span>전체보기 &gt;</span></header><article><div className="admin-information-video-preview-image">{src ? <Image alt={`${displayTitle} 카드 미리보기`} fill sizes="354px" src={src} unoptimized={unoptimized} /> : <PreviewImagePlaceholder />}{src ? <span>▶ {duration || "00:00"}</span> : null}</div><div><p><span>{categoryLabel}</span>{isRecommended ? <em>추천</em> : null}</p><h3>{displayTitle}</h3><small>{displayDescription}</small></div></article></div> : <div className="admin-information-video-detail-preview"><div>{src ? <><Image alt={`${displayTitle} 상세 미리보기`} fill sizes="354px" src={src} unoptimized={unoptimized} /><span>▶</span></> : <PreviewImagePlaceholder />}</div><strong>{displayTitle}</strong><p>{displayDescription}</p></div>}
  </aside>;
}

function PreviewImagePlaceholder() {
  return <div className="admin-information-preview-placeholder"><span aria-hidden>＋</span>이미지 미리보기</div>;
}

function RelatedContentDialog({ currentVideoId, onChange, onClose, options, selectedIds }: { currentVideoId: string | null; onChange: (ids: string[]) => void; onClose: () => void; options: DentalpediaRelatedContentOption[]; selectedIds: string[] }) {
  const availableOptions = options.filter((option) => option.id !== `video:${currentVideoId}`);
  return <div className="admin-information-video-dialog-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section aria-label="관련 콘텐츠 선택" aria-modal="true" className="admin-information-video-dialog" role="dialog"><header><div><h2>관련 콘텐츠 선택</h2><p>최대 10개까지 선택할 수 있습니다.</p></div><button aria-label="닫기" onClick={onClose} type="button">×</button></header><div>{availableOptions.length ? availableOptions.map((option) => <label key={option.id}><input checked={selectedIds.includes(option.id)} onChange={(event) => { if (event.target.checked) { if (selectedIds.length < 10) onChange([...selectedIds, option.id]); } else { onChange(selectedIds.filter((id) => id !== option.id)); } }} type="checkbox" /><span><strong>{option.label}</strong><small>{option.type === "video" ? "영상" : option.type === "post" ? "게시물" : "칼럼"}</small></span></label>) : <p>선택할 수 있는 발행 콘텐츠가 없습니다.</p>}</div><footer><button onClick={onClose} type="button">선택 완료</button></footer></section></div>;
}

function Switch({ checked, disabled, label, onChange }: { checked: boolean; disabled: boolean; label: string; onChange: () => void }) {
  return <button aria-checked={checked} aria-label={label} className={`admin-information-video-switch${checked ? " is-active" : ""}`} disabled={disabled} onClick={onChange} role="switch" type="button"><span /></button>;
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024 * 1024) return `${Math.max(1, Math.round(sizeBytes / 1024))}KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)}MB`;
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function parseDuration(value: string) {
  if (!value.trim()) return null;
  const parts = value.split(":").map((part) => Number(part));
  if (parts.some((part) => !Number.isInteger(part) || part < 0)) return 0;
  if (parts.length === 2 && parts[1] < 60) return parts[0] * 60 + parts[1];
  if (parts.length === 3 && parts[1] < 60 && parts[2] < 60) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

function readVideoDuration(file: File, onReady: (seconds: number) => void) {
  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "metadata";
  video.onloadedmetadata = () => {
    const seconds = Math.max(1, Math.round(video.duration));
    URL.revokeObjectURL(objectUrl);
    if (Number.isFinite(seconds)) onReady(seconds);
  };
  video.onerror = () => URL.revokeObjectURL(objectUrl);
  video.src = objectUrl;
}

function commaSeparatedValues(value: string, limit: number) {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))].slice(0, limit);
}

function homeCategoryFor(category: InformationCategory) {
  if (category === "oral-care" || category === "cosmetic") return "oral-care" as const;
  return "treatment-guide" as const;
}

function localDateTimeToIso(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function dateToEndOfDayIso(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toDateInputValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
