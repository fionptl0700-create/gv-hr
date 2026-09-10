import { prisma } from "./db";
import { toDateInput } from "./dates";

/** 取得期間內的「應出勤日」清單（排除週末與國定假日、含補班日） */
export async function workingDays(
  start: Date,
  end: Date,
  workdays: number[] = [1, 2, 3, 4, 5]
): Promise<Date[]> {
  const holidays = await prisma.holiday.findMany({
    where: { date: { gte: start, lte: end } },
  });
  const holMap = new Map(holidays.map((h) => [toDateInput(new Date(h.date)), h]));

  const out: Date[] = [];
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);

  while (cur <= last) {
    const key = toDateInput(cur);
    const hol = holMap.get(key);
    const isWeekday = workdays.includes(cur.getDay());
    if (hol?.isWorkday) {
      out.push(new Date(cur)); // 補班日
    } else if (hol && (hol.appliesTo === "ALL" || hol.appliesTo === "LABOR")) {
      // 放假日，略過
    } else if (isWeekday) {
      out.push(new Date(cur));
    }
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export async function countWorkingDays(
  start: Date,
  end: Date,
  workdays?: number[]
): Promise<number> {
  return (await workingDays(start, end, workdays)).length;
}
