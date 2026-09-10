import Link from "next/link";

export function PageHeader({
  title,
  desc,
  action,
}: {
  title: string;
  desc?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold text-neutral-900">{title}</h1>
        {desc && <p className="mt-1 text-sm text-neutral-500">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="card">
      <div className="text-sm text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-brand">{value}</div>
      {hint && <div className="mt-1 text-xs text-neutral-400">{hint}</div>}
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
  CANCELLED: "bg-neutral-100 text-neutral-600",
  NORMAL: "bg-emerald-100 text-emerald-800",
  LATE: "bg-amber-100 text-amber-800",
  EARLY: "bg-amber-100 text-amber-800",
  ABSENT: "bg-red-100 text-red-800",
  LEAVE: "bg-sky-100 text-sky-800",
  TRIP: "bg-violet-100 text-violet-800",
  WFH: "bg-teal-100 text-teal-800",
  HOLIDAY: "bg-neutral-100 text-neutral-600",
  OFF: "bg-neutral-100 text-neutral-600",
  MAKEUP: "bg-orange-100 text-orange-800",
};

export function Badge({ children, tone }: { children: React.ReactNode; tone?: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
        STATUS_COLORS[tone ?? ""] ?? "bg-neutral-100 text-neutral-600"
      }`}
    >
      {children}
    </span>
  );
}

export function EmptyRow({ cols, text = "無資料" }: { cols: number; text?: string }) {
  return (
    <tr>
      <td colSpan={cols} className="py-6 text-center text-neutral-400">
        {text}
      </td>
    </tr>
  );
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sm text-brand hover:underline">
      ← {children}
    </Link>
  );
}

export const STATUS_TW: Record<string, string> = {
  PENDING: "簽核中",
  APPROVED: "已核准",
  REJECTED: "已駁回",
  CANCELLED: "已取消",
};
