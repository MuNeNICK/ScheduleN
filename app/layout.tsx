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

export const metadata: Metadata = {
  title: {
    default: "スケるん - ScheduleN",
    template: "%s | スケるん"
  },
  description: "簡単にスケジュール調整ができるWebアプリです。候補日を設定して参加者の都合を集約し、最適な日程を見つけましょう。",
  keywords: ["スケジュール調整", "日程調整", "予定調整", "ScheduleN", "スケるん"],
  authors: [{ name: "ScheduleN" }],
  creator: "ScheduleN",
  publisher: "ScheduleN",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  openGraph: {
    title: "スケるん - ScheduleN",
    description: "簡単にスケジュール調整ができるWebアプリです。候補日を設定して参加者の都合を集約し、最適な日程を見つけましょう。",
    type: "website",
    locale: "ja_JP",
    siteName: "スケるん"
  },
  twitter: {
    card: "summary_large_image",
    title: "スケるん - ScheduleN",
    description: "簡単にスケジュール調整ができるWebアプリです。候補日を設定して参加者の都合を集約し、最適な日程を見つけましょう。"
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
