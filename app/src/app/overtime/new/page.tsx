import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/session";
import { PageHeader, BackLink } from "@/components/ui";
import { toDateInput } from "@/lib/dates";
import { submitOvertime } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewOvertimePage() {
  const me = await getCurrentEmployee();
  if (!me) redirect("/login");
  const today = toDateInput(new Date());

  return (
    <div className="space-y-5">
      <BackLink href="/overtime">返回加班列表</BackLink>
      <PageHeader
        title="加班申請"
        desc="平日延長工時前 2 小時 1⅓ 倍、之後 1⅔ 倍；每月上限 46 小時（經同意 54 小時）"
      />

      <form action={submitOvertime} className="card space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">加班日期</label>
            <input type="date" name="date" className="input" defaultValue={today} required />
          </div>
          <div>
            <label className="label">開始時間</label>
            <input type="time" name="start" className="input" defaultValue="18:00" required />
          </div>
          <div>
            <label className="label">結束時間</label>
            <input type="time" name="end" className="input" defaultValue="20:00" required />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">補償方式</label>
            <select name="compensation" className="select" defaultValue="PAY">
              <option value="PAY">加班費</option>
              <option value="COMP_TIME">補休（1:1，6 個月內休畢）</option>
            </select>
          </div>
          <div>
            <label className="label">專案 / 工作項目</label>
            <input name="project" className="input" placeholder="選填" />
          </div>
        </div>

        <div>
          <label className="label">加班事由</label>
          <textarea name="reason" className="textarea" rows={2} required />
        </div>

        <button className="btn-primary">送出申請</button>
        <p className="text-xs text-neutral-400">
          日別（平日 / 休息日 / 國定假日 / 例假）由系統依行事曆自動判定並套用對應費率。
        </p>
      </form>
    </div>
  );
}
