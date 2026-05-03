import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { getStockEntries } from "@/lib/stocks";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "주식 분석 카드뉴스",
  description: "종목 분석 카드뉴스 생성 위자드",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const entries = await getStockEntries();
  const sidebarEntries = entries.map((e) => ({
    slug: e.slug,
    stockName: e.stockName,
    stockCode: e.stockCode,
    date: e.date,
  }));

  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full">
        <AppShell entries={sidebarEntries}>{children}</AppShell>
      </body>
    </html>
  );
}
