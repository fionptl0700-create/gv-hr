"use client";

import { useState, useTransition } from "react";
import { punch } from "./actions";

const BTN: { type: string; label: string; primary?: boolean }[] = [
  { type: "IN", label: "上班簽到", primary: true },
  { type: "OUT", label: "下班簽退", primary: true },
  { type: "OUTING_OUT", label: "外出" },
  { type: "OUTING_IN", label: "外出返回" },
  { type: "OT_IN", label: "加班開始" },
  { type: "OT_OUT", label: "加班結束" },
];

export function PunchButtons() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");

  function doPunch(type: string, label: string) {
    setMsg("");
    const submit = (lat?: number, lng?: number) => {
      const fd = new FormData();
      fd.set("type", type);
      if (lat != null) fd.set("lat", String(lat));
      if (lng != null) fd.set("lng", String(lng));
      start(async () => {
        await punch(fd);
        setMsg(`${label} 已完成 · ${new Date().toLocaleTimeString("zh-TW", { hour12: false })}`);
      });
    };
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => submit(pos.coords.latitude, pos.coords.longitude),
        () => submit(),
        { timeout: 4000 }
      );
    } else {
      submit();
    }
  }

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        {BTN.map((b) => (
          <button
            key={b.type}
            disabled={pending}
            onClick={() => doPunch(b.type, b.label)}
            className={b.primary ? "btn-primary py-4 text-base" : "btn-ghost py-4 text-base"}
          >
            {b.label}
          </button>
        ))}
      </div>
      {msg && (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{msg}</p>
      )}
      <p className="mt-3 text-xs text-neutral-400">
        打卡時會嘗試記錄 GPS 位置與 IP（正式版加入辦公室 GPS 圍籬與 IP 白名單）。
      </p>
    </div>
  );
}
