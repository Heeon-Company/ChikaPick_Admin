import assert from "node:assert/strict";
import test from "node:test";
import { AdminApiError, fetchAdminDentalSalesExport } from "./admin-api.ts";
import { emptyDentalSalesFilters } from "./dental-sales.ts";

const mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

test("export sends only applied filters with bearer and abort signal, and receives binary filename", async () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.NEXT_PUBLIC_CHIKAPICK_API_BASE_URL;
  process.env.NEXT_PUBLIC_CHIKAPICK_API_BASE_URL = "https://api.example.com";
  const signal = new AbortController().signal;
  const fileName = "치과영업목록_서울특별시_중랑구_20261006_1425.xlsx";
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.pathname, "/api/v1/admin/dental-sales/export");
    assert.deepEqual(Object.fromEntries(url.searchParams), {
      city: "서울특별시", district: "중랑구", clinicName: "서울 치과",
      salespersonId: "sales-1", status: "VISITING", detailStatus: "INTEREST",
    });
    assert.equal(init?.signal, signal);
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer test-token");
    assert.equal(init?.cache, "no-store");
    return new Response(new Uint8Array([0x50, 0x4b, 1, 2]), { headers: {
      "Content-Type": mime,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    } });
  };
  try {
    const result = await fetchAdminDentalSalesExport("test-token", {
      city: " 서울특별시 ", district: "중랑구", clinicName: " 서울 치과 ",
      salespersonId: "sales-1", status: "VISITING", detailStatus: "INTEREST",
    }, signal);
    assert.equal(result.fileName, fileName);
    assert.deepEqual(new Uint8Array(await result.blob.arrayBuffer()), new Uint8Array([0x50, 0x4b, 1, 2]));
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_CHIKAPICK_API_BASE_URL;
    else process.env.NEXT_PUBLIC_CHIKAPICK_API_BASE_URL = originalUrl;
  }
});

test("export rejects structured errors and HTML responses instead of downloading them", async () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.NEXT_PUBLIC_CHIKAPICK_API_BASE_URL;
  process.env.NEXT_PUBLIC_CHIKAPICK_API_BASE_URL = "https://api.example.com";
  try {
    for (const status of [401, 403, 423, 500]) {
      globalThis.fetch = async () => Response.json({
        message: "관리자 요청 오류", error: "TEST_ERROR", requestId: "request-1",
      }, { status });
      await assert.rejects(fetchAdminDentalSalesExport("test-token", emptyDentalSalesFilters, new AbortController().signal),
        (error: unknown) => error instanceof AdminApiError && error.status === status &&
          error.code === "TEST_ERROR" && error.requestId === "request-1");
    }
    globalThis.fetch = async () => new Response("<html>failed</html>", { headers: { "Content-Type": "text/html" } });
    await assert.rejects(fetchAdminDentalSalesExport("test-token", emptyDentalSalesFilters, new AbortController().signal), /엑셀 파일을 받지 못했습니다/);
    globalThis.fetch = async () => new Response("file", { headers: { "Content-Type": mime, "Content-Disposition": "attachment; filename*=UTF-8''%INVALID" } });
    assert.equal((await fetchAdminDentalSalesExport("test-token", emptyDentalSalesFilters, new AbortController().signal)).fileName, "치과영업목록.xlsx");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_CHIKAPICK_API_BASE_URL;
    else process.env.NEXT_PUBLIC_CHIKAPICK_API_BASE_URL = originalUrl;
  }
});
