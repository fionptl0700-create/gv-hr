import { prisma } from "./db";
import { startOfMonth, endOfMonth, startOfDay, endOfDay, toDateInput } from "./dates";
import { settleDay } from "./attendance";
import { computeMonthlyPayroll, type PayrollInput, type PayrollResult } from "./payroll";

export type MonthAttendanceSummary = {
  lateMinutes: number;
  earlyLeaveMinutes: number;
  absentDays: number;
  workdays: number;
  daysWithPunch: number;
};

/** 依打卡逐日結算，彙總當月遲到 / 早退 / 曠職 */
export async function summariseMonthAttendance(
  employeeId: number,
  year: number,
  month: number
): Promise<MonthAttendanceSummary> {
  const emp = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { schedule: true },
  });
  const sched = emp?.schedule;
  const workStart = sched?.workStart ?? "09:00";
  const workEnd = sched?.workEnd ?? "18:00";
  const lunch = sched?.lunchMinutes ?? 60;
  const workdaysArr = (sched?.workdays ?? "1,2,3,4,5").split(",").map(Number);

  const mStart = startOfMonth(year, month);
  const mEnd = endOfMonth(year, month);

  const [punches, holidays, leaves, trips, wfhs, ots] = await Promise.all([
    prisma.punchRecord.findMany({
      where: { employeeId, ts: { gte: mStart, lte: mEnd } },
      orderBy: { ts: "asc" },
    }),
    prisma.holiday.findMany({ where: { date: { gte: mStart, lte: mEnd } } }),
    prisma.leaveRequest.findMany({
      where: { employeeId, status: "APPROVED", startAt: { lte: mEnd }, endAt: { gte: mStart } },
    }),
    prisma.businessTrip.findMany({
      where: { employeeId, status: "APPROVED", startAt: { lte: mEnd }, endAt: { gte: mStart } },
    }),
    prisma.wfhRequest.findMany({
      where: { employeeId, status: "APPROVED", date: { gte: mStart, lte: mEnd } },
    }),
    prisma.overtimeRequest.findMany({
      where: { employeeId, status: "APPROVED", date: { gte: mStart, lte: mEnd } },
    }),
  ]);

  const holMap = new Map(holidays.map((h) => [toDateInput(new Date(h.date)), h]));

  let lateMinutes = 0;
  let earlyLeaveMinutes = 0;
  let absentDays = 0;
  let workdayCount = 0;
  let daysWithPunch = 0;

  const today = new Date();
  const cur = new Date(mStart);
  while (cur <= mEnd && cur <= today) {
    const key = toDateInput(cur);
    const hol = holMap.get(key);
    const isHoliday = !!hol && !hol.isWorkday && (hol.appliesTo === "ALL" || hol.appliesTo === "LABOR");
    const isMakeup = !!hol?.isWorkday;
    const isWorkday = workdaysArr.includes(cur.getDay()) || isMakeup;

    if (isWorkday && !isHoliday) workdayCount += 1;

    const dayStart = startOfDay(cur);
    const dayEnd = endOfDay(cur);
    const dp = punches.filter((p) => p.ts >= dayStart && p.ts <= dayEnd);
    const firstIn = dp.find((p) => p.type === "IN")?.ts ?? null;
    const lastOut = [...dp].reverse().find((p) => p.type === "OUT")?.ts ?? null;
    if (dp.length) daysWithPunch += 1;

    const onLeaveFull = leaves.some((l) => l.startAt <= dayEnd && l.endAt >= dayStart && l.days >= 1);
    const onTrip = trips.some((t) => t.startAt <= dayEnd && t.endAt >= dayStart);
    const onWfh = wfhs.some((w) => toDateInput(new Date(w.date)) === key);
    const hasOt = ots.some((o) => toDateInput(new Date(o.date)) === key);

    const r = settleDay({
      date: new Date(cur),
      workStart,
      workEnd,
      lunchMinutes: lunch,
      workdays: workdaysArr,
      firstIn,
      lastOut,
      isHoliday,
      isMakeupWorkday: isMakeup,
      hasApprovedLeaveFullDay: onLeaveFull,
      hasApprovedTrip: onTrip,
      hasApprovedWfh: onWfh,
      hasApprovedOt: hasOt,
    });

    lateMinutes += r.lateMinutes;
    earlyLeaveMinutes += r.earlyLeaveMin;
    if (r.status === "ABSENT") absentDays += 1;

    cur.setDate(cur.getDate() + 1);
  }

  return {
    lateMinutes,
    earlyLeaveMinutes,
    absentDays,
    workdays: workdayCount,
    daysWithPunch,
  };
}

export type MonthPayrollBundle = {
  attendance: MonthAttendanceSummary;
  leaveHours: { unpaid: number; half: number; full: number };
  overtimePay: number;
  result: PayrollResult;
};

export async function buildMonthlyPayroll(
  employeeId: number,
  year: number,
  month: number
): Promise<MonthPayrollBundle> {
  const emp = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!emp) throw new Error("找不到員工");

  const mStart = startOfMonth(year, month);
  const mEnd = endOfMonth(year, month);

  const attendance = await summariseMonthAttendance(employeeId, year, month);

  const leaves = await prisma.leaveRequest.findMany({
    where: { employeeId, status: "APPROVED", startAt: { lte: mEnd }, endAt: { gte: mStart } },
    include: { leaveType: true },
  });
  const leaveHours = { unpaid: 0, half: 0, full: 0 };
  for (const l of leaves) {
    // 粗估：整張假單時數計入該月（跨月時可再依日切分）
    const rate = l.leaveType.paidRate;
    if (rate === 0) leaveHours.unpaid += l.hours;
    else if (rate === 0.5) leaveHours.half += l.hours;
    else leaveHours.full += l.hours;
  }

  const ots = await prisma.overtimeRequest.findMany({
    where: {
      employeeId,
      status: "APPROVED",
      compensation: "PAY",
      date: { gte: mStart, lte: mEnd },
    },
  });
  const overtimePay = ots.reduce((s, o) => s + (o.estimatedPay ?? 0), 0);

  const pensionSelf = Math.round((emp.monthlySalary * (emp.pensionSelfPercent ?? 0)) / 100);

  const input: PayrollInput = {
    year,
    month,
    monthlySalary: emp.monthlySalary,
    fullAttendanceBonus: emp.fullAttendanceBonus,
    lateMinutes: attendance.lateMinutes,
    earlyLeaveMinutes: attendance.earlyLeaveMinutes,
    absentDays: attendance.absentDays,
    unpaidLeaveHours: leaveHours.unpaid,
    halfPaidLeaveHours: leaveHours.half,
    fullPaidLeaveHours: leaveHours.full,
    overtimePay,
    laborInsuranceSelf: emp.laborInsuranceSelf,
    healthInsuranceSelf: emp.healthInsuranceSelf,
    pensionSelf,
  };

  return {
    attendance,
    leaveHours,
    overtimePay,
    result: computeMonthlyPayroll(input),
  };
}
