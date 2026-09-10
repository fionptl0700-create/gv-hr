// 月薪試算引擎
//
// 規則與法遵重點：
//  - 時薪基準 = 月薪 / 240（每月 30 日 × 8 小時）
//  - 遲到 / 早退：僅得「按未提供勞務時間比例」扣發工資，不得另立罰款、不得逾比例
//    （勞動部 87 台勞動二字第 040204 號等函釋）
//  - 請假扣薪：依假別 paidRate（事假 0、病假/生理假 0.5、特休/婚/喪/公/產 1）
//  - 全勤獎金：得依工作規則約定「當月有遲到/早退/事病假即不發」，
//    但全額工資不得低於基本工資保障
//  - 勞健保、勞退自提為員工自付額，需另接投保級距表（此處為手動帶入欄位）

export const HOURLY_DIVISOR = 240;
export const DAILY_DIVISOR = 30;

export type PayItem = { label: string; amount: number; note?: string };

export type PayrollInput = {
  year: number;
  month: number; // 1-12
  monthlySalary: number;
  fullAttendanceBonus?: number; // 全勤獎金（元/月）
  // 當月出勤彙總
  lateMinutes: number;
  earlyLeaveMinutes: number;
  absentDays: number; // 曠職日數（依日扣，且影響全勤）
  // 當月請假（小時）依 paidRate 分組
  unpaidLeaveHours: number; // paidRate = 0（事假、家庭照顧假…）
  halfPaidLeaveHours: number; // paidRate = 0.5（病假、生理假、安胎…）
  fullPaidLeaveHours: number; // paidRate = 1（特休、婚假、喪假、公假、產假…）不扣薪，僅記錄
  // 當月加班
  overtimePay: number; // 選擇「加班費」的加班，已試算金額
  // 員工自付（可留 0，之後接投保級距）
  laborInsuranceSelf?: number;
  healthInsuranceSelf?: number;
  pensionSelf?: number;
  otherDeductions?: PayItem[];
  otherEarnings?: PayItem[];
};

export type PayrollResult = {
  year: number;
  month: number;
  hourlyRate: number;
  dailyWage: number;
  earnings: PayItem[];
  deductions: PayItem[];
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  flags: string[];
};

const round = (n: number) => Math.round(n);

export function computeMonthlyPayroll(i: PayrollInput): PayrollResult {
  const hourlyRate = i.monthlySalary / HOURLY_DIVISOR;
  const dailyWage = i.monthlySalary / DAILY_DIVISOR;
  const flags: string[] = [];

  const earnings: PayItem[] = [];
  const deductions: PayItem[] = [];

  // 底薪
  earnings.push({ label: "本薪（月薪）", amount: round(i.monthlySalary) });

  // 加班費
  if (i.overtimePay > 0) {
    earnings.push({ label: "加班費（本月核定）", amount: round(i.overtimePay) });
  }

  // 其他加項
  for (const e of i.otherEarnings ?? []) earnings.push({ ...e, amount: round(e.amount) });

  // 全勤獎金（有遲到/早退/事假/病假/曠職即不發）
  const brokeAttendance =
    i.lateMinutes > 0 ||
    i.earlyLeaveMinutes > 0 ||
    i.absentDays > 0 ||
    i.unpaidLeaveHours > 0 ||
    i.halfPaidLeaveHours > 0;
  if ((i.fullAttendanceBonus ?? 0) > 0) {
    if (brokeAttendance) {
      earnings.push({
        label: "全勤獎金",
        amount: 0,
        note: "當月有遲到／早退／事病假／曠職，依工作規則不發",
      });
      flags.push("全勤獎金未發");
    } else {
      earnings.push({ label: "全勤獎金", amount: round(i.fullAttendanceBonus!) });
    }
  }

  // ── 扣項 ──
  // 事假 / 無薪假：全額扣
  if (i.unpaidLeaveHours > 0) {
    deductions.push({
      label: `事假／無薪假扣薪（${i.unpaidLeaveHours} 小時）`,
      amount: round(hourlyRate * i.unpaidLeaveHours),
      note: `時薪 ${round(hourlyRate)} × ${i.unpaidLeaveHours}h`,
    });
  }
  // 半薪假（病假 / 生理假 / 安胎）：扣一半
  if (i.halfPaidLeaveHours > 0) {
    deductions.push({
      label: `病假／生理假扣薪（${i.halfPaidLeaveHours} 小時，半薪）`,
      amount: round(hourlyRate * i.halfPaidLeaveHours * 0.5),
      note: `時薪 ${round(hourlyRate)} × ${i.halfPaidLeaveHours}h × 50%`,
    });
  }
  // 曠職：依日扣（1 日 = dailyWage），且通常再扣 1 日作為懲戒需另依工作規則
  if (i.absentDays > 0) {
    deductions.push({
      label: `曠職扣薪（${i.absentDays} 日）`,
      amount: round(dailyWage * i.absentDays),
      note: `日薪 ${round(dailyWage)} × ${i.absentDays} 日`,
    });
  }
  // 遲到扣薪（按比例）
  if (i.lateMinutes > 0) {
    deductions.push({
      label: `遲到扣薪（${i.lateMinutes} 分鐘）`,
      amount: round((hourlyRate * i.lateMinutes) / 60),
      note: "按未提供勞務時間比例",
    });
  }
  // 早退扣薪（按比例）
  if (i.earlyLeaveMinutes > 0) {
    deductions.push({
      label: `早退扣薪（${i.earlyLeaveMinutes} 分鐘）`,
      amount: round((hourlyRate * i.earlyLeaveMinutes) / 60),
      note: "按未提供勞務時間比例",
    });
  }

  // 員工自付：勞保 / 健保 / 勞退自提
  if ((i.laborInsuranceSelf ?? 0) > 0)
    deductions.push({ label: "勞保費（自付）", amount: round(i.laborInsuranceSelf!) });
  if ((i.healthInsuranceSelf ?? 0) > 0)
    deductions.push({ label: "健保費（自付）", amount: round(i.healthInsuranceSelf!) });
  if ((i.pensionSelf ?? 0) > 0)
    deductions.push({ label: "勞退自願提繳", amount: round(i.pensionSelf!) });

  for (const d of i.otherDeductions ?? []) deductions.push({ ...d, amount: round(d.amount) });

  const grossPay = earnings.reduce((s, e) => s + e.amount, 0);
  const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0);
  const netPay = grossPay - totalDeductions;

  // 法遵：全額工資不得低於基本工資（2025 月薪 28,590，時薪 190；上線時以當年度公告為準）
  const MIN_MONTHLY_WAGE = 28590;
  if (i.monthlySalary >= MIN_MONTHLY_WAGE && netPay < MIN_MONTHLY_WAGE * 0.5) {
    flags.push("實發金額偏低，請確認扣款是否逾未出勤比例（勞基法 §22、§26）");
  }

  return {
    year: i.year,
    month: i.month,
    hourlyRate: round(hourlyRate),
    dailyWage: round(dailyWage),
    earnings,
    deductions,
    grossPay,
    totalDeductions,
    netPay,
    flags,
  };
}
