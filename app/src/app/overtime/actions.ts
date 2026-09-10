"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireEmployee } from "@/lib/session";
import { FLOWS } from "@/lib/workflow";
import { resolveApprovers, createApprovalChain } from "@/lib/requests";
import {
  overtimePay,
  checkMonthlyOtLimit,
  type DayType,
} from "@/lib/overtime";
import { startOfMonth, endOfMonth } from "@/lib/dates";

async function dayTypeFor(date: Date): Promise<DayType> {
  const hol = await prisma.holiday.findFirst({
    where: {
      date: {
        gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
      },
    },
  });
  if (hol && !hol.isWorkday) return "HOLIDAY";
  const dow = date.getDay();
  if (dow === 0) return "OFF_DAY"; // 週日：例假
  if (dow === 6) return "REST_DAY"; // 週六：休息日
  return "WORKDAY";
}

export async function submitOvertime(formData: FormData) {
  const me = await requireEmployee();
  const dateStr = String(formData.get("date"));
  const startT = String(formData.get("start")); // "18:00"
  const endT = String(formData.get("end")); // "20:30"
  const compensation = String(formData.get("compensation") || "PAY");
  const reason = String(formData.get("reason") || "").trim();
  const project = String(formData.get("project") || "").trim();

  if (!dateStr || !startT || !endT) throw new Error("請填寫日期與起訖時間");
  const plannedStart = new Date(`${dateStr}T${startT}:00+08:00`);
  const plannedEnd = new Date(`${dateStr}T${endT}:00+08:00`);
  if (plannedEnd <= plannedStart) throw new Error("結束時間需晚於開始時間");
  if (!reason) throw new Error("請填寫加班事由");

  const minutes = Math.round((plannedEnd.getTime() - plannedStart.getTime()) / 60000);
  const hours = minutes / 60;
  const date = new Date(`${dateStr}T00:00:00+08:00`);
  const dayType = await dayTypeFor(date);

  // §32 單日上限：正常 8 + 延長 ≤ 12（僅平日檢查延長 4 小時）
  if (dayType === "WORKDAY" && hours > 4) {
    throw new Error("平日單日延長工時不得超過 4 小時（正常 8 + 延長 4 = 12 小時上限）");
  }

  // 當月累計加班（含本次）
  const mStart = startOfMonth(date.getFullYear(), date.getMonth() + 1);
  const mEnd = endOfMonth(date.getFullYear(), date.getMonth() + 1);
  const agg = await prisma.overtimeRequest.aggregate({
    _sum: { actualMinutes: true },
    where: {
      employeeId: me.id,
      status: { in: ["APPROVED", "PENDING"] },
      date: { gte: mStart, lte: mEnd },
    },
  });
  const plannedAgg = await prisma.overtimeRequest.findMany({
    where: {
      employeeId: me.id,
      status: { in: ["APPROVED", "PENDING"] },
      date: { gte: mStart, lte: mEnd },
      actualMinutes: null,
    },
  });
  const plannedMinutes = plannedAgg.reduce(
    (s, o) => s + Math.round((o.plannedEnd.getTime() - o.plannedStart.getTime()) / 60000),
    0
  );
  const monthMinutes = (agg._sum.actualMinutes ?? 0) + plannedMinutes + minutes;
  const limit = checkMonthlyOtLimit(monthMinutes, false);

  const estimatedPay =
    compensation === "PAY" ? overtimePay(me.monthlySalary, hours, dayType) : null;

  const ot = await prisma.overtimeRequest.create({
    data: {
      employeeId: me.id,
      date,
      plannedStart,
      plannedEnd,
      dayType,
      compensation,
      reason,
      project: project || undefined,
      estimatedPay: estimatedPay ?? undefined,
      status: "PENDING",
      currentStep: 1,
    },
  });

  if (limit.level !== "OK") {
    await prisma.complianceAlert.create({
      data: {
        employeeId: me.id,
        rule: limit.level === "BREACH" ? "OT_46" : "OT_46",
        periodKey: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
        level: limit.level === "BREACH" ? "BREACH" : limit.level === "ALERT" ? "ALERT" : "WARN",
        message: limit.message,
      },
    });
  }

  const steps = limit.level === "OK" ? FLOWS.OVERTIME : FLOWS.OVERTIME_OVER_LIMIT;
  const chain = await resolveApprovers(me.id, steps);
  await createApprovalChain("OVERTIME", ot.id, chain);

  await prisma.auditLog.create({
    data: { actorId: me.id, action: "OT_SUBMIT", entity: "OvertimeRequest", entityId: String(ot.id) },
  });

  revalidatePath("/overtime");
  redirect("/overtime");
}
