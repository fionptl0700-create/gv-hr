"use server";

import { revalidatePath } from "next/cache";
import { requireEmployee } from "@/lib/session";
import { decideApproval } from "@/lib/requests";

export async function decide(formData: FormData) {
  const me = await requireEmployee();
  const approvalId = Number(formData.get("approvalId"));
  const action = String(formData.get("action")) as "APPROVED" | "REJECTED";
  const comment = String(formData.get("comment") || "").trim() || undefined;
  if (!["APPROVED", "REJECTED"].includes(action)) throw new Error("動作錯誤");

  await decideApproval(approvalId, action, comment, me.id);

  revalidatePath("/approvals");
  revalidatePath("/");
}
