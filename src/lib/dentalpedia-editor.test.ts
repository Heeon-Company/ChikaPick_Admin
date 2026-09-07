import assert from "node:assert/strict";
import test from "node:test";

import {
  dentalpediaLocalImageUrl,
  insertDentalpediaEditorText,
  insertDentalpediaImages,
  resolveDentalpediaLocalImages,
} from "./dentalpedia-editor.ts";

test("Dentalpedia body Tab inserts two spaces and advances the caret", () => {
  assert.deepEqual(
    insertDentalpediaEditorText("앞뒤", { start: 1, end: 1 }, "  "),
    {
      selection: { start: 3, end: 3 },
      value: "앞  뒤",
    },
  );
});

test("Dentalpedia body images insert at the saved caret and resolve for preview", () => {
  const inserted = insertDentalpediaImages(
    "첫 문단\n\n마지막 문단",
    { start: 6, end: 6 },
    [{ fileName: "article-[home]-card.png", token: "image-token" }],
  );

  assert.equal(
    inserted.value,
    `첫 문단\n\n![article-home-card.png](${dentalpediaLocalImageUrl("image-token")})\n\n마지막 문단`,
  );
  assert.equal(
    resolveDentalpediaLocalImages(inserted.value, [
      { objectUrl: "blob:https://admin.test/image", token: "image-token" },
    ]),
    "첫 문단\n\n![article-home-card.png](blob:https://admin.test/image)\n\n마지막 문단",
  );
});
