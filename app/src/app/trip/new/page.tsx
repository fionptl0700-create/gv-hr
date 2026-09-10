import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentEmployee } from "@/lib/session";
import { PageHeader, BackLink } from "@/components/ui";
import { toDateInput } from "@/lib/dates";
import { TripForm } from "../TripForm";

export const dynamic = "force-dynamic";

export default async function NewTripPage() {
  const me = await getCurrentEmployee();
  if (!me) redirect("/login");

  const colleagues = await prisma.employee.findMany({
    where: { status: "ACTIVE", id: { not: me.id } },
    orderBy: { employeeNo: "asc" },
    select: { id: true, name: true, employeeNo: true },
  });

  return (
    <div className="space-y-5">
      <BackLink href="/trip">返回列表</BackLink>
      <PageHeader title="出差 / 外出 / 遠距申請" />
      <TripForm today={toDateInput(new Date())} colleagues={colleagues} />
    </div>
  );
}
