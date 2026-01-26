import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import "./globals.css";
import { Agentation } from "agentation";

export const metadata: Metadata = {
  title: "Product Research - 产品调研助手",
  description: "从全网收集产品方案、技术路线、行业趋势",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <Navbar />
        <div className="main-content">
          {children}
        </div>
        {process.env.NODE_ENV === "development" && <Agentation />}
      </body>
    </html>
  );
}
