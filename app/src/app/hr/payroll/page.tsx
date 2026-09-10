import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentEmployee, isHr } from "@/lib/session";
import { buildMonthlyPayroll } from "@/lib/payroll-month";
import { twMoney, hoursText } from "@/lib/dates";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: { empId?: string; year?: string; month?: string };
}) {
  const me = await getCurrentEmployee();
  if (!me) redirect("/login");
  if (!isHr(me.role))
    return <div className="card text-sm text-neutral-500">此頁僅人資 / 管理員可檢視。</div>;

  const employees = await prisma.employee.findMany({ orderBy: { employeeNo: "asc" } });
  const now = new Date();
  const empId = Number(searchParams.empId ?? employees[0]?.id ?? 0);
  const year = Number(searchParams.year ?? now.getFullYear());
  const month = Number(searchParams.month ?? now.getMonth() + 1);

  const emp = employees.find((e) => e.id === empId) ?? employees[0];
  const bundle = emp ? await buildMonthlyPayroll(emp.id, year, month) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="薪資試算"
        desc="依當月出勤、請假、加班自動計算應發 / 應扣。遲到早退僅按未提供勞務時間比例扣發。"
      />

      <form className="card flex flex-wrap items-end gap-4" method="get">
        <div>
          <label className="label">員工</label>
          <select name="empId" className="select" defaultValue={emp?.id}>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.employeeNo} {e.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">年</label>
          <input name="year" type="number" className="input w-28" defaultValue={year} />
        </div>
        <div>
          <label className="label">月</label>
          <input name="month" type="number" min={1} max={12} className="input w-20" defaultValue={month} />
        </div>
        <button className="btn-primary">試算</button>
      </form>

      {emp && bundle && (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="card">
              <div className="text-sm text-neutral-500">月薪（本薪）</div>
              <div className="mt-1 text-xl font-bold">{twMoney(emp.monthlySalary)}</div>
              <div className="text-xs text-neutral-400">
                時薪 {twMoney(bundle.result.hourlyRate)} · 日薪 {twMoney(bundle.result.dailyWage)}
              </div>
            </div>
            <div className="card">
              <div className="text-sm text-neutral-500">當月遲到 / 早退</div>
              <div className="mt-1 text-xl font-bold">
                {bundle.attendance.lateMinutes} / {bundle.attendance.earlyLeaveMinutes} 分
              </div>
              <div className="text-xs text-neutral-400">曠職 {bundle.attendance.absentDays} 日</div>
            </div>
            <div className="card">
              <div className="text-sm text-neutral-500">請假時數（無薪 / 半薪 / 全薪）</div>
              <div className="mt-1 text-xl font-bold">
                {bundle.leaveHours.unpaid} / {bundle.leaveHours.half} / {bundle.leaveHours.full}
              </div>
              <div className="text-xs text-neutral-400">全薪假不扣薪</div>
            </div>
            <div className="card">
              <div className="text-sm text-neutral-500">實發金額</div>
              <div className="mt-1 text-2xl font-bold text-brand">{twMoney(bundle.result.netPay)}</div>
              <div className="text-xs text-neutral-400">
                {year} 年 {month} 月
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card">
              <h2 className="mb-3 font-semibold text-emerald-700">應發項目</h2>
              <table className="data">
                <tbody>
                  {bundle.result.earnings.map((e, i) => (
                    <tr key={i}>
                      <td>
                        {e.label}
                        {e.note && <span className="block text-xs text-neutral-400">{e.note}</span>}
                      </td>
                      <td className="text-right font-mono">{twMoney(e.amount)}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold">
                    <td>應發合計</td>
                    <td className="text-right font-mono">{twMoney(bundle.result.grossPay)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="card">
              <h2 className="mb-3 font-semibold text-red-700">應扣項目</h2>
              <table className="data">
                <tbody>
                  {bundle.result.deductions.length === 0 && (
                    <tr>
                      <td className="py-3 text-neutral-400">本月無扣款</td>
                      <td></td>
                    </tr>
                  )}
                  {bundle.result.deductions.map((d, i) => (
                    <tr key={i}>
                      <td>
                        {d.label}
                        {d.note && <span className="block text-xs text-neutral-400">{d.note}</span>}
                      </td>
                      <td className="text-right font-mono">− {twMoney(d.amount)}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold">
                    <td>應扣合計</td>
                    <td className="text-right font-mono">− {twMoney(bundle.result.totalDeductions)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="card flex items-center justify-between">
            <span className="font-semibold">實發薪資（Net Pay）</span>
            <span className="text-2xl font-bold text-brand">{twMoney(bundle.result.netPay)}</span>
          </div>

          {bundle.result.flags.length > 0 && (
            <div className="card border-amber-300 bg-amber-50 text-sm text-amber-800">
              <b>提醒：</b>
              <ul className="ml-4 list-disc">
                {bundle.result.flags.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-neutral-400">
            說明：加班費以加班單「補償方式＝加班費」且已核准者之試算金額加總；補休不列入。
            跨月假單目前整張計入起始月，正式版將依日切分。勞健保自付額為人資大表手動帶入，
            上線時可接投保級距表自動計算。
          </p>
        </>
      )}
    </div>
  );
}
