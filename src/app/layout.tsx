import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "APIZZ.NET - Nền tảng Phát hiện Claude Chuyên nghiệp Nhất",
  description:
    "APIZZ.NET - Công cụ kiểm thử độc lập phát hiện gian lận API Claude, đánh tráo mô hình, độn token và proxy web giả mạo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="dark">
      <body className="min-h-screen bg-[#111319] text-[#e2e8f0] antialiased selection:bg-sky-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
