// 每日出勤結算 — 台北正常班 09:00–18:00（休息 60 分鐘）

export type SettleInput = {
  date: Date;
  workStart: string; // "09:00"
  workEnd: string; // "18:00"
  lunchMinutes: number; // 60
  workdays: number[]; // [1,2,3,4,5]
  firstIn: Date | null;
  lastOut: Date | null;
  isHoliday: boolean; // 國定假日 / 彈性放假（appliesTo 命中）
  isMakeupWorkday: boolean; // 補班日
  hasApprovedLeaveFullDay: boolean;
  hasApprovedTrip: boolean;
  hasApprovedWfh: boolean;
  hasApprovedOt: boolean;
};

export type SettleResult = {
  status:
    | "NORMAL"
    | "LATE"
    | "EARLY"
    | "ABSENT"
    | "LEAVE"
    | "TRIP"
    | "WFH"
    | "HOLIDAY"
    | "MAKEUP"
    | "OFF"; // 週末休息日 / 例假，且無出勤
  workMinutes: number;
  lateMinutes: number;
  earlyLeaveMin: number;
  otMinutes: number;
  anomalies: { type: string; detail: string; severity: "INFO" | "WARN" | "HIGH" }[];
};

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function settleDay(i: SettleInput): SettleResult {
  const anomalies: SettleResult["anomalies"] = [];
  const empty = { workMinutes: 0, lateMinutes: 0, earlyLeaveMin: 0, otMinutes: 0 };

  // 例假 / 週末休息日
  const dow = i.date.getDay(); // 0=日
  const isScheduledWorkday = i.workdays.includes(dow) || i.isMakeupWorkday;

  if (i.hasApprovedTrip) return { status: "TRIP", ...empty, anomalies };
  if (i.hasApprovedLeaveFullDay) return { status: "LEAVE", ...empty, anomalies };

  if (i.isHoliday && !i.isMakeupWorkday) {
    // 國定假日：如有加班另計，否則 HOLIDAY
    if (i.firstIn && i.lastOut && i.hasApprovedOt) {
      const ot = Math.max(0, minutesOfDay(i.lastOut) - minutesOfDay(i.firstIn) - i.lunchMinutes);
      return { status: "HOLIDAY", workMinutes: 0, lateMinutes: 0, earlyLeaveMin: 0, otMinutes: ot, anomalies };
    }
    return { status: "HOLIDAY", ...empty, anomalies };
  }

  if (!isScheduledWorkday) {
    if (i.firstIn && i.lastOut) {
      const ot = Math.max(0, minutesOfDay(i.lastOut) - minutesOfDay(i.firstIn) - i.lunchMinutes);
      if (!i.hasApprovedOt) {
        anomalies.push({ type: "OT_NO_REQUEST", detail: "休息日出勤但無加班申請", severity: "WARN" });
      }
      return { status: "OFF", workMinutes: 0, lateMinutes: 0, earlyLeaveMin: 0, otMinutes: ot, anomalies };
    }
    return { status: "OFF", ...empty, anomalies };
  }

  // 應出勤日
  const startM = toMinutes(i.workStart);
  const endM = toMinutes(i.workEnd);

  if (!i.firstIn && !i.lastOut) {
    anomalies.push({ type: "ABSENT", detail: "整日無打卡且無假單", severity: "HIGH" });
    return { status: "ABSENT", ...empty, anomalies };
  }
  if (!i.firstIn || !i.lastOut) {
    anomalies.push({
      type: "MISSING_PUNCH",
      detail: !i.firstIn ? "缺上班打卡" : "缺下班打卡",
      severity: "HIGH",
    });
    return { status: "ABSENT", ...empty, anomalies };
  }

  const inM = minutesOfDay(i.firstIn);
  const outM = minutesOfDay(i.lastOut);

  const lateMinutes = Math.max(0, inM - startM);
  const earlyLeaveMin = Math.max(0, endM - outM);
  const grossSpan = Math.max(0, outM - inM);
  const workMinutes = Math.max(0, Math.min(grossSpan, endM - startM) - i.lunchMinutes);
  let otMinutes = Math.max(0, outM - endM);

  if (otMinutes > 0 && !i.hasApprovedOt) {
    anomalies.push({ type: "OT_NO_REQUEST", detail: `下班後 ${otMinutes} 分鐘無加班申請`, severity: "WARN" });
    otMinutes = 0;
  }
  if (lateMinutes > 0) {
    anomalies.push({ type: "LATE", detail: `遲到 ${lateMinutes} 分鐘`, severity: "WARN" });
  }
  if (earlyLeaveMin > 0) {
    anomalies.push({ type: "EARLY_LEAVE", detail: `早退 ${earlyLeaveMin} 分鐘`, severity: "WARN" });
  }

  const status: SettleResult["status"] = i.isMakeupWorkday
    ? "MAKEUP"
    : lateMinutes > 0
    ? "LATE"
    : earlyLeaveMin > 0
    ? "EARLY"
    : i.hasApprovedWfh
    ? "WFH"
    : "NORMAL";

  return { status, workMinutes, lateMinutes, earlyLeaveMin, otMinutes, anomalies };
}

export const STATUS_LABEL: Record<string, string> = {
  NORMAL: "正常",
  LATE: "遲到",
  EARLY: "早退",
  ABSENT: "異常/缺卡",
  LEAVE: "請假",
  TRIP: "出差",
  WFH: "遠距",
  HOLIDAY: "國定假日",
  MAKEUP: "補班出勤",
  OFF: "休假",
};
