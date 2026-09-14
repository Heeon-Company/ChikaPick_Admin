import { primaryTabs, type PrimaryAdminTab } from "./admin-tabs.ts";
import type { DentalpediaContentSelection } from "./dentalpedia-content.ts";

export type AdminScreen = {
  tab: PrimaryAdminTab;
  id?: string;
  view?: "search" | "registration" | "clinic" | "copy" | "faq";
  editor?: DentalpediaContentSelection;
  supportEditor?: { kind: "announcement" | "category" | "faq"; id: string; isNew?: boolean };
};

type Entry = {
  index: number;
  screen: AdminScreen;
  previous?: { index: number; screen: AdminScreen };
};
type BrowserHistory = Pick<History, "state" | "pushState" | "replaceState" | "go">;
const stateKey = "chikapickAdminNavigation";
export const defaultAdminScreen: AdminScreen = { tab: "dashboard" };

export function adminScreenFromState(state: unknown): AdminScreen | null {
  return readEntry(state)?.screen ?? null;
}

function validScreen(value: unknown): value is AdminScreen {
  if (!value || typeof value !== "object") return false;
  const screen = value as AdminScreen;
  if (!primaryTabs.some((tab) => tab.id === screen.tab)) return false;
  if (screen.id !== undefined &&
    (!(screen.tab === "dental-sales" || screen.tab === "partner-clinics") || typeof screen.id !== "string" || !screen.id)) return false;
  if (screen.editor !== undefined &&
    (screen.tab !== "information-upload" || !screen.editor ||
      !["video", "post", "article"].includes(screen.editor.type) ||
      (screen.editor.id !== undefined && (typeof screen.editor.id !== "string" || !screen.editor.id)))) return false;
  if (screen.view !== undefined && !(
    (screen.tab === "partner-accounts" && screen.view === "search") ||
    (screen.tab === "memberships" && screen.view === "registration") ||
    (screen.tab === "service-expansion-requests" && ["clinic", "copy"].includes(screen.view)) ||
    (screen.tab === "support-management" && screen.view === "faq")
  )) return false;
  if (screen.supportEditor !== undefined && (
    screen.tab !== "support-management" || !screen.supportEditor ||
    !["announcement", "category", "faq"].includes(screen.supportEditor.kind) ||
    typeof screen.supportEditor.id !== "string" || !screen.supportEditor.id
  )) return false;
  return true;
}

function readEntry(state: unknown): Entry | null {
  if (!state || typeof state !== "object") return null;
  const entry = (state as Record<string, Entry>)[stateKey];
  if (!entry || !Number.isSafeInteger(entry.index) || entry.index < 0 || !validScreen(entry.screen)) return null;
  const previous = entry.previous;
  return {
    index: entry.index,
    screen: entry.screen,
    ...(previous && Number.isSafeInteger(previous.index) && previous.index >= 0 &&
      previous.index < entry.index && validScreen(previous.screen) ? { previous } : {}),
  };
}

function sameScreen(left: AdminScreen, right: AdminScreen) {
  return left.tab === right.tab && left.id === right.id && left.view === right.view &&
    left.editor?.type === right.editor?.type && left.editor?.id === right.editor?.id &&
    left.supportEditor?.kind === right.supportEditor?.kind && left.supportEditor?.id === right.supportEditor?.id;
}

// Store only screen identifiers, never form contents or authentication data.
export function createAdminNavigation(
  history: BrowserHistory,
  href: string,
  onChange: (screen: AdminScreen) => void,
  canLeave: () => boolean,
) {
  let current = readEntry(history.state) ?? { index: 0, screen: defaultAdminScreen };
  let restoring = false;
  let approvedIndex: number | null = null;

  function write(entry: Entry, replace: boolean) {
    const state = history.state && typeof history.state === "object" ? { ...history.state } : {};
    delete state.chikapickAdminDetail;
    state[stateKey] = entry;
    history[replace ? "replaceState" : "pushState"](state, "", href);
    current = entry;
    onChange(entry.screen);
  }

  write(current, true);
  return {
    navigate(screen: AdminScreen, replace = false) {
      if (restoring || approvedIndex !== null || sameScreen(current.screen, screen) || !canLeave()) return;
      write(replace ? { ...current, screen } : {
        index: current.index + 1,
        screen,
        previous: { index: current.index, screen: current.screen },
      }, replace);
    },
    returnTo(screen: AdminScreen) {
      if (restoring || approvedIndex !== null || !canLeave()) return;
      const previous = current.previous;
      if (previous && Number.isSafeInteger(previous.index) && previous.index < current.index && sameScreen(previous.screen, screen)) {
        approvedIndex = previous.index;
        history.go(previous.index - current.index);
      } else {
        write({ ...current, screen }, true);
      }
    },
    pop() {
      const target = readEntry(history.state);
      if (!target) return;
      if (restoring) {
        if (target.index === current.index) restoring = false;
        return;
      }
      const approved = approvedIndex === target.index;
      approvedIndex = null;
      if (!approved && !sameScreen(current.screen, target.screen) && !canLeave()) {
        restoring = true;
        history.go(current.index - target.index);
        return;
      }
      current = target;
      onChange(target.screen);
    },
  };
}
