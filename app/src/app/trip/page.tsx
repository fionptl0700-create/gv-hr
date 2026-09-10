import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentEmployee } from "@/lib/session";
import { fmtDate, fmtTime, twMoney } from "@/lib/dates";
import { PageHeader, Badge, EmptyRow, STATUS_TW } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function TripPage() {
  const me = await getCurrentEmployee();
  if (!me) redirect("/login");

  const [trips, outings, wfh] = await Promise.all([
    prisma.businessTrip.findMany({ where: { employeeId: me.id }, orderBy: { startAt: "desc" }, take: 20 }),
    prisma.outing.findMany({ where: { employeeId: me.id }, orderBy: { startAt: "desc" }, take: 20 }),
    prisma.wfhRequest.findMany({ where: { employeeId: me.id }, orderBy: { date: "desc" }, take: 20 }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="出差 / 外出 / 遠距"
        action={
          <Link href="/trip/new" className="btn-primary">
            新增申請
          </Link>
        }
      />

      <div className="card">
        <h2 className="mb-3 font-semibold">出差</h2>
        <div className="overflow-x-auto">
          <table className="data">
            <thead>
              <tr>
                <th>期間</th>
                <th>範圍</th>
                <th>目的地</th>
                <th>事由</th>
                <th>預估差旅費</th>
                <th>狀態</th>
              </tr>
            </thead>
            <tbody>
              {trips.length === 0 && <EmptyRow cols={6} />}
              {trips.map((t) => (
                <tr key={t.id}>
                  <td className="whitespace-nowrap">
                    {fmtDate(t.startAt)} – {fmtDate(t.endAt)}
                  </td>
                  <td>{t.scope === "OVERSEAS" ? "國外" : "國內"}</td>
                  <td>{t.destination}</td>
                  <td className="max-w-xs text-neutral-500">{t.purpose}</td>
                  <td>{t.estCost != null ? twMoney(t.estCost) : "—"}</td>
                  <td>
                    <Badge tone={t.status}>{STATUS_TW[t.status]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 font-semibold">外出 / 公出</h2>
          <table className="data">
            <thead>
              <tr>
                <th>日期</th>
                <th>時間</th>
                <th>地點</th>
                <th>狀態</th>
              </tr>
            </thead>
            <tbody>
              {outings.length === 0 && <EmptyRow cols={4} />}
              {outings.map((o) => (
                <tr key={o.id}>
                  <td>{fmtDate(o.startAt)}</td>
                  <td className="font-mono">
                    {fmtTime(o.startAt)}–{fmtTime(o.endAt)}
                  </td>
                  <td>{o.location}</td>
                  <td>
                    <Badge tone={o.status}>{STATUS_TW[o.status]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2 className="mb-3 font-semibold">遠距工作</h2>
          <table className="data">
            <thead>
              <tr>
                <th>日期</th>
                <th>地點</th>
                <th>工作項目</th>
                <th>狀態</th>
              </tr>
            </thead>
            <tbody>
              {wfh.length === 0 && <EmptyRow cols={4} />}
              {wfh.map((w) => (
                <tr key={w.id}>
                  <td>{fmtDate(w.date)}</td>
                  <td>{w.location || "—"}</td>
                  <td className="max-w-xs text-neutral-500">{w.plan}</td>
                  <td>
                    <Badge tone={w.status}>{STATUS_TW[w.status]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
