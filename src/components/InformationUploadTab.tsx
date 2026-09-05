"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { DragEvent, FormEvent } from "react";

import { AdminSelect } from "@/components/AdminSelect";
import { DentalpediaArticleEditor } from "@/components/DentalpediaArticleEditor";
import {
  createAdminDentalpediaVideo,
  fetchAdminDentalpediaVideo,
  updateAdminDentalpediaVideo,
  uploadAdminDentalpediaImage,
  uploadAdminDentalpediaVideo,
} from "@/lib/admin-api";
import { dentalpediaImageError } from "@/lib/dentalpedia";
import {
  dentalpediaVideoFileError,
  validateDentalpediaVideo,
  type AdminDentalpediaVideo,
  type AdminDentalpediaVideoInput,
  type DentalpediaVideoCategory,
  type DentalpediaVideoHomeCategory,
  type DentalpediaVideoStatus,
} from "@/lib/dentalpedia-video";

type InformationType = "video" | "article";
type InformationCategory = "" | DentalpediaVideoCategory;
type HomeCategory = "" | DentalpediaVideoHomeCategory;

const videoDraftStorageKey = "chikapick.admin.dentalpedia.currentVideoId";

const informationCategories: ReadonlyArray<{
  label: string;
  value: InformationCategory;
}> = [
  { value: "", label: "카테고리를 선택하세요" },
  { value: "implant", label: "임플란트" },
  { value: "orthodontics", label: "교정" },
  { value: "cavity", label: "충치치료" },
  { value: "root-canal", label: "신경치료" },
  { value: "children", label: "소아치과" },
  { value: "other", label: "기타" },
];

const homeCategories: ReadonlyArray<{
  label: string;
  value: HomeCategory;
}> = [
  { value: "", label: "카테고리를 선택하세요" },
  { value: "treatment-guide", label: "치료 가이드" },
  { value: "oral-care", label: "구강 관리" },
  { value: "cost-guide", label: "비용 가이드" },
  { value: "dental-news", label: "치과 소식" },
];

type InformationTypeTabsProps = {
  informationType: InformationType;
  onChange: (type: InformationType) => void;
};

function InformationTypeTabs({
  informationType,
  onChange,
}: InformationTypeTabsProps) {
  return (
    <div
      className="admin-information-upload-tabs"
      aria-label="업로드 정보 유형"
      role="tablist"
    >
      <button
        aria-controls="information-upload-form"
        aria-selected={informationType === "video"}
        className={informationType === "video" ? "is-active" : undefined}
        onClick={() => onChange("video")}
        role="tab"
        type="button"
      >
        영상
      </button>
      <button
        aria-controls="information-upload-form"
        aria-selected={informationType === "article"}
        className={informationType === "article" ? "is-active" : undefined}
        onClick={() => onChange("article")}
        role="tab"
        type="button"
      >
        칼럼/게시글
      </button>
    </div>
  );
}

type ArticleEditorProps = {
  accessToken: string;
  informationType: InformationType;
  onInformationTypeChange: (type: InformationType) => void;
};

function ArticleEditor({
  accessToken,
  informationType,
  onInformationTypeChange,
}: ArticleEditorProps) {
  return (
    <DentalpediaArticleEditor
      accessToken={accessToken}
      informationType={informationType}
      onInformationTypeChange={onInformationTypeChange}
    />
  );
}

