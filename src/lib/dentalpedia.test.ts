import assert from "node:assert/strict";
import test from "node:test";

import {
  toDateTimeLocalValue,
  validateDentalpediaArticle,
  type AdminDentalpediaArticleInput,
} from "./dentalpedia.ts";

const validInput: AdminDentalpediaArticleInput = {
  authorLabel: "운영 관리자",
  authoredAt: "2026-09-05",
  bodyImagePaths: [],
  bodyMarkdown: "## 치료 전 확인",
  category: "implant",
  coverImageAlt: "치과 상담",
  coverImagePath: "admin/user/asset/cover.png",
  disclaimerEnabled: true,
  endAt: null,
  homeOrder: 1,
  homeSummary: "치료 전 확인할 내용을 알려드립니다.",
  homeVisible: true,
  isHero: false,
  isRecommended: true,
  isVisible: true,
  publishAt: "2026-09-05T01:00:00.000Z",
  relatedContentIds: [],
  reviewedAt: "2026-09-05",
  reviewerLabel: "치과의사 김치카",
  searchKeywords: ["임플란트 비용", "치료 전 확인"],
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
        authoredAt: null,
        reviewedAt: null,
        status: "draft",
      },
      false,
    ),
    null,
  );
});

test("Dentalpedia publication validation enforces review and exposure metadata", () => {
  assert.match(
    validateDentalpediaArticle({ ...validInput, authoredAt: null }, true) ?? "",
    /작성\/게시일/,
  );
  assert.match(
    validateDentalpediaArticle({ ...validInput, reviewedAt: null }, true) ?? "",
    /최종 검토일/,
  );
  assert.match(
    validateDentalpediaArticle(
      {
        ...validInput,
        endAt: "2026-09-05T00:59:59.000Z",
      },
      true,
    ) ?? "",
    /게시 종료일/,
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
