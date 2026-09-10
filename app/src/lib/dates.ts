export function startOfDay(d = new Date()): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}
export function endOfDay(d = new Date()): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}
export function startOfMonth(year: number, month1to12: number): Date {
  return new Date(year, month1to12 - 1, 1, 0, 0, 0, 0);
}
export function endOfMonth(year: number, month1to12: number): Date {
  return new Date(year, month1to12, 0, 23, 59, 59, 999);
}
export function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(d));
}
export function fmtTime(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(d));
}
export function fmtDateTime(d: Date | null | undefined): string {
  if (!d) return "—";
  return `${fmtDate(d)} ${fmtTime(d)}`;
}
export function hoursText(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} 小時 ${m} 分` : `${h} 小時`;
}
export function twMoney(n: number): string {
  return "NT$ " + Math.round(n).toLocaleString("en-US");
}
export function toDateInput(d: Date): string {
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
