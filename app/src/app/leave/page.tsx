import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentEmployee } from "@/lib/session";
import { currentAnniversaryPeriod } from "@/lib/annual-leave";
import { fmtDate } from "@/lib/dates";
import { PAID_RATE_LABEL } from "@/lib/leave-catalog";
import { PageHeader, Badge, EmptyRow, STATUS_TW, Stat } from "@/components/ui";
import { cancelLeave } from "./actions";

export const dynamic = "force-dynamic";

export default async function LeavePage() {
  const me = await getCurrentEmployee();
  if (!me) redirect("/login");

  const now = new Date();
  const requests = await prisma.leaveRequest.findMany({
    where: { employeeId: me.id },
    include: { leaveType: true, approvals: { include: { approver: true }, orderBy: { step: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  const annualType = await prisma.leaveType.findUnique({ where: { code: "ANNUAL" } });
  const period = currentAnniversaryPeriod(me.hireDate, now);
  const bal = annualType
    ? await prisma.leaveBalance.findFirst({
        where: {
          employeeId: me.id,
          leaveTypeId: annualType.id,
          periodStart: { lte: now },
          periodEnd: { gte: now },
        },
      })
    : null;
  const granted = bal?.grantedDays ?? period.grantedDays;
  const used = bal?.usedDays ?? 0;
  const pending = bal?.pendingDays ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="請假"
        desc="週年制特休 · 依到職日自動給假"
        action={
          <Link href="/leave/new" className="btn-primary">
            新增請假
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="特休本年度給假" value={`${granted} 日`} hint={`年資 ${period.yearsAtStart} 年`} />
        <Stat label="已使用" value={`${used} 日`} />
        <Stat label="簽核中" value={`${pending} 日`} />
        <Stat
          label="可用餘額"
          value={`${granted - used - pending} 日`}
          hint={`${fmtDate(period.periodStart)}–${fmtDate(period.periodEnd)}`}
        />
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">我的請假申請</h2>
        <div className="overflow-x-auto">
          <table className="data">
            <thead>
              <tr>
                <th>假別</th>
                <th>期間</th>
                <th>日數</th>
                <th>工資</th>
                <th>簽核進度</th>
                <th>狀態</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 && <EmptyRow cols={7} text="尚無申請" />}
              {requests.map((r) => {
                const done = r.approvals.filter((a) => a.status === "APPROVED").length;
                return (
                  <tr key={r.id}>
                    <td className="font-medium">{r.leaveType.name}</td>
                    <td className="whitespace-nowrap">
                      {fmtDate(r.startAt)} – {fmtDate(r.endAt)}
                    </td>
                    <td>{r.days} 日</td>
                    <td>{PAID_RATE_LABEL(r.leaveType.paidRate)}</td>
                    <td className="text-xs text-neutral-500">
                      {r.approvals.length === 0
                        ? "—"
                        : `${done}/${r.approvals.length}｜` +
                          r.approvals
                            .map(
                              (a) =>
                                `${a.approver.name}${
                                  a.status === "APPROVED" ? "✓" : a.status === "REJECTED" ? "✗" : "…"
                                }`
                            )
                            .join(" → ")}
                    </td>
                    <td>
                      <Badge tone={r.status}>{STATUS_TW[r.status]}</Badge>
                    </td>
                    <td>
                      {(r.status === "PENDING" || r.status === "APPROVED") && (
                        <form action={cancelLeave}>
                          <input type="hidden" name="id" value={r.id} />
                          <button className="text-xs text-red-600 hover:underline">取消</button>
                        </form>
                      )}
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
