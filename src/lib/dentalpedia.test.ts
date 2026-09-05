import assert from "node:assert/strict";
import test from "node:test";

import {
  toDateTimeLocalValue,
  validateDentalpediaArticle,
  type AdminDentalpediaArticleInput,
} from "./dentalpedia.ts";

const validInput: AdminDentalpediaArticleInput = {
  authorLabel: "운영 관리자",
  bodyImagePaths: [],
  bodyMarkdown: "## 치료 전 확인",
  category: "treatment-guide",
  coverImageAlt: "치과 상담",
  coverImagePath: "admin/user/asset/cover.png",
  disclaimerEnabled: true,
  homeOrder: 1,
  homeSummary: "치료 전 확인할 내용을 알려드립니다.",
  homeVisible: true,
  isRecommended: true,
  publishAt: "2026-09-05T01:00:00.000Z",
  reviewedAt: "2026-09-05",
  slug: "treatment-checklist",
  status: "published",
  tags: ["치료가이드"],
  title: "치료 전 확인할 내용",
};

test("Dentalpedia publication validation accepts complete articles", () => {
  assert.equal(validateDentalpediaArticle(validInput, true), null);
});

test("Dentalpedia draft validation allows publication fields to remain empty", () => {
  assert.equal(
    validateDentalpediaArticle(
      {
        ...validInput,
        bodyMarkdown: "",
        coverImagePath: null,
        homeSummary: "",
        publishAt: null,
        status: "draft",
      },
      false,
    ),
    null,
  );
});

test("Dentalpedia publication validation rejects invalid slugs and missing cover", () => {
  assert.match(
    validateDentalpediaArticle({ ...validInput, slug: "invalid slug" }, true) ?? "",
    /페이지 주소/,
  );
  assert.match(
    validateDentalpediaArticle({ ...validInput, coverImagePath: null }, true) ?? "",
    /대표 이미지/,
  );
});

test("datetime-local values preserve local wall-clock components", () => {
  const date = new Date(2026, 8, 5, 10, 30);
  assert.equal(toDateTimeLocalValue(date), "2026-09-05T10:30");
});
