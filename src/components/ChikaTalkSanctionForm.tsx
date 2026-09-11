"use client";

import { useState } from "react";
import { AdminSelect } from "./AdminSelect";
import { adminChikaTalkActionLabel, adminChikaTalkReasonLabel, adminChikaTalkSanctionState, formatAdminChikaTalkDate, type AdminChikaTalkModerationActionName, type AdminChikaTalkReportDetailPayload } from "@/lib/chika-talk-moderation";

export type ChikaTalkActionDetails = { reasonCode: string; detailedReason: string; userMessage: string; suspensionSeconds?: number };

export function ChikaTalkSanctionForm({ detail, pending, onAction }: {
  detail: AdminChikaTalkReportDetailPayload;
  pending: boolean;
  onAction: (action: AdminChikaTalkModerationActionName, details?: ChikaTalkActionDetails) => Promise<void>;
}) {
  const [action, setAction] = useState<AdminChikaTalkModerationActionName>("warn_user");
  const [reasonCode, setReasonCode] = useState<string>(detail.report.reason);
  const [detailedReason, setDetailedReason] = useState("");
  const [userMessage, setUserMessage] = useState("");
  const [days, setDays] = useState(7);
  const release = action === "release_sanctions";
  const restore = action === "restore_content";
  const timed = action === "suspend_writes" || action === "suspend_access";
  const sanctions = detail.sanctions;
  const restriction = adminChikaTalkSanctionState(sanctions);
  const options: {value: AdminChikaTalkModerationActionName;label:string}[] = [
    {value:"warn_user",label:"경고"}, {value:"suspend_writes",label:"글쓰기 제한"},
    {value:"suspend_access",label:"치아톡 이용 제한"}, {value:"ban_user",label:"영구 이용 제한"},
    ...(restriction.active ? [{value:"release_sanctions" as const,label:"제재 해제"}] : []),
    ...(detail.current?.status === "hidden" ? [{value:"restore_content" as const,label:"콘텐츠 복원"}] : []),
  ];
  return <section className="admin-chika-sanction" aria-label="사용자 제재 관리">
    <h3>사용자 제재 관리</h3>
    <div className="admin-chika-sanction-summary">
      <strong>{detail.author?.displayName ?? "확인할 수 없는 사용자"}</strong>
      <span>사용자 ID: {detail.report.targetAuthorUserId ? `${detail.report.targetAuthorUserId.slice(0,4)}***${detail.report.targetAuthorUserId.slice(-4)}` : "-"}</span>
      <span>가입일: {detail.author?.joinedAt ? formatAdminChikaTalkDate(detail.author.joinedAt) : "확인 불가"}</span>
      <span>연령 구분: {detail.author?.ageGroup ?? "확인 불가"}</span>
      <span>이용 상태: {restriction.label}</span>
      <span>누적 신고: {detail.author?.reportCount ?? 0}건</span>
      <span>누적 경고·제재: {String(sanctions?.strike_count ?? 0)}회</span>
      <span>제한 종료: {restriction.until ? formatAdminChikaTalkDate(restriction.until) + " (한국시간)" : "-"}</span>
    </div>
    {detail.report.targetAuthorUserId ? <form onSubmit={event => {
      event.preventDefault();
      if (pending || !detailedReason.trim() || !userMessage.trim()) return;
      if (!window.confirm(`${adminChikaTalkActionLabel(action)} 처리하시겠습니까? 사용자에게 안내 알림이 전달됩니다.`)) return;
      void onAction(action, {reasonCode: release ? "sanction_released" : restore ? "content_restored" : reasonCode, detailedReason: detailedReason.trim(), userMessage: userMessage.trim(), ...(timed ? {suspensionSeconds: days * 86400} : {})});
    }}>
      <fieldset disabled={pending}>
        <AdminSelect label="제재 유형 선택" value={action} options={options} onChange={value => { setAction(value); setDetailedReason(""); setUserMessage(""); }} />
        <label>연관 신고 번호<input readOnly value={detail.report.id} /></label>
        {!release && !restore && <AdminSelect label="제재 사유 분류" value={reasonCode} onChange={setReasonCode} options={["advertising_promotion","abuse_defamation","personal_information","medical_misinformation","diagnosis_treatment_directive","medical_impersonation","other"].map(value => ({value,label:adminChikaTalkReasonLabel(value)}))} />}
        <label>{release ? "해제 사유" : restore ? "복원 사유" : "상세 사유"} *<textarea required maxLength={2000} value={detailedReason} onChange={e => setDetailedReason(e.target.value)} placeholder="운영 판단의 근거를 남겨 주세요. 사용자에게 공개되지 않습니다." /></label>
        {timed && <div><p>제재 기간 · 적용 즉시 시작</p><div className="admin-chika-sanction-days">{[1,3,7,14,30].map(value => <button type="button" key={value} aria-pressed={days === value} onClick={() => setDays(value)}>{value}일</button>)}</div><label>제한 일수<input type="number" min={1} max={365} required value={days} onChange={e => setDays(Number(e.target.value))} /></label></div>}
        <label>사용자 안내 메시지 *<textarea required maxLength={2000} value={userMessage} onChange={e => setUserMessage(e.target.value)} placeholder="앱 내 알림으로 전달할 내용을 입력하세요." /></label>
        <p>누적 제재에 따른 기존 단계별 제한이 함께 적용됩니다. 해제해도 이전 처리 이력과 누적 횟수는 보존됩니다.</p>
        <button className={release || restore ? "is-release" : "is-sanction"} type="submit" disabled={pending || !detailedReason.trim() || !userMessage.trim()}>{pending ? "처리 중…" : release || restore ? "변경 사항 저장" : "제재 적용"}</button>
      </fieldset>
    </form> : <p>탈퇴했거나 확인할 수 없는 사용자는 제재할 수 없습니다.</p>}
    <h4>사용자 처리 이력</h4>
    {detail.authorActions.length === 0 ? <p>처리 이력이 없습니다.</p> : detail.authorActions.map(item => <article key={item.id}>
      <strong>{adminChikaTalkActionLabel(item.action)}</strong> <time>{formatAdminChikaTalkDate(item.createdAt)}</time>
      <p>{adminChikaTalkReasonLabel(item.reasonCode)}</p>
      {item.detailedReason && <p>상세 사유: {item.detailedReason}</p>}
      {item.userMessage && <p>사용자 안내: {item.userMessage}</p>}
    </article>)}
  </section>;
}
