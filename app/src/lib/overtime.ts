// 加班（延長工時）— 勞基法 §24 費率、§32 上限、§32-1 補休
//
// 時薪基準：月薪 / 240（每月 30 日 × 8 小時）

export const HOURLY_DIVISOR = 240;

export function hourlyRate(monthlySalary: number): number {
  return monthlySalary / HOURLY_DIVISOR;
}

export type DayType = "WORKDAY" | "REST_DAY" | "HOLIDAY" | "OFF_DAY";

/** 平日延長工時加班費（§24 I）：前 2 小時 4/3、第 3–4 小時 5/3、逾 4 小時仍以 5/3 計 */
export function weekdayOtPay(rate: number, hours: number): number {
  const first2 = Math.min(hours, 2) * rate * (4 / 3);
  const beyond2 = Math.max(hours - 2, 0) * rate * (5 / 3);
  return first2 + beyond2;
}

/** 休息日出勤加班費（§24 III）：前 2 小時 4/3、第 3 小時起 5/3，核實計算 */
export function restDayOtPay(rate: number, hours: number): number {
  const first2 = Math.min(hours, 2) * rate * (4 / 3);
  const beyond2 = Math.max(hours - 2, 0) * rate * (5 / 3);
  return first2 + beyond2;
}

/** 國定假日 / 休假日出勤（§39）：8 小時內加發 1 日工資；逾 8 小時依 §24 I 延長工時 */
export function holidayOtPay(rate: number, hours: number, dailyHours = 8): number {
  const base = rate * dailyHours; // 加發一日
  const extended = weekdayOtPay(rate, Math.max(hours - 8, 0));
  return base + extended;
}

/** 依日別計算加班費（元，四捨五入） */
export function overtimePay(
  monthlySalary: number,
  hours: number,
  dayType: DayType
): number {
  const rate = hourlyRate(monthlySalary);
  let pay = 0;
  switch (dayType) {
    case "WORKDAY":
      pay = weekdayOtPay(rate, hours);
      break;
    case "REST_DAY":
      pay = restDayOtPay(rate, hours);
      break;
    case "HOLIDAY":
      pay = holidayOtPay(rate, hours);
      break;
    case "OFF_DAY":
      // 例假：原則不得出勤；出勤加發 1 日工資，另應補假
      pay = rate * 8 + weekdayOtPay(rate, Math.max(hours - 8, 0));
      break;
  }
  return Math.round(pay);
}

// ── §32 延長工時上限 ─────────────────────────────
export const OT_LIMIT = {
  DAILY_TOTAL_HOURS: 12, // 正常 + 延長 ≤ 12
  MONTHLY_HOURS: 46, // 每月 ≤ 46
  MONTHLY_HOURS_WITH_AGREEMENT: 54, // 經工會/勞資會議同意 ≤ 54
  QUARTER_HOURS: 138, // 每 3 個月 ≤ 138
};

export type OtLimitCheck = {
  monthMinutes: number;
  monthlyCapMinutes: number;
  ratio: number;
  level: "OK" | "WARN" | "ALERT" | "BREACH";
  message: string;
};

/** 檢查某員工當月累計加班是否逼近 / 超過 §32 上限 */
export function checkMonthlyOtLimit(
  monthMinutes: number,
  hasAgreement = false
): OtLimitCheck {
  const cap =
    (hasAgreement
      ? OT_LIMIT.MONTHLY_HOURS_WITH_AGREEMENT
      : OT_LIMIT.MONTHLY_HOURS) * 60;
  const ratio = monthMinutes / cap;
  let level: OtLimitCheck["level"] = "OK";
  if (monthMinutes > cap) level = "BREACH";
  else if (ratio >= 1) level = "ALERT";
  else if (ratio >= 0.8) level = "WARN";

  const h = (monthMinutes / 60).toFixed(1);
  const capH = cap / 60;
  const message =
    level === "BREACH"
      ? `已超過每月延長工時上限（${h} / ${capH} 小時）`
      : level === "ALERT"
      ? `已達每月延長工時上限（${h} / ${capH} 小時）`
      : level === "WARN"
      ? `已達每月延長工時上限 80%（${h} / ${capH} 小時）`
      : `當月延長工時 ${h} 小時`;

  return { monthMinutes, monthlyCapMinutes: cap, ratio, level, message };
}

/** 補休（§32-1）：1:1 換算，回傳補休分鐘數 */
export function compTimeMinutes(otMinutes: number): number {
  return otMinutes;
}
