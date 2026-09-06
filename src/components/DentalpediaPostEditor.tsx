"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ChangeEvent,
  DragEvent,
  FormEvent,
  KeyboardEvent,
  ReactNode,
} from "react";

import {
  DentalpediaInformationTypeTabs,
  DentalpediaWorkspaceHeading,
  type DentalpediaInformationType,
} from "@/components/DentalpediaEditorNavigation";
import {
  createAdminDentalpediaPost,
  fetchAdminDentalpediaPost,
  fetchDentalpediaRelatedContentOptions,
  updateAdminDentalpediaPost,
  uploadAdminDentalpediaImage,
} from "@/lib/admin-api";
import { dentalpediaImageError, toDateTimeLocalValue } from "@/lib/dentalpedia";
import {
  validateDentalpediaPost,
  type AdminDentalpediaPost,
  type AdminDentalpediaPostInput,
  type DentalpediaPostCategory,
  type DentalpediaPostStatus,
  type DentalpediaPostType,
} from "@/lib/dentalpedia-post";
import type { DentalpediaRelatedContentOption } from "@/lib/dentalpedia-video";
import type { AdminDentalpediaCategory } from "@/lib/dentalpedia-category";

type PostCategory = "" | DentalpediaPostCategory;
type PreviewMode = "home" | "detail";
type PublishMode = "immediate" | "scheduled";
type PostImageDraft = {
  file: File | null;
  key: string;
  objectUrl: boolean;
  path: string | null;
  previewUrl: string;
};

