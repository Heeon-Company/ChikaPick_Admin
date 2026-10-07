import type { PrimaryAdminTab } from "./admin-tabs.ts";

export const adminGlobalSearchMinLength = 2;
export const adminGlobalSearchResultLimit = 5;

export type AdminGlobalSearchTarget =
  | { kind: "tab"; tab: PrimaryAdminTab }
  | { kind: "dental-sales"; id: string }
  | { kind: "partner-clinic"; id: string }
  | { kind: "partner-account"; query: string }
  | { kind: "membership"; query: string }
  | { kind: "chikapick-account"; email: string };

// Query handed from the top search to a list tab. A new key reapplies the same query.
export type AdminSearchHandoff = { query: string; key: number };

function compact(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

export function matchAdminMenuTabs<T extends { label: string }>(tabs: readonly T[], query: string) {
  const needle = compact(query);
  if (!needle) return [];
  return tabs.filter((tab) => compact(tab.label).includes(needle));
}

export function isAdminSearchEmail(query: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query.trim());
}

export function canSearchAdminRecords(query: string) {
  return query.trim().length >= adminGlobalSearchMinLength;
}
