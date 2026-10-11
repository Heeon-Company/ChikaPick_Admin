export interface PartnerSalesInquiryItem {
  id: string;
  clinicName: string;
  representativeName: string;
  phone: string;
  email: string;
  message: string;
  createdAt: string;
}

export interface PartnerSalesInquiryPayload {
  items: PartnerSalesInquiryItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

// The API stores digits only; show them the way people write them.
export function formatPartnerSalesInquiryPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("02") && digits.length >= 9) {
    return `${digits.slice(0, 2)}-${digits.slice(2, -4)}-${digits.slice(-4)}`;
  }
  if (digits.length >= 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, -4)}-${digits.slice(-4)}`;
  }
  return phone;
}
