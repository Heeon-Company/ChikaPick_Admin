export type SupportAnnouncement = {
  id: string;
  title: string;
  body: string;
  is_active: boolean;
  published_at: string;
};
export type SupportCategory = {
  id: string;
  title: string;
  display_order: number;
  is_active: boolean;
};
export type SupportFaq = {
  id: string;
  category_id: string;
  question: string;
  answer: string;
  display_order: number;
  is_active: boolean;
};
export type SupportContent = {
  announcements: SupportAnnouncement[];
  categories: SupportCategory[];
  faqs: SupportFaq[];
  feedbackFormUrl: string | null;
};
export type SupportMutation =
  | { kind: "announcement"; record: Omit<SupportAnnouncement, "published_at"> }
  | { kind: "category"; record: SupportCategory }
  | { kind: "faq"; record: SupportFaq }
  | { kind: "settings"; record: { feedback_form_url: string | null } };
