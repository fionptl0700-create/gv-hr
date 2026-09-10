"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireEmployee, isHr } from "@/lib/session";

export async function updateEmployee(formData: FormData) {
  const me = await requireEmployee();
  if (!isHr(me.role)) throw new Error("僅人資可編輯");

  const id = Number(formData.get("id"));
  const before = await prisma.employee.findUnique({ where: { id } });
  if (!before) throw new Error("找不到員工");

  const num = (k: string, d = 0) => {
    const v = formData.get(k);
    const n = v === null || v === "" ? d : Number(v);
    return Number.isFinite(n) ? n : d;
  };
  const str = (k: string) => String(formData.get(k) ?? "").trim();

  const data = {
    name: str("name") || before.name,
    positionTitle: str("positionTitle") || null,
    jobGrade: str("jobGrade") || null,
    role: str("role") || before.role,
    deptId: num("deptId", before.deptId ?? 0) || null,
    managerId: num("managerId", 0) || null,
    scheduleId: num("scheduleId", before.scheduleId ?? 0) || null,
    workLocation: str("workLocation") || before.workLocation,
    hireDate: str("hireDate") ? new Date(str("hireDate") + "T00:00:00+08:00") : before.hireDate,
    status: str("status") || before.status,
    monthlySalary: num("monthlySalary", before.monthlySalary),
    fullAttendanceBonus: num("fullAttendanceBonus", before.fullAttendanceBonus),
    laborInsuranceGrade: num("laborInsuranceGrade", 0) || null,
    healthInsuranceGrade: num("healthInsuranceGrade", 0) || null,
    laborInsuranceSelf: num("laborInsuranceSelf", before.laborInsuranceSelf),
    healthInsuranceSelf: num("healthInsuranceSelf", before.healthInsuranceSelf),
    pensionSelfPercent: num("pensionSelfPercent", before.pensionSelfPercent),
    lineUserId: str("lineUserId") || null,
    bankAccount: str("bankAccount") || null,
    emergencyContact: str("emergencyContact") || null,
    isIndigenous: formData.get("isIndigenous") === "on",
  };

  await prisma.employee.update({ where: { id }, data });

  // 薪資異動留痕
  if (data.monthlySalary !== before.monthlySalary) {
    await prisma.employeeChange.create({
      data: {
        employeeId: id,
        type: "GRADE",
        effectiveDate: new Date(),
        fromValue: String(before.monthlySalary),
        toValue: String(data.monthlySalary),
        note: `月薪調整（操作人：${me.name}）`,
      },
    });
  }
  await prisma.auditLog.create({
    data: {
      actorId: me.id,
      action: "EMPLOYEE_UPDATE",
      entity: "Employee",
      entityId: String(id),
      before: JSON.stringify({
        monthlySalary: before.monthlySalary,
        role: before.role,
        deptId: before.deptId,
      }),
      after: JSON.stringify({
        monthlySalary: data.monthlySalary,
        role: data.role,
        deptId: data.deptId,
      }),
    },
  });

  revalidatePath(`/hr/employees/${id}`);
  revalidatePath("/hr/employees");
  revalidatePath("/hr/payroll");
}
