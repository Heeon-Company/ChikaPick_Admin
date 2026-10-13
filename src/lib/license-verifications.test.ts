import assert from "node:assert/strict";
import test from "node:test";

import type { LicenseVerificationRequest } from "./admin-api.ts";
import {
  licenseMembershipRoleLabel,
  licenseRequestTimeLabel,
  licenseVerificationStatus,
  licenseVerificationStatusLabel,
  normalizeLicenseRejectionReason,
} from "./license-verifications.ts";

const baseRequest: LicenseVerificationRequest = {
  userId: "dentist-1",
  email: "dentist@example.com",
  displayName: "최서현",
  jobTitle: null,
  clinicName: "서울밝은미소치과",
  membershipRole: "doctor",
  licenseVerified: false,
  updatedAt: null,
  latestSubmission: null,
};

test("license review labels match the Korean admin design", () => {
  assert.equal(
    licenseRequestTimeLabel("2026-07-15T05:30:00.000Z"),
    "2026.07.15 14:30",
  );
  assert.equal(licenseMembershipRoleLabel("owner"), "원장");
  assert.equal(licenseMembershipRoleLabel("doctor"), "치과의사");
});

test("license review status follows approval, then the latest submission", () => {
  const submission = (status: "pending_review" | "rejected") => ({
    id: `submission-${status}`,
    status,
    submittedAt: "2026-07-14T05:30:00.000Z",
    reviewedAt: status === "rejected" ? "2026-07-14T06:00:00.000Z" : null,
    files: [{ fileName: "면허증.png", contentType: "image/png", sizeBytes: 2048 }],
  });

  assert.equal(licenseVerificationStatus({ ...baseRequest, licenseVerified: true }), "approved");
  assert.equal(
    licenseVerificationStatus({ ...baseRequest, latestSubmission: submission("pending_review") }),
    "pending",
  );
  assert.equal(
    licenseVerificationStatus({ ...baseRequest, latestSubmission: submission("rejected") }),
    "rejected",
  );
  assert.equal(licenseVerificationStatus(baseRequest), "not_submitted");
  assert.equal(licenseVerificationStatusLabel("rejected"), "재요청 필요");
});

test("license rejection reasons are required and normalized before submission", () => {
  assert.equal(normalizeLicenseRejectionReason("   "), null);
  assert.equal(
    normalizeLicenseRejectionReason("  면허번호를 식별할 수 없습니다.  "),
    "면허번호를 식별할 수 없습니다.",
  );
});
