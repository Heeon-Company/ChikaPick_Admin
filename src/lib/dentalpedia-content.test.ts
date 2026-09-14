import assert from "node:assert/strict";
import test from "node:test";
import {
  dentalpediaContentDate,
  dentalpediaContentQuery,
  dentalpediaImmediatePublishAt,
} from "./dentalpedia-content.ts";

test("content query retains literal titles and typed filter/page selection", () => {
  const query = new URLSearchParams(
    dentalpediaContentQuery({
      type: "article",
      status: "archived",
      category: "implant",
      search: "  100% & 교정_  ",
      page: 3,
    }),
  );
  assert.equal(query.get("search"), "100% & 교정_");
  assert.equal(query.get("type"), "article");
  assert.equal(query.get("status"), "archived");
  assert.equal(query.get("category"), "implant");
  assert.equal(query.get("page"), "3");
});

test("content dates use Korea's calendar, including the UTC day boundary", () => {
  assert.equal(dentalpediaContentDate("2026-09-14T15:00:00Z"), "2026.09.15");
  assert.equal(dentalpediaContentDate(null), "-");
  assert.equal(dentalpediaContentDate("invalid"), "-");
});

test("editing published content preserves its date; new/immediately released schedules use now", () => {
  const now = new Date("2026-09-14T03:00:00Z");
  assert.equal(
    dentalpediaImmediatePublishAt("2026-09-01T00:00:00Z", now),
    "2026-09-01T00:00:00Z",
  );
  assert.equal(dentalpediaImmediatePublishAt(null, now), now.toISOString());
  assert.equal(
    dentalpediaImmediatePublishAt("2026-09-15T00:00:00Z", now),
    now.toISOString(),
  );
});
