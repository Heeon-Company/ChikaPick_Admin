"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { AdminSelect } from "@/components/AdminSelect";
import {
  fetchAdminClinicPartnershipRequests,
  updateAdminClinicPartnershipRequest,
} from "@/lib/admin-api";
import {
  clinicPartnershipProviderLabel,
  clinicPartnershipRequestPageNumbers,
  clinicPartnershipRequestStatusLabel,
  clinicPartnershipRequestStatusOptions,
  defaultClinicPartnershipRequestFilters,
  formatClinicPartnershipRequestDate,
  safeClinicPartnershipUrl,
  type ClinicPartnershipRequestFilters,
  type ClinicPartnershipRequestItem,
  type ClinicPartnershipRequestPayload,
  type ClinicPartnershipRequestStatus,
} from "@/lib/clinic-partnership-requests";

export function ClinicPartnershipRequestsTab({
  accessToken,
}: {
  accessToken: string;
}) {
  const [draftFilters, setDraftFilters] = useState<ClinicPartnershipRequestFilters>(
    defaultClinicPartnershipRequestFilters,
  );
  const [filters, setFilters] = useState<ClinicPartnershipRequestFilters>(
    defaultClinicPartnershipRequestFilters,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [data, setData] = useState<ClinicPartnershipRequestPayload | null>(null);
  const [selectedRequest, setSelectedRequest] =
    useState<ClinicPartnershipRequestItem | null>(null);
  const [editStatus, setEditStatus] =
    useState<ClinicPartnershipRequestStatus>("pending");
  const [editNote, setEditNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const loadRequests = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError("");
    try {
      setData(
        await fetchAdminClinicPartnershipRequests(
          accessToken,
          filters,
          currentPage,
        ),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "입점 신청 목록을 불러오지 못했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, currentPage, filters]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadRequests(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadRequests]);

  useEffect(() => {
    if (!selectedRequest) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving) setSelectedRequest(null);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isSaving, selectedRequest]);

  const metricCards = useMemo(
    () => [
      { status: "pending" as const, label: "접수", value: data?.metrics.pending ?? 0 },
      {
        status: "contacting" as const,
        label: "연락 중",
        value: data?.metrics.contacting ?? 0,
      },
      {
        status: "completed" as const,
        label: "입점 완료",
        value: data?.metrics.completed ?? 0,
      },
      {
        status: "on_hold" as const,
        label: "보류",
        value: data?.metrics.onHold ?? 0,
      },
    ],
    [data],
  );

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    setCurrentPage(1);
    setFilters({ ...draftFilters, query: draftFilters.query.trim() });
  }

  function filterByStatus(status: ClinicPartnershipRequestStatus) {
    const nextFilters = { ...filters, status };
    setDraftFilters(nextFilters);
    setFilters(nextFilters);
    setCurrentPage(1);
    setFeedback("");
  }

  function openRequest(request: ClinicPartnershipRequestItem) {
    setSelectedRequest(request);
    setEditStatus(request.status);
    setEditNote(request.adminNote ?? "");
    setError("");
  }

  function closeRequest() {
    if (isSaving) return;
    setSelectedRequest(null);
    setError("");
  }

  async function saveRequest() {
    if (!selectedRequest || isSaving) return;
    setIsSaving(true);
    setError("");
    try {
      const result = await updateAdminClinicPartnershipRequest(
        accessToken,
        selectedRequest.placeProvider,
        selectedRequest.externalPlaceId,
        { status: editStatus, adminNote: editNote.trim() || null },
      );
      setFeedback(result.message);
      setSelectedRequest(null);
      await loadRequests();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "입점 신청 상태를 변경하지 못했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="admin-partnership-requests" aria-busy={isLoading}>
      <div className="admin-partnership-request-metrics" aria-label="입점 신청 처리 현황">
        {metricCards.map((metric) => (
          <button
            type="button"
            className={`admin-partnership-request-metric admin-partnership-request-metric--${metric.status}${
              filters.status === metric.status ? " is-active" : ""
            }`}
            key={metric.status}
            onClick={() => filterByStatus(metric.status)}
          >
            <span>{metric.label}</span>
            <strong>{metric.value.toLocaleString("ko-KR")}</strong>
            <small>치과</small>
          </button>
        ))}
      </div>

      <form className="admin-operational-filters" onSubmit={applyFilters}>
        <label className="admin-operational-search">
          <span>치과명, 주소 또는 전화번호</span>
          <input
            type="search"
            value={draftFilters.query}
            placeholder="검색어를 입력해 주세요."
            onChange={(event) =>
              setDraftFilters((current) => ({
                ...current,
                query: event.target.value,
              }))
            }
          />
        </label>
        <label>
          <span>처리 상태</span>
          <AdminSelect
            label="처리 상태"
            value={draftFilters.status}
            onChange={(value) =>
              setDraftFilters((current) => ({
                ...current,
                status: value as ClinicPartnershipRequestFilters["status"],
              }))
            }
            options={clinicPartnershipRequestStatusOptions}
          />
        </label>
        <button type="submit">조회</button>
      </form>

      {feedback ? (
        <p className="admin-partnership-request-feedback" role="status">
          {feedback}
        </p>
      ) : null}

      <section className="admin-operational-table-card">
        <div className="admin-operational-table-heading">
          <strong>입점 신청 치과</strong>
          <span>{data?.pagination.totalItems.toLocaleString("ko-KR") ?? "0"}곳</span>
        </div>
        {error && !selectedRequest ? (
          <p className="admin-operational-error">{error}</p>
        ) : null}
        <div className="admin-table-wrap admin-partnership-request-table-wrap">
          <table className="admin-partnership-request-table">
            <thead>
              <tr>
                <th>치과</th>
                <th>연락처</th>
                <th>신청 수요</th>
                <th>최근 신청</th>
                <th>처리 상태</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((item) => (
                <tr key={`${item.placeProvider}:${item.externalPlaceId}`}>
                  <td>
                    <strong>{item.clinicName || "치과 정보 없음"}</strong>
                    <span title={item.address ?? undefined}>{item.address ?? "주소 없음"}</span>
                    <small className="admin-partnership-request-provider">
                      {clinicPartnershipProviderLabel(item.placeProvider)}
                    </small>
                  </td>
                  <td>
                    {item.phone ? <a href={`tel:${item.phone}`}>{item.phone}</a> : "—"}
                  </td>
                  <td>
                    <strong>{item.requestCount.toLocaleString("ko-KR")}명</strong>
                    <span>{formatClinicPartnershipRequestDate(item.firstRequestedAt)}부터</span>
                  </td>
                  <td>{formatClinicPartnershipRequestDate(item.lastRequestedAt)}</td>
                  <td>
                    <span className={`admin-partnership-request-status admin-partnership-request-status--${item.status}`}>
                      {clinicPartnershipRequestStatusLabel(item.status)}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="admin-small-button admin-partnership-request-detail-button"
                      onClick={() => openRequest(item)}
                    >
                      상세보기
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && (data?.items.length ?? 0) === 0 ? (
                <tr>
                  <td className="admin-empty-cell" colSpan={6}>
                    조건에 맞는 입점 신청이 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {isLoading ? (
          <p className="admin-operational-loading">입점 신청을 불러오는 중입니다.</p>
        ) : null}
        {data ? (
          <PartnershipRequestPagination
            currentPage={data.pagination.page}
            totalPages={data.pagination.totalPages}
            onPageChange={setCurrentPage}
          />
        ) : null}
      </section>

      {selectedRequest ? (
        <PartnershipRequestDialog
          error={error}
          isSaving={isSaving}
          note={editNote}
          request={selectedRequest}
          status={editStatus}
          onClose={closeRequest}
          onNoteChange={setEditNote}
          onSave={() => void saveRequest()}
          onStatusChange={setEditStatus}
        />
      ) : null}
    </section>
  );
}

function PartnershipRequestDialog({
  error,
  isSaving,
  note,
  onClose,
  onNoteChange,
  onSave,
  onStatusChange,
  request,
  status,
}: {
  error: string;
  isSaving: boolean;
  note: string;
  onClose: () => void;
  onNoteChange: (value: string) => void;
  onSave: () => void;
  onStatusChange: (status: ClinicPartnershipRequestStatus) => void;
  request: ClinicPartnershipRequestItem;
  status: ClinicPartnershipRequestStatus;
}) {
  const placeUrl = safeClinicPartnershipUrl(request.placeUrl);
  const [copyFeedback, setCopyFeedback] = useState("");

  async function copyExternalPlaceId() {
    try {
      await navigator.clipboard.writeText(request.externalPlaceId);
      setCopyFeedback("외부 병원 ID를 복사했습니다.");
    } catch {
      setCopyFeedback("외부 병원 ID를 복사하지 못했습니다.");
    }
  }

  return (
    <div className="admin-partnership-request-dialog-layer">
      <button
        type="button"
        className="admin-partnership-request-dialog-backdrop"
        aria-label="입점 신청 상세 닫기"
        disabled={isSaving}
        onClick={onClose}
      />
      <section
        className="admin-partnership-request-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-partnership-request-dialog-title"
      >
        <header>
          <div>
            <span>{clinicPartnershipProviderLabel(request.placeProvider)} 입점 신청</span>
            <h2 id="admin-partnership-request-dialog-title">{request.clinicName}</h2>
          </div>
          <button type="button" aria-label="닫기" disabled={isSaving} onClick={onClose}>
            ×
          </button>
        </header>

        <div className="admin-partnership-request-dialog-content">
          <section className="admin-partnership-request-info-card">
            <dl>
              <div><dt>주소</dt><dd>{request.address ?? "—"}</dd></div>
              <div><dt>전화번호</dt><dd>{request.phone ?? "—"}</dd></div>
              <div><dt>최초 신청</dt><dd>{formatClinicPartnershipRequestDate(request.firstRequestedAt)}</dd></div>
              <div><dt>최근 신청</dt><dd>{formatClinicPartnershipRequestDate(request.lastRequestedAt)}</dd></div>
            </dl>
            {placeUrl ? (
              <a href={placeUrl} target="_blank" rel="noreferrer">
                외부 병원 정보 열기
              </a>
            ) : null}
            <details className="admin-partnership-request-technical-info">
              <summary>기술 정보</summary>
              <div>
                <span>
                  <strong>외부 병원 ID</strong>
                  <code>{request.externalPlaceId}</code>
                </span>
                <button type="button" onClick={() => void copyExternalPlaceId()}>
                  복사
                </button>
              </div>
              {copyFeedback ? <p role="status">{copyFeedback}</p> : null}
            </details>
          </section>

          <section className="admin-partnership-request-requesters">
            <div>
              <h3>신청자 내역</h3>
              <span>{request.requestCount.toLocaleString("ko-KR")}명</span>
            </div>
            <ul>
              {request.requesters.map((requester) => (
                <li key={requester.id}>
                  <div>
                    <strong>{requester.fullName ?? "이름 미등록"}</strong>
                    {requester.email ? (
                      <a href={`mailto:${requester.email}`}>{requester.email}</a>
                    ) : (
                      <span>이메일 없음</span>
                    )}
                  </div>
                  <time dateTime={requester.createdAt}>
                    {formatClinicPartnershipRequestDate(requester.createdAt)}
                  </time>
                </li>
              ))}
            </ul>
          </section>

          <section className="admin-partnership-request-editor">
            <label>
              <span>처리 상태</span>
              <AdminSelect
                label="처리 상태"
                value={status}
                disabled={isSaving}
                renderOptionsInPortal
                onChange={(value) => onStatusChange(value as ClinicPartnershipRequestStatus)}
                options={clinicPartnershipRequestStatusOptions.filter(
                  (option) => option.value !== "all",
                )}
              />
            </label>
            <label>
              <span>운영 메모</span>
              <textarea
                value={note}
                maxLength={1000}
                disabled={isSaving}
                placeholder="연락 결과나 다음 조치 사항을 입력해 주세요."
                onChange={(event) => onNoteChange(event.target.value)}
              />
              <small>{note.length.toLocaleString("ko-KR")} / 1,000</small>
            </label>
            {error ? <p className="admin-partnership-request-dialog-error">{error}</p> : null}
          </section>
        </div>

        <footer>
          <button type="button" disabled={isSaving} onClick={onClose}>취소</button>
          <button type="button" disabled={isSaving} onClick={onSave}>
            {isSaving ? "저장 중" : "변경사항 저장"}
          </button>
        </footer>
      </section>
    </div>
  );
}

function PartnershipRequestPagination({
  currentPage,
  onPageChange,
  totalPages,
}: {
  currentPage: number;
  onPageChange: (page: number) => void;
  totalPages: number;
}) {
  const pages = clinicPartnershipRequestPageNumbers(currentPage, totalPages);
  return (
    <nav className="admin-sales-pagination" aria-label="입점 신청 목록 페이지">
      <button
        type="button"
        aria-label="이전 페이지"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        ‹
      </button>
      {pages.map((page) => (
        <button
          type="button"
          key={page}
          className={page === currentPage ? "admin-sales-page-active" : undefined}
          aria-current={page === currentPage ? "page" : undefined}
          onClick={() => onPageChange(page)}
        >
          {page}
        </button>
      ))}
      <button
        type="button"
        aria-label="다음 페이지"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        ›
      </button>
    </nav>
  );
}
