import assert from "node:assert/strict";
import test from "node:test";

import {
  adminAuditActionLabel,
  adminConsultationCategoryLabel,
  adminDirectoryDateTime,
  adminInviteStatusLabel,
  adminMembershipRoleLabel,
  adminTermAudienceLabel,
  sortAdminTermsByAudienceAndKoreanTitle,
  type AdminManagedTermDocument,
} from "./admin-platform-operations.ts";

test("platform operation labels distinguish invite, role, audit, and audience values", () => {
  assert.equal(adminInviteStatusLabel("pending_owner_claim"), "대표자 인증 대기");
  assert.equal(adminMembershipRoleLabel("doctor"), "치과의사");
  assert.equal(adminAuditActionLabel("terms.version.publish"), "약관 버전 게시");
  assert.equal(
    adminAuditActionLabel("admin_account.invitation.setup_failure"),
    "어드민 초대 설정 실패",
  );
  assert.equal(
    adminAuditActionLabel("admin_account.recovery.setup_attempt"),
    "어드민 비밀번호 재설정 시도",
  );
  assert.equal(adminTermAudienceLabel("patient"), "치카픽");
  assert.equal(adminTermAudienceLabel("partner"), "파트너스");
});

test("platform operation timestamps render in Korea time and handle missing values", () => {
  assert.match(adminDirectoryDateTime("2026-07-17T00:00:00.000Z"), /2026/);
  assert.match(adminDirectoryDateTime("2026-07-17T00:00:00.000Z"), /9:00/);
  assert.equal(adminDirectoryDateTime(null), "—");
  assert.equal(adminDirectoryDateTime("not-a-date"), "—");
});

test("consultation category labels localize every canonical Partners category", () => {
  assert.deepEqual(
    [
      "tooth_pain",
      "dental_trauma",
      "cavity",
      "cavity_treatment",
      "sensitive_teeth",
      "scaling_gum_treatment",
      "wisdom_tooth_extraction",
      "root_canal",
      "prosthodontic",
      "implant",
      "orthodontics",
      "tmj",
      "pediatric_dentistry",
      "oral_checkup",
    ].map(adminConsultationCategoryLabel),
    [
      "치아 통증",
      "치아 파절 / 외상",
      "충치 치료",
      "충치 치료",
      "시린 치아",
      "스케일링 / 잇몸 치료",
      "사랑니 발치",
      "신경 치료",
      "보철 치료",
      "임플란트",
      "치아 교정",
      "턱관절",
      "소아 치과",
      "구강 검진",
    ],
  );
  assert.equal(adminConsultationCategoryLabel(null), "미분류");
});

test("terms show Client then Partners groups in Korean title order", () => {
  const documents = [
    termDocument("PARTNER_PRIVACY_CONSENT", "개인정보 수집 및 이용", "partner"),
    termDocument("LOCATION_TERMS", "위치기반서비스 이용약관", "patient"),
    termDocument("SHARED_TERMS", "공통 서비스 이용약관", "all"),
    termDocument("PRIVACY_CONSENT", "개인정보처리방침", "client"),
    termDocument("PARTNER_SERVICE_TERMS", "서비스 이용약관", "partners"),
    termDocument("FAMILY_ACCOUNT_TERMS", "가족 계정 이용약관", "patient"),
  ];

  assert.deepEqual(
    sortAdminTermsByAudienceAndKoreanTitle(documents).map(
      (document) => document.code,
    ),
    [
      "FAMILY_ACCOUNT_TERMS",
      "PRIVACY_CONSENT",
      "LOCATION_TERMS",
      "PARTNER_PRIVACY_CONSENT",
      "PARTNER_SERVICE_TERMS",
      "SHARED_TERMS",
    ],
  );
  assert.equal(documents[0]?.code, "PARTNER_PRIVACY_CONSENT");
});

function termDocument(
  code: string,
  title: string,
  appliesTo: string,
): AdminManagedTermDocument {
  return {
    id: code,
    code,
    title,
    isRequired: true,
    appliesTo,
    locale: "ko-KR",
    updatedAt: "2026-08-04T00:00:00.000Z",
    activeVersion: null,
    versions: [],
  };
}
