import { cookies } from "next/headers";
import { prisma } from "./db";
export { ROLE_LABEL, canApprove, isHr } from "./roles";

const COOKIE = "gv_uid";

export async function getCurrentEmployee() {
  const uid = cookies().get(COOKIE)?.value;
  if (!uid) return null;
  const id = Number(uid);
  if (!Number.isFinite(id)) return null;
  return prisma.employee.findUnique({
    where: { id },
    include: { dept: true, schedule: true },
  });
}

export async function requireEmployee() {
  const e = await getCurrentEmployee();
  if (!e) throw new Error("未登入");
  return e;
}

export function setSession(employeeId: number) {
  cookies().set(COOKIE, String(employeeId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export function clearSession() {
  cookies().delete(COOKIE);
}

