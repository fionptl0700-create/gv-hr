import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentEmployee, isHr, ROLE_LABEL } from "@/lib/session";
import { annualLeaveDays, currentAnniversaryPeriod, annualLeaveSchedule } from "@/lib/annual-leave";
import { fmtDate, toDateInput } from "@/lib/dates";
import { PageHeader, BackLink } from "@/components/ui";
import { updateEmployee } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditEmployeePage({ params }: { params: { id: string } }) {
  const me = await getCurrentEmployee();
  if (!me) redirect("/login");
  if (!isHr(me.role))
    return <div className="card text-sm text-neutral-500">此頁僅人資 / 管理員可檢視。</div>;

  const id = Number(params.id);
  const emp = await prisma.employee.findUnique({
    where: { id },
    include: {
      dept: true,
      leaveBalances: { include: { leaveType: true }, orderBy: { periodStart: "desc" } },
      changes: { orderBy: { effectiveDate: "desc" }, take: 10 },
    },
  });
  if (!emp) notFound();

  const [depts, schedules, managers] = await Promise.all([
    prisma.department.findMany({ orderBy: { id: "asc" } }),
    prisma.workSchedule.findMany({ orderBy: { id: "asc" } }),
    prisma.employee.findMany({
      where: { role: { in: ["MANAGER", "HR", "ADMIN"] } },
      orderBy: { employeeNo: "asc" },
    }),
  ]);

  const now = new Date();
  const period = currentAnniversaryPeriod(emp.hireDate, now);
  const schedule = annualLeaveSchedule(emp.hireDate, now);

  return (
    <div className="space-y-6">
      <BackLink href="/hr/employees">返回人資大表</BackLink>
      <PageHeader
        title={`${emp.name}（${emp.employeeNo}）`}
        desc={`${emp.dept?.name} · ${emp.positionTitle} · ${ROLE_LABEL[emp.role]}`}
        action={
          <Link href={`/hr/payroll?empId=${emp.id}`} className="btn-ghost">
            薪資試算
          </Link>
        }
      />

      <form action={updateEmployee} className="card grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="id" value={emp.id} />

        <div>
          <label className="label">姓名</label>
          <input name="name" className="input" defaultValue={emp.name} />
        </div>
        <div>
          <label className="label">職稱</label>
          <input name="positionTitle" className="input" defaultValue={emp.positionTitle ?? ""} />
        </div>
        <div>
          <label className="label">部門</label>
          <select name="deptId" className="select" defaultValue={emp.deptId ?? ""}>
            {depts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">角色 / 權限</label>
          <select name="role" className="select" defaultValue={emp.role}>
            {["EMPLOYEE", "MANAGER", "HR", "ADMIN"].map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">直屬主管</label>
          <select name="managerId" className="select" defaultValue={emp.managerId ?? ""}>
            <option value="">（無）</option>
            {managers
              .filter((m) => m.id !== emp.id)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}（{m.employeeNo}）
                </option>
              ))}
          </select>
        </div>
        <div>
          <label className="label">班別</label>
          <select name="scheduleId" className="select" defaultValue={emp.scheduleId ?? ""}>
            {schedules.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}（{s.workStart}–{s.workEnd}）
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">到職日</label>
          <input type="date" name="hireDate" className="input" defaultValue={toDateInput(emp.hireDate)} />
        </div>
        <div>
          <label className="label">在職狀態</label>
          <select name="status" className="select" defaultValue={emp.status}>
            <option value="ACTIVE">在職</option>
            <option value="ON_LEAVE_NOPAY">留職停薪</option>
            <option value="RESIGNED">離職</option>
          </select>
        </div>

        <div className="sm:col-span-2 mt-2 border-t border-neutral-100 pt-3 text-sm font-semibold text-neutral-600">
          薪資與勞健保（供月薪試算）
        </div>
        <div>
          <label className="label">月薪（本薪，NT$）</label>
          <input type="number" name="monthlySalary" className="input" defaultValue={emp.monthlySalary} min={0} />
        </div>
        <div>
          <label className="label">全勤獎金（NT$/月）</label>
          <input
            type="number"
            name="fullAttendanceBonus"
            className="input"
            defaultValue={emp.fullAttendanceBonus}
            min={0}
          />
        </div>
        <div>
          <label className="label">勞保自付額（NT$/月）</label>
          <input type="number" name="laborInsuranceSelf" className="input" defaultValue={emp.laborInsuranceSelf} min={0} />
        </div>
        <div>
          <label className="label">健保自付額（NT$/月）</label>
          <input type="number" name="healthInsuranceSelf" className="input" defaultValue={emp.healthInsuranceSelf} min={0} />
        </div>
        <div>
          <label className="label">勞退自願提繳（%）</label>
          <input
            type="number"
            step="0.5"
            name="pensionSelfPercent"
            className="input"
            defaultValue={emp.pensionSelfPercent}
            min={0}
            max={6}
          />
        </div>
        <div>
          <label className="label">LINE User ID（通知綁定）</label>
          <input name="lineUserId" className="input" defaultValue={emp.lineUserId ?? ""} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isIndigenous" defaultChecked={emp.isIndigenous} /> 原住民身分（歲時祭儀假）
        </label>

        <div className="sm:col-span-2">
          <button className="btn-primary">儲存變更</button>
          <span className="ml-3 text-xs text-neutral-400">薪資調整會自動寫入異動歷程與稽核軌跡。</span>
        </div>
      </form>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 font-semibold">特休（週年制）</h2>
          <p className="text-sm text-neutral-600">
            目前年資對應 <b className="text-brand">{annualLeaveDays(emp.hireDate, now)} 日</b>；
            本年度 {fmtDate(period.periodStart)}–{fmtDate(period.periodEnd)}，
            距到期 {Math.max(0, period.daysUntilEnd)} 天。
          </p>
          <table className="data mt-3">
            <thead>
              <tr>
                <th>給假日</th>
                <th>年度迄日</th>
                <th>日數</th>
              </tr>
            </thead>
            <tbody>
              {schedule.slice(-6).reverse().map((g, i) => (
                <tr key={i}>
                  <td>{fmtDate(g.grantDate)}</td>
                  <td>{fmtDate(g.periodEnd)}</td>
                  <td className="font-semibold">{g.days} 日</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2 className="mb-3 font-semibold">假別餘額</h2>
          <table className="data">
            <thead>
              <tr>
                <th>假別</th>
                <th>期間</th>
                <th>給假</th>
                <th>已用</th>
                <th>簽核中</th>
              </tr>
            </thead>
            <tbody>
              {emp.leaveBalances.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-neutral-400">
                    尚無額度紀錄
                  </td>
                </tr>
              )}
              {emp.leaveBalances.map((b) => (
                <tr key={b.id}>
                  <td>{b.leaveType.name}</td>
                  <td className="whitespace-nowrap text-xs">
                    {fmtDate(b.periodStart)}–{fmtDate(b.periodEnd)}
                  </td>
                  <td>{b.grantedDays}</td>
                  <td>{b.usedDays}</td>
                  <td>{b.pendingDays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">異動歷程</h2>
        <table className="data">
          <thead>
            <tr>
              <th>生效日</th>
              <th>類型</th>
              <th>內容</th>
            </tr>
          </thead>
          <tbody>
            {emp.changes.map((c) => (
              <tr key={c.id}>
                <td>{fmtDate(c.effectiveDate)}</td>
                <td>{c.type}</td>
                <td className="text-neutral-500">
                  {c.fromValue && c.toValue ? `${c.fromValue} → ${c.toValue}` : c.toValue}
                  {c.note ? `（${c.note}）` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
