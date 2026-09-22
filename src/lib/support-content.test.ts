import assert from "node:assert/strict";
import test from "node:test";
import { supportDraftForSelection, type SupportContent } from "./support-content.ts";

const data: SupportContent = {
  announcements: [{ id: "notice", title: "현재 제목", body: "현재 본문", is_active: false, published_at: "2026-09-14T00:00:00Z" }],
  categories: [{ id: "category", title: "이용", display_order: 1, is_active: true }],
  faqs: [{ id: "faq", question: "질문", answer: "답변", category_id: "category", display_order: 1, is_active: true }],
  feedbackFormUrl: null,
  feedbackEmail: "support@example.com",
};

test("Forward resolves current support content from its ID, including newly saved records", () => {
  assert.deepEqual(supportDraftForSelection(data, { kind: "announcement", id: "notice", isNew: true }), { kind: "announcement", record: data.announcements[0] });
  assert.deepEqual(supportDraftForSelection(data, { kind: "faq", id: "faq" }), { kind: "faq", record: data.faqs[0] });
});

test("new FAQ uses the selected entry ID and available category, without persisted form contents", () => {
  const draft = supportDraftForSelection(data, { kind: "faq", id: "new-id", isNew: true });
  assert.deepEqual(draft, { kind: "faq", record: { id: "new-id", category_id: "category", question: "", answer: "", display_order: 1, is_active: false } });
});

test("unavailable historical records never become blank create forms", () => {
  for (const kind of ["announcement", "category", "faq"] as const) {
    assert.equal(supportDraftForSelection(data, { kind, id: "gone" }), null);
  }
});
