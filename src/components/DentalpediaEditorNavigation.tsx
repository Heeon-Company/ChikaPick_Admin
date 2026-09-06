export type DentalpediaInformationType = "video" | "post" | "article";

export function DentalpediaWorkspaceHeading() {
  return (
    <header className="admin-information-editor-heading">
      <h1>치카피디아</h1>
      <p>콘텐츠를 등록하고 관리할 수 있는 어드민 페이지입니다.</p>
    </header>
  );
}

export function DentalpediaInformationTypeTabs({
  informationType,
  onChange,
}: {
  informationType: DentalpediaInformationType;
  onChange: (type: DentalpediaInformationType) => void;
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
