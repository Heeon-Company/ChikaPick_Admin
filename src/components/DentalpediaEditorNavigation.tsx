export type DentalpediaInformationType = "video" | "post" | "article";

export function DentalpediaEditorLoadFailure({ message, onBack }: { message: string; onBack?: () => void }) {
  return <section className="admin-dentalpedia-editor-error">
    <DentalpediaWorkspaceHeading onBack={onBack} />
    <p role="alert">{message}</p>
    <p>콘텐츠 목록으로 돌아가 다시 열어 주세요.</p>
  </section>;
}

export function DentalpediaWorkspaceHeading({ onBack }: { onBack?: () => void }) {
  return (
    <header className="admin-information-editor-heading">
      {onBack ? <button className="admin-dentalpedia-back" onClick={onBack} type="button">← 콘텐츠 목록</button> : null}
      <h1>치카피디아</h1>
      <p>콘텐츠를 등록하고 관리할 수 있는 어드민 페이지입니다.</p>
    </header>
  );
}

export function DentalpediaInformationTypeTabs({
  informationType,
  onChange,
  disabled = false,
}: {
  informationType: DentalpediaInformationType;
  onChange: (type: DentalpediaInformationType) => void;
  disabled?: boolean;
}) {
  const tabs: ReadonlyArray<{
    label: string;
    value: DentalpediaInformationType;
  }> = [
    { label: "영상", value: "video" },
    { label: "게시물", value: "post" },
    { label: "칼럼", value: "article" },
  ];

  return (
    <div
      aria-label="업로드 정보 유형"
      className="admin-information-upload-tabs admin-information-video-tabs"
      role="tablist"
    >
      {tabs.map((tab) => (
        <button
          aria-controls="information-upload-form"
          aria-selected={informationType === tab.value}
          className={informationType === tab.value ? "is-active" : undefined}
          key={tab.value}
          disabled={disabled && informationType !== tab.value}
          onClick={() => onChange(tab.value)}
          role="tab"
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
