import assert from "node:assert/strict";
import { test } from "node:test";

import {
  adminChikaTalkActionLabel,
  adminChikaTalkReasonLabel,
  adminChikaTalkRecordString,
  adminChikaTalkReportStatusLabel,
  adminChikaTalkTargetTypeLabel,
  formatAdminChikaTalkDate,
  formatAdminChikaTalkQueueAge,
  formatAdminChikaTalkReportDate,
} from "./chika-talk-moderation.ts";

test("ChikaTalk moderation labels present API values in Korean", () => {
  assert.equal(adminChikaTalkReasonLabel("personal_information"), "개인정보 노출");
  assert.equal(adminChikaTalkReportStatusLabel("content_removed"), "콘텐츠 삭제");
  assert.equal(adminChikaTalkTargetTypeLabel("comment"), "댓글/답글");
  assert.equal(adminChikaTalkActionLabel("suspend_writes"), "작성 정지");
});

test("ChikaTalk moderation helpers preserve safe fallbacks", () => {
  assert.equal(formatAdminChikaTalkQueueAge(30), "1분 미만");
  assert.equal(formatAdminChikaTalkQueueAge(7_200), "2시간");
  assert.equal(
    adminChikaTalkRecordString({ title: "", body: " 신고 내용 " }, "title", "body"),
    "신고 내용",
  );
  assert.equal(adminChikaTalkRecordString(null, "body"), null);
  assert.equal(
    formatAdminChikaTalkDate("2026-08-23T11:41:00.000Z"),
    "2026.08.23 20:41",
  );
  assert.equal(
    formatAdminChikaTalkReportDate("2026-08-23T16:32:00.000Z"),
    "08.24 01:32",
  );
});
