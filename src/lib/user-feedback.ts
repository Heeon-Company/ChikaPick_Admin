export type UserFeedbackStatusFilter = "all" | "unanswered" | "answered";

export interface UserFeedbackItem {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  message: string;
  platform: "ios" | "android" | "web" | null;
  appVersion: string | null;
  answer: string | null;
  answeredAt: string | null;
  answerRead: boolean;
  createdAt: string;
}

export interface UserFeedbackPayload {
  items: UserFeedbackItem[];
  unansweredCount: number;
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export const userFeedbackStatusFilters: Array<{
  id: UserFeedbackStatusFilter;
  label: string;
}> = [
  { id: "all", label: "전체" },
  { id: "unanswered", label: "답변 대기" },
  { id: "answered", label: "답변 완료" },
];

export const userFeedbackAnswerLimit = 2000;

const platformLabels = { ios: "iOS", android: "Android", web: "웹" } as const;

// "iOS 1.0.13+96", or whatever part the app sent.
export function formatUserFeedbackApp(
  item: Pick<UserFeedbackItem, "platform" | "appVersion">,
) {
  const parts = [
    item.platform ? platformLabels[item.platform] : null,
    item.appVersion,
  ].filter(Boolean);
  return parts.length ? parts.join(" ") : "—";
}
