import type { Metadata } from "next";
import "./globals.css";
import { getCurrentEmployee } from "@/lib/session";
import { Nav } from "@/components/nav";

export const metadata: Metadata = {
  title: "綠谷國際 人資考勤系統",
  description: "GV STUDIO HR & Attendance",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await getCurrentEmployee();
  return (
    <html lang="zh-Hant">
      <body>
        <div className="min-h-screen">
          {me && <Nav me={{ id: me.id, name: me.name, role: me.role, dept: me.dept?.name ?? "" }} />}
          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
