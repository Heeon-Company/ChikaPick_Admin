"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Image from "next/image";

import { ServiceAreaCopyManagementView } from "@/components/ServiceAreaCopyManagementView";
import {
  fetchAdminClinicPartnershipRequests,
  fetchAdminServiceExpansionRequests,
} from "@/lib/admin-api";
import type {
  ClinicPartnershipRequestItem,
  ClinicPartnershipRequestPayload,
} from "@/lib/clinic-partnership-requests";
import {
  formatServiceExpansionDate,
  serviceExpansionPageNumbers,
  type ServiceExpansionOverviewPayload,
} from "@/lib/service-expansion-requests";

type RequestView = "area" | "clinic" | "copy";

export function ServiceExpansionRequestsTab({ accessToken }: { accessToken: string }) {
  const [activeView, setActiveView] = useState<RequestView>("area");
  const [overview, setOverview] = useState<ServiceExpansionOverviewPayload | null>(null);
  const [clinicData, setClinicData] = useState<ClinicPartnershipRequestPayload | null>(null);
  const [areaDraftQuery, setAreaDraftQuery] = useState("");
  const [areaQuery, setAreaQuery] = useState("");
  const [areaPage, setAreaPage] = useState(1);
  const [clinicDraftQuery, setClinicDraftQuery] = useState("");
  const [clinicQuery, setClinicQuery] = useState("");
  const [clinicPage, setClinicPage] = useState(1);
  const [selectedClinic, setSelectedClinic] =
    useState<ClinicPartnershipRequestItem | null>(null);
  const [isOverviewLoading, setIsOverviewLoading] = useState(true);
  const [isClinicLoading, setIsClinicLoading] = useState(false);
  const [areaError, setAreaError] = useState("");
  const [clinicError, setClinicError] = useState("");

  const loadOverview = useCallback(async () => {
    if (!accessToken) return;
    setIsOverviewLoading(true);
    setAreaError("");
    try {
      setOverview(
        await fetchAdminServiceExpansionRequests(accessToken, areaQuery, areaPage),
      );
    } catch (error) {
      setAreaError(
        error instanceof Error
          ? error.message
          : "지역 서비스 요청을 불러오지 못했습니다.",
      );
    } finally {
      setIsOverviewLoading(false);
    }
  }, [accessToken, areaPage, areaQuery]);

  const loadClinics = useCallback(async () => {
    if (!accessToken) return;
    setIsClinicLoading(true);
    setClinicError("");
    try {
      setClinicData(
        await fetchAdminClinicPartnershipRequests(
          accessToken,
          { query: clinicQuery, status: "all" },
          clinicPage,
        ),
      );
    } catch (error) {
      setClinicError(
        error instanceof Error
          ? error.message
          : "치과 제휴 요청을 불러오지 못했습니다.",
      );
    } finally {
      setIsClinicLoading(false);
    }
  }, [accessToken, clinicPage, clinicQuery]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadOverview(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadOverview]);

  useEffect(() => {
    if (activeView !== "clinic") return;
    const timeout = window.setTimeout(() => void loadClinics(), 0);
    return () => window.clearTimeout(timeout);
  }, [activeView, loadClinics]);

  useEffect(() => {
    if (!selectedClinic) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedClinic(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedClinic]);

  const metrics = useMemo(() => {
    if (activeView === "area") {
      const area = overview?.metrics.area;
      return [
        { label: "전체 요청", value: area?.totalRequests ?? 0, unit: "건" },
        { label: "최근 30일 요청", value: area?.recent30DayRequests ?? 0, unit: "건" },
        { label: "요청 지역", value: area?.regionCount ?? 0, unit: "개 지역" },
        {
          label: "요청 1위 지역",
          value: area?.topRegion?.sigungu ?? "—",
          suffix: area?.topRegion ? `${area.topRegion.requestCount.toLocaleString("ko-KR")}건` : "",
        },
      ];
    }
    const clinic = overview?.metrics.clinic;
    return [
      { label: "전체 요청", value: clinic?.totalRequests ?? 0, unit: "건" },
      { label: "최근 30일 요청", value: clinic?.recent30DayRequests ?? 0, unit: "건" },
      { label: "요청 치과", value: clinic?.clinicCount ?? 0, unit: "곳" },
      { label: "최다 요청 치과", value: clinic?.topRequestCount ?? 0, unit: "건" },
    ];
  }, [activeView, overview]);

  function submitAreaSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAreaPage(1);
    setAreaQuery(areaDraftQuery.trim());
  }

  function submitClinicSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setClinicPage(1);
    setClinicQuery(clinicDraftQuery.trim());
  }

  const isLoading =
    activeView === "area"
      ? isOverviewLoading
      : activeView === "clinic"
        ? isClinicLoading
        : false;

  return (
    <section className="admin-service-expansion" aria-busy={isLoading}>
      <div className="admin-service-expansion-tabs" role="tablist" aria-label="서비스 확대 요청 유형">
        <RequestTypeTab
          active={activeView === "area"}
          count={overview?.metrics.area.totalRequests ?? 0}
          label="지역 서비스 요청"
          onClick={() => setActiveView("area")}
        />
        <RequestTypeTab
          active={activeView === "clinic"}
          count={overview?.metrics.clinic.totalRequests ?? 0}
          label="치과 제휴 요청"
          onClick={() => setActiveView("clinic")}
        />
        <RequestTypeTab
          active={activeView === "copy"}
          label="앱 문구 관리"
          onClick={() => setActiveView("copy")}
        />
      </div>

      {activeView !== "copy" ? (
        <div className="admin-service-expansion-metrics">
          {metrics.map((metric) => (
            <article key={metric.label}>
              <span>{metric.label}</span>
              <div>
                <strong>{typeof metric.value === "number" ? metric.value.toLocaleString("ko-KR") : metric.value}</strong>
                {metric.unit ? <small>{metric.unit}</small> : null}
                {metric.suffix ? <small>{metric.suffix}</small> : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {activeView === "area" ? (
        <AreaRequestView
          data={overview}
          draftQuery={areaDraftQuery}
          error={areaError}
          isLoading={isOverviewLoading}
          onDraftQueryChange={setAreaDraftQuery}
          onPageChange={setAreaPage}
          onSearch={submitAreaSearch}
        />
      ) : activeView === "clinic" ? (
        <ClinicRequestView
          data={clinicData}
          draftQuery={clinicDraftQuery}
          error={clinicError}
          isLoading={isClinicLoading}
          onDraftQueryChange={setClinicDraftQuery}
          onPageChange={setClinicPage}
          onSearch={submitClinicSearch}
          onSelectClinic={setSelectedClinic}
        />
      ) : (
        <ServiceAreaCopyManagementView accessToken={accessToken} />
      )}

      {selectedClinic ? (
        <ClinicRequesterDialog clinic={selectedClinic} onClose={() => setSelectedClinic(null)} />
      ) : null}
    </section>
  );
}

function RequestTypeTab({
  active,
  count,
  label,
  onClick,
}: {
  active: boolean;
  count?: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={active ? "is-active" : undefined}
      onClick={onClick}
    >
      <span>{label}</span>
      {count !== undefined ? <small>{count.toLocaleString("ko-KR")}</small> : null}
    </button>
  );
}

function SearchBox({
  onChange,
  onSubmit,
  placeholder,
  value,
}: {
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <form className="admin-service-expansion-search" role="search" onSubmit={onSubmit}>
      <span aria-hidden="true" />
      <input
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <button type="submit" className="sr-only">검색</button>
    </form>
  );
}

function AreaRequestView({
  data,
  draftQuery,
  error,
  isLoading,
  onDraftQueryChange,
  onPageChange,
  onSearch,
}: {
  data: ServiceExpansionOverviewPayload | null;
  draftQuery: string;
  error: string;
  isLoading: boolean;
  onDraftQueryChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onSearch: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="admin-service-expansion-area-layout">
      <section className="admin-service-expansion-card admin-service-expansion-list-card">
        <header>
          <h2>요청 목록</h2>
          <SearchBox
            value={draftQuery}
            placeholder="지역 또는 이메일 검색"
            onChange={onDraftQueryChange}
            onSubmit={onSearch}
          />
        </header>
        {error ? <p className="admin-service-expansion-error">{error}</p> : null}
        <div className="admin-service-expansion-table-wrap">
          <table className="admin-service-expansion-area-table">
            <thead><tr><th>접수 일시</th><th>요청 지역</th><th>세부 지역</th><th>사용자 이메일</th></tr></thead>
            <tbody>
              {data?.items.map((item) => (
                <tr key={item.id}>
                  <td><strong>{formatServiceExpansionDate(item.requestedAt)}</strong></td>
                  <td>{item.sido}</td>
                  <td>{item.sigungu}</td>
                  <td>{item.requesterEmail}</td>
                </tr>
              ))}
              {!isLoading && !error && (data?.items.length ?? 0) === 0 ? (
                <tr><td className="admin-service-expansion-empty" colSpan={4}>조건에 맞는 지역 요청이 없습니다.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {isLoading ? <p className="admin-service-expansion-loading">지역 요청을 불러오는 중입니다.</p> : null}
        {data ? <Pagination pagination={data.pagination} onPageChange={onPageChange} label="지역 서비스 요청 목록 페이지" /> : null}
      </section>

      <section className="admin-service-expansion-card admin-service-expansion-summary-card">
        <header><h2>지역별 수요 요약</h2><p>요청이 많은 지역 탑 10</p></header>
        <table>
          <thead><tr><th>순위</th><th>지역</th><th>요청 수</th></tr></thead>
          <tbody>
            {data?.regionSummary.map((item) => (
              <tr key={`${item.sido}:${item.sigungu}`}>
                <td>{item.rank}</td><td>{item.sigungu}</td><td><strong>{item.requestCount.toLocaleString("ko-KR")}</strong>건</td>
              </tr>
            ))}
            {!isLoading && (data?.regionSummary.length ?? 0) === 0 ? (
              <tr><td className="admin-service-expansion-empty" colSpan={3}>집계된 지역이 없습니다.</td></tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function ClinicRequestView({
  data,
  draftQuery,
  error,
  isLoading,
  onDraftQueryChange,
  onPageChange,
  onSearch,
  onSelectClinic,
}: {
  data: ClinicPartnershipRequestPayload | null;
  draftQuery: string;
  error: string;
  isLoading: boolean;
  onDraftQueryChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onSearch: (event: FormEvent<HTMLFormElement>) => void;
  onSelectClinic: (clinic: ClinicPartnershipRequestItem) => void;
}) {
  return (
    <section className="admin-service-expansion-card admin-service-expansion-list-card admin-service-expansion-clinic-card">
      <header>
        <h2>요청 목록</h2>
        <SearchBox
          value={draftQuery}
          placeholder="지역 또는 치과명 검색"
          onChange={onDraftQueryChange}
          onSubmit={onSearch}
        />
      </header>
      {error ? <p className="admin-service-expansion-error">{error}</p> : null}
      <div className="admin-service-expansion-table-wrap">
        <table className="admin-service-expansion-clinic-table">
          <thead><tr><th>치과명</th><th>치과 주소</th><th>전화번호</th><th>요청 수</th><th>상세 보기</th></tr></thead>
          <tbody>
            {data?.items.map((item) => (
              <tr key={`${item.placeProvider}:${item.externalPlaceId}`}>
                <td><strong>{item.clinicName || "치과 정보 없음"}</strong></td>
                <td>{item.address ?? "—"}</td>
                <td>{item.phone ?? "—"}</td>
                <td>{item.requestCount.toLocaleString("ko-KR")}건</td>
                <td><button type="button" onClick={() => onSelectClinic(item)}>상세 보기</button></td>
              </tr>
            ))}
            {!isLoading && !error && (data?.items.length ?? 0) === 0 ? (
              <tr><td className="admin-service-expansion-empty" colSpan={5}>조건에 맞는 치과 제휴 요청이 없습니다.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {isLoading ? <p className="admin-service-expansion-loading">치과 제휴 요청을 불러오는 중입니다.</p> : null}
      {data ? <Pagination pagination={data.pagination} onPageChange={onPageChange} label="치과 제휴 요청 목록 페이지" /> : null}
    </section>
  );
}

function Pagination({
  label,
  onPageChange,
  pagination,
}: {
  label: string;
  onPageChange: (page: number) => void;
  pagination: { page: number; totalPages: number };
}) {
  const pages = serviceExpansionPageNumbers(pagination.page, pagination.totalPages);
  return (
    <nav className="admin-sales-pagination" aria-label={label}>
      <button type="button" aria-label="이전 페이지" disabled={pagination.page <= 1} onClick={() => onPageChange(pagination.page - 1)}>‹</button>
      {pages.map((page) => (
        <button type="button" key={page} className={page === pagination.page ? "admin-sales-page-active" : undefined} aria-current={page === pagination.page ? "page" : undefined} onClick={() => onPageChange(page)}>{page}</button>
      ))}
      <button type="button" aria-label="다음 페이지" disabled={pagination.page >= pagination.totalPages} onClick={() => onPageChange(pagination.page + 1)}>›</button>
    </nav>
  );
}

function ClinicRequesterDialog({
  clinic,
  onClose,
}: {
  clinic: ClinicPartnershipRequestItem;
  onClose: () => void;
}) {
  return (
    <div className="admin-service-expansion-dialog-layer">
      <button type="button" className="admin-service-expansion-dialog-backdrop" aria-label="치과 제휴 요청 상세 닫기" onClick={onClose} />
      <section className="admin-service-expansion-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-service-expansion-dialog-title">
        <header>
          <div>
            <h2 id="admin-service-expansion-dialog-title">{clinic.clinicName} 제휴 요청 내역</h2>
            <p><span>{clinic.address ?? clinic.district ?? "주소 정보 없음"}</span><i aria-hidden="true" /><strong>총 {clinic.requestCount.toLocaleString("ko-KR")}건의 요청이 있어요</strong></p>
          </div>
          <button type="button" aria-label="닫기" onClick={onClose}><Image src="/secret-feedback/Type=Close.png" alt="" width={20} height={20} /></button>
        </header>
        <div className="admin-service-expansion-dialog-table-wrap">
          <table>
            <thead><tr><th>접수 일시</th><th>요청자</th></tr></thead>
            <tbody>
              {clinic.requesters.map((requester) => (
                <tr key={requester.id}>
                  <td>{formatServiceExpansionDate(requester.createdAt)}</td>
                  <td><strong>{requester.fullName ?? requester.email ?? "이름 미등록"}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className="admin-service-expansion-dialog-close" onClick={onClose}>닫기</button>
      </section>
    </div>
  );
}
