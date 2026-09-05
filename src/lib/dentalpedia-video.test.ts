import assert from "node:assert/strict";
import test from "node:test";

import {
  dentalpediaVideoFileError,
  isSupportedYoutubeUrl,
  validateDentalpediaVideo,
  type AdminDentalpediaVideoInput,
} from "./dentalpedia-video.ts";

const validVideo: AdminDentalpediaVideoInput = {
  category: "implant",
  description: "임플란트 관리 방법을 알려드립니다.",
  homeCategory: "treatment-guide",
  homeOrder: 2,
  homeTitle: "임플란트 상담 전 확인할 기준",
  homeVisible: true,
  isVisible: true,
  isRecommended: true,
  publishAt: "2026-09-05T04:00:00.000Z",
  status: "published",
  tags: ["임플란트"],
  thumbnailImageAlt: "임플란트 관리 영상",
  thumbnailImagePath: "admin/admin-1/thumbnail.png",
  title: "임플란트 수명 늘리기",
  videoContentType: null,
  videoFileName: null,
  videoFilePath: null,
  videoSizeBytes: null,
  videoUrl: "https://youtu.be/dQw4w9WgXcQ",
};

test("accepts supported YouTube URL formats", () => {
  for (const url of [
    "https://youtu.be/dQw4w9WgXcQ",
    "https://youtube.com/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    "https://youtube-nocookie.com/embed/dQw4w9WgXcQ",
  ]) {
    assert.equal(isSupportedYoutubeUrl(url), true);
  }
});

test("rejects non-YouTube and lookalike URLs", () => {
  assert.equal(isSupportedYoutubeUrl("https://example.test/video"), false);
  assert.equal(
    isSupportedYoutubeUrl(
      "https://youtube.com.example.test/watch?v=dQw4w9WgXcQ",
    ),
    false,
  );
});

test("published video requires complete patient-facing content", () => {
  assert.equal(validateDentalpediaVideo(validVideo, true), null);
  assert.equal(
    validateDentalpediaVideo({ ...validVideo, thumbnailImagePath: null }, true),
    "썸네일 이미지를 등록해 주세요.",
  );
  assert.equal(
    validateDentalpediaVideo({ ...validVideo, homeTitle: "" }, true),
    "썸네일 제목을 입력해 주세요.",
  );
  assert.equal(
    validateDentalpediaVideo({ ...validVideo, category: null }, true),
    "카테고리를 선택해 주세요.",
  );
});

test("published video accepts an uploaded video without a YouTube URL", () => {
  assert.equal(
    validateDentalpediaVideo(
      {
        ...validVideo,
        videoContentType: "video/mp4",
        videoFileName: "guide.mp4",
        videoFilePath: "admin/admin-1/guide.mp4",
        videoSizeBytes: 1024,
        videoUrl: null,
      },
      true,
    ),
    null,
  );
});

test("video file selection accepts MP4/WebM through 50MB", () => {
  assert.equal(
    dentalpediaVideoFileError(
      new File([new Uint8Array(1024)], "guide.mp4", { type: "video/mp4" }),
    ),
    null,
  );
  assert.match(
    dentalpediaVideoFileError(
      new File([new Uint8Array(10)], "guide.mov", {
        type: "video/quicktime",
      }),
    ) ?? "",
    /MP4 또는 WebM/,
  );
});

test("draft requires only a title and validates a supplied URL", () => {
  assert.equal(
    validateDentalpediaVideo(
      {
        ...validVideo,
        category: null,
        description: "",
        publishAt: null,
        status: "draft",
        thumbnailImagePath: null,
        videoUrl: null,
      },
      false,
    ),
    null,
  );
  assert.equal(
    validateDentalpediaVideo(
      { ...validVideo, status: "draft", videoUrl: "https://example.test" },
      false,
    ),
    "올바른 YouTube 영상 URL을 입력해 주세요.",
  );
});