const postDraftStorageKey = "chikapick.admin.dentalpedia.currentPostId";
const maxPostImages = 10;
export function DentalpediaPostEditor({
  accessToken,
  categories,
  informationType,
  onManageCategories,
  onInformationTypeChange,
}: {
  accessToken: string;
  categories: AdminDentalpediaCategory[];
  informationType: DentalpediaInformationType;
  onManageCategories: () => void;
  onInformationTypeChange: (type: DentalpediaInformationType) => void;
}) {
  const [postId, setPostId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<PostCategory>("");
  const [cardSummary, setCardSummary] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [searchKeywords, setSearchKeywords] = useState("");
  const [postType, setPostType] = useState<DentalpediaPostType>("carousel");
  const [images, setImages] = useState<PostImageDraft[]>([]);
  const [bodyText, setBodyText] = useState("");
  const [isVisible, setIsVisible] = useState(true);
  const [isRecommended, setIsRecommended] = useState(false);
  const [isHero, setIsHero] = useState(false);
  const [homeVisible, setHomeVisible] = useState(true);
  const [homeOrder, setHomeOrder] = useState("2");
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
  const [draggedImageKey, setDraggedImageKey] = useState<string | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "error" | "success";
  } | null>(null);
  const imagesRef = useRef(images);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(
    () => () => {
      revokeObjectUrls(imagesRef.current);
    },
    [],
  );

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

  useEffect(() => {
    const savedId = window.localStorage.getItem(postDraftStorageKey);
    if (!savedId || !accessToken) {
      const timer = window.setTimeout(() => setLoadingDraft(false), 0);
      return () => window.clearTimeout(timer);
    }
    let active = true;
    fetchAdminDentalpediaPost(accessToken, savedId)
      .then(({ post }) => {
        if (active) applyPost(post);
      })
      .catch(() => {
        window.localStorage.removeItem(postDraftStorageKey);
      })
      .finally(() => {
        if (active) setLoadingDraft(false);
      });
    return () => {
      active = false;
    };
  }, [accessToken]);

  const selectedRelatedOptions = useMemo(
    () =>
      relatedContentIds.map(
        (id) =>
          relatedOptions.find((option) => option.id === id) ?? {
            id,
            label: "선택한 관련 콘텐츠",
            type: contentTypeFromId(id),
          },
      ),
    [relatedContentIds, relatedOptions],
  );
  const categoryLabel =
    categories.find((option) => option.code === category)?.displayName ??
    "카테고리";

  function applyPost(post: AdminDentalpediaPost) {
    revokeObjectUrls(imagesRef.current);
    const nextImages = post.imagePaths.map((path, index) => ({
      file: null,
      key: `stored-${path}-${index}`,
      objectUrl: false,
      path,
      previewUrl: post.imageUrls[index] ?? "",
    }));
    setPostId(post.id);
    setTitle(post.title);
    setCategory(post.category ?? "");
    setCardSummary(post.cardSummary);
    setTags(post.tags);
    setTagDraft("");
    setSearchKeywords(post.searchKeywords.join(", "));
    setPostType(post.postType);
    setImages(nextImages);
    setBodyText(post.bodyText);
    setIsVisible(post.isVisible);
    setIsRecommended(post.isRecommended);
    setIsHero(post.isHero);
    setHomeVisible(post.homeVisible);
    setHomeOrder(String(post.homeOrder));
    setPublishMode(
      post.publishAt && new Date(post.publishAt).getTime() > Date.now()
        ? "scheduled"
        : "immediate",
    );
    setPublishAt(
      post.publishAt
        ? toDateTimeLocalValue(new Date(post.publishAt))
        : toDateTimeLocalValue(new Date()),
    );
    setEndAt(toDateInputValue(post.endAt));
    setRelatedContentIds(post.relatedContentIds);
    imagesRef.current = nextImages;
  }

  function addTag() {
    const tag = tagDraft.trim().replace(/^#+/, "");
    if (!tag || tags.includes(tag)) return;
    if (tags.length >= 10 || tag.length > 30) {
      setFeedback({
        tone: "error",
        message: "태그는 30자 이내로 최대 10개까지 등록할 수 있습니다.",
      });
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

  function choosePostType(nextType: DentalpediaPostType) {
    if (nextType === postType) return;
    if (nextType === "single" && images.length > 1) {
      revokeObjectUrls(images.slice(1));
      setImages(images.slice(0, 1));
    }
    setPostType(nextType);
    setFeedback(null);
  }

  function chooseImages(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!selectedFiles.length) return;
    const invalidFile = selectedFiles.find((file) => dentalpediaImageError(file));
    if (invalidFile) {
      setFeedback({
        tone: "error",
        message: dentalpediaImageError(invalidFile) as string,
      });
      return;
    }

    const acceptedFiles =
      postType === "single"
        ? selectedFiles.slice(0, 1)
        : selectedFiles.slice(0, maxPostImages - images.length);
    if (
      (postType === "carousel" && selectedFiles.length > acceptedFiles.length) ||
      (postType === "single" && selectedFiles.length > 1)
    ) {
      setFeedback({
        tone: "error",
        message:
          postType === "single"
            ? "단일 이미지 게시물에는 이미지 1장만 등록할 수 있습니다."
            : "게시물 이미지는 최대 10장까지 등록할 수 있습니다.",
      });
    } else {
      setFeedback(null);
    }
    const drafts = acceptedFiles.map((file, index) => ({
      file,
      key: `${Date.now()}-${index}-${file.name}`,
      objectUrl: true,
      path: null,
      previewUrl: URL.createObjectURL(file),
    }));
    if (postType === "single") {
      revokeObjectUrls(images);
      setImages(drafts);
    } else {
      setImages((current) => [...current, ...drafts]);
    }
  }

  function removeImage(key: string) {
    const target = images.find((image) => image.key === key);
    if (target?.objectUrl) URL.revokeObjectURL(target.previewUrl);
    setImages((current) => current.filter((image) => image.key !== key));
  }

  function dropImage(event: DragEvent<HTMLElement>, targetKey: string) {
    event.preventDefault();
    if (!draggedImageKey || draggedImageKey === targetKey) return;
    setImages((current) => {
      const fromIndex = current.findIndex((image) => image.key === draggedImageKey);
      const toIndex = current.findIndex((image) => image.key === targetKey);
      if (fromIndex < 0 || toIndex < 0) return current;
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setDraggedImageKey(null);
  }

  function postInput(
    status: DentalpediaPostStatus,
    imagePaths: string[],
  ): AdminDentalpediaPostInput {
    return {
      bodyText: bodyText.trim(),
      cardSummary: cardSummary.trim(),
      category: category || null,
      endAt: dateToEndOfDayIso(endAt),
      homeOrder: Number(homeOrder),
      homeVisible,
      imagePaths,
      isHero,
      isRecommended,
      isVisible,
      postType,
      publishAt:
        status === "published"
          ? publishMode === "scheduled"
            ? localDateTimeToIso(publishAt)
            : new Date().toISOString()
          : publishMode === "scheduled"
            ? localDateTimeToIso(publishAt)
            : null,
      relatedContentIds: relatedContentIds.filter(
        (id) => id !== `post:${postId}`,
      ),
      searchKeywords: commaSeparatedValues(searchKeywords, 20),
      status,
      tags,
      title: title.trim(),
    };
  }

  async function savePost(status: DentalpediaPostStatus) {
    if (saving || loadingDraft) return;
    const pendingPaths = images.map(
      (image) => image.path ?? `pending/${image.key}`,
    );
    const preUploadError = validateDentalpediaPost(
      postInput(status, pendingPaths),
      status === "published",
    );
    if (preUploadError) {
      setFeedback({ tone: "error", message: preUploadError });
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const resolvedImages = await Promise.all(
        images.map(async (image) => {
          if (image.path || !image.file) return image;
          const upload = await uploadAdminDentalpediaImage(accessToken, image.file);
          return { ...image, path: upload.path };
        }),
      );
      const imagePaths = resolvedImages
        .map((image) => image.path)
        .filter((path): path is string => Boolean(path));
      const input = postInput(status, imagePaths);
      const validationError = validateDentalpediaPost(
        input,
        status === "published",
      );
      if (validationError) throw new Error(validationError);

      const result = postId
        ? await updateAdminDentalpediaPost(accessToken, postId, input)
        : await createAdminDentalpediaPost(accessToken, input);
      applyPost(result.post);
      window.localStorage.setItem(postDraftStorageKey, result.post.id);
      setFeedback({
        tone: "success",
        message:
          status === "published" && !isVisible
            ? "게시물을 발행했지만 공개 상태가 꺼져 있어 앱에는 노출되지 않습니다."
            : result.message,
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "게시물을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      });
    } finally {
      setSaving(false);
    }
  }

  function resetPost() {
    window.localStorage.removeItem(postDraftStorageKey);
    revokeObjectUrls(images);
    setPostId(null);
    setTitle("");
    setCategory("");
    setCardSummary("");
    setTags([]);
    setTagDraft("");
    setSearchKeywords("");
    setPostType("carousel");
    setImages([]);
    setBodyText("");
    setIsVisible(true);
    setIsRecommended(false);
    setIsHero(false);
    setHomeVisible(true);
    setHomeOrder("2");
    setPublishMode("immediate");
    setPublishAt(toDateTimeLocalValue(new Date()));
    setEndAt("");
    setRelatedContentIds([]);
    setFeedback(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void savePost("published");
  }

  return (
    <div className="admin-information-video admin-information-post">
      <form id="information-upload-form" onSubmit={handleSubmit}>
        <div className="admin-information-video-layout">
          <div className="admin-information-video-editor">
            <DentalpediaWorkspaceHeading />
            <DentalpediaInformationTypeTabs
              informationType={informationType}
              onChange={onInformationTypeChange}
            />

            <div className="admin-information-video-type-note">
              <strong>선택된 유형: 게시물</strong>
              <p>
                이미지 1장 또는 여러 장으로 구성됩니다. 여러 장이면 1/6 형태로
                사용자에게 표시됩니다.
              </p>
            </div>

            {loadingDraft ? (
              <p className="admin-information-post-loading">저장한 게시물을 불러오는 중...</p>
            ) : null}
            {feedback ? (
              <p
                className={`admin-information-upload-feedback is-${feedback.tone}`}
                role="status"
              >
                {feedback.message}
              </p>
            ) : null}

            <PostSection title="기본 정보">
              <PostField label="콘텐츠 제목" required>
                <input
                  disabled={saving}
                  maxLength={120}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="예: 스케일링 전후 주의사항"
                  value={title}
                />
                <small>{title.length}/120</small>
              </PostField>

              <div className="admin-information-video-field">
                <div className="admin-information-column-category-heading">
                  <span className="admin-information-video-required-label">
                    <strong>카테고리</strong>
                    <b aria-hidden>*</b>
                  </span>
                  <button disabled={saving} onClick={onManageCategories} type="button">
                    카테고리 관리
                  </button>
                </div>
                <div className="admin-information-video-category-chips">
                  {categories.filter((option) => option.isActive || option.code === category).map((option) => (
                    <button
                      className={category === option.code ? "is-active" : undefined}
                      disabled={saving}
                      key={option.id}
                      onClick={() => setCategory(option.code)}
                      type="button"
                    >
                      {option.displayName}
                    </button>
                  ))}
                </div>
              </div>

              <PostField label="카드 요약">
                <textarea
                  disabled={saving}
                  maxLength={200}
                  onChange={(event) => setCardSummary(event.target.value)}
                  placeholder="홈 카드에 노출할 내용을 입력해 주세요."
                  value={cardSummary}
                />
                <small>{cardSummary.length}/200</small>
              </PostField>

              <div className="admin-information-video-field">
                <strong>태그</strong>
                <div className="admin-information-post-tag-entry">
                  <input
                    disabled={saving || tags.length >= 10}
                    maxLength={30}
                    onChange={(event) => setTagDraft(event.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="태그 입력"
                    value={tagDraft}
                  />
                  <button disabled={saving || !tagDraft.trim()} onClick={addTag} type="button">
                    추가
                  </button>
                </div>
                {tags.length ? (
                  <div className="admin-information-video-tags">
                    {tags.map((tag) => (
                      <span key={tag}>
                        #{tag}
                        <button
                          aria-label={`${tag} 태그 삭제`}
                          disabled={saving}
                          onClick={() => setTags((current) => current.filter((item) => item !== tag))}
                          type="button"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
                <small>최대 10개</small>
              </div>

              <PostField label="검색 키워드">
                <input
                  disabled={saving}
                  onChange={(event) => setSearchKeywords(event.target.value)}
                  placeholder="쉼표로 구분해 입력해 주세요."
                  value={searchKeywords}
                />
              </PostField>
            </PostSection>

            <PostSection title="게시물 콘텐츠">
              <fieldset className="admin-information-video-radio-field admin-information-post-type-field">
                <legend>게시물 유형</legend>
                <label>
                  <input
                    checked={postType === "single"}
                    disabled={saving}
                    name="postType"
                    onChange={() => choosePostType("single")}
                    type="radio"
                  />
                  단일 이미지
                </label>
                <label>
                  <input
                    checked={postType === "carousel"}
                    disabled={saving}
                    name="postType"
                    onChange={() => choosePostType("carousel")}
                    type="radio"
                  />
                  이미지 슬라이드
                </label>
              </fieldset>

              <div className="admin-information-video-field admin-information-post-images-field">
                <div className="admin-information-post-images-heading">
                  <strong>업로드 이미지</strong>
                  <span>{images.length}/{maxPostImages}</span>
                </div>
                {images.length ? (
                  <div className="admin-information-post-images-grid">
                    {images.map((image, index) => (
                      <article
                        className={draggedImageKey === image.key ? "is-dragging" : undefined}
                        draggable={!saving && images.length > 1}
                        key={image.key}
                        onDragEnd={() => setDraggedImageKey(null)}
                        onDragOver={(event) => event.preventDefault()}
                        onDragStart={() => setDraggedImageKey(image.key)}
                        onDrop={(event) => dropImage(event, image.key)}
                      >
                        <Image
                          alt={`${index + 1}번째 게시물 이미지`}
                          fill
                          sizes="(max-width: 700px) 50vw, 220px"
                          src={image.previewUrl}
                          unoptimized
                        />
                        {images.length > 1 ? (
                          <span className="admin-information-post-drag" aria-hidden>
                            <Image alt="" height={14} src="/dentalpedia/post-drag.svg" width={24} />
                          </span>
                        ) : null}
                        {index === 0 ? (
                          <span className="admin-information-post-representative">대표</span>
                        ) : null}
                        <span className="admin-information-post-sequence">{index + 1}</span>
                        <button
                          aria-label={`${index + 1}번째 이미지 삭제`}
                          disabled={saving}
                          onClick={() => removeImage(image.key)}
                          type="button"
                        >
                          <Image alt="" height={20} src="/dentalpedia/article-delete.svg" width={20} />
                        </button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="admin-information-post-empty">등록된 이미지가 없습니다.</p>
                )}
                <label className="admin-information-post-add-image">
                  <span aria-hidden>＋</span>
                  이미지 추가
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    disabled={saving || (postType === "carousel" && images.length >= maxPostImages)}
                    multiple={postType === "carousel"}
                    onChange={chooseImages}
                    type="file"
                  />
                </label>
                <small>
                  이미지를 드래그하여 순서를 변경할 수 있습니다. 첫 번째 이미지가 대표
                  이미지로 사용됩니다.
                </small>
                <small>
                  JPG, PNG, WEBP · 권장 1080×1080px (1:1) · 이미지당 최대 10MB
                </small>
              </div>

              <PostField label="본문/설명" required>
                <textarea
                  className="admin-information-post-body"
                  disabled={saving}
                  maxLength={5000}
                  onChange={(event) => setBodyText(event.target.value)}
                  placeholder="게시물과 함께 노출할 본문을 입력해 주세요."
                  value={bodyText}
                />
                <small>{bodyText.length}/5,000</small>
              </PostField>
            </PostSection>

            <PostSection title="노출 설정">
              <div className="admin-information-video-toggle-list">
                <PostToggleRow
                  checked={isVisible}
                  description="치카피디아 목록과 상세 페이지에 게시물을 노출합니다."
                  disabled={saving}
                  label="치카피디아 노출"
                  onChange={() => setIsVisible((value) => !value)}
                />
                <PostToggleRow
                  checked={isRecommended}
                  description="사용자에게 추천 콘텐츠로 표시합니다."
                  disabled={saving}
                  label="추천 콘텐츠"
                  onChange={() => setIsRecommended((value) => !value)}
                />
                <PostToggleRow
                  checked={isHero}
                  description="치카피디아 상단 대표 영역에 노출합니다."
                  disabled={saving}
                  label="상단 대표 콘텐츠"
                  onChange={() => setIsHero((value) => !value)}
                />
                <div className="admin-information-video-home-exposure">
                  <PostToggleRow
                    checked={homeVisible}
                    description="홈 화면의 치카피디아 영역에 노출합니다."
                    disabled={saving}
                    label="홈 노출"
                    onChange={() => setHomeVisible((value) => !value)}
                  />
                  {homeVisible ? (
                    <label>
                      노출 순서
                      <input
                        disabled={saving}
                        min={1}
                        onChange={(event) => setHomeOrder(event.target.value)}
                        type="number"
                        value={homeOrder}
                      />
                      <small>숫자가 작을수록 먼저 노출됩니다.</small>
                    </label>
                  ) : null}
                </div>
              </div>
            </PostSection>

            <PostSection title="발행 설정">
              <fieldset className="admin-information-video-radio-field">
                <legend>공개 상태</legend>
                <label>
                  <input
                    checked={isVisible}
                    disabled={saving}
                    name="visibility"
                    onChange={() => setIsVisible(true)}
                    type="radio"
                  />
                  공개
                </label>
                <label>
                  <input
                    checked={!isVisible}
                    disabled={saving}
                    name="visibility"
                    onChange={() => setIsVisible(false)}
                    type="radio"
                  />
                  비공개
                </label>
              </fieldset>
              <fieldset className="admin-information-video-radio-field">
                <legend>발행 방식</legend>
                <label>
                  <input
                    checked={publishMode === "immediate"}
                    disabled={saving}
                    name="publishMode"
                    onChange={() => setPublishMode("immediate")}
                    type="radio"
                  />
                  즉시 발행
                </label>
                <label>
                  <input
                    checked={publishMode === "scheduled"}
                    disabled={saving}
                    name="publishMode"
                    onChange={() => setPublishMode("scheduled")}
                    type="radio"
                  />
                  예약 발행
                </label>
              </fieldset>
              <div className="admin-information-video-date-grid">
                <PostField label="발행일시" required>
                  <input
                    disabled={saving || publishMode === "immediate"}
                    onChange={(event) => setPublishAt(event.target.value)}
                    type="datetime-local"
                    value={publishAt}
                  />
                </PostField>
                <PostField label="게시 종료일 (선택)">
                  <input
                    disabled={saving}
                    onChange={(event) => setEndAt(event.target.value)}
                    type="date"
                    value={endAt}
                  />
                </PostField>
              </div>
            </PostSection>

            <PostSection title="관련 콘텐츠">
              <div className="admin-information-video-related">
                <button
                  disabled={saving}
                  onClick={() => setRelatedDialogOpen(true)}
                  type="button"
                >
                  ＋ 콘텐츠 선택
                </button>
                {selectedRelatedOptions.length ? (
                  <ul>
                    {selectedRelatedOptions.map((option) => (
                      <li key={option.id}>
                        <span aria-hidden />
                        <strong>{option.label}</strong>
                        <button
                          aria-label={`${option.label} 관련 콘텐츠 삭제`}
                          onClick={() => setRelatedContentIds((current) => current.filter((id) => id !== option.id))}
                          type="button"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>선택된 관련 콘텐츠가 없습니다.</p>
                )}
                <small>같은 카테고리/태그 기반으로 자동 추천도 가능합니다.</small>
              </div>
            </PostSection>

            <footer className="admin-information-video-actions">
              <button disabled={loadingDraft || saving} onClick={resetPost} type="button">
                취소
              </button>
              <div>
                <button
                  disabled={loadingDraft || saving}
                  onClick={() => void savePost("draft")}
                  type="button"
                >
                  {saving ? "저장 중..." : "임시저장"}
                </button>
                <button disabled={loadingDraft || saving} type="submit">
                  {saving ? "처리 중..." : "발행하기"}
                </button>
              </div>
            </footer>
          </div>

          <PostPreview
            bodyText={bodyText}
            cardSummary={cardSummary}
            categoryLabel={categoryLabel}
            images={images}
            isRecommended={isRecommended}
            previewMode={previewMode}
            saved={Boolean(postId)}
            setPreviewMode={setPreviewMode}
            title={title}
          />
        </div>

        {relatedDialogOpen ? (
          <PostRelatedContentDialog
            currentPostId={postId}
            onChange={setRelatedContentIds}
            onClose={() => setRelatedDialogOpen(false)}
            options={relatedOptions}
            selectedIds={relatedContentIds}
          />
        ) : null}
      </form>
    </div>
  );
}

function PostSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="admin-information-video-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function PostField({
  children,
  label,
  required = false,
}: {
  children: ReactNode;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="admin-information-video-field">
      <span className="admin-information-video-required-label">
        <strong>{label}</strong>
        {required ? <b aria-hidden>*</b> : null}
      </span>
      {children}
    </label>
  );
}

function PostToggleRow({
  checked,
  description,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  disabled: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <div className="admin-information-video-toggle-row">
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
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
    </div>
  );
}

function PostPreview({
  bodyText,
  cardSummary,
  categoryLabel,
  images,
  isRecommended,
  previewMode,
  saved,
  setPreviewMode,
  title,
}: {
  bodyText: string;
  cardSummary: string;
  categoryLabel: string;
  images: PostImageDraft[];
  isRecommended: boolean;
  previewMode: PreviewMode;
  saved: boolean;
  setPreviewMode: (mode: PreviewMode) => void;
  title: string;
}) {
  const displayTitle = title.trim() || "콘텐츠 제목";
  const displaySummary = cardSummary.trim() || "카드 요약이 여기에 표시됩니다.";
  const displayBody = bodyText.trim() || "게시물 본문이 여기에 표시됩니다.";
  const previewImage = images[0]?.previewUrl;
  return (
    <aside className="admin-information-video-preview" aria-label="실시간 미리보기">
      <header>
        <span>
          <Image alt="" aria-hidden height={24} src="/dentalpedia/article-preview.svg" width={24} />
          <strong>실시간 미리보기</strong>
        </span>
        <em>{saved ? "저장된 게시물" : "미발행 미리보기"}</em>
      </header>
      <div className="admin-information-video-preview-tabs" role="tablist">
        <button
          aria-selected={previewMode === "home"}
          className={previewMode === "home" ? "is-active" : undefined}
          onClick={() => setPreviewMode("home")}
          role="tab"
          type="button"
        >
          홈 카드
        </button>
        <button
          aria-selected={previewMode === "detail"}
          className={previewMode === "detail" ? "is-active" : undefined}
          onClick={() => setPreviewMode("detail")}
          role="tab"
          type="button"
        >
          상세 페이지
        </button>
      </div>
      <p className="admin-information-video-preview-status">
        <span aria-hidden />입력 내용이 실시간으로 자동 반영됩니다.
      </p>

      {previewMode === "home" ? (
        <div className="admin-information-video-home-preview admin-information-post-home-preview">
          <header>
            <strong>치카픽 추천 칼럼</strong>
            <span>전체보기 &gt;</span>
          </header>
          <article>
            <PostPreviewImage
              alt={`${displayTitle} 카드 미리보기`}
              count={images.length}
              src={previewImage}
            />
            <div>
              <p>
                <span>{categoryLabel}</span>
                {isRecommended ? <em>추천</em> : null}
              </p>
              <h3>{displayTitle}</h3>
              <small>{displaySummary}</small>
            </div>
          </article>
        </div>
      ) : (
        <div className="admin-information-video-detail-preview admin-information-post-detail-preview">
          <PostPreviewImage
            alt={`${displayTitle} 상세 미리보기`}
            count={images.length}
            src={previewImage}
          />
          {images.length > 1 ? (
            <div className="admin-information-post-preview-dots" aria-label={`${images.length}장 중 첫 번째 이미지`}>
              {images.map((image, index) => (
                <span className={index === 0 ? "is-active" : undefined} key={image.key} />
              ))}
            </div>
          ) : null}
          <strong>{displayTitle}</strong>
          <p>{displayBody}</p>
        </div>
      )}
    </aside>
  );
}

function PostPreviewImage({
  alt,
  count,
  src,
}: {
  alt: string;
  count: number;
  src?: string;
}) {
  return (
    <div className="admin-information-video-preview-image admin-information-post-preview-image">
      {src ? (
        <Image alt={alt} fill sizes="354px" src={src} unoptimized />
      ) : (
        <div className="admin-information-preview-placeholder">
          <span aria-hidden>＋</span>
          이미지 미리보기
        </div>
      )}
      {count > 1 ? <span>1/{count}</span> : null}
    </div>
  );
}

function PostRelatedContentDialog({
  currentPostId,
  onChange,
  onClose,
  options,
  selectedIds,
}: {
  currentPostId: string | null;
  onChange: (ids: string[]) => void;
  onClose: () => void;
  options: DentalpediaRelatedContentOption[];
  selectedIds: string[];
}) {
  const availableOptions = options.filter(
    (option) => option.id !== `post:${currentPostId}`,
  );
  return (
    <div
      className="admin-information-video-dialog-layer"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <section
        aria-label="관련 콘텐츠 선택"
        aria-modal="true"
        className="admin-information-video-dialog"
        role="dialog"
      >
        <header>
          <div>
            <h2>관련 콘텐츠 선택</h2>
            <p>최대 10개까지 선택할 수 있습니다.</p>
          </div>
          <button aria-label="닫기" onClick={onClose} type="button">
            ×
          </button>
        </header>
        <div>
          {availableOptions.length ? (
            availableOptions.map((option) => (
              <label key={option.id}>
                <input
                  checked={selectedIds.includes(option.id)}
                  onChange={(event) => {
                    if (event.target.checked) {
                      if (selectedIds.length < 10) onChange([...selectedIds, option.id]);
                    } else {
                      onChange(selectedIds.filter((id) => id !== option.id));
                    }
                  }}
                  type="checkbox"
                />
                <span>
                  <strong>{option.label}</strong>
                  <small>{contentTypeLabel(option.type)}</small>
                </span>
              </label>
            ))
          ) : (
            <p>선택할 수 있는 발행 콘텐츠가 없습니다.</p>
          )}
        </div>
        <footer>
          <button onClick={onClose} type="button">
            선택 완료
          </button>
        </footer>
      </section>
    </div>
  );
}

function revokeObjectUrls(images: PostImageDraft[]) {
  images.forEach((image) => {
    if (image.objectUrl) URL.revokeObjectURL(image.previewUrl);
  });
}

function commaSeparatedValues(value: string, limit: number) {
  return [
    ...new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ].slice(0, limit);
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

function contentTypeFromId(id: string): DentalpediaRelatedContentOption["type"] {
  if (id.startsWith("video:")) return "video";
  if (id.startsWith("post:")) return "post";
  return "article";
}

function contentTypeLabel(type: DentalpediaRelatedContentOption["type"]) {
  if (type === "video") return "영상";
  if (type === "post") return "게시물";
  return "칼럼";
}
