// 特別休假計算引擎 — 勞基法 §38（週年制）
//
// 級距：
//   滿 6 個月未滿 1 年：3 日
//   滿 1 年未滿 2 年　：7 日
//   滿 2 年未滿 3 年　：10 日
//   滿 3 年未滿 5 年　：每年 14 日
//   滿 5 年未滿 10 年 ：每年 15 日
//   滿 10 年以上　　　：每滿 1 年加 1 日，上限 30 日

export function monthsOfService(hireDate: Date, asOf: Date): number {
  let months =
    (asOf.getFullYear() - hireDate.getFullYear()) * 12 +
    (asOf.getMonth() - hireDate.getMonth());
  if (asOf.getDate() < hireDate.getDate()) months -= 1;
  return Math.max(0, months);
}

export function yearsOfService(hireDate: Date, asOf: Date): number {
  return Math.floor(monthsOfService(hireDate, asOf) / 12);
}

/** 依到職日與基準日，回傳「當下適用」的特休日數 */
export function annualLeaveDays(hireDate: Date, asOf: Date = new Date()): number {
  const months = monthsOfService(hireDate, asOf);
  const years = Math.floor(months / 12);
  if (months < 6) return 0;
  if (months < 12) return 3;
  if (years < 2) return 7;
  if (years < 3) return 10;
  if (years < 5) return 14;
  if (years < 10) return 15;
  return Math.min(15 + (years - 9), 30); // 10 年 → 16 … 24 年起 → 30
}

export type AnniversaryPeriod = {
  /** 週年制年度起日（到職週年 或 滿 6 個月之日） */
  periodStart: Date;
  /** 週年制年度迄日（次一週年前一日） */
  periodEnd: Date;
  /** 本年度應給特休日數 */
  grantedDays: number;
  /** 期間起始時的年資（滿幾年） */
  yearsAtStart: number;
  /** 距年度結束天數 */
  daysUntilEnd: number;
};

function addYears(d: Date, n: number): Date {
  const r = new Date(d);
  r.setFullYear(r.getFullYear() + n);
  return r;
}
function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** 取得 asOf 當下所屬的「週年制特休年度」與其應給日數 */
export function currentAnniversaryPeriod(
  hireDate: Date,
  asOf: Date = new Date()
): AnniversaryPeriod {
  const months = monthsOfService(hireDate, asOf);
  const sixMonthMark = addMonths(hireDate, 6);
  const firstAnniversary = addYears(hireDate, 1);

  let periodStart: Date;
  let periodEnd: Date;

  if (months < 6) {
    // 尚未取得特休：以到職日至滿 6 個月為觀察期
    periodStart = new Date(hireDate);
    periodEnd = addDays(sixMonthMark, -1);
  } else if (months < 12) {
    // 滿 6 個月、未滿 1 年：3 日，期間至滿 1 年前一日
    periodStart = sixMonthMark;
    periodEnd = addDays(firstAnniversary, -1);
  } else {
    const y = Math.floor(months / 12);
    periodStart = addYears(hireDate, y);
    periodEnd = addDays(addYears(hireDate, y + 1), -1);
  }

  const grantedDays = annualLeaveDays(hireDate, periodStart >= asOf ? asOf : periodStart);
  const daysUntilEnd = Math.ceil(
    (periodEnd.getTime() - asOf.getTime()) / 86_400_000
  );

  return {
    periodStart,
    periodEnd,
    grantedDays: months < 6 ? 0 : grantedDays,
    yearsAtStart: yearsOfService(hireDate, periodStart),
    daysUntilEnd,
  };
}

/** 產生自到職以來每個特休年度的給假排程（供 leave_balances 建檔 / 稽核用） */
export function annualLeaveSchedule(
  hireDate: Date,
  until: Date = new Date()
): { grantDate: Date; periodEnd: Date; days: number }[] {
  const out: { grantDate: Date; periodEnd: Date; days: number }[] = [];
  const sixMonthMark = addMonths(hireDate, 6);
  if (sixMonthMark <= until) {
    out.push({
      grantDate: sixMonthMark,
      periodEnd: addDays(addYears(hireDate, 1), -1),
      days: 3,
    });
  }
  let y = 1;
  while (addYears(hireDate, y) <= until) {
    const grantDate = addYears(hireDate, y);
    out.push({
      grantDate,
      periodEnd: addDays(addYears(hireDate, y + 1), -1),
      days: annualLeaveDays(hireDate, grantDate),
    });
    y += 1;
  }
  return out;
}

/** 未休特休折算工資（元）。dailyWage 通常為 月薪 / 30 */
export function unusedAnnualLeavePayout(unusedDays: number, dailyWage: number): number {
  return Math.round(unusedDays * dailyWage);
}
