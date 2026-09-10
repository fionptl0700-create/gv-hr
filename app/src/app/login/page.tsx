import { prisma } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/session";
import { loginAs } from "./actions";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const employees = await prisma.employee.findMany({
    include: { dept: true },
    orderBy: { id: "asc" },
  });

  return (
    <div className="mx-auto mt-10 max-w-md">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-2 grid h-14 w-14 place-items-center rounded-xl bg-brand text-white">
          綠谷
        </div>
        <h1 className="text-lg font-bold">綠谷國際 GV STUDIO</h1>
        <p className="text-sm text-neutral-500">線上人資考勤系統</p>
      </div>

      <div className="card">
        <p className="mb-3 text-sm font-medium text-neutral-600">
          選擇身分登入（示範環境，無密碼；正式版改為帳密 / LINE Login）
        </p>
        <div className="space-y-2">
          {employees.map((e) => (
            <form key={e.id} action={loginAs}>
              <input type="hidden" name="id" value={e.id} />
              <button className="btn-ghost w-full justify-between">
                <span>
                  {e.name}
                  <span className="ml-2 text-xs text-neutral-400">
                    {e.dept?.name} · {e.positionTitle}
                  </span>
                </span>
                <span className="rounded bg-brand-50 px-2 py-0.5 text-xs text-brand">
                  {ROLE_LABEL[e.role]}
                </span>
              </button>
            </form>
          ))}
        </div>
      </div>
    </div>
  );
}
