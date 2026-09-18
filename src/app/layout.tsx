import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteTitle = "치카픽 어드민 - 서비스 운영 관리";
const siteDescription =
  "치과와 회원 정보, 예약 현황, 콘텐츠와 고객 문의를 관리하는 치카픽 운영자 전용 서비스입니다.";

export const metadata: Metadata = {
  metadataBase: new URL("https://admin.chikapick.com"),
  title: siteTitle,
  description: siteDescription,
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "치카픽 어드민",
    title: siteTitle,
    description: siteDescription,
    images: [{ url: "/images/chikapick_app_icon.png", width: 512, height: 512, alt: "치카픽 앱 아이콘" }],
  },
  twitter: {
    card: "summary",
    title: siteTitle,
    description: siteDescription,
    images: [{ url: "/images/chikapick_app_icon.png", alt: "치카픽 앱 아이콘" }],
  },
  icons: {
    icon: [{ url: "/icon.png", sizes: "144x144", type: "image/png" }],
    apple: [{ url: "/images/chikapick_app_icon.png", sizes: "512x512", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
