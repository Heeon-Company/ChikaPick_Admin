import assert from "node:assert/strict";
import test from "node:test";

import {
  canReissueMembershipInvite,
  membershipInviteStatusLabel,
  validateMembershipInviteIssue,
  type AdminMembershipInvite,
} from "./membership-invites.ts";

const invite: AdminMembershipInvite = {
  accountEmail: null,
  hasBusinessLicense: true,
  id: "invite-1",
  issuedAt: "2026-10-14T00:00:00.000Z",
  issuerEmail: "sales@example.com",
  partnerCategory: "lab",
  partnerDeleted: false,
  partnerId: "partner-1",
  partnerName: "새기공소",
  redeemedAt: null,
  status: "active",
};

test("membership invite issue needs a name and a PDF/JPG/PNG business license", () => {
  const license = new File([new Uint8Array([1])], "license.pdf", { type: "application/pdf" });
  assert.equal(
    validateMembershipInviteIssue({ businessLicense: license, category: "lab", name: " " }),
    "업체명을 입력해 주세요.",
  );
  assert.equal(
    validateMembershipInviteIssue({ businessLicense: null, category: "lab", name: "새기공소" }),
    "사업자등록증 사본을 첨부해 주세요.",
  );
  assert.match(
    validateMembershipInviteIssue({
      businessLicense: new File(["x"], "license.gif", { type: "image/gif" }),
      category: "lab",
      name: "새기공소",
    }) ?? "",
    /PDF, JPG, PNG/,
  );
  assert.equal(
    validateMembershipInviteIssue({ businessLicense: license, category: "lab", name: "새기공소" }),
    null,
  );
});

test("membership invite status labels and reissue rules", () => {
  assert.equal(membershipInviteStatusLabel("active"), "가입 대기");
  assert.equal(membershipInviteStatusLabel("redeemed"), "가입 완료");
  assert.equal(membershipInviteStatusLabel("revoked"), "폐기");
  assert.equal(canReissueMembershipInvite(invite), true);
  assert.equal(canReissueMembershipInvite({ ...invite, status: "revoked" }), true);
  assert.equal(canReissueMembershipInvite({ ...invite, status: "redeemed" }), false);
  assert.equal(canReissueMembershipInvite({ ...invite, partnerDeleted: true }), false);
});
