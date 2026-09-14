import assert from "node:assert/strict";
import test from "node:test";
import { formSnapshot, UnsavedChanges } from "./unsaved-changes.ts";

test("loading and API hydration establish a clean baseline; reverted edits are clean", () => {
  const tracker = new UnsavedChanges();
  tracker.observe(formSnapshot({ title: "" }), false);
  tracker.observe(formSnapshot({ title: "불러온 제목" }), false);
  tracker.observe(formSnapshot({ title: "불러온 제목" }), true);
  assert.equal(tracker.dirty, false);
  tracker.observe(formSnapshot({ title: "수정한 제목" }), true);
  assert.equal(tracker.dirty, true);
  tracker.observe(formSnapshot({ title: "불러온 제목" }), true);
  assert.equal(tracker.dirty, false);
});

test("booleans, related IDs, attachment replacement/removal and image order are tracked", () => {
  const tracker = new UnsavedChanges();
  const original = { visible: true, related: ["a"], images: ["one", "two"], file: null as File | null };
  const snapshot = formSnapshot(original);
  tracker.observe(snapshot, true);
  for (const changed of [{ ...original, visible: false }, { ...original, related: ["b"] }, { ...original, images: ["two", "one"] }, { ...original, file: new File(["a"], "same.png") }]) {
    tracker.observe(formSnapshot(changed), true);
    assert.equal(tracker.dirty, true);
    tracker.observe(snapshot, true);
    assert.equal(tracker.dirty, false);
  }
  const file = new File(["a"], "same.png", { lastModified: 1 });
  assert.equal(formSnapshot(file), formSnapshot(file));
  assert.notEqual(formSnapshot(file), formSnapshot(new File(["b"], "same.png", { lastModified: 1 })));
});

test("only successful save accepts the new baseline; later edits prompt again", () => {
  const tracker = new UnsavedChanges();
  tracker.observe("original", true);
  tracker.observe("edit", true);
  assert.equal(tracker.dirty, true);
  tracker.saved();
  tracker.observe("saved response", true);
  assert.equal(tracker.dirty, false);
  tracker.observe("next edit", true);
  assert.equal(tracker.dirty, true);
});
