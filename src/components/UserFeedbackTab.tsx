"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";

import { answerAdminUserFeedback, fetchAdminUserFeedback } from "@/lib/admin-api";
import { useAutoRefresh } from "@/lib/use-auto-refresh";
import {
  formatServiceExpansionDate,
  serviceExpansionPageNumbers,
} from "@/lib/service-expansion-requests";
import {
  formatUserFeedbackApp,
  userFeedbackAnswerLimit,
  userFeedbackStatusFilters,
  type UserFeedbackItem,
  type UserFeedbackPayload,
  type UserFeedbackStatusFilter,
} from "@/lib/user-feedback";

export function UserFeedbackTab({ accessToken }: { accessToken: string }) {
  const [data, setData] = useState<UserFeedbackPayload | null>(null);
  const [status, setStatus] = useState<UserFeedbackStatusFilter>("unanswered");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<UserFeedbackItem | null>(null);
  const [answer, setAnswer] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!accessToken) return;
    if (!silent) {
      setIsLoading(true);
      setError("");
    }
    try {
      setData(await fetchAdminUserFeedback(accessToken, status, page));
      if (silent) setError("");
    } catch (loadError) {
      // A background refresh keeps the rows already on screen.
      if (silent) return;
      setError(
        loadError instanceof Error ? loadError.message : "사용자 의견을 불러오지 못했습니다.",
      );
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [accessToken, page, status]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);
  useAutoRefresh(() => void load({ silent: true }));

  const close = useCallback(() => {
    if (isSaving) return;
    setSelected(null);
  }, [isSaving]);

  useEffect(() => {
    if (!selected) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [close, selected]);

  const open = (item: UserFeedbackItem) => {
    setSelected(item);
    setAnswer(item.answer ?? "");
    setSaveError("");
  };

  const save = async () => {
    if (!selected || !answer.trim()) return;
    setIsSaving(true);
    setSaveError("");
    try {
      await answerAdminUserFeedback(accessToken, selected.id, answer.trim());
      setSelected(null);
      await load();
    } catch (saveFailure) {
      setSaveError(
        saveFailure instanceof Error ? saveFailure.message : "답변을 저장하지 못했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const answerLength = Array.from(answer.trim()).length;

  return (
    <section className="admin-service-expansion admin-user-feedback">
      <section className="admin-service-expansion-card admin-service-expansion-list-card">
        <header className="admin-user-feedback-header">
          <h2>
            의견 목록
            {data ? (
              <span className="admin-partner-sales-inquiries-count">
                답변 대기 {data.unansweredCount.toLocaleString("ko-KR")}건
              </span>
            ) : null}
          </h2>
          <div className="admin-chika-talk-status-filters" role="group" aria-label="답변 상태">
            {userFeedbackStatusFilters.map((filter) => (
              <button
                type="button"
                key={filter.id}
                className={filter.id === status ? "is-active" : undefined}
                aria-pressed={filter.id === status}
                onClick={() => {
                  setStatus(filter.id);
                  setPage(1);
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </header>
        {error ? <p className="admin-service-expansion-error">{error}</p> : null}
        <div className="admin-service-expansion-table-wrap">
          <table className="admin-user-feedback-table">
            <thead>
              <tr>
                <th>접수 일시</th>
                <th>회원</th>
                <th>의견 내용</th>
                <th>상태</th>
                <th>상세 보기</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((item) => (
                <tr key={item.id}>
                  <td>{formatServiceExpansionDate(item.createdAt)}</td>
                  <td>
                    <strong>{item.userName ?? "이름 없음"}</strong>
                    <small>{item.userEmail ?? "—"}</small>
                  </td>
                  <td>{item.message}</td>
                  <td>
                    <span
                      className={`admin-user-feedback-status ${
                        item.answer ? "is-answered" : "is-waiting"
                      }`}
                    >
                      {item.answer ? "답변 완료" : "답변 대기"}
                    </span>
                  </td>
                  <td>
                    <button type="button" onClick={() => open(item)}>
                      상세 보기
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && !error && (data?.items.length ?? 0) === 0 ? (
                <tr>
                  <td className="admin-service-expansion-empty" colSpan={5}>
                    {status === "unanswered" ? "답변을 기다리는 의견이 없습니다." : "접수된 의견이 없습니다."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {isLoading ? (
          <p className="admin-service-expansion-loading">사용자 의견을 불러오는 중입니다.</p>
        ) : null}
        {data ? (
          <nav className="admin-sales-pagination" aria-label="사용자 의견 목록 페이지">
            <button
              type="button"
              aria-label="이전 페이지"
              disabled={data.pagination.page <= 1}
              onClick={() => setPage(data.pagination.page - 1)}
            >
              ‹
            </button>
            {serviceExpansionPageNumbers(data.pagination.page, data.pagination.totalPages).map(
              (pageNumber) => (
                <button
                  type="button"
                  key={pageNumber}
                  className={
                    pageNumber === data.pagination.page ? "admin-sales-page-active" : undefined
                  }
                  aria-current={pageNumber === data.pagination.page ? "page" : undefined}
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              ),
            )}
            <button
              type="button"
              aria-label="다음 페이지"
              disabled={data.pagination.page >= data.pagination.totalPages}
              onClick={() => setPage(data.pagination.page + 1)}
            >
              ›
            </button>
          </nav>
        ) : null}
      </section>

      {selected ? (
        <div className="admin-service-expansion-dialog-layer">
          <button
            type="button"
            className="admin-service-expansion-dialog-backdrop"
            aria-label="사용자 의견 상세 닫기"
            onClick={close}
          />
          <section
            className="admin-service-expansion-dialog admin-partner-sales-inquiry-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-user-feedback-title"
          >
            <header>
              <div>
                <h2 id="admin-user-feedback-title">
                  {selected.userName ?? "이름 없음"} 님의 의견
                </h2>
                <p>
                  {formatServiceExpansionDate(selected.createdAt)} 접수
                  {selected.answeredAt
                    ? ` · ${formatServiceExpansionDate(selected.answeredAt)} 답변${
                        selected.answerRead ? " · 사용자 확인함" : ""
                      }`
                    : " · 답변 대기"}
                </p>
              </div>
              <button type="button" aria-label="닫기" onClick={close}>
                <Image src="/secret-feedback/Type=Close.png" alt="" width={20} height={20} />
              </button>
            </header>
            <dl className="admin-partner-sales-inquiry-details">
              <div><dt>회원</dt><dd>{selected.userEmail ?? "—"}</dd></div>
              <div><dt>앱 버전</dt><dd>{formatUserFeedbackApp(selected)}</dd></div>
            </dl>
            <div className="admin-partner-sales-inquiry-message">
              <h3>의견 내용</h3>
              <p>{selected.message}</p>
            </div>
            <label className="admin-user-feedback-answer">
              <span>답변</span>
              <textarea
                value={answer}
                maxLength={userFeedbackAnswerLimit}
                placeholder="사용자에게 보낼 답변을 입력해 주세요."
                onChange={(event) => setAnswer(event.target.value)}
              />
              <small>
                {answerLength.toLocaleString("ko-KR")}/{userFeedbackAnswerLimit.toLocaleString("ko-KR")}
              </small>
            </label>
            <p className="admin-user-feedback-note">
              답변을 등록하면 사용자 앱의 보낸 의견에 표시되고 푸시 알림이 갑니다. 등록 후에도 수정할 수 있습니다.
            </p>
            {saveError ? <p className="admin-service-expansion-error">{saveError}</p> : null}
            <div className="admin-user-feedback-actions">
              <button
                type="button"
                className="admin-service-expansion-dialog-close"
                disabled={isSaving}
                onClick={close}
              >
                닫기
              </button>
              <button
                type="button"
                className="admin-user-feedback-submit"
                disabled={isSaving || answerLength === 0}
                onClick={() => void save()}
              >
                {isSaving ? "저장 중" : selected.answer ? "답변 수정" : "답변 등록"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
