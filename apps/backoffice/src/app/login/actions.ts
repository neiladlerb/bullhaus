"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { login, logout, getCurrentUser } from "@/lib/auth";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function loginAction(_prev: { error: string }, form: FormData): Promise<{ error: string }> {
  const parsed = schema.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: "Revisa el email y la contraseña." };
  const user = await login(parsed.data.email, parsed.data.password);
  if (!user) return { error: "Email o contraseña incorrectos." };
  await audit(user, "auth.login", "user", user.id);
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  const user = await getCurrentUser();
  if (user) await audit(user, "auth.logout", "user", user.id);
  await logout();
  redirect("/login");
}
