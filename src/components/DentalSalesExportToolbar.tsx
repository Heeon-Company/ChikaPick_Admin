"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { fetchAdminDentalSalesExport } from "@/lib/admin-api";
import type { DentalSalesFilters } from "@/lib/dental-sales";

export function DentalSalesExportToolbar({
  accessToken, filters, totalItems, disabled,
}: {
  accessToken: string;
  filters: DentalSalesFilters;
  totalItems: number;
  disabled: boolean;
}) {
  const requestRef = useRef<AbortController | null>(null);
  const [pending, setPending] = useState<{
    token: string; filters: DentalSalesFilters; controller: AbortController;
  } | null>(null);
  const [failure, setFailure] = useState<{
    token: string; filters: DentalSalesFilters; message: string;
  } | null>(null);
  const isDownloading = pending?.token === accessToken && pending?.filters === filters &&
    !pending.controller.signal.aborted;
  const errorMessage = failure?.token === accessToken && failure?.filters === filters
    ? failure.message : "";

  useLayoutEffect(() => {
    return () => {
      requestRef.current?.abort();
      requestRef.current = null;
    };
  }, [accessToken, filters]);

  async function download() {
    if (disabled || !accessToken || totalItems === 0 || requestRef.current) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setPending({ token: accessToken, filters, controller });
    setFailure(null);
    try {
      const file = await fetchAdminDentalSalesExport(accessToken, filters, controller.signal);
      if (controller.signal.aborted || requestRef.current !== controller) return;
      const url = URL.createObjectURL(file.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      if (controller.signal.aborted || requestRef.current !== controller) return;
      setFailure({
        token: accessToken, filters,
        message: error instanceof Error && error.name !== "TypeError"
          ? error.message : "엑셀 다운로드에 실패했습니다. 다시 시도해 주세요.",
      });
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setPending(null);
      }
    }
  }

  return (
    <div className="admin-sales-export">
      <div className="admin-sales-export-toolbar">
        <div>
          <strong>총 {totalItems.toLocaleString("ko-KR")}개</strong>
          <p id="dental-sales-export-description">현재 검색 조건의 전체 목록을 다운로드합니다.</p>
        </div>
        <button
          className="admin-sales-submit admin-sales-export-button"
          type="button"
          aria-describedby="dental-sales-export-description"
          disabled={disabled || !accessToken || totalItems === 0 || isDownloading}
          onClick={() => void download()}
        >
          {isDownloading ? "다운로드 준비 중…" : "엑셀 다운로드"}
        </button>
      </div>
      {errorMessage ? <p className="admin-sales-export-error" role="alert">{errorMessage}</p> : null}
      <span className="admin-visually-hidden" aria-live="polite">
        {isDownloading ? "엑셀 파일을 준비하고 있습니다." : ""}
      </span>
    </div>
  );
}
