import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentEmployee, isHr, canApprove } from "@/lib/session";
import { currentAnniversaryPeriod, annualLeaveDays } from "@/lib/annual-leave";
import { startOfDay, endOfDay, fmtTime, fmtDate } from "@/lib/dates";
import { Stat, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Home() {
  const me = await getCurrentEmployee();
  if (!me) redirect("/login");

  const today = new Date();
  const s = startOfDay(today);
  const e = endOfDay(today);

  // 今日打卡
  const myPunches = await prisma.punchRecord.findMany({
    where: { employeeId: me.id, ts: { gte: s, lte: e } },
    orderBy: { ts: "asc" },
  });
  const firstIn = myPunches.find((p) => p.type === "IN");
  const lastOut = [...myPunches].reverse().find((p) => p.type === "OUT");

  // 特休餘額
  const annualType = await prisma.leaveType.findUnique({ where: { code: "ANNUAL" } });
  const period = currentAnniversaryPeriod(me.hireDate, today);
  const bal = annualType
    ? await prisma.leaveBalance.findFirst({
        where: {
          employeeId: me.id,
          leaveTypeId: annualType.id,
          periodStart: { lte: today },
          periodEnd: { gte: today },
        },
      })
    : null;
  const annualRemaining = bal
    ? bal.grantedDays - bal.usedDays - bal.pendingDays
    : period.grantedDays;

  // 待簽核
  const pendingApprovals = canApprove(me.role)
    ? await prisma.approval.count({
        where: { approverId: me.id, status: "PENDING" },
      })
    : 0;

  // 我的申請狀態
  const myPending = await prisma.leaveRequest.count({
    where: { employeeId: me.id, status: "PENDING" },
  });

  // 團隊今日出勤（主管 / HR）
  let team: any[] = [];
  if (canApprove(me.role)) {
    const scope = isHr(me.role)
      ? {}
      : { OR: [{ managerId: me.id }, { deptId: me.deptId ?? -1 }] };
    const members = await prisma.employee.findMany({
      where: { status: "ACTIVE", ...scope },
      include: { dept: true },
      orderBy: { employeeNo: "asc" },
    });
    const punches = await prisma.punchRecord.findMany({
      where: { ts: { gte: s, lte: e }, employeeId: { in: members.map((m) => m.id) } },
      orderBy: { ts: "asc" },
    });
    const onLeave = await prisma.leaveRequest.findMany({
      where: {
        status: "APPROVED",
        startAt: { lte: e },
        endAt: { gte: s },
        employeeId: { in: members.map((m) => m.id) },
      },
      include: { leaveType: true },
    });
    const onTrip = await prisma.businessTrip.findMany({
      where: {
        status: "APPROVED",
        startAt: { lte: e },
        endAt: { gte: s },
        employeeId: { in: members.map((m) => m.id) },
      },
    });
    team = members.map((m) => {
      const ps = punches.filter((p) => p.employeeId === m.id);
      const leave = onLeave.find((l) => l.employeeId === m.id);
      const trip = onTrip.find((t) => t.employeeId === m.id);
      return {
        id: m.id,
        name: m.name,
        dept: m.dept?.name,
        in: ps.find((p) => p.type === "IN"),
        out: [...ps].reverse().find((p) => p.type === "OUT"),
        leave,
        trip,
      };
    });
  }

  const dow = ["日", "一", "二", "三", "四", "五", "六"][today.getDay()];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">
          嗨，{me.name}
          <span className="ml-2 text-sm font-normal text-neutral-400">
            {fmtDate(today)}（{dow}）· 台北正常班 09:00–18:00
          </span>
        </h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="今日上班打卡"
          value={firstIn ? fmtTime(firstIn.ts) : "未打卡"}
          hint={firstIn ? "已簽到" : "請至打卡頁面簽到"}
        />
        <Stat
          label="今日下班打卡"
          value={lastOut ? fmtTime(lastOut.ts) : "—"}
          hint={lastOut ? "已簽退" : "尚未簽退"}
        />
        <Stat
          label="特休剩餘"
          value={`${annualRemaining} 日`}
          hint={`本年度給假 ${period.grantedDays} 日 · ${fmtDate(
            period.periodEnd
          )} 到期`}
        />
        <Stat
          label={canApprove(me.role) ? "待我簽核" : "我送出待簽"}
          value={canApprove(me.role) ? pendingApprovals : myPending}
          hint={canApprove(me.role) ? "前往簽核中心" : "等待主管簽核"}
        />
      </div>

      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">快速操作</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/punch" className="btn-primary">上/下班打卡</Link>
          <Link href="/leave/new" className="btn-ghost">請假申請</Link>
          <Link href="/overtime/new" className="btn-ghost">加班申請</Link>
          <Link href="/trip/new" className="btn-ghost">出差 / 外出申請</Link>
          {canApprove(me.role) && (
            <Link href="/approvals" className="btn-ghost">簽核中心</Link>
          )}
        </div>
      </div>

      {canApprove(me.role) && (
        <div className="card">
          <h2 className="mb-3 font-semibold">
            今日團隊出勤（{team.length} 人）
          </h2>
          <div className="overflow-x-auto">
            <table className="data">
              <thead>
                <tr>
                  <th>姓名</th>
                  <th>部門</th>
                  <th>上班</th>
                  <th>下班</th>
                  <th>狀態</th>
                </tr>
              </thead>
              <tbody>
                {team.map((t) => {
                  let status = "未打卡";
                  let tone = "ABSENT";
                  if (t.leave) {
                    status = `請假：${t.leave.leaveType.name}`;
                    tone = "LEAVE";
                  } else if (t.trip) {
                    status = "出差中";
                    tone = "TRIP";
                  } else if (t.in) {
                    status = t.out ? "已簽退" : "上班中";
                    tone = "NORMAL";
                  }
                  return (
                    <tr key={t.id}>
                      <td className="font-medium">{t.name}</td>
                      <td>{t.dept}</td>
                      <td>{t.in ? fmtTime(t.in.ts) : "—"}</td>
                      <td>{t.out ? fmtTime(t.out.ts) : "—"}</td>
                      <td>
                        <Badge tone={tone}>{status}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
