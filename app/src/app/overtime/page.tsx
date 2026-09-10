import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentEmployee } from "@/lib/session";
import { fmtDate, fmtTime, twMoney, hoursText } from "@/lib/dates";
import { checkMonthlyOtLimit } from "@/lib/overtime";
import { startOfMonth, endOfMonth } from "@/lib/dates";
import { PageHeader, Badge, EmptyRow, STATUS_TW, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

const DAYTYPE_LABEL: Record<string, string> = {
  WORKDAY: "平日",
  REST_DAY: "休息日",
  HOLIDAY: "國定假日",
  OFF_DAY: "例假",
};

export default async function OvertimePage() {
  const me = await getCurrentEmployee();
  if (!me) redirect("/login");

  const now = new Date();
  const list = await prisma.overtimeRequest.findMany({
    where: { employeeId: me.id },
    orderBy: { date: "desc" },
    take: 40,
  });

  const mStart = startOfMonth(now.getFullYear(), now.getMonth() + 1);
  const mEnd = endOfMonth(now.getFullYear(), now.getMonth() + 1);
  const monthList = list.filter(
    (o) => o.date >= mStart && o.date <= mEnd && ["APPROVED", "PENDING"].includes(o.status)
  );
  const monthMinutes = monthList.reduce(
    (s, o) =>
      s +
      (o.actualMinutes ??
        Math.round((o.plannedEnd.getTime() - o.plannedStart.getTime()) / 60000)),
    0
  );
  const limit = checkMonthlyOtLimit(monthMinutes, false);

  const comp = await prisma.compTimeEntry.findMany({
    where: { employeeId: me.id, convertedToPay: false },
  });
  const compRemain = comp.reduce((s, c) => s + (c.earnedMinutes - c.usedMinutes), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="加班"
        desc="加班費 §24 / 上限 §32 / 補休 §32-1"
        action={
          <Link href="/overtime/new" className="btn-primary">
            新增加班
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="本月加班時數"
          value={hoursText(monthMinutes)}
          hint={`上限 ${limit.monthlyCapMinutes / 60} 小時`}
        />
        <Stat
          label="§32 上限檢核"
          value={
            <span
              className={
                limit.level === "OK"
                  ? "text-emerald-600"
                  : limit.level === "WARN"
                  ? "text-amber-600"
                  : "text-red-600"
              }
            >
              {limit.level === "OK" ? "正常" : limit.level === "WARN" ? "接近上限" : "已達/超過"}
            </span>
          }
          hint={limit.message}
        />
        <Stat label="補休可用" value={hoursText(compRemain)} hint="6 個月內休畢，逾期折發工資" />
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">加班申請紀錄</h2>
        <div className="overflow-x-auto">
          <table className="data">
            <thead>
              <tr>
                <th>日期</th>
                <th>時間</th>
                <th>時數</th>
                <th>日別</th>
                <th>補償</th>
                <th>試算加班費</th>
                <th>狀態</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && <EmptyRow cols={7} text="尚無加班申請" />}
              {list.map((o) => {
                const mins = Math.round(
                  (o.plannedEnd.getTime() - o.plannedStart.getTime()) / 60000
                );
                return (
                  <tr key={o.id}>
                    <td className="whitespace-nowrap">{fmtDate(o.date)}</td>
                    <td className="whitespace-nowrap font-mono">
                      {fmtTime(o.plannedStart)}–{fmtTime(o.plannedEnd)}
                    </td>
                    <td>{hoursText(mins)}</td>
                    <td>{DAYTYPE_LABEL[o.dayType]}</td>
                    <td>{o.compensation === "PAY" ? "加班費" : "補休"}</td>
                    <td>{o.estimatedPay != null ? twMoney(o.estimatedPay) : "—"}</td>
                    <td>
                      <Badge tone={o.status}>{STATUS_TW[o.status]}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
