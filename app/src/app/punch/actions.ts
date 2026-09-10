"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { requireEmployee } from "@/lib/session";

export async function punch(formData: FormData) {
  const me = await requireEmployee();
  const type = String(formData.get("type"));
  const allowed = ["IN", "OUT", "OUTING_OUT", "OUTING_IN", "OT_IN", "OT_OUT"];
  if (!allowed.includes(type)) throw new Error("打卡類型錯誤");

  const lat = formData.get("lat") ? Number(formData.get("lat")) : null;
  const lng = formData.get("lng") ? Number(formData.get("lng")) : null;
  const ip =
    headers().get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers().get("x-real-ip") ??
    null;

  await prisma.punchRecord.create({
    data: {
      employeeId: me.id,
      type,
      ts: new Date(),
      lat: Number.isFinite(lat as number) ? (lat as number) : null,
      lng: Number.isFinite(lng as number) ? (lng as number) : null,
      ip,
      source: "WEB",
    },
  });

  await prisma.auditLog.create({
    data: { actorId: me.id, action: "PUNCH", entity: "PunchRecord", after: type, ip },
  });

  revalidatePath("/punch");
  revalidatePath("/");
}
