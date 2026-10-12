"use client";

import { useEffect, useRef, useState } from "react";
import { updateAdminOwnContactPhone } from "@/lib/admin-api";
import { formatPartnerSalesInquiryPhone } from "@/lib/partner-sales-inquiries";

// Shown in the Partners header of clinics this admin is assigned to.
export function AdminContactPhoneEditor({ accessToken, contactPhone, onSaved }: {
  accessToken: string;
  contactPhone: string | null;
  onSaved: (contactPhone: string | null) => void;
}) {
  const [isEditing, setEditing] = useState(false);
  const [draft, setDraft] = useState(contactPhone ?? "");
  const [isSaving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => () => { requestRef.current?.abort(); }, [accessToken]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (requestRef.current) return;
    const digits = draft.replace(/[\s-]/g, "");
    if (digits && !/^0\d{8,10}$/.test(digits)) { setMessage("연락처를 숫자 9~11자리로 입력해 주세요."); return; }
    const controller = new AbortController();
    requestRef.current = controller;
    setSaving(true);
    setMessage("");
    try {
      const result = await updateAdminOwnContactPhone(accessToken, digits, controller.signal);
      if (controller.signal.aborted) return;
      onSaved(result.contactPhone);
      setEditing(false);
      setMessage(result.message);
    } catch (error) {
      if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "연락처 저장에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      if (!controller.signal.aborted) { requestRef.current = null; setSaving(false); }
    }
  }

  return (
    <div className="admin-name-editor">
      {isEditing ? (
        <form onSubmit={(event) => void save(event)}>
          <input aria-label="연락처" autoFocus inputMode="tel" placeholder="010-0000-0000" value={draft} maxLength={13}
            disabled={isSaving} onChange={(event) => setDraft(event.target.value)} />
          <div className="admin-name-editor-buttons">
            <button type="submit" disabled={isSaving}>{isSaving ? "저장 중…" : "저장"}</button>
            <button type="button" disabled={isSaving} onClick={() => { setEditing(false); setMessage(""); }}>취소</button>
          </div>
        </form>
      ) : (
        <div className="admin-name-editor-display">
          <span>{contactPhone ? formatPartnerSalesInquiryPhone(contactPhone) : "-"}</span>
          <button type="button" disabled={!accessToken} onClick={() => { setDraft(contactPhone ? formatPartnerSalesInquiryPhone(contactPhone) : ""); setMessage(""); setEditing(true); }}>{contactPhone ? "연락처 변경" : "연락처 등록"}</button>
        </div>
      )}
      <p className="admin-contact-phone-hint">담당 병원의 파트너스 상단에 이름과 함께 표시돼요.</p>
      {message ? <p role="status">{message}</p> : null}
    </div>
  );
}
