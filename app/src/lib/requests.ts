import { prisma } from "./db";
import type { FlowStep } from "./workflow";
import { notify, LINE_TEMPLATES } from "./line";

export type FormType = "LEAVE" | "OVERTIME" | "TRIP" | "OUTING" | "WFH" | "PUNCH_FIX";

/** 依流程步驟解析實際簽核人 employee.id（找不到者略過） */
export async function resolveApprovers(
  employeeId: number,
  steps: FlowStep[]
): Promise<{ step: number; approverId: number; label: string }[]> {
  const emp = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { dept: true },
  });
  if (!emp) return [];

  const hr = await prisma.employee.findFirst({
    where: { role: { in: ["HR", "ADMIN"] } },
    orderBy: { id: "asc" },
  });

  const out: { step: number; approverId: number; label: string }[] = [];
  let step = 1;
  for (const s of steps) {
    let approverId: number | null = null;
    if (s.role === "MANAGER") approverId = emp.managerId ?? emp.dept?.managerId ?? null;
    else if (s.role === "DEPT") approverId = emp.dept?.managerId ?? null;
    else if (s.role === "HR") approverId = hr?.id ?? null;

    // 去除與前一關相同、或等於申請人自己的簽核人
    if (approverId && approverId !== employeeId && !out.some((o) => o.approverId === approverId)) {
      out.push({ step, approverId, label: s.label });
      step += 1;
    }
  }
  // 若完全解析不到（例如最高主管請假），退回給 HR
  if (out.length === 0 && hr && hr.id !== employeeId) {
    out.push({ step: 1, approverId: hr.id, label: "人資" });
  }
  return out;
}

const FK: Record<FormType, string> = {
  LEAVE: "leaveRequestId",
  OVERTIME: "overtimeRequestId",
  TRIP: "businessTripId",
  OUTING: "outingId",
  WFH: "wfhRequestId",
  PUNCH_FIX: "leaveRequestId", // 補打卡未建獨立關聯，簽核以 formType 區分
};

export async function createApprovalChain(
  formType: FormType,
  formId: number,
  chain: { step: number; approverId: number; label: string }[]
) {
  for (const c of chain) {
    await prisma.approval.create({
      data: {
        formType,
        step: c.step,
        approverId: c.approverId,
        status: "PENDING",
        ...(formType !== "PUNCH_FIX" ? { [FK[formType]]: formId } : {}),
      },
    });
  }
  if (chain[0]) {
    await notify({
      employeeId: chain[0].approverId,
      template: LINE_TEMPLATES.APPROVAL_PENDING,
      text: `您有一筆${formLabel(formType)}待簽核`,
      payload: { formType, formId, step: 1 },
    });
  }
}

export function formLabel(t: FormType) {
  return {
    LEAVE: "請假單",
    OVERTIME: "加班單",
    TRIP: "出差單",
    OUTING: "外出單",
    WFH: "遠距工作單",
    PUNCH_FIX: "補打卡單",
  }[t];
}

type FormRow = { id: number; currentStep: number; status: string; employeeId: number };

async function getForm(formType: FormType, formId: number): Promise<FormRow | null> {
  switch (formType) {
    case "LEAVE":
      return prisma.leaveRequest.findUnique({ where: { id: formId } });
    case "OVERTIME":
      return prisma.overtimeRequest.findUnique({ where: { id: formId } });
    case "TRIP":
      return prisma.businessTrip.findUnique({ where: { id: formId } });
    case "OUTING": {
      const o = await prisma.outing.findUnique({ where: { id: formId } });
      return o ? { ...o, currentStep: 1 } : null;
    }
    case "WFH": {
      const w = await prisma.wfhRequest.findUnique({ where: { id: formId } });
      return w ? { ...w, currentStep: 1 } : null;
    }
    default:
      return null;
  }
}

async function setFormStatus(
  formType: FormType,
  formId: number,
  data: { status?: string; currentStep?: number; decidedAt?: Date }
) {
  const payload: any = { ...data };
  if (formType === "OUTING" || formType === "WFH") delete payload.currentStep;
  switch (formType) {
    case "LEAVE":
      return prisma.leaveRequest.update({ where: { id: formId }, data: payload });
    case "OVERTIME":
      return prisma.overtimeRequest.update({ where: { id: formId }, data: payload });
    case "TRIP":
      return prisma.businessTrip.update({ where: { id: formId }, data: payload });
    case "OUTING":
      return prisma.outing.update({ where: { id: formId }, data: { status: data.status } });
    case "WFH":
      return prisma.wfhRequest.update({ where: { id: formId }, data: { status: data.status } });
  }
}

