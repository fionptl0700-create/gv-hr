// 純資料 / 純函式，無伺服器相依，client component 可安全 import

export const ROLE_LABEL: Record<string, string> = {
  EMPLOYEE: "同仁",
  MANAGER: "主管",
  HR: "人資",
  ADMIN: "系統管理員",
};

export function canApprove(role: string) {
  return role === "MANAGER" || role === "HR" || role === "ADMIN";
}

export function isHr(role: string) {
  return role === "HR" || role === "ADMIN";
}
