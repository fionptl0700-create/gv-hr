import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentEmployee } from "@/lib/session";
import { startOfDay, endOfDay, fmtTime } from "@/lib/dates";
import { PageHeader, EmptyRow } from "@/components/ui";
import { PunchButtons } from "./PunchButtons";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  IN: "上班簽到",
  OUT: "下班簽退",
  OUTING_OUT: "外出",
  OUTING_IN: "外出返回",
  OT_IN: "加班開始",
  OT_OUT: "加班結束",
};

export default async function PunchPage() {
  const me = await getCurrentEmployee();
  if (!me) redirect("/login");

  const s = startOfDay();
  const e = endOfDay();
  const punches = await prisma.punchRecord.findMany({
    where: { employeeId: me.id, ts: { gte: s, lte: e } },
    orderBy: { ts: "asc" },
  });

  const recent = await prisma.punchRecord.findMany({
    where: { employeeId: me.id },
    orderBy: { ts: "desc" },
    take: 12,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="打卡" desc="上班 09:00 前簽到、下班 18:00 後簽退為正常出勤" />

      <div className="card">
        <PunchButtons />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 font-semibold">今日打卡紀錄</h2>
          <table className="data">
            <thead>
              <tr>
                <th>時間</th>
                <th>類型</th>
                <th>來源</th>
              </tr>
            </thead>
            <tbody>
              {punches.length === 0 && <EmptyRow cols={3} text="今日尚無打卡" />}
              {punches.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono">{fmtTime(p.ts)}</td>
                  <td>{TYPE_LABEL[p.type] ?? p.type}</td>
                  <td className="text-neutral-400">{p.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2 className="mb-3 font-semibold">近期打卡</h2>
          <table className="data">
            <thead>
              <tr>
                <th>日期時間</th>
                <th>類型</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 && <EmptyRow cols={2} />}
              {recent.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono">
                    {new Intl.DateTimeFormat("zh-TW", {
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    }).format(p.ts)}
                  </td>
                  <td>{TYPE_LABEL[p.type] ?? p.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
