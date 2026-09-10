"use client";

import { useState } from "react";
import { submitTrip } from "./actions";

export function TripForm({
  today,
  colleagues,
}: {
  today: string;
  colleagues: { id: number; name: string; employeeNo: string }[];
}) {
  const [kind, setKind] = useState<"TRIP" | "OUTING" | "WFH">("TRIP");

  return (
    <form action={submitTrip} className="card space-y-4">
      <input type="hidden" name="kind" value={kind} />
      <div>
        <label className="label">申請類型</label>
        <div className="flex gap-2">
          {[
            { k: "TRIP", label: "出差" },
            { k: "OUTING", label: "外出 / 公出" },
            { k: "WFH", label: "遠距工作" },
          ].map((o) => (
            <button
              type="button"
              key={o.k}
              onClick={() => setKind(o.k as any)}
              className={kind === o.k ? "btn-primary" : "btn-ghost"}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {kind === "TRIP" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">出差範圍</label>
              <select name="scope" className="select" defaultValue="DOMESTIC">
                <option value="DOMESTIC">國內</option>
                <option value="OVERSEAS">國外</option>
              </select>
            </div>
            <div>
              <label className="label">交通方式</label>
              <input name="transport" className="input" placeholder="高鐵 / 自駕 / 飛機…" />
            </div>
            <div>
              <label className="label">開始日期</label>
              <input type="date" name="startDate" className="input" defaultValue={today} required />
            </div>
            <div>
              <label className="label">結束日期</label>
              <input type="date" name="endDate" className="input" defaultValue={today} required />
            </div>
            <div>
              <label className="label">目的地</label>
              <input name="destination" className="input" required />
            </div>
            <div>
              <label className="label">預估差旅費（NT$）</label>
              <input type="number" name="estCost" className="input" min={0} placeholder="0" />
            </div>
          </div>
          <div>
            <label className="label">出差事由</label>
            <textarea name="purpose" className="textarea" rows={2} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">代理人</label>
              <select name="agentId" className="select" defaultValue="">
                <option value="">（無）</option>
                {colleagues.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}（{c.employeeNo}）
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 pt-7 text-sm">
              <input type="checkbox" name="needAdvance" /> 需預支差旅費
            </label>
          </div>
          <p className="text-xs text-neutral-400">
            國外 / 逾 3 個工作日 / 逾預算 NT$30,000 → 加簽部門主管與人資。
          </p>
        </>
      )}

      {kind === "OUTING" && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">日期</label>
              <input type="date" name="date" className="input" defaultValue={today} required />
            </div>
            <div>
              <label className="label">開始時間</label>
              <input type="time" name="start" className="input" defaultValue="14:00" required />
            </div>
            <div>
              <label className="label">結束時間</label>
              <input type="time" name="end" className="input" defaultValue="16:00" required />
            </div>
          </div>
          <div>
            <label className="label">地點</label>
            <input name="location" className="input" required />
          </div>
          <div>
            <label className="label">事由</label>
            <textarea name="purpose" className="textarea" rows={2} required />
          </div>
        </>
      )}

      {kind === "WFH" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">日期</label>
              <input type="date" name="date" className="input" defaultValue={today} required />
            </div>
            <div>
              <label className="label">工作地點</label>
              <input name="location" className="input" placeholder="住家 / 其他" />
            </div>
          </div>
          <div>
            <label className="label">聯絡方式</label>
            <input name="contact" className="input" placeholder="手機 / 視訊帳號" />
          </div>
          <div>
            <label className="label">當日工作項目</label>
            <textarea name="plan" className="textarea" rows={3} required />
          </div>
        </>
      )}

      <button className="btn-primary">送出申請</button>
    </form>
  );
}
