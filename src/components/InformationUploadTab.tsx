"use client";

import Image from "next/image";
import { useState } from "react";
import type { DragEvent, FormEvent } from "react";

import { AdminSelect } from "@/components/AdminSelect";

type InformationType = "video" | "article";
type InformationCategory =
  | ""
  | "implant"
  | "orthodontics"
  | "cavity"
  | "root-canal"
  | "children"
  | "other";
type ArticleCategory =
  | "treatment-guide"
  | "oral-care"
  | "cost-guide"
  | "dental-news";
type ArticleAuthor = "operator" | "content-manager";
type PreviewMode = "home" | "detail";
type PublishMode = "immediate" | "scheduled";

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

const articleCategories: ReadonlyArray<{
  label: string;
  value: ArticleCategory;
}> = [
  { value: "treatment-guide", label: "치료 가이드" },
  { value: "oral-care", label: "구강 관리" },
  { value: "cost-guide", label: "치료 비용 가이드" },
  { value: "dental-news", label: "치과 소식" },
];

const articleAuthors: ReadonlyArray<{
  label: string;
  value: ArticleAuthor;
}> = [
  { value: "operator", label: "운영 관리자" },
  { value: "content-manager", label: "콘텐츠 관리자" },
];

const articleTags = ["#임플란트", "#치과상담", "#치료가이드"] as const;
const initialArticleTitle = "임플란트 상담 전 꼭 확인해야 할 5가지";
const initialArticleSummary =
  "치료 전 상담에서 비용, 재료, 보증, 사후관리 기준을 확인하는 방법을 정리했습니다.";

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

type PresentationSwitchProps = {
  checked: boolean;
  label: string;
  onChange: () => void;
};

function PresentationSwitch({
  checked,
  label,
  onChange,
}: PresentationSwitchProps) {
  return (
    <button
      aria-checked={checked}
      aria-label={label}
      className="admin-information-article-switch"
      onClick={onChange}
      role="switch"
      type="button"
    >
      <span />
    </button>
  );
}

type ArticleEditorProps = {
  informationType: InformationType;
  onInformationTypeChange: (type: InformationType) => void;
};

