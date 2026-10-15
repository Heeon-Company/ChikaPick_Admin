import assert from "node:assert/strict";
import test from "node:test";

import { fitWithin, isShrinkablePhoto, shrinkPhotoForUpload } from "./photo-resize.ts";

const megabyte = 1024 * 1024;

function sizedFile(bytes: number, name: string, type: string) {
  return new File([new Uint8Array(bytes)], name, { type });
}

test("fitWithin scales only the images whose longest side passes the limit", () => {
  assert.deepEqual(fitWithin(1200, 800, 2560), { width: 1200, height: 800 });
  assert.deepEqual(fitWithin(4000, 3000, 2560), { width: 2560, height: 1920 });
  assert.deepEqual(fitWithin(3000, 6000, 2560), { width: 1280, height: 2560 });
});

test("only JPG and PNG photos are shrunk", () => {
  assert.equal(isShrinkablePhoto({ type: "image/jpeg" }), true);
  assert.equal(isShrinkablePhoto({ type: "image/png" }), true);
  assert.equal(isShrinkablePhoto({ type: "image/gif" }), false);
  assert.equal(isShrinkablePhoto({ type: "application/pdf" }), false);
});

test("small photos and non-photo files are uploaded unchanged", async () => {
  const photo = sizedFile(500 * 1024, "license.jpg", "image/jpeg");
  const pdf = sizedFile(9 * megabyte, "license.pdf", "application/pdf");
  assert.equal(await shrinkPhotoForUpload(photo, 10 * megabyte), photo);
  assert.equal(await shrinkPhotoForUpload(pdf, 10 * megabyte), pdf);
});

test("a photo that cannot be shrunk under the limit names its real size", async () => {
  // Node cannot decode images, so the resize step is unavailable here.
  await assert.rejects(
    shrinkPhotoForUpload(sizedFile(20_145_124, "KakaoTalk_20261015.jpg", "image/jpeg"), 10 * megabyte),
    {
      message:
        "KakaoTalk_20261015.jpg 사진 용량이 19.2MB라 올릴 수 없습니다. 10MB 이하로 다시 선택해 주세요.",
    },
  );
  assert.equal(
    (await shrinkPhotoForUpload(sizedFile(4 * megabyte, "a.png", "image/png"), 10 * megabyte)).size,
    4 * megabyte,
  );
});
