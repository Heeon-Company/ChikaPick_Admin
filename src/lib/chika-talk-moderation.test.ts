import assert from "node:assert/strict";
import { test } from "node:test";

import {
  adminChikaTalkActionLabel,
  adminChikaTalkConfirmation,
  adminChikaTalkHistoryState,
  adminChikaTalkRestrictionLines,
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

test("warning confirmation includes the server-projected escalation and Korean deadlines", () => {
  const message = adminChikaTalkConfirmation("warn_user", {
    evaluatedAt: "2026-09-16T00:00:00Z", authorDisplayName: "테스트 작성자",
    priorSanctions: { strike_count: 4 },
    newSanctions: { strike_count: 5, write_suspended_until: "2026-09-23T00:00:00Z", access_suspended_until: "2026-10-16T00:00:00Z" },
  }, { reasonCode: "other", detailedReason: "검토 근거", userMessage: "회원 안내" });
  for (const fragment of ["선택한 처리: 사용자 경고", "4회 → 5회", "예상 상태: 이용 제한", "2026.09.23 09:00", "2026.10.16 09:00", "한국시간", "검토 근거", "회원 안내", "동시 조치"]) {
    assert.ok(message.includes(fragment), fragment);
  }
});

test("history uses the recorded action time rather than today's expired state", () => {
  const state = { sanctions: { write_suspended_until: "2026-09-23T00:00:00Z" } };
  assert.equal(adminChikaTalkHistoryState(state, "2026-09-16T00:00:00Z"), "글쓰기 제한");
  assert.equal(adminChikaTalkHistoryState(undefined, "2026-09-16T00:00:00Z"), "상태 기록 없음");
  assert.equal(adminChikaTalkHistoryState({}, "2026-09-16T00:00:00Z"), "상태 기록 없음");
  assert.equal(adminChikaTalkHistoryState({ sanctions: null }, "2026-09-16T00:00:00Z"), "이용 제한 없음");
  assert.deepEqual(adminChikaTalkRestrictionLines({ banned_at: "2026-09-01T00:00:00Z" }, new Date("2026-09-16")), ["영구 이용 제한 · 종료 없음"]);
});

test("restoration confirmation preserves existing sanctions and release preserves strikes", () => {
  const preview = { evaluatedAt: "2026-09-16T00:00:00Z", authorDisplayName: "작성자", priorSanctions: { strike_count: 7 }, newSanctions: { strike_count: 7 } };
  const details = { reasonCode: "content_restored", detailedReason: "재검토", userMessage: "복원 안내" };
  assert.match(adminChikaTalkConfirmation("restore_content", preview, details), /콘텐츠가 다시 공개됩니다. 이용자 제재는 유지됩니다/);
  const release = adminChikaTalkConfirmation("release_sanctions", preview, details);
  assert.match(release, /7회 → 7회/);
  assert.match(release, /누적 횟수와 이력은 유지됩니다/);
  const recovered = adminChikaTalkConfirmation("warn_user", { ...preview, alreadyApplied: true }, details);
  assert.match(recovered, /이미 처리된 당시 상태/);
  assert.match(recovered, /새 제재를 추가하지 않습니다/);
  assert.doesNotMatch(recovered, /적용하시겠습니까/);
});

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
