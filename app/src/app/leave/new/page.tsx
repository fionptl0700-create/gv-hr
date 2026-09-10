import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentEmployee } from "@/lib/session";
import { ATTACHMENT_RULE_LABEL, PAID_RATE_LABEL } from "@/lib/leave-catalog";
import { PageHeader, BackLink } from "@/components/ui";
import { submitLeave } from "../actions";
import { toDateInput } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function NewLeavePage() {
  const me = await getCurrentEmployee();
  if (!me) redirect("/login");

  const types = await prisma.leaveType.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });
  const colleagues = await prisma.employee.findMany({
    where: { status: "ACTIVE", id: { not: me.id } },
    orderBy: { employeeNo: "asc" },
  });
  const today = toDateInput(new Date());

  return (
    <div className="space-y-5">
      <BackLink href="/leave">返回請假列表</BackLink>
      <PageHeader title="請假申請" desc="選擇假別後會顯示法源、工資與附件規定" />

      <form action={submitLeave} className="card space-y-4">
        <div>
          <label className="label">假別</label>
          <select name="leaveTypeId" className="select" required defaultValue="">
            <option value="" disabled>
              請選擇假別
            </option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}（{t.legalBasis}）
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">開始日期</label>
            <input type="date" name="startDate" className="input" defaultValue={today} required />
          </div>
          <div>
            <label className="label">結束日期</label>
            <input type="date" name="endDate" className="input" defaultValue={today} required />
          </div>
          <div>
            <label className="label">時段（同日適用）</label>
            <select name="period" className="select" defaultValue="FULL">
              <option value="FULL">全天</option>
              <option value="AM">上午（4 小時）</option>
              <option value="PM">下午（4 小時）</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label">事由</label>
          <textarea name="reason" className="textarea" rows={2} placeholder="請簡述事由" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">代理人</label>
            <select name="agentId" className="select" defaultValue="">
              <option value="">（無）</option>
              {colleagues.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}（{c.employeeNo}）
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">附件（證明文件檔名）</label>
            <input
              name="attachmentName"
              className="input"
              placeholder="例：診斷證明書.pdf（示範環境以檔名代替上傳）"
            />
          </div>
        </div>

        <button className="btn-primary">送出申請</button>
      </form>

      <div className="card">
        <h2 className="mb-3 font-semibold">假別規定速查</h2>
        <div className="overflow-x-auto">
          <table className="data">
            <thead>
              <tr>
                <th>假別</th>
                <th>法源</th>
                <th>工資</th>
                <th>年度額度</th>
                <th>附件</th>
                <th>備註</th>
              </tr>
            </thead>
            <tbody>
              {types.map((t) => (
                <tr key={t.id}>
                  <td className="font-medium whitespace-nowrap">{t.name}</td>
                  <td className="whitespace-nowrap text-neutral-500">{t.legalBasis}</td>
                  <td className="whitespace-nowrap">{PAID_RATE_LABEL(t.paidRate)}</td>
                  <td className="whitespace-nowrap">
                    {t.annualQuota != null ? `${t.annualQuota} 日` : "依規則"}
                  </td>
                  <td>
                    {ATTACHMENT_RULE_LABEL[t.attachmentRule]}
                    {t.attachmentNote ? (
                      <span className="block text-xs text-neutral-400">{t.attachmentNote}</span>
                    ) : null}
                  </td>
                  <td className="text-xs text-neutral-500">{t.statutoryCap}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