export function InformationUploadTab({ accessToken }: { accessToken: string }) {
  const [informationType, setInformationType] =
    useState<InformationType>("video");
  const [videoId, setVideoId] = useState<string | null>(null);
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
  const [homeCategory, setHomeCategory] =
    useState<HomeCategory>("treatment-guide");
  const [homeTitle, setHomeTitle] = useState("");
  const [homeVisible, setHomeVisible] = useState(true);
  const [isRecommended, setIsRecommended] = useState(true);
  const [homeOrder, setHomeOrder] = useState("1");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoFilePath, setVideoFilePath] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState<string | null>(null);
  const [videoContentType, setVideoContentType] = useState<string | null>(null);
  const [videoSizeBytes, setVideoSizeBytes] = useState<number | null>(null);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<InformationCategory>("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [isVisible, setIsVisible] = useState(true);
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "error" | "success";
  } | null>(null);

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

  useEffect(
    () => () => {
      if (thumbnailObjectUrl) URL.revokeObjectURL(thumbnailObjectUrl);
    },
    [thumbnailObjectUrl],
  );

  function applyVideo(video: AdminDentalpediaVideo) {
    setVideoId(video.id);
    setThumbnailFile(null);
    setThumbnailObjectUrl(null);
    setThumbnailImagePath(video.thumbnailImagePath);
    setThumbnailImageUrl(video.thumbnailImageUrl);
    setHomeCategory(video.homeCategory ?? "");
    setHomeTitle(video.homeTitle);
    setHomeVisible(video.homeVisible);
    setIsRecommended(video.isRecommended);
    setHomeOrder(String(video.homeOrder));
    setVideoFile(null);
    setVideoFilePath(video.videoFilePath);
    setVideoFileName(video.videoFileName);
    setVideoContentType(video.videoContentType);
    setVideoSizeBytes(video.videoSizeBytes);
    setUrl(video.videoUrl ?? "");
    setTitle(video.title);
    setCategory(video.category ?? "");
    setDescription(video.description);
    setTags(video.tags.join(", "));
    setIsVisible(video.isVisible);
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
    }
    setFeedback(null);
  }

  function handleVideoDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    if (loadingDraft || saving) return;
    selectVideo(event.dataTransfer.files[0] ?? null);
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
    return {
      category: category || null,
      description: description.trim(),
      homeCategory: homeCategory || null,
      homeOrder: Number(homeOrder),
      homeTitle: homeTitle.trim(),
      homeVisible,
      isRecommended,
      isVisible,
      publishAt: status === "published" ? new Date().toISOString() : null,
      status,
      tags: tags
        .split(",")
        .map((tag) => tag.trim().replace(/^#+/, ""))
        .filter(Boolean),
      thumbnailImageAlt:
        homeTitle.trim() || title.trim()
          ? `${homeTitle.trim() || title.trim()} 썸네일`
          : "",
      thumbnailImagePath: imagePath,
      title: title.trim(),
      videoContentType: storedVideoPath ? videoContentType : null,
      videoFileName: storedVideoPath ? videoFileName : null,
      videoFilePath: storedVideoPath,
      videoSizeBytes: storedVideoPath ? videoSizeBytes : null,
      videoUrl: url.trim() || null,
    };
  }

  async function saveVideo(status: DentalpediaVideoStatus) {
    if (saving || loadingDraft) return;
    const pendingImagePath =
      thumbnailImagePath ?? (thumbnailFile ? "pending-thumbnail" : null);
    const pendingVideoPath = videoFile ? "pending-video" : videoFilePath;
    const beforeUpload = videoInput(
      status,
      pendingImagePath,
      pendingVideoPath,
    );
    const preUploadError = validateDentalpediaVideo(
      beforeUpload,
      status === "published",
    );
    if (preUploadError) {
      setFeedback({ tone: "error", message: preUploadError });
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
      setFeedback({
        tone: "success",
        message:
          status === "published" && !isVisible
            ? "영상을 게시했지만 공개 설정이 꺼져 있어 앱에는 노출되지 않습니다."
            : result.message,
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "영상을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      });
    } finally {
      setSaving(false);
    }
  }

  const isVideo = informationType === "video";
  const visibleThumbnailUrl =
    thumbnailObjectUrl ??
    thumbnailImageUrl ??
    "/dentalpedia/article-consultation-cover.png";
  const selectedVideoName = videoFile?.name ?? videoFileName;
  const selectedVideoSize = videoFile?.size ?? videoSizeBytes;

  return (
    <section className="admin-information-upload" aria-label="치카피디아">
      <div
        className={`admin-information-upload-card${
          isVideo ? "" : " admin-information-upload-card--article"
        }`}
      >
        {isVideo ? (
          <>
            <InformationTypeTabs
              informationType={informationType}
              onChange={setInformationType}
            />

            <form
              className="admin-information-upload-form"
              id="information-upload-form"
              onSubmit={handleSubmit}
              role="tabpanel"
              aria-busy={loadingDraft || saving}
            >
              <section className="admin-information-video-thumbnail-card">
                <h2>썸네일</h2>

                <div className="admin-information-video-thumbnail-field">
                  <strong>썸네일 이미지</strong>
                  <div className="admin-information-video-thumbnail-row">
                    <span className="admin-information-video-thumbnail-image">
                      <Image
                        alt={
                          homeTitle.trim()
                            ? `${homeTitle.trim()} 썸네일 미리보기`
                            : "영상 썸네일 미리보기"
                        }
                        fill
                        sizes="120px"
                        src={visibleThumbnailUrl}
                        unoptimized={Boolean(
                          thumbnailObjectUrl ?? thumbnailImageUrl,
                        )}
                      />
                    </span>
                    <div className="admin-information-video-thumbnail-controls">
                      <label>
                        이미지 변경
                        <input
                          accept="image/jpeg,image/png,image/webp"
                          aria-label="썸네일 이미지 변경"
                          disabled={loadingDraft || saving}
                          onChange={(event) => {
                            selectThumbnail(
                              event.currentTarget.files?.[0] ?? null,
                            );
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
                        <Image
                          alt=""
                          aria-hidden
                          height={24}
                          src="/dentalpedia/article-delete.svg"
                          width={24}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="admin-information-video-thumbnail-field">
                  <strong>카테고리 *</strong>
                  <AdminSelect
                    className="admin-information-video-thumbnail-select"
                    disabled={loadingDraft || saving}
                    label="썸네일 카테고리"
                    onChange={setHomeCategory}
                    options={homeCategories}
                    value={homeCategory}
                  />
                </div>

                <label className="admin-information-video-thumbnail-field">
                  <span className="admin-information-video-field-heading">
                    <strong>제목 *</strong>
                    <small>{homeTitle.length} / 120</small>
                  </span>
                  <textarea
                    disabled={loadingDraft || saving}
                    maxLength={120}
                    onChange={(event) => setHomeTitle(event.target.value)}
                    placeholder="HOME 카드에 표시할 제목을 입력하세요"
                    value={homeTitle}
                  />
                </label>

                <div className="admin-information-video-home-settings">
                  <div>
                    <Switch
                      checked={homeVisible}
                      disabled={loadingDraft || saving}
                      label="홈에 노출"
                      onChange={() => setHomeVisible((current) => !current)}
                    />
                    <strong>홈에 노출</strong>
                  </div>
                  <div>
                    <Switch
                      checked={isRecommended}
                      disabled={loadingDraft || saving}
                      label="추천 칼럼으로 표시"
                      onChange={() =>
                        setIsRecommended((current) => !current)
                      }
                    />
                    <strong>추천 칼럼으로 표시</strong>
                  </div>
                  <div className="admin-information-video-home-order">
                    <strong>홈 노출 순서</strong>
                    <input
                      aria-label="홈 노출 순서"
                      disabled={loadingDraft || saving}
                      max={9999}
                      min={1}
                      onChange={(event) => setHomeOrder(event.target.value)}
                      type="number"
                      value={homeOrder}
                    />
                    <small>숫자가 작을수록 먼저 노출됩니다.</small>
                  </div>
                </div>
              </section>

              <div className="admin-information-upload-field">
                <span>썸네일 카테고리</span>
                <AdminSelect
                  className={[
                    "admin-information-upload-category",
                    category ? "is-selected" : null,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={loadingDraft || saving}
                  label="영상 카테고리"
                  onChange={setCategory}
                  options={informationCategories}
                  value={category}
                />
              </div>

              <label className="admin-information-upload-field">
                <span>썸네일 제목</span>
                <input
                  disabled={loadingDraft || saving}
                  maxLength={120}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="제목을 입력하세요"
                  type="text"
                  value={title}
                />
              </label>

              <div className="admin-information-upload-field">
                <span>영상 업로드</span>
                <label
                  className={`admin-information-video-dropzone${
                    selectedVideoName ? " has-file" : ""
                  }`}
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
                  <Image
                    aria-hidden="true"
                    src="/Type=UploadCloud.svg"
                    alt=""
                    width={24}
                    height={24}
                  />
                  <strong>{selectedVideoName ?? "파일 업로드"}</strong>
                  {selectedVideoSize ? (
                    <small>{formatFileSize(selectedVideoSize)}</small>
                  ) : null}
                </label>
                <small className="admin-information-video-file-help">
                  MP4 또는 WebM, 최대 50MB
                </small>
              </div>

              <label className="admin-information-upload-field">
                <span>영상 URL</span>
                <input
                  disabled={loadingDraft || saving}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="예) https://www.youtube.com/watch?v=..."
                  type="url"
                  value={url}
                />
              </label>

              <label className="admin-information-upload-field">
                <span>영상 설명</span>
                <textarea
                  disabled={loadingDraft || saving}
                  maxLength={200}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="내용을 입력하세요"
                  value={description}
                />
              </label>

              <label className="admin-information-upload-field">
                <span>태그</span>
                <input
                  disabled={loadingDraft || saving}
                  onChange={(event) => setTags(event.target.value)}
                  placeholder="태그를 입력하세요 (쉼표로 구분)"
                  type="text"
                  value={tags}
                />
              </label>

              <div className="admin-information-upload-visibility">
                <span>
                  <strong>공개 설정</strong>
                  <small>
                    {isVisible
                      ? "게시 후 바로 노출됩니다."
                      : "게시해도 앱에는 노출되지 않습니다."}
                  </small>
                </span>
                <Switch
                  checked={isVisible}
                  disabled={loadingDraft || saving}
                  label="공개 설정"
                  onChange={() => setIsVisible((current) => !current)}
                />
              </div>

              {feedback ? (
                <p
                  className={`admin-information-upload-feedback is-${feedback.tone}`}
                  role={feedback.tone === "error" ? "alert" : "status"}
                >
                  {feedback.message}
                </p>
              ) : null}

              <div className="admin-information-upload-actions">
                <button
                  disabled={loadingDraft || saving}
                  onClick={() => void saveVideo("draft")}
                  type="button"
                >
                  {saving ? "저장 중..." : "임시저장"}
                </button>
                <button disabled={loadingDraft || saving} type="submit">
                  {saving ? "게시 중..." : "게시하기"}
                </button>
              </div>
            </form>
          </>
        ) : (
          <ArticleEditor
            accessToken={accessToken}
            informationType={informationType}
            onInformationTypeChange={setInformationType}
          />
        )}
      </div>
    </section>
  );
}

function Switch({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      aria-checked={checked}
      aria-label={label}
      className={`admin-information-video-switch${checked ? " is-active" : ""}`}
      disabled={disabled}
      onClick={onChange}
      role="switch"
      type="button"
    >
      <span />
    </button>
  );
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(sizeBytes / 1024))}KB`;
  }
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)}MB`;
}
