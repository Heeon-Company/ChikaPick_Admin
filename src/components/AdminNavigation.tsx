"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createAdminNavigation, defaultAdminScreen, type AdminScreen } from "@/lib/admin-navigation";
import { formSnapshot, UnsavedChanges } from "@/lib/unsaved-changes";

type Guard = { dirty: boolean; busy: boolean; message?: string };
const defaultMessage = "저장하지 않은 변경 사항은 사라집니다. 이 화면을 나갈까요?";
const GuardContext = createContext<{
  register: (key: object, guard: Guard) => void;
  remove: (key: object) => void;
  canLeave: () => boolean;
} | null>(null);
const NavigationContext = createContext<{
  screen: AdminScreen;
  navigate: (screen: AdminScreen, replace?: boolean) => void;
  returnTo: (screen: AdminScreen) => void;
} | null>(null);

export function AdminNavigationProvider({ children }: { children: ReactNode }) {
  const [screen, setScreen] = useState(defaultAdminScreen);
  const controller = useRef<ReturnType<typeof createAdminNavigation> | null>(null);
  const guards = useRef(new Map<object, Guard>());
  const guardContext = useMemo(() => ({
    register(key: object, guard: Guard) { guards.current.set(key, guard); },
    remove(key: object) { guards.current.delete(key); },
    canLeave() {
      const active = [...guards.current.values()];
      if (active.some((guard) => guard.busy)) return false;
      const dirty = active.find((guard) => guard.dirty);
      return !dirty || window.confirm(dirty.message ?? defaultMessage);
    },
  }), []);

  useEffect(() => {
    const navigation = createAdminNavigation(window.history, window.location.href, setScreen, guardContext.canLeave);
    controller.current = navigation;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (![...guards.current.values()].some((guard) => guard.dirty || guard.busy)) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("popstate", navigation.pop);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("popstate", navigation.pop);
      window.removeEventListener("beforeunload", beforeUnload);
      controller.current = null;
    };
  }, [guardContext]);

  const navigate = useCallback((next: AdminScreen, replace = false) => controller.current?.navigate(next, replace), []);
  const returnTo = useCallback((next: AdminScreen) => controller.current?.returnTo(next), []);
  const value = useMemo(() => ({ screen, navigate, returnTo }), [screen, navigate, returnTo]);
  return <GuardContext value={guardContext}><NavigationContext value={value}>{children}</NavigationContext></GuardContext>;
}

export function useAdminNavigation() {
  const context = useContext(NavigationContext);
  if (!context) throw new Error("AdminNavigationProvider is required");
  return context;
}

export function useUnsavedChanges(value: unknown, {
  ready = true, busy = false, enabled = true, message,
}: { ready?: boolean; busy?: boolean; enabled?: boolean; message?: string } = {}) {
  const context = useContext(GuardContext);
  const [tracker] = useState(() => new UnsavedChanges());
  const saved = useRef(false);
  const snapshot = formSnapshot(value);
  useLayoutEffect(() => {
    if (saved.current) tracker.saved();
    tracker.observe(snapshot, ready);
    if (!busy) saved.current = false;
    if (enabled) context?.register(tracker, { dirty: tracker.dirty, busy: busy && !saved.current, message });
    return () => context?.remove(tracker);
  }, [snapshot, ready, busy, enabled, message, context, tracker]);
  return useCallback(() => {
    saved.current = true;
    tracker.saved();
    context?.remove(tracker);
  }, [context, tracker]);
}
