"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminNavigation, useUnsavedChanges } from "@/components/AdminNavigation";
import { supportDraftForSelection } from "@/lib/support-content";
import { AdminSelect } from "./AdminSelect";
import {
  fetchAdminSupportContent,
  saveAdminSupportContent,
} from "@/lib/admin-api";
import type { SupportContent, SupportMutation } from "@/lib/support-content";

export function SupportManagementTab({ accessToken }: { accessToken: string }) {
  const [data, setData] = useState<SupportContent | null>(null);
  const { screen, navigate, returnTo } = useAdminNavigation();
  const tab = screen.view === "faq" ? "faq" : "announcements";
  const setTab = (view: "announcements" | "faq") => navigate({
    tab: "support-management", ...(view === "faq" ? { view } : {}),
  });
  const listScreen = { tab: "support-management", ...(tab === "faq" ? { view: "faq" as const } : {}) } as const;
  const draft = useMemo(() => data && screen.supportEditor
    ? supportDraftForSelection(data, screen.supportEditor) : null, [data, screen.supportEditor]);
  const [feedbackUrl, setFeedbackUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await fetchAdminSupportContent(accessToken);
      setData(payload);
      setFeedbackUrl(payload.feedbackFormUrl ?? "");
    } catch {
      setError("고객지원 정보를 불러오지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function save(mutation: SupportMutation) {
    if (saving) return false;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await saveAdminSupportContent(accessToken, mutation);
      setMessage("저장했습니다. 공개된 내용은 앱에서 다음에 열 때 반영됩니다.");
      await load();
      markSettingsSaved();
      return true;
    } catch (cause) {
      setError(
        cause instanceof Error && /[가-힣]/.test(cause.message)
          ? cause.message
          : "저장하지 못했습니다. 입력 내용은 유지됩니다.",
      );
      return false;
    } finally {
      setSaving(false);
    }
  }

  function edit(value: Exclude<SupportMutation, { kind: "settings" }>) {
    const existing = data && supportDraftForSelection(data, { kind: value.kind, id: value.record.id });
    navigate({ ...listScreen, supportEditor: { kind: value.kind, id: value.record.id, isNew: !existing } });
    setError("");
    setMessage("");
  }

  const markSettingsSaved = useUnsavedChanges(feedbackUrl, {
    ready: !!data && !loading, busy: saving, enabled: !draft,
  });

  const unavailable = !loading && !!screen.supportEditor && !draft;

  if (!data)
    return (
      <section className="support-management">
        {loading ? (
          <p role="status">불러오는 중...</p>
        ) : (
          <>
            <p role="alert">{error}</p>
            <button onClick={() => void load()}>다시 불러오기</button>
          </>
        )}
      </section>
    );

  return (
    <section className="support-management" aria-label="고객지원 관리">
      <div className="support-toolbar">
        <div className="support-tabs" aria-label="콘텐츠 종류">
          <button
            aria-pressed={tab === "announcements"}
            disabled={saving || !!draft}
            onClick={() => {
              setTab("announcements");
              setMessage("");
            }}
          >
            공지사항
          </button>
          <button
            aria-pressed={tab === "faq"}
            disabled={saving || !!draft}
            onClick={() => {
              setTab("faq");
              setMessage("");
            }}
          >
            FAQ
          </button>
        </div>
        <button
          disabled={saving || loading || !!draft}
          onClick={() => void load()}
        >
          새로고침
        </button>
      </div>
      {(error || unavailable) && (
        <p className="support-error" role="alert">
          {error || "선택한 항목을 찾을 수 없습니다. 목록에서 다시 선택해 주세요."}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {draft ? (
        <SupportEditor
          key={`${draft.kind}-${draft.record.id}`}
          initial={draft}
          data={data}
          saving={saving}
          onSave={save}
          onCancel={() => returnTo(listScreen)}
        />
      ) : (
        <>
          {tab === "announcements" ? (
            <div className="support-card">
              <div className="support-toolbar">
                <h2>공지사항</h2>
                <button
                  className="support-primary"
                  disabled={saving}
                  onClick={() =>
                    edit({
                      kind: "announcement",
                      record: {
                        id: crypto.randomUUID(),
                        title: "",
                        body: "",
                        is_active: false,
                      },
                    })
                  }
                >
                  공지 추가
                </button>
              </div>
              <p>
                공개하면 앱에 표시됩니다. 비공개로 저장해 내용을 먼저 검토할 수
                있습니다.
              </p>
              {data.announcements.length === 0 && (
                <p>등록된 공지사항이 없습니다.</p>
              )}
              {data.announcements.map((item) => (
                <div className="support-row" key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <small>
                      {item.is_active ? "공개" : "비공개"} ·{" "}
                      {new Date(item.published_at).toLocaleDateString("ko-KR", {
                        timeZone: "Asia/Seoul",
                      })}
                    </small>
                  </div>
                  <button
                    disabled={saving}
                    onClick={() => edit({ kind: "announcement", record: item })}
                  >
                    수정
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="support-card">
                <div className="support-toolbar">
                  <h2>카테고리</h2>
                  <button
                    disabled={saving}
                    onClick={() =>
                      edit({
                        kind: "category",
                        record: {
                          id: crypto.randomUUID(),
                          title: "",
                          display_order: data.categories.length,
                          is_active: false,
                        },
                      })
                    }
                  >
                    카테고리 추가
                  </button>
                </div>
                <p>
                  순서가 작은 항목부터 표시됩니다. 카테고리를 비공개로 바꾸면
                  소속 질문도 앱에서 숨겨집니다.
                </p>
                {data.categories.length === 0 && (
                  <p>먼저 카테고리를 추가해 주세요.</p>
                )}
                {data.categories.map((item) => (
                  <div className="support-row" key={item.id}>
                    <div>
                      <strong>{item.title}</strong>
                      <small>
                        {item.is_active ? "공개" : "비공개"} · 순서{" "}
                        {item.display_order}
                      </small>
                    </div>
                    <button
                      disabled={saving}
                      onClick={() => edit({ kind: "category", record: item })}
                    >
                      수정
                    </button>
                  </div>
                ))}
              </div>
              <div className="support-card">
                <div className="support-toolbar">
                  <h2>질문과 답변</h2>
                  <button
                    className="support-primary"
                    disabled={saving || !data.categories.length}
                    onClick={() =>
                      edit({
                        kind: "faq",
                        record: {
                          id: crypto.randomUUID(),
                          category_id: data.categories[0].id,
                          question: "",
                          answer: "",
                          display_order: data.faqs.length,
                          is_active: false,
                        },
                      })
                    }
                  >
                    질문 추가
                  </button>
                </div>
                {data.faqs.length === 0 && <p>등록된 질문이 없습니다.</p>}
                {data.faqs.map((item) => (
                  <div className="support-row" key={item.id}>
                    <div>
                      <strong>{item.question}</strong>
                      <small>
                        {
                          data.categories.find(
                            (category) => category.id === item.category_id,
                          )?.title
                        }{" "}
                        · {item.is_active ? "공개" : "비공개"} · 순서{" "}
                        {item.display_order}
                      </small>
                    </div>
                    <button
                      disabled={saving}
                      onClick={() => edit({ kind: "faq", record: item })}
                    >
                      수정
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
          <form
            className="support-card"
            onSubmit={(event) => {
              event.preventDefault();
              void save({
                kind: "settings",
                record: { feedback_form_url: feedbackUrl.trim() || null },
              });
            }}
          >
            <h2>의견 보내기 연결</h2>
            <p>
              Google Forms의 응답자용 공유 링크를 입력해 주세요. 비워 두면 앱에
              연결 준비 중 안내가 표시됩니다.
            </p>
            <label>
              설문 링크
              <input
                type="url"
                value={feedbackUrl}
                maxLength={2048}
                disabled={saving}
                onChange={(event) => setFeedbackUrl(event.target.value)}
                placeholder="https://forms.gle/..."
              />
            </label>
            <div className="support-actions">
              {data.feedbackFormUrl && (
                <a
                  href={data.feedbackFormUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  저장된 설문 열기 ↗
                </a>
              )}
              <button
                disabled={
                  saving || feedbackUrl.trim() === (data.feedbackFormUrl ?? "")
                }
              >
                {saving ? "저장 중..." : "링크 저장"}
              </button>
            </div>
          </form>
        </>
      )}
    </section>
  );
}

type ContentDraft = Exclude<SupportMutation, { kind: "settings" }>;
function SupportEditor({
  initial,
  data,
  saving,
  onSave,
  onCancel,
}: {
  initial: ContentDraft;
  data: SupportContent;
  saving: boolean;
  onSave: (value: SupportMutation) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const markSaved = useUnsavedChanges(draft, { busy: saving });
  const record = draft.record;
  function update(fields: Record<string, string | boolean | number>) {
    setDraft(
      (previous) =>
        ({
          ...previous,
          record: { ...previous.record, ...fields },
        }) as ContentDraft,
    );
  }
  const title =
    draft.kind === "faq" ? draft.record.question : draft.record.title;
  const body =
    draft.kind === "announcement"
      ? draft.record.body
      : draft.kind === "faq"
        ? draft.record.answer
        : "";
  return (
    <form
      className="support-card"
      onSubmit={(event) => {
        event.preventDefault();
        void onSave(draft).then((success) => {
          if (success) { markSaved(); onCancel(); }
        });
      }}
    >
      <h2>
        {draft.kind === "announcement"
          ? "공지사항"
          : draft.kind === "category"
            ? "카테고리"
            : "FAQ"}{" "}
        편집
      </h2>
      <fieldset disabled={saving}>
        {draft.kind === "faq" && (
          <AdminSelect
            label="카테고리"
            value={draft.record.category_id}
            options={data.categories.map((item) => ({
              value: item.id,
              label: `${item.title}${item.is_active ? "" : " (비공개)"}`,
            }))}
            onChange={(value) => update({ category_id: value })}
          />
        )}
        <label>
          {draft.kind === "faq" ? "질문" : "제목"}
          <input
            required
            maxLength={draft.kind === "category" ? 100 : 200}
            value={title}
            onChange={(event) =>
              update({
                [draft.kind === "faq" ? "question" : "title"]:
                  event.target.value,
              })
            }
          />
        </label>
        {draft.kind !== "category" && (
          <label>
            {draft.kind === "faq" ? "답변" : "내용"}
            <textarea
              required
              rows={9}
              maxLength={draft.kind === "faq" ? 10000 : 20000}
              value={body}
              onChange={(event) =>
                update({
                  [draft.kind === "faq" ? "answer" : "body"]:
                    event.target.value,
                })
              }
            />
          </label>
        )}
        {draft.kind !== "announcement" && (
          <label>
            표시 순서
            <input
              type="number"
              required
              min={0}
              max={100000}
              step={1}
              value={draft.record.display_order}
              onChange={(event) =>
                update({ display_order: Number(event.target.value) })
              }
            />
          </label>
        )}
        <label className="support-check">
          <input
            type="checkbox"
            checked={record.is_active}
            onChange={(event) => update({ is_active: event.target.checked })}
          />
          앱에 공개
        </label>
        <aside className="support-preview" aria-label="내용 미리보기">
          <small>
            내용 미리보기 ·{" "}
            {record.is_active ? "저장 후 공개" : "저장 후 비공개"}
          </small>
          <h3>{title || "제목을 입력해 주세요"}</h3>
          {body && <p>{body}</p>}
        </aside>
        <div className="support-actions">
          <button type="button" onClick={onCancel}>
            취소
          </button>
          <button className="support-primary" type="submit">
            {saving
              ? "저장 중..."
              : record.is_active
                ? "공개 저장"
                : "비공개 저장"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
