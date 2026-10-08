"use client";

import { useEffect, useState } from "react";

// 앱 노출 승인 switch. Without onChange it only shows the state. A failed
// change (for example hospital info still missing) shows its reason as a toast.
export function AppVisibilitySwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange?: (next: boolean) => Promise<string>;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; isError: boolean } | null>(
    null,
  );

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function toggle() {
    if (!onChange || isSaving) return;
    setIsSaving(true);
    try {
      const message = await onChange(!checked);
      setToast({ message, isError: false });
    } catch (error) {
      setToast({
        // The request id suffix helps support, not a toast.
        message:
          error instanceof Error
            ? error.message.replace(/\s*\(요청 ID:[^)]*\)\s*$/, "")
            : "앱 노출 상태를 바꾸지 못했습니다.",
        isError: true,
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label="앱 노출 승인 상태"
        className={`admin-app-visibility-switch${checked ? " is-active" : ""}`}
        disabled={!onChange || isSaving}
        onClick={() => void toggle()}
      >
        <i />
      </button>
      {toast ? (
        <div
          className={`admin-sales-toast${toast.isError ? " admin-sales-toast--error" : ""}`}
          role="status"
        >
          {toast.message}
        </div>
      ) : null}
    </>
  );
}
