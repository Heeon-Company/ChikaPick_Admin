import assert from "node:assert/strict";
import test from "node:test";
import { adminScreenFromState, createAdminNavigation, type AdminScreen } from "./admin-navigation.ts";

class FakeHistory {
  index = 0;
  entries: unknown[] = [{ __NA: true, tree: "next-router-state" }];
  onPop = () => {};
  get state() { return this.entries[this.index]; }
  pushState(state: unknown) { this.entries.splice(++this.index, Infinity, state); }
  replaceState(state: unknown) { this.entries[this.index] = state; }
  go(delta: number) {
    this.index = Math.max(0, Math.min(this.entries.length - 1, this.index + delta));
    this.onPop();
  }
}

function setup() {
  const history = new FakeHistory();
  let visible: AdminScreen = { tab: "dashboard" };
  let allowed = true;
  let requests = 0;
  const navigation = createAdminNavigation(history, "https://admin.chikapick.com/", (screen) => { visible = screen; }, () => { requests++; return allowed; });
  history.onPop = navigation.pop;
  return { history, navigation, get visible() { return visible; }, get requests() { return requests; }, allow(value: boolean) { allowed = value; } };
}

const flows: [AdminScreen, AdminScreen][] = [
  [{ tab: "information-upload" }, { tab: "information-upload", editor: { type: "video", id: "video-1" } }],
  [{ tab: "information-upload" }, { tab: "information-upload", editor: { type: "post", id: "post-1" } }],
  [{ tab: "information-upload" }, { tab: "information-upload", editor: { type: "article", id: "article-1" } }],
  [{ tab: "information-upload" }, { tab: "information-upload", editor: { type: "article" } }],
  [{ tab: "partner-clinics" }, { tab: "partner-clinics", id: "clinic-1" }],
  [{ tab: "dental-sales" }, { tab: "dental-sales", id: "sales-1" }],
  [{ tab: "partner-accounts" }, { tab: "partner-accounts", view: "search" }],
  [{ tab: "memberships" }, { tab: "memberships", view: "registration" }],
  [{ tab: "service-expansion-requests" }, { tab: "service-expansion-requests", view: "copy" }],
  [{ tab: "service-expansion-requests" }, { tab: "service-expansion-requests", view: "clinic" }],
  [{ tab: "support-management" }, { tab: "support-management", supportEditor: { kind: "announcement", id: "notice-1" } }],
  [{ tab: "support-management", view: "faq" }, { tab: "support-management", view: "faq", supportEditor: { kind: "faq", id: "faq-1" } }],
  [{ tab: "support-management", view: "faq" }, { tab: "support-management", view: "faq", supportEditor: { kind: "category", id: "category-1", isNew: true } }],
];
for (const [list, detail] of flows) {
  test(`Back/Forward and list button restore ${JSON.stringify(detail)}`, () => {
    const app = setup();
    app.navigation.navigate(list);
    app.navigation.navigate(detail);
    app.history.go(-1);
    assert.deepEqual(app.visible, list);
    app.history.go(1);
    assert.deepEqual(app.visible, detail);
    app.navigation.returnTo(list);
    assert.deepEqual(app.visible, list);
    app.history.go(1);
    assert.deepEqual(app.visible, detail);
    assert.equal(app.history.entries.length, 3);
  });
}

test("cross-tab traversal restores the owning tab and the exact detail", () => {
  const app = setup();
  const detail: AdminScreen = { tab: "partner-clinics", id: "clinic-1" };
  app.navigation.navigate({ tab: "partner-clinics" });
  app.navigation.navigate(detail);
  app.navigation.navigate({ tab: "information-upload" });
  app.history.go(-1);
  assert.deepEqual(app.visible, detail);
  app.history.go(-1);
  assert.deepEqual(app.visible, { tab: "partner-clinics" });
  app.history.go(2);
  assert.deepEqual(app.visible, { tab: "information-upload" });
});

test("cancelled Back and Forward keep both the screen and the original history stack", () => {
  const app = setup();
  app.navigation.navigate({ tab: "information-upload" });
  app.navigation.navigate({ tab: "information-upload", editor: { type: "post", id: "post-1" } });
  const original = structuredClone(app.history.entries);
  app.allow(false);
  for (let i = 0; i < 3; i++) app.history.go(-1);
  assert.equal(app.history.index, 2);
  assert.equal(app.visible.editor?.id, "post-1");
  assert.deepEqual(app.history.entries, original);
  app.allow(true);
  app.history.go(-1);
  app.allow(false);
  app.history.go(1);
  assert.equal(app.history.index, 1);
  assert.deepEqual(app.visible, { tab: "information-upload" });
  assert.deepEqual(app.history.entries, original);
});

test("multi-step Back cancellation returns to its exact index", () => {
  const app = setup();
  app.navigation.navigate({ tab: "memberships" });
  app.navigation.navigate({ tab: "memberships", view: "registration" });
  app.allow(false);
  app.history.go(-2);
  assert.equal(app.history.index, 2);
  assert.equal(app.visible.view, "registration");
});

test("list action asks once, no-op navigation never asks, and busy guards prevent navigation", () => {
  const app = setup();
  const list: AdminScreen = { tab: "information-upload" };
  app.navigation.navigate(list);
  app.navigation.navigate({ ...list, editor: { type: "article" } });
  const before = app.requests;
  app.navigation.returnTo(list);
  assert.equal(app.requests, before + 1);
  app.navigation.navigate(list);
  assert.equal(app.requests, before + 1);
  app.allow(false);
  app.navigation.navigate({ tab: "dashboard" });
  assert.deepEqual(app.visible, list);
});

test("editor type replacement keeps its parent and a new branch clears obsolete Forward entries", () => {
  const app = setup();
  const list: AdminScreen = { tab: "information-upload" };
  app.navigation.navigate(list);
  app.navigation.navigate({ ...list, editor: { type: "video" } });
  app.navigation.navigate({ ...list, editor: { type: "post" } }, true);
  app.navigation.returnTo(list);
  app.navigation.navigate({ ...list, editor: { type: "article" } });
  assert.equal(app.history.entries.length, 3);
  assert.equal(app.visible.editor?.type, "article");
});

test("reload restores selection and preserves Next.js state without storing form contents", () => {
  const app = setup();
  const detail: AdminScreen = { tab: "information-upload", editor: { type: "post", id: "post-1" } };
  app.navigation.navigate(detail);
  let restored: AdminScreen | null = null;
  createAdminNavigation(app.history, "/", (screen) => { restored = screen; }, () => true);
  assert.deepEqual(restored, detail);
  assert.equal((app.history.state as { tree: string }).tree, "next-router-state");
  assert.equal((app.history.state as { __NA: boolean }).__NA, true);
  assert.equal(JSON.stringify(app.history.state).includes("access_token"), false);
});

test("malformed history cannot restore an invalid tab or mismatched editor", () => {
  for (const screen of [{ tab: "missing" }, { tab: "memberships", editor: { type: "post" } }, { tab: "information-upload", editor: null }, { tab: "partner-clinics", id: 123 }]) {
    assert.equal(adminScreenFromState({ chikapickAdminNavigation: { index: 0, screen } }), null);
  }
});