function ArticleEditor({
  informationType,
  onInformationTypeChange,
}: ArticleEditorProps) {
  const [title, setTitle] = useState(initialArticleTitle);
  const [category, setCategory] =
    useState<ArticleCategory>("treatment-guide");
  const [slug, setSlug] = useState("implant-consulting-checklist");
  const [summary, setSummary] = useState(initialArticleSummary);
  const [homeVisible, setHomeVisible] = useState(true);
  const [recommended, setRecommended] = useState(true);
  const [homeOrder, setHomeOrder] = useState("2");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("home");
  const [publishMode, setPublishMode] =
    useState<PublishMode>("immediate");
  const [author, setAuthor] = useState<ArticleAuthor>("operator");
  const [disclaimerEnabled, setDisclaimerEnabled] = useState(true);
  const [publishingExpanded, setPublishingExpanded] = useState(true);
  const [coverName, setCoverName] = useState("");

  function submitPresentationOnlyForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <form
      className="admin-information-article"
      id="information-upload-form"
      onSubmit={submitPresentationOnlyForm}
      role="tabpanel"
    >
      <div className="admin-information-article-layout">
        <div className="admin-information-article-editor">
          <InformationTypeTabs
            informationType={informationType}
            onChange={onInformationTypeChange}
          />

          <section className="admin-information-article-card">
            <h2>기본 정보</h2>

            <label className="admin-information-article-field">
              <span className="admin-information-article-field-heading">
                <strong>칼럼 제목 *</strong>
                <small>
                  {title === initialArticleTitle ? 25 : title.length} / 60
                </small>
              </span>
              <input
                className="is-emphasized"
                maxLength={60}
                onChange={(event) => setTitle(event.target.value)}
                type="text"
                value={title}
              />
            </label>

            <div className="admin-information-article-basic-grid">
              <div className="admin-information-article-field">
                <strong>카테고리 *</strong>
                <AdminSelect
                  className="admin-information-article-select"
                  label="칼럼 카테고리"
                  onChange={setCategory}
                  options={articleCategories}
                  value={category}
                />
              </div>

              <div className="admin-information-article-field">
                <strong>태그</strong>
                <div className="admin-information-article-tags">
                  {articleTags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                  <button type="button">+ 태그 추가</button>
                </div>
              </div>
            </div>

            <label className="admin-information-article-field">
              <strong>페이지 주소(URL) *</strong>
              <span className="admin-information-article-slug">
                <span>chikapick.com/column/</span>
                <input
                  aria-label="페이지 주소"
                  onChange={(event) => setSlug(event.target.value)}
                  type="text"
                  value={slug}
                />
              </span>
            </label>
          </section>

          <section className="admin-information-article-card">
            <header className="admin-information-article-section-heading">
              <h2>홈 노출 정보</h2>
              <p>홈 칼럼 카드에 표시될 정보를 입력하세요.</p>
            </header>

            <div className="admin-information-article-field">
              <strong>대표 이미지 *</strong>
              <div className="admin-information-article-cover-field">
                <div className="admin-information-article-cover-image">
                  <Image
                    alt="치과 의료진과 상담하는 환자"
                    fill
                    sizes="120px"
                    src="/dentalpedia/article-consultation-cover.png"
                  />
                </div>
                <div className="admin-information-article-cover-controls">
                  <div>
                    <label>
                      이미지 변경
                      <input
                        accept="image/jpeg,image/png,image/webp"
                        aria-label="대표 이미지 변경"
                        onChange={(event) =>
                          setCoverName(event.currentTarget.files?.[0]?.name ?? "")
                        }
                        type="file"
                      />
                    </label>
                    <button aria-label="대표 이미지 삭제" type="button">
                      <Image
                        alt=""
                        aria-hidden="true"
                        height={24}
                        src="/dentalpedia/article-delete.svg"
                        width={24}
                      />
                    </button>
                  </div>
                  <small>
                    {coverName || "권장 1200 × 630px · JPG, PNG, WEBP · 최대 10MB"}
                  </small>
                </div>
              </div>
            </div>

            <label className="admin-information-article-field">
              <span className="admin-information-article-field-heading">
                <strong>홈 카드 요약 *</strong>
                <small>
                  {summary === initialArticleSummary ? 54 : summary.length} / 120
                </small>
              </span>
              <textarea
                maxLength={120}
                onChange={(event) => setSummary(event.target.value)}
                value={summary}
              />
            </label>

            <div className="admin-information-article-home-settings">
              <div>
                <PresentationSwitch
                  checked={homeVisible}
                  label="홈에 노출"
                  onChange={() => setHomeVisible((current) => !current)}
                />
                <strong>홈에 노출</strong>
              </div>
              <div>
                <PresentationSwitch
                  checked={recommended}
                  label="추천 칼럼으로 표시"
                  onChange={() => setRecommended((current) => !current)}
                />
                <strong>추천 칼럼으로 표시</strong>
              </div>
              <label>
                <strong>홈 노출 순서</strong>
                <input
                  aria-label="홈 노출 순서"
                  min="1"
                  onChange={(event) => setHomeOrder(event.target.value)}
                  type="number"
                  value={homeOrder}
                />
                <small>숫자가 작을수록 먼저 노출됩니다.</small>
              </label>
            </div>
          </section>

          <section className="admin-information-article-card admin-information-article-body-card">
            <h2>본문 내용</h2>
            <div
              aria-label="본문 편집 도구"
              className="admin-information-article-toolbar"
              role="toolbar"
            >
              <button className="is-paragraph" type="button">
                본문(Paragraph)
                <Image
                  alt=""
                  aria-hidden="true"
                  height={24}
                  src="/dentalpedia/article-chevron-down.svg"
                  width={24}
                />
              </button>
              <span aria-hidden="true" />
              <button aria-label="굵게" className="is-bold" type="button">
                B
              </button>
              <button aria-label="기울임" className="is-italic" type="button">
                I
              </button>
              <button aria-label="밑줄" className="is-underline" type="button">
                U
              </button>
              <span aria-hidden="true" />
              <button type="button">H2</button>
              <button type="button">H3</button>
              <span aria-hidden="true" />
              <button aria-label="목록" type="button">
                <Image
                  alt=""
                  aria-hidden="true"
                  height={24}
                  src="/dentalpedia/article-list.svg"
                  width={24}
                />
              </button>
              <button aria-label="실행 취소" type="button">
                <Image
                  alt=""
                  aria-hidden="true"
                  height={24}
                  src="/dentalpedia/article-back.svg"
                  width={24}
                />
              </button>
              <button aria-label="이미지 삽입" type="button">
                <Image
                  alt=""
                  aria-hidden="true"
                  height={24}
                  src="/dentalpedia/article-camera.svg"
                  width={24}
                />
              </button>
            </div>

            <div className="admin-information-article-content" role="textbox">
              <h3>왜 상담 전 확인이 필요할까요?</h3>
              <p>
                임플란트 치료는 개인의 구강 상태와 치료 계획에 따라 비용과
                기간이 달라질 수 있습니다.
              </p>
              <h3>상담에서 확인할 5가지</h3>
              <ol>
                <li>내 상태에 맞는 치료 계획</li>
                <li>사용할 재료와 제조사</li>
                <li>총 치료비와 추가 비용</li>
                <li>보증 및 사후관리 기준</li>
                <li>치료 기간과 내원 횟수</li>
              </ol>
              <figure>
                <div>
                  <Image
                    alt="치아 모형을 보며 치료 계획을 설명하는 모습"
                    fill
                    sizes="(max-width: 980px) 100vw, 60vw"
                    src="/dentalpedia/article-implant-model.png"
                  />
                </div>
                <figcaption>
                  치료 계획은 개인의 구강 상태에 따라 달라질 수 있습니다.
                </figcaption>
              </figure>
              <blockquote>
                “정확한 치료 계획은 의료진의 대면 진료와 상담 후 결정됩니다.”
              </blockquote>
            </div>
            <p className="admin-information-article-saved">
              <span aria-hidden="true" />
              방금 저장됨
            </p>
          </section>

          <section className="admin-information-article-card admin-information-article-publishing">
            <header>
              <h2>발행 설정</h2>
              <button
                aria-expanded={publishingExpanded}
                aria-label={publishingExpanded ? "발행 설정 접기" : "발행 설정 펼치기"}
                onClick={() => setPublishingExpanded((current) => !current)}
                type="button"
              >
                <Image
                  alt=""
                  aria-hidden="true"
                  height={24}
                  src={
                    publishingExpanded
                      ? "/dentalpedia/article-chevron-up.svg"
                      : "/dentalpedia/article-chevron-down.svg"
                  }
                  width={24}
                />
              </button>
            </header>

            {publishingExpanded ? (
              <>
                <div className="admin-information-article-publish-options">
                  <label>
                    <input
                      checked={publishMode === "immediate"}
                      name="article-publish-mode"
                      onChange={() => setPublishMode("immediate")}
                      type="radio"
                    />
                    즉시 발행
                  </label>
                  <label>
                    <input
                      checked={publishMode === "scheduled"}
                      name="article-publish-mode"
                      onChange={() => setPublishMode("scheduled")}
                      type="radio"
                    />
                    예약 발행
                  </label>
                </div>

                <div className="admin-information-article-publish-grid">
                  <label className="admin-information-article-field">
                    <strong>발행일</strong>
                    <input defaultValue="2026. 09. 05. 10:00" type="text" />
                  </label>
                  <div className="admin-information-article-field">
                    <strong>작성자</strong>
                    <AdminSelect
                      className="admin-information-article-select"
                      label="작성자"
                      onChange={setAuthor}
                      options={articleAuthors}
                      value={author}
                    />
                  </div>
                  <label className="admin-information-article-field">
                    <strong>최종 검토일</strong>
                    <input defaultValue="2026. 09. 04." type="text" />
                  </label>
                </div>

                <div className="admin-information-article-disclaimer">
                  <div>
                    <strong>의료 정보 안내문 활성화</strong>
                    <PresentationSwitch
                      checked={disclaimerEnabled}
                      label="의료 정보 안내문 활성화"
                      onChange={() =>
                        setDisclaimerEnabled((current) => !current)
                      }
                    />
                  </div>
                  <p>
                    본 칼럼은 일반적인 건강 정보를 제공하기 위해 작성되었으며,
                    전문적인 치료나 임상적 진단을 대체할 수 없습니다. 개별
                    증상에 대한 처방 및 치료 결정은 반드시 담당 전문 의료진과의
                    상담을 거쳐야 합니다.
                  </p>
                </div>
              </>
            ) : null}
          </section>

          <footer className="admin-information-article-actions">
            <button type="button">취소</button>
            <div>
              <button type="button">임시저장</button>
              <button type="submit">발행하기</button>
            </div>
          </footer>
        </div>

        <aside className="admin-information-article-preview" aria-label="실시간 미리보기">
          <header>
            <span>
              <Image
                alt=""
                aria-hidden="true"
                height={24}
                src="/dentalpedia/article-preview.svg"
                width={24}
              />
              <strong>실시간 미리보기</strong>
            </span>
            <em>미발행 미리보기</em>
          </header>

          <div className="admin-information-article-preview-tabs" role="tablist">
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

          <p className="admin-information-article-preview-status">
            <span aria-hidden="true" />
            입력 내용이 실시간으로 자동 반영됩니다.
          </p>

          {previewMode === "home" ? (
            <div className="admin-information-article-home-preview">
              <header>
                <strong>치카픽 추천 칼럼</strong>
                <span>전체보기 &gt;</span>
              </header>
              <div className="admin-information-article-preview-list">
                <article className="is-current">
                  <div className="admin-information-article-preview-main-image">
                    <Image
                      alt="치과 의료진과 상담하는 환자"
                      fill
                      sizes="420px"
                      src="/dentalpedia/article-home-card.png"
                    />
                  </div>
                  <div>
                    <p className="admin-information-article-preview-badges">
                      <span>치료 가이드</span>
                      {recommended ? <em>추천</em> : null}
                    </p>
                    <h3>{title || "칼럼 제목"}</h3>
                    <p>{summary || "홈 카드에 표시될 요약을 입력하세요."}</p>
                    <time dateTime="2026-09-05">2026.09.05</time>
                  </div>
                </article>

                <article className="is-secondary">
                  <div>
                    <Image
                      alt="치과 진료 기구"
                      fill
                      sizes="80px"
                      src="/dentalpedia/article-brushing-guide.png"
                    />
                  </div>
                  <span>
                    <strong>올바른 칫솔질과 치실 사용 가이드</strong>
                    <small>매일 하는 치아 관리의 핵심 습관들</small>
                  </span>
                </article>
              </div>
              <p className="admin-information-article-preview-order">
                {homeVisible
                  ? `홈 노출 순서 ${homeOrder || "-"}번으로 표시됩니다.`
                  : "홈에 노출되지 않습니다."}
              </p>
            </div>
          ) : (
            <article className="admin-information-article-detail-preview">
              <div>
                <Image
                  alt="치과 의료진과 상담하는 환자"
                  fill
                  sizes="420px"
                  src="/dentalpedia/article-home-card.png"
                />
              </div>
              <span>치료 가이드</span>
              <h3>{title || "칼럼 제목"}</h3>
              <p>{summary || "칼럼 내용을 입력하세요."}</p>
              <h4>왜 상담 전 확인이 필요할까요?</h4>
              <p>
                임플란트 치료는 개인의 구강 상태와 치료 계획에 따라 비용과
                기간이 달라질 수 있습니다.
              </p>
            </article>
          )}

          <button
            className="admin-information-article-miniature"
            onClick={() => setPreviewMode("detail")}
            type="button"
          >
            <span>
              <Image
                alt="상세 페이지 구성 미니어처"
                fill
                sizes="40px"
                src="/dentalpedia/article-detail-miniature.png"
              />
            </span>
            <span>
              <strong>상세 페이지 미니어처 보기</strong>
              <small>상단 히어로 배너 및 전체 구성 확인</small>
            </span>
            <Image
              alt=""
              aria-hidden="true"
              height={24}
              src="/dentalpedia/article-chevron-right.svg"
              width={24}
            />
          </button>
        </aside>
      </div>
    </form>
  );
}

