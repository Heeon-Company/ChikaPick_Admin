import assert from "node:assert/strict";
import test from "node:test";

import {
  validateDentalpediaPost,
  type AdminDentalpediaPostInput,
} from "./dentalpedia-post.ts";

const validPost: AdminDentalpediaPostInput = {
  bodyText: "올바른 칫솔질은 치아 건강의 기본입니다.",
  cardSummary: "치석이 생기는 원인부터 관리 주기까지 알아보세요.",
  category: "oral-care",
  endAt: "2026-12-31T14:59:59.000Z",
  homeOrder: 2,
  homeVisible: true,
  imagePaths: ["admin/user/one.png", "admin/user/two.png"],
  isHero: false,
  isRecommended: false,
  isVisible: true,
  postType: "carousel",
  publishAt: "2026-09-05T04:00:00.000Z",
  relatedContentIds: [],
  searchKeywords: ["양치방법"],
  status: "published",
  tags: ["칫솔질"],
  title: "올바른 칫솔질 방법 가이드",
};

test("published posts require category, images, body, and a publication time", () => {
  assert.equal(validateDentalpediaPost(validPost, true), null);
  assert.equal(
    validateDentalpediaPost({ ...validPost, imagePaths: [] }, true),
    "게시물 이미지를 등록해 주세요.",
  );
  assert.equal(
    validateDentalpediaPost({ ...validPost, bodyText: "" }, true),
    "본문/설명을 입력해 주세요.",
  );
});

test("single-image posts reject multiple images", () => {
  assert.equal(
    validateDentalpediaPost({ ...validPost, postType: "single" }, true),
    "단일 이미지 게시물에는 이미지 1장만 등록할 수 있습니다.",
  );
});

test("draft posts allow publication content to remain incomplete", () => {
  assert.equal(
    validateDentalpediaPost(
      {
        ...validPost,
        bodyText: "",
        category: null,
        imagePaths: [],
        publishAt: null,
        status: "draft",
      },
      false,
    ),
    null,
  );
});

test("post publication must end after it begins", () => {
  assert.equal(
    validateDentalpediaPost(
      { ...validPost, endAt: "2026-09-05T03:59:59.000Z" },
      true,
    ),
    "게시 종료일은 게시일시 이후로 설정해 주세요.",
  );
});
