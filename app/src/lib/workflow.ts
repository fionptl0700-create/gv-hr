// 簽核流程定義（可日後改為資料表設定）
//
// step 內的角色：MANAGER = 直屬主管、DEPT = 部門主管、HR = 人資

export type FlowStep = { role: "MANAGER" | "DEPT" | "HR"; label: string };

export const FLOWS: Record<string, FlowStep[]> = {
  LEAVE_GENERAL: [
    { role: "MANAGER", label: "直屬主管" },
    { role: "DEPT", label: "部門主管" },
  ],
  LEAVE_HR_REVIEW: [
    { role: "MANAGER", label: "直屬主管" },
    { role: "DEPT", label: "部門主管" },
    { role: "HR", label: "人資覆核" },
  ],
  OVERTIME: [{ role: "MANAGER", label: "直屬主管" }],
  OVERTIME_OVER_LIMIT: [
    { role: "MANAGER", label: "直屬主管" },
    { role: "HR", label: "人資（逾 §32 上限）" },
  ],
  TRIP_DOMESTIC: [{ role: "MANAGER", label: "直屬主管" }],
  TRIP_ESCALATED: [
    { role: "MANAGER", label: "直屬主管" },
    { role: "DEPT", label: "部門主管" },
    { role: "HR", label: "人資備查" },
  ],
  OUTING: [{ role: "MANAGER", label: "直屬主管" }],
  WFH: [{ role: "MANAGER", label: "直屬主管" }],
  PUNCH_FIX: [{ role: "MANAGER", label: "直屬主管" }],
};

/** 依假別是否需 HR 覆核挑選流程 */
export function leaveFlow(needsHrReview: boolean): FlowStep[] {
  return needsHrReview ? FLOWS.LEAVE_HR_REVIEW : FLOWS.LEAVE_GENERAL;
}

export function tripFlow(opts: {
  overseas: boolean;
  days: number;
  overBudget: boolean;
}): FlowStep[] {
  return opts.overseas || opts.days > 3 || opts.overBudget
    ? FLOWS.TRIP_ESCALATED
    : FLOWS.TRIP_DOMESTIC;
}

export const APPROVAL_ESCALATE_AFTER_DAYS = 2; // 逾 2 個工作日提醒
export const APPROVAL_BUMP_AFTER_DAYS = 4; // 逾 4 個工作日升級上一層
