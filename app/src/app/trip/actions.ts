"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireEmployee } from "@/lib/session";
import { FLOWS, tripFlow } from "@/lib/workflow";
import { resolveApprovers, createApprovalChain } from "@/lib/requests";
import { countWorkingDays } from "@/lib/working-days";

export async function submitTrip(formData: FormData) {
  const me = await requireEmployee();
  const kind = String(formData.get("kind")); // TRIP | OUTING | WFH

  if (kind === "OUTING") {
    const dateStr = String(formData.get("date"));
    const start = new Date(`${dateStr}T${String(formData.get("start"))}:00+08:00`);
    const end = new Date(`${dateStr}T${String(formData.get("end"))}:00+08:00`);
    const location = String(formData.get("location") || "").trim();
    const purpose = String(formData.get("purpose") || "").trim();
    if (end <= start) throw new Error("結束時間需晚於開始時間");
    if (!location || !purpose) throw new Error("請填寫地點與事由");
    const o = await prisma.outing.create({
      data: { employeeId: me.id, startAt: start, endAt: end, location, purpose, status: "PENDING" },
    });
    const chain = await resolveApprovers(me.id, FLOWS.OUTING);
    await createApprovalChain("OUTING", o.id, chain);
    revalidatePath("/trip");
    redirect("/trip");
  }

  if (kind === "WFH") {
    const dateStr = String(formData.get("date"));
    const date = new Date(`${dateStr}T00:00:00+08:00`);
    const location = String(formData.get("location") || "").trim();
    const contact = String(formData.get("contact") || "").trim();
    const plan = String(formData.get("plan") || "").trim();
    if (!plan) throw new Error("請填寫當日工作項目");
    const w = await prisma.wfhRequest.create({
      data: { employeeId: me.id, date, location, contact, plan, status: "PENDING" },
    });
    const chain = await resolveApprovers(me.id, FLOWS.WFH);
    await createApprovalChain("WFH", w.id, chain);
    revalidatePath("/trip");
    redirect("/trip");
  }

  // TRIP
  const scope = String(formData.get("scope") || "DOMESTIC"); // DOMESTIC | OVERSEAS
  const startStr = String(formData.get("startDate"));
  const endStr = String(formData.get("endDate"));
  const destination = String(formData.get("destination") || "").trim();
  const purpose = String(formData.get("purpose") || "").trim();
  const transport = String(formData.get("transport") || "").trim();
  const estCost = formData.get("estCost") ? Number(formData.get("estCost")) : null;
  const needAdvance = formData.get("needAdvance") === "on";
  const agentId = formData.get("agentId") ? Number(formData.get("agentId")) : null;

  if (!startStr || !endStr) throw new Error("請填寫出差起訖日期");
  const startAt = new Date(`${startStr}T00:00:00+08:00`);
  const endAt = new Date(`${endStr}T23:59:59+08:00`);
  if (endAt < startAt) throw new Error("結束日不得早於開始日");
  if (!destination || !purpose) throw new Error("請填寫目的地與事由");

  const days = Math.max(1, await countWorkingDays(startAt, endAt));

  const trip = await prisma.businessTrip.create({
    data: {
      employeeId: me.id,
      scope,
      startAt,
      endAt,
      destination,
      purpose,
      transport: transport || undefined,
      estCost: estCost ?? undefined,
      needAdvance,
      agentId,
      status: "PENDING",
      currentStep: 1,
    },
  });

  const BUDGET_THRESHOLD = 30000;
  const steps = tripFlow({
    overseas: scope === "OVERSEAS",
    days,
    overBudget: (estCost ?? 0) > BUDGET_THRESHOLD,
  });
  const chain = await resolveApprovers(me.id, steps);
  await createApprovalChain("TRIP", trip.id, chain);

  await prisma.auditLog.create({
    data: { actorId: me.id, action: "TRIP_SUBMIT", entity: "BusinessTrip", entityId: String(trip.id) },
  });

  revalidatePath("/trip");
  redirect("/trip");
}
