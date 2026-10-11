"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";

import { fetchAdminPartnerSalesInquiries } from "@/lib/admin-api";
import {
  formatPartnerSalesInquiryPhone,
  type PartnerSalesInquiryItem,
  type PartnerSalesInquiryPayload,
} from "@/lib/partner-sales-inquiries";
import {
  formatServiceExpansionDate,
  serviceExpansionPageNumbers,
} from "@/lib/service-expansion-requests";

export function PartnerSalesInquiriesTab({ accessToken }: { accessToken: string }) {
  const [data, setData] = useState<PartnerSalesInquiryPayload | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<PartnerSalesInquiryItem | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError("");
    try {
      setData(await fetchAdminPartnerSalesInquiries(accessToken, page));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "영업 문의를 불러오지 못했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, page]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  useEffect(() => {
    if (!selected) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selected]);

  return (
    <section className="admin-service-expansion admin-partner-sales-inquiries">
      <section className="admin-service-expansion-card admin-service-expansion-list-card">
        <header>
          <h2>
            문의 목록
            {data ? (
              <span className="admin-partner-sales-inquiries-count">
                총 {data.pagination.totalItems.toLocaleString("ko-KR")}건
              </span>
            ) : null}
          </h2>
        </header>
        {error ? <p className="admin-service-expansion-error">{error}</p> : null}
        <div className="admin-service-expansion-table-wrap">
          <table className="admin-partner-sales-inquiries-table">
            <thead>
              <tr>
                <th>접수 일시</th>
                <th>병원명</th>
                <th>대표자</th>
                <th>연락처</th>
                <th>이메일</th>
                <th>문의 내용</th>
                <th>상세 보기</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((item) => (
                <tr key={item.id}>
                  <td>{formatServiceExpansionDate(item.createdAt)}</td>
                  <td><strong>{item.clinicName}</strong></td>
                  <td>{item.representativeName}</td>
                  <td>{formatPartnerSalesInquiryPhone(item.phone)}</td>
                  <td>{item.email}</td>
                  <td>{item.message}</td>
                  <td>
                    <button type="button" onClick={() => setSelected(item)}>
                      상세 보기
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && !error && (data?.items.length ?? 0) === 0 ? (
                <tr>
                  <td className="admin-service-expansion-empty" colSpan={7}>
                    접수된 영업 문의가 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {isLoading ? (
          <p className="admin-service-expansion-loading">영업 문의를 불러오는 중입니다.</p>
        ) : null}
        {data ? (
          <nav className="admin-sales-pagination" aria-label="영업 문의 목록 페이지">
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
            aria-label="영업 문의 상세 닫기"
            onClick={() => setSelected(null)}
          />
          <section
            className="admin-service-expansion-dialog admin-partner-sales-inquiry-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-partner-sales-inquiry-title"
          >
            <header>
              <div>
                <h2 id="admin-partner-sales-inquiry-title">{selected.clinicName} 영업 문의</h2>
                <p>{formatServiceExpansionDate(selected.createdAt)} 접수</p>
              </div>
              <button type="button" aria-label="닫기" onClick={() => setSelected(null)}>
                <Image src="/secret-feedback/Type=Close.png" alt="" width={20} height={20} />
              </button>
            </header>
            <dl className="admin-partner-sales-inquiry-details">
              <div><dt>병원명</dt><dd>{selected.clinicName}</dd></div>
              <div><dt>대표자 성함</dt><dd>{selected.representativeName}</dd></div>
              <div><dt>연락받을 전화번호</dt><dd>{formatPartnerSalesInquiryPhone(selected.phone)}</dd></div>
              <div><dt>이메일</dt><dd>{selected.email}</dd></div>
            </dl>
            <div className="admin-partner-sales-inquiry-message">
              <h3>문의 내용</h3>
              <p>{selected.message}</p>
            </div>
            <button
              type="button"
              className="admin-service-expansion-dialog-close"
              onClick={() => setSelected(null)}
            >
              닫기
            </button>
          </section>
        </div>
      ) : null}
    </section>
  );
}
