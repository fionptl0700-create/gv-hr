import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentEmployee, canApprove } from "@/lib/session";
import { fmtDate, fmtDateTime, fmtTime, twMoney, hoursText } from "@/lib/dates";
import { formLabel, type FormType } from "@/lib/requests";
import { PageHeader, Badge, STATUS_TW } from "@/components/ui";
import { decide } from "./actions";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const me = await getCurrentEmployee();
  if (!me) redirect("/login");
  if (!canApprove(me.role))
    return (
      <div className="card text-sm text-neutral-500">您的權限沒有簽核項目。</div>
    );

  const pending = await prisma.approval.findMany({
    where: { approverId: me.id, status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: {
      leaveRequest: { include: { leaveType: true, employee: true } },
      overtimeRequest: { include: { employee: true } },
      businessTrip: { include: { employee: true } },
      outing: { include: { employee: true } },
      wfhRequest: { include: { employee: true } },
    },
  });

  const history = await prisma.approval.findMany({
    where: { approverId: me.id, status: { in: ["APPROVED", "REJECTED"] } },
    orderBy: { decidedAt: "desc" },
    take: 15,
    include: {
      leaveRequest: { include: { leaveType: true, employee: true } },
      overtimeRequest: { include: { employee: true } },
      businessTrip: { include: { employee: true } },
      outing: { include: { employee: true } },
      wfhRequest: { include: { employee: true } },
    },
  });

  function describe(a: any) {
    const t = a.formType as FormType;
    if (a.leaveRequest) {
      const l = a.leaveRequest;
      return {
        who: l.employee.name,
        title: `${formLabel(t)}：${l.leaveType.name}`,
        lines: [
          `期間 ${fmtDate(l.startAt)} – ${fmtDate(l.endAt)}（${l.days} 日 / ${l.hours} 小時）`,
          `工資 ${l.leaveType.paidRate >= 1 ? "全薪" : l.leaveType.paidRate === 0.5 ? "半薪" : "無薪"}`,
          l.reason ? `事由：${l.reason}` : "",
          `附件：${JSON.parse(l.attachments || "[]").join("、") || "（未附）"}`,
        ],
      };
    }
    if (a.overtimeRequest) {
      const o = a.overtimeRequest;
      const mins = Math.round((o.plannedEnd.getTime() - o.plannedStart.getTime()) / 60000);
      return {
        who: o.employee.name,
        title: `${formLabel(t)}`,
        lines: [
          `${fmtDate(o.date)} ${fmtTime(o.plannedStart)}–${fmtTime(o.plannedEnd)}（${hoursText(mins)}）`,
          `補償：${o.compensation === "PAY" ? "加班費" : "補休"}${
            o.estimatedPay != null ? `，試算 ${twMoney(o.estimatedPay)}` : ""
          }`,
          `事由：${o.reason}`,
        ],
      };
    }
    if (a.businessTrip) {
      const b = a.businessTrip;
      return {
        who: b.employee.name,
        title: `${formLabel(t)}（${b.scope === "OVERSEAS" ? "國外" : "國內"}）`,
        lines: [
          `${fmtDate(b.startAt)} – ${fmtDate(b.endAt)} · ${b.destination}`,
          `事由：${b.purpose}`,
          b.estCost != null ? `預估差旅費 ${twMoney(b.estCost)}${b.needAdvance ? "（需預支）" : ""}` : "",
        ],
      };
    }
    if (a.outing) {
      const o = a.outing;
      return {
        who: o.employee.name,
        title: formLabel(t),
        lines: [`${fmtDate(o.startAt)} ${fmtTime(o.startAt)}–${fmtTime(o.endAt)} · ${o.location}`, `事由：${o.purpose}`],
      };
    }
    if (a.wfhRequest) {
      const w = a.wfhRequest;
      return {
        who: w.employee.name,
        title: formLabel(t),
        lines: [`${fmtDate(w.date)} · ${w.location || "—"}`, `工作項目：${w.plan}`],
      };
    }
    return { who: "—", title: formLabel(t), lines: [] };
  }

  return (
    <div className="space-y-6">
      <PageHeader title="簽核中心" desc={`待簽核 ${pending.length} 筆`} />

      <div className="space-y-3">
        {pending.length === 0 && (
          <div className="card text-sm text-neutral-500">目前沒有待簽核項目 🎉</div>
        )}
        {pending.map((a) => {
          const d = describe(a);
          return (
            <div key={a.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{d.who}</span>
                    <Badge>{d.title}</Badge>
                    <span className="text-xs text-neutral-400">第 {a.step} 關</span>
                  </div>
                  <ul className="mt-2 space-y-0.5 text-sm text-neutral-600">
                    {d.lines.filter(Boolean).map((l, i) => (
                      <li key={i}>{l}</li>
                    ))}
                  </ul>
                </div>
                <form action={decide} className="flex flex-col gap-2 sm:w-64">
                  <input type="hidden" name="approvalId" value={a.id} />
                  <input name="comment" className="input" placeholder="簽核意見（選填）" />
                  <div className="flex gap-2">
                    <button name="action" value="APPROVED" className="btn-primary flex-1">
                      核准
                    </button>
                    <button name="action" value="REJECTED" className="btn-danger flex-1">
                      駁回
                    </button>
                  </div>
                </form>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">近期簽核紀錄</h2>
        <table className="data">
          <thead>
            <tr>
              <th>時間</th>
              <th>申請人</th>
              <th>項目</th>
              <th>結果</th>
              <th>意見</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-neutral-400">
                  尚無紀錄
                </td>
              </tr>
            )}
            {history.map((a) => {
              const d = describe(a);
              return (
                <tr key={a.id}>
                  <td className="whitespace-nowrap text-neutral-500">{fmtDateTime(a.decidedAt)}</td>
                  <td>{d.who}</td>
                  <td>{d.title}</td>
                  <td>
                    <Badge tone={a.status}>{STATUS_TW[a.status]}</Badge>
                  </td>
                  <td className="text-neutral-500">{a.comment || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
