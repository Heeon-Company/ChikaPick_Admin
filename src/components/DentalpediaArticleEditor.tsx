"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent, MouseEvent, ReactNode } from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  DentalpediaInformationTypeTabs,
  DentalpediaWorkspaceHeading,
  type DentalpediaInformationType,
} from "@/components/DentalpediaEditorNavigation";
import {
  createAdminDentalpediaCategory,
  deleteAdminDentalpediaCategory,
  createAdminDentalpediaArticle,
  fetchAdminDentalpediaArticle,
  fetchDentalpediaRelatedContentOptions,
  reorderAdminDentalpediaCategories,
  updateAdminDentalpediaCategory,
  updateAdminDentalpediaArticle,
  uploadAdminDentalpediaImage,
} from "@/lib/admin-api";
import {
  dentalpediaImageError,
  toDateTimeLocalValue,
  validateDentalpediaArticle,
  type AdminDentalpediaArticle,
  type AdminDentalpediaArticleInput,
  type DentalpediaArticleCategory,
  type DentalpediaArticleStatus,
} from "@/lib/dentalpedia";
import type { DentalpediaRelatedContentOption } from "@/lib/dentalpedia-video";
import type { AdminDentalpediaCategory } from "@/lib/dentalpedia-category";
import {
  dentalpediaLocalImageUrl,
  dentalpediaMarkdownImageUrls,
  insertDentalpediaEditorText,
  insertDentalpediaImages,
  resolveDentalpediaLocalImages,
  type DentalpediaEditorSelection,
} from "@/lib/dentalpedia-editor";

type PreviewMode = "home" | "detail";
type PublishMode = "immediate" | "scheduled";
type PendingBodyImage = {
  file: File;
  objectUrl: string;
  token: string;
};

const draftStorageKey = "chikapick.admin.dentalpedia.currentArticleId";

type CategoryManagementRow = {
  active: boolean;
  count: number;
  displayName: string;
  id: string;
  name: string;
};

type CategoryEditorState = {
  mode: "add" | "edit";
  order: number;
  row: CategoryManagementRow | null;
};