export function InformationUploadTab() {
  const [informationType, setInformationType] =
    useState<InformationType>("video");
  const [thumbnailName, setThumbnailName] = useState("");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<InformationCategory>("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [isVisible, setIsVisible] = useState(true);

  function selectThumbnail(file: File | null) {
    setThumbnailName(file?.name ?? "");
  }

  function handleThumbnailDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    selectThumbnail(event.dataTransfer.files[0] ?? null);
  }

  function submitPresentationOnlyForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  const isVideo = informationType === "video";

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
              onSubmit={submitPresentationOnlyForm}
              role="tabpanel"
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
                    onChange={(event) =>
                      selectThumbnail(event.currentTarget.files?.[0] ?? null)
                    }
                    type="file"
                  />
                  <Image
                    aria-hidden="true"
                    src="/Type=UploadCloud.svg"
                    alt=""
                    width={24}
                    height={24}
                  />
                  <strong>
                    {thumbnailName || "이미지를 드래그하거나 클릭하여 업로드"}
                  </strong>
                  <small>JPG, PNG (최대 10MB)</small>
                </label>
              </div>

              <label className="admin-information-upload-field">
                <span>영상 URL</span>
                <input
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="예) https://www.youtube.com/watch?v=..."
                  type="url"
                  value={url}
                />
              </label>

              <label className="admin-information-upload-field">
                <span>제목</span>
                <input
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="제목을 입력하세요"
                  type="text"
                  value={title}
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
                />
              </div>

              <label className="admin-information-upload-field">
                <span>간단한 설명</span>
                <textarea
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="내용을 입력하세요"
                  value={description}
                />
              </label>

              <label className="admin-information-upload-field">
                <span>태그</span>
                <input
                  onChange={(event) => setTags(event.target.value)}
                  placeholder="태그를 입력하세요 (쉼표로 구분)"
                  type="text"
                  value={tags}
                />
              </label>

              <div className="admin-information-upload-visibility">
                <span>
                  <strong>공개 설정</strong>
                  <small>게시 후 바로 노출됩니다.</small>
                </span>
                <button
                  aria-checked={isVisible}
                  aria-label="공개 설정"
                  className={isVisible ? "is-active" : undefined}
                  onClick={() => setIsVisible((current) => !current)}
                  role="switch"
                  type="button"
                >
                  <span />
                </button>
              </div>

              <div className="admin-information-upload-actions">
                <button type="button">임시저장</button>
                <button type="submit">게시하기</button>
              </div>
            </form>
          </>
        ) : (
          <ArticleEditor
            informationType={informationType}
            onInformationTypeChange={setInformationType}
          />
        )}
      </div>
    </section>
  );
}
