import assert from "node:assert/strict";
import test from "node:test";

import { answerAdminUserFeedback, fetchAdminUserFeedback } from "./admin-api.ts";
import { formatUserFeedbackApp } from "./user-feedback.ts";

function stubFetch(calls: Array<[string | URL | Request, RequestInit | undefined]>) {
  process.env.NEXT_PUBLIC_CHIKAPICK_API_BASE_URL = "https://api.example.com";
  globalThis.fetch = async (input, init) => {
    calls.push([input, init]);
    return new Response(JSON.stringify({ items: [], pagination: {}, feedback: {} }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
}

test("formatUserFeedbackApp shows the platform and version the app sent", () => {
  assert.equal(formatUserFeedbackApp({ platform: "ios", appVersion: "1.0.13+96" }), "iOS 1.0.13+96");
  assert.equal(formatUserFeedbackApp({ platform: "web", appVersion: null }), "웹");
  assert.equal(formatUserFeedbackApp({ platform: null, appVersion: null }), "—");
});

test("fetchAdminUserFeedback reads the requested status and page", async () => {
  const calls: Array<[string | URL | Request, RequestInit | undefined]> = [];
  const originalFetch = globalThis.fetch;
  stubFetch(calls);
  try {
    await fetchAdminUserFeedback("access-token", "unanswered", 2);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(
    calls[0][0],
    "https://api.example.com/api/v1/admin/user-feedback?status=unanswered&page=2&pageSize=20",
  );
});

test("answerAdminUserFeedback patches the answer for one feedback item", async () => {
  const calls: Array<[string | URL | Request, RequestInit | undefined]> = [];
  const originalFetch = globalThis.fetch;
  stubFetch(calls);
  try {
    await answerAdminUserFeedback("access-token", "feedback/1", "답변드립니다.");
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(calls[0][0], "https://api.example.com/api/v1/admin/user-feedback/feedback%2F1");
  assert.equal(calls[0][1]?.method, "PATCH");
  assert.equal(calls[0][1]?.body, JSON.stringify({ answer: "답변드립니다." }));
});
