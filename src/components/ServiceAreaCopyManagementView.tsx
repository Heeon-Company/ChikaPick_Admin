"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import {
  fetchAdminServiceAreaConfig,
  updateAdminServiceAreaConfig,
} from "@/lib/admin-api";
import {
  parseServiceAreaDistricts,
  type AdminServiceAreaConfig,
} from "@/lib/service-expansion-requests";

type ProvinceDraft = {
  sido: string;
  sidoLabel: string;
  districts: string;
};

type ConfigDraft = {
  header: string;
  content: string;
  buttonInfo: string;
  buttonText: string;
  area: ProvinceDraft[];
};

export function ServiceAreaCopyManagementView({
  accessToken,
}: {
  accessToken: string;
}) {
  const [savedDraft, setSavedDraft] = useState<ConfigDraft | null>(null);
  const [draft, setDraft] = useState<ConfigDraft | null>(null);
  const [selectedProvinceIndex, setSelectedProvinceIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const loadConfig = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError("");
    setFeedback("");
    try {
      const payload = await fetchAdminServiceAreaConfig(accessToken);
      const nextDraft = configToDraft(payload.config);
      setSavedDraft(nextDraft);
      setDraft(nextDraft);
      setSelectedProvinceIndex(0);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "앱 문구 설정을 불러오지 못했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadConfig(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadConfig]);

  const isDirty = useMemo(
    () =>
      Boolean(
        draft && savedDraft && JSON.stringify(draft) !== JSON.stringify(savedDraft),
      ),
    [draft, savedDraft],
  );

  async function saveConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || isSaving || !isDirty) return;
    setIsSaving(true);
    setError("");
    setFeedback("");
    try {
      const payload = await updateAdminServiceAreaConfig(
        accessToken,
        draftToConfig(draft),
      );
      const nextDraft = configToDraft(payload.config);
      setSavedDraft(nextDraft);
      setDraft(nextDraft);
      setFeedback(payload.message);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "앱 문구와 서비스 지역을 저장하지 못했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function cancelChanges() {
    if (!savedDraft || isSaving) return;
    setDraft(cloneDraft(savedDraft));
    setSelectedProvinceIndex(0);
    setError("");
    setFeedback("저장하지 않은 변경사항을 취소했습니다.");
  }

  function updateCopyField(
    field: "header" | "content" | "buttonInfo" | "buttonText",
    value: string,
  ) {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
    setFeedback("");
  }

  function updateProvince(
    index: number,
    field: keyof ProvinceDraft,
    value: string,
  ) {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        area: current.area.map((province, provinceIndex) =>
          provinceIndex === index ? { ...province, [field]: value } : province,
        ),
      };
    });
    setFeedback("");
  }

  function addProvince() {
    setDraft((current) =>
      current
        ? {
            ...current,
            area: [
              ...current.area,
              { sido: "", sidoLabel: "", districts: "" },
            ],
          }
        : current,
    );
    setSelectedProvinceIndex(draft?.area.length ?? 0);
    setFeedback("");
  }

  function removeProvince(index: number) {
    setDraft((current) => {
      if (!current || current.area.length <= 1) return current;
      return {
        ...current,
        area: current.area.filter((_, provinceIndex) => provinceIndex !== index),
      };
    });
    setFeedback("");
  }

  if (isLoading && !draft) {
    return (
      <section className="admin-service-copy-state" aria-busy="true">
        앱 문구 설정을 불러오는 중입니다.
      </section>
    );
  }

  if (!draft) {
    return (
      <section className="admin-service-copy-state admin-service-copy-state--error">
        <p>{error || "앱 문구 설정을 불러오지 못했습니다."}</p>
        <button type="button" onClick={() => void loadConfig()}>다시 시도</button>
      </section>
    );
  }

  const safeSelectedProvinceIndex = Math.max(
    0,
    Math.min(selectedProvinceIndex, draft.area.length - 1),
  );

  return (
    <div className="admin-service-copy-layout">
      <form className="admin-service-copy-editor" onSubmit={saveConfig}>
        <header>
          <div>
            <h2>앱 문구 및 서비스 지역</h2>
            <p>입력한 내용은 저장 후 서비스지역 화면에 바로 반영됩니다.</p>
          </div>
        </header>

        <CopyField
          id="service-area-header-copy"
          label="화면 메인 제목"
          description="줄바꿈을 포함해 앱 화면 상단에 표시됩니다."
          maxLength={200}
          rows={2}
          value={draft.header}
          onChange={(value) => updateCopyField("header", value)}
        />
        <CopyField
          id="service-area-content-copy"
          label="서비스 지역 안내 문구"
          description="예약 가능 지역과 다른 기능의 이용 범위를 안내합니다."
          maxLength={2000}
          rows={7}
          value={draft.content}
          onChange={(value) => updateCopyField("content", value)}
        />

        <section className="admin-service-copy-field admin-service-copy-area-editor">
          <div className="admin-service-copy-field-heading">
            <div>
              <label>예약 가능 지역 목록</label>
              <p>시/도 순서와 쉼표 또는 줄바꿈으로 구분한 세부 지역 순서가 앱에 유지됩니다.</p>
            </div>
            <button type="button" onClick={addProvince}>시/도 추가</button>
          </div>
          <div className="admin-service-copy-provinces">
            {draft.area.map((province, index) => (
              <article key={index}>
                <header>
                  <strong>시/도 {index + 1}</strong>
                  <button
                    type="button"
                    disabled={draft.area.length <= 1}
                    onClick={() => removeProvince(index)}
                  >
                    삭제
                  </button>
                </header>
                <div className="admin-service-copy-province-names">
                  <label>
                    <span>시/도 기준명</span>
                    <input
                      value={province.sido}
                      maxLength={100}
                      placeholder="예: 서울특별시"
                      onChange={(event) =>
                        updateProvince(index, "sido", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    <span>앱 표시명</span>
                    <input
                      value={province.sidoLabel}
                      maxLength={40}
                      placeholder="예: 서울"
                      onChange={(event) =>
                        updateProvince(index, "sidoLabel", event.target.value)
                      }
                    />
                  </label>
                </div>
                <label>
                  <span>세부 지역</span>
                  <textarea
                    value={province.districts}
                    rows={3}
                    placeholder="예: 강남구, 중랑구"
                    onChange={(event) =>
                      updateProvince(index, "districts", event.target.value)
                    }
                  />
                </label>
              </article>
            ))}
          </div>
        </section>

        <CopyField
          id="service-area-button-info-copy"
          label="서비스 확대 요청 안내"
          description="지역 목록 아래 요청 카드에 표시됩니다."
          maxLength={500}
          rows={4}
          value={draft.buttonInfo}
          onChange={(value) => updateCopyField("buttonInfo", value)}
        />
        <CopyField
          id="service-area-button-text-copy"
          label="요청 버튼 문구"
          maxLength={80}
          value={draft.buttonText}
          onChange={(value) => updateCopyField("buttonText", value)}
        />

        {error ? <p className="admin-service-copy-error" role="alert">{error}</p> : null}
        {feedback ? <p className="admin-service-copy-feedback" role="status">{feedback}</p> : null}
        <footer>
          <button
            type="button"
            disabled={!isDirty || isSaving}
            onClick={cancelChanges}
          >
            취소
          </button>
          <button type="submit" disabled={!isDirty || isSaving}>
            {isSaving ? "저장 중" : "저장"}
          </button>
        </footer>
      </form>

      <ServiceAreaSimulator
        draft={draft}
        selectedProvinceIndex={safeSelectedProvinceIndex}
        onSelectProvince={setSelectedProvinceIndex}
      />
    </div>
  );
}

function CopyField({
  description,
  id,
  label,
  maxLength,
  onChange,
  rows,
  value,
}: {
  description?: string;
  id: string;
  label: string;
  maxLength: number;
  onChange: (value: string) => void;
  rows?: number;
  value: string;
}) {
  return (
    <label className="admin-service-copy-field" htmlFor={id}>
      <div className="admin-service-copy-field-heading">
        <div>
          <span>{label}</span>
          {description ? <p>{description}</p> : null}
        </div>
        <small>{value.length.toLocaleString("ko-KR")} / {maxLength.toLocaleString("ko-KR")}</small>
      </div>
      {rows ? (
        <textarea
          id={id}
          maxLength={maxLength}
          rows={rows}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          id={id}
          maxLength={maxLength}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
}

function ServiceAreaSimulator({
  draft,
  onSelectProvince,
  selectedProvinceIndex,
}: {
  draft: ConfigDraft;
  onSelectProvince: (index: number) => void;
  selectedProvinceIndex: number;
}) {
  const provinces = draft.area.map((province) => ({
    ...province,
    sigungu: parseServiceAreaDistricts(province.districts),
  }));
  const selectedProvince = provinces[selectedProvinceIndex] ?? provinces[0];

  return (
    <aside className="admin-service-copy-preview">
      <header>
        <h2>앱 화면 미리보기</h2>
        <p>서비스지역 화면 · 393px 기준</p>
      </header>
      <div className="admin-service-copy-phone">
        <div className="admin-service-copy-phone-screen">
          <header className="admin-service-copy-app-header">
            <span aria-hidden="true">‹</span>
            <strong>서비스지역</strong>
          </header>
          <div className="admin-service-copy-app-scroll">
            <section className="admin-service-copy-app-intro">
              <h3>{draft.header || "화면 메인 제목"}</h3>
              <p>{draft.content || "서비스 지역 안내 문구"}</p>
            </section>

            <div className={`admin-service-copy-app-tabs${provinces.length === 1 ? " is-single" : ""}`}>
              {provinces.map((province, index) => (
                <button
                  type="button"
                  key={`${province.sido}:${index}`}
                  className={index === selectedProvinceIndex ? "is-active" : undefined}
                  onClick={() => onSelectProvince(index)}
                >
                  {province.sidoLabel || `시/도 ${index + 1}`}
                </button>
              ))}
            </div>

            <div className="admin-service-copy-app-cards">
              {(selectedProvince?.sigungu.length
                ? selectedProvince.sigungu
                : ["세부 지역을 입력해 주세요"]
              ).map((district, index, districts) => (
                <article className="admin-service-copy-app-region" key={`${district}:${index}`}>
                  <strong>{district}</strong>
                  <span>서비스 가능</span>
                  {districts.length > 1 && index === districts.length - 1 ? (
                    <i aria-hidden="true">›</i>
                  ) : null}
                </article>
              ))}
              <article className="admin-service-copy-app-request">
                <p>{draft.buttonInfo || "서비스 확대 요청 안내"}</p>
                <button type="button" tabIndex={-1}>
                  {draft.buttonText || "요청 버튼 문구"}
                </button>
              </article>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function configToDraft(config: AdminServiceAreaConfig): ConfigDraft {
  return {
    header: config.header,
    content: config.content,
    buttonInfo: config.buttonInfo,
    buttonText: config.buttonText,
    area: config.area.map((province) => ({
      sido: province.sido,
      sidoLabel: province.sidoLabel,
      districts: province.sigungu.join(", "),
    })),
  };
}

function draftToConfig(draft: ConfigDraft): AdminServiceAreaConfig {
  return {
    header: draft.header,
    content: draft.content,
    buttonInfo: draft.buttonInfo,
    buttonText: draft.buttonText,
    area: draft.area.map((province) => ({
      sido: province.sido,
      sidoLabel: province.sidoLabel,
      sigungu: parseServiceAreaDistricts(province.districts),
    })),
  };
}

function cloneDraft(draft: ConfigDraft): ConfigDraft {
  return {
    ...draft,
    area: draft.area.map((province) => ({ ...province })),
  };
}
