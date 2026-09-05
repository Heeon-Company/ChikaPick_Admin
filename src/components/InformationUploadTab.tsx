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
} from "@/lib/admin-api";
import { dentalpediaImageError } from "@/lib/dentalpedia";
import {
  validateDentalpediaVideo,
  type AdminDentalpediaVideo,
  type AdminDentalpediaVideoInput,
  type DentalpediaVideoCategory,
  type DentalpediaVideoStatus,
} from "@/lib/dentalpedia-video";

type InformationType = "video" | "article";
type InformationCategory = "" | DentalpediaVideoCategory;

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
  const [thumbnailObjectUrl, setThumbnailObjectUrl] = useState<string | null>(null);
  const [thumbnailImagePath, setThumbnailImagePath] = useState<string | null>(null);
  const [thumbnailImageUrl, setThumbnailImageUrl] = useState<string | null>(null);
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

  function handleThumbnailDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    if (loadingDraft || saving) return;
    selectThumbnail(event.dataTransfer.files[0] ?? null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void saveVideo("published");
  }

  function videoInput(
    status: DentalpediaVideoStatus,
    imagePath: string | null,
  ): AdminDentalpediaVideoInput {
    return {
      category: category || null,
      description: description.trim(),
      isVisible,
      publishAt: status === "published" ? new Date().toISOString() : null,
      status,
      tags: tags
        .split(",")
        .map((tag) => tag.trim().replace(/^#+/, ""))
        .filter(Boolean),
      thumbnailImageAlt: title.trim() ? `${title.trim()} 썸네일` : "",
      thumbnailImagePath: imagePath,
      title: title.trim(),
      videoUrl: url.trim() || null,
    };
  }

  async function saveVideo(status: DentalpediaVideoStatus) {
    if (saving || loadingDraft) return;
    const pendingImagePath =
      thumbnailImagePath ?? (thumbnailFile ? "pending-thumbnail" : null);
    const beforeUpload = videoInput(status, pendingImagePath);
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
      const input = videoInput(status, imagePath);
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
  const visibleThumbnailUrl = thumbnailObjectUrl ?? thumbnailImageUrl;

  return (
    <section className="admin-information-upload" aria-label="덴탈피디아 정보 업로드">
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
              <div className="admin-information-upload-field">
                <span>썸네일 이미지</span>
                <label
                  className="admin-information-upload-dropzone"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={handleThumbnailDrop}
                >
                  <input
                    accept="image/jpeg,image/png"
                    aria-label="썸네일 이미지 업로드"
                    disabled={loadingDraft || saving}
                    onChange={(event) => {
                      selectThumbnail(event.currentTarget.files?.[0] ?? null);
                      event.currentTarget.value = "";
                    }}
                    type="file"
                  />
                  {visibleThumbnailUrl ? (
                    <span className="admin-information-upload-thumbnail-preview">
                      <Image
                        alt={title.trim() ? `${title.trim()} 썸네일 미리보기` : "영상 썸네일 미리보기"}
                        fill
                        sizes="(max-width: 760px) 100vw, 900px"
                        src={visibleThumbnailUrl}
                        unoptimized
                      />
                      <strong>{thumbnailFile?.name ?? "이미지 변경"}</strong>
                    </span>
                  ) : (
                    <>
                      <Image
                        aria-hidden="true"
                        src="/Type=UploadCloud.svg"
                        alt=""
                        width={24}
                        height={24}
                      />
                      <strong>이미지를 드래그하거나 클릭하여 업로드</strong>
                      <small>JPG, PNG (최대 10MB)</small>
                    </>
                  )}
                </label>
              </div>

              <label className="admin-information-upload-field">
                <span>영상 URL</span>
                <input
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="예) https://www.youtube.com/watch?v=..."
                  type="url"
                  value={url}
                  disabled={loadingDraft || saving}
                />
              </label>

              <label className="admin-information-upload-field">
                <span>제목</span>
                <input
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="제목을 입력하세요"
                  type="text"
                  value={title}
                  disabled={loadingDraft || saving}
                  maxLength={60}
                />
              </label>

              <div className="admin-information-upload-field">
                <span>카테고리</span>
                <AdminSelect
                  className={[
                    "admin-information-upload-category",
                    category ? "is-selected" : null,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  label="카테고리"
                  onChange={setCategory}
                  options={informationCategories}
                  value={category}
                  disabled={loadingDraft || saving}
                />
              </div>

              <label className="admin-information-upload-field">
                <span>간단한 설명</span>
                <textarea
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="내용을 입력하세요"
                  value={description}
                  disabled={loadingDraft || saving}
                  maxLength={200}
                />
              </label>

              <label className="admin-information-upload-field">
                <span>태그</span>
                <input
                  onChange={(event) => setTags(event.target.value)}
                  placeholder="태그를 입력하세요 (쉼표로 구분)"
                  type="text"
                  value={tags}
                  disabled={loadingDraft || saving}
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
                <button
                  aria-checked={isVisible}
                  aria-label="공개 설정"
                  className={isVisible ? "is-active" : undefined}
                  disabled={loadingDraft || saving}
                  onClick={() => setIsVisible((current) => !current)}
                  role="switch"
                  type="button"
                >
                  <span />
                </button>
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
