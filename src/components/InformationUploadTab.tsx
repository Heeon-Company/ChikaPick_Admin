"use client";

import Image from "next/image";
import { useState } from "react";
import type { DragEvent, FormEvent } from "react";

import { AdminSelect } from "@/components/AdminSelect";

type InformationType = "video" | "article";
type InformationCategory = "" | "implant" | "orthodontics" | "cavity" | "root-canal" | "children" | "other";

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
      <div className="admin-information-upload-card">
        <div
          className="admin-information-upload-tabs"
          aria-label="업로드 정보 유형"
          role="tablist"
        >
          <button
            aria-controls="information-upload-form"
            aria-selected={isVideo}
            className={isVideo ? "is-active" : undefined}
            onClick={() => setInformationType("video")}
            role="tab"
            type="button"
          >
            영상
          </button>
          <button
            aria-controls="information-upload-form"
            aria-selected={!isVideo}
            className={!isVideo ? "is-active" : undefined}
            onClick={() => setInformationType("article")}
            role="tab"
            type="button"
          >
            칼럼/게시글
          </button>
        </div>

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
            <span>{isVideo ? "영상 URL" : "원문 URL"}</span>
            <input
              onChange={(event) => setUrl(event.target.value)}
              placeholder={
                isVideo
                  ? "예) https://www.youtube.com/watch?v=..."
                  : "예) https://..."
              }
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
      </div>
    </section>
  );
}
