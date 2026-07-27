import assert from "node:assert/strict";
import test from "node:test";

import type { LicenseVerificationRequest } from "./admin-api.ts";
import {
  filterLicenseVerificationRequests,
  licenseMembershipRoleLabel,
  licenseRequestTimeLabel,
  licenseVerificationStatus,
  licenseVerificationStatusLabel,
  normalizeLicenseRejectionReason,
  pendingLicenseVerificationRequests,
  summarizeLicenseVerifications,
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

test("license verification summary partitions affiliated dentists by review state", () => {
  const requests: LicenseVerificationRequest[] = [
    { ...baseRequest, userId: "approved", licenseVerified: true },
    {
      ...baseRequest,
      userId: "pending",
      latestSubmission: {
        id: "submission-1",
        status: "pending_review",
        submittedAt: "2026-07-15T05:30:00.000Z",
        reviewedAt: null,
        fileName: "면허증.jpg",
        contentType: "image/jpeg",
        sizeBytes: 1024,
        signedUrl: "https://example.com/license",
      },
    },
    { ...baseRequest, userId: "not-requested" },
  ];

  assert.deepEqual(summarizeLicenseVerifications(requests), {
    total: 3,
    approved: 1,
    pending: 1,
    unrequested: 1,
  });
  assert.deepEqual(
    pendingLicenseVerificationRequests(requests).map((item) => item.userId),
    ["pending"],
  );
});

test("license review labels match the Korean admin design", () => {
  assert.equal(
    licenseRequestTimeLabel("2026-07-15T05:30:00.000Z"),
    "2026.07.15 14:30",
  );
  assert.equal(licenseMembershipRoleLabel("owner"), "원장");
  assert.equal(licenseMembershipRoleLabel("doctor"), "치과의사");
});

test("license verification filters retain approved and not-submitted dentists", () => {
  const rejectedSubmission: LicenseVerificationRequest["latestSubmission"] = {
    id: "submission-rejected",
    status: "rejected",
    submittedAt: "2026-07-14T05:30:00.000Z",
    reviewedAt: "2026-07-14T06:00:00.000Z",
    fileName: "면허증.png",
    contentType: "image/png",
    sizeBytes: 2048,
    signedUrl: "https://example.com/rejected-license",
  };
  const requests: LicenseVerificationRequest[] = [
    { ...baseRequest, userId: "approved", licenseVerified: true },
    {
      ...baseRequest,
      userId: "pending",
      latestSubmission: {
        ...rejectedSubmission,
        id: "submission-pending",
        status: "pending_review",
        reviewedAt: null,
      },
    },
    { ...baseRequest, userId: "rejected", latestSubmission: rejectedSubmission },
    { ...baseRequest, userId: "not-submitted" },
  ];

  assert.deepEqual(
    filterLicenseVerificationRequests(requests, "approved").map(
      (request) => request.userId,
    ),
    ["approved"],
  );
  assert.deepEqual(
    filterLicenseVerificationRequests(requests, "needs_submission").map(
      (request) => request.userId,
    ),
    ["rejected", "not-submitted"],
  );
  assert.equal(licenseVerificationStatus(requests[1]), "pending");
  assert.equal(licenseVerificationStatusLabel("rejected"), "재요청 필요");
});

test("license rejection reasons are required and normalized before submission", () => {
  assert.equal(normalizeLicenseRejectionReason("   "), null);
  assert.equal(
    normalizeLicenseRejectionReason("  면허번호를 식별할 수 없습니다.  "),
    "면허번호를 식별할 수 없습니다.",
  );
});
