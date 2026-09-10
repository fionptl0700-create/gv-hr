"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROLE_LABEL } from "@/lib/roles";

const LINKS = [
  { href: "/", label: "首頁" },
  { href: "/punch", label: "打卡" },
  { href: "/leave", label: "請假" },
  { href: "/overtime", label: "加班" },
  { href: "/trip", label: "出差/外出" },
  { href: "/approvals", label: "簽核" },
  { href: "/reports", label: "報表" },
];
const HR_LINKS = [
  { href: "/hr/employees", label: "人資大表" },
  { href: "/hr/payroll", label: "薪資試算" },
];

export function Nav({
  me,
}: {
  me: { id: number; name: string; role: string; dept: string };
}) {
  const path = usePathname();
  const isHr = me.role === "HR" || me.role === "ADMIN";
  const links = [...LINKS, ...(isHr ? HR_LINKS : [])];

  return (
    <header className="border-b border-neutral-200 bg-brand text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-wide">
          <span className="grid h-7 w-7 place-items-center rounded bg-white/15 text-xs">綠谷</span>
          GV STUDIO 人資考勤
        </Link>
        <nav className="flex flex-1 flex-wrap gap-1">
          {links.map((l) => {
            const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  active ? "bg-white text-brand" : "text-white/85 hover:bg-white/10"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-white/85">
            {me.dept} · {me.name}（{ROLE_LABEL[me.role]}）
          </span>
          <Link
            href="/login"
            className="rounded-md bg-white/15 px-2.5 py-1 text-xs hover:bg-white/25"
          >
            切換帳號
          </Link>
        </div>
      </div>
    </header>
  );
}
