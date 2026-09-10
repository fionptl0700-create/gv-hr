"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireEmployee } from "@/lib/session";
import { countWorkingDays } from "@/lib/working-days";
import { leaveFlow } from "@/lib/workflow";
import { resolveApprovers, createApprovalChain } from "@/lib/requests";
import { currentAnniversaryPeriod } from "@/lib/annual-leave";

export async function submitLeave(formData: FormData) {
  const me = await requireEmployee();
  const leaveTypeId = Number(formData.get("leaveTypeId"));
  const startDate = String(formData.get("startDate"));
  const endDate = String(formData.get("endDate"));
  const period = String(formData.get("period") || "FULL"); // FULL | AM | PM
  const reason = String(formData.get("reason") || "").trim();
  const agentId = formData.get("agentId") ? Number(formData.get("agentId")) : null;
  const attachmentName = String(formData.get("attachmentName") || "").trim();

  const lt = await prisma.leaveType.findUnique({ where: { id: leaveTypeId } });
  if (!lt) throw new Error("假別不存在");
  if (!startDate || !endDate) throw new Error("請填寫起訖日期");

  const start = new Date(startDate + "T00:00:00+08:00");
  const end = new Date(endDate + "T23:59:59+08:00");
  if (end < start) throw new Error("結束日不得早於開始日");

  // 附件規則
  if (lt.attachmentRule === "REQUIRED" && !attachmentName) {
    throw new Error(`「${lt.name}」為必附證明文件假別：${lt.attachmentNote ?? ""}（可先送出後限期補件，此處示範為必填）`);
  }
  if (lt.attachmentRule === "FORBIDDEN" && attachmentName) {
    throw new Error(`「${lt.name}」依規定不得要求檢附證明文件`);
  }

  // 時數 / 日數
  let days: number;
  let hours: number;
  const sameDay = startDate === endDate;
  if (sameDay && (period === "AM" || period === "PM")) {
    days = 0.5;
    hours = 4;
  } else {
    days = await countWorkingDays(start, end);
    if (days === 0) throw new Error("所選期間內沒有應出勤日（可能全為假日）");
    hours = days * 8;
  }

  // 額度檢查（特休；其餘假別以 annualQuota 粗估）
  let balanceId: number | null = null;
  if (lt.code === "ANNUAL") {
    const p = currentAnniversaryPeriod(me.hireDate, start);
    const bal = await prisma.leaveBalance.findFirst({
      where: {
        employeeId: me.id,
        leaveTypeId: lt.id,
        periodStart: { lte: start },
        periodEnd: { gte: start },
      },
    });
    const granted = bal?.grantedDays ?? p.grantedDays;
    const used = bal?.usedDays ?? 0;
    const pending = bal?.pendingDays ?? 0;
    if (days > granted - used - pending) {
      throw new Error(
        `特休餘額不足：本年度給假 ${granted} 日，已用 ${used} 日、簽核中 ${pending} 日，本次申請 ${days} 日`
      );
    }
    balanceId = bal?.id ?? null;
  } else if (lt.annualQuota != null) {
    const yearStart = new Date(start.getFullYear(), 0, 1);
    const yearEnd = new Date(start.getFullYear(), 11, 31, 23, 59, 59);
    const usedAgg = await prisma.leaveRequest.aggregate({
      _sum: { days: true },
      where: {
        employeeId: me.id,
        leaveTypeId: lt.id,
        status: { in: ["APPROVED", "PENDING"] },
        startAt: { gte: yearStart, lte: yearEnd },
      },
    });
    const usedYear = usedAgg._sum.days ?? 0;
    if (usedYear + days > lt.annualQuota) {
      throw new Error(
        `「${lt.name}」年度額度 ${lt.annualQuota} 日，已使用/申請 ${usedYear} 日，本次 ${days} 日將超過上限`
      );
    }
  }

  const lr = await prisma.leaveRequest.create({
    data: {
      employeeId: me.id,
      leaveTypeId: lt.id,
      startAt: start,
      endAt: end,
      hours,
      days,
      reason,
      agentId,
      attachments: JSON.stringify(attachmentName ? [attachmentName] : []),
      status: "PENDING",
      currentStep: 1,
    },
  });

  // 佔用 pending 額度
  if (balanceId) {
    await prisma.leaveBalance.update({
      where: { id: balanceId },
      data: { pendingDays: { increment: days } },
    });
  }

  const steps = leaveFlow(lt.needsHrReview);
  const chain = await resolveApprovers(me.id, steps);
  await createApprovalChain("LEAVE", lr.id, chain);

  await prisma.auditLog.create({
    data: { actorId: me.id, action: "LEAVE_SUBMIT", entity: "LeaveRequest", entityId: String(lr.id) },
  });

  revalidatePath("/leave");
  redirect("/leave");
}

export async function cancelLeave(formData: FormData) {
  const me = await requireEmployee();
  const id = Number(formData.get("id"));
  const lr = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!lr || lr.employeeId !== me.id) throw new Error("找不到申請單");
  if (lr.status === "APPROVED" || lr.status === "PENDING") {
    await prisma.leaveRequest.update({ where: { id }, data: { status: "CANCELLED" } });
    const bal = await prisma.leaveBalance.findFirst({
      where: {
        employeeId: lr.employeeId,
        leaveTypeId: lr.leaveTypeId,
        periodStart: { lte: lr.startAt },
        periodEnd: { gte: lr.startAt },
      },
    });
    if (bal) {
      await prisma.leaveBalance.update({
        where: { id: bal.id },
        data: {
          pendingDays: lr.status === "PENDING" ? Math.max(0, bal.pendingDays - lr.days) : bal.pendingDays,
          usedDays: lr.status === "APPROVED" ? Math.max(0, bal.usedDays - lr.days) : bal.usedDays,
        },
      });
    }
    await prisma.approval.updateMany({
      where: { leaveRequestId: id, status: "PENDING" },
      data: { status: "REJECTED", comment: "申請人取消" },
    });
  }
  revalidatePath("/leave");
}