/** 簽核決行：推進下一關或結案 */
export async function decideApproval(
  approvalId: number,
  action: "APPROVED" | "REJECTED",
  comment: string | undefined,
  approverId: number
) {
  const appr = await prisma.approval.findUnique({ where: { id: approvalId } });
  if (!appr || appr.status !== "PENDING") throw new Error("此簽核關卡已處理或不存在");
  if (appr.approverId !== approverId) throw new Error("非本關簽核人");

  await prisma.approval.update({
    where: { id: approvalId },
    data: { status: action, comment, decidedAt: new Date() },
  });

  const formType = appr.formType as FormType;
  const formId =
    appr.leaveRequestId ??
    appr.overtimeRequestId ??
    appr.businessTripId ??
    appr.outingId ??
    appr.wfhRequestId!;
  const form = await getForm(formType, formId);
  if (!form) return;

  if (action === "REJECTED") {
    await setFormStatus(formType, formId, { status: "REJECTED", decidedAt: new Date() });
    // 還原 pending 額度
    if (formType === "LEAVE") await releasePendingLeave(formId);
    await notify({
      employeeId: form.employeeId,
      template: LINE_TEMPLATES.APPROVAL_RESULT,
      text: `您的${formLabel(formType)}已被駁回${comment ? `：${comment}` : ""}`,
    });
    return;
  }

  // APPROVED — 是否還有下一關
  const nextStep = (form.currentStep ?? 1) + 1;
  const next = await prisma.approval.findFirst({
    where: { formType, step: nextStep, ...approvalWhere(formType, formId) },
  });

  if (next) {
    await setFormStatus(formType, formId, { currentStep: nextStep });
    await notify({
      employeeId: next.approverId,
      template: LINE_TEMPLATES.APPROVAL_PENDING,
      text: `您有一筆${formLabel(formType)}待簽核（第 ${nextStep} 關）`,
    });
  } else {
    await setFormStatus(formType, formId, { status: "APPROVED", decidedAt: new Date() });
    await onFormApproved(formType, formId);
    await notify({
      employeeId: form.employeeId,
      template: LINE_TEMPLATES.APPROVAL_RESULT,
      text: `您的${formLabel(formType)}已核准`,
    });
  }
}

function approvalWhere(formType: FormType, formId: number) {
  switch (formType) {
    case "LEAVE":
      return { leaveRequestId: formId };
    case "OVERTIME":
      return { overtimeRequestId: formId };
    case "TRIP":
      return { businessTripId: formId };
    case "OUTING":
      return { outingId: formId };
    case "WFH":
      return { wfhRequestId: formId };
    default:
      return {};
  }
}

async function releasePendingLeave(leaveId: number) {
  const lr = await prisma.leaveRequest.findUnique({ where: { id: leaveId } });
  if (!lr) return;
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
      data: { pendingDays: Math.max(0, bal.pendingDays - lr.days) },
    });
  }
}

async function onFormApproved(formType: FormType, formId: number) {
  if (formType === "LEAVE") {
    const lr = await prisma.leaveRequest.findUnique({ where: { id: formId } });
    if (!lr) return;
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
          pendingDays: Math.max(0, bal.pendingDays - lr.days),
          usedDays: bal.usedDays + lr.days,
        },
      });
    }
  }
  if (formType === "OVERTIME") {
    const ot = await prisma.overtimeRequest.findUnique({ where: { id: formId } });
    if (!ot) return;
    const minutes =
      ot.actualMinutes ??
      Math.max(0, (ot.plannedEnd.getTime() - ot.plannedStart.getTime()) / 60000);
    if (ot.compensation === "COMP_TIME") {
      const expires = new Date(ot.date);
      expires.setMonth(expires.getMonth() + 6);
      await prisma.compTimeEntry.create({
        data: {
          employeeId: ot.employeeId,
          earnedMinutes: Math.round(minutes),
          earnedOn: ot.date,
          expiresOn: expires,
          sourceOtId: ot.id,
        },
      });
    }
  }
}
