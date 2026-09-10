// LINE 通知模組（M6 正式串接）
// 現階段：一律寫入 notifications 資料表；若已設定 LINE_CHANNEL_ACCESS_TOKEN 則實際推播。

import { prisma } from "./db";

type NotifyArgs = {
  employeeId: number;
  template: string;
  text: string;
  payload?: Record<string, unknown>;
};

export async function notify({ employeeId, template, text, payload }: NotifyArgs) {
  const emp = await prisma.employee.findUnique({ where: { id: employeeId } });
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  const record = await prisma.notification.create({
    data: {
      employeeId,
      channel: token && emp?.lineUserId ? "LINE" : "EMAIL",
      template,
      payload: JSON.stringify({ text, ...payload }),
      status: "QUEUED",
    },
  });

  if (token && emp?.lineUserId) {
    try {
      const res = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: emp.lineUserId,
          messages: [{ type: "text", text }],
        }),
      });
      await prisma.notification.update({
        where: { id: record.id },
        data: res.ok
          ? { status: "SENT", sentAt: new Date() }
          : { status: "FAILED", error: `HTTP ${res.status}` },
      });
    } catch (e) {
      await prisma.notification.update({
        where: { id: record.id },
        data: { status: "FAILED", error: String(e) },
      });
    }
  } else {
    // 未設定 LINE：標記為 QUEUED，待批次改寄 Email
    await prisma.notification.update({
      where: { id: record.id },
      data: { status: "QUEUED" },
    });
  }

  return record;
}

export const LINE_TEMPLATES = {
  APPROVAL_PENDING: "approval_pending",
  APPROVAL_RESULT: "approval_result",
  ATTENDANCE_ANOMALY: "attendance_anomaly",
  ANNUAL_LEAVE_EXPIRING: "annual_leave_expiring",
  OT_LIMIT_WARNING: "ot_limit_warning",
} as const;
