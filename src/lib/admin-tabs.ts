export const primaryTabs = [
  { id: "dashboard", label: "운영 현황", icon: "/Type=Dashboard.svg" },
  { id: "dental-sales", label: "치과 영업 관리", icon: "/Type=Graph.svg" },
  { id: "partner-clinics", label: "파트너 치과 관리", icon: "/Type=Hospital.svg" },
  { id: "hospital-review", label: "병원 가입 심사", icon: "/Type=Accept.svg" },
  { id: "license-review", label: "치과의사 면허 인증", icon: "/Type=Accept.svg" },
  { id: "clinic-membership-requests", label: "소속 신청 관리", icon: "/Type=Staff.svg" },
  { id: "reservations", label: "예약 운영 관리", icon: "/Type=Diary.svg" },
  // 전문의 소견 관련 코드
  // { id: "consultations", label: "전문의 소견 운영", icon: "/Type=Response.svg" },
  { id: "secret-feedback", label: "시크릿 피드백", icon: "/Type=Opinion.svg" },
  { id: "information-upload", label: "치카피디아", icon: "/Type=Dashboard.svg" },
  { id: "chika-talk", label: "치아톡 관리", icon: "/Type=Dashboard.svg" },
  { id: "service-expansion-requests", label: "서비스 확대 요청 관리", icon: "/Type=Dashboard.svg" },
  { id: "chikapick-accounts", label: "치카픽 계정 조회", icon: "/Type=Family.svg" },
  { id: "partner-accounts", label: "파트너스 계정 조회", icon: "/Type=Family.svg" },
  { id: "partner-invites", label: "파트너 초대코드 관리", icon: "/Type=Settings.svg" },
  { id: "memberships", label: "멤버십 관리", icon: "/Type=Ticket.svg" },
  { id: "terms-management", label: "약관 관리", icon: "/Type=Diary.svg" },
  { id: "support-management", label: "고객지원 관리", icon: "/Type=Opinion.svg" },
  { id: "sales-performance", label: "영업 성과 관리", icon: "/Type=Price.svg" },
  { id: "admin-accounts", label: "어드민 계정 관리", icon: "/Type=Mypage.svg" },
  { id: "external-connectors", label: "외부 연결자 관리", icon: "/Type=Share.svg" },
  { id: "audit-log", label: "감사 로그", icon: "/Type=Log.svg" },
  { id: "settings", label: "설정", icon: "/Type=Settings.svg" },
] as const;

export type PrimaryAdminTab = (typeof primaryTabs)[number]["id"];
