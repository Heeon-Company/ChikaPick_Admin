"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import Image from "next/image";
import {
  fetchAdminDentalSales,
  fetchAdminMembershipManagement,
  fetchAdminPartnerClinics,
  searchAdminPartnerAccounts,
} from "@/lib/admin-api";
import {
  adminGlobalSearchResultLimit,
  canSearchAdminRecords,
  isAdminSearchEmail,
  matchAdminMenuTabs,
  type AdminGlobalSearchTarget,
} from "@/lib/admin-global-search";
import type { PrimaryAdminTab } from "@/lib/admin-tabs";
import {
  dentalSalesRegionLabel,
  dentalSalesStatusLabel,
  emptyDentalSalesFilters,
} from "@/lib/dental-sales";
import {
  defaultAdminMembershipFilters,
  membershipCategoryLabel,
} from "@/lib/membership-management";

type SearchItem = {
  key: string;
  title: string;
  description?: string;
  target: AdminGlobalSearchTarget;
};

type SearchGroup = {
  id: string;
  label: string;
  items: SearchItem[];
  error?: boolean;
};

type RecordSearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; groups: SearchGroup[] };

const recordSources = [
  {
    id: "dental-sales",
    label: "치과 영업 관리",
    load: async (token: string, query: string): Promise<SearchItem[]> => {
      const payload = await fetchAdminDentalSales(
        token,
        { ...emptyDentalSalesFilters, clinicName: query },
        1,
        adminGlobalSearchResultLimit,
      );
      return payload.items.map((row) => ({
        key: row.id,
        title: row.clinicName,
        description: `${dentalSalesRegionLabel(row.city, row.district)} · ${dentalSalesStatusLabel(row.status)}`,
        target: { kind: "dental-sales", id: row.id },
      }));
    },
  },
  {
    id: "partner-clinics",
    label: "파트너 치과 관리",
    load: async (token: string, query: string): Promise<SearchItem[]> => {
      const payload = await fetchAdminPartnerClinics(
        token,
        query,
        1,
        adminGlobalSearchResultLimit,
      );
      return payload.items.map((row) => ({
        key: row.id,
        title: row.name,
        description: row.address ?? undefined,
        target: { kind: "partner-clinic", id: row.id },
      }));
    },
  },
  {
    id: "partner-accounts",
    label: "파트너스 계정",
    load: async (token: string, query: string): Promise<SearchItem[]> => {
      const payload = await searchAdminPartnerAccounts(token, {
        query,
        page: 1,
        pageSize: adminGlobalSearchResultLimit,
      });
      return payload.items.map((row) => ({
        key: row.id,
        title: row.fullName || row.email || "이름 없음",
        description: [row.email, row.clinicName].filter(Boolean).join(" · ") || undefined,
        target: { kind: "partner-account", query: row.email || row.fullName || query },
      }));
    },
  },
  {
    id: "memberships",
    label: "멤버십 업체",
    load: async (token: string, query: string): Promise<SearchItem[]> => {
      const payload = await fetchAdminMembershipManagement(
        token,
        { ...defaultAdminMembershipFilters, query },
        1,
        adminGlobalSearchResultLimit,
      );
      return payload.items.map((row) => ({
        key: row.id,
        title: row.name,
        description: membershipCategoryLabel(row.category),
        target: { kind: "membership", query: row.name },
      }));
    },
  },
] as const;

