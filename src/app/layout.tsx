import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar, Header } from "@/components/layout";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SimpleFuse - LLM 评测平台",
  description: "基于 Langfuse 理念的简化版 LLM 评测平台，支持 Dify 工作流集成",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="flex h-screen overflow-hidden">
          {/* 侧边栏 */}
          <Sidebar />
          
          {/* 主内容区 */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* 顶部导航 */}
            <Header />
            
            {/* 页面内容 */}
            <main className="flex-1 overflow-auto p-6">
              {children}
            </main>
          </div>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
