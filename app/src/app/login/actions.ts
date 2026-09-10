"use server";

import { redirect } from "next/navigation";
import { setSession, clearSession } from "@/lib/session";

export async function loginAs(formData: FormData) {
  const id = Number(formData.get("id"));
  if (Number.isFinite(id)) setSession(id);
  redirect("/");
}

export async function logout() {
  clearSession();
  redirect("/login");
}