export function AdminGlobalSearch({
  accessToken,
  tabs,
  onSelect,
}: {
  accessToken: string;
  tabs: ReadonlyArray<{ id: PrimaryAdminTab; label: string; icon: string }>;
  onSelect: (target: AdminGlobalSearchTarget) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const requestSequenceRef = useRef(0);
  const resultsId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<RecordSearchState>({ status: "idle" });

  const close = useCallback(() => {
    requestSequenceRef.current += 1;
    setIsOpen(false);
    setQuery("");
    setRecords({ status: "idle" });
  }, []);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey)) return;
      if (document.querySelector("dialog[open]")) return;
      event.preventDefault();
      setIsOpen(true);
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [close, isOpen]);

  useEffect(() => {
    const term = query.trim();
    const requestSequence = ++requestSequenceRef.current;
    if (!accessToken || !canSearchAdminRecords(term)) {
      const timer = window.setTimeout(() => setRecords({ status: "idle" }), 0);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(async () => {
      setRecords({ status: "loading" });
      const settled = await Promise.allSettled(
        recordSources.map((source) => source.load(accessToken, term)),
      );
      if (requestSequence !== requestSequenceRef.current) return;
      setRecords({
        status: "done",
        groups: recordSources.map((source, index) => {
          const result = settled[index];
          return result.status === "fulfilled"
            ? { id: source.id, label: source.label, items: result.value }
            : { id: source.id, label: source.label, items: [], error: true };
        }),
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [accessToken, query]);

  const term = query.trim();
  const menuItems: SearchItem[] = matchAdminMenuTabs(tabs, term).map((tab) => ({
    key: tab.id,
    title: tab.label,
    target: { kind: "tab", tab: tab.id },
  }));
  const groups: SearchGroup[] = [
    ...(isAdminSearchEmail(term)
      ? [{
          id: "chikapick-account",
          label: "치카픽 계정",
          items: [{
            key: "email",
            title: term,
            description: "치카픽 계정 조회에서 이메일로 조회",
            target: { kind: "chikapick-account", email: term } as const,
          }],
        }]
      : []),
    ...(menuItems.length ? [{ id: "menu", label: "메뉴", items: menuItems }] : []),
    ...(records.status === "done"
      ? records.groups.filter((group) => group.items.length || group.error)
      : []),
  ];
  const hasRecordResults =
    records.status === "done" && records.groups.some((group) => group.items.length);

  const select = (target: AdminGlobalSearchTarget) => {
    close();
    onSelect(target);
  };

  const moveFocus = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const buttons = Array.from(
      resultsRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? [],
    );
    if (!buttons.length) return;
    event.preventDefault();
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (current === -1) {
      if (event.key === "ArrowDown") buttons[0].focus();
      return;
    }
    const next = current + (event.key === "ArrowDown" ? 1 : -1);
    if (next < 0) inputRef.current?.focus();
    else buttons[Math.min(next, buttons.length - 1)].focus();
  };

  return (
    <div
      ref={rootRef}
      className={`admin-global-search${isOpen ? " is-open" : ""}`}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          close();
          window.setTimeout(() => triggerRef.current?.focus(), 0);
          return;
        }
        moveFocus(event);
      }}
    >
      {isOpen ? (
        <label className="admin-global-search-field">
          <Image src="/Type=Search.svg" alt="" width={20} height={20} />
          <span className="sr-only">어드민 통합 검색</span>
          <input
            ref={inputRef}
            type="search"
            value={query}
            placeholder="메뉴, 치과명, 계정 이메일, 멤버십 업체 검색"
            autoComplete="off"
            aria-controls={resultsId}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          aria-label="검색"
          title="검색 (Ctrl+K)"
          aria-expanded={false}
          onClick={() => setIsOpen(true)}
        >
          <Image src="/Type=Search.svg" alt="" width={24} height={24} />
        </button>
      )}
      {isOpen && term ? (
        <div
          id={resultsId}
          className="admin-global-search-dropdown"
          ref={resultsRef}
          aria-live="polite"
        >
          {groups.map((group) => (
            <section key={group.id} className="admin-global-search-group">
              <h3>{group.label}</h3>
              {group.error ? (
                <p className="admin-global-search-error">검색 결과를 불러오지 못했습니다.</p>
              ) : (
                <ul>
                  {group.items.map((item) => (
                    <li key={item.key}>
                      <button type="button" onClick={() => select(item.target)}>
                        <strong>{item.title}</strong>
                        {item.description ? <span>{item.description}</span> : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
          {!canSearchAdminRecords(term) && !menuItems.length ? (
            <p className="admin-global-search-hint">두 글자 이상 입력하면 데이터도 함께 검색합니다.</p>
          ) : null}
          {records.status === "loading" ? (
            <p className="admin-global-search-hint">검색 중…</p>
          ) : null}
          {records.status === "done" && !hasRecordResults && !menuItems.length &&
          !groups.some((group) => group.error) && !isAdminSearchEmail(term) ? (
            <p className="admin-global-search-hint">검색 결과가 없습니다.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
