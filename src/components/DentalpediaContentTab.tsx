"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AdminSelect } from "@/components/AdminSelect";
import { InformationUploadTab } from "@/components/InformationUploadTab";
import {
  fetchAdminDentalpediaCategories,
  fetchAdminDentalpediaContent,
  manageAdminDentalpediaContent,
} from "@/lib/admin-api";
import type { AdminDentalpediaCategory } from "@/lib/dentalpedia-category";
import {
  dentalpediaContentDate,
  dentalpediaStatusLabels,
  dentalpediaTypeLabels,
  type AdminDentalpediaContent,
  type AdminDentalpediaContentPayload,
  type DentalpediaContentFilters,
  type DentalpediaContentSelection,
} from "@/lib/dentalpedia-content";

const defaultFilters: DentalpediaContentFilters = {
  type: "all",
  status: "all",
  category: "",
  search: "",
  page: 1,
};
type ManagementAction = {
  item: AdminDentalpediaContent;
  action: "archive" | "delete";
};

export function DentalpediaContentTab({
  accessToken,
  editor,
  onEditorChange,
}: {
  accessToken: string;
  editor: DentalpediaContentSelection | null;
  onEditorChange: (editor: DentalpediaContentSelection | null) => void;
}) {
  const [filters, setFilters] = useState(defaultFilters);
  const [search, setSearch] = useState("");
  const [payload, setPayload] = useState<AdminDentalpediaContentPayload | null>(
    null,
  );
  const [categories, setCategories] = useState<AdminDentalpediaCategory[]>([]);
  const [categoryError, setCategoryError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<ManagementAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) =>
        current.search === search.trim()
          ? current
          : { ...current, search: search.trim(), page: 1 },
      );
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (editor) return;
    let active = true;
    fetchAdminDentalpediaCategories(accessToken)
      .then(({ categories }) => {
        if (active) {
          setCategories(categories);
          setCategoryError(false);
        }
      })
      .catch(() => {
        if (active) setCategoryError(true);
      });
    return () => {
      active = false;
    };
  }, [accessToken, editor, refresh]);

  useEffect(() => {
    if (editor) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setLoadError(null);
    }, 0);
    fetchAdminDentalpediaContent(accessToken, filters, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        window.clearTimeout(timer);
        const lastPage = Math.max(1, Math.ceil(result.total / result.pageSize));
        if (filters.page > lastPage) {
          setFilters((current) => ({ ...current, page: lastPage }));
          return;
        }
        setPayload(result);
        setLoadError(null);
        setLoading(false);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        window.clearTimeout(timer);
        setLoadError(
          error instanceof Error
            ? error.message
            : "콘텐츠를 불러오지 못했습니다.",
        );
        setLoading(false);
      });
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [accessToken, filters, refresh, editor]);

  function changeFilters(next: Partial<DentalpediaContentFilters>) {
    setLoading(true);
    setFilters((current) => ({ ...current, ...next, page: next.page ?? 1 }));
  }

  async function confirmAction() {
    if (!pending || busy) return;
    setBusy(true);
    setActionError(null);
    try {
      const result = await manageAdminDentalpediaContent(
        accessToken,
        pending.item,
        pending.action,
      );
      setNotice(result.message);
      setPending(null);
      setLoading(true);
      setRefresh((value) => value + 1);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "콘텐츠를 변경하지 못했습니다. 다시 시도해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (editor) {
    return (
      <InformationUploadTab
        key={`${editor.type}:${editor.id ?? "new"}`}
        accessToken={accessToken}
        initialType={editor.type}
        initialContentId={editor.id}
        startNew
        onBack={() => onEditorChange(null)}
        onSaved={(message) => {
          setNotice(message);
          setLoading(true);
          onEditorChange(null);
        }}
      />
    );
  }

  const pageCount = Math.max(
    1,
    Math.ceil((payload?.total ?? 0) / (payload?.pageSize ?? 10)),
  );
  const pageStart = Math.max(1, Math.min(filters.page - 2, pageCount - 4));
  const pages = Array.from(
    { length: Math.min(5, pageCount) },
    (_, index) => pageStart + index,
  );
  const isEmpty = !loading && !loadError && payload?.items.length === 0;
  const hasFilters = Boolean(
    filters.search ||
    filters.category ||
    filters.type !== "all" ||
    filters.status !== "all",
  );

  return (
    <section
      className="admin-dentalpedia-directory"
      aria-label="치카피디아 콘텐츠 관리"
    >
      <header className="admin-dentalpedia-directory-heading">
        <div>
          <h1>치카피디아</h1>
          <p>치카피디아에 등록된 콘텐츠를 확인하고 관리합니다.</p>
        </div>
        <button
          className="admin-dentalpedia-create"
          type="button"
          onClick={() =>
            onEditorChange({
              type: filters.type === "all" ? "video" : filters.type,
            })
          }
        >
          <Image
            alt=""
            src="/dentalpedia/content-plus.svg"
            width={16}
            height={24}
          />
          신규 콘텐츠 생성
        </button>
      </header>
      <div className="admin-dentalpedia-directory-body">
        <div
          className="admin-dentalpedia-type-filters"
          role="group"
          aria-label="콘텐츠 유형"
        >
          {(["all", "video", "post", "article"] as const).map((type) => (
            <button
              type="button"
              key={type}
              aria-pressed={filters.type === type}
              onClick={() => changeFilters({ type })}
            >
              {type === "all" ? "전체 콘텐츠" : dentalpediaTypeLabels[type]}
            </button>
          ))}
        </div>
        <div
          className="admin-dentalpedia-status-filters"
          role="group"
          aria-label="노출 상태"
        >
          {(
            ["all", "published", "scheduled", "draft", "archived"] as const
          ).map((status) => (
            <button
              type="button"
              key={status}
              aria-pressed={filters.status === status}
              onClick={() => changeFilters({ status })}
            >
              {status === "all" ? "전체" : dentalpediaStatusLabels[status]}
            </button>
          ))}
        </div>
        <div className="admin-dentalpedia-search-row">
          <label className="admin-dentalpedia-search">
            <Image
              alt=""
              src="/dentalpedia/content-search.svg"
              width={24}
              height={24}
            />
            <input
              aria-label="콘텐츠 제목 검색"
              placeholder="콘텐츠 제목을 검색하세요"
              value={search}
              maxLength={120}
              onChange={(event) => setSearch(event.target.value)}
              type="search"
            />
          </label>
          <AdminSelect
            className="admin-dentalpedia-category"
            label="카테고리"
            value={filters.category}
            onChange={(category) => changeFilters({ category })}
            options={[
              { label: "전체 카테고리", value: "" },
              ...categories.map((category) => ({
                label: category.displayName,
                value: category.code,
              })),
            ]}
          />
        </div>
        {categoryError ? (
          <p role="alert" className="admin-dentalpedia-feedback">
            카테고리를 불러오지 못했습니다.{" "}
            <button
              type="button"
              onClick={() => setRefresh((value) => value + 1)}
            >
              다시 시도
            </button>
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="admin-dentalpedia-feedback is-success">
            {notice}
            <button
              aria-label="알림 닫기"
              type="button"
              onClick={() => setNotice(null)}
            >
              ×
            </button>
          </p>
        ) : null}
        <div
          className={
            isEmpty
              ? "admin-dentalpedia-empty-state"
              : "admin-dentalpedia-table-scroll"
          }
          tabIndex={isEmpty ? undefined : 0}
          role="region"
          aria-label="콘텐츠 목록"
          aria-busy={loading}
        >
          {isEmpty ? (
            <>
              <span className="admin-dentalpedia-empty-icon" aria-hidden="true">
                <Image
                  alt=""
                  src="/dentalpedia/content-empty.svg"
                  width={40}
                  height={40}
                />
              </span>
              <div className="admin-dentalpedia-empty-copy" role="status">
                <h2>
                  {hasFilters
                    ? "검색 조건에 맞는 콘텐츠가 없습니다."
                    : "아직 등록된 콘텐츠가 없습니다."}
                </h2>
                <p>
                  {hasFilters
                    ? "검색어나 필터를 변경해 보세요."
                    : "치카피디아에 노출할 콘텐츠를 만들어보세요."}
                </p>
              </div>
            </>
          ) : (
            <table className="admin-dentalpedia-table">
              <colgroup>
                <col className="content-spacer" />
                <col />
                <col className="content-type" />
                <col className="content-category" />
                <col className="content-status" />
                <col className="content-exposure" />
                <col className="content-date" />
                <col className="content-date" />
                <col className="content-actions" />
              </colgroup>
              <thead>
                <tr>
                  <th aria-label="여백" />
                  <th scope="col">콘텐츠</th>
                  <th scope="col">유형</th>
                  <th scope="col">카테고리</th>
                  <th scope="col">노출 상태</th>
                  <th scope="col">추가 노출</th>
                  <th scope="col">게시일</th>
                  <th scope="col">최종 수정</th>
                  <th scope="col">관리</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="admin-dentalpedia-empty"
                      role="status"
                    >
                      콘텐츠를 불러오는 중...
                    </td>
                  </tr>
                ) : loadError ? (
                  <tr>
                    <td colSpan={9} className="admin-dentalpedia-empty">
                      <p role="alert">{loadError}</p>
                      <button
                        type="button"
                        onClick={() => setRefresh((value) => value + 1)}
                      >
                        다시 시도
                      </button>
                    </td>
                  </tr>
                ) : (
                  payload?.items.map((item) => (
                    <tr key={`${item.type}:${item.id}`}>
                      <td />
                      <td>
                        <button
                          className="admin-dentalpedia-content-title"
                          type="button"
                          onClick={() =>
                            onEditorChange({ type: item.type, id: item.id })
                          }
                          aria-label={`${item.title} 확인 및 수정`}
                        >
                          <span title={item.title}>{item.title}</span>
                        </button>
                      </td>
                      <td>{dentalpediaTypeLabels[item.type]}</td>
                      <td>{item.categoryLabel}</td>
                      <td>
                        <span
                          className={`admin-dentalpedia-status is-${item.displayStatus}`}
                        >
                          {dentalpediaStatusLabels[item.displayStatus]}
                        </span>
                        {item.visibilityNote ? (
                          <small className="admin-dentalpedia-visibility-note">
                            {item.visibilityNote}
                          </small>
                        ) : null}
                      </td>
                      <td>
                        <div className="admin-dentalpedia-exposure">
                          {item.isRecommended ? <span>추천</span> : null}
                          {item.homeVisible ? (
                            <span className="is-home">홈</span>
                          ) : null}
                          {!item.isRecommended && !item.homeVisible
                            ? "-"
                            : null}
                        </div>
                      </td>
                      <td>{dentalpediaContentDate(item.publishAt)}</td>
                      <td>{dentalpediaContentDate(item.updatedAt)}</td>
                      <td>
                        <ContentActions
                          item={item}
                          onEdit={() =>
                            onEditorChange({ type: item.type, id: item.id })
                          }
                          onAction={(action) => {
                            setActionError(null);
                            setPending({ item, action });
                          }}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
        {!isEmpty ? (
          <nav
            className="admin-dentalpedia-pagination"
            aria-label="콘텐츠 목록 페이지"
          >
            <button
              type="button"
              aria-label="이전 페이지"
              disabled={loading || filters.page <= 1}
              onClick={() => changeFilters({ page: filters.page - 1 })}
            >
              <Image
                alt=""
                src="/dentalpedia/content-prev.svg"
                width={24}
                height={24}
              />
            </button>
            {pages.map((page) => (
              <button
                key={page}
                type="button"
                aria-label={`${page}페이지`}
                aria-current={page === filters.page ? "page" : undefined}
                disabled={loading}
                onClick={() => changeFilters({ page })}
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              aria-label="다음 페이지"
              disabled={loading || filters.page >= pageCount}
              onClick={() => changeFilters({ page: filters.page + 1 })}
            >
              <Image
                alt=""
                src="/dentalpedia/content-next.svg"
                width={24}
                height={24}
              />
            </button>
          </nav>
        ) : null}
      </div>
      {pending ? (
        <ContentActionDialog
          pending={pending}
          busy={busy}
          error={actionError}
          onConfirm={() => void confirmAction()}
          onClose={() => {
            if (!busy) setPending(null);
          }}
        />
      ) : null}
    </section>
  );
}

function ContentActions({
  item,
  onEdit,
  onAction,
}: {
  item: AdminDentalpediaContent;
  onEdit: () => void;
  onAction: (action: "archive" | "delete") => void;
}) {
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!position) return;
    menu.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const close = () => setPosition(null);
    const pointer = (event: PointerEvent) => {
      if (
        !menu.current?.contains(event.target as Node) &&
        !trigger.current?.contains(event.target as Node)
      )
        close();
    };
    document.addEventListener("pointerdown", pointer);
    window.addEventListener("resize", close);
    document.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("pointerdown", pointer);
      window.removeEventListener("resize", close);
      document.removeEventListener("scroll", close, true);
    };
  }, [position]);

  function close() {
    setPosition(null);
    trigger.current?.focus();
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="admin-dentalpedia-more"
        aria-label={`${item.title} 관리`}
        aria-haspopup="menu"
        aria-expanded={Boolean(position)}
        aria-controls={position ? menuId : undefined}
        onClick={() => {
          if (position) {
            close();
            return;
          }
          const rect = trigger.current!.getBoundingClientRect();
          setPosition({
            top: Math.max(
              8,
              Math.min(rect.bottom + 4, window.innerHeight - 160),
            ),
            left: Math.max(8, rect.right - 160),
          });
        }}
      >
        <Image
          alt=""
          src="/dentalpedia/content-more.svg"
          width={20}
          height={20}
        />
      </button>
      {position
        ? createPortal(
            <div
              ref={menu}
              id={menuId}
              role="menu"
              aria-label={`${item.title} 관리`}
              className="admin-dentalpedia-menu"
              style={position}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  close();
                }
                if (event.key === "Tab") {
                  close();
                }
                if (
                  ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)
                ) {
                  event.preventDefault();
                  const buttons = Array.from(
                    menu.current!.querySelectorAll<HTMLButtonElement>(
                      "button:not(:disabled)",
                    ),
                  );
                  const index = buttons.indexOf(
                    document.activeElement as HTMLButtonElement,
                  );
                  const next =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? buttons.length - 1
                        : (index +
                            (event.key === "ArrowDown" ? 1 : -1) +
                            buttons.length) %
                          buttons.length;
                  buttons[next]?.focus();
                }
              }}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  close();
                  onEdit();
                }}
              >
                수정하기
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={item.status === "archived"}
                onClick={() => {
                  close();
                  onAction("archive");
                }}
              >
                보관하기
              </button>
              <button
                type="button"
                role="menuitem"
                className="is-danger"
                onClick={() => {
                  close();
                  onAction("delete");
                }}
              >
                삭제하기
              </button>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function ContentActionDialog({
  pending,
  busy,
  error,
  onConfirm,
  onClose,
}: {
  pending: ManagementAction;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const contentTitleId = useId();
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  const deleting = pending.action === "delete";
  return (
    <dialog
      ref={dialog}
      className={`admin-dentalpedia-action-dialog${deleting ? " is-delete" : ""}`}
      aria-labelledby={titleId}
      aria-describedby={`${contentTitleId} ${descriptionId}`}
      aria-busy={busy}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="admin-dentalpedia-action-body">
        <span className="admin-dentalpedia-action-icon" aria-hidden="true">
          <Image
            alt=""
            src={`/dentalpedia/content-${deleting ? "delete" : "archive"}-info.svg`}
            width={28}
            height={28}
          />
        </span>
        <div className="admin-dentalpedia-action-copy">
          <h2 id={titleId}>
            {deleting
              ? "콘텐츠를 삭제하시겠습니까?"
              : "콘텐츠를 보관하시겠습니까?"}
          </h2>
          <span id={contentTitleId} className="sr-only">
            {pending.item.title}
          </span>
          <div id={descriptionId}>
            {deleting ? (
              <>
                <p>삭제한 콘텐츠는 다시 복구할 수 없습니다.</p>
                <p>
                  해당 콘텐츠가 홈, 추천 또는 상단 대표 콘텐츠로 설정되어 있는
                  경우
                </p>
                <p>해당 노출도 함께 해제됩니다.</p>
              </>
            ) : (
              <>
                <p>보관된 콘텐츠는 사용자에게 노출되지 않으며,</p>
                <p>보관함에서 다시 복원할 수 있습니다.</p>
              </>
            )}
          </div>
        </div>
        {error ? (
          <p role="alert" className="is-error">
            {error}
          </p>
        ) : null}
      </div>
      <footer>
        <button type="button" disabled={busy} onClick={onClose} autoFocus>
          취소
        </button>
        <button
          type="button"
          className={deleting ? "is-danger" : "is-primary"}
          disabled={busy}
          onClick={onConfirm}
        >
          {busy ? "처리 중..." : deleting ? "삭제하기" : "보관하기"}
        </button>
      </footer>
    </dialog>
  );
}
