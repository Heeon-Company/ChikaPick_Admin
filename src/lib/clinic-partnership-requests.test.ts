import assert from "node:assert/strict";
import { test } from "node:test";

import {
  clinicPartnershipProviderLabel,
  clinicPartnershipRequestPageNumbers,
  clinicPartnershipRequestStatusLabel,
  formatClinicPartnershipRequestDate,
  safeClinicPartnershipUrl,
} from "./clinic-partnership-requests.ts";

test("clinic partnership request helpers present statuses and providers in Korean", () => {
  assert.equal(clinicPartnershipRequestStatusLabel("pending"), "접수");
  assert.equal(clinicPartnershipRequestStatusLabel("contacting"), "연락 중");
  assert.equal(clinicPartnershipRequestStatusLabel("completed"), "입점 완료");
  assert.equal(clinicPartnershipRequestStatusLabel("on_hold"), "보류");
  assert.equal(clinicPartnershipProviderLabel("hira"), "HIRA");
  assert.equal(clinicPartnershipProviderLabel("kakao_local"), "Kakao");
});

test("clinic partnership request helpers format dates and safe external links", () => {
  assert.match(
    formatClinicPartnershipRequestDate("2026-08-03T01:30:00.000Z"),
    /2026/,
  );
  assert.equal(formatClinicPartnershipRequestDate("invalid"), "—");
  assert.equal(
    safeClinicPartnershipUrl("https://place.example.com/clinic"),
    "https://place.example.com/clinic",
  );
  assert.equal(safeClinicPartnershipUrl("javascript:alert(1)"), null);
});

test("clinic partnership pagination stays within the available range", () => {
  assert.deepEqual(clinicPartnershipRequestPageNumbers(1, 3), [1, 2, 3]);
  assert.deepEqual(clinicPartnershipRequestPageNumbers(8, 10), [6, 7, 8, 9, 10]);
});
