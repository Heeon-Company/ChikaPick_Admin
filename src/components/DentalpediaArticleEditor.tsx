"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { AdminSelect } from "@/components/AdminSelect";
import {
  createAdminDentalpediaArticle,
  fetchAdminDentalpediaArticle,
  updateAdminDentalpediaArticle,
  uploadAdminDentalpediaImage,
} from "@/lib/admin-api";
import {
  dentalpediaImageError,
  formatDentalpediaDate,
  toDateTimeLocalValue,
  validateDentalpediaArticle,
  type AdminDentalpediaArticle,
  type AdminDentalpediaArticleInput,
  type DentalpediaArticleCategory,
} from "@/lib/dentalpedia";

type InformationType = "video" | "article";
type ArticleAuthor = "operator" | "content-manager";
type PreviewMode = "home" | "detail";
type PublishMode = "immediate" | "scheduled";
type PendingBodyImage = {
  file: File;
  objectUrl: string;
  token: string;
};

const draftStorageKey = "chikapick.admin.dentalpedia.currentArticleId";
const initialTitle = "임플란트 상담 전 꼭 확인해야 할 5가지";
const initialSummary =
  "치료 전 상담에서 비용, 재료, 보증, 사후관리 기준을 확인하는 방법을 정리했습니다.";
const initialBody = `## 왜 상담 전 확인이 필요할까요?

임플란트 치료는 개인의 구강 상태와 치료 계획에 따라 비용과 기간이 달라질 수 있습니다.

## 상담에서 확인할 5가지

1. 내 상태에 맞는 치료 계획
2. 사용할 재료와 제조사
3. 총 치료비와 추가 비용
4. 보증 및 사후관리 기준
5. 치료 기간과 내원 횟수

> 정확한 치료 계획은 의료진의 대면 진료와 상담 후 결정됩니다.`;

const categories: ReadonlyArray<{
  label: string;
  value: DentalpediaArticleCategory;
}> = [
  { value: "treatment-guide", label: "치료 가이드" },
  { value: "oral-care", label: "구강 관리" },
  { value: "cost-guide", label: "치료 비용 가이드" },
  { value: "dental-news", label: "치과 소식" },
];

const authors: ReadonlyArray<{ label: string; value: ArticleAuthor }> = [
  { value: "operator", label: "운영 관리자" },
  { value: "content-manager", label: "콘텐츠 관리자" },
];

const authorLabels: Record<ArticleAuthor, string> = {
  operator: "운영 관리자",
  "content-manager": "콘텐츠 관리자",
};

type DentalpediaArticleEditorProps = {
  accessToken: string;
  informationType: InformationType;
  onInformationTypeChange: (type: InformationType) => void;
};

