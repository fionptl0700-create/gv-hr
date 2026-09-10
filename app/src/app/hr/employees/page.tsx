import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentEmployee, isHr, ROLE_LABEL } from "@/lib/session";
import { annualLeaveDays, yearsOfService } from "@/lib/annual-leave";
import { fmtDate, twMoney } from "@/lib/dates";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const me = await getCurrentEmployee();
  if (!me) redirect("/login");
  if (!isHr(me.role))
    return <div className="card text-sm text-neutral-500">此頁僅人資 / 管理員可檢視。</div>;

  const employees = await prisma.employee.findMany({
    include: { dept: true },
    orderBy: { employeeNo: "asc" },
  });
  const now = new Date();

  return (
    <div className="space-y-5">
      <PageHeader
        title="人資大表"
        desc="員工主檔 · 點姓名可編輯薪資、勞健保與異動；特休依到職日（週年制）自動計算"
      />

      <div className="card overflow-x-auto">
        <table className="data">
          <thead>
            <tr>
              <th>工號</th>
              <th>姓名</th>
              <th>部門 / 職稱</th>
              <th>角色</th>
              <th>到職日</th>
              <th>年資</th>
              <th>特休(當年)</th>
              <th>月薪</th>
              <th>全勤獎金</th>
              <th>狀態</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id}>
                <td className="font-mono">{e.employeeNo}</td>
                <td>
                  <Link href={`/hr/employees/${e.id}`} className="font-medium text-brand hover:underline">
                    {e.name}
                  </Link>
                </td>
                <td>
                  {e.dept?.name} / {e.positionTitle}
                </td>
                <td>{ROLE_LABEL[e.role]}</td>
                <td className="whitespace-nowrap">{fmtDate(e.hireDate)}</td>
                <td>{yearsOfService(e.hireDate, now)} 年</td>
                <td className="font-semibold text-brand">
                  {annualLeaveDays(e.hireDate, now)} 日
                </td>
                <td>{twMoney(e.monthlySalary)}</td>
                <td>{twMoney(e.fullAttendanceBonus)}</td>
                <td>
                  {e.status === "ACTIVE" ? "在職" : e.status === "RESIGNED" ? "離職" : "留停"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-neutral-400">
        欄位擴充（勞健保投保級距、眷屬、證照、教育訓練、獎懲、資產配發等）於 M2–M7 逐步加入。
      </p>
    </div>
  );
}
