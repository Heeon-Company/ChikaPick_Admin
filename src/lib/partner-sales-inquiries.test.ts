import assert from "node:assert/strict";
import test from "node:test";

import { fetchAdminPartnerSalesInquiries } from "./admin-api.ts";
import { formatPartnerSalesInquiryPhone } from "./partner-sales-inquiries.ts";

test("formatPartnerSalesInquiryPhone adds hyphens to stored digits", () => {
  assert.equal(formatPartnerSalesInquiryPhone("01012345678"), "010-1234-5678");
  assert.equal(formatPartnerSalesInquiryPhone("0212345678"), "02-1234-5678");
  assert.equal(formatPartnerSalesInquiryPhone("0311234567"), "031-123-4567");
  assert.equal(formatPartnerSalesInquiryPhone("1234"), "1234");
});

test("fetchAdminPartnerSalesInquiries reads the requested page", async () => {
  const calls: Array<string | URL | Request> = [];
  const originalFetch = globalThis.fetch;
  process.env.NEXT_PUBLIC_CHIKAPICK_API_BASE_URL = "https://api.example.com";
  globalThis.fetch = async (input) => {
    calls.push(input);
    return new Response(JSON.stringify({ items: [], pagination: {} }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    await fetchAdminPartnerSalesInquiries("access-token", 2);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(
    calls[0],
    "https://api.example.com/api/v1/admin/partner-sales-inquiries?page=2&pageSize=20",
  );
});