export function DentalpediaArticleEditor({
  accessToken,
  informationType,
  onInformationTypeChange,
}: DentalpediaArticleEditorProps) {
  const [articleId, setArticleId] = useState<string | null>(null);
  const [title, setTitle] = useState(initialTitle);
  const [category, setCategory] =
    useState<DentalpediaArticleCategory>("treatment-guide");
  const [tags, setTags] = useState(["임플란트", "치과상담", "치료가이드"]);
  const [tagDraft, setTagDraft] = useState("");
  const [slug, setSlug] = useState("implant-consulting-checklist");
  const [summary, setSummary] = useState(initialSummary);
  const [homeVisible, setHomeVisible] = useState(true);
  const [recommended, setRecommended] = useState(true);
  const [homeOrder, setHomeOrder] = useState("2");
  const [bodyMarkdown, setBodyMarkdown] = useState(initialBody);
  const [storedImagePaths, setStoredImagePaths] = useState<Record<string, string>>({});
  const [pendingBodyImages, setPendingBodyImages] = useState<PendingBodyImage[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverObjectUrl, setCoverObjectUrl] = useState<string | null>(null);
  const [coverImagePath, setCoverImagePath] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("home");
  const [publishMode, setPublishMode] = useState<PublishMode>("immediate");
  const [publishAt, setPublishAt] = useState(() =>
    toDateTimeLocalValue(new Date()),
  );
  const [author, setAuthor] = useState<ArticleAuthor>("operator");
  const [reviewedAt, setReviewedAt] = useState(() =>
    toDateTimeLocalValue(new Date()).slice(0, 10),
  );
  const [disclaimerEnabled, setDisclaimerEnabled] = useState(true);
  const [publishingExpanded, setPublishingExpanded] = useState(true);
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "error" | "success";
  } | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const bodyImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedId = window.localStorage.getItem(draftStorageKey);
    if (!savedId || !accessToken) {
      const timer = window.setTimeout(() => setLoadingDraft(false), 0);
      return () => window.clearTimeout(timer);
    }
    let active = true;
    fetchAdminDentalpediaArticle(accessToken, savedId)
      .then(({ article }) => {
        if (!active) return;
        applyArticle(article);
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
  }, [accessToken]);

  const previewBody = useMemo(() => {
    let markdown = bodyMarkdown;
    pendingBodyImages.forEach((image) => {
      markdown = markdown.replaceAll(localImageUrl(image.token), image.objectUrl);
    });
    return markdown;
  }, [bodyMarkdown, pendingBodyImages]);

  const categoryLabel =
    categories.find((item) => item.value === category)?.label ?? "치료 가이드";
  const visibleCoverUrl = coverObjectUrl ?? coverImageUrl;

  function applyArticle(article: AdminDentalpediaArticle) {
    const markdown = article.bodyMarkdown ?? "";
    const imageUrls = markdownImageUrls(markdown);
    setArticleId(article.id);
    setTitle(article.title);
    setCategory(article.category);
    setTags(article.tags);
    setSlug(article.slug);
    setSummary(article.homeSummary);
    setHomeVisible(article.homeVisible);
    setRecommended(article.isRecommended);
    setHomeOrder(String(article.homeOrder));
    setBodyMarkdown(markdown);
    setStoredImagePaths(
      Object.fromEntries(
        imageUrls.map((url, index) => [url, article.bodyImagePaths[index]]).filter(
          (entry): entry is [string, string] => Boolean(entry[1]),
        ),
      ),
    );
    setCoverFile(null);
    setCoverObjectUrl(null);
    setCoverImagePath(article.coverImagePath);
    setCoverImageUrl(article.coverImageUrl);
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
    setAuthor(article.authorLabel === "콘텐츠 관리자" ? "content-manager" : "operator");
    setReviewedAt(article.reviewedAt ?? "");
    setDisclaimerEnabled(article.disclaimerEnabled);
    setPendingBodyImages([]);
    setLastSavedAt(new Date(article.updatedAt));
  }

  function addTag() {
    const normalized = tagDraft.trim().replace(/^#+/, "");
    if (!normalized || tags.includes(normalized)) return;
    if (tags.length >= 10 || normalized.length > 30) {
      setFeedback({ tone: "error", message: "태그는 30자 이내로 최대 10개까지 등록할 수 있습니다." });
      return;
    }
    setTags((current) => [...current, normalized]);
    setTagDraft("");
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

  function applyFormat(prefix: string, suffix: string, placeholder: string) {
    const textarea = bodyRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = bodyMarkdown.slice(start, end) || placeholder;
    const next = `${bodyMarkdown.slice(0, start)}${prefix}${selected}${suffix}${bodyMarkdown.slice(end)}`;
    setBodyMarkdown(next.slice(0, 50_000));
    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    });
  }

  function addBodyImages(files: FileList | null) {
    if (!files) return;
    const referencedImages = markdownImageUrls(bodyMarkdown);
    const existingImageCount = referencedImages.filter(
      (url) => !url.startsWith("dentalpedia-local://"),
    ).length;
    const pendingImageCount = pendingBodyImages.filter((image) =>
      referencedImages.includes(localImageUrl(image.token)),
    ).length;
    const available = Math.max(0, 10 - existingImageCount - pendingImageCount);
    const selected = Array.from(files).slice(0, available);
    if (selected.length === 0) {
      setFeedback({ tone: "error", message: "본문 이미지는 최대 10개까지 등록할 수 있습니다." });
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
    setBodyMarkdown((current) => {
      const separator = current && !current.endsWith("\n") ? "\n\n" : "";
      return `${current}${separator}${images
        .map((image) => `![${safeMarkdownAlt(image.file.name)}](${localImageUrl(image.token)})`)
        .join("\n\n")}`.slice(0, 50_000);
    });
    setFeedback(null);
  }

  async function save(status: "draft" | "published") {
    if (!accessToken || saving) return;
    setSaving(true);
    setFeedback(null);
    try {
      const requestedPublishAt =
        status === "published"
          ? publishMode === "immediate"
            ? new Date().toISOString()
            : localDateTimeToIso(publishAt)
          : publishAt
            ? localDateTimeToIso(publishAt)
            : null;
      if (
        status === "published" &&
        publishMode === "scheduled" &&
        (!requestedPublishAt || new Date(requestedPublishAt).getTime() <= Date.now())
      ) {
        throw new Error("예약 발행일은 현재 이후로 설정해 주세요.");
      }
      const preUploadValidationError = validateDentalpediaArticle(
        {
          authorLabel: authorLabels[author],
          bodyImagePaths: [],
          bodyMarkdown,
          category,
          coverImageAlt: title.trim(),
          coverImagePath: coverImagePath ?? (coverFile ? "pending-upload" : null),
          disclaimerEnabled,
          homeOrder: Number(homeOrder),
          homeSummary: summary.trim(),
          homeVisible,
          isRecommended: recommended,
          publishAt: requestedPublishAt,
          reviewedAt: reviewedAt || null,
          slug: slug.trim().toLowerCase(),
          status,
          tags,
          title: title.trim(),
        },
        status === "published",
      );
      if (preUploadValidationError) throw new Error(preUploadValidationError);

      let nextCoverPath = coverImagePath;
      if (coverFile) {
        const uploaded = await uploadAdminDentalpediaImage(accessToken, coverFile);
        nextCoverPath = uploaded.path;
      }

      const referencedPendingImages = pendingBodyImages.filter((image) =>
        bodyMarkdown.includes(localImageUrl(image.token)),
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
        resolvedBody = resolvedBody.replaceAll(localImageUrl(image.token), upload.publicUrl);
        nextStoredPaths[upload.publicUrl] = upload.path;
      });
      const resolvedImagePaths = markdownImageUrls(resolvedBody).map(
        (url) => nextStoredPaths[url],
      );
      if (resolvedImagePaths.some((path) => !path)) {
        throw new Error("본문 이미지는 이미지 삽입 버튼으로 등록해 주세요.");
      }
      const verifiedImagePaths = resolvedImagePaths.filter(
        (path): path is string => Boolean(path),
      );

      const input: AdminDentalpediaArticleInput = {
        authorLabel: authorLabels[author],
        bodyImagePaths: verifiedImagePaths,
        bodyMarkdown: resolvedBody,
        category,
        coverImageAlt: title.trim(),
        coverImagePath: nextCoverPath,
        disclaimerEnabled,
        homeOrder: Number(homeOrder),
        homeSummary: summary.trim(),
        homeVisible,
        isRecommended: recommended,
        publishAt: requestedPublishAt,
        reviewedAt: reviewedAt || null,
        slug: slug.trim().toLowerCase(),
        status,
        tags,
        title: title.trim(),
      };
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
      window.localStorage.setItem(draftStorageKey, result.article.id);
      setFeedback({ tone: "success", message: result.message });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "칼럼을 저장하지 못했습니다.",
      });
    } finally {
      setSaving(false);
    }
  }

  function resetToNewArticle() {
    window.localStorage.removeItem(draftStorageKey);
    setArticleId(null);
    setTitle("");
    setCategory("treatment-guide");
    setTags([]);
    setSlug("");
    setSummary("");
    setHomeVisible(true);
    setRecommended(false);
    setHomeOrder("1");
    setBodyMarkdown("");
    setStoredImagePaths({});
    pendingBodyImages.forEach((image) => URL.revokeObjectURL(image.objectUrl));
    setPendingBodyImages([]);
    removeCover();
    setPublishMode("immediate");
    setPublishAt(toDateTimeLocalValue(new Date()));
    setReviewedAt(toDateTimeLocalValue(new Date()).slice(0, 10));
    setDisclaimerEnabled(true);
    setLastSavedAt(null);
    setFeedback({ tone: "success", message: "새 칼럼을 작성할 수 있습니다." });
  }

  function submitArticle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void save("published");
  }

  if (loadingDraft) {
    return <p className="admin-information-article-loading">저장한 칼럼을 불러오는 중입니다.</p>;
  }

  return (
    <form className="admin-information-article" id="information-upload-form" onSubmit={submitArticle} role="tabpanel">
      <div className="admin-information-article-layout">
        <div className="admin-information-article-editor">
          <div className="admin-information-upload-tabs" aria-label="업로드 정보 유형" role="tablist">
            <button aria-selected={informationType === "video"} onClick={() => onInformationTypeChange("video")} role="tab" type="button">영상</button>
            <button aria-selected className="is-active" role="tab" type="button">칼럼/게시글</button>
          </div>

          {feedback ? (
            <p className={`admin-information-article-feedback is-${feedback.tone}`} role="alert">{feedback.message}</p>
          ) : null}

          <section className="admin-information-article-card">
            <h2>기본 정보</h2>
            <label className="admin-information-article-field">
              <span className="admin-information-article-field-heading"><strong>칼럼 제목 *</strong><small>{title.length} / 60</small></span>
              <input className="is-emphasized" maxLength={60} onChange={(event) => setTitle(event.target.value)} type="text" value={title} />
            </label>
            <div className="admin-information-article-basic-grid">
              <div className="admin-information-article-field">
                <strong>카테고리 *</strong>
                <AdminSelect className="admin-information-article-select" label="칼럼 카테고리" onChange={setCategory} options={categories} value={category} />
              </div>
              <div className="admin-information-article-field">
                <strong>태그</strong>
                <div className="admin-information-article-tags">
                  {tags.map((tag) => <button aria-label={`${tag} 태그 삭제`} className="is-tag" key={tag} onClick={() => setTags((current) => current.filter((item) => item !== tag))} type="button">#{tag} ×</button>)}
                  <input aria-label="새 태그" maxLength={30} onChange={(event) => setTagDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addTag(); } }} placeholder="태그" value={tagDraft} />
                  <button onClick={addTag} type="button">+ 태그 추가</button>
                </div>
              </div>
            </div>
            <label className="admin-information-article-field">
              <strong>페이지 주소(URL) *</strong>
              <span className="admin-information-article-slug"><span>chikapick.com/column/</span><input aria-label="페이지 주소" maxLength={100} onChange={(event) => setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} type="text" value={slug} /></span>
            </label>
          </section>

          <section className="admin-information-article-card">
            <header className="admin-information-article-section-heading"><h2>홈 노출 정보</h2><p>홈 칼럼 카드에 표시될 정보를 입력하세요.</p></header>
            <div className="admin-information-article-field">
              <strong>대표 이미지 *</strong>
              <div className="admin-information-article-cover-field">
                <div className="admin-information-article-cover-image"><ArticleImage alt={title || "칼럼 대표 이미지"} fallback="/dentalpedia/article-consultation-cover.png" src={visibleCoverUrl} /></div>
                <div className="admin-information-article-cover-controls">
                  <div><label>이미지 변경<input accept="image/jpeg,image/png,image/webp" aria-label="대표 이미지 변경" onChange={(event) => { chooseCover(event.currentTarget.files?.[0] ?? null); event.currentTarget.value = ""; }} type="file" /></label><button aria-label="대표 이미지 삭제" onClick={removeCover} type="button"><Image alt="" aria-hidden height={24} src="/dentalpedia/article-delete.svg" width={24} /></button></div>
                  <small>{coverFile?.name ?? (coverImagePath ? "등록된 대표 이미지" : "권장 1200 × 630px · JPG, PNG, WEBP · 최대 10MB")}</small>
                </div>
              </div>
            </div>
            <label className="admin-information-article-field">
              <span className="admin-information-article-field-heading"><strong>홈 카드 요약 *</strong><small>{summary.length} / 120</small></span>
              <textarea maxLength={120} onChange={(event) => setSummary(event.target.value)} value={summary} />
            </label>
            <div className="admin-information-article-home-settings">
              <div><Switch checked={homeVisible} label="홈에 노출" onChange={() => setHomeVisible((current) => !current)} /><strong>홈에 노출</strong></div>
              <div><Switch checked={recommended} label="추천 칼럼으로 표시" onChange={() => setRecommended((current) => !current)} /><strong>추천 칼럼으로 표시</strong></div>
              <label><strong>홈 노출 순서</strong><input aria-label="홈 노출 순서" min="1" onChange={(event) => setHomeOrder(event.target.value)} type="number" value={homeOrder} /><small>숫자가 작을수록 먼저 노출됩니다.</small></label>
            </div>
          </section>

          <section className="admin-information-article-card admin-information-article-body-card">
            <h2>본문 내용</h2>
            <div aria-label="본문 편집 도구" className="admin-information-article-toolbar" role="toolbar">
              <button className="is-paragraph" onClick={() => applyFormat("\n\n", "", "본문을 입력하세요.")} type="button">본문(Paragraph)<Image alt="" aria-hidden height={24} src="/dentalpedia/article-chevron-down.svg" width={24} /></button><span aria-hidden />
              <button aria-label="굵게" className="is-bold" onClick={() => applyFormat("**", "**", "강조할 내용")} type="button">B</button>
              <button aria-label="기울임" className="is-italic" onClick={() => applyFormat("*", "*", "기울일 내용")} type="button">I</button>
              <button aria-label="인용" className="is-underline" onClick={() => applyFormat("> ", "", "인용할 내용")} type="button">U</button><span aria-hidden />
              <button onClick={() => applyFormat("## ", "", "제목")} type="button">H2</button><button onClick={() => applyFormat("### ", "", "소제목")} type="button">H3</button><span aria-hidden />
              <button aria-label="목록" onClick={() => applyFormat("1. ", "", "목록 항목")} type="button"><Image alt="" aria-hidden height={24} src="/dentalpedia/article-list.svg" width={24} /></button>
              <button aria-label="실행 취소" onClick={() => { bodyRef.current?.focus(); document.execCommand("undo"); }} type="button"><Image alt="" aria-hidden height={24} src="/dentalpedia/article-back.svg" width={24} /></button>
              <button aria-label="이미지 삽입" onClick={() => bodyImageInputRef.current?.click()} type="button"><Image alt="" aria-hidden height={24} src="/dentalpedia/article-camera.svg" width={24} /></button>
            </div>
            <textarea aria-label="칼럼 본문" className="admin-information-article-content admin-information-article-content-editor" maxLength={50000} onChange={(event) => setBodyMarkdown(event.target.value)} ref={bodyRef} value={bodyMarkdown} />
            <input accept="image/jpeg,image/png,image/webp" className="sr-only" multiple onChange={(event) => { addBodyImages(event.currentTarget.files); event.currentTarget.value = ""; }} ref={bodyImageInputRef} type="file" />
            <p className="admin-information-article-saved"><span aria-hidden />{saving ? "저장 중" : lastSavedAt ? `${lastSavedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} 저장됨` : "아직 저장되지 않음"}</p>
          </section>

          <section className="admin-information-article-card admin-information-article-publishing">
            <header><h2>발행 설정</h2><button aria-expanded={publishingExpanded} aria-label={publishingExpanded ? "발행 설정 접기" : "발행 설정 펼치기"} onClick={() => setPublishingExpanded((current) => !current)} type="button"><Image alt="" aria-hidden height={24} src={publishingExpanded ? "/dentalpedia/article-chevron-up.svg" : "/dentalpedia/article-chevron-down.svg"} width={24} /></button></header>
            {publishingExpanded ? <>
              <div className="admin-information-article-publish-options"><label><input checked={publishMode === "immediate"} name="article-publish-mode" onChange={() => setPublishMode("immediate")} type="radio" />즉시 발행</label><label><input checked={publishMode === "scheduled"} name="article-publish-mode" onChange={() => setPublishMode("scheduled")} type="radio" />예약 발행</label></div>
              <div className="admin-information-article-publish-grid">
                <label className="admin-information-article-field"><strong>발행일</strong><input disabled={publishMode === "immediate"} onChange={(event) => setPublishAt(event.target.value)} type="datetime-local" value={publishAt} /></label>
                <div className="admin-information-article-field"><strong>작성자</strong><AdminSelect className="admin-information-article-select" label="작성자" onChange={setAuthor} options={authors} value={author} /></div>
                <label className="admin-information-article-field"><strong>최종 검토일</strong><input onChange={(event) => setReviewedAt(event.target.value)} type="date" value={reviewedAt} /></label>
              </div>
              <div className="admin-information-article-disclaimer"><div><strong>의료 정보 안내문 활성화</strong><Switch checked={disclaimerEnabled} label="의료 정보 안내문 활성화" onChange={() => setDisclaimerEnabled((current) => !current)} /></div><p>본 칼럼은 일반적인 건강 정보를 제공하기 위해 작성되었으며, 전문적인 치료나 임상적 진단을 대체할 수 없습니다. 개별 증상에 대한 처방 및 치료 결정은 반드시 담당 전문 의료진과의 상담을 거쳐야 합니다.</p></div>
            </> : null}
          </section>

          <footer className="admin-information-article-actions"><button disabled={saving} onClick={resetToNewArticle} type="button">취소</button><div><button disabled={saving} onClick={() => void save("draft")} type="button">{saving ? "저장 중" : "임시저장"}</button><button disabled={saving} type="submit">{saving ? "처리 중" : "발행하기"}</button></div></footer>
        </div>

        <aside className="admin-information-article-preview" aria-label="실시간 미리보기">
          <header><span><Image alt="" aria-hidden height={24} src="/dentalpedia/article-preview.svg" width={24} /><strong>실시간 미리보기</strong></span><em>{articleId ? "저장된 칼럼" : "미발행 미리보기"}</em></header>
          <div className="admin-information-article-preview-tabs" role="tablist"><button aria-selected={previewMode === "home"} className={previewMode === "home" ? "is-active" : undefined} onClick={() => setPreviewMode("home")} role="tab" type="button">홈 카드</button><button aria-selected={previewMode === "detail"} className={previewMode === "detail" ? "is-active" : undefined} onClick={() => setPreviewMode("detail")} role="tab" type="button">상세 페이지</button></div>
          <p className="admin-information-article-preview-status"><span aria-hidden />입력 내용이 실시간으로 자동 반영됩니다.</p>
          {previewMode === "home" ? (
            <div className="admin-information-article-home-preview"><header><strong>치카픽 추천 칼럼</strong><span>전체보기 &gt;</span></header><div className="admin-information-article-preview-list"><article className="is-current"><div className="admin-information-article-preview-main-image"><ArticleImage alt={title || "칼럼 대표 이미지"} fallback="/dentalpedia/article-home-card.png" src={visibleCoverUrl} /></div><div><p className="admin-information-article-preview-badges"><span>{categoryLabel}</span>{recommended ? <em>추천</em> : null}</p><h3>{title || "칼럼 제목"}</h3><p>{summary || "홈 카드에 표시될 요약을 입력하세요."}</p><time>{formatDentalpediaDate(publishMode === "scheduled" ? localDateTimeToIso(publishAt) : new Date().toISOString())}</time></div></article></div><p className="admin-information-article-preview-order">{homeVisible ? `홈 노출 순서 ${homeOrder || "-"}번으로 표시됩니다.` : "홈에 노출되지 않습니다."}</p></div>
          ) : (
            <article className="admin-information-article-detail-preview"><div><ArticleImage alt={title || "칼럼 대표 이미지"} fallback="/dentalpedia/article-home-card.png" src={visibleCoverUrl} /></div><span>{categoryLabel}</span><h3>{title || "칼럼 제목"}</h3><p>{summary || "칼럼 내용을 입력하세요."}</p><div className="admin-information-article-markdown"><ReactMarkdown components={{ img: ({ alt, src }) => <span className="admin-information-article-markdown-image"><Image alt={alt ?? "본문 이미지"} fill sizes="420px" src={String(src)} unoptimized /></span> }} remarkPlugins={[remarkGfm]}>{previewBody}</ReactMarkdown></div>{disclaimerEnabled ? <small className="admin-information-article-preview-disclaimer">본 칼럼은 일반적인 건강 정보이며 전문적인 진단이나 치료를 대체하지 않습니다.</small> : null}</article>
          )}
          <button className="admin-information-article-miniature" onClick={() => setPreviewMode("detail")} type="button"><span><Image alt="상세 페이지 구성 미니어처" fill sizes="40px" src="/dentalpedia/article-detail-miniature.png" /></span><span><strong>상세 페이지 미니어처 보기</strong><small>상단 히어로 배너 및 전체 구성 확인</small></span><Image alt="" aria-hidden height={24} src="/dentalpedia/article-chevron-right.svg" width={24} /></button>
        </aside>
      </div>
    </form>
  );
}

function Switch({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return <button aria-checked={checked} aria-label={label} className="admin-information-article-switch" onClick={onChange} role="switch" type="button"><span /></button>;
}

function ArticleImage({ alt, fallback, src }: { alt: string; fallback: string; src: string | null }) {
  return <Image alt={alt} fill sizes="(max-width: 980px) 100vw, 420px" src={src ?? fallback} unoptimized={Boolean(src)} />;
}

function localImageUrl(token: string) {
  return `dentalpedia-local://${token}`;
}

function safeMarkdownAlt(value: string) {
  return value.replace(/[\[\]]/g, "");
}

function markdownImageUrls(markdown: string) {
  return [...markdown.matchAll(/!\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)].map((match) => match[1]);
}

function localDateTimeToIso(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
