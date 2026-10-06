"use client";

import { useEffect, useRef, useState } from "react";
import { updateAdminOwnName } from "@/lib/admin-api";

export function AdminNameEditor({ accessToken, displayName, onSaved }: {
  accessToken: string;
  displayName: string | null;
  onSaved: (name: string) => void;
}) {
  const [isEditing, setEditing] = useState(false);
  const [draft, setDraft] = useState(displayName ?? "");
  const [isSaving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => () => { requestRef.current?.abort(); }, [accessToken]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (requestRef.current) return;
    const name = draft.trim();
    if (!name || name.length > 100) { setMessage("이름을 1~100자로 입력해 주세요."); return; }
    const controller = new AbortController();
    requestRef.current = controller;
    setSaving(true);
    setMessage("");
    try {
      const result = await updateAdminOwnName(accessToken, name, controller.signal);
      if (controller.signal.aborted) return;
      onSaved(result.fullName);
      setEditing(false);
      setMessage(result.message);
    } catch (error) {
      if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "이름 변경에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      if (!controller.signal.aborted) { requestRef.current = null; setSaving(false); }
    }
  }

  return (
    <div className="admin-name-editor">
      {isEditing ? (
        <form onSubmit={(event) => void save(event)}>
          <input aria-label="변경할 이름" autoFocus value={draft} maxLength={100}
            disabled={isSaving} onChange={(event) => setDraft(event.target.value)} />
          <div className="admin-name-editor-buttons">
            <button type="submit" disabled={isSaving}>{isSaving ? "저장 중…" : "저장"}</button>
            <button type="button" disabled={isSaving} onClick={() => { setEditing(false); setMessage(""); }}>취소</button>
          </div>
        </form>
      ) : (
        <div className="admin-name-editor-display">
          <span>{displayName || "-"}</span>
          <button type="button" disabled={!accessToken} onClick={() => { setDraft(displayName ?? ""); setMessage(""); setEditing(true); }}>이름 변경</button>
        </div>
      )}
      {message ? <p role="status">{message}</p> : null}
    </div>
  );
}