export function DentalpediaArticleEditor({
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
  const today = toDateTimeLocalValue(new Date()).slice(0, 10);
  const [articleId, setArticleId] = useState<string | null>(null);
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<DentalpediaArticleCategory>("");
  const [summary, setSummary] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [searchKeywords, setSearchKeywords] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverObjectUrl, setCoverObjectUrl] = useState<string | null>(null);
  const [coverImagePath, setCoverImagePath] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [bodyMarkdown, setBodyMarkdown] = useState("");
  const [bodyEditing, setBodyEditing] = useState(true);
  const [storedImagePaths, setStoredImagePaths] = useState<
    Record<string, string>
  >({});
  const [pendingBodyImages, setPendingBodyImages] = useState<
    PendingBodyImage[]
  >([]);
  const [authorLabel, setAuthorLabel] = useState("");
  const [authoredAt, setAuthoredAt] = useState(today);
  const [reviewedAt, setReviewedAt] = useState(today);
  const [reviewerLabel, setReviewerLabel] = useState("");
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
  const [disclaimerEnabled, setDisclaimerEnabled] = useState(true);
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
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const bodyImageInputRef = useRef<HTMLInputElement>(null);
  const bodySelectionRef = useRef<DentalpediaEditorSelection>({
    end: 0,
    start: 0,
  });
  const bodyScrollTopRef = useRef(0);

  useEffect(() => {
    if (!publishToast) return;
    const timer = window.setTimeout(() => setPublishToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [publishToast]);

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

  const previewBody = useMemo(
    () => resolveDentalpediaLocalImages(bodyMarkdown, pendingBodyImages),
    [bodyMarkdown, pendingBodyImages],
  );
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
    categories.find((item) => item.code === category)?.displayName ?? "카테고리";
  const visibleCoverUrl = coverObjectUrl ?? coverImageUrl;

  const applyArticle = useCallback((article: AdminDentalpediaArticle) => {
    const markdown = article.bodyMarkdown ?? "";
    const imageUrls = dentalpediaMarkdownImageUrls(markdown);
    setArticleId(article.id);
    setSlug(article.slug);
    setTitle(article.title);
    setCategory(article.category);
    setSummary(article.homeSummary);
    setTags(article.tags);
    setTagDraft("");
    setSearchKeywords(article.searchKeywords.join(", "));
    setCoverFile(null);
    setCoverObjectUrl(null);
    setCoverImagePath(article.coverImagePath);
    setCoverImageUrl(article.coverImageUrl);
    setBodyMarkdown(markdown);
    setBodyEditing(true);
    setStoredImagePaths(
      Object.fromEntries(
        imageUrls
          .map((url, index) => [url, article.bodyImagePaths[index]])
          .filter((entry): entry is [string, string] => Boolean(entry[1])),
      ),
    );
    setPendingBodyImages([]);
    setAuthorLabel(article.authorLabel);
    setAuthoredAt(article.authoredAt ?? toDateInputValue(article.publishAt));
    setReviewedAt(article.reviewedAt ?? "");
    setReviewerLabel(article.reviewerLabel ?? "");
    setIsVisible(article.isVisible);
    setIsRecommended(article.isRecommended);
    setIsHero(article.isHero);
    setHomeVisible(article.homeVisible);
    setHomeOrder(String(article.homeOrder));
    setPublishMode(
      article.publishAt && new Date(article.publishAt).getTime() > Date.now()
        ? "scheduled"
        : "immediate",
    );
    setPublishAt(
      article.publishAt
        ? toDateTimeLocalValue(new Date(article.publishAt))
        : toDateTimeLocalValue(new Date()),
    );
    setEndAt(toDateInputValue(article.endAt));
    setRelatedContentIds(article.relatedContentIds);
    setDisclaimerEnabled(article.disclaimerEnabled);
  }, []);

  useEffect(() => {
    const savedId = window.localStorage.getItem(draftStorageKey);
    if (!savedId || !accessToken) {
      const timer = window.setTimeout(() => setLoadingDraft(false), 0);
      return () => window.clearTimeout(timer);
    }
    let active = true;
    fetchAdminDentalpediaArticle(accessToken, savedId)
      .then(({ article }) => {
        if (article.status !== "draft") {
          window.localStorage.removeItem(draftStorageKey);
          return;
        }
        if (active) applyArticle(article);
      })
      .catch(() => {
        window.localStorage.removeItem(draftStorageKey);
      })
      .finally(() => {
        if (active) setLoadingDraft(false);
      });
    return () => {
      active = false;
    };
  }, [accessToken, applyArticle]);

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

  function chooseCover(file: File | null) {
    const error = dentalpediaImageError(file);
    if (error) {
      setFeedback({ tone: "error", message: error });
      return;
    }
    if (coverObjectUrl) URL.revokeObjectURL(coverObjectUrl);
    setCoverFile(file);
    setCoverObjectUrl(file ? URL.createObjectURL(file) : null);
    setFeedback(null);
  }

  function removeCover() {
    if (coverObjectUrl) URL.revokeObjectURL(coverObjectUrl);
    setCoverFile(null);
    setCoverObjectUrl(null);
    setCoverImagePath(null);
    setCoverImageUrl(null);
  }

  function rememberBodySelection(textarea = bodyRef.current) {
    if (!textarea) return;
    bodySelectionRef.current = {
      end: textarea.selectionEnd,
      start: textarea.selectionStart,
    };
    bodyScrollTopRef.current = textarea.scrollTop;
  }

  function restoreBodySelection(selection: DentalpediaEditorSelection) {
    bodySelectionRef.current = selection;
    window.requestAnimationFrame(() => {
      const textarea = bodyRef.current;
      if (!textarea) return;
      textarea.focus({ preventScroll: true });
      textarea.setSelectionRange(selection.start, selection.end);
      textarea.scrollTop = bodyScrollTopRef.current;
    });
  }

  function keepBodyFocus(event: MouseEvent<HTMLElement>) {
    event.preventDefault();
    rememberBodySelection();
  }

  function openBodyImagePicker() {
    rememberBodySelection();
    bodyImageInputRef.current?.click();
  }

  function showBodyEditor() {
    setBodyEditing(true);
    restoreBodySelection(bodySelectionRef.current);
  }

  function handleBodyKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Tab") return;
    event.preventDefault();
    const result = insertDentalpediaEditorText(
      event.currentTarget.value,
      {
        end: event.currentTarget.selectionEnd,
        start: event.currentTarget.selectionStart,
      },
      "  ",
    );
    setBodyMarkdown(result.value);
    restoreBodySelection(result.selection);
  }

  function applyFormat(prefix: string, suffix: string, placeholder: string) {
    const textarea = bodyRef.current;
    if (!textarea) return;
    setBodyEditing(true);
    bodyScrollTopRef.current = textarea.scrollTop;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = bodyMarkdown.slice(start, end) || placeholder;
    const next = `${bodyMarkdown.slice(0, start)}${prefix}${selected}${suffix}${bodyMarkdown.slice(end)}`;
    setBodyMarkdown(next.slice(0, 50_000));
    restoreBodySelection({
      start: start + prefix.length,
      end: start + prefix.length + selected.length,
    });
  }

  function addBodyImages(files: FileList | null) {
    if (!files) return;
    const referencedImages = dentalpediaMarkdownImageUrls(bodyMarkdown);
    const existingImageCount = referencedImages.filter(
      (url) => !url.startsWith("dentalpedia-local://"),
    ).length;
    const pendingImageCount = pendingBodyImages.filter((image) =>
      referencedImages.includes(dentalpediaLocalImageUrl(image.token)),
    ).length;
    const available = Math.max(0, 10 - existingImageCount - pendingImageCount);
    const selected = Array.from(files).slice(0, available);
    if (selected.length === 0) {
      setFeedback({
        tone: "error",
        message: "본문 이미지는 최대 10개까지 등록할 수 있습니다.",
      });
      return;
    }
    const error = selected.map(dentalpediaImageError).find(Boolean);
    if (error) {
      setFeedback({ tone: "error", message: error });
      return;
    }
    const images = selected.map((file) => ({
      file,
      objectUrl: URL.createObjectURL(file),
      token: crypto.randomUUID(),
    }));
    setPendingBodyImages((current) => [...current, ...images]);
    const result = insertDentalpediaImages(
      bodyMarkdown,
      bodySelectionRef.current,
      images.map((image) => ({ fileName: image.file.name, token: image.token })),
    );
    setBodyMarkdown(result.value);
    if (bodyEditing) {
      restoreBodySelection(result.selection);
    } else {
      bodySelectionRef.current = result.selection;
    }
    setFeedback(null);
  }

  function articleInput(
    status: DentalpediaArticleStatus,
    resolvedSlug: string,
    resolvedCoverPath: string | null,
    resolvedBody: string,
    resolvedImagePaths: string[],
  ): AdminDentalpediaArticleInput {
    return {
      authorLabel: authorLabel.trim(),
      authoredAt: authoredAt || null,
      bodyImagePaths: resolvedImagePaths,
      bodyMarkdown: resolvedBody,
      category,
      coverImageAlt: title.trim() ? `${title.trim()} 대표 이미지` : "",
      coverImagePath: resolvedCoverPath,
      disclaimerEnabled,
      endAt: dateToEndOfDayIso(endAt),
      homeOrder: Number(homeOrder),
      homeSummary: summary.trim(),
      homeVisible,
      isHero,
      isRecommended,
      isVisible,
      publishAt:
        status === "published"
          ? publishMode === "scheduled"
            ? localDateTimeToIso(publishAt)
            : new Date().toISOString()
          : publishMode === "scheduled"
            ? localDateTimeToIso(publishAt)
            : null,
      relatedContentIds: relatedContentIds.filter(
        (id) => id !== `article:${articleId}`,
      ),
      reviewedAt: reviewedAt || null,
      reviewerLabel: reviewerLabel.trim() || null,
      searchKeywords: commaSeparatedValues(searchKeywords, 20),
      slug: resolvedSlug,
      status,
      tags,
      title: title.trim(),
    };
  }

  async function save(status: DentalpediaArticleStatus) {
    if (!accessToken || saving || loadingDraft) return;
    if (status === "published") setPublishToast(null);
    const resolvedSlug = slug || `column-${crypto.randomUUID()}`;
    const pendingCoverPath =
      coverImagePath ?? (coverFile ? "pending-cover" : null);
    const pendingBodyPaths = dentalpediaMarkdownImageUrls(bodyMarkdown).map(
      (url, index) => storedImagePaths[url] ?? `pending-body-${index}`,
    );
    const preUploadInput = articleInput(
      status,
      resolvedSlug,
      pendingCoverPath,
      bodyMarkdown,
      pendingBodyPaths,
    );
    const preUploadError = validateDentalpediaArticle(
      preUploadInput,
      status === "published",
    );
    if (preUploadError) {
      const outcome = { tone: "error" as const, message: preUploadError };
      setFeedback(outcome);
      if (status === "published") setPublishToast(outcome);
      return;
    }
    if (
      status === "published" &&
      publishMode === "scheduled" &&
      (!preUploadInput.publishAt ||
        new Date(preUploadInput.publishAt).getTime() <= Date.now())
    ) {
      const outcome = {
        tone: "error",
        message: "예약 발행일은 현재 이후로 설정해 주세요.",
      } as const;
      setFeedback(outcome);
      setPublishToast(outcome);
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      setSlug(resolvedSlug);
      let nextCoverPath = coverImagePath;
      if (coverFile) {
        const upload = await uploadAdminDentalpediaImage(accessToken, coverFile);
        nextCoverPath = upload.path;
      }

      const referencedPendingImages = pendingBodyImages.filter((image) =>
        bodyMarkdown.includes(dentalpediaLocalImageUrl(image.token)),
      );
      const uploadedBodyImages = await Promise.all(
        referencedPendingImages.map(async (image) => ({
          image,
          upload: await uploadAdminDentalpediaImage(accessToken, image.file),
        })),
      );
      let resolvedBody = bodyMarkdown;
      const nextStoredPaths = { ...storedImagePaths };
      uploadedBodyImages.forEach(({ image, upload }) => {
        resolvedBody = resolvedBody.replaceAll(
          dentalpediaLocalImageUrl(image.token),
          upload.publicUrl,
        );
        nextStoredPaths[upload.publicUrl] = upload.path;
      });
      const resolvedImagePaths = dentalpediaMarkdownImageUrls(resolvedBody).map(
        (url) => nextStoredPaths[url],
      );
      if (resolvedImagePaths.some((path) => !path)) {
        throw new Error("본문 이미지는 이미지 삽입 버튼으로 등록해 주세요.");
      }
      const verifiedImagePaths = resolvedImagePaths.filter(
        (path): path is string => Boolean(path),
      );
      const input = articleInput(
        status,
        resolvedSlug,
        nextCoverPath,
        resolvedBody,
        verifiedImagePaths,
      );
      const validationError = validateDentalpediaArticle(
        input,
        status === "published",
      );
      if (validationError) throw new Error(validationError);

      const result = articleId
        ? await updateAdminDentalpediaArticle(accessToken, articleId, input)
        : await createAdminDentalpediaArticle(accessToken, input);
      if (coverObjectUrl) URL.revokeObjectURL(coverObjectUrl);
      pendingBodyImages.forEach((image) => URL.revokeObjectURL(image.objectUrl));
      applyArticle(result.article);
      if (status === "draft") {
        window.localStorage.setItem(draftStorageKey, result.article.id);
      } else {
        window.localStorage.removeItem(draftStorageKey);
      }
      const outcome = {
        tone: "success",
        message:
          status === "published" && !isVisible
            ? "칼럼을 발행했지만 공개 상태가 꺼져 있어 앱에는 노출되지 않습니다."
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
            : "칼럼을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      } as const;
      setFeedback(outcome);
      if (status === "published") setPublishToast(outcome);
    } finally {
      setSaving(false);
    }
  }

  function resetToNewArticle() {
    window.localStorage.removeItem(draftStorageKey);
    if (coverObjectUrl) URL.revokeObjectURL(coverObjectUrl);
    pendingBodyImages.forEach((image) => URL.revokeObjectURL(image.objectUrl));
    setArticleId(null);
    setSlug("");
    setTitle("");
    setCategory("");
    setSummary("");
    setTags([]);
    setTagDraft("");
    setSearchKeywords("");
    setCoverFile(null);
    setCoverObjectUrl(null);
    setCoverImagePath(null);
    setCoverImageUrl(null);
    setBodyMarkdown("");
    setBodyEditing(true);
    setStoredImagePaths({});
    setPendingBodyImages([]);
    setAuthorLabel("");
    setAuthoredAt(toDateTimeLocalValue(new Date()).slice(0, 10));
    setReviewedAt(toDateTimeLocalValue(new Date()).slice(0, 10));
    setReviewerLabel("");
    setIsVisible(true);
    setIsRecommended(false);
    setIsHero(false);
    setHomeVisible(true);
    setHomeOrder("2");
    setPublishMode("immediate");
    setPublishAt(toDateTimeLocalValue(new Date()));
    setEndAt("");
    setRelatedContentIds([]);
    setDisclaimerEnabled(true);
    setFeedback(null);
    setPublishToast(null);
  }

  function submitArticle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void save("published");
  }

  return (
    <div className="admin-information-video admin-information-column">
      <form id="information-upload-form" onSubmit={submitArticle}>
        <div className="admin-information-video-layout">
          <div className="admin-information-video-editor">
            <DentalpediaWorkspaceHeading />
            <DentalpediaInformationTypeTabs
              informationType={informationType}
              onChange={onInformationTypeChange}
            />

            <div className="admin-information-video-type-note">
              <strong>선택된 유형: 칼럼</strong>
              <p>
                대표 이미지 + 제목 + 요약 + 상세 본문 형태로 사용자에게 노출됩니다.
              </p>
            </div>

            {loadingDraft ? (
              <p className="admin-information-post-loading">
                저장한 칼럼을 불러오는 중...
              </p>
            ) : null}
            {feedback ? (
              <p
                className={`admin-information-upload-feedback is-${feedback.tone}`}
                role="status"
              >
                {feedback.message}
              </p>
            ) : null}

            <ColumnSection title="기본 정보">
              <ColumnField label="콘텐츠 제목" required>
                <input
                  disabled={saving}
                  maxLength={120}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="콘텐츠 제목을 입력해 주세요."
                  value={title}
                />
              </ColumnField>

              <div className="admin-information-video-field">
                <div className="admin-information-column-category-heading">
                  <span className="admin-information-video-required-label">
                    <strong>카테고리</strong>
                    <b aria-hidden>*</b>
                  </span>
                  <button
                    disabled={saving}
                    onClick={onManageCategories}
                    type="button"
                  >
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
                <small>사용자 상단 필터와 연결됩니다.</small>
              </div>

              <ColumnField label="카드 요약">
                <textarea
                  disabled={saving}
                  maxLength={200}
                  onChange={(event) => setSummary(event.target.value)}
                  placeholder="홈이나 가로형 칼럼 카드에서 사용할 짧은 설명입니다."
                  value={summary}
                />
                <small>홈이나 가로형 칼럼 카드에서 사용할 짧은 설명입니다.</small>
              </ColumnField>

              <div className="admin-information-video-field">
                <strong>태그</strong>
                {tags.length ? (
                  <div className="admin-information-video-tags">
                    {tags.map((tag) => (
                      <span key={tag}>
                        #{tag}
                        <button
                          aria-label={`${tag} 태그 삭제`}
                          disabled={saving}
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

              <ColumnField label="검색 키워드">
                <input
                  disabled={saving}
                  onChange={(event) => setSearchKeywords(event.target.value)}
                  placeholder="쉼표로 구분해 입력해 주세요."
                  value={searchKeywords}
                />
                <small>사용자 검색 시 제목 외 추가 검색어로 활용됩니다.</small>
              </ColumnField>
            </ColumnSection>

            <ColumnSection title="칼럼 콘텐츠">
              <div className="admin-information-video-field">
                <span className="admin-information-video-required-label">
                  <strong>대표 이미지</strong>
                  <b aria-hidden>*</b>
                </span>
                <div className="admin-information-column-cover-field">
                  <div className="admin-information-column-cover-image">
                    {visibleCoverUrl ? (
                      <ArticleImage
                        alt={title || "칼럼 대표 이미지"}
                        src={visibleCoverUrl}
                      />
                    ) : (
                      <ColumnPreviewImagePlaceholder />
                    )}
                  </div>
                  <div className="admin-information-column-cover-actions">
                    <div>
                      <label>
                        이미지 변경
                        <input
                          accept="image/jpeg,image/png,image/webp"
                          aria-label="대표 이미지 변경"
                          disabled={saving}
                          onChange={(event) => {
                            chooseCover(event.currentTarget.files?.[0] ?? null);
                            event.currentTarget.value = "";
                          }}
                          type="file"
                        />
                      </label>
                      <button
                        aria-label="대표 이미지 삭제"
                        disabled={saving}
                        onClick={removeCover}
                        type="button"
                      >
                        <Image
                          alt=""
                          aria-hidden
                          height={18}
                          src="/dentalpedia/article-delete.svg"
                          width={24}
                        />
                      </button>
                    </div>
                    <small>
                      권장 사이즈: 1280 × 720px (16:9) · JPG, PNG, WEBP · 최대
                      10MB
                    </small>
                  </div>
                </div>
              </div>

              <div className="admin-information-video-field">
                <strong>노출 영역별 미리보기</strong>
                <div className="admin-information-column-crops">
                  <ColumnCrop
                    detail="4:3 비율 크롭"
                    label="홈 카드"
                    ratio="4 / 3"
                    src={visibleCoverUrl}
                  />
                  <ColumnCrop
                    detail="16:9 비율 크롭"
                    label="Hero 카드"
                    ratio="16 / 9"
                    src={visibleCoverUrl}
                  />
                  <ColumnCrop
                    detail="1:1 비율 크롭"
                    label="기본 카드"
                    ratio="1 / 1"
                    src={visibleCoverUrl}
                  />
                  <ColumnCrop
                    detail="4:3 비율 크롭"
                    label="가로 칼럼 카드"
                    ratio="4 / 3"
                    src={visibleCoverUrl}
                  />
                </div>
              </div>

              <div className="admin-information-video-field">
                <div className="admin-information-column-body-heading">
                  <strong>본문 내용</strong>
                  <div aria-label="본문 보기 방식" role="tablist">
                    <button
                      aria-selected={bodyEditing}
                      className={bodyEditing ? "is-active" : undefined}
                      onClick={showBodyEditor}
                      role="tab"
                      type="button"
                    >
                      작성
                    </button>
                    <button
                      aria-selected={!bodyEditing}
                      className={!bodyEditing ? "is-active" : undefined}
                      onClick={() => {
                        rememberBodySelection();
                        setBodyEditing(false);
                      }}
                      role="tab"
                      type="button"
                    >
                      미리보기
                    </button>
                  </div>
                </div>
                <div
                  aria-label="본문 편집 도구"
                  className="admin-information-column-toolbar"
                  onMouseDown={(event) => {
                    if ((event.target as HTMLElement).closest("button")) {
                      keepBodyFocus(event);
                    }
                  }}
                  role="toolbar"
                >
                  <button
                    className="is-paragraph"
                    onClick={() => applyFormat("\n\n", "", "본문을 입력하세요.")}
                    type="button"
                  >
                    본문(Paragraph)
                    <Image
                      alt=""
                      height={24}
                      src="/dentalpedia/article-chevron-down.svg"
                      width={24}
                    />
                  </button>
                  <span aria-hidden />
                  <button onClick={() => applyFormat("## ", "", "제목")} type="button">
                    H2
                  </button>
                  <button onClick={() => applyFormat("### ", "", "소제목")} type="button">
                    H3
                  </button>
                  <span aria-hidden />
                  <button
                    aria-label="굵게"
                    className="is-bold"
                    onClick={() => applyFormat("**", "**", "강조할 내용")}
                    type="button"
                  >
                    B
                  </button>
                  <span aria-hidden />
                  <button
                    aria-label="목록"
                    onClick={() => applyFormat("1. ", "", "목록 항목")}
                    type="button"
                  >
                    <Image
                      alt=""
                      height={24}
                      src="/dentalpedia/article-list.svg"
                      width={24}
                    />
                  </button>
                  <button
                    aria-label="이미지 삽입"
                    onClick={openBodyImagePicker}
                    type="button"
                  >
                    <Image
                      alt=""
                      height={24}
                      src="/dentalpedia/article-camera.svg"
                      width={24}
                    />
                  </button>
                  <button
                    aria-label="안내문 삽입"
                    onClick={() => applyFormat("> 💡 ", "", "알아두세요")}
                    type="button"
                  >
                    <Image
                      alt=""
                      height={24}
                      src="/dentalpedia/column-toolbar-callout.svg"
                      width={24}
                    />
                  </button>
                  <button
                    aria-label="링크 삽입"
                    onClick={() =>
                      applyFormat("[", "](https://)", "링크 텍스트")
                    }
                    type="button"
                  >
                    <Image
                      alt=""
                      height={24}
                      src="/dentalpedia/column-toolbar-share.svg"
                      width={24}
                    />
                  </button>
                </div>
                <div
                  className={`admin-information-column-body-editor${bodyEditing ? " is-editing" : ""}`}
                >
                  <div
                    aria-hidden
                    className="admin-information-column-body-rendered"
                  >
                    {previewBody.trim() ? (
                      <ReactMarkdown
                        components={{
                          img: ({ alt, src }) => (
                            <span className="admin-information-column-markdown-image">
                              <Image
                                alt={alt ?? "본문 이미지"}
                                fill
                                sizes="760px"
                                src={String(src)}
                                unoptimized
                              />
                            </span>
                          ),
                        }}
                        remarkPlugins={[remarkGfm]}
                        urlTransform={dentalpediaBodyUrlTransform}
                      >
                        {previewBody}
                      </ReactMarkdown>
                    ) : (
                      <p className="admin-information-column-body-placeholder">
                        본문 내용을 입력해 주세요.
                      </p>
                    )}
                  </div>
                  <textarea
                    aria-label="칼럼 본문"
                    className="admin-information-column-body"
                    disabled={saving}
                    maxLength={50_000}
                    onChange={(event) => {
                      setBodyMarkdown(event.target.value);
                      rememberBodySelection(event.currentTarget);
                    }}
                    onKeyDown={handleBodyKeyDown}
                    onSelect={(event) =>
                      rememberBodySelection(event.currentTarget)
                    }
                    placeholder="본문 내용을 입력해 주세요."
                    ref={bodyRef}
                    value={bodyMarkdown}
                  />
                </div>
                <button
                  className="admin-information-column-insert-image"
                  disabled={saving}
                  onClick={openBodyImagePicker}
                  onMouseDown={keepBodyFocus}
                  type="button"
                >
                  <Image
                    alt=""
                    height={18}
                    src="/dentalpedia/column-insert-image.svg"
                    width={24}
                  />
                  이미지 삽입
                </button>
                <input
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  multiple
                  onChange={(event) => {
                    addBodyImages(event.currentTarget.files);
                    event.currentTarget.value = "";
                  }}
                  ref={bodyImageInputRef}
                  type="file"
                />
              </div>
            </ColumnSection>

            <ColumnSection title="작성 정보">
              <div className="admin-information-column-grid">
                <ColumnField label="작성자" required>
                  <input
                    disabled={saving}
                    maxLength={40}
                    onChange={(event) => setAuthorLabel(event.target.value)}
                    value={authorLabel}
                  />
                </ColumnField>
                <ColumnField label="작성/게시일" required>
                  <input
                    disabled={saving}
                    onChange={(event) => setAuthoredAt(event.target.value)}
                    type="date"
                    value={authoredAt}
                  />
                </ColumnField>
                <ColumnField label="최종 검토일" required>
                  <input
                    disabled={saving}
                    onChange={(event) => setReviewedAt(event.target.value)}
                    type="date"
                    value={reviewedAt}
                  />
                </ColumnField>
                <ColumnField label="검수자">
                  <input
                    disabled={saving}
                    maxLength={40}
                    onChange={(event) => setReviewerLabel(event.target.value)}
                    placeholder="검수자 정보 (선택)"
                    value={reviewerLabel}
                  />
                </ColumnField>
              </div>
              <p className="admin-information-column-helper">
                치과 건강 정보의 경우 검수 전문가를 기재할 수 있습니다.
              </p>
            </ColumnSection>

            <ColumnSection title="노출 설정">
              <div className="admin-information-video-toggle-list">
                <ColumnToggleRow
                  checked={isVisible}
                  description="ON이면 치카피디아 콘텐츠 목록에 노출됩니다."
                  disabled={saving}
                  label="치카피디아 노출"
                  onChange={() => setIsVisible((value) => !value)}
                />
                <ColumnToggleRow
                  checked={isRecommended}
                  description="추천 콘텐츠로 강조 노출합니다."
                  disabled={saving}
                  label="추천 콘텐츠"
                  onChange={() => setIsRecommended((value) => !value)}
                />
                <ColumnToggleRow
                  checked={isHero}
                  description="치카피디아 상단 Hero 영역에 노출합니다."
                  disabled={saving}
                  label="상단 대표 콘텐츠"
                  onChange={() => setIsHero((value) => !value)}
                />
                <div className="admin-information-video-home-exposure">
                  <ColumnToggleRow
                    checked={homeVisible}
                    description="치카픽 홈 화면 치카피디아 영역에 노출합니다."
                    disabled={saving}
                    label="홈 노출"
                    onChange={() => setHomeVisible((value) => !value)}
                  />
                  {homeVisible ? (
                    <label>
                      홈 노출 순서
                      <input
                        disabled={saving}
                        min={1}
                        max={9999}
                        onChange={(event) => setHomeOrder(event.target.value)}
                        type="number"
                        value={homeOrder}
                      />
                      <small>
                        1순위는 대형 카드, 2~5순위는 일반 카드로 자동 배치됩니다.
                      </small>
                    </label>
                  ) : null}
                </div>
              </div>
            </ColumnSection>

            <ColumnSection title="발행 설정">
              <fieldset className="admin-information-video-radio-field">
                <legend>공개 상태</legend>
                <label>
                  <input
                    checked={isVisible}
                    disabled={saving}
                    name="articleVisibility"
                    onChange={() => setIsVisible(true)}
                    type="radio"
                  />
                  공개
                </label>
                <label>
                  <input
                    checked={!isVisible}
                    disabled={saving}
                    name="articleVisibility"
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
                    name="articlePublishMode"
                    onChange={() => setPublishMode("immediate")}
                    type="radio"
                  />
                  즉시 발행
                </label>
                <label>
                  <input
                    checked={publishMode === "scheduled"}
                    disabled={saving}
                    name="articlePublishMode"
                    onChange={() => setPublishMode("scheduled")}
                    type="radio"
                  />
                  예약 발행
                </label>
              </fieldset>
              <div className="admin-information-video-date-grid">
                <ColumnField label="게시일시">
                  <input
                    disabled={saving || publishMode === "immediate"}
                    onChange={(event) => setPublishAt(event.target.value)}
                    type="datetime-local"
                    value={publishAt}
                  />
                </ColumnField>
                <ColumnField label="게시 종료일 (선택)">
                  <input
                    disabled={saving}
                    onChange={(event) => setEndAt(event.target.value)}
                    type="date"
                    value={endAt}
                  />
                </ColumnField>
              </div>
            </ColumnSection>

            <ColumnSection title="관련 콘텐츠">
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
                        <strong>
                          {option.label} ({contentTypeLabel(option.type)})
                        </strong>
                        <button
                          aria-label={`${option.label} 관련 콘텐츠 삭제`}
                          disabled={saving}
                          onClick={() =>
                            setRelatedContentIds((current) =>
                              current.filter((id) => id !== option.id),
                            )
                          }
                          type="button"
                        >
                          <Image
                            alt=""
                            height={18}
                            src="/dentalpedia/column-delete.svg"
                            width={24}
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>선택된 관련 콘텐츠가 없습니다.</p>
                )}
              </div>
            </ColumnSection>
          </div>

          <footer className="admin-information-video-actions">
            <button disabled={loadingDraft || saving} onClick={resetToNewArticle} type="button">
              취소
            </button>
            <div>
              <button
                disabled={loadingDraft || saving}
                onClick={() => void save("draft")}
                type="button"
              >
                {saving ? "저장 중..." : "임시저장"}
              </button>
              <button disabled={loadingDraft || saving} type="submit">
                {saving ? "처리 중..." : "발행하기"}
              </button>
            </div>
          </footer>

          <ColumnPreview
            body={previewBody}
            categoryLabel={categoryLabel}
            coverUrl={visibleCoverUrl}
            isRecommended={isRecommended}
            previewMode={previewMode}
            saved={Boolean(articleId)}
            setPreviewMode={setPreviewMode}
            summary={summary}
            title={title}
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
          <ColumnRelatedContentDialog
            currentArticleId={articleId}
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

export function ColumnCategoryManagementDialog({
  accessToken,
  categories,
  onCategoriesChange,
  onClose,
}: {
  accessToken: string;
  categories: AdminDentalpediaCategory[];
  onCategoriesChange: (categories: AdminDentalpediaCategory[]) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const hadSubdialogRef = useRef(false);
  const [rows, setRows] = useState<CategoryManagementRow[]>(() =>
    categories.map(categoryManagementRow),
  );
  const [categoryEditor, setCategoryEditor] =
    useState<CategoryEditorState | null>(null);
  const [warningRow, setWarningRow] =
    useState<CategoryManagementRow | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  useEffect(() => {
    const hasSubdialog = Boolean(categoryEditor || warningRow);
    if (!hasSubdialog && hadSubdialogRef.current) dialogRef.current?.focus();
    hadSubdialogRef.current = hasSubdialog;
  }, [categoryEditor, warningRow]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (warningRow) {
        setWarningRow(null);
      } else if (categoryEditor) {
        setCategoryEditor(null);
      } else {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [categoryEditor, onClose, warningRow]);

  async function saveCategory(input: {
    active: boolean;
    displayName: string;
    name: string;
    order: number;
  }) {
    if (busy || !categoryEditor) return;
    setBusy(true);
    setError(null);
    try {
      const payload = {
        displayName: input.displayName || input.name,
        displayOrder: input.order,
        isActive: input.active,
        name: input.name,
      };
      const result = categoryEditor.mode === "edit" && categoryEditor.row
        ? await updateAdminDentalpediaCategory(
            accessToken,
            categoryEditor.row.id,
            payload,
          )
        : await createAdminDentalpediaCategory(accessToken, payload);
      const withoutSaved = categories.filter(
        (category) => category.id !== result.category.id,
      );
      withoutSaved.splice(
        Math.min(Math.max(input.order - 1, 0), withoutSaved.length),
        0,
        result.category,
      );
      const reordered = await reorderAdminDentalpediaCategories(
        accessToken,
        withoutSaved.map((category) => category.id),
      );
      setRows(reordered.categories.map(categoryManagementRow));
      onCategoriesChange(reordered.categories);
      setCategoryEditor(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "카테고리를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteCategory(row: CategoryManagementRow) {
    if (row.count > 0) {
      setWarningRow(row);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await deleteAdminDentalpediaCategory(accessToken, row.id);
      const remaining = categories.filter((category) => category.id !== row.id);
      setRows(remaining.map(categoryManagementRow));
      onCategoriesChange(remaining);
      setCategoryEditor(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "카테고리를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function disableWarningCategory() {
    if (!warningRow || busy) return;
    setBusy(true);
    setError(null);
    try {
      const source = categories.find((category) => category.id === warningRow.id);
      if (!source) return;
      const result = await updateAdminDentalpediaCategory(
        accessToken,
        source.id,
        {
          displayName: source.displayName,
          displayOrder: source.displayOrder,
          isActive: false,
          name: source.name,
        },
      );
      const updated = categories.map((category) =>
        category.id === result.category.id ? result.category : category,
      );
      setRows(updated.map(categoryManagementRow));
      onCategoriesChange(updated);
      setWarningRow(null);
      setCategoryEditor(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "카테고리를 수정하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function moveCategory(targetId: string) {
    if (!draggedId || draggedId === targetId || busy) return;
    const nextRows = [...rows];
    const sourceIndex = nextRows.findIndex((row) => row.id === draggedId);
    const targetIndex = nextRows.findIndex((row) => row.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const [moved] = nextRows.splice(sourceIndex, 1);
    nextRows.splice(targetIndex, 0, moved);
    setRows(nextRows);
    setDraggedId(null);
    setBusy(true);
    setError(null);
    try {
      const result = await reorderAdminDentalpediaCategories(
        accessToken,
        nextRows.map((row) => row.id),
      );
      onCategoriesChange(result.categories);
    } catch (cause) {
      setRows(categories.map(categoryManagementRow));
      setError(
        cause instanceof Error
          ? cause.message
          : "카테고리 순서를 변경하지 못했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="admin-information-column-category-dialog-layer"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <section
        aria-describedby="column-category-description"
        aria-hidden={categoryEditor ? true : undefined}
        aria-labelledby="column-category-title"
        aria-modal="true"
        className="admin-information-column-category-dialog"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <button className="sr-only" onClick={onClose} type="button">
          카테고리 관리 닫기
        </button>
        <header>
          <div>
            <h2 id="column-category-title">카테고리 관리</h2>
            <p id="column-category-description">
              사용자 치카피디아 화면에 노출되는 콘텐츠 카테고리를 관리합니다.
            </p>
          </div>
          <button
            onClick={() => {
              setError(null);
              setCategoryEditor({ mode: "add", order: rows.length + 1, row: null });
            }}
            type="button"
          >
            <Image
              alt=""
              height={16}
              src="/dentalpedia/column-category-add.svg"
              width={16}
            />
            카테고리 추가
          </button>
        </header>

        {error ? (
          <p className="admin-information-upload-feedback is-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="admin-information-column-category-table-wrap">
          <table>
            <caption className="sr-only">치카피디아 카테고리 목록</caption>
            <colgroup>
              <col className="is-drag" />
              <col className="is-name" />
              <col className="is-display" />
              <col className="is-order" />
              <col className="is-status" />
              <col className="is-count" />
              <col className="is-action" />
            </colgroup>
            <thead>
              <tr>
                <th aria-label="순서 변경" />
                <th>카테고리명</th>
                <th>사용자 노출명</th>
                <th>노출 순서</th>
                <th>사용 상태</th>
                <th>등록 콘텐츠 수</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  draggable={!busy}
                  key={row.id}
                  onDragEnd={() => setDraggedId(null)}
                  onDragOver={(event) => event.preventDefault()}
                  onDragStart={() => setDraggedId(row.id)}
                  onDrop={() => void moveCategory(row.id)}
                >
                  <td>
                    <Image
                      alt=""
                      height={20}
                      src="/dentalpedia/column-category-drag.svg"
                      width={20}
                    />
                  </td>
                  <td>
                    <strong>{row.name}</strong>
                  </td>
                  <td>{row.displayName}</td>
                  <td>{index + 1}</td>
                  <td>
                    <span className={row.active ? undefined : "is-inactive"}>
                      {row.active ? "사용 중" : "사용 안 함"}
                    </span>
                  </td>
                  <td>{row.count}개</td>
                  <td>
                    <button
                      onClick={() => {
                        setError(null);
                        setCategoryEditor({ mode: "edit", order: index + 1, row });
                      }}
                      type="button"
                    >
                      수정
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer>
          <Image
            alt=""
            height={16}
            src="/dentalpedia/column-category-info.svg"
            width={16}
          />
          <p>
            * 노출 순서를 변경하면 사용자 치카피디아 카테고리 탭에 즉시
            반영됩니다.
          </p>
        </footer>
      </section>

      {categoryEditor ? (
        <ColumnCategoryFormDialog
          error={error}
          editor={categoryEditor}
          obscured={Boolean(warningRow)}
          onClose={() => setCategoryEditor(null)}
          busy={busy}
          onDelete={(row) => void deleteCategory(row)}
          onSave={saveCategory}
        />
      ) : null}
      {warningRow ? (
        <ColumnCategoryDeleteWarningDialog
          busy={busy}
          count={warningRow.count}
          error={error}
          onClose={() => setWarningRow(null)}
          onDisable={disableWarningCategory}
        />
      ) : null}
    </div>
  );
}

function ColumnCategoryFormDialog({
  busy,
  editor,
  error,
  obscured,
  onClose,
  onDelete,
  onSave,
}: {
  busy: boolean;
  editor: CategoryEditorState;
  error: string | null;
  obscured: boolean;
  onClose: () => void;
  onDelete: (row: CategoryManagementRow) => void;
  onSave: (input: {
    active: boolean;
    displayName: string;
    name: string;
    order: number;
  }) => void | Promise<void>;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const [name, setName] = useState(editor.row?.name ?? "");
  const [displayName, setDisplayName] = useState(editor.row?.displayName ?? "");
  const [order, setOrder] = useState(String(editor.order));
  const [active, setActive] = useState(editor.row?.active ?? true);
  const editedRow = editor.row;
  const trimmedName = name.trim();

  useEffect(() => {
    if (!obscured) dialogRef.current?.focus();
  }, [obscured]);

  function save() {
    if (!trimmedName) return;
    void onSave({
      active,
      displayName: displayName.trim(),
      name: trimmedName,
      order: Math.max(1, Number.parseInt(order, 10) || 1),
    });
  }

  return (
    <div
      aria-hidden={obscured ? true : undefined}
      className="admin-information-column-category-subdialog-layer"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <section
        aria-labelledby="column-category-form-title"
        aria-modal="true"
        className="admin-information-column-category-form-dialog"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <header>
          <h2 id="column-category-form-title">
            {editor.mode === "add" ? "카테고리 추가" : "카테고리 수정"}
          </h2>
          <button aria-label="닫기" onClick={onClose} type="button">
            <Image
              alt=""
              height={24}
              src="/dentalpedia/column-category-close.svg"
              width={24}
            />
          </button>
        </header>

        <div className="admin-information-column-category-form-body">
          {error ? (
            <p className="admin-information-upload-feedback is-error" role="alert">
              {error}
            </p>
          ) : null}
          <label>
            <span>
              카테고리명 <b aria-hidden>*</b>
            </span>
            <input
              autoFocus
              disabled={busy}
              maxLength={40}
              onChange={(event) => setName(event.target.value)}
              placeholder="예) 구강 관리, 임플란트"
              value={name}
            />
          </label>
          <label>
            <span>사용자 노출명</span>
            <input
              disabled={busy}
              maxLength={40}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="화면에 표시될 카테고리명을 입력하세요"
              value={displayName}
            />
            <small>비워두면 카테고리명이 그대로 사용됩니다.</small>
          </label>
          <label className="admin-information-column-category-order-field">
            <span>노출 순서</span>
            <input
              disabled={busy}
              inputMode="numeric"
              min={1}
              onChange={(event) => setOrder(event.target.value)}
              type="number"
              value={order}
            />
          </label>
          <div className="admin-information-column-category-toggle-field">
            <span>
              <strong>사용 여부</strong>
              <small>게시판 목록 활성화 여부를 결정합니다.</small>
            </span>
            <button
              aria-label={active ? "카테고리 사용 중" : "카테고리 사용 안 함"}
              aria-pressed={active}
              className={active ? "is-active" : undefined}
              disabled={busy}
              onClick={() => setActive((current) => !current)}
              type="button"
            />
          </div>
        </div>

        <footer className={editor.mode === "edit" ? "has-delete" : undefined}>
          {editor.mode === "edit" && editedRow ? (
            <button
              className="is-delete"
              disabled={busy}
              onClick={() => onDelete(editedRow)}
              type="button"
            >
              카테고리 삭제
            </button>
          ) : null}
          <div>
            <button disabled={busy} onClick={onClose} type="button">
              취소
            </button>
            <button disabled={busy || !trimmedName} onClick={save} type="button">
              {busy ? "저장 중..." : editor.mode === "add" ? "카테고리 추가" : "저장"}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function ColumnCategoryDeleteWarningDialog({
  busy,
  count,
  error,
  onClose,
  onDisable,
}: {
  busy: boolean;
  count: number;
  error: string | null;
  onClose: () => void;
  onDisable: () => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  return (
    <div
      className="admin-information-column-category-subdialog-layer is-warning"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <section
        aria-describedby="column-category-warning-description"
        aria-labelledby="column-category-warning-title"
        aria-modal="true"
        className="admin-information-column-category-warning-dialog"
        ref={dialogRef}
        role="alertdialog"
        tabIndex={-1}
      >
        <div className="admin-information-column-category-warning-body">
          <span>
            <Image
              alt=""
              height={28}
              src="/dentalpedia/column-category-warning.svg"
              width={28}
            />
          </span>
          <div>
            <h2 id="column-category-warning-title">
              카테고리를 삭제할 수 없습니다
            </h2>
            <p id="column-category-warning-description">
              이 카테고리에 <strong>{count}개의 콘텐츠</strong>가 연결되어 있습니다.
              <br />
              삭제하려면 먼저 콘텐츠를 다른 카테고리로 변경해 주세요.
            </p>
          </div>
        </div>
        {error ? (
          <p className="admin-information-upload-feedback is-error" role="alert">
            {error}
          </p>
        ) : null}
        <footer>
          <button disabled={busy} onClick={onDisable} type="button">
            {busy ? "변경 중..." : "사용 안 함으로 변경"}
          </button>
          <button disabled={busy} onClick={onClose} type="button">
            확인
          </button>
        </footer>
      </section>
    </div>
  );
}

function categoryManagementRow(
  category: AdminDentalpediaCategory,
): CategoryManagementRow {
  return {
    active: category.isActive,
    count: category.contentCount,
    displayName: category.displayName,
    id: category.id,
    name: category.name,
  };
}

function ColumnSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="admin-information-video-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function ColumnField({
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

function ColumnCrop({
  detail,
  label,
  ratio,
  src,
}: {
  detail: string;
  label: string;
  ratio: string;
  src: string | null;
}) {
  return (
    <figure>
      <div style={{ aspectRatio: ratio }}>
        {src ? (
          <ArticleImage alt={`${label} 대표 이미지 미리보기`} src={src} />
        ) : (
          <ColumnPreviewImagePlaceholder />
        )}
      </div>
      <figcaption>
        <strong>{label}</strong>
        <small>{detail}</small>
      </figcaption>
    </figure>
  );
}

function ColumnToggleRow({
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

function ColumnPreview({
  body,
  categoryLabel,
  coverUrl,
  isRecommended,
  previewMode,
  saved,
  setPreviewMode,
  summary,
  title,
}: {
  body: string;
  categoryLabel: string;
  coverUrl: string | null;
  isRecommended: boolean;
  previewMode: PreviewMode;
  saved: boolean;
  setPreviewMode: (mode: PreviewMode) => void;
  summary: string;
  title: string;
}) {
  const displayTitle = title.trim() || "콘텐츠 제목";
  const displaySummary =
    summary.trim() || "카드 요약이 여기에 표시됩니다.";
  return (
    <aside className="admin-information-video-preview" aria-label="실시간 미리보기">
      <header>
        <span>
          <Image
            alt=""
            height={24}
            src="/dentalpedia/article-preview.svg"
            width={24}
          />
          <strong>실시간 미리보기</strong>
        </span>
        <em>{saved ? "저장된 칼럼" : "미발행 미리보기"}</em>
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
        <div className="admin-information-column-home-preview">
          <header>
            <strong>치카픽 추천 칼럼</strong>
            <span>전체보기 &gt;</span>
          </header>
          <article>
            <div className="admin-information-column-preview-image">
              {coverUrl ? (
                <ArticleImage
                  alt={`${displayTitle} 홈 카드 미리보기`}
                  src={coverUrl}
                />
              ) : (
                <ColumnPreviewImagePlaceholder />
              )}
            </div>
            <div>
              <p className="admin-information-column-preview-badges">
                <span>COLUMN · {categoryLabel}</span>
                {isRecommended ? <em>추천</em> : null}
              </p>
              <h3>{displayTitle}</h3>
              <small>{displaySummary}</small>
            </div>
          </article>
        </div>
      ) : (
        <article className="admin-information-column-detail-preview">
          <div className="admin-information-column-detail-image">
            {coverUrl ? (
              <ArticleImage
                alt={`${displayTitle} 상세 미리보기`}
                src={coverUrl}
              />
            ) : (
              <ColumnPreviewImagePlaceholder />
            )}
          </div>
          <span>COLUMN · {categoryLabel}</span>
          <h3>{displayTitle}</h3>
          <p>{displaySummary}</p>
          <div className="admin-information-column-markdown">
            <ReactMarkdown
              components={{
                img: ({ alt, src }) => (
                  <span className="admin-information-column-markdown-image">
                    <Image
                      alt={alt ?? "본문 이미지"}
                      fill
                      sizes="386px"
                      src={String(src)}
                      unoptimized
                    />
                  </span>
                ),
              }}
              remarkPlugins={[remarkGfm]}
              urlTransform={dentalpediaBodyUrlTransform}
            >
              {body}
            </ReactMarkdown>
          </div>
        </article>
      )}
    </aside>
  );
}

function ColumnPreviewImagePlaceholder() {
  return (
    <div className="admin-information-preview-placeholder">
      <span aria-hidden>＋</span>
      이미지 미리보기
    </div>
  );
}

function ColumnRelatedContentDialog({
  currentArticleId,
  onChange,
  onClose,
  options,
  selectedIds,
}: {
  currentArticleId: string | null;
  onChange: (ids: string[]) => void;
  onClose: () => void;
  options: DentalpediaRelatedContentOption[];
  selectedIds: string[];
}) {
  const availableOptions = options.filter(
    (option) => option.id !== `article:${currentArticleId}`,
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
                      if (selectedIds.length < 10) {
                        onChange([...selectedIds, option.id]);
                      }
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

function ArticleImage({
  alt,
  src,
}: {
  alt: string;
  src: string;
}) {
  return (
    <Image
      alt={alt}
      fill
      sizes="(max-width: 1050px) 100vw, 420px"
      src={src}
      unoptimized
    />
  );
}

function dentalpediaBodyUrlTransform(value: string, key: string) {
  return key === "src" && value.startsWith("blob:")
    ? value
    : defaultUrlTransform(value);
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
