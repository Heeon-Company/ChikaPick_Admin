import assert from "node:assert/strict";
import { test } from "node:test";

import {
  adminChikaTalkActionLabel,
  adminChikaTalkSanctionState,
  adminChikaTalkMetricCards,
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
  assert.equal(adminChikaTalkActionLabel("suspend_writes"), "글쓰기 제한");
});

test("expired restrictions show normal state and active access restrictions take precedence", () => {
  const now = new Date("2026-09-11T00:00:00Z");
  assert.deepEqual(adminChikaTalkSanctionState({write_suspended_until:"2026-09-10T00:00:00Z"}, now), {label:"정상",active:false,until:null});
  assert.equal(adminChikaTalkSanctionState({write_suspended_until:"2027-01-01",access_suspended_until:"2027-02-01"}, now).label, "이용 제한");
  assert.equal(adminChikaTalkSanctionState({banned_at:"2026-01-01"}, now).label, "영구 이용 제한");
  assert.equal(adminChikaTalkReasonLabel("sanction_released"), "제재 해제");
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

test("ChikaTalk moderation cards match the Figma metric contract", () => {
  assert.deepEqual(
    adminChikaTalkMetricCards({
      unresolvedReports: 9,
      reportsToday: 3,
      completedReports: 28,
      deletedContents: 7,
      oldestUnresolvedAgeSeconds: 3_600,
      actionsLast30Days: 35,
      openAppeals: 0,
      activeSanctions: 2,
    }),
    [
      { label: "미처리 신고", value: "9건" },
      { label: "오늘 접수", value: "3건" },
      { label: "처리 완료", value: "28건" },
      { label: "삭제", value: "7건" },
    ],
  );
});
