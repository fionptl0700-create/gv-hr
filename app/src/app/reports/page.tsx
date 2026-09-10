import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentEmployee, canApprove, isHr } from "@/lib/session";
import { summariseMonthAttendance } from "@/lib/payroll-month";
import { startOfMonth, endOfMonth, hoursText } from "@/lib/dates";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { year?: string; month?: string };
}) {
  const me = await getCurrentEmployee();
  if (!me) redirect("/login");

  const now = new Date();
  const year = Number(searchParams.year ?? now.getFullYear());
  const month = Number(searchParams.month ?? now.getMonth() + 1);
  const mStart = startOfMonth(year, month);
  const mEnd = endOfMonth(year, month);

  let scope: any = { id: me.id };
  if (isHr(me.role)) scope = {};
  else if (canApprove(me.role))
    scope = { OR: [{ managerId: me.id }, { deptId: me.deptId ?? -1 }] };

  const members = await prisma.employee.findMany({
    where: { status: "ACTIVE", ...scope },
    include: { dept: true },
    orderBy: { employeeNo: "asc" },
  });

  const rows = await Promise.all(
    members.map(async (m) => {
      const att = await summariseMonthAttendance(m.id, year, month);
      const leaveAgg = await prisma.leaveRequest.aggregate({
        _sum: { days: true },
        where: {
          employeeId: m.id,
          status: "APPROVED",
          startAt: { lte: mEnd },
          endAt: { gte: mStart },
        },
      });
      const ots = await prisma.overtimeRequest.findMany({
        where: { employeeId: m.id, status: "APPROVED", date: { gte: mStart, lte: mEnd } },
      });
      const otMin = ots.reduce(
        (s, o) =>
          s +
          (o.actualMinutes ??
            Math.round((o.plannedEnd.getTime() - o.plannedStart.getTime()) / 60000)),
        0
      );
      return {
        m,
        att,
        leaveDays: leaveAgg._sum.days ?? 0,
        otMin,
      };
    })
  );

  const monthOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  return (
    <div className="space-y-6">
      <PageHeader
        title="報表彙整"
        desc="月出勤彙總 · 遲到早退 / 缺勤 / 加班 / 請假；逐日至分鐘之勞檢用明細於 M7 提供匯出"
      />

      <form className="card flex flex-wrap items-end gap-4" method="get">
        <div>
          <label className="label">年</label>
          <input name="year" type="number" className="input w-28" defaultValue={year} />
        </div>
        <div>
          <label className="label">月</label>
          <select name="month" className="select w-24" defaultValue={month}>
            {monthOptions.map((mo) => (
              <option key={mo} value={mo}>
                {mo} 月
              </option>
            ))}
          </select>
        </div>
        <button className="btn-primary">查詢</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="data">
          <thead>
            <tr>
              <th>工號</th>
              <th>姓名</th>
              <th>部門</th>
              <th>應出勤日</th>
              <th>有打卡日</th>
              <th>遲到(分)</th>
              <th>早退(分)</th>
              <th>曠職(日)</th>
              <th>請假(日)</th>
              <th>加班</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ m, att, leaveDays, otMin }) => (
              <tr key={m.id}>
                <td className="font-mono">{m.employeeNo}</td>
                <td className="font-medium">{m.name}</td>
                <td>{m.dept?.name}</td>
                <td>{att.workdays}</td>
                <td>{att.daysWithPunch}</td>
                <td className={att.lateMinutes > 0 ? "text-amber-700" : ""}>{att.lateMinutes}</td>
                <td className={att.earlyLeaveMinutes > 0 ? "text-amber-700" : ""}>
                  {att.earlyLeaveMinutes}
                </td>
                <td className={att.absentDays > 0 ? "text-red-700 font-semibold" : ""}>
                  {att.absentDays}
                </td>
                <td>{leaveDays}</td>
                <td>{otMin > 0 ? hoursText(otMin) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-neutral-400">
        彙總依打卡紀錄即時結算（尚未跑每日結算批次者亦可計算）。匯出 Excel / PDF、
        排程寄送 HR、加班 46/54/138 法遵統計於後續里程碑加入。
      </p>
    </div>
  );
}
