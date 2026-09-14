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

export type SupportEditorSelection = { kind: "announcement" | "category" | "faq"; id: string; isNew?: boolean };

export function supportDraftForSelection(data: SupportContent, selection: SupportEditorSelection): Exclude<SupportMutation, { kind: "settings" }> | null {
  const { kind, id, isNew } = selection;
  if (kind === "announcement") {
    const record = data.announcements.find((item) => item.id === id);
    return record ? { kind, record } : isNew ? { kind, record: { id, title: "", body: "", is_active: false } } : null;
  }
  if (kind === "category") {
    const record = data.categories.find((item) => item.id === id);
    return record ? { kind, record } : isNew ? { kind, record: { id, title: "", display_order: data.categories.length, is_active: false } } : null;
  }
  const record = data.faqs.find((item) => item.id === id);
  return record ? { kind, record } : isNew ? { kind, record: { id, category_id: data.categories[0]?.id ?? "", question: "", answer: "", display_order: data.faqs.length, is_active: false } } : null;
}
